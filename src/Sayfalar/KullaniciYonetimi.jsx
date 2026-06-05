import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import "./KullaniciYonetimi.css";

const TUM_YETKILER = [
    { key: "evrak", label: "Teslim Evrakları", icon: "ti-file-description" },
    { key: "fatura", label: "Faturalar", icon: "ti-receipt" },
    { key: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
    { key: "rapor", label: "Raporlar", icon: "ti-chart-bar" },
];

function bosForm() {
    return { userName: "", password: "", customerId: "", permissions: [] };
}

function Modal({ title, eyebrow, onClose, children }) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div className="modal-icon"><i className="ti ti-users" /></div>
                        <div>
                            <p className="modal-eyebrow">{eyebrow}</p>
                            <h2 className="modal-title">{title}</h2>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Kapat">
                        <i className="ti ti-x" />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}

function ConfirmModal({ message, onConfirm, onCancel, danger }) {
    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-icon" style={{ background: danger ? "#fef2f2" : "#eff6ff" }}>
                    <i className={danger ? "ti ti-alert-triangle" : "ti ti-info-circle"}
                        style={{ color: danger ? "#dc2626" : "#2563eb" }} />
                </div>
                <p className="confirm-message">{message}</p>
                <div className="confirm-actions">
                    <button className="btn-secondary" onClick={onCancel}>İptal</button>
                    <button
                        className={danger ? "btn-danger" : "btn-primary"}
                        onClick={onConfirm}
                    >
                        Onayla
                    </button>
                </div>
            </div>
        </div>
    );
}

function FormField({ label, icon, children }) {
    return (
        <div className="form-field">
            <label><i className={`ti ${icon}`} /> {label}</label>
            {children}
        </div>
    );
}

function YetkiSecici({ value, onChange }) {
    return (
        <div className="perm-grid">
            {TUM_YETKILER.map((y) => (
                <button
                    key={y.key}
                    type="button"
                    className={`perm-chip ${value.includes(y.key) ? "active" : ""}`}
                    onClick={() =>
                        onChange(
                            value.includes(y.key)
                                ? value.filter((p) => p !== y.key)
                                : [...value, y.key]
                        )
                    }
                >
                    <i className={`ti ${y.icon}`} />
                    {y.label}
                    {value.includes(y.key) && <i className="ti ti-check check-icon" />}
                </button>
            ))}
        </div>
    );
}

