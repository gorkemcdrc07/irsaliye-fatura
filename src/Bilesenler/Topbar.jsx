import { useLocation, useNavigate } from "react-router-dom";
import "./Topbar.css";

function getPermissions() {
    try {
        return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
        return [];
    }
}

function Topbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const permissions = getPermissions();
    const kullaniciAdi = localStorage.getItem("kullaniciAdi") || "Kullanıcı";

    const evrakYetkisiVar = permissions.includes("evrak");
    const faturaYetkisiVar = permissions.includes("fatura");

    const kullanici = {
        adSoyad: kullaniciAdi,
        rol:
            evrakYetkisiVar && faturaYetkisiVar
                ? "Evrak ve Fatura Kullanıcısı"
                : evrakYetkisiVar
                    ? "Evrak Kullanıcısı"
                    : faturaYetkisiVar
                        ? "Fatura Kullanıcısı"
                        : "Yetkisiz Kullanıcı",
        avatar: kullaniciAdi.substring(0, 2).toUpperCase(),
    };

    function cikisYap() {
        localStorage.removeItem("token");
        localStorage.removeItem("tokenTime");
        localStorage.removeItem("kullaniciAdi");
        localStorage.removeItem("customerId");
        localStorage.removeItem("permissions");

        navigate("/login", { replace: true });
    }

    function anaSayfayaGit() {
        if (evrakYetkisiVar) {
            navigate("/");
            return;
        }

        if (faturaYetkisiVar) {
            navigate("/fatura");
            return;
        }

        navigate("/login", { replace: true });
    }

    return (
        <header className="topbar">
            <div className="brand" onClick={anaSayfayaGit}>
                <div className="brand-mark">D</div>

                <div>
                    <h2>DocuFleet</h2>
                    <span>Teslim Evrak Takip Sistemi</span>
                </div>
            </div>

            <nav className="nav-links">
                {evrakYetkisiVar && (
                    <>
                        <button
                            className={location.pathname === "/" ? "active" : ""}
                            onClick={() => navigate("/")}
                        >
                            Ana Sayfa
                        </button>

                        <button
                            className={
                                location.pathname === "/teslim-evraklari"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => navigate("/teslim-evraklari")}
                        >
                            Teslim Evrakları
                        </button>
                    </>
                )}

                {faturaYetkisiVar && (
                    <button
                        className={location.pathname === "/fatura" ? "active" : ""}
                        onClick={() => navigate("/fatura")}
                    >
                        Fatura
                    </button>
                )}
            </nav>

            <div className="top-actions">
                <button className="icon-btn" aria-label="Bildirimler">
                    🔔
                </button>

                <div className="user-box">
                    <div className="avatar">{kullanici.avatar}</div>

                    <div className="user-info">
                        <strong>{kullanici.adSoyad}</strong>
                        <span>{kullanici.rol}</span>
                    </div>
                </div>

                <button className="logout-btn" onClick={cikisYap}>
                    Çıkış Yap
                </button>
            </div>
        </header>
    );
}

export default Topbar;