import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AnaSayfa.css";

const DURUM_CONFIG = {
    teslim: { label: "Teslim Edildi", dot: "#16a34a", bg: "#f0fdf4", text: "#15803d" },
    yolda: { label: "Yolda", dot: "#2563eb", bg: "#eff6ff", text: "#1d4ed8" },
    beklemede: { label: "Beklemede", dot: "#ca8a04", bg: "#fef9c3", text: "#a16207" },
    iade: { label: "İade", dot: "#dc2626", bg: "#fef2f2", text: "#b91c1c" },
};

function IconTruck() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconClock() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function IconX() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

function IconCalendar() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function IconArrow() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

function KpiKart({ label, value, badge, badgeBg, badgeText, iconBg, icon, accentColor }) {
    return (
        <div className="kpi-kart">
            <div className="kpi-icon-wrap" style={{ background: iconBg }}>
                <span style={{ color: accentColor }}>{icon}</span>
            </div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{Number(value || 0).toLocaleString("tr-TR")}</div>
            <span className="kpi-badge" style={{ background: badgeBg, color: badgeText }}>
                {badge}
            </span>
            <div className="kpi-accent" style={{ background: accentColor }} />
        </div>
    );
}

function DonutChart({ tamamlanan, devam, iptal }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const data = [tamamlanan, devam, iptal];
        const colors = ["#16a34a", "#2563eb", "#dc2626"];
        const total = data.reduce((a, b) => a + b, 0);

        ctx.clearRect(0, 0, 140, 140);

        if (total === 0) {
            ctx.beginPath();
            ctx.arc(70, 70, 56, 0, 2 * Math.PI);
            ctx.arc(70, 70, 40, 2 * Math.PI, 0, true);
            ctx.closePath();
            ctx.fillStyle = "#e5e7eb";
            ctx.fill();
            return;
        }

        let startAngle = -Math.PI / 2;

        data.forEach((val, i) => {
            if (val <= 0) return;

            const slice = (val / total) * 2 * Math.PI;

            ctx.beginPath();
            ctx.arc(70, 70, 56, startAngle, startAngle + slice);
            ctx.arc(70, 70, 40, startAngle + slice, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();

            startAngle += slice + 0.018;
        });
    }, [tamamlanan, devam, iptal]);

    const total = tamamlanan + devam + iptal;
    const pct = total > 0 ? Math.round((tamamlanan / total) * 100) : 0;

    return (
        <div className="donut-wrap">
            <canvas ref={canvasRef} width="140" height="140" />
            <div className="donut-center">
                <div className="donut-pct">%{pct}</div>
                <div className="donut-lbl">Tamamlanan</div>
            </div>
        </div>
    );
}

function MiniStat({ label, mainText, mutedText, percent, color }) {
    return (
        <div className="mini-stat">
            <div className="mini-label">{label}</div>
            <div className="mini-bar-bg">
                <div className="mini-bar" style={{ width: `${percent}%`, background: color }} />
            </div>
            <div className="mini-nums">
                <span className="mini-main">{mainText}</span>
                <span className="mini-muted">{mutedText}</span>
            </div>
        </div>
    );
}

