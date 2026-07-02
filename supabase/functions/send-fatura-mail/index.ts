// supabase/functions/send-invoice-report/index.ts
//
// Bu Edge Function, Office365 SMTP üzerinden mail gönderir.
// Kimlik bilgileri KOD ÝÇÝNDE DEÐÝL, Supabase secrets üzerinden okunur.
//
// Deploy etmeden önce terminalde þunu çalýþtýrýn (sadece bir kez, kendi bilgisayarýnýzda):
//
//   supabase secrets set SMTP_USER=odaksurectakip@odaklojistik.com.tr
//   supabase secrets set SMTP_PASS='C^459081069869om'
//
// Deploy:
//   supabase functions deploy send-invoice-report
//
// NOT: Parolanýzý hiçbir zaman git repo'suna, .env dosyasýna (commit edilen),
// ya da frontend koduna yazmayýn. Sadece "supabase secrets set" ile saklayýn.

import { SMTPClient } from "npm:emailjs@4.0.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};
interface RequestBody {
    to: string[];           // alýcýlar
    cc?: string[];           // bilgi (opsiyonel)
    subject: string;         // konu
    html: string;             // mail gövdesi (ozetHtmlOlustur() çýktýsý)
    attachmentBase64?: string; // Excel dosyasý, base64 (opsiyonel)
    attachmentFileName?: string; // örn: fatura_raporu_02_07_2026.xlsx
}

Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body: RequestBody = await req.json();

        if (!body.to || body.to.length === 0) {
            return new Response(
                JSON.stringify({ error: "Kime (to) alaný zorunludur." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!body.subject || !body.html) {
            return new Response(
                JSON.stringify({ error: "Konu ve içerik (html) zorunludur." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const SMTP_USER = Deno.env.get("SMTP_USER");
        const SMTP_PASS = Deno.env.get("SMTP_PASS");

        if (!SMTP_USER || !SMTP_PASS) {
            return new Response(
                JSON.stringify({ error: "SMTP kimlik bilgileri sunucuda tanýmlý deðil." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const client = new SMTPClient({
            user: SMTP_USER,
            password: SMTP_PASS,
            host: "smtp.office365.com",
            port: 587,
            ssl: false,
            tls: true,
            timeout: 10000,
        });
        const attachments: Record<string, unknown>[] = [
            { data: body.html, alternative: true },
        ];

        if (body.attachmentBase64) {
            attachments.push({
                name: body.attachmentFileName || "rapor.xlsx",
                data: Uint8Array.from(atob(body.attachmentBase64), (c) => c.charCodeAt(0)),
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
        }

        const message = await client.sendAsync({
            from: `Odak TMS <${SMTP_USER}>`,
            to: body.to.join(", "),
            cc: body.cc && body.cc.length > 0 ? body.cc.join(", ") : undefined,
            subject: body.subject,
            attachment: attachments,
        });

        return new Response(
            JSON.stringify({ success: true, messageId: message?.header?.["message-id"] ?? null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Mail gönderim hatasý:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Bilinmeyen hata" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});