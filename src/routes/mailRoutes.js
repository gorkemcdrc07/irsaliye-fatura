import express from "express";
import { mailGonder } from "../services/mailService.js";
import { tedarikMailTemplate } from "../services/mailTemplate.js";

const router = express.Router();

router.get("/test", async (req, res) => {
    try {
        const html = tedarikMailTemplate({
            title: "TMS Analiz SMTP Test",
            body: "<p>Mail template sistemi başarıyla çalışıyor.</p>",
        });

        await mailGonder({
            to: "gorkem.cadirci@odaklojistik.com.tr",
            subject: "TMS Analiz SMTP Test",
            html,
        });

        res.send("✅ Template ile mail gönderildi");
    } catch (err) {
        console.error("MAIL TEST HATA:", err);
        res.status(500).send(err.message);
    }
});

router.post("/send", async (req, res) => {
    try {
        const { to, cc, subject, body } = req.body;

        const html = tedarikMailTemplate({
            title: subject || "Tedarik Analiz Raporu",
            body: body || "",
        });

        await mailGonder({
            to,
            cc,
            subject: subject || "Tedarik Analiz Raporu",
            html,
        });

        res.json({
            success: true,
            message: "Mail gönderildi.",
        });
    } catch (err) {
        console.error("MAIL GÖNDERİM HATA:", err);

        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

export default router;