function KullaniciYonetimi() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(true);
    const [hata, setHata] = useState("");
    const [basari, setBasari] = useState("");

    const [eklemeAcik, setEklemeAcik] = useState(false);
    const [duzenleHedef, setDuzenleHedef] = useState(null);
    const [silOnay, setSilOnay] = useState(null);
    const [durumOnay, setDurumOnay] = useState(null);

    const [form, setForm] = useState(bosForm());
    const [arama, setArama] = useState("");
    const [durumFiltre, setDurumFiltre] = useState("tumu");

    async function kullanicilariGetir() {
        setTableLoading(true);
        const { data, error } = await supabase
            .from("users")
            .select("id, user_name, customer_id, is_active, permissions, created_at")
            .order("id", { ascending: false });
        if (!error) setUsers(data || []);
        setTableLoading(false);
    }

    useEffect(() => { kullanicilariGetir(); }, []);

    function mesajGoster(tip, metin) {
        if (tip === "hata") { setHata(metin); setBasari(""); }
        else { setBasari(metin); setHata(""); }
        setTimeout(() => { setHata(""); setBasari(""); }, 4000);
    }

    function formDegistir(alan, deger) {
        setForm((f) => ({ ...f, [alan]: deger }));
    }

    function modalKapat() {
        setEklemeAcik(false);
        setDuzenleHedef(null);
        setForm(bosForm());
        setHata("");
    }

    async function kullaniciEkle() {
        setHata("");
        if (!form.userName.trim() || !form.password.trim() || !form.customerId.trim()) {
            setHata("Kullanıcı adı, şifre ve Customer ID zorunludur.");
            return;
        }
        if (form.permissions.length === 0) {
            setHata("En az bir yetki seçmelisiniz.");
            return;
        }
        setLoading(true);
        const { error } = await supabase.from("users").insert({
            user_name: form.userName.trim(),
            password: form.password.trim(),
            customer_id: form.customerId.trim(),
            is_active: true,
            permissions: form.permissions,
        });
        setLoading(false);
        if (error) { setHata(error.message || "Kullanıcı eklenemedi."); return; }
        mesajGoster("basari", `"${form.userName.trim()}" kullanıcısı başarıyla eklendi.`);
        modalKapat();
        kullanicilariGetir();
    }

    async function kullaniciGuncelle() {
        setHata("");
        if (!form.userName.trim() || !form.customerId.trim()) {
            setHata("Kullanıcı adı ve Customer ID zorunludur.");
            return;
        }
        if (form.permissions.length === 0) {
            setHata("En az bir yetki seçmelisiniz.");
            return;
        }
        setLoading(true);
        const guncel = {
            user_name: form.userName.trim(),
            customer_id: form.customerId.trim(),
            permissions: form.permissions,
        };
        if (form.password.trim()) guncel.password = form.password.trim();

        const { error } = await supabase.from("users").update(guncel).eq("id", duzenleHedef.id);
        setLoading(false);
        if (error) { setHata(error.message || "Güncellenemedi."); return; }
        mesajGoster("basari", `"${form.userName.trim()}" kullanıcısı güncellendi.`);
        modalKapat();
        kullanicilariGetir();
    }

    async function kullaniciSil(user) {
        const { error } = await supabase.from("users").delete().eq("id", user.id);
        setSilOnay(null);
        if (error) { mesajGoster("hata", error.message || "Silinemedi."); return; }
        mesajGoster("basari", `"${user.user_name}" silindi.`);
        kullanicilariGetir();
    }

    async function durumDegistir(user) {
        const { error } = await supabase.from("users").update({ is_active: !user.is_active }).eq("id", user.id);
        setDurumOnay(null);
        if (error) { mesajGoster("hata", error.message || "Durum değiştirilemedi."); return; }
        mesajGoster("basari", `"${user.user_name}" ${!user.is_active ? "aktif" : "pasif"} yapıldı.`);
        kullanicilariGetir();
    }

    function duzenleAc(user) {
        setDuzenleHedef(user);
        setForm({
            userName: user.user_name,
            password: "",
            customerId: user.customer_id,
            permissions: Array.isArray(user.permissions) ? user.permissions : [],
        });
        setHata("");
    }

    const filtreliUsers = useMemo(() => {
        const q = arama.trim().toLocaleLowerCase("tr-TR");
        return users.filter((u) => {
            const durumUygun =
                durumFiltre === "tumu" ||
                (durumFiltre === "aktif" && u.is_active) ||
                (durumFiltre === "pasif" && !u.is_active);
            if (!durumUygun) return false;
            if (!q) return true;
            return (
                String(u.user_name).toLocaleLowerCase("tr-TR").includes(q) ||
                String(u.customer_id).toLocaleLowerCase("tr-TR").includes(q) ||
                String(u.id).includes(q)
            );
        });
    }, [users, arama, durumFiltre]);

    const istatistik = useMemo(() => ({
        toplam: users.length,
        aktif: users.filter((u) => u.is_active).length,
        pasif: users.filter((u) => !u.is_active).length,
    }), [users]);

    function formatTarih(tarih) {
        if (!tarih) return "-";
        return new Date(tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
    }

    const modalBaslik = duzenleHedef ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle";

    return (
        <main className="user-page">

            {/* ── Page Header ── */}
            <header className="page-header">
                <div className="page-header-left">
                    <div className="page-icon"><i className="ti ti-users" /></div>
                    <div>
                        <h1>Kullanıcı Yönetimi</h1>
                        <p>Kullanıcıları ekle, düzenle, yetkilendir ve durumlarını yönet</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => { setEklemeAcik(true); setForm(bosForm()); setHata(""); }}>
                    <i className="ti ti-plus" /> Yeni Kullanıcı
                </button>
            </header>

            {/* ── Global Toasts ── */}
            {hata && (
                <div className="toast toast-error">
                    <i className="ti ti-alert-circle" /> {hata}
                </div>
            )}
            {basari && (
                <div className="toast toast-success">
                    <i className="ti ti-circle-check" /> {basari}
                </div>
            )}

            {/* ── Stats ── */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><i className="ti ti-users" /></div>
                    <div>
                        <div className="stat-label">Toplam Kullanıcı</div>
                        <div className="stat-value">{istatistik.toplam}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}><i className="ti ti-user-check" /></div>
                    <div>
                        <div className="stat-label">Aktif</div>
                        <div className="stat-value">{istatistik.aktif}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><i className="ti ti-user-off" /></div>
                    <div>
                        <div className="stat-label">Pasif</div>
                        <div className="stat-value">{istatistik.pasif}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#fefce8", color: "#ca8a04" }}><i className="ti ti-shield-check" /></div>
                    <div>
                        <div className="stat-label">Toplam Yetki</div>
                        <div className="stat-value">{users.reduce((a, u) => a + (u.permissions?.length || 0), 0)}</div>
                    </div>
                </div>
            </div>

            {/* ── Table Card ── */}
            <section className="table-card">
                <div className="table-toolbar">
                    <div className="toolbar-left">
                        <h2>Kullanıcı Listesi</h2>
                        <span className="record-count">{filtreliUsers.length} / {users.length} kayıt</span>
                    </div>
                    <div className="toolbar-right">
                        <div className="search-wrap">
                            <i className="ti ti-search" />
                            <input
                                type="text"
                                placeholder="Ad, ID veya customer..."
                                value={arama}
                                onChange={(e) => setArama(e.target.value)}
                            />
                            {arama && (
                                <button className="clear-search" onClick={() => setArama("")}>
                                    <i className="ti ti-x" />
                                </button>
                            )}
                        </div>
                        <div className="filter-tabs">
                            {[["tumu", "Tümü"], ["aktif", "Aktif"], ["pasif", "Pasif"]].map(([val, lbl]) => (
                                <button
                                    key={val}
                                    className={`filter-tab ${durumFiltre === val ? "active" : ""}`}
                                    onClick={() => setDurumFiltre(val)}
                                >
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="table-scroll">
                    {tableLoading ? (
                        <div className="table-loading">
                            <div className="spinner" />
                            <span>Kullanıcılar yükleniyor...</span>
                        </div>
                    ) : filtreliUsers.length === 0 ? (
                        <div className="empty-state">
                            <i className="ti ti-users-off" />
                            <strong>Kullanıcı bulunamadı</strong>
                            <span>Arama kriterlerini değiştirin veya yeni kullanıcı ekleyin.</span>
                        </div>
                    ) : (
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Kullanıcı</th>
                                    <th>Customer ID</th>
                                    <th>Yetkiler</th>
                                    <th>Kayıt Tarihi</th>
                                    <th>Durum</th>
                                    <th className="col-actions">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtreliUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td className="cell-id">{u.id}</td>
                                        <td>
                                            <div className="user-cell">
                                                <div className="avatar">
                                                    {String(u.user_name).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="cell-primary">{u.user_name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="cell-mono">{u.customer_id}</span></td>
                                        <td>
                                            <div className="perm-tags">
                                                {Array.isArray(u.permissions) && u.permissions.length > 0
                                                    ? u.permissions.map((p) => {
                                                        const y = TUM_YETKILER.find((t) => t.key === p);
                                                        return (
                                                            <span key={p} className="perm-tag">
                                                                {y ? <i className={`ti ${y.icon}`} /> : null}
                                                                {y ? y.label : p}
                                                            </span>
                                                        );
                                                    })
                                                    : <span className="no-perm">Yok</span>}
                                            </div>
                                        </td>
                                        <td><span className="cell-date">{formatTarih(u.created_at)}</span></td>
                                        <td>
                                            <span className={`status-badge ${u.is_active ? "active" : "passive"}`}>
                                                <span className="status-dot" />
                                                {u.is_active ? "Aktif" : "Pasif"}
                                            </span>
                                        </td>
                                        <td className="col-actions">
                                            <div className="action-btns">
                                                <button
                                                    className="action-btn edit"
                                                    title="Düzenle"
                                                    onClick={() => duzenleAc(u)}
                                                >
                                                    <i className="ti ti-edit" />
                                                </button>
                                                <button
                                                    className={`action-btn ${u.is_active ? "deactivate" : "activate"}`}
                                                    title={u.is_active ? "Pasife Al" : "Aktif Et"}
                                                    onClick={() => setDurumOnay(u)}
                                                >
                                                    <i className={`ti ${u.is_active ? "ti-user-off" : "ti-user-check"}`} />
                                                </button>
                                                <button
                                                    className="action-btn delete"
                                                    title="Sil"
                                                    onClick={() => setSilOnay(u)}
                                                >
                                                    <i className="ti ti-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* ── Add / Edit Modal ── */}
            {(eklemeAcik || duzenleHedef) && (
                <Modal title={modalBaslik} eyebrow="Kullanıcı Formu" onClose={modalKapat}>
                    {hata && (
                        <div className="form-error">
                            <i className="ti ti-alert-circle" /> {hata}
                        </div>
                    )}

                    <div className="form-grid">
                        <FormField label="Kullanıcı Adı" icon="ti-user">
                            <input
                                value={form.userName}
                                onChange={(e) => formDegistir("userName", e.target.value)}
                                placeholder="Örn: GoldHarvest"
                            />
                        </FormField>
                        <FormField label={duzenleHedef ? "Yeni Şifre (boş bırakılabilir)" : "Şifre"} icon="ti-lock">
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => formDegistir("password", e.target.value)}
                                placeholder={duzenleHedef ? "Değiştirmek için doldurun" : "Şifre"}
                            />
                        </FormField>
                        <FormField label="Customer ID" icon="ti-hash">
                            <input
                                value={form.customerId}
                                onChange={(e) => formDegistir("customerId", e.target.value)}
                                placeholder="Örn: 29679"
                            />
                        </FormField>
                    </div>

                    <div className="form-section">
                        <label className="section-label"><i className="ti ti-shield" /> Yetkiler</label>
                        <YetkiSecici
                            value={form.permissions}
                            onChange={(p) => formDegistir("permissions", p)}
                        />
                    </div>

                    <div className="modal-footer">
                        <button className="btn-secondary" onClick={modalKapat}>İptal</button>
                        <button
                            className="btn-primary"
                            onClick={duzenleHedef ? kullaniciGuncelle : kullaniciEkle}
                            disabled={loading}
                        >
                            {loading
                                ? <><i className="ti ti-loader-2 spin" /> İşleniyor...</>
                                : duzenleHedef
                                    ? <><i className="ti ti-check" /> Kaydet</>
                                    : <><i className="ti ti-plus" /> Kullanıcı Ekle</>
                            }
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Delete Confirm ── */}
            {silOnay && (
                <ConfirmModal
                    message={`"${silOnay.user_name}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz?`}
                    danger
                    onConfirm={() => kullaniciSil(silOnay)}
                    onCancel={() => setSilOnay(null)}
                />
            )}

            {/* ── Status Confirm ── */}
            {durumOnay && (
                <ConfirmModal
                    message={`"${durumOnay.user_name}" kullanıcısı ${durumOnay.is_active ? "pasife alınacak" : "aktif edilecek"}. Devam edilsin mi?`}
                    danger={durumOnay.is_active}
                    onConfirm={() => durumDegistir(durumOnay)}
                    onCancel={() => setDurumOnay(null)}
                />
            )}
        </main>
    );
}

export default KullaniciYonetimi;