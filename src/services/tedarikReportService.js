const ENV =
    typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env
        : typeof process !== "undefined"
            ? process.env
            : {};

const TMS_ORDERS_API_URL = "https://api.odaklojistik.com.tr/api/tmsorders/getall";
const TMS_DESPATCH_API_URL = "https://api.odaklojistik.com.tr/api/tmsdespatches/getall";

const TOKEN = ENV.VITE_TMS_TOKEN;
const DEFAULT_USER_ID = Number(ENV.VITE_TMS_USER_ID || 85);

function toIsoStart(dateValue) {
    return `${dateValue}T00:00:00`;
}

function toIsoEnd(dateValue) {
    return `${dateValue}T23:59:59`;
}

function extractItems(payload) {
    if (!payload) return [];
    const root = payload.items ?? payload.data ?? payload.Data ?? payload;
    const arr = root?.Data ?? root?.data ?? root?.items ?? root;
    return Array.isArray(arr) ? arr : [];
}

function norm(value) {
    return (value ?? "")
        .toString()
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .replace(/\r?\n/g, " ")
        .trim()
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ");
}

function talepNoNormalizeEt(value) {
    return (value ?? "")
        .toString()
        .replace(/\s+/g, "")
        .trim()
        .toLocaleUpperCase("tr-TR");
}

function seferNoNormalizeEt(value) {
    const s = (value ?? "").toString().trim();
    if (!s) return "";

    const up = s.toLocaleUpperCase("tr-TR");
    const m = up.match(/SFR\s*\d+/);

    if (m) return m[0].replace(/\s+/g, "");
    if (/^\d{8,}$/.test(up)) return `SFR${up}`;

    return up.split(/\s+/)[0];
}

function booleanCevir(value) {
    if (value === true || value === 1 || value === "1") return true;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return false;
}

