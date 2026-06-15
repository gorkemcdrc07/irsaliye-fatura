import dns from "dns";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

let transporter;

async function resolveIPv4(hostname) {
    return new Promise((resolve, reject) => {
        dns.resolve4(hostname, (err, addresses) => {
            if (err || !addresses || !addresses.length) {
                reject(err || new Error("IPv4 adres bulunamadý"));
            } else {
                resolve(addresses[0]);
            }
        });
    });
}

async function getTransporter() {
    if (transporter) return transporter;

    let host = SMTP_HOST;

    try {
        const ipv4 = await resolveIPv4(SMTP_HOST);
        console.log("SMTP IPv4 çözümlendi:", { hostname: SMTP_HOST, ip: ipv4 });
        host = ipv4;
    } catch (err) {
        console.error("SMTP IPv4 çözümleme hatasý, hostname ile devam:", err.message);
    }

    transporter = nodemailer.createTransport({
        host,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 60000,
        greetingTimeout: 60000,
        socketTimeout: 300000,
        tls: {
            rejectUnauthorized: false,
            servername: SMTP_HOST,
        },
    });

    transporter.verify((error, success) => {
        if (error) {
            console.error("SMTP baðlantý hatasý:", error);
        } else {
            console.log("SMTP baðlantýsý hazýr:", success);
        }
    });

    return transporter;
}

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
        host: SMTP_HOST,
        port: SMTP_PORT,
        user: process.env.SMTP_USER,
        to,
        cc: cc || null,
        subject,
    });

    const t = await getTransporter();

    const info = await t.sendMail({
        from: process.env.SMTP_USER,
        to,
        cc: cc || undefined,
        subject,
        html,
        text: htmlToText(html),
        attachments,
    });

    console.log("SMTP sendMail tamamlandý:", {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
    });

    return info;
}