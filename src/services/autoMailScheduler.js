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
    let liste = [];

    if (Array.isArray(value)) {
        liste = value;
    } else if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            liste = Array.isArray(parsed) ? parsed : [];
        } catch {
            liste = value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
        }
    }

    return liste
        .map((x) => String(x || "").trim().slice(0, 5))
        .filter(Boolean);
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
    console.log("Aktif mail grup sayýsý:", gruplar?.length || 0);

    for (const grup of gruplar || []) {
        const saatler = saatleriNormalizeEt(grup.saatler);

        console.log("Grup kontrol:", {
            grupAdi: grup.grup_adi,
            dbSaatler: grup.saatler,
            normalizeSaatler: saatler,
            simdikiSaat: saat,
        });

        if (!saatler.includes(saat)) {
            console.log("Saat eþleþmedi:", grup.grup_adi);
            continue;
        }

        const cacheKey = `${tarih}-${saat}-${grup.id}`;

        if (gonderilenCache.has(cacheKey)) {
            continue;
        }

        gonderilenCache.add(cacheKey);

        try {
            console.log(`Rapor hazýrlanýyor: ${grup.grup_adi} - ${saat}`);

            console.log("Rapor servisine girildi:", {
                grupAdi: grup.grup_adi,
                projeIds: grup.proje_ids || [],
            });

            const rapor = await tedarikRaporuOlustur({
                supabaseAdmin,
                projeIds: grup.proje_ids || [],
            });

            console.log("Rapor servisi tamamlandý:", {
                grupAdi: grup.grup_adi,
                tabloVarMi: !!rapor?.tabloHtml,
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
            console.error(
                `Mail gönderilemedi: ${grup.grup_adi}`
            );

            console.error(err);
        }
    }
}

export function otomatikMailSchedulerBaslat() {
    cron.schedule("* * * * *", otomatikMailKontrolEt, {
        timezone: "Europe/Istanbul",
    });

    console.log("Otomatik mail scheduler baþladý.");
}