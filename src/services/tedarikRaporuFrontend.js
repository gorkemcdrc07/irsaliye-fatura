import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    norm,
    talepNoNormalizeEt,
    seferNoNormalizeEt,
    extractItems,
    toIsoStart,
    toIsoEnd,
    booleanCevir,
    sayiCevir,
    isGecTedarik,
    projeAdiniDuzenle,
    hizmetKapsamdaMi,
    filoMu,
} from "./tedarikReportService";

const MAIL_API_BASE = "https://irsaliye-fatura.onrender.com";
const TMS_ORDERS_API_URL = `${MAIL_API_BASE}/api/proxy/tmsorders`;
const TMS_DESPATCH_API_URL = `${MAIL_API_BASE}/api/proxy/tmsdespatches`;

const TOKEN = import.meta.env.VITE_TMS_TOKEN;
const DEFAULT_USER_ID = Number(import.meta.env.VITE_TMS_USER_ID || 85);

function localIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function raporTarihiOlustur() {
    const bugun = new Date();
    const gun = bugun.getDay();
    // Pazar: 0, Pazartesi: 1, Salı: 2 ...

    // Eğer bugün pazartesi ise önceki haftanın pazartesi-pazar arası
    if (gun === 1) {
        const oncekiPazartesi = new Date(bugun);
        oncekiPazartesi.setDate(bugun.getDate() - 7);

        const oncekiPazar = new Date(bugun);
        oncekiPazar.setDate(bugun.getDate() - 1);

        return {
            startDate: localIsoDate(oncekiPazartesi),
            endDate: localIsoDate(oncekiPazar),
        };
    }

    // Diğer günlerde sadece bir önceki gün
    const dun = new Date(bugun);
    dun.setDate(bugun.getDate() - 1);

    const tarih = localIsoDate(dun);

    return {
        startDate: tarih,
        endDate: tarih,
    };
}
function tarihFormatla(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("tr-TR");
}

function ilkDoluDeger(...values) {
    return (
        values.find(
            (v) => v !== undefined && v !== null && String(v).trim() !== ""
        ) || ""
    );
}

function tekilJoin(list) {
    return [...new Set((list || []).filter(Boolean))].join(" → ");
}

async function tmsOrdersCek({ startDate, endDate, userId = DEFAULT_USER_ID }) {
    const res = await fetch(TMS_ORDERS_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
            startDate: toIsoStart(startDate),
            endDate: toIsoEnd(endDate),
            userId: Number(userId),
        }),
    });

    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;

    if (!res.ok) throw new Error(`TMS Orders API hata: ${res.status}`);

    return extractItems(payload);
}

async function tmsDespatchesCek({
    startDate,
    endDate,
    userId = DEFAULT_USER_ID,
}) {
    const res = await fetch(TMS_DESPATCH_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
            startDate: toIsoStart(startDate),
            endDate: toIsoEnd(endDate),
            userId: Number(userId),
            CustomerId: 0,
            SupplierId: 0,
            DriverId: 0,
            TMSDespatchId: 0,
            VehicleId: 0,
            DocumentPrint: "",
            WorkingTypesId: [3, 4, 33],
        }),
    });

    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;

    if (!res.ok) throw new Error(`TMS Despatch API hata: ${res.status}`);

    return extractItems(payload);
}

function seferleriGrupla(excelSatirlari) {
    return Object.values(
        excelSatirlari.reduce((acc, r) => {
            const seferNo = r["Sefer No"];
            if (!seferNo) return acc;

            if (!acc[seferNo]) {
                acc[seferNo] = {
                    Proje: r.Proje,
                    "Sefer No": r["Sefer No"],
                    "Sipariş Durumu": r["Sipariş Durumu"],
                    "Yükleme Tarihi": r["Yükleme Tarihi"],
                    "Teslim Tarihi": r["Teslim Tarihi"],
                    "Yükleme Noktaları": [],
                    "Teslim Noktaları": [],
                    Müşteri: r.Müşteri,
                    "Araç Çalışma Tipi": r["Araç Çalışma Tipi"],
                    "Filo / Spot": r["Filo / Spot"],
                    "SHÖ Durumu": r["SHÖ Durumu"],
                    "Geç Tedarik": r["Geç Tedarik"],
                    "Yükleme Varış / Oluşturma Tarihi":
                        r["Yükleme Varış / Oluşturma Tarihi"],
                };
            }

            acc[seferNo]["Yükleme Noktaları"].push(r["Yükleme Noktası"]);
            acc[seferNo]["Teslim Noktaları"].push(r["Teslim Noktası"]);

            return acc;
        }, {})
    ).map((r) => ({
        ...r,
        "Yükleme Noktaları": tekilJoin(r["Yükleme Noktaları"]),
        "Teslim Noktaları": tekilJoin(r["Teslim Noktaları"]),
    }));
}

