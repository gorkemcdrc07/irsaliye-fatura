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

import { tedarikRaporuOlusturFrontend } from "../services/tedarikRaporuFrontend";
import { outlookTaslakAc } from "../utils/outlookHelper";
const MAIL_API_BASE = "https://irsaliye-fatura.onrender.com";

const TMS_ORDERS_API_URL =
    `${MAIL_API_BASE}/api/proxy/tmsorders`;

const TMS_DESPATCH_API_URL =
    `${MAIL_API_BASE}/api/proxy/tmsdespatches`;

const TOKEN = import.meta.env.VITE_TMS_TOKEN;
const DEFAULT_USER_ID = Number(import.meta.env.VITE_TMS_USER_ID || 85);
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

function pazartesiHaftalikRaporMu() {
    return new Date().getDay() === 1;
}

function oncekiHaftaTarihText() {
    const bugun = new Date();

    const pazartesi = new Date(bugun);
    pazartesi.setDate(bugun.getDate() - 7);

    const pazar = new Date(bugun);
    pazar.setDate(bugun.getDate() - 1);

    return `${pazartesi.toLocaleDateString("tr-TR")} - ${pazar.toLocaleDateString("tr-TR")}`;
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
    const [mailKisileri, setMailKisileri] = useState([]);
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
    const [mailProjeIds, setMailProjeIds] = useState([]);
    const [yeniMailAdresi, setYeniMailAdresi] = useState("");

    const [duzenleGrupId, setDuzenleGrupId] = useState(null);
    const [outlookLoadingId, setOutlookLoadingId] = useState(null);
    const [sonGonderilenGrupId, setSonGonderilenGrupId] = useState(null);

    // YENİ: Arama state'leri
    const [kimeArama, setKimeArama] = useState("");
    const [ccArama, setCcArama] = useState("");
    const [projeArama, setProjeArama] = useState("");
    const [grupArama, setGrupArama] = useState("");
    const [suruklenenProjeId, setSuruklenenProjeId] = useState(null);
    const [yonetimArama, setYonetimArama] = useState("");

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

            const { data: kisiler, error: kisiError } = await supabase
                .from("tedarik_mail_kisileri").select("*").order("email", { ascending: true });
            if (kisiError) throw kisiError;

            setDbBolgeler(bolgeler || []);
            setDbProjeler(projeler || []);
            setMailGruplari(gruplar || []);
            setMailKisileri(kisiler || []);
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

    function bolgeProjeSayisi(bolgeId) {
        return dbProjeler.filter((p) => p.bolge_id === bolgeId).length;
    }

    async function projeSil(projeId) {
        if (!window.confirm("Bu projeyi silmek istediğinizden emin misiniz?")) return;

        setAyarLoading(true);
        setAyarMesaj("");

        try {
            const { error } = await supabase
                .from("tedarik_projeler")
                .delete()
                .eq("id", projeId);

            if (error) throw error;

            const guncelGruplar = mailGruplari
                .filter((g) => (g.proje_ids || []).includes(projeId))
                .map((g) =>
                    supabase
                        .from("tedarik_mail_gruplari")
                        .update({
                            proje_ids: (g.proje_ids || []).filter((id) => id !== projeId),
                        })
                        .eq("id", g.id)
                );

            await Promise.all(guncelGruplar);

            if (mailProjeIds.includes(projeId)) {
                setMailProjeIds((prev) => prev.filter((id) => id !== projeId));
            }

            await ayarVerileriniCek();
            setAyarMesaj("Proje silindi.");
        } catch (e) {
            setAyarMesaj(e?.message || "Proje silinemedi.");
        } finally {
            setAyarLoading(false);
        }
    }

    async function bolgeSil(bolgeId) {
        const projeSayisi = bolgeProjeSayisi(bolgeId);

        const mesaj = projeSayisi > 0
            ? `Bu bölgede ${projeSayisi} proje var. Bölge silinirse projeler de silinir. Emin misiniz?`
            : "Bu bölgeyi silmek istediğinizden emin misiniz?";

        if (!window.confirm(mesaj)) return;

        setAyarLoading(true);
        setAyarMesaj("");

        try {
            const silinecekProjeIds = dbProjeler
                .filter((p) => p.bolge_id === bolgeId)
                .map((p) => p.id);

            if (silinecekProjeIds.length > 0) {
                const { error: projeError } = await supabase
                    .from("tedarik_projeler")
                    .delete()
                    .in("id", silinecekProjeIds);

                if (projeError) throw projeError;
            }

            const { error: bolgeError } = await supabase
                .from("tedarik_bolgeler")
                .delete()
                .eq("id", bolgeId);

            if (bolgeError) throw bolgeError;

            const guncelGruplar = mailGruplari.map((g) => ({
                id: g.id,
                proje_ids: (g.proje_ids || []).filter((id) => !silinecekProjeIds.includes(id)),
            }));

            await Promise.all(
                guncelGruplar.map((g) =>
                    supabase
                        .from("tedarik_mail_gruplari")
                        .update({ proje_ids: g.proje_ids })
                        .eq("id", g.id)
                )
            );

            setMailProjeIds((prev) => prev.filter((id) => !silinecekProjeIds.includes(id)));

            await ayarVerileriniCek();
            setAyarMesaj("Bölge silindi.");
        } catch (e) {
            setAyarMesaj(e?.message || "Bölge silinemedi.");
        } finally {
            setAyarLoading(false);
        }
    }

    async function projeBolgeDegistir(projeId, yeniBolgeId) {
        if (!projeId || !yeniBolgeId) return;

        const proje = dbProjeler.find((p) => p.id === Number(projeId));
        if (!proje || proje.bolge_id === yeniBolgeId) {
            setSuruklenenProjeId(null);
            return;
        }

        setAyarLoading(true);
        setAyarMesaj("");

        const { error } = await supabase
            .from("tedarik_projeler")
            .update({ bolge_id: yeniBolgeId })
            .eq("id", projeId);

        setAyarLoading(false);

        if (error) {
            setAyarMesaj(error.message);
            return;
        }

        setSuruklenenProjeId(null);
        await ayarVerileriniCek();
        setAyarMesaj("Proje başka bölgeye taşındı.");
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

    function emailStringToList(value) {
        return String(value || "")
            .split(/[;,]/)
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);
    }

    function emailListToString(list) {
        return [...new Set((list || []).map((x) => String(x).trim().toLowerCase()).filter(Boolean))].join(",");
    }

    function emailSeciliMi(tip, email) {
        const liste = tip === "kime" ? emailStringToList(mailKime) : emailStringToList(mailSs);
        return liste.includes(String(email || "").toLowerCase());
    }

    function mailKisiSecimiDegistir(tip, email, checked) {
        const temizEmail = String(email || "").trim().toLowerCase();
        if (!temizEmail) return;

        if (tip === "kime") {
            const liste = emailStringToList(mailKime);
            const yeniListe = checked
                ? [...liste, temizEmail]
                : liste.filter((x) => x !== temizEmail);
            setMailKime(emailListToString(yeniListe));
            return;
        }

        const liste = emailStringToList(mailSs);
        const yeniListe = checked
            ? [...liste, temizEmail]
            : liste.filter((x) => x !== temizEmail);
        setMailSs(emailListToString(yeniListe));
    }

    async function yeniMailEkle() {
        const email = yeniMailAdresi.trim().toLowerCase();
        if (!email) {
            setAyarMesaj("Mail adresi boş olamaz.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setAyarMesaj("Geçerli bir mail adresi girin.");
            return;
        }

        setAyarLoading(true);
        setAyarMesaj("");

        const { error } = await supabase
            .from("tedarik_mail_kisileri")
            .upsert([{ email, kaynak: "manuel" }], { onConflict: "email" });

        setAyarLoading(false);

        if (error) {
            setAyarMesaj(error.message);
            return;
        }

        setYeniMailAdresi("");
        await ayarVerileriniCek();
        setAyarMesaj("Mail adresi listeye eklendi.");
    }

    function mailFormSifirla() {
        setMailGrupAdi("");
        setMailKime("");
        setMailSs("");
        setMailProjeIds([]);
        setYeniMailAdresi("");
        setDuzenleGrupId(null);
        setKimeArama("");
        setCcArama("");
        setProjeArama("");
    }

    function mailGrupDuzenle(g) {
        setDuzenleGrupId(g.id);
        setMailGrupAdi(g.grup_adi || "");
        setMailKime(g.kime || "");
        setMailSs(g.ss || "");
        setMailProjeIds(g.proje_ids || []);
        setKimeArama("");
        setCcArama("");
        setProjeArama("");
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

        setAyarLoading(true);
        setAyarMesaj("");

        const payload = {
            grup_adi: mailGrupAdi.trim(),
            kime: mailKime.trim(),
            ss: mailSs.trim(),
            proje_ids: mailProjeIds.map(Number),
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

    const SABAH_MAIL_METNI = `
<p>Herkese Merhaba,</p>

<p>
{{RAPOR_DONEMI}} sorumluluğunuzdaki projelere ait siparişleri ve plaka ataması yaptığınız seferleri kontrolünüz için ekte paylaşıyoruz.
</p>

<p>İlgili raporda;</p>

<ul>
<li>
Yükleme noktasına varışı sipariş yükleme tarihinden sonraki işgünü saat 06:00'dan sonra olan araçlara ait seferler <b>"Geç Tedarik"</b>
</li>

<li>
Rapor yayınlanma saatinde henüz yükleme noktasına varış yapmayan araçlara ait seferler <b>"Tedarik Edilemeyen"</b>
</li>

<li>
Rapor yayınlanma saatinde henüz plaka ataması yapılmamış siparişler <b>"Tedarik Edilemeyen"</b>
</li>
</ul>

<p>
Plaka ataması yapılmamış siparişlerde ya da plaka ataması yapılmış seferlerinizde herhangi bir uygunsuzluk tespit etmeniz halinde en geç saat 17:00'ye kadar gerekli düzeltmeleri yapmanızı ya da Müşteri Hizmetleri birimimiz ile iletişime geçmenizi bekliyoruz.
</p>

<p>
Saat 18:00'de yayınlanacak final rapor, sorumluluğunuzdaki projelerle ilgili {{RAPOR_DONEMI}} <b>"Talep-Tedarik Performansı"</b> olarak kayıtlara otomatik olarak geçecektir.
</p>

<p>Bilgilerinize sunar, iyi çalışmalar dileriz.</p>
`;

    const AKSAM_MAIL_METNI = `
<p>Herkese Merhaba,</p>

<p>
{{RAPOR_DONEMI}} sorumluluğunuzdaki projelerle ilgili
<b>"Talep-Tedarik Performansı"</b> olarak kayıtlara geçen final rapor eklidir.
</p>

<p>Bilgilerinize sunar, iyi çalışmalar dileriz.</p>
`;

    async function grupRaporunuOutlookaGonder(grup) {
        setOutlookLoadingId(grup.id);
        setAyarMesaj("");

        try {
            const rapor = await tedarikRaporuOlusturFrontend({
                projeIds: grup.proje_ids || [],
            });
            rapor.excelIndir?.();

            const saat = new Date().getHours();

            const haftalikMi = pazartesiHaftalikRaporMu();

            const oncekiGun = new Date();
            oncekiGun.setDate(oncekiGun.getDate() - 1);

            const tarihText = oncekiGun.toLocaleDateString("tr-TR");
            const haftaText = oncekiHaftaTarihText();

            const otomatikKonu = haftalikMi
                ? `${haftaText} Tarihli Haftalık Tedarik Analiz Raporu Hk.`
                : `${tarihText} Tarihli Tedarik Analiz Raporu Hk.`;

            const raporDonemi = haftalikMi
                ? "geçen haftaya ait"
                : "bir önceki iş gününe ait";

            const mailMetni = (saat < 12 ? SABAH_MAIL_METNI : AKSAM_MAIL_METNI)
                .replaceAll("{{RAPOR_DONEMI}}", raporDonemi);

            const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.6;">
    ${mailMetni}
    ${rapor.tabloHtml || ""}
</div>
`;
            await outlookTaslakAc({
                to: grup.kime,
                cc: grup.ss,
                subject: otomatikKonu,
                html,
            });

            setSonGonderilenGrupId(grup.id);
            setAyarMesaj("Outlook açıldı. HTML gövde panoya kopyalandı, Outlook gövde alanına yapıştırabilirsiniz.");
        } catch (e) {
            console.error("Rapor/Outlook hatası:", e);
            setAyarMesaj(e?.message || "Rapor oluşturulamadı.");
        } finally {
            setOutlookLoadingId(null);
        }
    }

    function mailProjeSecimiDegistir(projeId, checked) {
        setMailProjeIds((prev) => {
            if (checked) return prev.includes(projeId) ? prev : [...prev, projeId];
            return prev.filter((id) => id !== projeId);
        });
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

    // Filtrelenmiş kişi listeleri
    const kimeFiltreli = mailKisileri.filter(k =>
        k.email.toLowerCase().includes(kimeArama.toLowerCase())
    );
    const ccFiltreli = mailKisileri.filter(k =>
        k.email.toLowerCase().includes(ccArama.toLowerCase())
    );
    const grupFiltreli = mailGruplari.filter(g =>
        g.grup_adi.toLowerCase().includes(grupArama.toLowerCase())
    );

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
                                    <p className="ta-m2-sub">Bölge, proje ve Outlook mail gruplarını yönet</p>
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
                                { key: "bolge", icon: "🗺", label: "Bölgeler & Projeler" },
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

                            {/* ═══ BÖLGE & PROJE YÖNETİMİ ═══ */}
                            {ayarTab === "bolge" && (
                                <div className="ta-m2-section">
                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>Bölgeler & Projeler</h3>
                                            <p>Bölge/proje ekleyin, silin veya projeleri sürükleyerek başka bölgeye taşıyın.</p>
                                        </div>

                                        <div className="ta-m2-search-mini-wrap" style={{ width: "220px" }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="11" cy="11" r="8" />
                                                <path d="m21 21-4.35-4.35" />
                                            </svg>
                                            <input
                                                className="ta-m2-search-mini-input"
                                                value={yonetimArama}
                                                onChange={(e) => setYonetimArama(e.target.value)}
                                                placeholder="Bölge veya proje ara..."
                                            />
                                        </div>
                                    </div>

                                    <div className="ta-m2-manager-top">
                                        <div className="ta-m2-add-card">
                                            <label className="ta-m2-label">Yeni Bölge</label>
                                            <div className="ta-m2-inline">
                                                <input
                                                    className="ta-m2-input"
                                                    value={yeniBolgeAdi}
                                                    onChange={(e) => setYeniBolgeAdi(e.target.value)}
                                                    placeholder="Örn: ANKARA"
                                                    onKeyDown={(e) => e.key === "Enter" && bolgeEkle()}
                                                />
                                                <button
                                                    className="ta-m2-action-btn ta-m2-action-primary"
                                                    onClick={bolgeEkle}
                                                    disabled={ayarLoading}
                                                >
                                                    Ekle
                                                </button>
                                            </div>
                                        </div>

                                        <div className="ta-m2-add-card">
                                            <label className="ta-m2-label">Yeni Proje</label>
                                            <div className="ta-m2-inline">
                                                <select
                                                    className="ta-m2-select"
                                                    value={projeBolgeId}
                                                    onChange={(e) => setProjeBolgeId(e.target.value)}
                                                >
                                                    <option value="">Bölge seç</option>
                                                    {dbBolgeler.map((b) => (
                                                        <option key={b.id} value={b.id}>{b.bolge_adi}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    className="ta-m2-input"
                                                    value={yeniProjeAdi}
                                                    onChange={(e) => setYeniProjeAdi(e.target.value)}
                                                    placeholder="Proje adı"
                                                    onKeyDown={(e) => e.key === "Enter" && projeEkle()}
                                                />

                                                <button
                                                    className="ta-m2-action-btn ta-m2-action-primary"
                                                    onClick={projeEkle}
                                                    disabled={ayarLoading}
                                                >
                                                    Ekle
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ta-m2-divider" />

                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>
                                                Mevcut Yapı
                                                <span className="ta-m2-count">{dbBolgeler.length} bölge</span>
                                                <span className="ta-m2-count">{dbProjeler.length} proje</span>
                                            </h3>
                                            <p>Projeyi tutup başka bölge kartına bırakarak bölgesini değiştirebilirsiniz.</p>
                                        </div>

                                        <button
                                            className="ta-m2-action-btn ta-m2-action-ghost"
                                            onClick={varsayilanBolgeProjeleriAktar}
                                            disabled={ayarLoading}
                                        >
                                            Varsayılanları Aktar
                                        </button>
                                    </div>

                                    <div className="ta-m2-board">
                                        {dbBolgeler
                                            .filter((b) => {
                                                const q = yonetimArama.toLowerCase().trim();
                                                const bolgeMatch = b.bolge_adi.toLowerCase().includes(q);
                                                const projeMatch = dbProjeler.some(
                                                    (p) => p.bolge_id === b.id && p.proje_adi.toLowerCase().includes(q)
                                                );
                                                return !q || bolgeMatch || projeMatch;
                                            })
                                            .map((b) => {
                                                const q = yonetimArama.toLowerCase().trim();
                                                const projeler = dbProjeler.filter((p) =>
                                                    p.bolge_id === b.id &&
                                                    (!q || p.proje_adi.toLowerCase().includes(q) || b.bolge_adi.toLowerCase().includes(q))
                                                );

                                                return (
                                                    <div
                                                        key={b.id}
                                                        className={`ta-m2-region-card${suruklenenProjeId ? " ta-m2-region-card-drop" : ""}`}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={() => projeBolgeDegistir(suruklenenProjeId, b.id)}
                                                    >
                                                        <div className="ta-m2-region-head">
                                                            <div>
                                                                <strong>{b.bolge_adi}</strong>
                                                                <span>{projeler.length} proje</span>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                className="ta-m2-danger-mini"
                                                                onClick={() => bolgeSil(b.id)}
                                                                disabled={ayarLoading}
                                                            >
                                                                Sil
                                                            </button>
                                                        </div>

                                                        <div className="ta-m2-drop-area">
                                                            {projeler.map((p) => (
                                                                <div
                                                                    key={p.id}
                                                                    className="ta-m2-draggable-project"
                                                                    draggable
                                                                    onDragStart={() => setSuruklenenProjeId(p.id)}
                                                                    onDragEnd={() => setSuruklenenProjeId(null)}
                                                                >
                                                                    <span className="ta-m2-drag-icon">⋮⋮</span>
                                                                    <span>{p.proje_adi}</span>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => projeSil(p.id)}
                                                                        disabled={ayarLoading}
                                                                        title="Projeyi sil"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {projeler.length === 0 && (
                                                                <div className="ta-m2-drop-empty">
                                                                    Proje yok — buraya sürükleyip bırakabilirsiniz.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        {dbBolgeler.length === 0 && (
                                            <p className="ta-m2-empty">Henüz bölge yok. İlk bölgeyi yukarıdan ekleyin.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ═══ MAİL TAB ═══ */}
                            {ayarTab === "mail" && (
                                <div className="ta-m2-section">

                                    {/* FORM BAŞLIĞI */}
                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>{duzenleGrupId ? "Mail Grubunu Düzenle" : "Yeni Mail Grubu"}</h3>
                                            <p>Outlook taslağı için alıcı, konu ve projeleri seçin.</p>
                                        </div>
                                        {duzenleGrupId && (
                                            <button className="ta-m2-action-btn ta-m2-action-ghost" onClick={mailFormSifirla}>
                                                İptal
                                            </button>
                                        )}
                                    </div>

                                    {/* GRUP ADI */}
                                    <div className="ta-m2-mail-form ta-m2-mail-form-single">
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Grup Adı</label>
                                            <input
                                                className="ta-m2-input"
                                                value={mailGrupAdi}
                                                onChange={(e) => setMailGrupAdi(e.target.value)}
                                                placeholder="Örn: Gebze Haftalık"
                                            />
                                        </div>
                                    </div>

                                    <div className="ta-m2-divider" />

                                    {/* MAIL KİŞİLERİ */}
                                    <div className="ta-m2-section-head">
                                        <div>
                                            <h3>Mail Kişileri</h3>
                                            <p>Kime ve CC alanlarını listeden seçin. Yeni mail adresi ekleyebilirsiniz.</p>
                                        </div>
                                        <span className="ta-m2-count">{mailKisileri.length} kişi</span>
                                    </div>

                                    <div className="ta-m2-mail-add-row">
                                        <div className="ta-m2-field">
                                            <label className="ta-m2-label">Yeni Mail Adresi</label>
                                            <input
                                                className="ta-m2-input"
                                                value={yeniMailAdresi}
                                                onChange={(e) => setYeniMailAdresi(e.target.value)}
                                                placeholder="ornek@odaklojistik.com.tr"
                                                onKeyDown={(e) => e.key === "Enter" && yeniMailEkle()}
                                            />
                                        </div>
                                        <button
                                            className="ta-m2-action-btn ta-m2-action-primary"
                                            onClick={yeniMailEkle}
                                            disabled={ayarLoading}
                                        >
                                            + Mail Ekle
                                        </button>
                                    </div>

                                    {/* KİME & CC LİSTBOX */}
                                    <div className="ta-m2-mail-listbox-grid">

                                        {/* KIME */}
                                        <div className="ta-m2-listbox-card">
                                            <div className="ta-m2-listbox-head">
                                                <div>
                                                    <strong>Kime</strong>
                                                    <span>Mailin gideceği ana alıcılar</span>
                                                </div>
                                                <em>{emailStringToList(mailKime).length} seçili</em>
                                            </div>
                                            <div className="ta-m2-listbox-search">
                                                <div className="ta-m2-search-mini-wrap">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                                    </svg>
                                                    <input
                                                        className="ta-m2-search-mini-input"
                                                        value={kimeArama}
                                                        onChange={(e) => setKimeArama(e.target.value)}
                                                        placeholder="E-posta ara..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="ta-m2-listbox">
                                                {kimeFiltreli.length === 0 ? (
                                                    <p className="ta-m2-empty">
                                                        {mailKisileri.length === 0 ? "Henüz mail kişisi yok. Yukarıdan ekleyin." : "Sonuç bulunamadı."}
                                                    </p>
                                                ) : kimeFiltreli.map((kisi) => {
                                                    const secili = emailSeciliMi("kime", kisi.email);
                                                    return (
                                                        <button
                                                            key={`kime-${kisi.id || kisi.email}`}
                                                            type="button"
                                                            className={`ta-m2-listbox-option${secili ? " active" : ""}`}
                                                            onClick={() => mailKisiSecimiDegistir("kime", kisi.email, !secili)}
                                                        >
                                                            <span className="ta-m2-listbox-check">{secili ? "✓" : ""}</span>
                                                            <span className="ta-m2-listbox-email">{kisi.email}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {emailStringToList(mailKime).length > 0 && (
                                                <div className="ta-m2-listbox-footer">
                                                    {emailStringToList(mailKime).map(email => (
                                                        <div key={email} className="ta-m2-chip-removable">
                                                            {email}
                                                            <button type="button" onClick={() => mailKisiSecimiDegistir("kime", email, false)}>×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* CC */}
                                        <div className="ta-m2-listbox-card">
                                            <div className="ta-m2-listbox-head">
                                                <div>
                                                    <strong>CC</strong>
                                                    <span>Bilgiye eklenecek kişiler</span>
                                                </div>
                                                <em>{emailStringToList(mailSs).length} seçili</em>
                                            </div>
                                            <div className="ta-m2-listbox-search">
                                                <div className="ta-m2-search-mini-wrap">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                                    </svg>
                                                    <input
                                                        className="ta-m2-search-mini-input"
                                                        value={ccArama}
                                                        onChange={(e) => setCcArama(e.target.value)}
                                                        placeholder="E-posta ara..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="ta-m2-listbox">
                                                {ccFiltreli.length === 0 ? (
                                                    <p className="ta-m2-empty">
                                                        {mailKisileri.length === 0 ? "Henüz mail kişisi yok. Yukarıdan ekleyin." : "Sonuç bulunamadı."}
                                                    </p>
                                                ) : ccFiltreli.map((kisi) => {
                                                    const secili = emailSeciliMi("cc", kisi.email);
                                                    return (
                                                        <button
                                                            key={`cc-${kisi.id || kisi.email}`}
                                                            type="button"
                                                            className={`ta-m2-listbox-option${secili ? " active" : ""}`}
                                                            onClick={() => mailKisiSecimiDegistir("cc", kisi.email, !secili)}
                                                        >
                                                            <span className="ta-m2-listbox-check">{secili ? "✓" : ""}</span>
                                                            <span className="ta-m2-listbox-email">{kisi.email}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {emailStringToList(mailSs).length > 0 && (
                                                <div className="ta-m2-listbox-footer">
                                                    {emailStringToList(mailSs).map(email => (
                                                        <div key={email} className="ta-m2-chip-removable">
                                                            {email}
                                                            <button type="button" onClick={() => mailKisiSecimiDegistir("cc", email, false)}>×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                    </div>

                                    <div className="ta-m2-divider" />

                                    {/* PROJE SEÇİMİ */}
                                    <div className="ta-m2-section-head">
                                        <h3>Proje Seçimi <span className="ta-m2-count">{mailProjeIds.length} seçili</span></h3>
                                        <div className="ta-m2-search-mini-wrap" style={{ width: "180px" }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                            </svg>
                                            <input
                                                className="ta-m2-search-mini-input"
                                                value={projeArama}
                                                onChange={(e) => setProjeArama(e.target.value)}
                                                placeholder="Proje ara..."
                                            />
                                        </div>
                                    </div>
                                    <div className="ta-m2-proje-picker">
                                        {dbBolgeler.map((b) => {
                                            const bp = dbProjeler.filter((p) =>
                                                p.bolge_id === b.id &&
                                                p.proje_adi.toLowerCase().includes(projeArama.toLowerCase())
                                            );
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
                                        {dbProjeler.length > 0 && projeArama && dbBolgeler.every(b =>
                                            dbProjeler.filter(p => p.bolge_id === b.id && p.proje_adi.toLowerCase().includes(projeArama.toLowerCase())).length === 0
                                        ) && <p className="ta-m2-empty">"{projeArama}" için sonuç bulunamadı.</p>}
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
                                                <div className="ta-m2-search-mini-wrap" style={{ width: "180px" }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                                    </svg>
                                                    <input
                                                        className="ta-m2-search-mini-input"
                                                        value={grupArama}
                                                        onChange={(e) => setGrupArama(e.target.value)}
                                                        placeholder="Grup ara..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="ta-m2-group-list">
                                                {grupFiltreli.length === 0 ? (
                                                    <p className="ta-m2-empty">"{grupArama}" için grup bulunamadı.</p>
                                                ) : grupFiltreli.map((g) => (
                                                    <div
                                                        key={g.id}
                                                        className={`ta-m2-group-card${duzenleGrupId === g.id ? " ta-m2-group-card-editing" : ""}${outlookLoadingId === g.id ? " ta-m2-group-card-sending" : ""}${sonGonderilenGrupId === g.id ? " ta-m2-group-card-sent" : ""}`}
                                                    >
                                                        <div className="ta-m2-group-card-left">
                                                            <div className="ta-m2-group-avatar">
                                                                {g.grup_adi.slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="ta-m2-group-info">
                                                                <div className="ta-m2-group-name">{g.grup_adi}</div>
                                                                <div className="ta-m2-group-meta">
                                                                    <span className="ta-m2-group-to-label">
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                                                        {g.kime}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="ta-m2-group-card-right">
                                                            <div className="ta-m2-group-pill">{(g.proje_ids || []).length} proje</div>
                                                            <div className="ta-m2-group-actions">
                                                                <button
                                                                    className="ta-m2-group-action-btn"
                                                                    onClick={() => grupRaporunuOutlookaGonder(g)}
                                                                    disabled={outlookLoadingId === g.id}
                                                                    title="Outlook Taslağı Aç"
                                                                >
                                                                    {outlookLoadingId === g.id ? (
                                                                        <span className="ta-btn-spin">⟳</span>
                                                                    ) : (
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" /></svg>
                                                                    )}
                                                                </button>
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