function AnaSayfa() {
    const navigate = useNavigate();

    const [evraklar, setEvraklar] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hata, setHata] = useState("");

    function tokenBul(data) {
        return (
            data?.token ||
            data?.accessToken ||
            data?.access_token ||
            data?.jwtToken ||
            data?.jwt ||
            data?.bearerToken ||
            data?.data?.token ||
            data?.data?.accessToken ||
            data?.data?.access_token ||
            data?.data?.jwtToken ||
            data?.data?.jwt ||
            data?.data?.bearerToken ||
            data?.result?.token ||
            data?.result?.accessToken ||
            data?.result?.access_token ||
            data?.result?.jwtToken ||
            data?.result?.jwt ||
            data?.result?.bearerToken
        );
    }

    async function guvenliJsonOku(response) {
        const text = await response.text();
        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    }

    async function tokenYenile() {
        throw new Error("Token servisi devre dışı.");
    }
    async function apiIstek(url, body, tekrarDene = true) {
        const token = localStorage.getItem("token") || "supabase-login";
        const fullUrl = `${import.meta.env.VITE_SHO_API_BASE_URL}${url}`;

        console.log("API FULL URL:", fullUrl);

        const response = await fetch(fullUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = await guvenliJsonOku(response);

        if (response.status === 401) {
            throw new Error("Yetkilendirme hatası.");
        }
        if (!response.ok) {
            throw new Error(data?.message || `API hata: ${response.status}`);
        }

        return data;
    }

    function bugunFormatli() {
        const d = new Date();
        return d.toISOString().split("T")[0];
    }

    function ayinIlkGunuFormatli() {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    }

    async function evraklariGetir() {
        setLoading(true);
        setHata("");

        try {
            const customerId = Number(localStorage.getItem("customerId")) || 59765;

            const data = await apiIstek("/odak-api/api/tmsdespatchdocuments/getall", {
                startDate: ayinIlkGunuFormatli(),
                endDate: bugunFormatli(),
                customerId,
                vehicleId: 0,
                driverId: 0,
            });

            const liste = Array.isArray(data)
                ? data
                : data?.data || data?.items || data?.result || [];

            setEvraklar(Array.isArray(liste) ? liste : []);
        } catch (error) {
            setHata(error.message || "Dashboard verileri çekilemedi.");
            setEvraklar([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        evraklariGetir();
    }, []);

    function evrakDurumKey(evrak) {
        const durum = Number(evrak?.tmsDespatchDocumentStatu);

        if (durum === 10) return "iade";
        if (durum >= 40) return "teslim";
        if (durum === 20 || durum === 30 || durum === 31) return "yolda";

        return "beklemede";
    }

    function seferTamamlandiMi(evrak) {
        const evrakDurumu = Number(evrak?.tmsDespatchDocumentStatu);
        const seferDurumu = Number(
            evrak?.tmsDespatchStatu ||
            evrak?.despatchStatu ||
            evrak?.statu ||
            evrak?.status ||
            evrak?.tmsDespatchStatus
        );

        return evrakDurumu >= 40 || seferDurumu === 8;
    }

    function formatSaat(tarih) {
        if (!tarih) return "-";

        const date = new Date(tarih);
        if (Number.isNaN(date.getTime())) return "-";

        return date.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const bugun = new Date().toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
    });

    const STATS = useMemo(() => {
        const toplamSefer = evraklar.length;
        const tamamlananSefer = evraklar.filter(seferTamamlandiMi).length;
        const iptalIade = evraklar.filter((e) => evrakDurumKey(e) === "iade").length;
        const devamEdenSefer = Math.max(toplamSefer - tamamlananSefer - iptalIade, 0);

        const bugunStr = bugunFormatli();

        const bugunGelen = evraklar.filter((e) =>
            String(e?.despatchDate || "").startsWith(bugunStr)
        ).length;

        const zamanindaYuzde =
            toplamSefer > 0 ? Math.round((tamamlananSefer / toplamSefer) * 100) : 0;

        return {
            toplamSefer,
            tamamlananSefer,
            devamEdenSefer,
            iptalIade,
            bugunGelen,
            zamanindaYuzde,
            zamanindaSayi: tamamlananSefer,
        };
    }, [evraklar]);

    const SON_EVRAKLAR = useMemo(() => {
        return [...evraklar]
            .sort((a, b) => new Date(b?.despatchDate || 0) - new Date(a?.despatchDate || 0))
            .slice(0, 6)
            .map((evrak) => ({
                no: evrak?.documentNo || "-",
                guzergah: evrak?.deliveryAddressCode || "-",
                surucu: evrak?.fullName || "-",
                durum: evrakDurumKey(evrak),
                saat: formatSaat(evrak?.despatchDate),
            }));
    }, [evraklar]);

    const tamamPct =
        STATS.toplamSefer > 0
            ? Math.round((STATS.tamamlananSefer / STATS.toplamSefer) * 100)
            : 0;

    return (
        <main className="content">
            <div className="welcome-row">
                <div className="welcome-text">
                    <h1>Hoş Geldiniz</h1>
                    <p>Güncel sefer ve teslim evrak durumlarını gerçek kayıtlardan takip edin.</p>
                </div>

                <div className="date-badge">
                    <IconCalendar />
                    {bugun}
                </div>
            </div>

            {hata && <div className="error-box">{hata}</div>}

            {loading && <div className="empty-box">Dashboard verileri yükleniyor...</div>}

            <div className="kpi-grid">
                <KpiKart
                    label="Toplam Sefer"
                    value={STATS.toplamSefer}
                    badge={`${STATS.bugunGelen} bugün`}
                    iconBg="#eff6ff"
                    accentColor="#2563eb"
                    badgeBg="#eff6ff"
                    badgeText="#1d4ed8"
                    icon={<IconTruck />}
                />

                <KpiKart
                    label="Tamamlanan Sefer"
                    value={STATS.tamamlananSefer}
                    badge={`%${tamamPct} tamamlama`}
                    iconBg="#f0fdf4"
                    accentColor="#16a34a"
                    badgeBg="#f0fdf4"
                    badgeText="#15803d"
                    icon={<IconCheck />}
                />

                <KpiKart
                    label="Devam Eden Sefer"
                    value={STATS.devamEdenSefer}
                    badge="aktif kayıt"
                    iconBg="#fef9c3"
                    accentColor="#ca8a04"
                    badgeBg="#fef9c3"
                    badgeText="#a16207"
                    icon={<IconClock />}
                />

                <KpiKart
                    label="İptal / İade"
                    value={STATS.iptalIade}
                    badge="eksik / iade"
                    iconBg="#fef2f2"
                    accentColor="#dc2626"
                    badgeBg="#fef2f2"
                    badgeText="#b91c1c"
                    icon={<IconX />}
                />
            </div>

            <div className="row-orta">
                <div className="kart">
                    <div className="kart-header">
                        <div>
                            <div className="kart-title">Son Evrak Hareketleri</div>
                            <div className="kart-sub">Gerçek kayıtlardan son {SON_EVRAKLAR.length} evrak</div>
                        </div>

                        <button className="tumu-btn" onClick={() => navigate("/teslim-evraklari")}>
                            Tümünü gör <IconArrow />
                        </button>
                    </div>

                    <div className="evrak-liste">
                        {SON_EVRAKLAR.length === 0 && !loading ? (
                            <div className="empty-box">Kayıt bulunamadı.</div>
                        ) : (
                            SON_EVRAKLAR.map((e, index) => {
                                const d = DURUM_CONFIG[e.durum] || DURUM_CONFIG.beklemede;

                                return (
                                    <div className="evrak-row" key={`${e.no}-${index}`}>
                                        <div className="evrak-dot" style={{ background: d.dot }} />

                                        <div className="evrak-info">
                                            <div className="evrak-no">{e.no}</div>
                                            <div className="evrak-detail">
                                                {e.guzergah} · {e.surucu}
                                            </div>
                                        </div>

                                        <span className="evrak-status" style={{ background: d.bg, color: d.text }}>
                                            {d.label}
                                        </span>

                                        <span className="evrak-saat">{e.saat}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="kart">
                    <div className="kart-header">
                        <div>
                            <div className="kart-title">Evrak Durumu Dağılımı</div>
                            <div className="kart-sub">
                                Gerçek kayıt · {STATS.toplamSefer.toLocaleString("tr-TR")} sefer
                            </div>
                        </div>
                    </div>

                    <DonutChart
                        tamamlanan={STATS.tamamlananSefer}
                        devam={STATS.devamEdenSefer}
                        iptal={STATS.iptalIade}
                    />

                    <div className="legend">
                        {[
                            { label: "Teslim Edildi", color: "#16a34a", val: STATS.tamamlananSefer },
                            { label: "Devam Eden", color: "#2563eb", val: STATS.devamEdenSefer },
                            { label: "İptal / İade", color: "#dc2626", val: STATS.iptalIade },
                        ].map((item) => (
                            <div className="legend-row" key={item.label}>
                                <div className="legend-left">
                                    <span className="legend-dot" style={{ background: item.color }} />
                                    {item.label}
                                </div>

                                <span className="legend-val">{item.val.toLocaleString("tr-TR")}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="row-alt">
                <MiniStat
                    label="Bugün Gelen Kayıt"
                    mainText={`${STATS.bugunGelen} sefer`}
                    mutedText="bugün"
                    percent={Math.min(STATS.bugunGelen * 10, 100)}
                    color="#16a34a"
                />

                <MiniStat
                    label="Tamamlanma Oranı"
                    mainText={`%${tamamPct} başarı`}
                    mutedText={`${STATS.tamamlananSefer} sefer`}
                    percent={tamamPct}
                    color="#2563eb"
                />

                <MiniStat
                    label="Zamanında / Tamamlanan"
                    mainText={`%${STATS.zamanindaYuzde} başarı`}
                    mutedText={`${STATS.zamanindaSayi.toLocaleString("tr-TR")} sefer`}
                    percent={STATS.zamanindaYuzde}
                    color="#16a34a"
                />
            </div>
        </main>
    );
}

export default AnaSayfa;