import ExcelJS from "exceljs";

const RENK = {
    marka: "FF4F5DF7",
    markaKoyu: "FF3A46D1",
    lacivert: "FF121A2E",
    beyaz: "FFFFFFFF",
    zebra: "FFF6F7FC",
    cizgi: "FFE7E9F4",
    kartZemin: "FFF8F9FD",
    pozitif: "FF0EA472",
    negatif: "FFE5484D",
    ink: "FF0D1220",
    inkSoft: "FF5B6478",
    mor: "FF7C3AED",
};

function paraGoster(value) {
    return `${Math.round(value || 0).toLocaleString("tr-TR")} ₺`;
}

function sayiGoster(value) {
    return Math.round(value || 0).toLocaleString("tr-TR");
}

function temizSayfaAdi(ad) {
    return String(ad || "Sayfa")
        .replace(/[\\/*?:[\]]/g, "-")
        .slice(0, 31);
}

function hex(argb) {
    return `#${String(argb).replace("FF", "")}`;
}

function canvasVarMi() {
    return typeof document !== "undefined" && typeof document.createElement === "function";
}

function yuvarlakDikdortgen(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function grafikBase64Olustur({ baslik, tip = "bar", veriler = [], width = 900, height = 420 }) {
    if (!canvasVarMi()) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = hex(RENK.ink);
    ctx.font = "700 24px Calibri, Arial";
    ctx.fillText(baslik, 32, 42);

    ctx.fillStyle = hex(RENK.inkSoft);
    ctx.font = "400 14px Calibri, Arial";
    ctx.fillText("Karlılık Analizi Paneli", 32, 66);

    if (!veriler.length) {
        ctx.fillStyle = hex(RENK.inkSoft);
        ctx.font = "400 16px Calibri, Arial";
        ctx.fillText("Grafik oluşturmak için veri bulunamadı.", 32, 130);
        return canvas.toDataURL("image/png").split(",")[1];
    }

    if (tip === "donut") {
        const toplam = veriler.reduce((t, x) => t + Math.abs(Number(x.value || 0)), 0) || 1;
        const cx = 240;
        const cy = 215;
        const radius = 110;
        const inner = 62;
        let start = -Math.PI / 2;

        veriler.forEach((item) => {
            const oran = Math.abs(Number(item.value || 0)) / toplam;
            const end = start + oran * Math.PI * 2;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, start, end);
            ctx.arc(cx, cy, inner, end, start, true);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();

            start = end;
        });

        ctx.fillStyle = hex(RENK.ink);
        ctx.font = "700 18px Calibri, Arial";
        ctx.textAlign = "center";
        ctx.fillText("Dağılım", cx, cy - 4);

        ctx.fillStyle = hex(RENK.inkSoft);
        ctx.font = "400 13px Calibri, Arial";
        ctx.fillText("Gelir / Gider", cx, cy + 18);
        ctx.textAlign = "left";

        let y = 145;
        veriler.forEach((item) => {
            ctx.fillStyle = item.color;
            yuvarlakDikdortgen(ctx, 470, y - 12, 16, 16, 4);
            ctx.fill();

            ctx.fillStyle = hex(RENK.ink);
            ctx.font = "700 15px Calibri, Arial";
            ctx.fillText(item.label, 496, y);

            ctx.fillStyle = hex(RENK.inkSoft);
            ctx.font = "400 14px Calibri, Arial";
            ctx.fillText(paraGoster(item.value), 496, y + 22);

            y += 62;
        });
    } else {
        const max = Math.max(...veriler.map((x) => Math.abs(Number(x.value || 0))), 1);
        const startX = 250;
        const startY = 105;
        const barH = 28;
        const gap = 18;
        const maxW = width - startX - 80;

        veriler.forEach((item, index) => {
            const y = startY + index * (barH + gap);
            const value = Number(item.value || 0);
            const w = Math.max(8, (Math.abs(value) / max) * maxW);

            ctx.fillStyle = hex(RENK.ink);
            ctx.font = "700 13px Calibri, Arial";

            const label = String(item.label || "-").slice(0, 28);
            ctx.fillText(label, 32, y + 20);

            ctx.fillStyle = "#EEF0F8";
            yuvarlakDikdortgen(ctx, startX, y, maxW, barH, 10);
            ctx.fill();

            ctx.fillStyle = item.color;
            yuvarlakDikdortgen(ctx, startX, y, w, barH, 10);
            ctx.fill();

            ctx.fillStyle = hex(RENK.ink);
            ctx.font = "700 13px Consolas, monospace";
            ctx.fillText(
                item.format === "number" ? sayiGoster(value) : paraGoster(value),
                startX + 12,
                y + 19
            );
        });
    }

    return canvas.toDataURL("image/png").split(",")[1];
}

function turkiyeHaritasiBase64Olustur({ baslik = "İl Bazlı Karlılık Haritası", iller = [] }) {
    if (!canvasVarMi()) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 560;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = hex(RENK.ink);
    ctx.font = "700 26px Calibri, Arial";
    ctx.fillText(baslik, 34, 44);

    ctx.fillStyle = hex(RENK.inkSoft);
    ctx.font = "400 14px Calibri, Arial";
    ctx.fillText("Yeşil pozitif karlılık, kırmızı negatif karlılık gösterir.", 34, 70);

    const noktalar = [
        { il: "İstanbul", x: 245, y: 160 },
        { il: "Tekirdağ", x: 185, y: 165 },
        { il: "Edirne", x: 130, y: 145 },
        { il: "Kocaeli", x: 300, y: 165 },
        { il: "Bursa", x: 255, y: 210 },
        { il: "Balıkesir", x: 210, y: 245 },
        { il: "İzmir", x: 165, y: 330 },
        { il: "Manisa", x: 190, y: 305 },
        { il: "Aydın", x: 180, y: 365 },
        { il: "Muğla", x: 205, y: 410 },
        { il: "Antalya", x: 355, y: 410 },
        { il: "Konya", x: 435, y: 330 },
        { il: "Ankara", x: 455, y: 245 },
        { il: "Eskişehir", x: 355, y: 245 },
        { il: "Sakarya", x: 325, y: 175 },
        { il: "Bolu", x: 370, y: 185 },
        { il: "Zonguldak", x: 420, y: 145 },
        { il: "Samsun", x: 590, y: 145 },
        { il: "Trabzon", x: 760, y: 145 },
        { il: "Erzurum", x: 800, y: 230 },
        { il: "Van", x: 910, y: 310 },
        { il: "Diyarbakır", x: 760, y: 350 },
        { il: "Gaziantep", x: 655, y: 405 },
        { il: "Adana", x: 555, y: 405 },
        { il: "Mersin", x: 505, y: 420 },
        { il: "Kayseri", x: 555, y: 300 },
        { il: "Sivas", x: 620, y: 250 },
        { il: "Malatya", x: 680, y: 315 },
    ];

    const max = Math.max(
        ...iller.map((x) => Math.abs(Number(x.karlilik || x.netKarlilik || 0))),
        1
    );

    ctx.beginPath();
    ctx.moveTo(105, 160);
    ctx.bezierCurveTo(180, 105, 320, 115, 430, 135);
    ctx.bezierCurveTo(570, 90, 720, 105, 860, 175);
    ctx.bezierCurveTo(955, 225, 960, 330, 875, 360);
    ctx.bezierCurveTo(735, 435, 590, 440, 460, 420);
    ctx.bezierCurveTo(330, 455, 215, 430, 145, 360);
    ctx.bezierCurveTo(80, 295, 75, 210, 105, 160);
    ctx.closePath();

    ctx.fillStyle = "#F3F5FB";
    ctx.fill();

    ctx.strokeStyle = "#DDE2F1";
    ctx.lineWidth = 2;
    ctx.stroke();

    noktalar.forEach((nokta) => {
        const kayit = iller.find(
            (x) =>
                String(x.il || x.sehir || x.ilAdi || "")
                    .toLocaleLowerCase("tr-TR")
                    .trim() === nokta.il.toLocaleLowerCase("tr-TR")
        );

        const value = Number(kayit?.karlilik || kayit?.netKarlilik || 0);
        const oran = Math.min(Math.abs(value) / max, 1);
        const radius = 7 + oran * 19;

        ctx.beginPath();
        ctx.arc(nokta.x, nokta.y, radius, 0, Math.PI * 2);
        ctx.fillStyle =
            value >= 0
                ? `rgba(14, 164, 114, ${0.25 + oran * 0.65})`
                : `rgba(229, 72, 77, ${0.25 + oran * 0.65})`;
        ctx.fill();

        ctx.strokeStyle = value >= 0 ? hex(RENK.pozitif) : hex(RENK.negatif);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = hex(RENK.ink);
        ctx.font = "600 11px Calibri, Arial";
        ctx.fillText(nokta.il, nokta.x + radius + 4, nokta.y + 4);
    });

    ctx.fillStyle = hex(RENK.inkSoft);
    ctx.font = "400 12px Calibri, Arial";
    ctx.fillText("Not: Harita görsel olarak rapora eklenir.", 34, 525);

    return canvas.toDataURL("image/png").split(",")[1];
}

export function yeniRapor() {
    const wb = new ExcelJS.Workbook();

    wb.creator = "Karlılık Analizi Paneli";
    wb.lastModifiedBy = "Karlılık Analizi Paneli";
    wb.created = new Date();
    wb.modified = new Date();

    wb.properties = {
        title: "Karlılık Analizi Raporu",
        subject: "Karlılık Analizi",
        keywords: "karlılık, gelir, gider, tedarikçi, il, lojistik",
        category: "Finansal Rapor",
        company: "Karlılık Analizi Paneli",
    };

    return wb;
}

export function sayfaEkle(wb, { ad, baslik, altBaslik, kolonlar, satirlar }) {
    const ws = wb.addWorksheet(temizSayfaAdi(ad), {
        properties: { tabColor: { argb: RENK.marka } },
        pageSetup: {
            paperSize: 9,
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.25,
                right: 0.25,
                top: 0.35,
                bottom: 0.35,
                header: 0.2,
                footer: 0.2,
            },
        },
    });

    kolonlar.forEach((k, i) => {
        ws.getColumn(i + 1).width = k.width || 18;
    });

    let r = 1;

    ws.mergeCells(r, 1, r, kolonlar.length);
    const baslikHucre = ws.getCell(r, 1);
    baslikHucre.value = baslik;
    baslikHucre.font = {
        name: "Calibri",
        bold: true,
        size: 17,
        color: { argb: RENK.beyaz },
    };
    baslikHucre.alignment = { vertical: "middle", indent: 1 };
    baslikHucre.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: RENK.lacivert },
    };
    ws.getRow(r).height = 34;
    r++;

    if (altBaslik) {
        ws.mergeCells(r, 1, r, kolonlar.length);
        const altHucre = ws.getCell(r, 1);
        altHucre.value = altBaslik;
        altHucre.font = {
            name: "Calibri",
            italic: true,
            size: 10.5,
            color: { argb: RENK.beyaz },
        };
        altHucre.alignment = { vertical: "middle", indent: 1 };
        altHucre.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: RENK.markaKoyu },
        };
        ws.getRow(r).height = 22;
        r++;
    }

    r++;

    const headerRowIndex = r;

    kolonlar.forEach((k, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = k.header;
        cell.font = {
            name: "Calibri",
            bold: true,
            size: 11,
            color: { argb: RENK.beyaz },
        };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: RENK.marka },
        };
        cell.alignment = {
            vertical: "middle",
            horizontal: k.type === "text" ? "left" : "right",
            indent: k.type === "text" ? 1 : 0,
        };
        cell.border = {
            top: { style: "thin", color: { argb: RENK.markaKoyu } },
            bottom: { style: "medium", color: { argb: RENK.markaKoyu } },
        };
    });

    ws.getRow(r).height = 25;
    r++;

    satirlar.forEach((satir, idx) => {
        kolonlar.forEach((k, i) => {
            const cell = ws.getCell(r, i + 1);
            const deger = satir[k.key];

            cell.value = deger === undefined || deger === null ? "" : deger;
            cell.border = {
                bottom: { style: "hair", color: { argb: RENK.cizgi } },
            };

            if (idx % 2 === 1) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: RENK.zebra },
                };
            }

            if (k.type === "money") {
                cell.numFmt = '#,##0 "₺"';
                cell.alignment = { horizontal: "right", vertical: "middle" };
                cell.font = {
                    name: "Consolas",
                    size: 10.5,
                    color: { argb: RENK.ink },
                };
            } else if (k.type === "number") {
                cell.numFmt = "#,##0";
                cell.alignment = { horizontal: "right", vertical: "middle" };
                cell.font = {
                    name: "Consolas",
                    size: 10.5,
                    color: { argb: RENK.ink },
                };
            } else {
                cell.alignment = {
                    horizontal: "left",
                    vertical: "middle",
                    indent: 1,
                };
                cell.font = {
                    name: "Calibri",
                    size: 10.5,
                    color: { argb: RENK.ink },
                };
            }

            if (k.renkli && typeof deger === "number") {
                cell.font = {
                    ...cell.font,
                    bold: true,
                    color: {
                        argb: deger >= 0 ? RENK.pozitif : RENK.negatif,
                    },
                };
            }
        });

        ws.getRow(r).height = 20;
        r++;
    });

    if (satirlar.length) {
        ws.autoFilter = {
            from: { row: headerRowIndex, column: 1 },
            to: { row: headerRowIndex, column: kolonlar.length },
        };
    }

    ws.views = [{ state: "frozen", ySplit: headerRowIndex }];

    return ws;
}

function tedarikciGrafikleriEkle(wb, ws, tedarikciSatirlari = []) {
    const sirali = [...tedarikciSatirlari]
        .sort(
            (a, b) =>
                Math.abs(Number(b.karlilik || b.netKarlilik || 0)) -
                Math.abs(Number(a.karlilik || a.netKarlilik || 0))
        )
        .slice(0, 10);

    const chart = grafikBase64Olustur({
        baslik: "Tedarikçi Bazlı Karlılık - Top 10",
        tip: "bar",
        veriler: sirali.map((x) => {
            const value = Number(x.karlilik || x.netKarlilik || 0);

            return {
                label: x.tedarikci || x.tedarikciAdi || x.firma || x.unvan || "Tedarikçi",
                value,
                color: value >= 0 ? hex(RENK.pozitif) : hex(RENK.negatif),
            };
        }),
        width: 900,
        height: 420,
    });

    if (!chart) return;

    const imageId = wb.addImage({
        base64: chart,
        extension: "png",
    });

    ws.addImage(imageId, {
        tl: { col: 1.1, row: 34.5 },
        ext: { width: 640, height: 300 },
    });
}

function ilHaritasiEkle(wb, ws, ilSatirlari = []) {
    const chart = turkiyeHaritasiBase64Olustur({
        baslik: "İl Bazlı Karlılık Türkiye Haritası",
        iller: ilSatirlari,
    });

    if (!chart) return;

    const imageId = wb.addImage({
        base64: chart,
        extension: "png",
    });

    ws.addImage(imageId, {
        tl: { col: 6.5, row: 34.5 },
        ext: { width: 620, height: 350 },
    });
}

export function ozetSayfasiEkle(wb, {
    toplamGelir,
    toplamGider,
    toplamKarlilik,
    toplamSefer,
    dosyaAdi,
    tedarikciSatirlari = [],
    ilSatirlari = [],
}) {
    const ws = wb.addWorksheet("Özet", {
        properties: { tabColor: { argb: RENK.marka } },
        pageSetup: {
            paperSize: 9,
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: {
                left: 0.25,
                right: 0.25,
                top: 0.35,
                bottom: 0.35,
                header: 0.2,
                footer: 0.2,
            },
        },
    });

    ws.getColumn(1).width = 3;
    [2, 3, 4, 5].forEach((c) => (ws.getColumn(c).width = 27));
    ws.getColumn(6).width = 3;
    [7, 8, 9, 10, 11, 12].forEach((c) => (ws.getColumn(c).width = 16));

    ws.mergeCells("B2:L2");
    const title = ws.getCell("B2");
    title.value = "Karlılık Analizi — Yönetici Özeti";
    title.font = {
        name: "Calibri",
        size: 22,
        bold: true,
        color: { argb: RENK.ink },
    };
    ws.getRow(2).height = 34;

    ws.mergeCells("B3:L3");
    const sub = ws.getCell("B3");
    const tarihMetni = new Date().toLocaleDateString("tr-TR");

    sub.value = dosyaAdi
        ? `Kaynak: ${dosyaAdi} · Oluşturulma: ${tarihMetni}`
        : `Oluşturulma: ${tarihMetni}`;

    sub.font = {
        name: "Calibri",
        size: 11,
        italic: true,
        color: { argb: RENK.inkSoft },
    };

    const karMarji =
        toplamGelir > 0 ? Math.round((toplamKarlilik / toplamGelir) * 100) : 0;

    const kartlar = [
        {
            label: "TOPLAM GELİR",
            value: paraGoster(toplamGelir),
            renk: RENK.marka,
        },
        {
            label: "TOPLAM GİDER",
            value: paraGoster(toplamGider),
            renk: RENK.negatif,
        },
        {
            label: "NET KARLILIK",
            value: paraGoster(toplamKarlilik),
            renk: toplamKarlilik >= 0 ? RENK.pozitif : RENK.negatif,
        },
        {
            label: "SEFER / MARJ",
            value: `${sayiGoster(toplamSefer)} sefer\n%${karMarji} marj`,
            renk: RENK.mor,
        },
    ];

    kartlar.forEach((kart, i) => {
        const col = i + 2;
        const colHarf = String.fromCharCode(64 + col);

        ws.mergeCells(`${colHarf}6:${colHarf}10`);
        const cell = ws.getCell(`${colHarf}6`);

        cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };

        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: RENK.kartZemin },
        };

        cell.border = {
            top: { style: "medium", color: { argb: kart.renk } },
            bottom: { style: "thin", color: { argb: RENK.cizgi } },
            left: { style: "thin", color: { argb: RENK.cizgi } },
            right: { style: "thin", color: { argb: RENK.cizgi } },
        };

        cell.value = {
            richText: [
                {
                    font: {
                        name: "Calibri",
                        size: 10,
                        bold: true,
                        color: { argb: RENK.inkSoft },
                    },
                    text: `${kart.label}\n\n`,
                },
                {
                    font: {
                        name: "Consolas",
                        size: 17,
                        bold: true,
                        color: { argb: kart.renk },
                    },
                    text: kart.value,
                },
            ],
        };
    });

    for (let row = 6; row <= 10; row++) {
        ws.getRow(row).height = 18;
    }

    const barChart = grafikBase64Olustur({
        baslik: "Gelir / Gider / Karlılık",
        tip: "bar",
        veriler: [
            {
                label: "Toplam Gelir",
                value: toplamGelir,
                color: hex(RENK.marka),
            },
            {
                label: "Toplam Gider",
                value: toplamGider,
                color: hex(RENK.negatif),
            },
            {
                label: "Net Karlılık",
                value: toplamKarlilik,
                color: toplamKarlilik >= 0 ? hex(RENK.pozitif) : hex(RENK.negatif),
            },
            {
                label: "Sefer Sayısı",
                value: toplamSefer,
                color: hex(RENK.mor),
                format: "number",
            },
        ],
    });

    if (barChart) {
        const imageId = wb.addImage({
            base64: barChart,
            extension: "png",
        });

        ws.addImage(imageId, {
            tl: { col: 1.1, row: 13.5 },
            ext: { width: 610, height: 270 },
        });
    }

    const donutChart = grafikBase64Olustur({
        baslik: "Gelir - Gider Dağılımı",
        tip: "donut",
        veriler: [
            {
                label: "Toplam Gelir",
                value: toplamGelir,
                color: hex(RENK.marka),
            },
            {
                label: "Toplam Gider",
                value: toplamGider,
                color: hex(RENK.negatif),
            },
            {
                label: "Net Karlılık",
                value: Math.abs(toplamKarlilik),
                color: toplamKarlilik >= 0 ? hex(RENK.pozitif) : hex(RENK.negatif),
            },
        ],
    });

    if (donutChart) {
        const imageId = wb.addImage({
            base64: donutChart,
            extension: "png",
        });

        ws.addImage(imageId, {
            tl: { col: 6.3, row: 13.5 },
            ext: { width: 530, height: 270 },
        });
    }

    if (tedarikciSatirlari.length) {
        tedarikciGrafikleriEkle(wb, ws, tedarikciSatirlari);
    }

    if (ilSatirlari.length) {
        ilHaritasiEkle(wb, ws, ilSatirlari);
    }

    ws.mergeCells("B55:L55");
    const note = ws.getCell("B55");
    note.value =
        "Not: Grafikler ve Türkiye haritası Excel raporuna PNG görsel olarak eklenir. Bu yöntem tarayıcı ortamında en stabil yöntemdir.";
    note.font = {
        name: "Calibri",
        size: 10,
        italic: true,
        color: { argb: RENK.inkSoft },
    };

    return ws;
}

export async function indir(wb, dosyaAdi) {
    const buffer = await wb.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = dosyaAdi.endsWith(".xlsx") ? dosyaAdi : `${dosyaAdi}.xlsx`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}