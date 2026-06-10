import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: true,
    },
});

function htmlToText(html = "") {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/td>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export async function mailGonder({
    to,
    cc,
    subject,
    html,
    attachments = [],
}) {
    return transporter.sendMail({
        from: `"Odak Süreç Takip" <${process.env.SMTP_USER}>`,
        sender: process.env.SMTP_USER,
        replyTo: process.env.SMTP_USER,
        to,
        cc: cc || undefined,
        subject,
        html,
        text: htmlToText(html),
        encoding: "utf-8",
        headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "X-Mailer": "Odak Süreç Takip",
        },
        attachments,
    });
}