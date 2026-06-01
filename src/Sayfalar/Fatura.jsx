import { useState, useEffect, useRef } from "react";
import "./Fatura.css";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";

// ─── helpers ──────────────────────────────────────────────────────────────────
function tarihFormatla(t) {
    if (!t) return "–";
    return new Date(t).toLocaleDateString("tr-TR");
}
function tutarFormatla(t) {
    if (t === null || t === undefined) return "–";
    return Number(t).toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
function initials(name = "") {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

const AVATAR_COLORS = [
    "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626",
    "#7c3aed", "#db2777", "#2563eb", "#16a34a",
];
function avatarColor(str = "") {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="mini-bar-track">
            <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}

// ─── stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon }) {
    return (
        <div className="stat-card" style={{ "--accent": accent }}>
            <div className="stat-card-icon" aria-hidden="true">{icon}</div>
            <div className="stat-card-body">
                <p className="stat-label">{label}</p>
                <p className="stat-value">{value}</p>
                {sub && <p className="stat-sub">{sub}</p>}
            </div>
        </div>
    );
}

// ─── modal ────────────────────────────────────────────────────────────────────
function MailModal({ veriler, onClose }) {
    const [mailGroups, setMailGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState("");

    const [groupName, setGroupName] = useState("");
    const [toEmails, setToEmails] = useState("");
    const [ccEmails, setCcEmails] = useState("");
    const [subject, setSubject] = useState("Fatura Raporu");
    const [selectedProjects, setSelectedProjects] = useState([]);

    const [body, setBody] = useState("");
    const [error, setError] = useState("");

    const projectOptions = [
        ...new Set(veriler.map((item) => item.projeAdi).filter(Boolean)),
    ];

    const seciliVeriler = veriler.filter((item) =>
        selectedProjects.includes(item.projeAdi)
    );

    const toplamTutar = seciliVeriler.reduce(
        (sum, item) => sum + (Number(item.giderTutari) || 0),
        0
    );

    const bagli = seciliVeriler.filter(
        (item) => item.faturaBagliMi === "Bağlı"
    );

    const bekleyen = seciliVeriler.filter(
        (item) => item.faturaBagliMi !== "Bağlı"
    );

    const bagliOran =
        seciliVeriler.length > 0
            ? Math.round((bagli.length / seciliVeriler.length) * 100)
            : 0;

    useEffect(() => {
        mailGruplariniGetir();
    }, []);

    useEffect(() => {
        setBody(`Merhaba,

Fatura raporu hazırlanmıştır.

Toplam Kayıt: ${seciliVeriler.length}
Toplam Tutar: ${tutarFormatla(toplamTutar)} TL
Bağlı Fatura: ${bagli.length}
Bekleyen Fatura: ${bekleyen.length}

İyi çalışmalar.`);
    }, [selectedProjects, veriler, toplamTutar, bagli.length, bekleyen.length]);

    async function mailGruplariniGetir() {
        const { data, error } = await supabase
            .from("mail_groups")
            .select("*")
            .eq("is_active", true)
            .order("group_name", { ascending: true });

        if (error) {
            console.error("MAIL GROUP ERROR:", error);
            setError("Mail grupları alınamadı.");
            return;
        }

        setMailGroups(data || []);
    }

    function grupSec(groupId) {
        setSelectedGroupId(groupId);

        const group = mailGroups.find((item) => String(item.id) === String(groupId));

        if (!group) return;

        setGroupName(group.group_name || "");
        setToEmails(group.to_emails || "");
        setCcEmails(group.cc_emails || "");
        setSubject(group.subject || "Fatura Raporu");
        setSelectedProjects(group.projects || []);
    }

    function projeToggle(proje) {
        setSelectedProjects((prev) =>
            prev.includes(proje)
                ? prev.filter((item) => item !== proje)
                : [...prev, proje]
        );
    }

    function htmlEscape(value = "") {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function raporHtmlOlustur() {
        const projeOzet = {};

        seciliVeriler.forEach((item) => {
            const proje = item.projeAdi || "Bilinmiyor";

            if (!projeOzet[proje]) {
                projeOzet[proje] = {
                    kayit: 0,
                    tutar: 0,
                    bagli: 0,
                    bekleyen: 0,
                };
            }

            projeOzet[proje].kayit++;
            projeOzet[proje].tutar += Number(item.giderTutari) || 0;

            if (item.faturaBagliMi === "Bağlı") {
                projeOzet[proje].bagli++;
            } else {
                projeOzet[proje].bekleyen++;
            }
        });

        const topProjeler = Object.entries(projeOzet)
            .sort((a, b) => b[1].tutar - a[1].tutar)
            .slice(0, 5);

        const projeRows = topProjeler
            .map(([proje, v], index) => `
                <tr>
                    <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;">
                        <div style="font-weight:700;color:#111827;">${index + 1}. ${htmlEscape(proje)}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">
                            ${v.kayit} kayıt · ${v.bagli} bağlı · ${v.bekleyen} bekleyen
                        </div>
                    </td>
                    <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800;color:#111827;">
                        ${tutarFormatla(v.tutar)} TL
                    </td>
                </tr>
            `)
            .join("");

        const bekleyenRows = bekleyen
            .slice(0, 8)
            .map((item) => `
                <tr>
                    <td style="padding:12px;border-bottom:1px solid #fee2e2;">
                        <div style="font-weight:700;color:#991b1b;">
                            ${htmlEscape(item.seferNo || "-")}
                        </div>
                        <div style="font-size:12px;color:#7f1d1d;margin-top:3px;">
                            ${htmlEscape(item.projeAdi || "-")} · ${htmlEscape(item.plaka || "-")}
                        </div>
                    </td>
                    <td style="padding:12px;border-bottom:1px solid #fee2e2;color:#7f1d1d;">
                        ${htmlEscape(item.tedarikciAdi || "-")}
                    </td>
                    <td style="padding:12px;border-bottom:1px solid #fee2e2;text-align:right;font-weight:800;color:#991b1b;">
                        ${tutarFormatla(item.giderTutari)} TL
                    </td>
                </tr>
            `)
            .join("");

        return `
<div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 0;">
        <tr>
            <td align="center">
                <table width="760" cellpadding="0" cellspacing="0" style="max-width:760px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 16px 40px rgba(15,23,42,.10);">
                    
                    <tr>
                        <td style="padding:32px;background:linear-gradient(135deg,#1d4ed8,#4f46e5,#7c3aed);color:#ffffff;">
                            <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.85;">
                                Odak TMS Raporu
                            </div>
                            <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">
                                Fatura & Gider Özeti
                            </h1>
                            <p style="margin:10px 0 0;font-size:14px;opacity:.9;">
                                Seçili projelere ait güncel fatura bağlantı ve gider durumu
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px;">
                            <p style="font-size:15px;margin:0 0 18px;color:#374151;">
                                Merhaba,<br />
                                Seçili projeler için oluşturulan özet rapor aşağıdadır.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="50%" style="padding:8px;">
                                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px;">
                                            <div style="font-size:12px;color:#64748b;font-weight:800;letter-spacing:.06em;">TOPLAM KAYIT</div>
                                            <div style="font-size:30px;font-weight:900;margin-top:8px;color:#0f172a;">${seciliVeriler.length}</div>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding:8px;">
                                        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;padding:20px;">
                                            <div style="font-size:12px;color:#1d4ed8;font-weight:800;letter-spacing:.06em;">TOPLAM TUTAR</div>
                                            <div style="font-size:26px;font-weight:900;margin-top:8px;color:#1e3a8a;">${tutarFormatla(toplamTutar)} TL</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="50%" style="padding:8px;">
                                        <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:18px;padding:20px;">
                                            <div style="font-size:12px;color:#166534;font-weight:800;letter-spacing:.06em;">FATURASI BAĞLI</div>
                                            <div style="font-size:30px;font-weight:900;margin-top:8px;color:#166534;">${bagli.length}</div>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding:8px;">
                                        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:18px;padding:20px;">
                                            <div style="font-size:12px;color:#991b1b;font-weight:800;letter-spacing:.06em;">BEKLEYEN FATURA</div>
                                            <div style="font-size:30px;font-weight:900;margin-top:8px;color:#991b1b;">${bekleyen.length}</div>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin:24px 8px 6px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <span style="font-size:13px;font-weight:800;color:#374151;">Fatura Bağlılık Oranı</span>
                                    <span style="font-size:13px;font-weight:900;color:#1d4ed8;">%${bagliOran}</span>
                                </div>
                                <div style="height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
                                    <div style="height:12px;width:${bagliOran}%;background:linear-gradient(90deg,#22c55e,#2563eb);border-radius:999px;"></div>
                                </div>
                            </div>

                            <h2 style="font-size:18px;margin:30px 8px 12px;color:#111827;">
                                En Yüksek Hacimli Projeler
                            </h2>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                                ${projeRows || `
                                    <tr>
                                        <td style="padding:16px;color:#6b7280;">Proje bulunamadı.</td>
                                    </tr>
                                `}
                            </table>

                            ${bekleyenRows
                ? `
                                    <h2 style="font-size:18px;margin:30px 8px 12px;color:#991b1b;">
                                        Aksiyon Gerektiren Kayıtlar
                                    </h2>

                                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:16px;overflow:hidden;background:#fff7f7;">
                                        <tr>
                                            <th style="text-align:left;padding:12px;background:#fee2e2;color:#7f1d1d;font-size:12px;">Sefer</th>
                                            <th style="text-align:left;padding:12px;background:#fee2e2;color:#7f1d1d;font-size:12px;">Tedarikçi</th>
                                            <th style="text-align:right;padding:12px;background:#fee2e2;color:#7f1d1d;font-size:12px;">Tutar</th>
                                        </tr>
                                        ${bekleyenRows}
                                    </table>
                                    `
                : `
                                    <div style="margin-top:28px;padding:18px;border-radius:16px;background:#ecfdf5;border:1px solid #bbf7d0;color:#166534;font-weight:700;">
                                        Bekleyen fatura bulunmamaktadır.
                                    </div>
                                    `
            }

                            <p style="margin:28px 8px 0;font-size:14px;color:#4b5563;">
                                Detaylı kayıtlar uygulama ekranından incelenebilir.
                            </p>

                            <div style="margin:24px 8px 0;padding-top:18px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
                                Odak TMS · Otomatik oluşturulmuş rapor
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</div>`;
    }

    async function handleRaporKopyala() {
        setError("");

        if (!selectedProjects.length) {
            setError("Rapor için en az bir proje seçmelisiniz.");
            return;
        }

        const html = raporHtmlOlustur();

        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([body], { type: "text/plain" }),
                }),
            ]);

            setError("Rapor panoya kopyalandı. Mail gövdesine Ctrl+V ile yapıştırabilirsiniz.");
        } catch (err) {
            console.error(err);
            setError("Rapor kopyalanamadı. Tarayıcı pano iznini kontrol edin.");
        }
    }

    async function grupKaydet() {
        setError("");


        if (!groupName.trim()) {
            setError("Grup adı zorunludur.");
            return;
        }

        if (!toEmails.trim()) {
            setError("Kime alanı zorunludur.");
            return;
        }

        if (!subject.trim()) {
            setError("Konu alanı zorunludur.");
            return;
        }

        if (!selectedProjects.length) {
            setError("En az bir proje seçmelisiniz.");
            return;
        }
        const payload = {
            group_name: groupName.trim(),
            to_emails: toEmails.trim(),
            cc_emails: ccEmails.trim(),
            subject: subject.trim(),
            projects: selectedProjects,
            is_active: true,
        };

        let result;

        if (selectedGroupId) {
            result = await supabase
                .from("mail_groups")
                .update(payload)
                .eq("id", selectedGroupId);
        } else {
            result = await supabase
                .from("mail_groups")
                .insert(payload);
        }

        if (result.error) {
            console.error("MAIL GROUP SAVE ERROR:", result.error);
            setError("Mail grubu kaydedilemedi.");
            return;
        }

        await mailGruplariniGetir();
        setError("Mail grubu kaydedildi.");
    }


    async function grupSil() {
        if (!selectedGroupId) return;

        const { error } = await supabase
            .from("mail_groups")
            .update({ is_active: false })
            .eq("id", selectedGroupId);

        if (error) {
            setError("Mail grubu silinemedi.");
            return;
        }

        setSelectedGroupId("");
        setGroupName("");
        setToEmails("");
        setCcEmails("");
        setSubject("Fatura Raporu");
        setSelectedProjects([]);
        await mailGruplariniGetir();
    }

    function handleSend() {
        setError("");

        if (!toEmails.trim()) {
            setError("Kime alanı boş olamaz.");
            return;
        }

        if (!selectedProjects.length) {
            setError("En az bir proje seçmelisiniz.");
            return;
        }

        const mailTo = toEmails
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .join(",");

        const ccList = ccEmails
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .join(",");

        let mailUrl = `mailto:${encodeURIComponent(mailTo)}`;
        mailUrl += `?subject=${encodeURIComponent(subject || "Fatura Raporu")}`;
        mailUrl += `&body=${encodeURIComponent(body || "")}`;

        if (ccList) {
            mailUrl += `&cc=${encodeURIComponent(ccList)}`;
        }

        window.location.href = mailUrl;
    }

    return (
        <div
            className="modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="modal-box large" role="dialog" aria-modal="true">
                <div className="modal-header">
                    <div className="modal-title-row">
                        <span className="modal-icon">✉</span>
                        <h2>Mail Grubu ile Gönder</h2>
                    </div>

                    <button className="modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-fields">
                    <div className="modal-field-col">
                        <label>Kayıtlı Mail Grupları</label>
                        <select
                            className="mail-select"
                            value={selectedGroupId}
                            onChange={(e) => grupSec(e.target.value)}
                        >
                            <option value="">Yeni grup oluştur</option>
                            {mailGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.group_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-field-row">
                        <label>Grup Adı</label>
                        <input
                            type="text"
                            placeholder="Örn: Arkas Fatura Grubu"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    <div className="modal-field-row">
                        <label>Kime</label>
                        <input
                            type="text"
                            placeholder="gorkem@gmail.com"
                            value={toEmails}
                            onChange={(e) => setToEmails(e.target.value)}
                        />
                    </div>

                    <div className="modal-field-row">
                        <label>SS</label>
                        <input
                            type="text"
                            placeholder="yagiz@gmail.com, furkan@gmail.com"
                            value={ccEmails}
                            onChange={(e) => setCcEmails(e.target.value)}
                        />
                    </div>

                    <div className="modal-field-row">
                        <label>Konu</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div className="modal-field-col">
                        <label>Projeler</label>

                        <div className="project-picker">
                            {projectOptions.length === 0 ? (
                                <p>Proje bulunamadı.</p>
                            ) : (
                                projectOptions.map((proje) => (
                                    <button
                                        type="button"
                                        key={proje}
                                        className={
                                            selectedProjects.includes(proje)
                                                ? "project-chip selected"
                                                : "project-chip"
                                        }
                                        onClick={() => projeToggle(proje)}
                                    >
                                        {proje}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="modal-field-col">
                        <label>Rapor Önizleme</label>

                        <div
                            style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "18px",
                                overflow: "hidden",
                                background: "#fff",
                            }}
                        >
                            <div
                                style={{
                                    padding: "22px",
                                    background: "linear-gradient(135deg,#1d4ed8,#4f46e5,#7c3aed)",
                                    color: "#fff",
                                }}
                            >
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, opacity: .85 }}>
                                    ODAK TMS RAPORU
                                </p>
                                <h3 style={{ margin: "8px 0 0", fontSize: 22 }}>
                                    Fatura & Gider Özeti
                                </h3>
                                <p style={{ margin: "8px 0 0", opacity: .9 }}>
                                    Seçili projeler için özet rapor
                                </p>
                            </div>

                            <div
                                style={{
                                    padding: "16px",
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2,1fr)",
                                    gap: "12px",
                                }}
                            >
                                <StatCard
                                    icon="📋"
                                    label="Toplam Kayıt"
                                    value={seciliVeriler.length}
                                    accent="#4f46e5"
                                />

                                <StatCard
                                    icon="💰"
                                    label="Toplam Tutar"
                                    value={`${tutarFormatla(toplamTutar)} ₺`}
                                    accent="#0891b2"
                                />

                                <StatCard
                                    icon="✅"
                                    label="Bağlı"
                                    value={bagli.length}
                                    sub={`%${bagliOran} oran`}
                                    accent="#059669"
                                />

                                <StatCard
                                    icon="⚠"
                                    label="Bekleyen"
                                    value={bekleyen.length}
                                    accent="#dc2626"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {error && <div className="modal-error">{error}</div>}

                <div className="modal-footer">
                    {selectedGroupId && (
                        <button className="btn-ghost danger" onClick={grupSil}>
                            Grubu Sil
                        </button>
                    )}

                    <button className="btn-ghost" onClick={grupKaydet}>
                        Grubu Kaydet
                    </button>

                    <button className="btn-ghost" onClick={onClose}>
                        İptal
                    </button>

                    <button
                        className="btn-ghost"
                        onClick={handleRaporKopyala}
                        disabled={!selectedProjects.length}
                    >
                        Raporu Kopyala
                    </button>

                    <button
                        className="btn-send"
                        onClick={handleSend}
                        disabled={!toEmails || !selectedProjects.length}
                    >
                        Maili Aç
                    </button>
                </div>
            </div>
        </div>
    );
}// ─── main component ───────────────────────────────────────────────────────────
export default function Fatura() {
    const [startDate, setStartDate] = useState("2026-05-22");
    const [endDate, setEndDate] = useState("2026-05-22");
    const [userId, setUserId] = useState(123);
    const [page, setPage] = useState(1);
    const [tipFilter, setTipFilter] = useState("Tümü");
    const [projeFilter, setProjeFilter] = useState("Tümü");
    const [durumFilter, setDurumFilter] = useState("Tümü");
    const [searchText, setSearchText] = useState("");

    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hata, setHata] = useState("");
    const [mailAcik, setMailAcik] = useState(false);
    const [activeTab, setActiveTab] = useState("tablo"); // tablo | analiz

    async function faturalariGetir(e) {
        e?.preventDefault();
        setLoading(true);
        setHata("");
        setVeriler([]);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_SHO_API_BASE_URL}/api/tmsdespatchincomeexpenses/getall`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        startDate: `${startDate}T00:00:00`,
                        endDate: `${endDate}T23:59:59`,
                        userId: Number(userId),
                        page: Number(page),
                    }),
                }
            );
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;

            if (!response.ok || data?.Success === false) {
                throw new Error(data?.Message || "Fatura verileri alınamadı.");
            }

            const liste = Array.isArray(data?.Data) ? data.Data : [];

            setVeriler(
                liste.map((item) => ({
                    tipi: item.Tipi,
                    seferNo: item.TMSDespatchesDocumentNo,
                    seferTarihi: item.TMSDespatchesDespatchDate,
                    faturaBagliMi: item.SalesInvoceTmsDespatches ? "Bağlı" : "Bağlanmamış",
                    tedarikciAdi: item.SupplierName,
                    giderHesapAdi: item.ServiceExpenseName,
                    plaka: item.PlateNumber,
                    projeAdi: item.ProjectName,
                    aracTipi: item.VehicleWorkingTypeName,
                    giderTutari: item.ServiceExpenses,
                    aciklama: item.Description,
                }))
            );
        } catch (error) {
            console.error("FATURA ERROR:", error);
            setHata(error.message || "Fatura verileri alınamadı.");
        } finally {
            setLoading(false);
        }
    }
    // ── derived analytics ──────────────────────────────────────────────────────
    const tumTipler = ["Tümü", ...new Set(veriler.map((v) => v.tipi).filter(Boolean))];
    const tumProjeler = ["Tümü", ...new Set(veriler.map((v) => v.projeAdi).filter(Boolean))];

    const filtered = veriler.filter((item) => {
        if (tipFilter !== "Tümü" && item.tipi !== tipFilter) return false;
        if (projeFilter !== "Tümü" && item.projeAdi !== projeFilter) return false;
        if (durumFilter !== "Tümü" && item.faturaBagliMi !== durumFilter) return false;
        if (searchText) {
            const s = searchText.toLowerCase();
            return (
                (item.seferNo || "").toLowerCase().includes(s) ||
                (item.tedarikciAdi || "").toLowerCase().includes(s) ||
                (item.plaka || "").toLowerCase().includes(s) ||
                (item.projeAdi || "").toLowerCase().includes(s)
            );
        }
        return true;
    });

    const toplamTutar = filtered.reduce((s, i) => s + (Number(i.giderTutari) || 0), 0);
    const bagliSayi = filtered.filter((i) => i.faturaBagliMi === "Bağlı").length;
    const baglanmamisSayi = filtered.filter((i) => i.faturaBagliMi === "Bağlanmamış").length;
    const bagliOran = filtered.length > 0 ? ((bagliSayi / filtered.length) * 100).toFixed(1) : 0;

    // project breakdown
    const projeMap = {};
    filtered.forEach((item) => {
        const p = item.projeAdi || "Bilinmiyor";
        if (!projeMap[p]) projeMap[p] = { kayit: 0, tutar: 0, bagli: 0, baglanmamis: 0 };
        projeMap[p].kayit++;
        projeMap[p].tutar += Number(item.giderTutari) || 0;
        if (item.faturaBagliMi === "Bağlı") projeMap[p].bagli++;
        else projeMap[p].baglanmamis++;
    });
    const projeler = Object.entries(projeMap).sort((a, b) => b[1].tutar - a[1].tutar);
    const maxProjeTutar = projeler[0]?.[1]?.tutar || 1;

    // tip breakdown
    const tipMap = {};
    filtered.forEach((item) => {
        const t = item.tipi || "Diğer";
        if (!tipMap[t]) tipMap[t] = { kayit: 0, tutar: 0 };
        tipMap[t].kayit++;
        tipMap[t].tutar += Number(item.giderTutari) || 0;
    });

    return (
        <main className="fatura-page">
            {/* ── header ── */}
            <header className="fatura-header">
                <div className="header-left">
                    <div className="header-badge">
                        <span className="header-badge-icon" aria-hidden="true">🧾</span>
                    </div>
                    <div>
                        <h1>Fatura & Gider Analizi</h1>
                        <p>Gider kayıtları, fatura bağlantı durumları ve proje bazlı analizler</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-mail"
                        onClick={() => setMailAcik(true)}
                        disabled={!filtered.length}
                    >
                        <span aria-hidden="true">✉</span> Mail Gönder
                    </button>
                </div>
            </header>

            {/* ── filters ── */}
            <form className="fatura-filter" onSubmit={faturalariGetir}>
                <div className="filter-group">
                    <div className="filter-field">
                        <label>Başlangıç</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="filter-field">
                        <label>Bitiş</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="filter-field">
                        <label>User ID</label>
                        <input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} />
                    </div>
                    <div className="filter-field">
                        <label>Sayfa</label>
                        <input type="number" min="1" value={page} onChange={(e) => setPage(e.target.value)} />
                    </div>
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? (
                        <span className="spinner" aria-hidden="true" />
                    ) : null}
                    {loading ? "Yükleniyor…" : "Verileri Getir"}
                </button>
            </form>

            {hata && (
                <div className="alert-error" role="alert">
                    <span aria-hidden="true">⚠</span> {hata}
                </div>
            )}

            {/* ── stat cards ── */}
            {veriler.length > 0 && (
                <div className="stat-grid">
                    <StatCard
                        icon="📋"
                        label="Toplam Kayıt"
                        value={filtered.length.toLocaleString("tr-TR")}
                        sub={`${veriler.length} kayıttan ${filtered.length} filtrelendi`}
                        accent="#4f46e5"
                    />
                    <StatCard
                        icon="💰"
                        label="Toplam Gider"
                        value={`${tutarFormatla(toplamTutar)} ₺`}
                        accent="#0891b2"
                    />
                    <StatCard
                        icon="✅"
                        label="Fatura Bağlı"
                        value={bagliSayi.toLocaleString("tr-TR")}
                        sub={`%${bagliOran} oran`}
                        accent="#059669"
                    />
                    <StatCard
                        icon="⚠"
                        label="Bağlanmamış"
                        value={baglanmamisSayi.toLocaleString("tr-TR")}
                        sub="fatura bağlı değil"
                        accent="#dc2626"
                    />
                </div>
            )}

            {/* ── tabs ── */}
            {veriler.length > 0 && (
                <div className="tab-bar">
                    <button
                        className={`tab-btn ${activeTab === "tablo" ? "active" : ""}`}
                        onClick={() => setActiveTab("tablo")}
                    >
                        📄 Kayıt Tablosu
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "analiz" ? "active" : ""}`}
                        onClick={() => setActiveTab("analiz")}
                    >
                        📊 Proje Analizi
                    </button>
                </div>
            )}

            {/* ── analiz tab ── */}
            {veriler.length > 0 && activeTab === "analiz" && (
                <div className="analiz-section">
                    {/* tip breakdown */}
                    <div className="analiz-card">
                        <h3>Tip Dağılımı</h3>
                        <div className="tip-chips">
                            {Object.entries(tipMap).map(([tip, v]) => (
                                <div key={tip} className="tip-chip">
                                    <span className="tip-name">{tip}</span>
                                    <span className="tip-count">{v.kayit} kayıt</span>
                                    <span className="tip-tutar">{tutarFormatla(v.tutar)} ₺</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* fatura durum doughnut-like summary */}
                    <div className="analiz-card">
                        <h3>Fatura Bağlantı Özeti</h3>
                        <div className="durum-summary">
                            <div className="durum-ring-wrap">
                                <svg viewBox="0 0 80 80" className="durum-ring" aria-label={`Bağlı: ${bagliSayi}, Bağlanmamış: ${baglanmamisSayi}`} role="img">
                                    <circle cx="40" cy="40" r="32" fill="none" strokeWidth="10" stroke="#e2e8f0" />
                                    <circle
                                        cx="40" cy="40" r="32" fill="none" strokeWidth="10"
                                        stroke="#059669"
                                        strokeDasharray={`${filtered.length > 0 ? (bagliSayi / filtered.length) * 201 : 0} 201`}
                                        strokeDashoffset="50"
                                        strokeLinecap="round"
                                    />
                                    <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">
                                        {bagliOran}%
                                    </text>
                                </svg>
                            </div>
                            <div className="durum-legend">
                                <div className="legend-row">
                                    <span className="legend-dot" style={{ background: "#059669" }} />
                                    <span>Bağlı</span>
                                    <strong>{bagliSayi}</strong>
                                </div>
                                <div className="legend-row">
                                    <span className="legend-dot" style={{ background: "#dc2626" }} />
                                    <span>Bağlanmamış</span>
                                    <strong>{baglanmamisSayi}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* project breakdown table */}
                    <div className="analiz-card wide">
                        <h3>Proje Bazlı Dağılım</h3>
                        <div className="proje-table">
                            {projeler.map(([proje, v]) => (
                                <div key={proje} className="proje-row">
                                    <div className="proje-info">
                                        <span
                                            className="proje-avatar"
                                            style={{ background: avatarColor(proje) }}
                                        >
                                            {initials(proje)}
                                        </span>
                                        <div>
                                            <p className="proje-adi">{proje}</p>
                                            <p className="proje-meta">
                                                {v.kayit} kayıt &nbsp;·&nbsp;
                                                <span className="badge-bagli">{v.bagli} bağlı</span>
                                                {v.baglanmamis > 0 && (
                                                    <span className="badge-baglanmamis ml-4">{v.baglanmamis} bağlanmamış</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="proje-tutar-col">
                                        <MiniBar value={v.tutar} max={maxProjeTutar} color={avatarColor(proje)} />
                                        <span className="proje-tutar">{tutarFormatla(v.tutar)} ₺</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── tablo tab ── */}
            {(activeTab === "tablo" || veriler.length === 0) && (
                <section className="fatura-card">
                    <div className="card-header">
                        <div className="card-title-row">
                            <h2>Gider Kayıtları</h2>
                            <span className="count-badge">{filtered.length} kayıt</span>
                        </div>

                        {veriler.length > 0 && (
                            <div className="table-filters">
                                <input
                                    className="search-input"
                                    type="search"
                                    placeholder="🔍  Sefer no, plaka, tedarikçi…"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                />
                                <select value={tipFilter} onChange={(e) => setTipFilter(e.target.value)}>
                                    {tumTipler.map((t) => (
                                        <option key={t}>{t}</option>
                                    ))}
                                </select>
                                <select value={projeFilter} onChange={(e) => setProjeFilter(e.target.value)}>
                                    {tumProjeler.map((p) => (
                                        <option key={p}>{p}</option>
                                    ))}
                                </select>
                                <select value={durumFilter} onChange={(e) => setDurumFilter(e.target.value)}>
                                    <option>Tümü</option>
                                    <option>Bağlı</option>
                                    <option>Bağlanmamış</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon" aria-hidden="true">📭</span>
                            <p>
                                {veriler.length === 0
                                    ? "Filtreleri seçip 'Verileri Getir' butonuna basın."
                                    : "Bu filtreye uyan kayıt bulunamadı."}
                            </p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tip</th>
                                        <th>Sefer No</th>
                                        <th>Sefer Tarihi</th>
                                        <th>Durum</th>
                                        <th>Tedarikçi</th>
                                        <th>Gider Hesabı</th>
                                        <th>Plaka</th>
                                        <th>Proje</th>
                                        <th>Araç Tipi</th>
                                        <th className="text-right">Tutar</th>
                                        <th>Açıklama</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item, i) => (
                                        <tr key={i}>
                                            <td>
                                                <span className="tip-badge">{item.tipi || "–"}</span>
                                            </td>
                                            <td className="mono">{item.seferNo || "–"}</td>
                                            <td>{tarihFormatla(item.seferTarihi)}</td>
                                            <td>
                                                <span
                                                    className={
                                                        item.faturaBagliMi === "Bağlı"
                                                            ? "status-bagli"
                                                            : "status-baglanmamis"
                                                    }
                                                >
                                                    {item.faturaBagliMi === "Bağlı" ? "✓ Bağlı" : "✗ Bağlanmamış"}
                                                </span>
                                            </td>
                                            <td>{item.tedarikciAdi || "–"}</td>
                                            <td>{item.giderHesapAdi || "–"}</td>
                                            <td className="mono plaka">{item.plaka || "–"}</td>
                                            <td>
                                                {item.projeAdi ? (
                                                    <span
                                                        className="proje-pill"
                                                        style={{
                                                            background: avatarColor(item.projeAdi) + "22",
                                                            color: avatarColor(item.projeAdi),
                                                        }}
                                                    >
                                                        {item.projeAdi}
                                                    </span>
                                                ) : "–"}
                                            </td>
                                            <td>{item.aracTipi || "–"}</td>
                                            <td className="text-right amount">{tutarFormatla(item.giderTutari)}</td>
                                            <td className="desc">{item.aciklama || "–"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* ── mail modal ── */}
            {mailAcik && (
                <MailModal veriler={filtered} onClose={() => setMailAcik(false)} />
            )}
        </main>
    );
}