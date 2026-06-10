function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function nl2br(value = "") {
    return escapeHtml(value).replace(/\n/g, "<br/>");
}

export function tedarikMailTemplate({
    title = "Tedarik Analiz Raporu",
    body = "",
    tarih = new Date().toLocaleString("tr-TR"),
    grupAdi = "",
    projeSayisi = null,
    gonderimSaati = "",
    tabloHtml = "",
}) {
    const safeTitle = escapeHtml(title);
    const safeTarih = escapeHtml(tarih);
    const safeGrupAdi = escapeHtml(grupAdi);
    const safeSaat = escapeHtml(gonderimSaati);

    const hasStats = grupAdi || projeSayisi !== null || gonderimSaati;

    return `<!doctype html>
<html lang="tr">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
</head>

<body style="margin:0;padding:0;background:#e8ecf2;font-family:Segoe UI,Arial,sans-serif;color:#0d1117;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#e8ecf2;padding:32px 0;">
  <tr>
    <td align="center">

      <table width="680" cellpadding="0" cellspacing="0" role="presentation"
             style="width:680px;max-width:94%;background:#ffffff;border:1px solid #d1d9e6;border-radius:20px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0d1117;padding:32px 36px;">
            <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6e7b99;font-weight:600;margin-bottom:10px;">
              Odak Süreç Takip
            </div>
            <div style="font-size:22px;font-weight:600;color:#f0f4ff;line-height:1.3;">
              ${safeTitle}
            </div>
            <div style="margin-top:14px;font-size:12px;color:#4e596e;">
              Rapor Tarihi: ${safeTarih}
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px 36px 20px 36px;">

            <p style="margin:0 0 10px;font-size:15px;color:#3d4a5c;">Merhaba,</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#5a6778;">
              Tedarik analiz raporu aşağıda bilgilerinize sunulmuştur.
            </p>

            ${body ? `
            <div style="background:#f7f9fc;border:1px solid #dde3ec;border-radius:12px;padding:16px 18px;font-size:13px;color:#4e5a6a;line-height:1.7;margin-bottom:24px;">
              ${nl2br(body)}
            </div>` : ""}

            ${hasStats ? `
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
              <tr>
                ${grupAdi ? `
                <td style="padding:14px 16px;background:#f7f9fc;border:1px solid #dde3ec;border-radius:12px;">
                  <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#8997ab;font-weight:600;margin-bottom:6px;">Grup</div>
                  <div style="font-size:18px;font-weight:600;color:#0d1117;">${safeGrupAdi}</div>
                </td>` : ""}

                ${grupAdi && projeSayisi !== null ? `<td style="width:10px;"></td>` : ""}

                ${projeSayisi !== null ? `
                <td style="padding:14px 16px;background:#f7f9fc;border:1px solid #dde3ec;border-radius:12px;">
                  <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#8997ab;font-weight:600;margin-bottom:6px;">Proje Sayısı</div>
                  <div style="font-size:18px;font-weight:600;color:#0d1117;">${projeSayisi}</div>
                </td>` : ""}

                ${(grupAdi || projeSayisi !== null) && gonderimSaati ? `<td style="width:10px;"></td>` : ""}

                ${gonderimSaati ? `
                <td style="padding:14px 16px;background:#f7f9fc;border:1px solid #dde3ec;border-radius:12px;">
                  <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#8997ab;font-weight:600;margin-bottom:6px;">Gönderim Saati</div>
                  <div style="font-size:18px;font-weight:600;color:#0d1117;">${safeSaat}</div>
                </td>` : ""}
              </tr>
            </table>` : ""}

            ${tabloHtml || ""}

            <div style="background:#f7f9fc;border:1px solid #dde3ec;border-left:3px solid #c2ccd8;border-radius:0 8px 8px 0;padding:12px 16px;font-size:12px;color:#7a8999;margin-bottom:24px;">
              Bu mail Odak Süreç Takip sistemi tarafından otomatik olarak oluşturulmuştur.
            </div>

            <p style="margin:0;font-size:14px;line-height:1.7;color:#5a6778;">
              İyi çalışmalar,<br/>
              <strong style="color:#0d1117;font-weight:600;">Odak Süreç Takip</strong>
            </p>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:16px 36px 24px;border-top:1px solid #edf0f5;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="font-size:11px;color:#aab4bf;">© Odak Lojistik · Otomatik Bildirim</td>
                <td align="right" style="font-size:11px;font-weight:600;color:#c5ccda;letter-spacing:.04em;">OST</td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}