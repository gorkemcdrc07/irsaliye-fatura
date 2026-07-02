// supabase/functions/send-invoice-report/index.ts
import { SMTPClient } from "npm:emailjs@4.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  attachmentBase64?: string;
  attachmentFileName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();

    if (!body.to || body.to.length === 0) {
      return new Response(
        JSON.stringify({ error: "Kime (to) alani zorunludur." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.subject || !body.html) {
      return new Response(
        JSON.stringify({ error: "Konu ve icerik (html) zorunludur." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_USER || !SMTP_PASS) {
      return new Response(
        JSON.stringify({ error: "SMTP kimlik bilgileri sunucuda tanimli degil." }),
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
    console.error("Mail gonderim hatasi:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