async function excelDosyasiIndir({ startDate, satirlar, excelSatirlari }) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Odak Lojistik";
    wb.created = new Date();

    const border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };

    function baslikStili(row) {
        row.eachCell((cell) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF0F172A" },
            };
            cell.font = {
                bold: true,
                color: { argb: "FFFFFFFF" },
                size: 11,
            };
            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true,
            };
            cell.border = border;
        });

        row.height = 26;
    }

    function govdeStili(ws) {
        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            row.eachCell((cell) => {
                cell.border = border;
                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                    wrapText: true,
                };
                cell.font = {
                    color: { argb: "FF111827" },
                    size: 10,
                };

                if (rowNumber % 2 === 0) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF8FAFC" },
                    };
                }
            });

            row.height = 24;
        });
    }

    const ozet = wb.addWorksheet("Özet", {
        views: [{ state: "frozen", ySplit: 1 }],
    });

    ozet.columns = [
        { header: "Proje", key: "proje", width: 36 },
        { header: "Talep", key: "plan", width: 12 },
        { header: "Tedarik Edilen", key: "ted", width: 18 },
        { header: "Spot", key: "spot", width: 12 },
        { header: "Filo", key: "filo", width: 12 },
        { header: "SHÖ Oranı", key: "shoOrani", width: 14 },
        { header: "Tedarik Edilmeyen", key: "edilmeyen", width: 20 },
        { header: "Geç Tedarik", key: "gec", width: 16 },
        { header: "Zamanında", key: "zamaninda", width: 14 },
        { header: "Performans", key: "yuzde", width: 14 },
    ];

    satirlar.forEach((r) => {
        ozet.addRow({
            proje: r.proje,
            plan: r.plan,
            ted: r.ted,
            spot: r.spot,
            filo: r.filo,
            shoOrani: `%${r.shoOrani}`,
            edilmeyen: r.edilmeyen,
            gec: r.gec,
            zamaninda: r.zamaninda,
            yuzde: `%${r.yuzde}`,
        });
    });

    baslikStili(ozet.getRow(1));
    govdeStili(ozet);

    ozet.getColumn("proje").alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
    };

    ozet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const performansCell = row.getCell(10);
        const value = Number(String(performansCell.value).replace("%", ""));

        if (value >= 85) {
            performansCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDCFCE7" },
            };
            performansCell.font = {
                bold: true,
                color: { argb: "FF166534" },
            };
        } else if (value >= 60) {
            performansCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEF3C7" },
            };
            performansCell.font = {
                bold: true,
                color: { argb: "FF92400E" },
            };
        } else {
            performansCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEE2E2" },
            };
            performansCell.font = {
                bold: true,
                color: { argb: "FF991B1B" },
            };
        }
    });

    ozet.autoFilter = {
        from: "A1",
        to: "J1",
    };

    const detay = wb.addWorksheet("Sefer Detayları", {
        views: [{ state: "frozen", ySplit: 1 }],
    });

    detay.columns = [
        { header: "Proje", key: "Proje", width: 36 },
        { header: "Sefer No", key: "Sefer No", width: 18 },
        { header: "Sipariş Durumu", key: "Sipariş Durumu", width: 18 },
        { header: "Yükleme Tarihi", key: "Yükleme Tarihi", width: 22 },
        { header: "Teslim Tarihi", key: "Teslim Tarihi", width: 22 },
        { header: "Yükleme Noktaları", key: "Yükleme Noktaları", width: 38 },
        { header: "Teslim Noktaları", key: "Teslim Noktaları", width: 38 },
        { header: "Müşteri", key: "Müşteri", width: 40 },
        { header: "Araç Çalışma Tipi", key: "Araç Çalışma Tipi", width: 22 },
        { header: "Filo / Spot", key: "Filo / Spot", width: 14 },
        { header: "SHÖ Durumu", key: "SHÖ Durumu", width: 14 },
        { header: "Geç Tedarik", key: "Geç Tedarik", width: 14 },
        {
            header: "Yükleme Varış / Oluşturma Tarihi",
            key: "Yükleme Varış / Oluşturma Tarihi",
            width: 30,
        },
    ];

    const gruplanmisSeferler = seferleriGrupla(excelSatirlari);
    gruplanmisSeferler.forEach((r) => detay.addRow(r));

    baslikStili(detay.getRow(1));
    govdeStili(detay);

    detay.getColumn("Proje").alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
    };

    detay.getColumn("Müşteri").alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
    };

    detay.getColumn("Yükleme Noktaları").alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
    };

    detay.getColumn("Teslim Noktaları").alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
    };

    detay.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const durumCell = row.getCell(3);
        const filoSpotCell = row.getCell(10);
        const shoCell = row.getCell(11);
        const gecCell = row.getCell(12);

        if (durumCell.value === "Tedarik Edildi") {
            durumCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDCFCE7" },
            };
            durumCell.font = {
                bold: true,
                color: { argb: "FF166534" },
            };
        }

        if (durumCell.value === "Tedarik Edilemedi") {
            durumCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEE2E2" },
            };
            durumCell.font = {
                bold: true,
                color: { argb: "FF991B1B" },
            };
        }

        if (durumCell.value === "İptal") {
            durumCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF3F4F6" },
            };
            durumCell.font = {
                bold: true,
                color: { argb: "FF374151" },
            };
        }

        if (filoSpotCell.value === "Filo") {
            filoSpotCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFEDE9FE" },
            };
            filoSpotCell.font = {
                bold: true,
                color: { argb: "FF6D28D9" },
            };
        }

        if (filoSpotCell.value === "Spot") {
            filoSpotCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFF7ED" },
            };
            filoSpotCell.font = {
                bold: true,
                color: { argb: "FFC2410C" },
            };
        }

        if (shoCell.value === "Basılı") {
            shoCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDBEAFE" },
            };
            shoCell.font = {
                bold: true,
                color: { argb: "FF1D4ED8" },
            };
        }

        if (gecCell.value === "Evet") {
            gecCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEE2E2" },
            };
            gecCell.font = {
                bold: true,
                color: { argb: "FF991B1B" },
            };
        } else {
            gecCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDCFCE7" },
            };
            gecCell.font = {
                bold: true,
                color: { argb: "FF166534" },
            };
        }
    });

    detay.autoFilter = {
        from: "A1",
        to: "M1",
    };

    const buffer = await wb.xlsx.writeBuffer();

    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Tedarik_Analiz_Raporu_${startDate}.xlsx`
    );
}

export async function tedarikRaporuOlusturFrontend({ projeIds }) {
    const { startDate, endDate } = raporTarihiOlustur();

    const { data: projeler, error: projeError } = await supabase
        .from("tedarik_projeler")
        .select("id, proje_adi")
        .in("id", projeIds || []);

    if (projeError) throw projeError;

    const projeAdlari = (projeler || []).map((p) => p.proje_adi);
    const projeSet = new Set(projeAdlari.map(norm));

    const [orders, despatches] = await Promise.all([
        tmsOrdersCek({ startDate, endDate }),
        tmsDespatchesCek({ startDate, endDate }),
    ]);

    const despatchMap = {};

    despatches.forEach((item) => {
        const key = seferNoNormalizeEt(
            item.TMSDespatchDocumentNo ||
            item.DocumentNo ||
            item.DespatchDocumentNo
        );

        if (key) despatchMap[key] = item;
    });

    const stats = {};
    const excelSatirlari = [];

    for (const projeAdi of projeAdlari) {
        stats[norm(projeAdi)] = {
            name: projeAdi,
            plan: new Set(),
            ted: new Set(),
            spot: new Set(),
            filo: new Set(),
            sho_b: new Set(),
            sho_bm: new Set(),
            gec: new Set(),
        };
    }

    orders.forEach((item) => {
        const projeAdi = projeAdiniDuzenle(item);
        if (!projeAdi) return;

        const projeKey = norm(projeAdi);
        if (!projeSet.has(projeKey)) return;
        if (!hizmetKapsamdaMi(item)) return;

        const s = stats[projeKey];
        if (!s) return;

        const reqNo = talepNoNormalizeEt(item.TMSVehicleRequestDocumentNo);
        const despKey = seferNoNormalizeEt(item.TMSDespatchDocumentNo);
        const talepKey = reqNo || despKey;
        const despatchItem = despatchMap[despKey];

        const vehicleWorkingName = ilkDoluDeger(
            item.VehicleWorkingName,
            despatchItem?.VehicleWorkingName,
            despatchItem?.WorkingTypeName,
            despatchItem?.VehicleWorkingTypeName
        );

        const isPrint =
            item.IsPrint ??
            despatchItem?.IsPrint ??
            despatchItem?.DocumentPrint ??
            false;

        const loadingDate = ilkDoluDeger(
            item.TMSLoadingDocumentPrintedDate,
            despatchItem?.TMSLoadingDocumentPrintedDate,
            despatchItem?.TMSDespatchArrivalTime,
            despatchItem?.TMSDespatchVehicleDate,
            despatchItem?.EstimatedArrivalTime,
            item.TMSDespatchArrivalTime,
            item.TMSDespatchVehicleDate,
            item.TMSDespatchCreatedDate
        );

        const gecTedarikMi = isGecTedarik(item.PickupDate, loadingDate);
        const iptalMi = sayiCevir(item.OrderStatu) === 200;
        const tedarikEdildiMi = despKey && despKey.startsWith("SFR") && !iptalMi;

        if (talepKey && !talepKey.startsWith("BOS")) {
            s.plan.add(talepKey);
        }

        if (despKey && !despKey.startsWith("BOS")) {
            excelSatirlari.push({
                Proje: projeAdi,
                "Sefer No": despKey,
                "Sipariş Durumu": iptalMi
                    ? "İptal"
                    : tedarikEdildiMi
                        ? "Tedarik Edildi"
                        : "Tedarik Edilemedi",
                "Yükleme Tarihi": tarihFormatla(item.PickupDate),
                "Teslim Tarihi": tarihFormatla(item.DeliveryDate),
                "Yükleme Noktası": ilkDoluDeger(
                    item.PickupAddressCode,
                    despatchItem?.PickupAddressCode
                ),
                "Teslim Noktası": ilkDoluDeger(
                    item.DeliveryAddressCode,
                    despatchItem?.DeliveryAddressCode
                ),
                Müşteri: ilkDoluDeger(
                    item.CurrentAccountTitle,
                    despatchItem?.CurrentAccountTitle
                ),
                "Araç Çalışma Tipi": vehicleWorkingName,
                "Filo / Spot": tedarikEdildiMi
                    ? filoMu({ ...item, VehicleWorkingName: vehicleWorkingName })
                        ? "Filo"
                        : "Spot"
                    : "",
                "SHÖ Durumu": booleanCevir(isPrint) ? "Basılı" : "Basılmamış",
                "Geç Tedarik": gecTedarikMi ? "Evet" : "Hayır",
                "Yükleme Varış / Oluşturma Tarihi": tarihFormatla(loadingDate),
            });
        }

        if (!despKey || !despKey.startsWith("SFR")) return;
        if (iptalMi) return;

        s.ted.add(despKey);

        if (filoMu({ ...item, VehicleWorkingName: vehicleWorkingName })) {
            s.filo.add(despKey);
        } else {
            s.spot.add(despKey);
        }

        if (booleanCevir(isPrint)) {
            s.sho_b.add(despKey);
        } else {
            s.sho_bm.add(despKey);
        }

        if (gecTedarikMi) {
            s.gec.add(despKey);
        }
    });

    let satirlar = Object.values(stats).map((s) => {
        const plan = s.plan.size;
        const ted = s.ted.size;
        const gec = s.gec.size;
        const zamaninda = Math.max(0, ted - gec);
        const edilmeyen = Math.max(0, plan - ted);
        const yuzde = plan > 0 ? Math.round((zamaninda / plan) * 100) : 0;
        const shoOrani = ted > 0 ? Math.round((s.sho_b.size / ted) * 100) : 0;

        return {
            proje: s.name,
            plan,
            ted,
            spot: s.spot.size,
            filo: s.filo.size,
            shoOrani,
            edilmeyen,
            gec,
            zamaninda,
            yuzde,
        };
    });

    satirlar = satirlar.sort((a, b) => b.yuzde - a.yuzde);

    const toplam = satirlar.reduce(
        (acc, r) => {
            acc.plan += r.plan;
            acc.ted += r.ted;
            acc.edilmeyen += r.edilmeyen;
            acc.gec += r.gec;
            acc.zamaninda += r.zamaninda;
            return acc;
        },
        {
            plan: 0,
            ted: 0,
            edilmeyen: 0,
            gec: 0,
            zamaninda: 0,
        }
    );

    const genelPerformans =
        toplam.plan > 0
            ? Math.round((toplam.zamaninda / toplam.plan) * 100)
            : 0;

    const tabloHtml = `