function sayiCevir(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isGecTedarik(pickupDate, loadingDate) {
    const yukleme = parseDate(pickupDate);
    const varis = parseDate(loadingDate);
    if (!yukleme || !varis) return false;

    const farkSaat = (varis.getTime() - yukleme.getTime()) / (1000 * 60 * 60);
    return farkSaat >= 30;
}

function hizmetKapsamdaMi() {
    return true;
}

export function projeAdiniDuzenle(item) {
    const pNorm = norm(item.ProjectName);
    let finalProjectName = item.ProjectName;

    if (pNorm === norm("KÜÇÜKBAY FTL")) {
        const trakyaIlleri = new Set(["EDİRNE", "KIRKLARELİ", "TEKİRDAĞ"].map(norm));
        if (trakyaIlleri.has(norm(item.PickupCityName))) finalProjectName = "KÜÇÜKBAY TRAKYA FTL";
        else if (norm(item.PickupCityName) === norm("İZMİR")) finalProjectName = "KÜÇÜKBAY İZMİR FTL";
        else return null;
    }

    if (pNorm === norm("PEPSİ FTL")) {
        const city = norm(item.PickupCityName);
        const county = norm(item.PickupCountyName);
        if (city === norm("TEKİRDAĞ") && county === norm("ÇORLU")) finalProjectName = "PEPSİ FTL ÇORLU";
        else if (city === norm("KOCAELİ") && county === norm("GEBZE")) finalProjectName = "PEPSİ FTL GEBZE";
    }

    if (pNorm === norm("EBEBEK FTL")) {
        if (norm(item.PickupCityName) === norm("KOCAELİ") && norm(item.PickupCountyName) === norm("GEBZE")) {
            finalProjectName = "EBEBEK FTL GEBZE";
        }
    }

    if (pNorm === norm("FAKİR FTL")) {
        if (norm(item.PickupCityName) === norm("KOCAELİ") && norm(item.PickupCountyName) === norm("GEBZE")) {
            finalProjectName = "FAKİR FTL GEBZE";
        }
    }

    if (pNorm === norm("MODERN BOBİN FTL")) {
        if (norm(item.PickupCityName) === norm("ZONGULDAK")) finalProjectName = "MODERN BOBİN ZONGULDAK FTL";
        else if (norm(item.PickupCityName) === norm("TEKİRDAĞ")) finalProjectName = "MODERN BOBİN TEKİRDAĞ FTL";
        else return null;
    }

    if (pNorm === norm("OTTONYA")) finalProjectName = "OTTONYA (HEDEFTEN AÇILIYOR)";

    return finalProjectName;
}

function filoMu(item) {
    const filoAdlari = new Set([
        "FİLO", "ÖZMAL", "MİKRO DDS", "KONTEYNER FİLO", "DDS ÖZMAL",
        "MODERN AMBALAJ FİLO", "ES GLOBAL FİLO", "FRİGO ÖZMAL", "FRİGO KİRALIK",
        "DENTAŞ ESKİŞEHİR KİRALIK", "HAYAT KİMYA KİRALIK", "PEPSİ KİRALIK",
        "DENTAŞ ÇORLU KİRALIK", "KİPAŞ KİRALIK",
    ].map(norm));

    return filoAdlari.has(norm(item.VehicleWorkingName));
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

    if (!res.ok) {
        throw new Error(`TMS Orders API hata: ${res.status}`);
    }

    return extractItems(payload);
}

async function tmsDespatchesCek({ startDate, endDate, userId = DEFAULT_USER_ID }) {
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

    if (!res.ok) {
        throw new Error(`TMS Despatch API hata: ${res.status}`);
    }

    return extractItems(payload);
}

function raporTarihiOlustur() {
    const dun = new Date();
    dun.setDate(dun.getDate() - 1);

    const tarih = dun.toISOString().slice(0, 10);

    return {
        startDate: tarih,
        endDate: tarih,
    };
}

export async function tedarikRaporuOlustur({ supabaseAdmin, projeIds }) {
    const { startDate, endDate } = raporTarihiOlustur();

    const { data: projeler, error: projeError } = await supabaseAdmin
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
            item.TMSDespatchDocumentNo || item.DocumentNo || item.DespatchDocumentNo
        );
        if (key) despatchMap[key] = item;
    });

    const stats = {};

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

        if (talepKey && !talepKey.startsWith("BOS")) {
            s.plan.add(talepKey);
        }

        if (!despKey || !despKey.startsWith("SFR")) return;

        if (sayiCevir(item.OrderStatu) === 200) return;

        s.ted.add(despKey);

        const despatchItem = despatchMap[despKey];

        const vehicleWorkingName =
            item.VehicleWorkingName ||
            despatchItem?.VehicleWorkingName ||
            despatchItem?.WorkingTypeName ||
            despatchItem?.VehicleWorkingTypeName;

        if (filoMu({ ...item, VehicleWorkingName: vehicleWorkingName })) {
            s.filo.add(despKey);
        } else {
            s.spot.add(despKey);
        }

        const isPrint =
            item.IsPrint ??
            despatchItem?.IsPrint ??
            despatchItem?.DocumentPrint ??
            false;

        if (booleanCevir(isPrint)) {
            s.sho_b.add(despKey);
        } else {
            s.sho_bm.add(despKey);
        }

        const loadingDate =
            item.TMSLoadingDocumentPrintedDate ||
            despatchItem?.TMSLoadingDocumentPrintedDate ||
            despatchItem?.TMSDespatchArrivalTime ||
            despatchItem?.TMSDespatchVehicleDate ||
            despatchItem?.EstimatedArrivalTime ||
            item.TMSDespatchArrivalTime ||
            item.TMSDespatchVehicleDate ||
            item.TMSDespatchCreatedDate;

        if (isGecTedarik(item.PickupDate, loadingDate)) {
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

    const tabloHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:20px;font-size:13px;">
            <thead>
                <tr style="background:#0f172a;color:#ffffff;">
                    <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Proje</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Talep</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Tedarik Edilen</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Spot</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Filo</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">SHÖ Oranı</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Tedarik Edilmeyen</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Geç Tedarik</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Zamanında Oranı</th>
                </tr>
            </thead>
            <tbody>
                ${satirlar.map((r) => `
                    <tr>
                        <td style="padding:9px;border:1px solid #e2e8f0;font-weight:700;">${r.proje}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;">${r.plan}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;">${r.ted}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;">${r.spot}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;">${r.filo}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;font-weight:800;">%${r.shoOrani}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;">${r.edilmeyen}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;">${r.gec}</td>
                        <td style="padding:9px;border:1px solid #e2e8f0;text-align:center;font-weight:800;">%${r.yuzde}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    return {
        startDate,
        endDate,
        satirlar,
        tabloHtml,
    };
}

export {
    norm,
    talepNoNormalizeEt,
    seferNoNormalizeEt,
    extractItems,
    toIsoStart,
    toIsoEnd,
    parseDate,
    booleanCevir,
    sayiCevir,
    isGecTedarik,
    hizmetKapsamdaMi,
    filoMu,
};