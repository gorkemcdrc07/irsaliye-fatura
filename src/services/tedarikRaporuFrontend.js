import { supabase } from "../supabaseClient";
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

function raporTarihiOlustur() {
    const dun = new Date();
    dun.setDate(dun.getDate() - 1);
    const tarih = dun.toISOString().slice(0, 10);
    return { startDate: tarih, endDate: tarih };
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
    if (!res.ok) throw new Error(`TMS Despatch API hata: ${res.status}`);
    return extractItems(payload);
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
            item.TMSDespatchDocumentNo || item.DocumentNo || item.DespatchDocumentNo
        );
        if (key) despatchMap[key] = item;
    });

    const stats = {};
    for (const projeAdi of projeAdlari) {
        stats[norm(projeAdi)] = {
            name: projeAdi,
            plan: new Set(), ted: new Set(), spot: new Set(),
            filo: new Set(), sho_b: new Set(), sho_bm: new Set(), gec: new Set(),
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
        if (talepKey && !talepKey.startsWith("BOS")) s.plan.add(talepKey);

        if (!despKey || !despKey.startsWith("SFR")) return;
        if (sayiCevir(item.OrderStatu) === 200) return;

        s.ted.add(despKey);
        const despatchItem = despatchMap[despKey];
        const vehicleWorkingName =
            item.VehicleWorkingName || despatchItem?.VehicleWorkingName ||
            despatchItem?.WorkingTypeName || despatchItem?.VehicleWorkingTypeName;

        if (filoMu({ ...item, VehicleWorkingName: vehicleWorkingName })) s.filo.add(despKey);
        else s.spot.add(despKey);

        const isPrint = item.IsPrint ?? despatchItem?.IsPrint ?? despatchItem?.DocumentPrint ?? false;
        if (booleanCevir(isPrint)) s.sho_b.add(despKey); else s.sho_bm.add(despKey);

        const loadingDate =
            item.TMSLoadingDocumentPrintedDate || despatchItem?.TMSLoadingDocumentPrintedDate ||
            despatchItem?.TMSDespatchArrivalTime || despatchItem?.TMSDespatchVehicleDate ||
            despatchItem?.EstimatedArrivalTime || item.TMSDespatchArrivalTime ||
            item.TMSDespatchVehicleDate || item.TMSDespatchCreatedDate;

        if (isGecTedarik(item.PickupDate, loadingDate)) s.gec.add(despKey);
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
            proje: s.name, plan, ted, spot: s.spot.size, filo: s.filo.size,
            shoOrani, edilmeyen, gec, zamaninda, yuzde,
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
                    <th style="padding:10px;border:1px solid #e2e8f0;">SHÖ Oraný</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Tedarik Edilmeyen</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Geç Tedarik</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;">Zamanýnda Oraný</th>
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

    return { startDate, endDate, satirlar, tabloHtml };
}