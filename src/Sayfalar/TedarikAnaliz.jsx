import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "./TedarikAnaliz.css";
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
} from "../services/tedarikReportService";
const API_BASE =
    import.meta.env.VITE_ODAK_API_URL || "https://api.odaklojistik.com.tr";

const TMS_ORDERS_API_URL =
    `${API_BASE}/api/tmsorders/getall`;

const TMS_DESPATCH_API_URL =
    `${API_BASE}/api/tmsdespatches/getall`;

const TOKEN = import.meta.env.VITE_TMS_TOKEN;
const DEFAULT_USER_ID = Number(import.meta.env.VITE_TMS_USER_ID || 85);

const SAAT_SECENEKLERI = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00",
];

const REGIONS = {
    TRAKYA: [
        "BUNGE LÜLEBURGAZ FTL", "BUNGE GEBZE FTL", "BUNGE PALET", "REKA FTL", "EKSUN GIDA FTL",
        "SARUHAN FTL", "PEPSİ FTL", "PEPSİ FTL ÇORLU", "TEKİRDAĞ UN FTL", "AYDINLI MODA FTL",
        "ADKOTURK FTL", "ADKOTURK FTL ENERJİ İÇECEĞİ", "SGS FTL", "BSH FTL", "ALTERNA GIDA FTL",
        "BİLEŞİM KİMYA FTL", "DERYA OFİS FTL", "SAPRO FTL", "MARMARA CAM FTL", "FAKİR FTL",
        "MODERN KARTON FTL", "KÜÇÜKBAY TRAKYA FTL", "MODERN BOBİN TEKİRDAĞ FTL", "SUDESAN FTL",
    ],
    GEBZE: [
        "HEDEF FTL", "HEDEF DIŞ TEDARİK", "PEPSİ FTL GEBZE", "EBEBEK FTL GEBZE", "FAKİR FTL GEBZE",
        "MİLHANS FTL", "AYDIN KURUYEMİŞ FTL", "AVANSAS FTL", "AVANSAS SPOT FTL", "DSV ERNAMAŞ FTL",
        "FLO FTL", "ÇİÇEKCİ FTL", "ÇİZMECİ GIDA FTL", "OTTONYA (HEDEFTEN AÇILIYOR)", "GALEN ÇOCUK FTL",
        "ENTAŞ FTL", "NAZAR KİMYA FTL",
    ],
    DERİNCE: [
        "ARKAS PETROL OFİSİ DERİNCE FTL", "ARKAS PETROL OFİSİ DIŞ TERMİNAL FTL", "ARKAS TOGG", "ARKAS SPOT FTL",
    ],
    İZMİR: [
        "EURO GIDA FTL", "EBEBEK FTL", "KİPAŞ SÖKE FTL", "CEYSU FTL", "TAT GIDA FTL",
        "ZER SALÇA", "ANKUTSAN FTL", "PELAGOS GIDA FTL", "KÜÇÜKBAY İZMİR FTL",
    ],
    ÇUKUROVA: [
        "PEKER FTL", "GDP FTL", "ÖZMEN UN FTL", "KİPAŞ MARAŞ FTL", "TÜRK OLUKLU FTL",
        "İLKON TEKSTİL FTL", "BİM / MERSİN",
    ],
    ESKİŞEHİR: [
        "ES FTL", "ES GLOBAL FRİGO FTL", "KİPAŞ BOZÜYÜK FTL", "2A TÜKETİM FTL", "MODERN HURDA DÖNÜŞ FTL",
        "MODERN HURDA ZONGULDAK FTL", "ŞİŞECAM FTL", "DENTAŞ FTL", "MODERN AMBALAJ FTL", "MODERN BOBİN ZONGULDAK FTL",
    ],
    "İÇ ANADOLU": ["APAK FTL", "SER DAYANIKLI FTL", "UNIFO FTL", "UNIFO ASKERİ FTL"],
    AFYON: ["BİM AFYON PLATFORM FTL"],
    DİĞER: ["DOĞTAŞ İNEGÖL FTL", "AKTÜL FTL"],
};

async function tmsVerileriniCek({ startDate, endDate, userId }) {
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
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!res.ok) { console.error("TMS ORDERS API HATA:", payload); throw new Error(`TMS Orders API hata: ${res.status}`); }
    return extractItems(payload);
}

async function tmsDespatchesCek({ startDate, endDate, userId }) {
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
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!res.ok) { console.error("TMS DESPATCH API HATA:", payload); throw new Error(`TMS Despatch API hata: ${res.status}`); }
    return extractItems(payload);
}

function perfColor(pct) {
    if (pct >= 85) return "#16a34a";
    if (pct >= 60) return "#475569";
    return "#dc2626";
}

function KpiCard({ title, value, color, maxVal }) {
    const numVal = typeof value === "string" ? parseInt(value, 10) : value;
    const fillPct = maxVal > 0 ? Math.min(100, (numVal / maxVal) * 100) : 0;
    return (
        <div className="ta-kpi-card">
            <div className="ta-kpi-label">{title}</div>
            <div className="ta-kpi-value" style={{ color: color || "#0f172a" }}>{value}</div>
            <div className="ta-kpi-bar">
                <div className="ta-kpi-bar-fill" style={{ width: `${fillPct}%`, background: color || "#0f172a" }} />
            </div>
        </div>
    );
}

