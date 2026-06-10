import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { mailGonder } from "./mailService.js";
import { tedarikMailTemplate } from "./mailTemplate.js";
import { tedarikRaporuOlustur } from "./tedarikReportService.js";

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function bugununKeyi() {
    return new Date().toLocaleDateString("tr-TR");
}

function simdikiSaat() {
    return new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

const gonderilenCache = new Set();

async function otomatikMailKontrolEt() {
    const saat = simdikiSaat();
    const gun = bugununKeyi();

    console.log("Mail cron kontrol:", gun, saat);

    const { data: gruplar, error } = await supabaseAdmin
        .from("tedarik_mail_gruplari")
        .select("*")
        .eq("aktif", true);

    if (error) {
        console.error("Mail gruplarý çekilemedi:", error.message);
        return;
    }

    for (const grup of gruplar || []) {
        const saatler = grup.saatler || [];

        if (!saatler.includes(saat)) continue;

        const cacheKey = `${gun}-${saat}-${grup.id}`;

        if (gonderilenCache.has(cacheKey)) {
            continue;
        }

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

            gonderilenCache.add(cacheKey);

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