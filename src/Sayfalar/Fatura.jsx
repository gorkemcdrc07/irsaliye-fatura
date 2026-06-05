import { useState, useEffect, useRef } from "react";
import "./Fatura.css";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
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

// ─── project picker with search ───────────────────────────────────────────────
function ProjectPicker({ options, selected, onChange }) {
    const [search, setSearch] = useState("");

    const filtered = options.filter((p) =>
        p.toLowerCase().includes(search.toLowerCase())
    );


    const allSelected = options.length > 0 && options.every((p) => selected.includes(p));

    function toggle(proje) {
        onChange(
            selected.includes(proje)
                ? selected.filter((x) => x !== proje)
                : [...selected, proje]
        );
    }

    function toggleAll() {
        if (allSelected) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    }

    return (
        <div className="project-picker-v2">
            <div className="pp-search-wrap">
                <span className="pp-search-icon" aria-hidden="true">🔍</span>
                <input
                    className="pp-search"
                    type="search"
                    placeholder="Proje ara…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {selected.length > 0 && (
                    <span className="pp-count-badge">{selected.length} seçili</span>
                )}
            </div>

            <div className="pp-select-all-row">
                <button type="button" className="pp-select-all" onClick={toggleAll}>
                    {allSelected ? "✗ Tümünü Kaldır" : "✓ Tümünü Seç"}
                </button>
                {search && (
                    <span className="pp-filter-note">
                        {filtered.length} / {options.length} proje
                    </span>
                )}
            </div>

            <div className="pp-list">
                {filtered.length === 0 ? (
                    <div className="pp-empty">Proje bulunamadı</div>
                ) : (
                    filtered.map((proje) => {
                        const isSelected = selected.includes(proje);
                        const color = avatarColor(proje);
                        return (
                            <button
                                type="button"
                                key={proje}
                                className={`pp-item ${isSelected ? "selected" : ""}`}
                                onClick={() => toggle(proje)}
                                style={{ "--item-color": color }}
                            >
                                <span
                                    className="pp-item-avatar"
                                    style={{
                                        background: isSelected ? color : color + "22",
                                        color: isSelected ? "#fff" : color,
                                    }}
                                >
                                    {initials(proje)}
                                </span>
                                <span className="pp-item-name">{proje}</span>
                                {isSelected && (
                                    <span className="pp-item-check" aria-hidden="true">✓</span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function MultiFilter({ label, options, selected, onChange, placeholder }) {
    const [open, setOpen] = useState(false);
    const allSelected = options.length > 0 && selected.length === options.length;

    function toggle(value) {
        if (selected.includes(value)) {
            onChange(selected.filter((x) => x !== value));
        } else {
            onChange([...selected, value]);
        }
    }

    function toggleAll() {
        onChange(allSelected ? [] : [...options]);
    }

    return (
        <div className="multi-filter">
            <label>{label}</label>

            <div className="multi-filter-box">
                <button
                    type="button"
                    className="multi-filter-main"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    {selected.length === 0
                        ? placeholder
                        : `${selected.length} seçili`}
                </button>

                {open && (
                    <div className="multi-filter-menu open">
                        <button
                            type="button"
                            className="multi-filter-option all"
                            onClick={toggleAll}
                        >
                            {allSelected ? "Tümünü Kaldır" : "Tümünü Seç"}
                        </button>

                        {options.map((option) => (
                            <button
                                type="button"
                                key={option}
                                className={`multi-filter-option ${selected.includes(option) ? "selected" : ""
                                    }`}
                                onClick={() => toggle(option)}
                            >
                                <span>{option}</span>
                                {selected.includes(option) && <strong>✓</strong>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Excel export ─────────────────────────────────────────────────────────────
async function excelIndir(veriler, selectedProjects) {
    const seciliVeriler = veriler
        .filter(
            (item) =>
                selectedProjects.includes(item.projeAdi) &&
                item.faturaBagliMi !== "Bağlı"
        )
        .sort((a, b) => {
            const seferA = String(a.seferNo || "");
            const seferB = String(b.seferNo || "");

            if (seferA !== seferB) {
                return seferA.localeCompare(seferB, "tr", { numeric: true });
            }

            return String(a.tedarikciAdi || "").localeCompare(
                String(b.tedarikciAdi || ""),
                "tr"
            );
        });

    const wb = new ExcelJS.Workbook();
    wb.creator = "ODAK TMS";
    wb.created = new Date();

    const COLORS = {
        navy: "0F172A",
        blue: "2563EB",
        cyan: "0891B2",
        green: "059669",
        red: "DC2626",
        orange: "D97706",
        grayBg: "F8FAFC",
        border: "CBD5E1",
        white: "FFFFFF",
        text: "111827",
    };

    const toplamTutar = seciliVeriler.reduce(
        (s, i) => s + (Number(i.giderTutari) || 0),
        0
    );

    const bagliSayi = seciliVeriler.filter(
        (i) => i.faturaBagliMi === "Bağlı"
    ).length;

    const bekleyenSayi = seciliVeriler.filter(
        (i) => i.faturaBagliMi !== "Bağlı"
    ).length;

    const bagliOran = seciliVeriler.length
        ? bagliSayi / seciliVeriler.length
        : 0;

    const bugun = new Date().toLocaleDateString("tr-TR");




    // =========================
    // DETAY SAYFASI
    // =========================
    const detay = wb.addWorksheet("Sefer Detayları", {
        views: [{ state: "frozen", ySplit: 1 }],
    });

    detay.columns = [
        { header: "Tip", key: "tipi", width: 12 },
        { header: "Sefer No", key: "seferNo", width: 18 },
        { header: "Sefer Tarihi", key: "seferTarihi", width: 16 },
        { header: "Fatura Durumu", key: "faturaBagliMi", width: 18 },
        { header: "Tedarikçi", key: "tedarikciAdi", width: 28 },
        { header: "Gider Hesabı", key: "giderHesapAdi", width: 26 },
        { header: "Plaka", key: "plaka", width: 14 },
        { header: "Proje", key: "projeAdi", width: 28 },
        { header: "Araç Tipi", key: "aracTipi", width: 18 },
        { header: "Tutar", key: "giderTutari", width: 16 },
        { header: "Açıklama", key: "aciklama", width: 40 },
    ];

    seciliVeriler.forEach((item) => {
        detay.addRow({
            tipi: item.tipi || "",
            seferNo: item.seferNo || "",
            seferTarihi: item.seferTarihi
                ? new Date(item.seferTarihi)
                : "",
            faturaBagliMi: item.faturaBagliMi || "",
            tedarikciAdi: item.tedarikciAdi || "",
            giderHesapAdi: item.giderHesapAdi || "",
            plaka: item.plaka || "",
            projeAdi: item.projeAdi || "",
            aracTipi: item.aracTipi || "",
            giderTutari: Number(item.giderTutari) || 0,
            aciklama: item.aciklama || "",
        });
    });

    detay.getRow(1).eachCell((cell) => {
        cell.font = {
            bold: true,
            color: { argb: COLORS.white },
        };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.navy },
        };
        cell.alignment = { horizontal: "center" };
    });

    detay.eachRow((row, rowNumber) => {
        row.height = rowNumber === 1 ? 24 : 22;

        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin", color: { argb: COLORS.border } },
                left: { style: "thin", color: { argb: COLORS.border } },
                bottom: { style: "thin", color: { argb: COLORS.border } },
                right: { style: "thin", color: { argb: COLORS.border } },
            };
            cell.alignment = {
                vertical: "middle",
                wrapText: true,
            };
        });

        if (rowNumber > 1 && rowNumber % 2 === 0) {
            row.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: COLORS.grayBg },
                };
            });
        }

        if (rowNumber > 1) {
            const durumCell = row.getCell("faturaBagliMi");

            if (durumCell.value === "Bağlı") {
                durumCell.value = "✓ Bağlı";
                durumCell.font = {
                    bold: true,
                    color: { argb: COLORS.green },
                };
            } else {
                durumCell.value = "✗ Bağlanmamış";
                durumCell.font = {
                    bold: true,
                    color: { argb: COLORS.red },
                };
            }

            row.getCell("giderTutari").numFmt = '#,##0.00 "₺"';
        }
    });

    detay.autoFilter = {
        from: "A1",
        to: "K1",
    };

    // =========================
    // DOSYAYI İNDİR
    // =========================
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const dosyaAdi = `fatura_raporu_${bugun.replaceAll(".", "_")}.xlsx`;
    saveAs(blob, dosyaAdi);
}
// ─── mail modal ────────────────────────────────────────────────────────────────
function MailModal({ veriler, onClose }) {
    const [mailGroups, setMailGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState("");

    const [groupName, setGroupName] = useState("");
    const [toEmails, setToEmails] = useState("");
    const [ccEmails, setCcEmails] = useState("");
    const [subject, setSubject] = useState("Fatura Raporu");
    const [selectedProjects, setSelectedProjects] = useState([]);

    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [activePanel, setActivePanel] = useState("ayarlar"); // ayarlar | onizleme


    const projectOptions = [
        ...new Set(veriler.map((item) => item.projeAdi).filter(Boolean)),
    ].sort();

    const seciliVeriler = veriler.filter((item) =>
        selectedProjects.includes(item.projeAdi)
    );

    const toplamTutar = seciliVeriler.reduce(
        (sum, item) => sum + (Number(item.giderTutari) || 0),
        0
    );

    const bagli = seciliVeriler.filter((item) => item.faturaBagliMi === "Bağlı");
    const bekleyen = seciliVeriler.filter((item) => item.faturaBagliMi !== "Bağlı");

    const bagliOran =
        seciliVeriler.length > 0
            ? Math.round((bagli.length / seciliVeriler.length) * 100)
            : 0;

    // Proje altında tedarikçi bazlı özet
    const projeTedarikciMap = {};

    seciliVeriler.forEach((item) => {
        const proje = item.projeAdi || "Bilinmiyor";
        const tedarikci = item.tedarikciAdi || "Bilinmiyor";

        if (!projeTedarikciMap[proje]) {
            projeTedarikciMap[proje] = {};
        }

        if (!projeTedarikciMap[proje][tedarikci]) {
            projeTedarikciMap[proje][tedarikci] = {
                kayit: 0,
                tutar: 0,
                bagli: 0,
                bekleyen: 0,
            };
        }

        projeTedarikciMap[proje][tedarikci].kayit++;
        projeTedarikciMap[proje][tedarikci].tutar += Number(item.giderTutari) || 0;

        if (item.faturaBagliMi === "Bağlı") {
            projeTedarikciMap[proje][tedarikci].bagli++;
        } else {
            projeTedarikciMap[proje][tedarikci].bekleyen++;
        }
    });
    useEffect(() => {
        mailGruplariniGetir();
    }, []);

    async function mailGruplariniGetir() {
        const { data, error } = await supabase
            .from("mail_groups")
            .select("*")
            .eq("is_active", true)
            .order("group_name", { ascending: true });

        if (error) {
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

    function htmlEscape(value = "") {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // ── HTML mail: SADECE ÖZET (sefer detayı yok, excel'de) ──────────────────
    function ozetHtmlOlustur() {
        const bugun = new Date().toLocaleDateString("tr-TR", {
            day: "2-digit", month: "long", year: "numeric",
        });

        const barColor = bagliOran === 100 ? "#22c55e" : bagliOran >= 50 ? "#f59e0b" : "#ef4444";

        // proje özet satırları
        const projeRows = Object.entries(projeTedarikciMap)
            .map(([proje, tedarikciler]) => {
                const tedarikciRows = Object.entries(tedarikciler)
                    .sort((a, b) => b[1].tutar - a[1].tutar)
                    .map(([tedarikci, v]) => `
                <tr>
                    <td style="padding:10px 14px 10px 32px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">
                        ↳ ${htmlEscape(tedarikci)}
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#374151;">
                        ${v.kayit}
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#166534;font-weight:700;">
                        ${v.bagli}
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:${v.bekleyen > 0 ? "#dc2626" : "#16a34a"};font-weight:700;">
                        ${v.bekleyen}
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#0f172a;font-weight:800;white-space:nowrap;">
                        ${tutarFormatla(v.tutar)} TL
                    </td>
                </tr>
            `)
                    .join("");

                return `
            <tr style="background:#f8fafc;">
                <td colspan="5" style="padding:11px 14px;font-size:13px;color:#0f172a;font-weight:900;border-bottom:1px solid #e2e8f0;">
                    ${htmlEscape(proje)}
                </td>
            </tr>
            ${tedarikciRows}
        `;
            })
            .join("");

        return `
<div style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 16px;">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">

    <!-- ══ HEADER ══ -->
    <tr>
        <td style="padding-bottom:0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#312e81 100%);border-radius:20px 20px 0 0;overflow:hidden;">
                <tr>
                    <td style="padding:32px 32px 24px;">
                        <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#93c5fd;margin-bottom:10px;">ODAK TMS · OTOMATİK RAPOR</div>
                        <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">Fatura &amp; Gider<br/>Özet Raporu</h1>
                        <p style="margin:10px 0 0;font-size:13px;color:#93c5fd;line-height:1.5;">Sefer detayları ekte Excel dosyası olarak gönderilmiştir.</p>
                        <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);font-size:11px;color:#64748b;">
                            📅 ${bugun} &nbsp;·&nbsp; 📂 ${selectedProjects.length} proje &nbsp;·&nbsp; 📋 ${seciliVeriler.length} kayıt
                        </div>
                    </td>
                </tr>
                <!-- stat bar -->
                <tr>
                    <td style="padding:0 20px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="25%" style="padding:5px;">
                                    <div style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;text-align:center;">
                                        <div style="font-size:10px;color:#93c5fd;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">KAYIT</div>
                                        <div style="font-size:24px;font-weight:900;color:#fff;margin-top:5px;">${seciliVeriler.length}</div>
                                    </div>
                                </td>
                                <td width="25%" style="padding:5px;">
                                    <div style="background:rgba(59,130,246,.2);border:1px solid rgba(96,165,250,.3);border-radius:12px;padding:14px;text-align:center;">
                                        <div style="font-size:10px;color:#93c5fd;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">TUTAR</div>
                                        <div style="font-size:16px;font-weight:900;color:#bfdbfe;margin-top:5px;">${tutarFormatla(toplamTutar)} TL</div>
                                    </div>
                                </td>
                                <td width="25%" style="padding:5px;">
                                    <div style="background:rgba(34,197,94,.15);border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:14px;text-align:center;">
                                        <div style="font-size:10px;color:#86efac;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">BAĞLI</div>
                                        <div style="font-size:24px;font-weight:900;color:#4ade80;margin-top:5px;">${bagli.length}</div>
                                    </div>
                                </td>
                                <td width="25%" style="padding:5px;">
                                    <div style="background:${bekleyen.length > 0 ? "rgba(239,68,68,.15)" : "rgba(34,197,94,.1)"};border:1px solid ${bekleyen.length > 0 ? "rgba(252,165,165,.25)" : "rgba(74,222,128,.2)"};border-radius:12px;padding:14px;text-align:center;">
                                        <div style="font-size:10px;color:${bekleyen.length > 0 ? "#fca5a5" : "#86efac"};font-weight:700;letter-spacing:.06em;text-transform:uppercase;">BEKLEYEN</div>
                                        <div style="font-size:24px;font-weight:900;color:${bekleyen.length > 0 ? "#f87171" : "#4ade80"};margin-top:5px;">${bekleyen.length}</div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <!-- bağlılık bar -->
                <tr>
                    <td style="padding:0 26px 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td>
                                    <div style="display:table;width:100%;">
                                        <div style="display:table-cell;font-size:11px;color:#94a3b8;font-weight:600;">Fatura Bağlılık Oranı</div>
                                        <div style="display:table-cell;text-align:right;font-size:12px;font-weight:900;color:#60a5fa;">%${bagliOran}</div>
                                    </div>
                                    <div style="height:7px;background:rgba(255,255,255,.1);border-radius:99px;margin-top:7px;overflow:hidden;">
                                        <div style="height:7px;width:${bagliOran}%;background:linear-gradient(90deg,${barColor},#3b82f6);border-radius:99px;"></div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- ══ BODY ══ -->
    <tr>
        <td style="background:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:24px 28px 16px;">

            <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
                Merhaba,<br/>
                Aşağıda <strong style="color:#0f172a;">${selectedProjects.length} projeye</strong> ait gider özeti sunulmuştur.
                ${bekleyen.length > 0
                ? `<br/><span style="color:#dc2626;font-weight:600;">⚠ ${bekleyen.length} kayıt için fatura bağlantısı henüz tamamlanmamıştır.</span>`
                : `<br/><span style="color:#16a34a;font-weight:600;">✓ Tüm faturalar başarıyla bağlanmıştır.</span>`
            }
                <br/><span style="color:#64748b;font-size:13px;">📎 Sefer detayları ekteki Excel dosyasında yer almaktadır.</span>
            </p>

            <!-- PROJE ÖZET TABLOSU -->
            <div style="margin-bottom:8px;">
                <div style="display:inline-block;background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;color:#1d4ed8;margin-bottom:14px;letter-spacing:.04em;text-transform:uppercase;">
                    📊 Proje Altında Tedarikçi Bazlı Özet
                </div>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                <tr style="background:#f8fafc;">
                    <th style="text-align:left;padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0;">Proje / Tedarikçi</th>
                    <th style="text-align:center;padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0;">Kayıt</th>
                    <th style="text-align:center;padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0;">Bağlı</th>
                    <th style="text-align:center;padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0;">Bekleyen</th>
                    <th style="text-align:right;padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e2e8f0;">Tutar</th>
                </tr>
                ${projeRows || `<tr><td colspan="5" style="padding:20px;text-align:center;color:#9ca3af;">Veri bulunamadı.</td></tr>`}
                <!-- toplam -->
                <tr style="background:#f0f9ff;">
                    <td style="padding:11px 14px;font-size:13px;font-weight:800;color:#1d4ed8;border-top:2px solid #bfdbfe;">Genel Toplam</td>
                    <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:700;color:#1d4ed8;border-top:2px solid #bfdbfe;">${seciliVeriler.length}</td>
                    <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:700;color:#166534;border-top:2px solid #bfdbfe;">${bagli.length}</td>
                    <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:700;color:${bekleyen.length > 0 ? "#dc2626" : "#166534"};border-top:2px solid #bfdbfe;">${bekleyen.length}</td>
                    <td style="padding:11px 14px;text-align:right;font-size:15px;font-weight:900;color:#1d4ed8;border-top:2px solid #bfdbfe;white-space:nowrap;">${tutarFormatla(toplamTutar)} TL</td>
                </tr>
            </table>

        </td>
    </tr>

    <!-- ══ FOOTER ══ -->
    <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:18px 28px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="font-size:12px;color:#94a3b8;line-height:1.6;">
                        Detaylı sefer kayıtları ekteki Excel dosyasında yer almaktadır.<br/>
                        <span style="font-weight:600;color:#64748b;">Odak TMS</span> &nbsp;·&nbsp; Otomatik oluşturulmuş rapor &nbsp;·&nbsp; ${bugun}
                    </td>
                    <td style="text-align:right;">
                        <div style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#312e81);border-radius:8px;padding:7px 14px;">
                            <span style="font-size:13px;font-weight:800;color:#fff;letter-spacing:.5px;">ODAK TMS</span>
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

</table>
</td></tr>
</table>
</div>`;
    }

    function setMsg(type, text) {
        if (type === "error") { setError(text); setSuccessMsg(""); }
        else { setSuccessMsg(text); setError(""); }
    }

    async function handleRaporKopyala() {
        setError("");
        setSuccessMsg("");

        if (!selectedProjects.length) {
            setMsg("error", "Rapor için en az bir proje seçmelisiniz.");
            return;
        }

        const html = ozetHtmlOlustur();

        const plainText =
            `Fatura Özet Raporu\n\n` +
            `Toplam Kayıt: ${seciliVeriler.length}\n` +
            `Toplam Tutar: ${tutarFormatla(toplamTutar)} TL\n` +
            `Bağlı: ${bagli.length} | Bekleyen: ${bekleyen.length}`;

        try {
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        "text/html": new Blob([html], { type: "text/html" }),
                        "text/plain": new Blob([plainText], { type: "text/plain" }),
                    }),
                ]);

                setMsg("success", "✓ Özet rapor panoya kopyalandı.");
                return;
            }

            throw new Error("Clipboard API desteklenmiyor.");
        } catch (err) {
            try {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = html;
                tempDiv.style.position = "fixed";
                tempDiv.style.left = "-9999px";
                tempDiv.style.top = "0";
                tempDiv.contentEditable = "true";

                document.body.appendChild(tempDiv);

                const range = document.createRange();
                range.selectNodeContents(tempDiv);

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);

                const copied = document.execCommand("copy");

                selection.removeAllRanges();
                document.body.removeChild(tempDiv);

                if (!copied) {
                    throw new Error("execCommand copy başarısız.");
                }

                setMsg("success", "✓ Özet rapor panoya kopyalandı.");
            } catch (fallbackErr) {
                setMsg(
                    "error",
                    "Rapor kopyalanamadı. Tarayıcı izin vermedi. Chrome kullanıp sayfayı HTTPS veya localhost üzerinden açın."
                );
            }
        }
    }
    async function handleExcelIndir() {
        if (!selectedProjects.length) {
            setMsg("error", "Excel için en az bir proje seçmelisiniz.");
            return;
        }

        await excelIndir(veriler, selectedProjects);
        setMsg("success", "✓ Modern Excel raporu indirildi.");
    }
    async function grupKaydet() {
        setError(""); setSuccessMsg("");
        if (!groupName.trim()) { setMsg("error", "Grup adı zorunludur."); return; }
        if (!toEmails.trim()) { setMsg("error", "Kime alanı zorunludur."); return; }
        if (!subject.trim()) { setMsg("error", "Konu alanı zorunludur."); return; }
        if (!selectedProjects.length) { setMsg("error", "En az bir proje seçmelisiniz."); return; }

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
            result = await supabase.from("mail_groups").update(payload).eq("id", selectedGroupId);
        } else {
            result = await supabase.from("mail_groups").insert(payload);
        }

        if (result.error) { setMsg("error", "Mail grubu kaydedilemedi."); return; }
        await mailGruplariniGetir();
        setMsg("success", "✓ Mail grubu kaydedildi.");
    }

    async function grupSil() {
        if (!selectedGroupId) return;
        if (!window.confirm("Bu mail grubunu silmek istediğinize emin misiniz?")) return;
        const { error } = await supabase.from("mail_groups").update({ is_active: false }).eq("id", selectedGroupId);
        if (error) { setMsg("error", "Mail grubu silinemedi."); return; }
        setSelectedGroupId(""); setGroupName(""); setToEmails(""); setCcEmails("");
        setSubject("Fatura Raporu"); setSelectedProjects([]);
        await mailGruplariniGetir();
        setMsg("success", "✓ Mail grubu silindi.");
    }

    function handleSend() {
        setError(""); setSuccessMsg("");
        if (!toEmails.trim()) { setMsg("error", "Kime alanı boş olamaz."); return; }
        if (!selectedProjects.length) { setMsg("error", "En az bir proje seçmelisiniz."); return; }
        const mailTo = toEmails.split(",").map((x) => x.trim()).filter(Boolean).join(",");
        const ccList = ccEmails.split(",").map((x) => x.trim()).filter(Boolean).join(",");
        const plainBody = `Merhaba,\n\nFatura özet raporu hazırlanmıştır. Sefer detayları için ekte Excel dosyasını inceleyiniz.\n\nToplam Kayıt: ${seciliVeriler.length}\nToplam Tutar: ${tutarFormatla(toplamTutar)} TL\nBağlı: ${bagli.length} | Bekleyen: ${bekleyen.length}\n\nİyi çalışmalar.\nOdak TMS`;
        let mailUrl = `mailto:${encodeURIComponent(mailTo)}`;
        mailUrl += `?subject=${encodeURIComponent(subject || "Fatura Raporu")}`;

        if (ccList)
            mailUrl += `&cc=${encodeURIComponent(ccList)}`;
        window.location.href = mailUrl;
    }

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box mail-modal-v2" role="dialog" aria-modal="true">

                {/* ── header ── */}
                <div className="mm-header">
                    <div className="mm-header-left">
                        <div className="mm-header-icon">✉</div>
                        <div>
                            <h2>Mail Gönder</h2>
                            <p className="mm-header-sub">Özet mail + Excel detay raporu oluştur</p>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Kapat">✕</button>
                </div>

                {/* ── tab bar ── */}
                <div className="mm-tabs">
                    <button
                        className={`mm-tab ${activePanel === "ayarlar" ? "active" : ""}`}
                        onClick={() => setActivePanel("ayarlar")}
                    >
                        ⚙ Ayarlar &amp; Projeler
                    </button>
                    <button
                        className={`mm-tab ${activePanel === "onizleme" ? "active" : ""}`}
                        onClick={() => setActivePanel("onizleme")}
                        disabled={!selectedProjects.length}
                    >
                        👁 Özet Önizleme
                        {selectedProjects.length > 0 && (
                            <span className="mm-tab-badge">{seciliVeriler.length}</span>
                        )}
                    </button>
                </div>

                {/* ── panel: ayarlar ── */}
                {activePanel === "ayarlar" && (
                    <div className="mm-body">
                        {/* left col */}
                        <div className="mm-col mm-col-left">
                            <div className="mm-section-title">
                                <span>📁</span> Kayıtlı Gruplar
                            </div>

                            <select
                                className="mail-select"
                                value={selectedGroupId}
                                onChange={(e) => grupSec(e.target.value)}
                            >
                                <option value="">+ Yeni grup oluştur</option>
                                {mailGroups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.group_name}
                                    </option>
                                ))}
                            </select>

                            <div className="mm-section-title" style={{ marginTop: 20 }}>
                                <span>✏</span> Grup Detayları
                            </div>

                            <div className="mm-field">
                                <label>Grup Adı</label>
                                <input
                                    type="text"
                                    placeholder="Örn: Arkas Fatura Grubu"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                            </div>

                            <div className="mm-field">
                                <label>Kime</label>
                                <input
                                    type="text"
                                    placeholder="gorkem@firma.com, ali@firma.com"
                                    value={toEmails}
                                    onChange={(e) => setToEmails(e.target.value)}
                                />
                                <span className="mm-field-hint">Birden fazla adres virgülle ayırın</span>
                            </div>

                            <div className="mm-field">
                                <label>SS (CC)</label>
                                <input
                                    type="text"
                                    placeholder="yagiz@firma.com"
                                    value={ccEmails}
                                    onChange={(e) => setCcEmails(e.target.value)}
                                />
                            </div>

                            <div className="mm-field">
                                <label>Konu</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            {/* Excel açıklaması */}
                            <div className="mm-excel-info">
                                <span className="mm-excel-info-icon">📎</span>
                                <div>
                                    <p className="mm-excel-info-title">Excel Eki Hakkında</p>
                                    <p className="mm-excel-info-desc">
                                        Mail gövdesi proje altında tedarikçi bazlı özet içerir.
                                        Sefer detayları (tüm sütunlar) Excel dosyası olarak ayrıca indirilir.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* right col */}
                        <div className="mm-col mm-col-right">
                            <div className="mm-section-title">
                                <span>📂</span> Projeler
                                {selectedProjects.length > 0 && (
                                    <span className="mm-proj-count">{selectedProjects.length}/{projectOptions.length}</span>
                                )}
                            </div>

                            <ProjectPicker
                                options={projectOptions}
                                selected={selectedProjects}
                                onChange={setSelectedProjects}
                            />

                            {selectedProjects.length > 0 && (
                                <div className="mm-quick-stats">
                                    <div className="mm-qs-item">
                                        <span className="mm-qs-val">{seciliVeriler.length}</span>
                                        <span className="mm-qs-label">Kayıt</span>
                                    </div>
                                    <div className="mm-qs-sep" />
                                    <div className="mm-qs-item">
                                        <span className="mm-qs-val green">{bagli.length}</span>
                                        <span className="mm-qs-label">Bağlı</span>
                                    </div>
                                    <div className="mm-qs-sep" />
                                    <div className="mm-qs-item">
                                        <span className="mm-qs-val red">{bekleyen.length}</span>
                                        <span className="mm-qs-label">Bekleyen</span>
                                    </div>
                                    <div className="mm-qs-sep" />
                                    <div className="mm-qs-item">
                                        <span className="mm-qs-val blue">{tutarFormatla(toplamTutar)} ₺</span>
                                        <span className="mm-qs-label">Toplam</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── panel: önizleme ── */}
                {activePanel === "onizleme" && (
                    <div className="mm-preview-wrap">
                        {/* mail adresi bar */}
                        <div className="mm-preview-bar">
                            <span className="mm-preview-to">
                                <strong>Kime:</strong> {toEmails || "—"}
                            </span>
                            {ccEmails && (
                                <span className="mm-preview-cc">
                                    <strong>SS:</strong> {ccEmails}
                                </span>
                            )}
                            <span className="mm-preview-subj">
                                <strong>Konu:</strong> {subject}
                            </span>
                        </div>

                        {/* stat cards row */}
                        <div className="mm-preview-stats">
                            <div className="mm-ps-card">
                                <span className="mm-ps-icon">📋</span>
                                <span className="mm-ps-val">{seciliVeriler.length}</span>
                                <span className="mm-ps-label">Toplam Kayıt</span>
                            </div>
                            <div className="mm-ps-card blue">
                                <span className="mm-ps-icon">💰</span>
                                <span className="mm-ps-val">{tutarFormatla(toplamTutar)} ₺</span>
                                <span className="mm-ps-label">Toplam Tutar</span>
                            </div>
                            <div className="mm-ps-card green">
                                <span className="mm-ps-icon">✅</span>
                                <span className="mm-ps-val">{bagli.length}</span>
                                <span className="mm-ps-label">Bağlı · %{bagliOran}</span>
                            </div>
                            <div className="mm-ps-card red">
                                <span className="mm-ps-icon">⚠</span>
                                <span className="mm-ps-val">{bekleyen.length}</span>
                                <span className="mm-ps-label">Bekleyen</span>
                            </div>
                        </div>

                        {/* bağlılık bar */}
                        <div className="mm-rate-bar">
                            <div className="mm-rate-labels">
                                <span>Fatura Bağlılık Oranı</span>
                                <strong>%{bagliOran}</strong>
                            </div>
                            <div className="mm-rate-track">
                                <div className="mm-rate-fill" style={{ width: `${bagliOran}%` }} />
                            </div>
                        </div>

                        {/* proje altında tedarikçi bazlı özet önizleme */}
                        <div className="mm-preview-proj-section">
                            <p className="mm-preview-proj-title">📊 Mail Gövdesindeki Proje / Tedarikçi Özeti</p>
                            <div className="mm-proj-preview-table">
                                <div className="mm-ppt-header">
                                    <span>Proje / Tedarikçi</span>
                                    <span>Kayıt</span>
                                    <span>Bağlı</span>
                                    <span>Bekleyen</span>
                                    <span>Tutar</span>
                                </div>

                                {Object.entries(projeTedarikciMap).map(([proje, tedarikciler]) => (
                                    <div key={proje}>
                                        <div className="mm-ppt-row" style={{ background: "#f8fafc", fontWeight: 800 }}>
                                            <span className="mm-ppt-proje">
                                                <span className="mm-ppt-avatar" style={{ background: avatarColor(proje) }}>
                                                    {initials(proje)}
                                                </span>
                                                {proje}
                                            </span>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>

                                        {Object.entries(tedarikciler)
                                            .sort((a, b) => b[1].tutar - a[1].tutar)
                                            .map(([tedarikci, v]) => (
                                                <div key={`${proje}-${tedarikci}`} className="mm-ppt-row">
                                                    <span className="mm-ppt-proje" style={{ paddingLeft: 28 }}>
                                                        ↳ {tedarikci}
                                                    </span>
                                                    <span>{v.kayit}</span>
                                                    <span className="green">{v.bagli}</span>
                                                    <span className={v.bekleyen > 0 ? "red" : "green"}>{v.bekleyen}</span>
                                                    <span className="tutar">{tutarFormatla(v.tutar)} ₺</span>
                                                </div>
                                            ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* excel içerik notu */}
                        <div className="mm-excel-preview">
                            <span className="mm-excel-preview-icon">📊</span>
                            <div>
                                <p className="mm-excel-preview-title">Excel Dosyası İçeriği</p>
                                <p className="mm-excel-preview-desc">
                                    <strong>Tek Sayfa — Sefer Detayları:</strong> Sadece bağlanmamış seferler; tip, sefer no, tarih, durum, tedarikçi, gider hesabı, plaka, proje, araç tipi, tutar, açıklama
                                </p>
                            </div>
                        </div>

                        {/* bekleyen listesi */}
                        {bekleyen.length > 0 && (
                            <div className="mm-preview-pending" style={{ marginTop: 16 }}>
                                <p className="mm-preview-pending-title">
                                    ⚠ Aksiyon Gerektiren Kayıtlar (ilk 8)
                                </p>
                                <div className="mm-pending-list">
                                    {bekleyen.slice(0, 8).map((item, i) => (
                                        <div key={i} className="mm-pending-row">
                                            <span className="mm-pending-no">{item.seferNo || "—"}</span>
                                            <span className="mm-pending-proje">{item.projeAdi || "—"}</span>
                                            <span className="mm-pending-supplier">{item.tedarikciAdi || "—"}</span>
                                            <span className="mm-pending-tutar">{tutarFormatla(item.giderTutari)} ₺</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── messages ── */}
                {error && <div className="modal-msg error"><span>⚠</span> {error}</div>}
                {successMsg && <div className="modal-msg success"><span>✓</span> {successMsg}</div>}

                {/* ── footer ── */}
                <div className="mm-footer">
                    <div className="mm-footer-left">
                        {selectedGroupId && (
                            <button className="btn-ghost danger" onClick={grupSil}>
                                🗑 Grubu Sil
                            </button>
                        )}
                    </div>
                    <div className="mm-footer-right">
                        <button className="btn-ghost" onClick={onClose}>İptal</button>
                        <button className="btn-ghost" onClick={grupKaydet}>
                            💾 {selectedGroupId ? "Güncelle" : "Grubu Kaydet"}
                        </button>
                        <button
                            className="btn-ghost excel"
                            onClick={handleExcelIndir}
                            disabled={!selectedProjects.length}
                            title="Sefer detaylarını Excel olarak indir"
                        >
                            📊 Excel İndir
                        </button>
                        <button
                            className="btn-ghost accent"
                            onClick={handleRaporKopyala}
                            disabled={!selectedProjects.length}
                            title="Özet HTML raporu panoya kopyala"
                        >
                            📋 Özeti Kopyala
                        </button>
                        <button
                            className="btn-send"
                            onClick={handleSend}
                            disabled={!toEmails || !selectedProjects.length}
                        >
                            ✉ Maili Aç
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Fatura() {

    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const firstDayOfMonth = formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1));
    const lastDayOfMonth = formatDateForInput(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(lastDayOfMonth);
    const [userId, setUserId] = useState(123);
    const [page, setPage] = useState(1);
    const [tipFilter, setTipFilter] = useState([]);
    const [projeFilter, setProjeFilter] = useState([]);
    const [durumFilter, setDurumFilter] = useState([]);
    const [searchText, setSearchText] = useState("");

    const [veriler, setVeriler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hata, setHata] = useState("");
    const [mailAcik, setMailAcik] = useState(false);
    const [activeTab, setActiveTab] = useState("tablo");

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
                    headers: { "Content-Type": "application/json" },
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
            const spotListe = liste.filter((item) => item.SpecialGroupName === "SPOT");

            setVeriler(
                spotListe.map((item) => ({
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
            setHata(error.message || "Fatura verileri alınamadı.");
        } finally {
            setLoading(false);
        }
    }

    const tumTipler = [...new Set(veriler.map((v) => v.tipi).filter(Boolean))];
    const tumProjeler = [...new Set(veriler.map((v) => v.projeAdi).filter(Boolean))];
    const tumDurumlar = ["Bağlı", "Bağlanmamış"];

    const filtered = veriler.filter((item) => {
        if (tipFilter.length > 0 && !tipFilter.includes(item.tipi)) return false;

        if (projeFilter.length > 0 && !projeFilter.includes(item.projeAdi)) return false;

        if (durumFilter.length > 0 && !durumFilter.includes(item.faturaBagliMi)) return false;
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

    const siraliFiltered = [...filtered].sort((a, b) => {
        const seferA = String(a.seferNo || "");
        const seferB = String(b.seferNo || "");

        if (seferA !== seferB) {
            return seferA.localeCompare(seferB, "tr", { numeric: true });
        }

        return String(a.tedarikciAdi || "").localeCompare(
            String(b.tedarikciAdi || ""),
            "tr"
        );
    });

    const toplamTutar = filtered.reduce((s, i) => s + (Number(i.giderTutari) || 0), 0);
    const bagliSayi = filtered.filter((i) => i.faturaBagliMi === "Bağlı").length;
    const baglanmamisSayi = filtered.filter((i) => i.faturaBagliMi === "Bağlanmamış").length;
    const bagliOran = filtered.length > 0 ? ((bagliSayi / filtered.length) * 100).toFixed(1) : 0;

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

    const tipMap = {};
    filtered.forEach((item) => {
        const t = item.tipi || "Diğer";
        if (!tipMap[t]) tipMap[t] = { kayit: 0, tutar: 0 };
        tipMap[t].kayit++;
        tipMap[t].tutar += Number(item.giderTutari) || 0;
    });

    return (
        <main className="fatura-page">
            <header className="fatura-header">
                <div className="header-left">
                    <div className="header-badge">
                        <span className="header-badge-icon" aria-hidden="true">🧾</span>
                    </div>
                    <div>
                        <h1>Fatura &amp; Gider Analizi</h1>
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
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? <span className="spinner" aria-hidden="true" /> : null}
                    {loading ? "Yükleniyor…" : "Verileri Getir"}
                </button>
            </form>

            {hata && (
                <div className="alert-error" role="alert">
                    <span aria-hidden="true">⚠</span> {hata}
                </div>
            )}

            {veriler.length > 0 && (
                <div className="stat-grid">
                    <StatCard icon="📋" label="Toplam Kayıt" value={filtered.length.toLocaleString("tr-TR")} sub={`${veriler.length} kayıttan ${filtered.length} filtrelendi`} accent="#4f46e5" />
                    <StatCard icon="💰" label="Toplam Gider" value={`${tutarFormatla(toplamTutar)} ₺`} accent="#0891b2" />
                    <StatCard icon="✅" label="Fatura Bağlı" value={bagliSayi.toLocaleString("tr-TR")} sub={`%${bagliOran} oran`} accent="#059669" />
                    <StatCard icon="⚠" label="Bağlanmamış" value={baglanmamisSayi.toLocaleString("tr-TR")} sub="fatura bağlı değil" accent="#dc2626" />
                </div>
            )}

            {veriler.length > 0 && (
                <div className="tab-bar">
                    <button className={`tab-btn ${activeTab === "tablo" ? "active" : ""}`} onClick={() => setActiveTab("tablo")}>
                        📄 Kayıt Tablosu
                    </button>
                    <button className={`tab-btn ${activeTab === "analiz" ? "active" : ""}`} onClick={() => setActiveTab("analiz")}>
                        📊 Proje Analizi
                    </button>
                </div>
            )}

            {veriler.length > 0 && activeTab === "analiz" && (
                <div className="analiz-section">
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

                    <div className="analiz-card">
                        <h3>Fatura Bağlantı Özeti</h3>
                        <div className="durum-summary">
                            <div className="durum-ring-wrap">
                                <svg viewBox="0 0 80 80" className="durum-ring" aria-label={`Bağlı: ${bagliSayi}, Bağlanmamış: ${baglanmamisSayi}`} role="img">
                                    <circle cx="40" cy="40" r="32" fill="none" strokeWidth="10" stroke="#e2e8f0" />
                                    <circle cx="40" cy="40" r="32" fill="none" strokeWidth="10" stroke="#059669"
                                        strokeDasharray={`${filtered.length > 0 ? (bagliSayi / filtered.length) * 201 : 0} 201`}
                                        strokeDashoffset="50" strokeLinecap="round" />
                                    <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">{bagliOran}%</text>
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

                    <div className="analiz-card wide">
                        <h3>Proje Bazlı Dağılım</h3>
                        <div className="proje-table">
                            {projeler.map(([proje, v]) => (
                                <div key={proje} className="proje-row">
                                    <div className="proje-info">
                                        <span className="proje-avatar" style={{ background: avatarColor(proje) }}>{initials(proje)}</span>
                                        <div>
                                            <p className="proje-adi">{proje}</p>
                                            <p className="proje-meta">
                                                {v.kayit} kayıt &nbsp;·&nbsp;
                                                <span className="badge-bagli">{v.bagli} bağlı</span>
                                                {v.baglanmamis > 0 && <span className="badge-baglanmamis ml-4">{v.baglanmamis} bağlanmamış</span>}
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
                                <MultiFilter
                                    label="Tip"
                                    options={tumTipler}
                                    selected={tipFilter}
                                    onChange={setTipFilter}
                                    placeholder="Tüm tipler"
                                />

                                <MultiFilter
                                    label="Proje"
                                    options={tumProjeler}
                                    selected={projeFilter}
                                    onChange={setProjeFilter}
                                    placeholder="Tüm projeler"
                                />

                                <MultiFilter
                                    label="Durum"
                                    options={tumDurumlar}
                                    selected={durumFilter}
                                    onChange={setDurumFilter}
                                    placeholder="Tüm durumlar"
                                />
                            </div>
                        )}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon" aria-hidden="true">📭</span>
                            <p>{veriler.length === 0 ? "Filtreleri seçip 'Verileri Getir' butonuna basın." : "Bu filtreye uyan kayıt bulunamadı."}</p>
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
                                    {siraliFiltered.map((item, i) => (
                                        <tr key={i}>
                                            <td><span className="tip-badge">{item.tipi || "–"}</span></td>
                                            <td className="mono">{item.seferNo || "–"}</td>
                                            <td>{tarihFormatla(item.seferTarihi)}</td>
                                            <td>
                                                <span className={item.faturaBagliMi === "Bağlı" ? "status-bagli" : "status-baglanmamis"}>
                                                    {item.faturaBagliMi === "Bağlı" ? "✓ Bağlı" : "✗ Bağlanmamış"}
                                                </span>
                                            </td>
                                            <td>{item.tedarikciAdi || "–"}</td>
                                            <td>{item.giderHesapAdi || "–"}</td>
                                            <td className="mono plaka">{item.plaka || "–"}</td>
                                            <td>
                                                {item.projeAdi ? (
                                                    <span className="proje-pill" style={{ background: avatarColor(item.projeAdi) + "22", color: avatarColor(item.projeAdi) }}>
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

            {mailAcik && <MailModal veriler={siraliFiltered} onClose={() => setMailAcik(false)} />}
        </main>
    );
}