import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import "./TeslimEvraklari.css";

function TeslimEvraklari() {
    const [baslangic, setBaslangic] = useState("2026-05-02");
    const [bitis, setBitis] = useState("2026-05-02");
    const [evraklar, setEvraklar] = useState([]);
    const [seciliEvrak, setSeciliEvrak] = useState(null);
    const [seciliDosyaIndex, setSeciliDosyaIndex] = useState(0);
    const [birlesikPdfUrl, setBirlesikPdfUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [fileLoading, setFileLoading] = useState(false);
    const [mergeLoading, setMergeLoading] = useState(false);
    const [ilkYuklemeTamamlandi, setIlkYuklemeTamamlandi] = useState(false);
    const [hata, setHata] = useState("");
    const [yuklenenDosyaSayisi, setYuklenenDosyaSayisi] = useState(0);
    const [toplamDosyaSayisi, setToplamDosyaSayisi] = useState(0);

    const istekNo = useRef(0);

    function tokenBul(data) {
        return (
            data?.token || data?.accessToken || data?.access_token ||
            data?.jwtToken || data?.jwt || data?.bearerToken ||
            data?.data?.token || data?.data?.accessToken || data?.data?.access_token ||
            data?.data?.jwtToken || data?.data?.jwt || data?.data?.bearerToken ||
            data?.result?.token || data?.result?.accessToken || data?.result?.access_token ||
            data?.result?.jwtToken || data?.result?.jwt || data?.result?.bearerToken
        );
    }

    function seferDurumuBul(value) {
        const durumlar = {
            4: "Araç Atandı",
            5: "Araç Yüklendi",
            6: "Araç Yolda",
            7: "Teslim Edildi",
            8: "Tamamlandı",
        };

        return durumlar[Number(value)] || value || "-";
    }

    function evrakDurumuBul(value) {
        const durumlar = {
            1: "Bekliyor",
            10: "Eksik Evrak",
            20: "Hasarsız - Görüntü İşlendi",
            30: "Hasarlı - Görüntü İşlendi",
            31: "Hasarlı - Orjinal Evrak Geldi",
            40: "Orjinal Evrak Geldi",
            50: "Evrak Arşivlendi",
        };

        return durumlar[Number(value)] || value || "-";
    }

    function seferDurumDegeriBul(evrak) {
        return (
            evrak?.tmsDespatchStatu ||
            evrak?.despatchStatu ||
            evrak?.statu ||
            evrak?.status ||
            evrak?.tmsDespatchStatus
        );
    }

    function dosyalariBul(obj, bulunanlar = []) {
        if (!obj || typeof obj !== "object") return bulunanlar;

        const fileContent = obj.fileContent || obj.FileContent || obj.file_content || "";

        if (fileContent) {
            bulunanlar.push({
                fileContent,
                documentReferenceNumber:
                    obj.documentReferenceNumber ||
                    obj.DocumentReferenceNumber ||
                    obj.document_reference_number ||
                    obj.referenceNumber ||
                    obj.ReferenceNumber ||
                    `Dosya ${bulunanlar.length + 1}`,
            });
        }

        Object.keys(obj).forEach((key) => dosyalariBul(obj[key], bulunanlar));
        return bulunanlar;
    }

    function temizBase64Al(fileContent) {
        if (!fileContent) return "";
        return String(fileContent).replace(/\s/g, "").split(",").pop();
    }

    function dosyaTipiBul(fileContent) {
        const base64 = temizBase64Al(fileContent);

        if (base64.startsWith("JVBER")) return "pdf";
        if (base64.startsWith("/9j/")) return "jpg";
        if (base64.startsWith("iVBOR")) return "png";

        return "unknown";
    }

    function dosyaUrlOlustur(fileContent) {
        const base64 = temizBase64Al(fileContent);
        const tip = dosyaTipiBul(fileContent);

        if (!base64) return "";
        if (tip === "pdf") return `data:application/pdf;base64,${base64}`;
        if (tip === "jpg") return `data:image/jpeg;base64,${base64}`;
        if (tip === "png") return `data:image/png;base64,${base64}`;

        return `data:application/octet-stream;base64,${base64}`;
    }

    function dosyaUzantisiBul(fileContent) {
        const tip = dosyaTipiBul(fileContent);
        if (tip === "pdf") return "pdf";
        if (tip === "jpg") return "jpg";
        if (tip === "png") return "png";
        return "bin";
    }

    function dosyaEtiketiBul(fileContent) {
        const tip = dosyaTipiBul(fileContent);
        if (tip === "pdf") return "PDF";
        if (tip === "jpg") return "JPG";
        if (tip === "png") return "PNG";
        return "DOSYA";
    }

    function base64ToUint8Array(base64) {
        const binary = atob(temizBase64Al(base64));
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
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

    async function evraklariGetir() {
        const aktifIstek = Date.now();
        istekNo.current = aktifIstek;

        const customerId = Number(localStorage.getItem("customerId")) || 59765;

        setLoading(true);
        setFileLoading(false);
        setMergeLoading(false);
        setHata("");
        setEvraklar([]);
        setSeciliEvrak(null);
        setSeciliDosyaIndex(0);
        setBirlesikPdfUrl("");
        setIlkYuklemeTamamlandi(false);
        setYuklenenDosyaSayisi(0);
        setToplamDosyaSayisi(0);

        try {
            const data = await apiIstek("/odak-api/api/tmsdespatchdocuments/getall", {
                startDate: baslangic,
                endDate: bitis,
                customerId,
                vehicleId: 0,
                driverId: 0,
            });

            const liste = Array.isArray(data)
                ? data
                : data?.data || data?.items || data?.result || [];

            if (istekNo.current !== aktifIstek) return;

            const temizListe = liste.map((evrak) => ({
                ...evrak,
                files: [],
                fileContentLoading: true,
                fileContentError: "",
            }));

            setEvraklar(temizListe);
            setToplamDosyaSayisi(temizListe.length);
            setLoading(false);
            setIlkYuklemeTamamlandi(true);

            await dosyalariGetir(temizListe, aktifIstek);
        } catch (error) {
            if (istekNo.current !== aktifIstek) return;

            setHata(error.message || "Evrak verileri çekilemedi.");
            setLoading(false);
            setFileLoading(false);
            setIlkYuklemeTamamlandi(true);
        }
    }

    async function dosyalariGetir(liste, aktifIstek) {
        setFileLoading(true);

        for (const evrak of liste) {
            if (istekNo.current !== aktifIstek) return;

            const id = evrak?.tmsDespatchDocumentId;
            const tmsDespatchId = evrak?.tmsDespatchId;

            if (!id || !tmsDespatchId) {
                evrakGuncelle(evrak, {
                    files: [],
                    fileContentLoading: false,
                    fileContentError: "ID bilgileri eksik.",
                });

                setYuklenenDosyaSayisi((onceki) => onceki + 1);
                continue;
            }

            try {
                const data = await apiIstek(
                    "/odak-api/api/tmsdespatchdocuments/documentgetbyid",
                    { id, tmsDespatchId }
                );
                const files = dosyalariBul(data).map((file, index) => ({
                    ...file,
                    index,
                    type: dosyaTipiBul(file.fileContent),
                }));

                evrakGuncelle(evrak, {
                    files,
                    fileContentLoading: false,
                    fileContentError: files.length > 0 ? "" : "Dosya bulunamadı.",
                });
            } catch (error) {
                evrakGuncelle(evrak, {
                    files: [],
                    fileContentLoading: false,
                    fileContentError: error.message || "Dosya çekilemedi.",
                });
            } finally {
                setYuklenenDosyaSayisi((onceki) => onceki + 1);
            }
        }

        if (istekNo.current === aktifIstek) {
            setFileLoading(false);
        }
    }

    function evrakGuncelle(eskiEvrak, yeniAlanlar) {
        setEvraklar((oncekiListe) =>
            oncekiListe.map((item) => {
                const ayniKayit =
                    item.tmsDespatchDocumentId === eskiEvrak.tmsDespatchDocumentId &&
                    item.tmsDespatchId === eskiEvrak.tmsDespatchId;

                return ayniKayit ? { ...item, ...yeniAlanlar } : item;
            })
        );
    }

    function seferSec(evrak) {
        setSeciliEvrak(evrak);
        setSeciliDosyaIndex(0);
        setBirlesikPdfUrl("");
    }

    async function topluPdfOlustur() {
        if (!seciliEvrak?.files?.length) return;

        setMergeLoading(true);
        setBirlesikPdfUrl("");

        try {
            const hedefPdf = await PDFDocument.create();

            for (const file of seciliEvrak.files) {
                const tip = dosyaTipiBul(file.fileContent);
                const bytes = base64ToUint8Array(file.fileContent);

                if (tip === "pdf") {
                    const kaynakPdf = await PDFDocument.load(bytes);
                    const sayfalar = await hedefPdf.copyPages(
                        kaynakPdf,
                        kaynakPdf.getPageIndices()
                    );

                    sayfalar.forEach((sayfa) => hedefPdf.addPage(sayfa));
                }

                if (tip === "jpg" || tip === "png") {
                    const image =
                        tip === "jpg"
                            ? await hedefPdf.embedJpg(bytes)
                            : await hedefPdf.embedPng(bytes);

                    const page = hedefPdf.addPage([image.width, image.height]);
                    page.drawImage(image, {
                        x: 0,
                        y: 0,
                        width: image.width,
                        height: image.height,
                    });
                }
            }

            const pdfBytes = await hedefPdf.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            setBirlesikPdfUrl(url);
        } catch (error) {
            console.error("TOPLU PDF ERROR:", error);
            setHata("Dosyalar birleştirilemedi.");
        } finally {
            setMergeLoading(false);
        }
    }

    function deger(value) {
        return value || "-";
    }

    function formatTarih(tarih) {
        if (!tarih) return "-";
        return String(tarih).split("T")[0];
    }

    function dosyaGoster(file, evrak) {
        const tip = dosyaTipiBul(file.fileContent);
        const url = dosyaUrlOlustur(file.fileContent);

        if (tip === "pdf") {
            return (
                <iframe
                    className="file-viewer"
                    src={url}
                    title={`PDF-${evrak.documentNo || "evrak"}-${file.index}`}
                />
            );
        }

        if (tip === "jpg" || tip === "png") {
            return (
                <div className="image-viewer-wrap">
                    <img
                        className="image-viewer"
                        src={url}
                        alt={`${evrak.documentNo || "teslim-evraki"}-${file.index}`}
                    />
                </div>
            );
        }

        return <div className="file-empty error">Dosya tipi görüntülenemiyor.</div>;
    }

    const seciliDosya =
        seciliEvrak?.files?.length > 0
            ? seciliEvrak.files[seciliDosyaIndex] || seciliEvrak.files[0]
            : null;

    const ekranYukleniyor = loading || mergeLoading;

    const siradakiKayit = Math.min(yuklenenDosyaSayisi + 1, toplamDosyaSayisi);
    const yuklemeYuzdesi =
        toplamDosyaSayisi > 0
            ? Math.round((yuklenenDosyaSayisi / toplamDosyaSayisi) * 100)
            : 0;

    return (
        <main className="teslim-page">
            {ekranYukleniyor && (
                <div className="loading-overlay">
                    <div className="modern-loader">
                        <div className="loader-ring" />
                        <div className="loader-core" />
                    </div>
                </div>
            )}

            {fileLoading && !loading && (
                <div className="file-loading-toast">
                    <div
                        className="toast-progress-ring"
                        style={{
                            "--progress": `${yuklemeYuzdesi * 3.6}deg`,
                        }}
                    >
                        <span>{yuklemeYuzdesi}%</span>
                    </div>

                    <div className="toast-content">
                        <strong>Evrak görselleri yükleniyor</strong>
                        <span>
                            {toplamDosyaSayisi} kayıt var, {yuklenenDosyaSayisi} tanesi yüklendi.
                        </span>
                        <small>
                            {siradakiKayit}. kayıt hazırlanıyor...
                        </small>
                    </div>
                </div>
            )}

            <section className="page-head">
                <div>
                    <h1>Teslim Evrakları</h1>
                    <p>Listele, detayları görüntüle, dosyaları tek tek veya toplu indir.</p>
                </div>

                <div className="result-badge">
                    <strong>{evraklar.length}</strong>
                    <span>evrak</span>
                </div>
            </section>

            <section className="filter-bar">
                <div className="date-field">
                    <label>Başlangıç Tarihi</label>
                    <input
                        type="date"
                        value={baslangic}
                        onChange={(e) => setBaslangic(e.target.value)}
                    />
                </div>

                <div className="date-field">
                    <label>Bitiş Tarihi</label>
                    <input
                        type="date"
                        value={bitis}
                        onChange={(e) => setBitis(e.target.value)}
                    />
                </div>

                <button
                    className="refresh-btn"
                    onClick={evraklariGetir}
                    disabled={loading || mergeLoading}
                >
                    Listeyi Getir
                </button>
            </section>

            {hata && <div className="error-box">{hata}</div>}

            {!loading && ilkYuklemeTamamlandi && evraklar.length === 0 && (
                <div className="empty-box">Bu tarih aralığında evrak bulunamadı.</div>
            )}

            {!ilkYuklemeTamamlandi && evraklar.length === 0 && !loading && (
                <div className="empty-box">Tarih seçip “Listeyi Getir” butonuna bas.</div>
            )}

            {evraklar.length > 0 && (
                <section className="content-layout">
                    <section className="table-card">
                        <div className="table-head">
                            <div>
                                <h2>Sefer Listesi</h2>
                                <span>{evraklar.length} kayıt</span>
                            </div>
                        </div>

                        <div className="table-scroll">
                            <table className="evrak-table">
                                <thead>
                                    <tr>
                                        <th>Sefer</th>
                                        <th>Araç</th>
                                        <th>Sürücü</th>
                                        <th>Tarih</th>
                                        <th>Evrak Durumu</th>
                                        <th>Dosya</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {evraklar.map((evrak, index) => {
                                        const secili =
                                            seciliEvrak?.tmsDespatchDocumentId ===
                                            evrak.tmsDespatchDocumentId &&
                                            seciliEvrak?.tmsDespatchId === evrak.tmsDespatchId;

                                        return (
                                            <tr
                                                key={`${evrak.tmsDespatchDocumentId}-${evrak.tmsDespatchId}-${index}`}
                                                className={secili ? "selected-row" : ""}
                                                onClick={() => seferSec(evrak)}
                                            >
                                                <td>
                                                    <strong>{deger(evrak.documentNo)}</strong>
                                                    <span>{deger(evrak.deliveryAddressCode)}</span>
                                                </td>

                                                <td>
                                                    <strong>{deger(evrak.plateNumber)}</strong>
                                                    <span>{deger(evrak.trailerPlateNumber)}</span>
                                                </td>

                                                <td>
                                                    <strong>{deger(evrak.fullName)}</strong>
                                                    <span>{deger(evrak.customerOrderNumber)}</span>
                                                </td>

                                                <td>{formatTarih(evrak.despatchDate)}</td>

                                                <td>
                                                    <span className="status-badge">
                                                        {evrakDurumuBul(evrak.tmsDespatchDocumentStatu)}
                                                    </span>
                                                </td>

                                                <td>
                                                    {evrak.fileContentLoading ? (
                                                        <span className="mini-loading">Hazırlanıyor</span>
                                                    ) : evrak.fileContentError ? (
                                                        <span className="mini-error">Yok</span>
                                                    ) : (
                                                        <span className="mini-success">
                                                            {evrak.files.length} dosya
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <aside className="detail-panel">
                        {!seciliEvrak ? (
                            <div className="empty-detail">Detay için bir sefer seç.</div>
                        ) : (
                            <>
                                <div className="detail-head">
                                    <div>
                                        <span>Sefer No</span>
                                        <h2>{deger(seciliEvrak.documentNo)}</h2>
                                    </div>

                                    <button
                                        className="close-btn"
                                        onClick={() => setSeciliEvrak(null)}
                                    >
                                        Kapat
                                    </button>
                                </div>

                                <div className="detail-grid compact">
                                    <div>
                                        <span>Evrak Durumu</span>
                                        <strong>
                                            {evrakDurumuBul(seciliEvrak.tmsDespatchDocumentStatu)}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Sefer Durumu</span>
                                        <strong>
                                            {seferDurumuBul(seferDurumDegeriBul(seciliEvrak))}
                                        </strong>
                                    </div>

                                    <div><span>Plaka</span><strong>{deger(seciliEvrak.plateNumber)}</strong></div>
                                    <div><span>Sürücü</span><strong>{deger(seciliEvrak.fullName)}</strong></div>
                                    <div><span>Treyler</span><strong>{deger(seciliEvrak.trailerPlateNumber)}</strong></div>
                                    <div><span>Sipariş Tarihi</span><strong>{formatTarih(seciliEvrak.despatchDate)}</strong></div>
                                    <div><span>Teslim Noktası</span><strong>{deger(seciliEvrak.deliveryAddressCode)}</strong></div>
                                    <div><span>Müşteri No</span><strong>{deger(seciliEvrak.customerOrderNumber)}</strong></div>
                                </div>

                                <div className="file-section">
                                    <div className="file-section-head">
                                        <div>
                                            <h3>Evrak Dosyaları</h3>
                                            <span>{seciliEvrak.files?.length || 0} dosya</span>
                                        </div>

                                        <div className="action-group">
                                            {seciliDosya && (
                                                <a
                                                    className="download-btn light"
                                                    href={dosyaUrlOlustur(seciliDosya.fileContent)}
                                                    download={`${seciliEvrak.documentNo}-${seciliDosya.documentReferenceNumber}.${dosyaUzantisiBul(seciliDosya.fileContent)}`}
                                                >
                                                    Seçili Dosyayı İndir
                                                </a>
                                            )}

                                            {seciliEvrak.files?.length > 0 && (
                                                <button
                                                    className="download-btn"
                                                    onClick={topluPdfOlustur}
                                                    disabled={mergeLoading}
                                                >
                                                    Toplu Birleştir
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {seciliEvrak.fileContentLoading ? (
                                        <div className="file-empty">Dosyalar yükleniyor...</div>
                                    ) : seciliEvrak.fileContentError ? (
                                        <div className="file-empty error">
                                            {seciliEvrak.fileContentError}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="file-tabs">
                                                {seciliEvrak.files.map((file, index) => (
                                                    <button
                                                        key={`${file.documentReferenceNumber}-${index}`}
                                                        className={
                                                            seciliDosyaIndex === index
                                                                ? "file-tab active"
                                                                : "file-tab"
                                                        }
                                                        onClick={() => {
                                                            setSeciliDosyaIndex(index);
                                                            setBirlesikPdfUrl("");
                                                        }}
                                                    >
                                                        <span>{dosyaEtiketiBul(file.fileContent)}</span>
                                                        <strong>{file.documentReferenceNumber}</strong>
                                                    </button>
                                                ))}
                                            </div>

                                            {birlesikPdfUrl ? (
                                                <div className="combined-area">
                                                    <div className="combined-head">
                                                        <strong>Birleşik PDF</strong>

                                                        <a
                                                            className="download-btn"
                                                            href={birlesikPdfUrl}
                                                            download={`${seciliEvrak.documentNo || "birlesik-evrak"}.pdf`}
                                                        >
                                                            Birleşik PDF İndir
                                                        </a>
                                                    </div>

                                                    <iframe
                                                        className="file-viewer"
                                                        src={birlesikPdfUrl}
                                                        title="Birleşik PDF"
                                                    />
                                                </div>
                                            ) : (
                                                seciliDosya && (
                                                    <>
                                                        <div className="selected-file-meta">
                                                            <span>Document Reference Number</span>
                                                            <strong>{seciliDosya.documentReferenceNumber}</strong>
                                                        </div>

                                                        {dosyaGoster(seciliDosya, seciliEvrak)}
                                                    </>
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </aside>
                </section>
            )}
        </main>
    );
}

export default TeslimEvraklari;