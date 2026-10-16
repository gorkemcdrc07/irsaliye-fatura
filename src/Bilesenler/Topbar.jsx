import { useEffect, useState } from "react";
import odakLogo from "./odak-navbar-logo.webp";
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

    // Ctrl+K: Teslim Evraklari sayfasindaki mevcut arama alanina odaklan.
    function focusPageSearch() {
        const search = document.querySelector('.teslim-page .filter-search input, .teslim-page input[placeholder*="Sefer"]');
        if (search) {
            search.focus();
            search.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            navigate("/teslim-evraklari");
        }
    }

    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                focusPageSearch();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [location.pathname]);

    const isHome = location.pathname === "/";

    return (
        <header className="topbar odak-navbar-v9">
            <div className="odak-navbar-left">
                <button type="button" className="odak-menu-toggle" aria-label="Menüyü aç/kapat"
                    aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>
                    <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"}`} />
                </button>
                <button type="button" className="odak-brand-button" onClick={anaSayfayaGit} aria-label="ODAK Lojistik ana sayfa">
                    <img src={odakLogo} className="odak-navbar-logo" alt="ODAK Lojistik" />
                </button>
            </div>

            <nav className={`odak-navbar-nav ${menuOpen ? "is-open" : ""}`} aria-label="Ana menü">
                {evrakYetkisiVar && (
                    <button type="button" className={`odak-nav-link ${isHome ? "active" : ""}`}
                        onClick={() => { setMenuOpen(false); navigate("/"); }}>
                        <i className="ti ti-home" aria-hidden="true" /><span>Ana Sayfa</span>
                    </button>
                )}
                {gorunurNavItems.map(item => (
                    <button key={item.path} type="button"
                        className={`odak-nav-link ${location.pathname === item.path ? "active" : ""}`}
                        onClick={() => { setMenuOpen(false); navigate(item.path); }}>
                        <i className={`ti ${item.icon}`} aria-hidden="true" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="odak-navbar-actions">
                <button type="button" className="odak-navbar-search" onClick={focusPageSearch}
                    title="Teslim Evrakları aramasına git (Ctrl + K)">
                    <i className="ti ti-search" aria-hidden="true" />
                    <span>Sefer, plaka, sürücü, irsaliye ara...</span>
                    <kbd>Ctrl + K</kbd>
                </button>
                <span className="odak-action-divider" aria-hidden="true" />
                <div className="odak-user-box" title={kullaniciAdi}>
                    <span className="odak-user-avatar">{avatar}</span>
                    <span className="odak-user-info"><strong>{kullaniciAdi}</strong><small>{rolLabel}</small></span>
                    <i className="ti ti-chevron-down" aria-hidden="true" />
                </div>
                <span className="odak-action-divider" aria-hidden="true" />
                <button type="button" className="odak-logout" onClick={cikisYap}>
                    <i className="ti ti-logout" aria-hidden="true" /><span>Çıkış</span>
                </button>
            </div>
        </header>
    );
}

export default Topbar;
