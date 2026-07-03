import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Login.css";

const AUTH_MESSAGES = [
    "Kimlik doğrulanıyor...",
    "Yetkiler kontrol ediliyor...",
    "Oturum başlatılıyor...",
    "Yönlendiriliyor...",
];

function normalizeValue(value) {
    return String(value || "")
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("İ", "i");
}

function yetkiVar(permissions, ...keys) {
    const temizYetkiler = (permissions || []).map(normalizeValue);
    return keys.some((key) => temizYetkiler.includes(normalizeValue(key)));
}

function getDefaultPath(role, permissions) {
    const temizRole = normalizeValue(role || "kullanici");

    if (temizRole === "admin") return "/kullanici-yonetimi";

    if (
        yetkiVar(
            permissions,
            "tedarik_analiz",
            "tedarik",
            "tedarik-analiz",
            "tedarikAnaliz"
        )
    ) {
        return "/tedarik-analiz";
    }

    if (yetkiVar(permissions, "evrak")) return "/teslim-evraklari";
    if (yetkiVar(permissions, "fatura")) return "/fatura";
    if (yetkiVar(permissions, "karlilik", "karlılık")) return "/karlilik";

    return null;
}

function AuthTransition({ user, onComplete }) {
    const [progress, setProgress] = useState(0);
    const [msgIndex, setMsgIndex] = useState(0);
    const [msgVisible, setMsgVisible] = useState(true);
    const intervalRef = useRef(null);

    useEffect(() => {
        let pct = 0;
        let mi = 0;

        intervalRef.current = setInterval(() => {
            pct += 1.8;
            setProgress(Math.min(pct, 100));

            const ni = Math.floor((pct / 100) * AUTH_MESSAGES.length);

            if (ni !== mi && ni < AUTH_MESSAGES.length) {
                mi = ni;
                setMsgVisible(false);

                setTimeout(() => {
                    setMsgIndex(mi);
                    setMsgVisible(true);
                }, 160);
            }

            if (pct >= 100) {
                clearInterval(intervalRef.current);
                setTimeout(() => onComplete(), 400);
            }
        }, 20);

        return () => clearInterval(intervalRef.current);
    }, [onComplete]);

    const initials = String(user?.user_name || "K")
        .split(/[._\s]/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("");

    return (
        <div className="auth-transition">
            <div className="at-inner">
                <div className="at-avatar">{initials}</div>

                <div className="at-name">{user.user_name}</div>

                <div className="at-role">
                    {normalizeValue(user.role) === "admin"
                        ? "Admin"
                        : user.permissions?.join(" · ") || "Kullanıcı"}
                </div>

                <div className="at-bar-wrap">
                    <div
                        className="at-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className={`at-msg ${msgVisible ? "visible" : ""}`}>
                    {AUTH_MESSAGES[msgIndex]}
                </div>
            </div>
        </div>
    );
}

function Login() {
    const navigate = useNavigate();

    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [sifre, setSifre] = useState("");
    const [hata, setHata] = useState("");
    const [loading, setLoading] = useState(false);
    const [authedUser, setAuthedUser] = useState(null);
    const [phase, setPhase] = useState("login");

    async function girisYap(e) {
        e.preventDefault();
        setHata("");

        const temizKullaniciAdi = kullaniciAdi.trim();
        const temizSifre = sifre.trim();

        if (!temizKullaniciAdi || !temizSifre) {
            setHata("Kullanıcı adı ve şifre zorunludur.");
            return;
        }

        setLoading(true);

        try {
            const { data: user, error } = await supabase
                .from("users")
                .select(
                    "id, user_name, password, customer_id, is_active, permissions, role, customer_order_no_rule"
                )
                .eq("user_name", temizKullaniciAdi)
                .eq("password", temizSifre)
                .eq("is_active", true)
                .maybeSingle();

            if (error) {
                throw new Error("Kullanıcı kontrolü yapılamadı.");
            }

            if (!user) {
                setHata("Kullanıcı adı veya şifre hatalı.");
                setLoading(false);
                return;
            }

            const permissions = Array.isArray(user.permissions)
                ? user.permissions
                : [];

            const role = user.role || "kullanici";

            const userForState = {
                ...user,
                permissions,
                role,
            };

            localStorage.setItem("kullaniciAdi", user.user_name || "");
            localStorage.setItem("customerId", String(user.customer_id || ""));
            localStorage.setItem("permissions", JSON.stringify(permissions));
            localStorage.setItem("role", role);
            localStorage.setItem("loginUser", JSON.stringify(userForState));
            localStorage.setItem(
                "customerOrderNoRule",
                String(user.customer_order_no_rule === true)
            );
            localStorage.setItem("token", "supabase-login");
            localStorage.setItem("tokenTime", Date.now().toString());

            console.log("LOGIN USER:", userForState);
            console.log("PERMISSIONS:", permissions);
            console.log("ROLE:", role);
            console.log("DEFAULT PATH:", getDefaultPath(role, permissions));

            setPhase("out");

            setTimeout(() => {
                setAuthedUser(userForState);
                setPhase("auth");
            }, 320);
        } catch (err) {
            console.error("LOGIN ERROR:", err);
            setHata("Giriş yapılamadı. Lütfen tekrar deneyin.");
            setLoading(false);
        }
    }

    function handleAuthComplete() {
        const permissions = authedUser?.permissions || [];
        const role = authedUser?.role || "kullanici";

        const path = getDefaultPath(role, permissions);

        if (path) {
            navigate(path, { replace: true });
            return;
        }

        setAuthedUser(null);
        setPhase("login");
        setLoading(false);
        setHata("Bu kullanıcı için sayfa yetkisi tanımlanmamış.");
    }

    if (phase === "auth" && authedUser) {
        return (
            <AuthTransition
                user={authedUser}
                onComplete={handleAuthComplete}
            />
        );
    }

    return (
        <main className={`login-page ${phase === "out" ? "page-out" : "page-in"}`}>
            <section className="brand-panel">
                <div className="brand-bg" />

                <div className="brand-content">
                    <div>
                        <h2>Odak Lojistik</h2>
                        <p>Evrak takip ve operasyon yönetim paneli</p>
                    </div>
                </div>

                <div className="brand-footer">
                    <span className="status-dot" />
                    Sistem aktif
                    <span>v2.4.1 · 2026</span>
                </div>
            </section>

            <section className="login-main">
                <div className="login-card">
                    <div className="section-label">Kimlik Doğrulama</div>

                    <h1 className="login-title">Sisteme Giriş</h1>

                    <p className="login-desc">
                        Yetkili kullanıcı hesabınızla giriş yapınız.
                    </p>

                    <form onSubmit={girisYap} className="login-form" noValidate>
                        {hata && <div className="error-box">{hata}</div>}

                        <div className="form-field">
                            <label>Kullanıcı Adı</label>
                            <input
                                type="text"
                                value={kullaniciAdi}
                                disabled={loading}
                                autoComplete="username"
                                onChange={(e) => {
                                    setKullaniciAdi(e.target.value);
                                    setHata("");
                                }}
                            />
                        </div>

                        <div className="form-field">
                            <label>Şifre</label>
                            <input
                                type="password"
                                value={sifre}
                                disabled={loading}
                                autoComplete="current-password"
                                onChange={(e) => {
                                    setSifre(e.target.value);
                                    setHata("");
                                }}
                            />
                        </div>

                        <button className="login-btn" type="submit" disabled={loading}>
                            {loading ? "Doğrulanıyor..." : "Giriş Yap"}
                        </button>
                    </form>

                    <div className="login-divider" />

                    <div className="login-meta">
                        <span>SSL şifreli bağlantı</span>
                        <span>Şifrenizi mi unuttunuz?</span>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Login;