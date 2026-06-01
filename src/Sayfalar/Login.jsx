import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Login.css";

function Login() {
    const navigate = useNavigate();

    const [kullaniciAdi, setKullaniciAdi] = useState("");
    const [sifre, setSifre] = useState("");
    const [hata, setHata] = useState("");
    const [loading, setLoading] = useState(false);

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
                .select("id, user_name, password, customer_id, is_active, permissions")
                .eq("user_name", kullaniciAdi.trim())
                .eq("password", sifre.trim())
                .eq("is_active", true)
                .maybeSingle();

            console.log("LOGIN USER:", user);
            console.log("SUPABASE ERROR:", error);

            if (error) {
                throw new Error("Kullanıcı kontrolü yapılamadı.");
            }

            if (!user) {
                setHata("Kullanıcı adı veya şifre hatalı.");
                return;
            }

            localStorage.setItem("kullaniciAdi", user.user_name);
            localStorage.setItem("customerId", user.customer_id);
            localStorage.setItem("permissions", JSON.stringify(user.permissions || []));

            localStorage.setItem("token", "supabase-login");
            localStorage.setItem("tokenTime", Date.now().toString());

            const permissions = user.permissions || [];

            if (permissions.includes("evrak")) {
                navigate("/", { replace: true });
            } else if (permissions.includes("fatura")) {
                navigate("/fatura", { replace: true });
            } else {
                setHata("Bu kullanıcı için sayfa yetkisi tanımlanmamış.");
            }
        } catch (error) {
            console.error("LOGIN ERROR:", error);
            setHata("Giriş yapılamadı. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="login-page">
            <section className="login-card">
                <div className="login-brand">
                    <div className="login-mark">D</div>

                    <div>
                        <h1>DocuFleet</h1>
                        <span>Teslim Evrak Takip Sistemi</span>
                    </div>
                </div>

                <form onSubmit={girisYap} className="login-form">
                    <h2>Giriş Yap</h2>

                    {hata && <div className="error-box">{hata}</div>}

                    <div className="form-field">
                        <label>Kullanıcı Adı</label>
                        <input
                            type="text"
                            placeholder="Kullanıcı adı"
                            value={kullaniciAdi}
                            disabled={loading}
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
                            placeholder="Şifre"
                            value={sifre}
                            disabled={loading}
                            onChange={(e) => {
                                setSifre(e.target.value);
                                setHata("");
                            }}
                        />
                    </div>

                    <button className="login-btn" type="submit" disabled={loading}>
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>
            </section>
        </main>
    );
}

export default Login;