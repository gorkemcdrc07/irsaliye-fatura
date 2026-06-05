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

    const initials = user.user_name
        .split(/[._]/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("");

    return (
        <div className="auth-transition">
            <div className="at-inner">
                <div className="at-avatar">{initials}</div>
                <div className="at-name">{user.user_name}</div>
                <div className="at-role">
                    {user.role === "admin"
                        ? "Admin"
                        : user.permissions?.join(" · ") || "Kullanıcı"}
                </div>

                <div className="at-bar-wrap">
                    <div className="at-bar-fill" style={{ width: `${progress}%` }} />
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

        if (!kullaniciAdi.trim() || !sifre.trim()) {
            setHata("Kullanıcı adı ve şifre zorunludur.");
            return;
        }

        setLoading(true);

        try {
            const { data: user, error } = await supabase
                .from("users")
                .select("id, user_name, password, customer_id, is_active, permissions, role")
                .eq("user_name", kullaniciAdi.trim())
                .eq("password", sifre.trim())
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

            localStorage.setItem("kullaniciAdi", user.user_name);
            localStorage.setItem("customerId", user.customer_id || "");
            localStorage.setItem("permissions", JSON.stringify(user.permissions || []));
            localStorage.setItem("role", user.role || "kullanici");
            localStorage.setItem("token", "supabase-login");
            localStorage.setItem("tokenTime", Date.now().toString());

            setPhase("out");

            setTimeout(() => {
                setAuthedUser(user);
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

        if (role === "admin") {
            navigate("/kullanici-yonetimi", { replace: true });
        } else if (permissions.includes("evrak")) {
            navigate("/", { replace: true });
        } else if (permissions.includes("fatura")) {
            navigate("/fatura", { replace: true });
        } else {
            setAuthedUser(null);
            setPhase("login");
            setLoading(false);
            setHata("Bu kullanıcı için sayfa yetkisi tanımlanmamış.");
        }
    }

    if (phase === "auth" && authedUser) {
        return <AuthTransition user={authedUser} onComplete={handleAuthComplete} />;
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