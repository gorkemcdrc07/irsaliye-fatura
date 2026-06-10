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
    { path: "/", label: "Ana Sayfa", icon: "ti-layout-dashboard", perm: "evrak" },
    { path: "/tedarik-analiz", label: "Tedarik Analiz", icon: "ti-chart-bar", perm: "tedarikAnaliz" },
    { path: "/teslim-evraklari", label: "Teslim Evrakları", icon: "ti-file-description", perm: "evrak" },
    { path: "/fatura", label: "Fatura", icon: "ti-receipt", perm: "fatura" },
    { path: "/kullanici-yonetimi", label: "Kullanıcı Yönetimi", icon: "ti-users", perm: "admin" },
];

function Topbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const permissions = getPermissions();
    const kullaniciAdi = localStorage.getItem("kullaniciAdi") || "Kullanıcı";
    const role = localStorage.getItem("role") || "kullanici";

    const evrakYetkisiVar = permissions.includes("evrak");
    const faturaYetkisiVar = permissions.includes("fatura");
    const tedarikAnalizYetkisiVar = permissions.includes("tedarikAnaliz");
    const adminYetkisiVar = role === "admin";

    const rolLabel = adminYetkisiVar
        ? "Sistem Yöneticisi"
        : [
            evrakYetkisiVar ? "Evrak" : null,
            faturaYetkisiVar ? "Fatura" : null,
            tedarikAnalizYetkisiVar ? "Tedarik Analiz" : null,
        ].filter(Boolean).join(" & ") || "Yetkisiz";

    const avatar = kullaniciAdi.substring(0, 2).toUpperCase();

    const gorunurNavItems = NAV_ITEMS.filter((item) => {
        if (item.perm === "admin") return adminYetkisiVar;
        return permissions.includes(item.perm);
    });

    function cikisYap() {
        ["token", "tokenTime", "kullaniciAdi", "customerId", "permissions", "role"].forEach(
            (k) => localStorage.removeItem(k)
        );
        navigate("/login", { replace: true });
    }

    function anaSayfayaGit() {
        if (evrakYetkisiVar) return navigate("/");
        if (tedarikAnalizYetkisiVar) return navigate("/tedarik-analiz");
        if (faturaYetkisiVar) return navigate("/fatura");
        if (adminYetkisiVar) return navigate("/kullanici-yonetimi");
        navigate("/login", { replace: true });
    }

    return (
        <header className="topbar">
            <div
                className="brand"
                onClick={anaSayfayaGit}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && anaSayfayaGit()}
            >
                <div className="brand-mark">
                    <i className="ti ti-truck-delivery" />
                </div>

                <div className="brand-text">
                    <span className="brand-name">Odak Tedarik Zinciri ve Lojistik A.Ş.</span>
                    <span className="brand-sub">Teslim Evrak Takip</span>
                </div>
            </div>

            <nav className="nav-links" aria-label="Ana menü">
                {gorunurNavItems.map((item) => (
                    <button
                        key={item.path}
                        className={`nav-btn ${location.pathname === item.path ? "active" : ""}`}
                        onClick={() => navigate(item.path)}
                    >
                        <i className={`ti ${item.icon}`} aria-hidden="true" />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="top-actions">
                <button className="icon-btn" aria-label="Bildirimler">
                    <i className="ti ti-bell" />
                </button>

                <div className="user-box">
                    <div className="user-avatar">{avatar}</div>
                    <div className="user-info">
                        <strong>{kullaniciAdi}</strong>
                        <span>{rolLabel}</span>
                    </div>
                </div>

                <button className="logout-btn" onClick={cikisYap} aria-label="Çıkış yap">
                    <i className="ti ti-logout" />
                    <span>Çıkış</span>
                </button>
            </div>
        </header>
    );
}

export default Topbar;