function PerfCell({ pct }) {
    const col = perfColor(pct);
    return (
        <div className="ta-perf-wrap">
            <div className="ta-perf-track">
                <div className="ta-perf-fill" style={{ width: `${pct}%`, background: col }} />
            </div>
            <span className="ta-perf-label" style={{ color: col }}>{pct}%</span>
        </div>
    );
}

export default function TedarikAnaliz() {
    const today = new Date().toISOString().slice(0, 10);

    const [baslangic, setBaslangic] = useState(today);
    const [bitis, setBitis] = useState(today);
    const [userId, setUserId] = useState(DEFAULT_USER_ID);
    const [seciliBolge, setSeciliBolge] = useState("GEBZE");
    const [arama, setArama] = useState("");

    const [rows, setRows] = useState([]);
    const [despatchRows, setDespatchRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [dbBolgeler, setDbBolgeler] = useState([]);
    const [dbProjeler, setDbProjeler] = useState([]);
    const [mailGruplari, setMailGruplari] = useState([]);
    const [ayarPanelAcik, setAyarPanelAcik] = useState(false);
    const [ayarLoading, setAyarLoading] = useState(false);
    const [ayarMesaj, setAyarMesaj] = useState("");
    const [ayarTab, setAyarTab] = useState("bolge");

    const [yeniBolgeAdi, setYeniBolgeAdi] = useState("");
    const [yeniProjeAdi, setYeniProjeAdi] = useState("");
    const [projeBolgeId, setProjeBolgeId] = useState("");

    const [mailGrupAdi, setMailGrupAdi] = useState("");
    const [mailKime, setMailKime] = useState("");
    const [mailSs, setMailSs] = useState("");
    const [mailKonu, setMailKonu] = useState("");
    const [mailBody, setMailBody] = useState("");
    const [mailProjeIds, setMailProjeIds] = useState([]);
    const [mailSaatler, setMailSaatler] = useState([]);
    const [manuelSaat, setManuelSaat] = useState("");

    // Düzenleme modu için
    const [duzenleGrupId, setDuzenleGrupId] = useState(null);

    async function ayarVerileriniCek() {
        setAyarLoading(true);
        setAyarMesaj("");
        try {
            const { data: bolgeler, error: bolgeError } = await supabase
                .from("tedarik_bolgeler").select("*").order("bolge_adi", { ascending: true });
            if (bolgeError) throw bolgeError;

            const { data: projeler, error: projeError } = await supabase
                .from("tedarik_projeler").select("*").order("proje_adi", { ascending: true });
            if (projeError) throw projeError;

            const { data: gruplar, error: grupError } = await supabase
                .from("tedarik_mail_gruplari").select("*").order("created_at", { ascending: false });
            if (grupError) throw grupError;

            setDbBolgeler(bolgeler || []);
            setDbProjeler(projeler || []);
            setMailGruplari(gruplar || []);
        } catch (e) {
            console.error("Ayar verileri çekilemedi:", e);
            setAyarMesaj(e?.message || "Ayar verileri çekilemedi.");
        } finally {
            setAyarLoading(false);
        }
    }

    useEffect(() => { ayarVerileriniCek(); }, []);

    async function bolgeEkle() {
        const ad = norm(yeniBolgeAdi);
        if (!ad) { setAyarMesaj("Bölge adı boş olamaz."); return; }
        setAyarLoading(true);
        setAyarMesaj("");
        const { error: insertError } = await supabase.from("tedarik_bolgeler").insert([{ bolge_adi: ad }]);
        setAyarLoading(false);
        if (insertError) { setAyarMesaj(insertError.message); return; }
        setYeniBolgeAdi("");
        setSeciliBolge(ad);
        await ayarVerileriniCek();
        setAyarMesaj("Bölge kaydedildi.");
    }

    async function projeEkle() {
        const ad = norm(yeniProjeAdi);
        if (!projeBolgeId) { setAyarMesaj("Proje eklemek için bölge seçmelisiniz."); return; }
        if (!ad) { setAyarMesaj("Proje adı boş olamaz."); return; }
        setAyarLoading(true);
        setAyarMesaj("");
        const { error: insertError } = await supabase
            .from("tedarik_projeler")
            .insert([{ bolge_id: Number(projeBolgeId), proje_adi: ad }]);
        setAyarLoading(false);
        if (insertError) { setAyarMesaj(insertError.message); return; }
        setYeniProjeAdi("");
        await ayarVerileriniCek();
        setAyarMesaj("Proje kaydedildi.");
    }

    async function varsayilanBolgeProjeleriAktar() {
        setAyarLoading(true);
        setAyarMesaj("");
        try {
            for (const [bolgeAdi, projeler] of Object.entries(REGIONS)) {
                const bolgeAd = norm(bolgeAdi);
                const { data: bolgeData, error: bolgeError } = await supabase
                    .from("tedarik_bolgeler")
                    .upsert([{ bolge_adi: bolgeAd }], { onConflict: "bolge_adi" })
                    .select("id").single();
                if (bolgeError) throw bolgeError;
                const insertProjeler = projeler.map((projeAdi) => ({
                    bolge_id: bolgeData.id,
                    proje_adi: norm(projeAdi),
                }));
                const { error: projeError } = await supabase
                    .from("tedarik_projeler")
                    .upsert(insertProjeler, { onConflict: "bolge_id,proje_adi" });
                if (projeError) throw projeError;
            }
            await ayarVerileriniCek();
            setAyarMesaj("Varsayılan bölge ve projeler Supabase'e aktarıldı.");
        } catch (e) {
            console.error("Varsayılan aktarım hatası:", e);
            setAyarMesaj(e?.message || "Varsayılan aktarım yapılamadı.");
        } finally {
            setAyarLoading(false);
        }
    }

    function mailFormSifirla() {
        setMailGrupAdi("");
        setMailKime("");
        setMailSs("");
        setMailKonu("");
        setMailBody("");
        setMailProjeIds([]);
        setMailSaatler([]);
        setManuelSaat("");
        setDuzenleGrupId(null);
    }

    function mailGrupDuzenle(g) {
        setDuzenleGrupId(g.id);
        setMailGrupAdi(g.grup_adi || "");
        setMailKime(g.kime || "");
        setMailSs(g.ss || "");
        setMailKonu(g.konu || "");
        setMailBody(g.body || "");
        setMailProjeIds(g.proje_ids || []);
        setMailSaatler(g.saatler || []);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function mailGrupSil(id) {
        if (!window.confirm("Bu mail grubunu silmek istediğinizden emin misiniz?")) return;
        setAyarLoading(true);
        const { error } = await supabase.from("tedarik_mail_gruplari").delete().eq("id", id);
        setAyarLoading(false);
        if (error) { setAyarMesaj(error.message); return; }
        await ayarVerileriniCek();
        setAyarMesaj("Mail grubu silindi.");
    }

    async function mailGrubuKaydet() {
        if (!mailGrupAdi.trim()) { setAyarMesaj("Grup adı boş olamaz."); return; }
        if (!mailKime.trim()) { setAyarMesaj("Kime alanı boş olamaz."); return; }
        if (mailProjeIds.length === 0) { setAyarMesaj("En az bir proje seçmelisiniz."); return; }
        if (mailSaatler.length === 0) { setAyarMesaj("En az bir gönderim saati seçmelisiniz."); return; }

        setAyarLoading(true);
        setAyarMesaj("");

        const payload = {
            grup_adi: mailGrupAdi.trim(),
            kime: mailKime.trim(),
            ss: mailSs.trim(),
            konu: mailKonu.trim(),
            body: mailBody.trim(),
            proje_ids: mailProjeIds.map(Number),
            saatler: mailSaatler,
            aktif: true,
        };

        let dbError;
        if (duzenleGrupId) {
            const { error } = await supabase
                .from("tedarik_mail_gruplari")
                .update(payload)
                .eq("id", duzenleGrupId);
            dbError = error;
        } else {
            const { error } = await supabase
                .from("tedarik_mail_gruplari")
                .insert([payload]);
            dbError = error;
        }

        setAyarLoading(false);
        if (dbError) { setAyarMesaj(dbError.message); return; }

        mailFormSifirla();
        await ayarVerileriniCek();
        setAyarMesaj(duzenleGrupId ? "Mail grubu güncellendi." : "Mail grubu kaydedildi.");
    }

    function mailProjeSecimiDegistir(projeId, checked) {
        setMailProjeIds((prev) => {
            if (checked) return prev.includes(projeId) ? prev : [...prev, projeId];
            return prev.filter((id) => id !== projeId);
        });
    }

    function mailSaatDegistir(saat, checked) {
        setMailSaatler((prev) => {
            if (checked) return prev.includes(saat) ? prev : [...prev, saat].sort();
            return prev.filter((s) => s !== saat);
        });
    }

    function manuelSaatEkle() {
        if (!manuelSaat) {
            setAyarMesaj("Saat alanı boş olamaz.");
            return;
        }

        setMailSaatler((prev) => {
            if (prev.includes(manuelSaat)) return prev;
            return [...prev, manuelSaat].sort();
        });

        setManuelSaat("");
    }

    async function handleVerileriCek() {
        setLoading(true);
        setError("");
        setRows([]);
        setDespatchRows([]);
        try {
            const [orderItems, despatchItems] = await Promise.all([
                tmsVerileriniCek({ startDate: baslangic, endDate: bitis, userId }),
                tmsDespatchesCek({ startDate: baslangic, endDate: bitis, userId }),
            ]);
            setRows(orderItems);
            setDespatchRows(despatchItems);
        } catch (e) {
            setError(e?.message || "Veri çekilemedi");
        } finally {
            setLoading(false);
        }
    }

    const despatchMap = useMemo(() => {
        const map = {};
        despatchRows.forEach((item) => {
            const key = seferNoNormalizeEt(
                item.TMSDespatchDocumentNo || item.DocumentNo || item.DespatchDocumentNo
            );
            if (key) map[key] = item;
        });
        return map;
    }, [despatchRows]);

    const islenmisVeri = useMemo(() => {
        const stats = {};
        rows.forEach((item) => {
            if (!hizmetKapsamdaMi(item)) return;
            const projeAdi = projeAdiniDuzenle(item);
            if (!projeAdi) return;
            const key = norm(projeAdi);
            if (!stats[key]) {
                stats[key] = {
                    projeAdi,
                    plan: new Set(), ted: new Set(), iptal: new Set(),
                    filo: new Set(), spot: new Set(), sho_b: new Set(),
                    sho_bm: new Set(), gec_tedarik: new Set(),
                };
            }
            const s = stats[key];
            const reqNo = talepNoNormalizeEt(item.TMSVehicleRequestDocumentNo);
            const despKey = seferNoNormalizeEt(item.TMSDespatchDocumentNo);
            const talepKey = reqNo || despKey;
            if (talepKey && !talepKey.startsWith("BOS")) s.plan.add(talepKey);
            if (!despKey || !despKey.startsWith("SFR")) return;
            if (sayiCevir(item.OrderStatu) === 200) { s.iptal.add(despKey); return; }
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
            if (isGecTedarik(item.PickupDate, loadingDate)) s.gec_tedarik.add(despKey);
        });
        return stats;
    }, [rows, despatchMap]);

    const bolgeListesi = useMemo(() => {
        return dbBolgeler.length > 0
            ? dbBolgeler.map((b) => b.bolge_adi)
            : Object.keys(REGIONS);
    }, [dbBolgeler]);

    useEffect(() => {
        if (bolgeListesi.length > 0 && !bolgeListesi.includes(seciliBolge)) {
            setSeciliBolge(bolgeListesi[0]);
        }
    }, [bolgeListesi, seciliBolge]);

    const satirlar = useMemo(() => {
        const seciliDbBolge = dbBolgeler.find((b) => b.bolge_adi === seciliBolge);
        const bolgeProjeleri = seciliDbBolge
            ? dbProjeler.filter((p) => p.bolge_id === seciliDbBolge.id).map((p) => p.proje_adi)
            : REGIONS[seciliBolge] || [];
        const q = norm(arama);
        return bolgeProjeleri
            .map((projeAdi) => {
                const s = islenmisVeri[norm(projeAdi)] || {
                    plan: new Set(), ted: new Set(), iptal: new Set(),
                    filo: new Set(), spot: new Set(), sho_b: new Set(),
                    sho_bm: new Set(), gec_tedarik: new Set(),
                };
                const plan = s.plan.size;
                const ted = s.ted.size;
                const iptal = s.iptal.size;
                const gec = s.gec_tedarik.size;
                const zamaninda = Math.max(0, ted - gec);
                const edilmeyen = Math.max(0, plan - (ted + iptal));
                const yuzde = plan > 0
                    ? Math.max(0, Math.min(100, Math.round((zamaninda / plan) * 100)))
                    : 0;
                return {
                    name: projeAdi, plan, ted, iptal, edilmeyen,
                    spot: s.spot.size, filo: s.filo.size,
                    sho_b: s.sho_b.size, sho_bm: s.sho_bm.size,
                    gec, zamaninda, yuzde,
                };
            })
            .filter((r) => r.plan > 0)
            .filter((r) => (q ? norm(r.name).includes(q) : true))
            .sort((a, b) => {
                if (b.yuzde !== a.yuzde) return b.yuzde - a.yuzde;
                const aSorun = a.edilmeyen + a.gec;
                const bSorun = b.edilmeyen + b.gec;
                if (aSorun !== bSorun) return aSorun - bSorun;
                return b.ted - a.ted;
            });
    }, [islenmisVeri, seciliBolge, arama, dbBolgeler, dbProjeler]);

    const kpi = useMemo(() => {
        const sum = satirlar.reduce(
            (acc, r) => {
                acc.plan += r.plan; acc.ted += r.ted; acc.edilmeyen += r.edilmeyen;
                acc.spot += r.spot; acc.filo += r.filo; acc.gec += r.gec; acc.zamaninda += r.zamaninda;
                return acc;
            },
            { plan: 0, ted: 0, edilmeyen: 0, spot: 0, filo: 0, gec: 0, zamaninda: 0 }
        );
        sum.perf = sum.plan > 0 ? Math.round((sum.zamaninda / sum.plan) * 100) : 0;
        return sum;
    }, [satirlar]);

    return (
        <div className="ta-root">
            <div className="ta-header">
                <div className="ta-header-icon">🚛</div>
                <div className="ta-header-text">
                    <div className="ta-header-title">Tedarik Analiz</div>
                    <div className="ta-header-sub">TMS Sipariş &amp; Sefer Performans Paneli</div>
                </div>
                <button className="ta-settings-btn" onClick={() => setAyarPanelAcik(true)}>
                    ⚙ Ayarlar
                </button>
            </div>

            <div className="ta-panel">
                <div className="ta-panel-title">Veri Filtresi</div>
                <div className="ta-filter-row">
                    <div className="ta-field">
                        <label className="ta-label">Başlangıç</label>
                        <input className="ta-input" type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
                    </div>
                    <div className="ta-field">
                        <label className="ta-label">Bitiş</label>
                        <input className="ta-input" type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
                    </div>
                    <div className="ta-field">
                        <label className="ta-label">User ID</label>
                        <input className="ta-input" type="number" value={userId} onChange={(e) => setUserId(e.target.value)} />
                    </div>
                    <button className="ta-btn" onClick={handleVerileriCek} disabled={loading}>
                        {loading ? <><span className="ta-btn-spin">⟳</span> Yükleniyor...</> : <><span>⬇</span> Verileri Çek</>}
                    </button>
                </div>
            </div>

            {error && (
                <div className="ta-error">
                    <span>⚠</span>{error}
                </div>
            )}

            <div className="ta-kpi-grid">
                <KpiCard title="Toplam Talep" value={kpi.plan} color="#2563eb" maxVal={kpi.plan} />
                <KpiCard title="Tedarik" value={kpi.ted} color="#16a34a" maxVal={kpi.plan} />
                <KpiCard title="Edilmeyen" value={kpi.edilmeyen} color="#dc2626" maxVal={kpi.plan} />
                <KpiCard title="Spot" value={kpi.spot} color="#0f172a" maxVal={kpi.ted} />
                <KpiCard title="Filo" value={kpi.filo} color="#7c3aed" maxVal={kpi.ted} />
                <KpiCard title="Gecikme" value={kpi.gec} color="#dc2626" maxVal={kpi.ted} />
                <KpiCard title="Zamanında %" value={`${kpi.perf}%`} color={perfColor(kpi.perf)} maxVal={100} />
            </div>

            <div className="ta-region-tabs">
                {bolgeListesi.map((bolge) => (
                    <button
                        key={bolge}
                        className={`ta-region-tab${seciliBolge === bolge ? " active" : ""}`}
                        onClick={() => setSeciliBolge(bolge)}
                    >
                        {bolge}
                    </button>
                ))}
            </div>

            <div className="ta-filter2">
                <div className="ta-field">
                    <label className="ta-label">Proje Ara</label>
                    <div className="ta-search-wrap">
                        <span className="ta-search-icon">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </span>
                        <input className="ta-search-input" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Proje adı filtrele..." />
                    </div>
                </div>
            </div>

            <div className="ta-meta">
                <div className="ta-meta-item"><div className="ta-meta-dot" style={{ background: "#2563eb" }} /><span>Sipariş: <b>{rows.length}</b></span></div>
                <div className="ta-meta-item"><div className="ta-meta-dot" style={{ background: "#7c3aed" }} /><span>Sefer: <b>{despatchRows.length}</b></span></div>
                <div className="ta-meta-item"><div className="ta-meta-dot" style={{ background: "#0f172a" }} /><span>Proje Satırı: <b>{satirlar.length}</b></span></div>
                <div className="ta-meta-item"><div className="ta-meta-dot" style={{ background: "#16a34a" }} /><span>Bölge: <b>{seciliBolge}</b></span></div>
            </div>

            <div className="ta-table-wrap">
                <div className="ta-table-scroll">
                    <table className="ta-table">
                        <thead>
                            <tr>
                                <th>Proje</th><th>Talep</th><th>Tedarik</th><th>Edilmeyen</th>
                                <th>İptal</th><th>Spot</th><th>Filo</th><th>SHÖ ✓</th>
                                <th>SHÖ ✗</th><th>Zamanında</th><th>Gecikme</th><th>Performans</th>
                            </tr>
                        </thead>
                        <tbody>
                            {satirlar.map((r) => (
                                <tr key={r.name}>
                                    <td className="ta-td-project">{r.name}</td>
                                    <td><span className="ta-badge ta-badge-blue">{r.plan}</span></td>
                                    <td><span className={`ta-badge ${r.ted > 0 ? "ta-badge-green" : "ta-badge-gray"}`}>{r.ted}</span></td>
                                    <td>{r.edilmeyen > 0 ? <span className="ta-badge ta-badge-red">{r.edilmeyen}</span> : <span className="ta-badge ta-badge-gray">0</span>}</td>
                                    <td>{r.iptal > 0 ? <span className="ta-badge ta-badge-orange">{r.iptal}</span> : <span className="ta-td-num">—</span>}</td>
                                    <td><span className="ta-td-num">{r.spot}</span></td>
                                    <td><span className="ta-td-num">{r.filo}</span></td>
                                    <td><span className="ta-td-num" style={{ color: "#16a34a" }}>{r.sho_b}</span></td>
                                    <td>{r.sho_bm > 0 ? <span className="ta-td-num" style={{ color: "#475569" }}>{r.sho_bm}</span> : <span className="ta-td-num">0</span>}</td>
                                    <td><span className="ta-td-num" style={{ color: "#16a34a" }}>{r.zamaninda}</span></td>
                                    <td>{r.gec > 0 ? <span className="ta-badge ta-badge-red">{r.gec}</span> : <span className="ta-td-num">0</span>}</td>
                                    <td><PerfCell pct={r.yuzde} /></td>
                                </tr>
                            ))}
                            {!loading && satirlar.length === 0 && (
                                <tr>
                                    <td colSpan="12">
                                        <div className="ta-empty">
                                            <span className="ta-empty-icon">📦</span>
                                            <div>Henüz veri yok — tarih aralığı seçip <strong>Verileri Çek</strong> butonuna basın.</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ════════════════ AYARLAR MODALİ ════════════════ */}
            {ayarPanelAcik && (
                <div className="ta-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setAyarPanelAcik(false)}>
                    <div className="ta-modal2">

                        {/* HEADER */}
                        <div className="ta-m2-header">
                            <div className="ta-m2-header-left">
                                <div className="ta-m2-icon" aria-hidden="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="ta-m2-title">Ayarlar</h2>
                                    <p className="ta-m2-sub">Bölge, proje ve mail gruplarını yönet</p>
                                </div>
                            </div>
                            <button className="ta-m2-close" onClick={() => setAyarPanelAcik(false)} aria-label="Kapat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* MESAJ */}
                        {ayarMesaj && (
                            <div className={`ta-m2-toast ${ayarMesaj.includes("hata") || ayarMesaj.includes("Hata") || ayarMesaj.includes("olamaz") || ayarMesaj.includes("seçmeli") ? "ta-m2-toast-err" : "ta-m2-toast-ok"}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                    {ayarMesaj.includes("hata") || ayarMesaj.includes("Hata") || ayarMesaj.includes("olamaz") || ayarMesaj.includes("seçmeli")
                                        ? <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>
                                        : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
                                    }
                                </svg>
                                {ayarMesaj}
                            </div>
                        )}

                        {/* TABS */}
                        <div className="ta-m2-tabs">
                            {[
                                { key: "bolge", icon: "🗺", label: "Bölgeler" },
                                { key: "proje", icon: "📌", label: "Projeler" },
                                { key: "mail", icon: "📧", label: "Mail Grupları" },
                            ].map((t) => (
                                <button
                                    key={t.key}
                                    className={`ta-m2-tab${ayarTab === t.key ? " ta-m2-tab-active" : ""}`}
                                    onClick={() => setAyarTab(t.key)}
                                >
                                    <span className="ta-m2-tab-icon" aria-hidden="true">{t.icon}</span>
                                    {t.label}
                                    {t.key === "mail" && mailGruplari.length > 0 && (
                                        <span className="ta-m2-tab-badge">{mailGruplari.length}</span>
                                    )}
                                </button>
                            ))}
                            <div className="ta-m2-tabs-spacer" />
                            <button className="ta-m2-action-btn ta-m2-action-ghost" onClick={ayarVerileriniCek} disabled={ayarLoading}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                                    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                Yenile
                            </button>
                        </div>

                        {/* TAB İÇERİĞİ */}
                        <div className="ta-m2-body">

                            {/* ═══ BÖLGE TAB ═══ */}
                            {ayarTab === "bolge" && (
                                <div className="ta-m2-section">
                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>Yeni Bölge</h3>
                                            <p>Bölge adını girerek sisteme ekleyin.</p>
                                        </div>
                                    </div>
                                    <div className="ta-m2-form-row">
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Bölge Adı</label>
                                            <input
                                                className="ta-m2-input"
                                                value={yeniBolgeAdi}
                                                onChange={(e) => setYeniBolgeAdi(e.target.value)}
                                                placeholder="Örn: TRAKYA"
                                                onKeyDown={(e) => e.key === "Enter" && bolgeEkle()}
                                            />
                                        </div>
                                        <button className="ta-m2-action-btn ta-m2-action-primary" onClick={bolgeEkle} disabled={ayarLoading}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                                            Bölge Ekle
                                        </button>
                                    </div>

                                    <div className="ta-m2-divider" />

                                    <div className="ta-m2-section-head">
                                        <h3>Mevcut Bölgeler <span className="ta-m2-count">{dbBolgeler.length}</span></h3>
                                        <button className="ta-m2-action-btn ta-m2-action-ghost" onClick={varsayilanBolgeProjeleriAktar} disabled={ayarLoading}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            Varsayılanları Aktar
                                        </button>
                                    </div>
                                    <div className="ta-m2-chip-list">
                                        {dbBolgeler.length === 0
                                            ? <p className="ta-m2-empty">Henüz bölge yok. Yukarıdan ekleyin veya varsayılanları aktarın.</p>
                                            : dbBolgeler.map((b) => (
                                                <div key={b.id} className="ta-m2-chip">
                                                    <span className="ta-m2-chip-dot" />
                                                    {b.bolge_adi}
                                                    <span className="ta-m2-chip-count">
                                                        {dbProjeler.filter((p) => p.bolge_id === b.id).length}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* ═══ PROJE TAB ═══ */}
                            {ayarTab === "proje" && (
                                <div className="ta-m2-section">
                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>Yeni Proje</h3>
                                            <p>Bölge seçip proje adını girin.</p>
                                        </div>
                                    </div>
                                    <div className="ta-m2-form-grid">
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Bölge</label>
                                            <select className="ta-m2-select" value={projeBolgeId} onChange={(e) => setProjeBolgeId(e.target.value)}>
                                                <option value="">Bölge seç…</option>
                                                {dbBolgeler.map((b) => <option key={b.id} value={b.id}>{b.bolge_adi}</option>)}
                                            </select>
                                        </div>
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Proje Adı</label>
                                            <input
                                                className="ta-m2-input"
                                                value={yeniProjeAdi}
                                                onChange={(e) => setYeniProjeAdi(e.target.value)}
                                                placeholder="Proje adı"
                                                onKeyDown={(e) => e.key === "Enter" && projeEkle()}
                                            />
                                        </div>
                                    </div>
                                    <button className="ta-m2-action-btn ta-m2-action-primary" onClick={projeEkle} disabled={ayarLoading} style={{ marginTop: "4px" }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                                        Proje Ekle
                                    </button>

                                    <div className="ta-m2-divider" />

                                    <div className="ta-m2-section-head">
                                        <h3>Mevcut Projeler <span className="ta-m2-count">{dbProjeler.length}</span></h3>
                                    </div>
                                    {dbBolgeler.map((b) => {
                                        const bp = dbProjeler.filter((p) => p.bolge_id === b.id);
                                        if (bp.length === 0) return null;
                                        return (
                                            <div key={b.id} className="ta-m2-proje-group">
                                                <div className="ta-m2-proje-group-head">{b.bolge_adi}</div>
                                                <div className="ta-m2-proje-list">
                                                    {bp.map((p) => (
                                                        <div key={p.id} className="ta-m2-proje-row">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                                            {p.proje_adi}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {dbProjeler.length === 0 && <p className="ta-m2-empty">Henüz proje yok.</p>}
                                </div>
                            )}

                            {/* ═══ MAİL TAB ═══ */}
                            {ayarTab === "mail" && (
                                <div className="ta-m2-section">

                                    {/* FORM BAŞLIĞI */}
                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>{duzenleGrupId ? "Mail Grubunu Düzenle" : "Yeni Mail Grubu"}</h3>
                                            <p>Otomatik bildirim için alıcı, proje ve gönderim saatlerini seçin.</p>
                                        </div>
                                        {duzenleGrupId && (
                                            <button className="ta-m2-action-btn ta-m2-action-ghost" onClick={mailFormSifirla}>
                                                İptal
                                            </button>
                                        )}
                                    </div>

                                    {/* TEMEL BİLGİLER */}
                                    <div className="ta-m2-mail-form">
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Grup Adı</label>
                                            <input className="ta-m2-input" value={mailGrupAdi} onChange={(e) => setMailGrupAdi(e.target.value)} placeholder="Örn: Gebze Haftalık" />
                                        </div>
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Konu</label>
                                            <input className="ta-m2-input" value={mailKonu} onChange={(e) => setMailKonu(e.target.value)} placeholder="Mail konusu" />
                                        </div>
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Kime</label>
                                            <input className="ta-m2-input" value={mailKime} onChange={(e) => setMailKime(e.target.value)} placeholder="alici@sirket.com" />
                                        </div>
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">CC (SS)</label>
                                            <input className="ta-m2-input" value={mailSs} onChange={(e) => setMailSs(e.target.value)} placeholder="cc@sirket.com" />
                                        </div>
                                    </div>

                                    <div className="ta-m2-field" style={{ marginTop: "10px" }}>
                                        <label className="ta-m2-label">Ek Not (Mail Gövdesi)</label>
                                        <textarea
                                            className="ta-m2-textarea"
                                            value={mailBody}
                                            onChange={(e) => setMailBody(e.target.value)}
                                            placeholder="Rapora ek not eklemek isterseniz buraya yazın (opsiyonel). Tablo otomatik oluşturulur."
                                        />
                                    </div>

                                    <div className="ta-m2-divider" />

                                    {/* GÖNDERİM SAATLERİ */}
                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>
                                                Gönderim Saatleri
                                                <span className="ta-m2-count">{mailSaatler.length} seçili</span>
                                            </h3>
                                            <p>Seçilen saatlerde günlük otomatik rapor gönderilir.</p>
                                        </div>
                                        {mailSaatler.length > 0 && (
                                            <button
                                                className="ta-m2-action-btn ta-m2-action-ghost"
                                                onClick={() => setMailSaatler([])}
                                                style={{ fontSize: "11px" }}
                                            >
                                                Temizle
                                            </button>
                                        )}
                                    </div>
                                    <div className="ta-m2-form-row" style={{ marginBottom: "12px" }}>
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Manuel Saat Ekle</label>
                                            <input
                                                className="ta-m2-input"
                                                type="time"
                                                value={manuelSaat}
                                                onChange={(e) => setManuelSaat(e.target.value)}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="ta-m2-action-btn ta-m2-action-primary"
                                            onClick={manuelSaatEkle}
                                            disabled={!manuelSaat}
                                            style={{ alignSelf: "end" }}
                                        >
                                            + Saat Ekle
                                        </button>
                                    </div>
                                    <div className="ta-m2-saat-grid">
                                        {SAAT_SECENEKLERI.map((saat) => {
                                            const secili = mailSaatler.includes(saat);
                                            return (
                                                <button
                                                    key={saat}
                                                    type="button"
                                                    className={`ta-m2-saat-btn${secili ? " ta-m2-saat-btn-active" : ""}`}
                                                    onClick={() => mailSaatDegistir(saat, !secili)}
                                                >
                                                    {secili && (
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                    {saat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {mailSaatler.length > 0 && (
                                        <div className="ta-m2-saat-ozet">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            Gönderilecek: {mailSaatler.join(", ")}
                                        </div>
                                    )}

                                    <div className="ta-m2-divider" />

                                    {/* PROJE SEÇİMİ */}
                                    <div className="ta-m2-section-head">
                                        <h3>Proje Seçimi <span className="ta-m2-count">{mailProjeIds.length} seçili</span></h3>
                                    </div>
                                    <div className="ta-m2-proje-picker">
                                        {dbBolgeler.map((b) => {
                                            const bp = dbProjeler.filter((p) => p.bolge_id === b.id);
                                            if (bp.length === 0) return null;
                                            return (
                                                <div key={b.id} className="ta-m2-picker-group">
                                                    <div className="ta-m2-picker-group-head">
                                                        {b.bolge_adi}
                                                        <span>{bp.filter((p) => mailProjeIds.includes(p.id)).length}/{bp.length}</span>
                                                    </div>
                                                    {bp.map((p) => (
                                                        <label key={p.id} className="ta-m2-picker-row">
                                                            <input
                                                                type="checkbox"
                                                                className="ta-m2-checkbox"
                                                                checked={mailProjeIds.includes(p.id)}
                                                                onChange={(e) => mailProjeSecimiDegistir(p.id, e.target.checked)}
                                                            />
                                                            <span className="ta-m2-picker-label">{p.proje_adi}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                        {dbProjeler.length === 0 && <p className="ta-m2-empty">Önce Projeler sekmesinden proje ekleyin.</p>}
                                    </div>

                                    <button
                                        className="ta-m2-action-btn ta-m2-action-primary"
                                        onClick={mailGrubuKaydet}
                                        disabled={ayarLoading}
                                        style={{ marginTop: "14px" }}
                                    >
                                        {duzenleGrupId ? (
                                            <>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                                Güncelle
                                            </>
                                        ) : (
                                            <>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" /></svg>
                                                Mail Grubunu Kaydet
                                            </>
                                        )}
                                    </button>

                                    {/* KAYITLI GRUPLAR */}
                                    {mailGruplari.length > 0 && (
                                        <>
                                            <div className="ta-m2-divider" />
                                            <div className="ta-m2-section-head">
                                                <h3>Kayıtlı Gruplar <span className="ta-m2-count">{mailGruplari.length}</span></h3>
                                            </div>
                                            <div className="ta-m2-group-list">
                                                {mailGruplari.map((g) => (
                                                    <div key={g.id} className={`ta-m2-group-card${duzenleGrupId === g.id ? " ta-m2-group-card-editing" : ""}`}>
                                                        <div className="ta-m2-group-card-left">
                                                            <div className="ta-m2-group-avatar">
                                                                {g.grup_adi.slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="ta-m2-group-info">
                                                                <div className="ta-m2-group-name">{g.grup_adi}</div>
                                                                <div className="ta-m2-group-konu">{g.konu || "Konu belirtilmemiş"}</div>
                                                                <div className="ta-m2-group-meta">
                                                                    <span className="ta-m2-group-to-label">
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                                                        {g.kime}
                                                                    </span>
                                                                    {(g.saatler || []).length > 0 && (
                                                                        <span className="ta-m2-group-saatler">
                                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                                            {g.saatler.join(", ")}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="ta-m2-group-card-right">
                                                            <div className="ta-m2-group-pill">{(g.proje_ids || []).length} proje</div>
                                                            <div className="ta-m2-group-actions">
                                                                <button
                                                                    className="ta-m2-group-action-btn ta-m2-group-edit"
                                                                    onClick={() => mailGrupDuzenle(g)}
                                                                    title="Düzenle"
                                                                >
                                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                </button>
                                                                <button
                                                                    className="ta-m2-group-action-btn ta-m2-group-del"
                                                                    onClick={() => mailGrupSil(g.id)}
                                                                    title="Sil"
                                                                >
                                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}