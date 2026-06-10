import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { mailGonder } from "./mailService.js";
import { tedarikMailTemplate } from "./mailTemplate.js";
import { tedarikRaporuOlustur } from "./tedarikReportService.js";

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function trTarihSaat() {
    const now = new Date();

    const tarih = now.toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul",
    });

    const saat = now.toLocaleTimeString("tr-TR", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return { tarih, saat };
}

function saatleriNormalizeEt(value) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
        }
    }

    return [];
}

const gonderilenCache = new Set();

async function otomatikMailKontrolEt() {
    const { tarih, saat } = trTarihSaat();

    console.log("Mail cron kontrol:", tarih, saat);

    const { data: gruplar, error } = await supabaseAdmin
        .from("tedarik_mail_gruplari")
        .select("*")
        .eq("aktif", true);

    if (error) {
        console.error("Mail gruplarý çekilemedi:", error.message);
        return;
    }

    for (const grup of gruplar || []) {
        const saatler = saatleriNormalizeEt(grup.saatler);

        if (!saatler.includes(saat)) continue;

        const cacheKey = `${tarih}-${saat}-${grup.id}`;

        if (gonderilenCache.has(cacheKey)) {
            continue;
        }

        gonderilenCache.add(cacheKey);

        try {
            console.log(`Rapor hazýrlanýyor: ${grup.grup_adi} - ${saat}`);

            const rapor = await tedarikRaporuOlustur({
                supabaseAdmin,
                projeIds: grup.proje_ids || [],
            });

            const html = tedarikMailTemplate({
                title: grup.konu || "Tedarik Analiz Raporu",
                body: grup.body || "",
                grupAdi: grup.grup_adi,
                projeSayisi: (grup.proje_ids || []).length,
                gonderimSaati: saat,
                tabloHtml: rapor.tabloHtml,
            });

            await mailGonder({
                to: grup.kime,
                cc: grup.ss || undefined,
                subject: grup.konu || "Tedarik Analiz Raporu",
                html,
            });

            console.log(`Mail gönderildi: ${grup.grup_adi} - ${saat}`);
        } catch (err) {
            console.error(`Mail gönderilemedi: ${grup.grup_adi}`, err.message);
        }
    }
}

export function otomatikMailSchedulerBaslat() {
    cron.schedule("* * * * *", otomatikMailKontrolEt, {
        timezone: "Europe/Istanbul",
    });

    console.log("Otomatik mail scheduler baþladý.");
}