import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        service: "TMS Proxy API",
        status: "running",
        scheduler: "removed",
        time: new Date().toISOString(),
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        ok: true,
        uptime: process.uptime(),
    });
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
    console.log("OTOMATİK MAIL SCHEDULER KALDIRILDI");
    console.log("================================");
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});