import express from "express";
import cors from "cors";
import "dotenv/config";

import mailRoutes from "./src/routes/mailRoutes.js";
import { otomatikMailSchedulerBaslat } from "./src/services/autoMailScheduler.js";

const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://irsaliye-fatura.vercel.app",
        ],
        credentials: true,
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* HEALTH CHECK */
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        service: "TMS Mail API",
        status: "running",
        scheduler: "active",
        time: new Date().toISOString(),
    });
});

/* RENDER HEALTH CHECK */
app.get("/health", (req, res) => {
    res.status(200).json({
        ok: true,
        uptime: process.uptime(),
    });
});

/* MAIL ROUTES */
app.use("/api/mail", mailRoutes);

const PORT = Number(process.env.PORT || 3001);

/* OTOMATİK MAIL SCHEDULER */
otomatikMailSchedulerBaslat();

/* SERVER START */
app.listen(PORT, "0.0.0.0", () => {
    console.log("================================");
    console.log("TMS MAIL SERVER BAŞLADI");
    console.log(`PORT: ${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);
    console.log("OTOMATİK MAIL SCHEDULER AKTİF");
    console.log("================================");
});

/* UNHANDLED ERROR LOG */
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});