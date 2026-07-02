import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import "dotenv/config";

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://irsaliye-fatura.vercel.app",
    "https://odaklojistik.vercel.app",
];

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.error(`CORS engellendi: ${origin}`);
        return callback(new Error(`CORS engellendi: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        service: "TMS Proxy API",
        status: "running",
        time: new Date().toISOString(),
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        ok: true,
        uptime: process.uptime(),
    });
});

app.post("/api/send-invoice-report", async (req, res) => {
    try {
        const {
            to,
            cc = [],
            subject,
            html,
            attachmentBase64,
            attachmentFileName,
        } = req.body;

        if (!Array.isArray(to) || to.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Kime alanı zorunludur.",
            });
        }

        if (!subject || !html) {
            return res.status(400).json({
                success: false,
                error: "Konu ve içerik zorunludur.",
            });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.office365.com",
            port: Number(process.env.SMTP_PORT || 587),
            secure: false,
            family: 4,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            requireTLS: true,
            tls: {
                rejectUnauthorized: false,
            },
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            socketTimeout: 30000,
        });

        await transporter.sendMail({
            from: `"Odak TMS" <${process.env.SMTP_USER}>`,
            to: to.join(","),
            cc: Array.isArray(cc) && cc.length > 0 ? cc.join(",") : undefined,
            subject,
            html,
            attachments: attachmentBase64
                ? [
                    {
                        filename: attachmentFileName || "fatura_raporu.xlsx",
                        content: Buffer.from(attachmentBase64, "base64"),
                        contentType:
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    },
                ]
                : [],
        });

        return res.status(200).json({
            success: true,
            message: "Mail başarıyla gönderildi.",
        });
    } catch (err) {
        console.error("MAIL GÖNDERME HATASI:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "Mail gönderilemedi.",
        });
    }
});

app.post("/api/proxy/tmsorders", async (req, res) => {
    try {
        const tmsRes = await fetch(
            "https://api.odaklojistik.com.tr/api/tmsorders/getall",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: req.headers.authorization || "",
                },
                body: JSON.stringify(req.body),
            }
        );

        const text = await tmsRes.text();

        res.status(tmsRes.status);
        res.setHeader(
            "Content-Type",
            tmsRes.headers.get("content-type") || "application/json"
        );
        res.send(text);
    } catch (err) {
        console.error("TMS ORDERS PROXY HATA:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

app.post("/api/proxy/tmsdespatches", async (req, res) => {
    try {
        const tmsRes = await fetch(
            "https://api.odaklojistik.com.tr/api/tmsdespatches/getall",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: req.headers.authorization || "",
                },
                body: JSON.stringify(req.body),
            }
        );

        const text = await tmsRes.text();

        res.status(tmsRes.status);
        res.setHeader(
            "Content-Type",
            tmsRes.headers.get("content-type") || "application/json"
        );
        res.send(text);
    } catch (err) {
        console.error("TMS DESPATCH PROXY HATA:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, "0.0.0.0", () => {
    console.log("================================");
    console.log("TMS PROXY SERVER BAŞLADI");
    console.log(`PORT: ${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);
    console.log("================================");
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});