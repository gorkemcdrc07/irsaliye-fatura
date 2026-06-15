export async function outlookTaslakAc({
    to = "",
    cc = "",
    subject = "",
    html = "",
}) {
    try {
        await navigator.clipboard.write([
            new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([html.replace(/<[^>]+>/g, "")], {
                    type: "text/plain",
                }),
            }),
        ]);
    } catch (err) {
        console.error("Panoya kopyalama hatası:", err);
    }

    const mailtoUrl =
        `mailto:${encodeURIComponent(to)}` +
        `?cc=${encodeURIComponent(cc || "")}` +
        `&subject=${encodeURIComponent(subject || "")}`;

    window.location.href = mailtoUrl;

    alert(
        "Outlook uygulaması açıldıysa HTML gövde panoya kopyalandı.\nMail gövdesine tıklayıp Ctrl+V yapıştırabilirsiniz."
    );
}