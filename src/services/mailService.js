import nodemailer from "nodemailer";

const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,

    tls: {
        rejectUnauthorized: false,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP baðlantý hatasý:", error);
    } else {
        console.log("SMTP baðlantýsý hazýr:", success);
    }
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
    console.log("SMTP sendMail baþladý:", {
        host: process.env.SMTP_HOST,
        port: SMTP_PORT,
        user: process.env.SMTP_USER,
        to,
        cc: cc || null,
        subject,
    });

    const info = await Promise.race([
        transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            cc: cc || undefined,
            subject,
            html,
            text: htmlToText(html),
            attachments,
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SMTP TIMEOUT 30s")), 30000)
        ),
    ]);

    console.log("SMTP sendMail tamamlandý:", {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
    });

    return info;
}