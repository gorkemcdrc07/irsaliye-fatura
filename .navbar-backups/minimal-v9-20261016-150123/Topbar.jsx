import { useState } from "react";
import odakLogo from "./odak-navbar-logo.webp";
import odakRoad from "./odak-navbar-road.webp";
import { useLocation, useNavigate } from "react-router-dom";
import "./Topbar.css";

function getPermissions() {
    try {
        return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
        return [];
    }
}

const NAV_ITEMS = [
    {
        path: "/tedarik-analiz",
        label: "Tedarik Analiz",
        icon: "ti-chart-bar",
        perm: "tedarikAnaliz",
    },
    {
        path: "/teslim-evraklari",
        label: "Teslim Evrakları",
        icon: "ti-file-description",
        perm: "evrak",
    },
    {
        path: "/fatura",
        label: "Fatura",
        icon: "ti-receipt",
        perm: "fatura",
    },
    {
        path: "/karlilik",
        label: "Karlılık",
        icon: "ti-cash",
        perm: "karlilik",
    },
    {
        path: "/kullanici-yonetimi",
        label: "Kullanıcı Yönetimi",
        icon: "ti-users",
        perm: "admin",
    },
];

function Topbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const permissions = getPermissions();
    const kullaniciAdi = localStorage.getItem("kullaniciAdi") || "Kullanıcı";
    const role = localStorage.getItem("role") || "kullanici";

    const evrakYetkisiVar = permissions.includes("evrak");
    const faturaYetkisiVar = permissions.includes("fatura");
    const tedarikAnalizYetkisiVar = permissions.includes("tedarikAnaliz");
    const karlilikYetkisiVar = permissions.includes("karlilik");
    const adminYetkisiVar = role === "admin";

    const rolLabel = adminYetkisiVar
        ? "Sistem Yöneticisi"
        : [
            evrakYetkisiVar ? "Evrak" : null,
            faturaYetkisiVar ? "Fatura" : null,
            tedarikAnalizYetkisiVar ? "Tedarik Analiz" : null,
            karlilikYetkisiVar ? "Karlılık" : null,
        ]
            .filter(Boolean)
            .join(" & ") || "Yetkisiz";

    const avatar = kullaniciAdi.substring(0, 2).toUpperCase();

    const gorunurNavItems = NAV_ITEMS.filter((item) => {
        if (item.perm === "admin") return adminYetkisiVar;
        return permissions.includes(item.perm);
    });

    function cikisYap() {
        [
            "token",
            "tokenTime",
            "kullaniciAdi",
            "customerId",
            "permissions",
            "role",
        ].forEach((k) => localStorage.removeItem(k));

        navigate("/login", { replace: true });
    }

    function anaSayfayaGit() {
        if (evrakYetkisiVar) return navigate("/");
        if (tedarikAnalizYetkisiVar) return navigate("/tedarik-analiz");
        if (faturaYetkisiVar) return navigate("/fatura");
        if (karlilikYetkisiVar) return navigate("/karlilik");
        if (adminYetkisiVar) return navigate("/kullanici-yonetimi");

        navigate("/login", { replace: true });
    }

    return (
        <header className="topbar odak-navbar-v8">
            <div className="odak-navbar-visual" aria-hidden="true" style={{backgroundImage: `url(${odakRoad})`}} />
            <div className="odak-navbar-angles" aria-hidden="true" />
            <div className="odak-navbar-left">
                <button type="button" className="odak-menu-toggle" aria-label="Menüyü aç/kapat"
                    aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>
                    <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"}`} />
                </button>
                <div className="brand" onClick={anaSayfayaGit} role="button" tabIndex={0}
                    onKeyDown={e => (e.key === "Enter" || e.key === " ") && anaSayfayaGit()}>
                    <img src={odakLogo} className="odak-navbar-logo" alt="ODAK Lojistik" />
                    <span className="odak-navbar-brand-divider" aria-hidden="true" />
                    <div className="brand-text">
                        <span className="brand-name">Odak Tedarik Zinciri ve Lojistik A.Ş.</span>
                        <span className="brand-sub">Teslim Evrak Takip</span>
                    </div>
                </div>
            </div>
            <nav className={`nav-links odak-navbar-nav ${menuOpen ? "is-open" : ""}`} aria-label="Ana menü">
                {gorunurNavItems.map(item => (
                    <button key={item.path} type="button" className={`nav-btn ${location.pathname === item.path ? "active" : ""}`}
                        onClick={() => {setMenuOpen(false); navigate(item.path);}}>
                        <i className={`ti ${item.icon}`} aria-hidden="true" />{item.label}
                    </button>
                ))}
            </nav>
            <div className="top-actions odak-navbar-actions">
                <div className="user-box">
                    <span className="odak-user-square" aria-hidden="true" />
                    <div className="user-avatar">{avatar}</div>
                    <div className="user-info"><strong>{kullaniciAdi}</strong><span>{rolLabel}</span></div>
                    <i className="ti ti-chevron-down odak-user-chevron" aria-hidden="true" />
                </div>
                <span className="odak-navbar-right-divider" aria-hidden="true" />
                <button type="button" className="icon-btn odak-navbar-bell" aria-label="Bildirimler" title="Bildirimler">
                    <i className="ti ti-bell" />
                </button>
                <button className="logout-btn" onClick={cikisYap} aria-label="Çıkış yap">
                    <i className="ti ti-logout" /><span>Çıkış</span>
                </button>
            </div>
        </header>
    );
}

export default Topbar;