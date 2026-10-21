import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import "./KullaniciYonetimi.css";

const TUM_YETKILER = [
    {
        key: "evrak",
        label: "Teslim Evrakları",
        icon: "ti-file-description",
    },
    {
        key: "fatura",
        label: "Faturalar",
        icon: "ti-receipt",
    },
    {
        key: "tedarikAnaliz",
        label: "Tedarik Analiz",
        icon: "ti-chart-bar",
    },
    {
        key: "karlilik",
        label: "Karlılık",
        icon: "ti-cash",
    },
];
function bosForm() {
    return { userName: "", password: "", customerId: "", permissions: [], role: "kullanici", projectNames: [] };
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
    const [projeSecenekleri, setProjeSecenekleri] = useState([]);
    const [projeYukleniyor, setProjeYukleniyor] = useState(false);
    const [projeHatasi, setProjeHatasi] = useState("");
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
    const [sayfa, setSayfa] = useState(1);
    const [sayfaBoyutu, setSayfaBoyutu] = useState(10);
    const [siralama, setSiralama] = useState({ alan: "id", yon: "desc" });
    const siralaDegistir = (alan) => {
        setSiralama(prev => ({ alan, yon: prev.alan === alan && prev.yon === "asc" ? "desc" : "asc" }));
        setSayfa(1);
    };

    async function kullanicilariGetir() {
        setTableLoading(true);
        const { data, error } = await supabase
            .from("users")
            .select("id, user_name, customer_id, is_active, permissions, customer_order_no_rule, role, created_at, allowed_project_names")
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
            customer_order_no_rule: form.permissions.includes("musteriSiparisNo"),
            role: form.role,
            allowed_project_names: form.projectNames,
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
            customer_order_no_rule: form.permissions.includes("musteriSiparisNo"),
            role: form.role,
            allowed_project_names: form.projectNames,
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
            role: user.role === "admin" ? "admin" : "kullanici",
            projectNames: Array.isArray(user.allowed_project_names) ? user.allowed_project_names : [],
        });
        setHata("");
        projeleriGetir(user.customer_id);
    }

    // Proje isimlerini müşterinin mevcut teslim evrakı API yanıtından al.
    async function projeleriGetir(customerId) {
        setProjeSecenekleri([]);
        setProjeHatasi("");
        if (!String(customerId || "").trim()) return;
        setProjeYukleniyor(true);
        try {
            const apiIstek = async (url, body) => {
                const response = await fetch(`${import.meta.env.DEV ? "" : import.meta.env.VITE_SHO_API_BASE_URL}${url}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || "supabase-login"}` }, body: JSON.stringify(body) });
                if (!response.ok) throw new Error(`Proje API hatası: ${response.status}`);
                return response.json();
            };
            const end = new Date();
            const start = new Date(end); start.setFullYear(start.getFullYear() - 1);
            const date = d => d.toISOString().slice(0, 10);
            const result = await apiIstek("/odak-api/api/tmsdespatchdocuments/getall", { startDate: date(start), endDate: date(end), customerId: Number(customerId), vehicleId: 0, driverId: 0 });
            const items = Array.isArray(result) ? result : result?.data || result?.items || result?.result || [];
            setProjeSecenekleri([...new Set(items.map(x => String(x.ProjectName ?? x.projectName ?? x.projectname ?? "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, "tr")));
        } catch (err) { setProjeHatasi(err.message || "Projeler alınamadı"); }
        finally { setProjeYukleniyor(false); }
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

    useEffect(() => { setSayfa(1); }, [arama, durumFiltre, sayfaBoyutu]);
    const siraliUsers = useMemo(() => [...filtreliUsers].sort((a, b) => {
        const x = a[siralama.alan] ?? "";
        const y = b[siralama.alan] ?? "";
        const sonuc = typeof x === "number" && typeof y === "number"
            ? x - y : String(x).localeCompare(String(y), "tr-TR", { numeric: true });
        return siralama.yon === "asc" ? sonuc : -sonuc;
    }), [filtreliUsers, siralama]);
    const sayfaSayisi = Math.max(1, Math.ceil(siraliUsers.length / sayfaBoyutu));
    const gecerliSayfa = Math.min(sayfa, sayfaSayisi);
    const sayfadakiUsers = siraliUsers.slice((gecerliSayfa - 1) * sayfaBoyutu, gecerliSayfa * sayfaBoyutu);
    const istatistik = useMemo(() => ({
        toplam: users.length,
        aktif: users.filter((u) => u.is_active).length,
        pasif: users.filter((u) => !u.is_active).length,
    }), [users]);

    function formatTarih(tarih) {
        if (!tarih) return "-";
        return new Date(tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
    }

    const [yetkiFiltre, setYetkiFiltre] = useState('tumu');
    const [gorunumSiralamasi, setGorunumSiralamasi] = useState('yeni');
    const [gorunum, setGorunum] = useState('tablo');
    const gorunenUsers = [...filtreliUsers].filter(u => yetkiFiltre === 'tumu' || (u.permissions || []).includes(yetkiFiltre)).sort((a,b) => siralama === 'eski' ? new Date(a.created_at || 0) - new Date(b.created_at || 0) : new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const modalBaslik = duzenleHedef ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle";

    return (
        <main className="user-page odak-users-v1 premium-users">

            {/* ── Page Header ── */}
            <header className="page-header">
                <div className="page-header-left">
                    <div className="page-icon"><i className="ti ti-users" /></div>
                    <div>
                        <h1>Kullanıcı Yönetimi</h1>
                        <p>Kullanıcıları ekle, düzenle, yetkilendir ve durumlarını yönet</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => { setEklemeAcik(true); setForm(bosForm()); setProjeSecenekleri([]); setHata(""); }}>
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
                        <div className="stat-value">{istatistik.toplam}</div><small>Tüm kullanıcılar</small>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}><i className="ti ti-user-check" /></div>
                    <div>
                        <div className="stat-label">Aktif</div>
                        <div className="stat-value">{istatistik.aktif}</div><small>Sistemde aktif</small>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><i className="ti ti-user-off" /></div>
                    <div>
                        <div className="stat-label">Pasif</div>
                        <div className="stat-value">{istatistik.pasif}</div><small>Pasif hesaplar</small>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#fefce8", color: "#ca8a04" }}><i className="ti ti-shield-check" /></div>
                    <div>
                        <div className="stat-label">Toplam Yetki</div>
                        <div className="stat-value">{users.reduce((a, u) => a + (u.permissions?.length || 0), 0)}</div><small>Atanan yetki</small>
                    </div>
                </div>
            </div>

            {/* ── Table Card ── */}
            <section className="table-card">
                <div className="premium-filters">
                    <div className="search-wrap"><i className="ti ti-search" /><input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Ad, kullanıcı adı, müşteri no veya yetki ile ara..." />{arama && <button className="clear-search" onClick={()=>setArama('')}><i className="ti ti-x" /></button>}</div>
                    <label className="premium-select"><i className="ti ti-circle-check" /><select value={durumFiltre} onChange={e=>{setDurumFiltre(e.target.value);setSayfa(1)}}><option value="tumu">Tüm Durumlar</option><option value="aktif">Aktif</option><option value="pasif">Pasif</option></select><i className="ti ti-chevron-down" /></label>
                    <label className="premium-select"><i className="ti ti-lock" /><select value={yetkiFiltre} onChange={e=>{setYetkiFiltre(e.target.value);setSayfa(1)}}><option value="tumu">Tüm Yetkiler</option>{TUM_YETKILER.map(y=><option key={y.key} value={y.key}>{y.label}</option>)}</select><i className="ti ti-chevron-down" /></label>
                    <label className="premium-select"><i className="ti ti-calendar" /><select value={gorunumSiralamasi} onChange={e=>setSiralama(e.target.value)}><option value="yeni">Kayıt Tarihi (Yeni → Eski)</option><option value="eski">Kayıt Tarihi (Eski → Yeni)</option></select><i className="ti ti-chevron-down" /></label>
                    <button className="premium-reset" onClick={()=>{setArama('');setDurumFiltre('tumu');setYetkiFiltre('tumu');setSiralama('yeni');setSayfa(1)}}><i className="ti ti-refresh" /> Filtreleri Temizle</button>
                </div>
                <div className="table-toolbar premium-toolbar"><div className="toolbar-left"><span className="list-icon"><i className="ti ti-user" /></span><h2>Kullanıcı Listesi</h2><span className="record-count">{gorunenUsers.length} / {users.length} kayıt</span></div><div className="view-toggle"><button className={gorunum==='tablo'?'selected':''} onClick={()=>setGorunum('tablo')}><i className="ti ti-table" /> Tablo</button><button className={gorunum==='kart'?'selected':''} onClick={()=>setGorunum('kart')}><i className="ti ti-layout-grid" /> Kart</button></div></div>
                <div className={`table-scroll ${gorunum === "kart" ? "card-mode" : ""}`}>
                    {tableLoading ? (
                        <div className="table-loading">
                            <div className="spinner" />
                            <span>Kullanıcılar yükleniyor...</span>
                        </div>
                    ) : gorunenUsers.length === 0 ? (
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
                                    <th>Müşteri Sipariş No</th>
                                    <th>Kayıt Tarihi</th>
                                    <th>Durum</th>
                                    <th className="col-actions">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sayfadakiUsers.map((u) => (
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
                                        <td>
                                            <span className={`status-badge ${u.customer_order_no_rule ? "active" : "passive"}`}>
                                                <span className="status-dot" />
                                                {u.customer_order_no_rule ? "Aktif" : "Pasif"}
                                            </span>
                                        </td>

                                        <td><span className="cell-date"><i className="ti ti-calendar-event" aria-hidden="true" /> {formatTarih(u.created_at)}</span></td>
                                        <td>
                                            <span className={`status-badge ${u.is_active ? "active" : "passive"}`}>
                                                <span className="status-dot" />
                                                {u.is_active ? "Aktif" : "Pasif"}
                                            </span>
                                        </td>
                                        <td className="col-actions">
                                            <div className="action-btns">
                                                <button type="button" className="action-btn edit" aria-label={`${u.user_name} düzenle`}
                                                    title="Düzenle" onClick={() => duzenleAc(u)}>
                                                    <i className="ti ti-pencil" />
                                                </button>
                                                <button type="button" className="action-btn delete" aria-label={`${u.user_name} sil`}
                                                    title="Sil" onClick={() => setSilOnay(u)}>
                                                    <i className="ti ti-trash" />
                                                </button>
                                                <button type="button" className={`action-btn ${u.is_active ? "deactivate" : "activate"}`}
                                                    aria-label={`${u.user_name} ${u.is_active ? "pasife al" : "aktif et"}`}
                                                    title={u.is_active ? "Pasife Al" : "Aktif Et"} onClick={() => setDurumOnay(u)}>
                                                    <i className={`ti ${u.is_active ? "ti-player-pause-filled" : "ti-player-play-filled"}`} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="odak-pagination">
                    <div className="odak-page-size">
                        <select aria-label="Sayfa başına kayıt" value={sayfaBoyutu}
                            onChange={e => setSayfaBoyutu(Number(e.target.value))}>
                            <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                        </select>
                        <span>kayıt gösteriliyor · {gorunenUsers.length} sonuç</span>
                    </div>
                    <div className="odak-page-buttons">
                        <button type="button" aria-label="Önceki sayfa" disabled={gecerliSayfa === 1}
                            onClick={() => setSayfa(p => Math.max(1, p - 1))}><i className="ti ti-chevron-left" /></button>
                        {Array.from({ length: sayfaSayisi }, (_, i) => i + 1)
                            .filter(n => sayfaSayisi <= 7 || Math.abs(n - gecerliSayfa) <= 2 || n === 1 || n === sayfaSayisi)
                            .map(n => <button type="button" key={n} className={gecerliSayfa === n ? "active" : ""}
                                onClick={() => setSayfa(n)}>{n}</button>)}
                        <button type="button" aria-label="Sonraki sayfa" disabled={gecerliSayfa === sayfaSayisi}
                            onClick={() => setSayfa(p => Math.min(sayfaSayisi, p + 1))}><i className="ti ti-chevron-right" /></button>
                    </div>
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

                    <div className="form-section odak-project-permissions">
                        <label className="section-label"><i className="ti ti-folders" /> Teslim Evrakları · Proje Görünürlüğü</label>
                        <p>Hiç proje seçilmezse müşterinin tüm projeleri görünür.</p>
                        <button type="button" className="btn-secondary" disabled={projeYukleniyor || !form.customerId.trim()} onClick={() => projeleriGetir(form.customerId)}>{projeYukleniyor ? "Projeler yükleniyor..." : "Müşterinin projelerini getir / yenile"}</button>
                        {projeHatasi && <p className="form-error">{projeHatasi}</p>}
                        <div className="odak-project-options">
                            {[...new Set([...projeSecenekleri, ...form.projectNames])].map(name => <label key={name} className="rule-check"><input type="checkbox" checked={form.projectNames.includes(name)} onChange={ev => formDegistir("projectNames", ev.target.checked ? [...form.projectNames, name] : form.projectNames.filter(x => x !== name))} /> {name}</label>)}
                        </div>
                        {form.projectNames.length > 0 && <button type="button" className="btn-secondary" onClick={() => formDegistir("projectNames", [])}>Seçimi temizle (tüm projeler)</button>}
                    </div>
                    <div className="odak-admin-role"><div><strong>Hesap Rolü</strong><small>Admin yetkisini yalnızca yetkili kişilere verin.</small></div><select value={form.role} onChange={e => formDegistir("role",e.target.value)}><option value="kullanici">Standart Kullanıcı</option><option value="admin">Admin</option></select></div>
                    <div className="form-section">
                        <label className="section-label"><i className="ti ti-shield" /> Yetkiler</label>
                        <YetkiSecici
                            value={form.permissions}
                            onChange={(p) => formDegistir("permissions", p)}
                        />
                    </div>
                    <div className="form-section">
                        <label className="section-label">
                            <i className="ti ti-list-numbers" /> Kurallar
                        </label>

                        <label className="rule-check">
                            <input
                                type="checkbox"
                                checked={form.permissions.includes("musteriSiparisNo")}
                                onChange={(e) => {
                                    const aktif = e.target.checked;

                                    formDegistir(
                                        "permissions",
                                        aktif
                                            ? [...form.permissions, "musteriSiparisNo"]
                                            : form.permissions.filter((p) => p !== "musteriSiparisNo")
                                    );
                                }}
                            />
                            <span>Müşteri Sipariş No kuralı aktif olsun</span>
                        </label>
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