<div style="margin-top:22px;font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#111827;">
    <div style="border:1px solid #dbe3ef;border-radius:12px;padding:18px 20px;margin-bottom:16px;background:#ffffff;">
        <div style="font-size:18px;font-weight:800;color:#111827;">
            Tedarik Analiz Rapor Özeti
        </div>
        <div style="font-size:13px;color:#475569;margin-top:6px;">
            ${startDate} tarihli seçili projelere ait talep ve tedarik performansı
        </div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:10px 0;margin-bottom:18px;background:#ffffff;">
        <tr>
            <td style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:14px;">
                <div style="font-size:11px;font-weight:800;color:#1d4ed8;">TOPLAM TALEP</div>
                <div style="font-size:24px;font-weight:800;color:#1e3a8a;margin-top:6px;">${toplam.plan}</div>
            </td>
            <td style="border:1px solid #bbf7d0;background:#ecfdf5;border-radius:10px;padding:14px;">
                <div style="font-size:11px;font-weight:800;color:#15803d;">TEDARİK EDİLEN</div>
                <div style="font-size:24px;font-weight:800;color:#166534;margin-top:6px;">${toplam.ted}</div>
            </td>
            <td style="border:1px solid #fecaca;background:#fef2f2;border-radius:10px;padding:14px;">
                <div style="font-size:11px;font-weight:800;color:#b91c1c;">TEDARİK EDİLMEYEN</div>
                <div style="font-size:24px;font-weight:800;color:#991b1b;margin-top:6px;">${toplam.edilmeyen}</div>
            </td>
            <td style="border:1px solid #cbd5e1;background:#f8fafc;border-radius:10px;padding:14px;">
                <div style="font-size:11px;font-weight:800;color:#334155;">GENEL PERFORMANS</div>
                <div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:6px;">%${genelPerformans}</div>
            </td>
        </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #dbe3ef;font-size:13px;">
        <thead>
            <tr>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:left;border:1px solid #0f172a;">Proje</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">Talep</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">Tedarik</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">Spot</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">Filo</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">SHÖ</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">Edilmeyen</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">Geç</th>
                <th style="background:#0f172a;color:#ffffff;padding:12px;text-align:center;border:1px solid #0f172a;">Performans</th>
            </tr>
        </thead>
        <tbody>
            ${satirlar
            .map((r, index) => {
                const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
                const perfBg =
                    r.yuzde >= 85
                        ? "#dcfce7"
                        : r.yuzde >= 60
                            ? "#fef3c7"
                            : "#fee2e2";
                const perfColor =
                    r.yuzde >= 85
                        ? "#166534"
                        : r.yuzde >= 60
                            ? "#92400e"
                            : "#991b1b";

                return `
                    <tr>
                        <td style="background:${bg};color:#111827;padding:11px;border:1px solid #e5e7eb;font-weight:700;">${r.proje}</td>
                        <td style="background:${bg};color:#111827;padding:11px;border:1px solid #e5e7eb;text-align:center;">${r.plan}</td>
                        <td style="background:${bg};color:#15803d;padding:11px;border:1px solid #e5e7eb;text-align:center;font-weight:800;">${r.ted}</td>
                        <td style="background:${bg};color:#111827;padding:11px;border:1px solid #e5e7eb;text-align:center;">${r.spot}</td>
                        <td style="background:${bg};color:#111827;padding:11px;border:1px solid #e5e7eb;text-align:center;">${r.filo}</td>
                        <td style="background:${bg};color:#111827;padding:11px;border:1px solid #e5e7eb;text-align:center;font-weight:800;">%${r.shoOrani}</td>
                        <td style="background:${bg};color:#dc2626;padding:11px;border:1px solid #e5e7eb;text-align:center;font-weight:800;">${r.edilmeyen}</td>
                        <td style="background:${bg};color:#dc2626;padding:11px;border:1px solid #e5e7eb;text-align:center;font-weight:800;">${r.gec}</td>
                        <td style="background:${bg};padding:11px;border:1px solid #e5e7eb;text-align:center;">
                            <span style="display:inline-block;background:${perfBg};color:${perfColor};border:1px solid ${perfColor};border-radius:999px;padding:5px 10px;font-weight:800;">
                                %${r.yuzde}
                            </span>
                        </td>
                    </tr>
                `;
            })
            .join("")}
        </tbody>
    </table>

    <div style="font-size:12px;color:#64748b;margin-top:14px;">
        Excel detay dosyası otomatik indirilmiştir. Lütfen Outlook mailine ek olarak ekleyiniz.
    </div>
</div>
`;

    return {
        startDate,
        endDate,
        satirlar,
        tabloHtml,
        excelSatirlari,
        excelIndir: async () =>
            excelDosyasiIndir({
                startDate,
                satirlar,
                excelSatirlari,
            }),
    };
}