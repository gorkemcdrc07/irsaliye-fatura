import { useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import "./TeslimEvraklari.css";

function TeslimEvraklari() {

    const bugun = new Date();

    const ayinIlkGunu = new Date(
        bugun.getFullYear(),
        bugun.getMonth(),
        1
    );

    const ayinSonGunu = new Date(
        bugun.getFullYear(),
        bugun.getMonth() + 1,
        0
    );

    const formatDate = (date) => {
        const yil = date.getFullYear();
        const ay = String(date.getMonth() + 1).padStart(2, "0");
        const gun = String(date.getDate()).padStart(2, "0");
        return `${yil}-${ay}-${gun}`;
    };

    const [baslangic, setBaslangic] = useState(formatDate(ayinIlkGunu));
    const [bitis, setBitis] = useState(formatDate(ayinSonGunu));
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
    const [arama, setArama] = useState("");
    const [zipLoading, setZipLoading] = useState(false);
    const [buyukGorsel, setBuyukGorsel] = useState(null);
    const [gorselZoom, setGorselZoom] = useState(1);
    const [logBilgisi, setLogBilgisi] = useState(null);
    const [musteriSiparisNoKurali, setMusteriSiparisNoKurali] = useState(false);
    const [takipPanel, setTakipPanel] = useState(null);
    const [takipPanelPozisyon, setTakipPanelPozisyon] = useState({ x: 80, y: 90 });


    const istekNo = useRef(0);
    const takipDragRef = useRef({ aktif: false, offsetX: 0, offsetY: 0 });

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
        const documentReferenceNumber =
            obj.documentReferenceNumber ||
            obj.DocumentReferenceNumber ||
            obj.document_reference_number ||
            obj.referenceNumber ||
            obj.ReferenceNumber ||
            obj.documentNo ||
            obj.DocumentNo ||
            "";
        if (fileContent || documentReferenceNumber) {
            bulunanlar.push({
                fileContent,
                documentReferenceNumber: documentReferenceNumber || `Dosya ${bulunanlar.length + 1}`,
                hasFile: Boolean(fileContent),
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

    function dosyaAdiTemizle(value) {
        return String(value || "dosya")
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
            .trim();
    }

    function blobIndir(blob, fileName) {
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);
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
        try { return JSON.parse(text); } catch { return null; }
    }

    async function tokenYenile() {
        throw new Error("Token servisi devre dışı.");
    }

    async function apiIstek(url, body) {
        const token = localStorage.getItem("token") || "supabase-login";
        const fullUrl = `${import.meta.env.VITE_SHO_API_BASE_URL}${url}`;
        const response = await fetch(fullUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = await guvenliJsonOku(response);
        if (response.status === 401) throw new Error("Yetkilendirme hatası.");
        if (!response.ok) throw new Error(data?.message || `API hata: ${response.status}`);
        return data;
    }

    async function apiGetIstek(url) {
        const token = localStorage.getItem("token") || "supabase-login";
        const fullUrl = `${import.meta.env.VITE_SHO_API_BASE_URL}${url}`;
        const response = await fetch(fullUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await guvenliJsonOku(response);
        if (response.status === 401) throw new Error("Yetkilendirme hatası.");
        if (!response.ok) throw new Error(data?.message || `API hata: ${response.status}`);
        return data;
    }

    function takipListesiBul(data) {
        const kaynak = data?.data || data?.result || data?.items || data;
        if (Array.isArray(kaynak)) return kaynak;
        if (Array.isArray(kaynak?.data)) return kaynak.data;
        if (Array.isArray(kaynak?.items)) return kaynak.items;
        if (kaynak && typeof kaynak === "object") return [kaynak];
        return [];
    }

    function takipVerisiBul(data) {
        return takipListesiBul(data)[0] || null;
    }

    function takipAlanBul(obj, alanlar) {
        if (!obj || typeof obj !== "object") return "";
        for (const alan of alanlar) {
            if (obj[alan] !== undefined && obj[alan] !== null && obj[alan] !== "") return obj[alan];
        }
        return "";
    }

    function takipOzetiOlustur(takip) {
        if (!takip) return null;

        const tarih = takipAlanBul(takip, [
            "trackingDate", "TrackingDate", "date", "Date", "createdDate", "CreatedDate",
            "lastSignalDate", "LastSignalDate", "gpsDate", "GpsDate", "insertDate", "InsertDate"
        ]);

        const konum = takipAlanBul(takip, [
            "address", "Address", "location", "Location", "lastLocation", "LastLocation",
            "currentLocation", "CurrentLocation", "city", "City", "district", "District"
        ]);

        const durum = takipAlanBul(takip, [
            "statu", "status", "Status", "vehicleStatus", "VehicleStatus", "state", "State"
        ]);

        const hiz = takipAlanBul(takip, ["speed", "Speed", "vehicleSpeed", "VehicleSpeed"]);
        const lat = takipAlanBul(takip, ["latitude", "Latitude", "lat", "Lat"]);
        const lng = takipAlanBul(takip, ["longitude", "Longitude", "lng", "Lng", "lon", "Lon"]);

        return {
            tarih,
            konum,
            durum,
            hiz,
            lat,
            lng,
            hamVeri: takip,
        };
    }

    function takipTarihFormatla(value) {
        if (!value) return "-";
        const tarih = new Date(value);
        if (Number.isNaN(tarih.getTime())) return String(value).split("T").join(" ");
        return tarih.toLocaleString("tr-TR");
    }

    function takipKonumMetni(takip) {
        if (!takip) return "-";
        const sehir = takipAlanBul(takip, ["cityName", "CityName", "city", "City"]);
        const ilce = takipAlanBul(takip, ["countyName", "CountyName", "district", "District", "county", "County"]);
        const adres = takipAlanBul(takip, ["address", "Address", "location", "Location", "lastLocation", "LastLocation"]);
        return [sehir, ilce].filter(Boolean).join(" / ") || adres || "-";
    }

    function takipDurumMetni(takip) {
        return takipAlanBul(takip, ["description", "Description", "statu", "status", "Status", "vehicleStatus", "VehicleStatus"]) || "-";
    }

    function takipKullaniciMetni(takip) {
        return takipAlanBul(takip, ["tmsDespatchCreatedBy", "createdBy", "CreatedBy", "userName", "UserName"]) || "-";
    }

    function takipTarihDegeri(takip) {
        return takipAlanBul(takip, ["createdDate", "CreatedDate", "trackingDate", "TrackingDate", "date", "Date", "lastSignalDate", "LastSignalDate"]) || "";
    }

    function takipPanelAc(evrak, event) {
        event?.stopPropagation();
        setTakipPanel(evrak);
    }

    function takipPanelSurukleBaslat(event) {
        takipDragRef.current = {
            aktif: true,
            offsetX: event.clientX - takipPanelPozisyon.x,
            offsetY: event.clientY - takipPanelPozisyon.y,
        };

        const hareket = (moveEvent) => {
            if (!takipDragRef.current.aktif) return;
            setTakipPanelPozisyon({
                x: Math.max(12, moveEvent.clientX - takipDragRef.current.offsetX),
                y: Math.max(12, moveEvent.clientY - takipDragRef.current.offsetY),
            });
        };

        const birak = () => {
            takipDragRef.current.aktif = false;
            window.removeEventListener("mousemove", hareket);
            window.removeEventListener("mouseup", birak);
        };

        window.addEventListener("mousemove", hareket);
        window.addEventListener("mouseup", birak);
    }

    async function evraklariGetir() {

        const baslamaZamani = performance.now();
        const islemTarihi = new Date();

        const aktifIstek = Date.now();
        istekNo.current = aktifIstek;
        const customerId = localStorage.getItem("customerId");
        const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");

        const customerOrderNoRule =
            localStorage.getItem("customerOrderNoRule") === "true" ||
            permissions.includes("musteriSiparisNo");
        setMusteriSiparisNoKurali(customerOrderNoRule);
        if (!customerId) {
            setHata("Müşteri bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setFileLoading(false);
        setMergeLoading(false);
        setHata("");
        setEvraklar([]);
        setSeciliEvrak(null);
        setTakipPanel(null);
        setSeciliDosyaIndex(0);
        setBirlesikPdfUrl("");
        setIlkYuklemeTamamlandi(false);
        setYuklenenDosyaSayisi(0);
        setToplamDosyaSayisi(0);

        try {
            const data = await apiIstek("/odak-api/api/tmsdespatchdocuments/getall", {
                startDate: baslangic,
                endDate: bitis,
                customerId: Number(customerId),
                vehicleId: 0,
                driverId: 0,
            });
            const liste = Array.isArray(data) ? data : data?.data || data?.items || data?.result || [];
            const bitisZamani = performance.now();

            setLogBilgisi({
                tarih: islemTarihi.toLocaleDateString("tr-TR"),
                saat: islemTarihi.toLocaleTimeString("tr-TR"),
                sure: ((bitisZamani - baslamaZamani) / 1000).toFixed(2),
                kayitSayisi: liste.length
            });
            if (istekNo.current !== aktifIstek) return;
            const temizListe = liste.map((evrak) => ({
                ...evrak,
                files: [],
                fileContentLoading: true,
                fileContentError: "",
                takip: null,
                takipListesi: [],
                takipLoading: true,
                takipError: "",
            }));
            setEvraklar(temizListe);
            setToplamDosyaSayisi(temizListe.length);
            setLoading(false);
            setIlkYuklemeTamamlandi(true);
            await Promise.allSettled([
                aracTakipleriniGetir(temizListe, aktifIstek),
                dosyalariGetir(temizListe, aktifIstek),
            ]);
        } catch (error) {
            const bitisZamani = performance.now();

            setLogBilgisi({
                tarih: islemTarihi.toLocaleDateString("tr-TR"),
                saat: islemTarihi.toLocaleTimeString("tr-TR"),
                sure: ((bitisZamani - baslamaZamani) / 1000).toFixed(2),
                hata: error.message
            });
            if (istekNo.current !== aktifIstek) return;
            setHata(error.message || "Evrak verileri çekilemedi.");
            setLoading(false);
            setFileLoading(false);
            setIlkYuklemeTamamlandi(true);
        }
    }

    async function aracTakipleriniGetir(liste, aktifIstek) {
        for (const evrak of liste) {
            if (istekNo.current !== aktifIstek) return;

            const tmsDespatchId = evrak?.tmsDespatchId;
            if (!tmsDespatchId) {
                evrakGuncelle(evrak, {
                    takip: null,
                    takipListesi: [],
                    takipLoading: false,
                    takipError: "TMS Despatch ID yok.",
                });
                continue;
            }

            try {
                const data = await apiGetIstek(
                    `/odak-api/api/tmsdespatch/vehicletrackinggetbytmsdespatchid?tmsDespatchId=${encodeURIComponent(tmsDespatchId)}`
                );

                const takipListesi = takipListesiBul(data).sort((a, b) => {
                    const tarihA = new Date(takipTarihDegeri(a)).getTime();
                    const tarihB = new Date(takipTarihDegeri(b)).getTime();

                    return tarihA - tarihB;
                });

                const takip = takipOzetiOlustur(
                    takipListesi[takipListesi.length - 1] || null
                );

                evrakGuncelle(evrak, {
                    takip,
                    takipListesi,
                    takipLoading: false,
                    takipError: takipListesi.length > 0 ? "" : "Takip verisi yok.",
                });
            } catch (error) {
                evrakGuncelle(evrak, {
                    takip: null,
                    takipListesi: [],
                    takipLoading: false,
                    takipError: error.message || "Takip verisi çekilemedi.",
                });
            }
        }
    }

    async function dosyalariGetir(liste, aktifIstek) {
        setFileLoading(true);
        for (const evrak of liste) {
            if (istekNo.current !== aktifIstek) return;
            const id = evrak?.tmsDespatchDocumentId;
            const tmsDespatchId = evrak?.tmsDespatchId;
            if (!id || !tmsDespatchId) {
                evrakGuncelle(evrak, { files: [], fileContentLoading: false, fileContentError: "ID bilgileri eksik." });
                setYuklenenDosyaSayisi((p) => p + 1);
                continue;
            }
            try {
                const data = await apiIstek("/odak-api/api/tmsdespatchdocuments/documentgetbyid", { id, tmsDespatchId });
                const files = dosyalariBul(data).map((file, index) => ({
                    ...file,
                    index,
                    type: dosyaTipiBul(file.fileContent),
                }));
                evrakGuncelle(evrak, { files, fileContentLoading: false, fileContentError: files.length > 0 ? "" : "Dosya bulunamadı." });
            } catch (error) {
                evrakGuncelle(evrak, { files: [], fileContentLoading: false, fileContentError: error.message || "Dosya çekilemedi." });
            } finally {
                setYuklenenDosyaSayisi((p) => p + 1);
            }
        }
        if (istekNo.current === aktifIstek) setFileLoading(false);
    }

    function evrakGuncelle(eskiEvrak, yeniAlanlar) {
        setEvraklar((oncekiListe) =>
            oncekiListe.map((item) => {
                const ayni =
                    item.tmsDespatchDocumentId === eskiEvrak.tmsDespatchDocumentId &&
                    item.tmsDespatchId === eskiEvrak.tmsDespatchId;
                return ayni ? { ...item, ...yeniAlanlar } : item;
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
                    const sayfalar = await hedefPdf.copyPages(kaynakPdf, kaynakPdf.getPageIndices());
                    sayfalar.forEach((s) => hedefPdf.addPage(s));
                }
                if (tip === "jpg" || tip === "png") {
                    const image = tip === "jpg" ? await hedefPdf.embedJpg(bytes) : await hedefPdf.embedPng(bytes);
                    const page = hedefPdf.addPage([image.width, image.height]);
                    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                }
            }
            const pdfBytes = await hedefPdf.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            setBirlesikPdfUrl(URL.createObjectURL(blob));
        } catch (error) {
            console.error("TOPLU PDF ERROR:", error);
            setHata("Dosyalar birleştirilemedi.");
        } finally {
            setMergeLoading(false);
        }
    }

    async function topluZipIndir() {
        const indirilecekListe = evraklar.filter(
            (evrak) => evrak.files?.some((f) => f.hasFile)
        );

        if (!indirilecekListe.length) {
            setHata("İndirilecek evrak bulunamadı.");
            return;
        }

        setZipLoading(true);

        try {
            const zip = new JSZip();

            for (const evrak of indirilecekListe) {

                const seferNo = evrak.documentNo || "SEFER";
                const musteriSiparisNo = evrak.customerOrderNumber;
                const tarih = formatTarih(evrak.despatchDate);

                const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");

                const customerOrderNoRule =
                    localStorage.getItem("customerOrderNoRule") === "true" ||
                    permissions.includes("musteriSiparisNo");

                const klasorKaynak =
                    customerOrderNoRule && musteriSiparisNo
                        ? `${musteriSiparisNo}_${tarih}`
                        : `${seferNo}_${tarih}`;

                const klasorAdi = dosyaAdiTemizle(klasorKaynak);
                const klasor = zip.folder(klasorAdi);
                const dosyalar = evrak.files.filter((f) => f.hasFile);

                const birlesikPdf =
                    dosyalar.length > 1
                        ? await PDFDocument.create()
                        : null;

                for (const [index, file] of dosyalar.entries()) {

                    const tekilPdf = await PDFDocument.create();

                    const tip = dosyaTipiBul(file.fileContent);
                    const bytes = base64ToUint8Array(file.fileContent);

                    if (tip === "pdf") {
                        const kaynakPdf = await PDFDocument.load(bytes);

                        const tekilSayfalar = await tekilPdf.copyPages(
                            kaynakPdf,
                            kaynakPdf.getPageIndices()
                        );
                        tekilSayfalar.forEach((sayfa) => tekilPdf.addPage(sayfa));

                        if (birlesikPdf) {
                            const birlesikSayfalar = await birlesikPdf.copyPages(
                                kaynakPdf,
                                kaynakPdf.getPageIndices()
                            );
                            birlesikSayfalar.forEach((sayfa) => birlesikPdf.addPage(sayfa));
                        }
                    }

                    if (tip === "jpg" || tip === "png") {
                        const image =
                            tip === "jpg"
                                ? await tekilPdf.embedJpg(bytes)
                                : await tekilPdf.embedPng(bytes);

                        const tekilPage = tekilPdf.addPage([image.width, image.height]);
                        tekilPage.drawImage(image, {
                            x: 0,
                            y: 0,
                            width: image.width,
                            height: image.height,
                        });

                        if (birlesikPdf) {
                            const birlesikImage =
                                tip === "jpg"
                                    ? await birlesikPdf.embedJpg(bytes)
                                    : await birlesikPdf.embedPng(bytes);

                            const birlesikPage = birlesikPdf.addPage([
                                birlesikImage.width,
                                birlesikImage.height,
                            ]);

                            birlesikPage.drawImage(birlesikImage, {
                                x: 0,
                                y: 0,
                                width: birlesikImage.width,
                                height: birlesikImage.height,
                            });
                        }
                    }

                    const tekilPdfBytes = await tekilPdf.save();

                    const dosyaAdi = dosyaAdiTemizle(
                        file.documentReferenceNumber ||
                        `IRSALIYE_${index + 1}`
                    );

                    klasor.file(`${dosyaAdi}.pdf`, tekilPdfBytes);
                }

                if (birlesikPdf) {
                    const birlesikPdfBytes = await birlesikPdf.save();

                    klasor.file(
                        "BIRLESTIRILMIS_IRSALIYE.pdf",
                        birlesikPdfBytes
                    );
                }
            }
            const blob = await zip.generateAsync({ type: "blob" });

            blobIndir(blob, "Teslim Evrakları.zip");
        } catch (err) {
            console.error(err);
            setHata("ZIP oluşturulamadı.");
        } finally {
            setZipLoading(false);
        }
    }
    function deger(value) { return value || "-"; }

    function formatTarih(tarih) {
        if (!tarih) return "-";
        return String(tarih).split("T")[0];
    }

    function dosyaGoster(file, evrak) {
        const tip = dosyaTipiBul(file.fileContent);
        const url = dosyaUrlOlustur(file.fileContent);
        if (tip === "pdf") {
            return <iframe className="file-viewer" src={url} title={`PDF-${evrak.documentNo || "evrak"}-${file.index}`} />;
        }
        if (tip === "jpg" || tip === "png") {
            return (
                <div className="image-viewer-wrap">
                    <img
                        className="image-viewer clickable-image"
                        src={url}
                        alt={`${evrak.documentNo || "teslim-evraki"}-${file.index}`}
                        onClick={() => {
                            setBuyukGorsel({
                                url,
                                title: file.documentReferenceNumber
                            });
                            setGorselZoom(1.8);
                        }}
                    />
                </div>
            );
        }
        return <div className="file-empty error">Dosya tipi görüntülenemiyor.</div>;
    }

    const seciliDosya = seciliEvrak?.files?.length > 0
        ? seciliEvrak.files[seciliDosyaIndex] || seciliEvrak.files[0]
        : null;

    const filtreliEvraklar = useMemo(() => {
        const q = arama.trim().toLocaleLowerCase("tr-TR");
        if (!q) return evraklar;
        return evraklar.filter((evrak) => {
            const alanlar = [
                evrak?.documentNo, evrak?.deliveryAddressCode, evrak?.plateNumber,
                evrak?.trailerPlateNumber, evrak?.fullName, evrak?.customerOrderNumber,
                formatTarih(evrak?.despatchDate),
                seferDurumuBul(seferDurumDegeriBul(evrak)),
                evrakDurumuBul(evrak?.tmsDespatchDocumentStatu),
                evrak?.takip?.konum,
                evrak?.takip?.durum,
                evrak?.takip?.hiz,
                takipTarihFormatla(evrak?.takip?.tarih),
                ...(evrak?.files || []).map((f) => f.documentReferenceNumber),
            ];
            return alanlar.filter(Boolean).some((v) => String(v).toLocaleLowerCase("tr-TR").includes(q));
        });
    }, [arama, evraklar]);

    const yuklemeYuzdesi = toplamDosyaSayisi > 0
        ? Math.round((yuklenenDosyaSayisi / toplamDosyaSayisi) * 100)
        : 0;

    const siradakiKayit = Math.min(yuklenenDosyaSayisi + 1, toplamDosyaSayisi);

    return (
        <main className="teslim-page">

            {/* ── Full-screen loading overlay ── */}
            {(loading || mergeLoading) && (
                <div className="loading-overlay">
                    <div className="loader-wrap">
                        <div className="loader-ring" />
                        <div className="loader-core" />
                    </div>
                </div>
            )}

            {/* ── File loading toast ── */}
            {fileLoading && !loading && (
                <div className="file-loading-toast">
                    <div className="toast-ring" style={{ "--pct": `${yuklemeYuzdesi * 3.6}deg` }}>
                        <span>{yuklemeYuzdesi}%</span>
                    </div>
                    <div className="toast-body">
                        <strong>Evrak görselleri yükleniyor</strong>
                        <span>{yuklenenDosyaSayisi} / {toplamDosyaSayisi} kayıt tamamlandı</span>
                        <small>{siradakiKayit}. kayıt hazırlanıyor...</small>
                    </div>
                </div>
            )}

            {/* ── Page header ── */}
            <header className="page-header">
                <div className="page-header-left">
                    <div className="page-icon">
                        <i className="ti ti-file-description" />
                    </div>
                    <div>
                        <h1>Teslim Evrakları</h1>
                        <p>Sefer bazlı evrak görüntüleme ve toplu PDF indirme</p>
                    </div>
                </div>
                <div className="page-header-stats">
                    {logBilgisi && (
                        <>
                            <div className="header-log-box">
                                <span>Son Veri Çekme</span>
                                <strong>{logBilgisi.tarih} - {logBilgisi.saat}</strong>
                            </div>

                            <div className="header-log-box">
                                <span>Süre</span>
                                <strong>{logBilgisi.sure} sn</strong>
                            </div>
                        </>
                    )}

                    <div className="evrak-count-badge">
                        <span className="count-num">{evraklar.length}</span>
                        <span className="count-lbl">evrak</span>
                    </div>
                </div>
            </header>

            {/* ── Filter bar ── */}
            <section className="filter-bar">
                <div className="filter-field">
                    <label>Başlangıç Tarihi</label>
                    <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
                </div>
                <div className="filter-field">
                    <label>Bitiş Tarihi</label>
                    <input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
                </div>
                <div className="filter-field filter-search">
                    <label>Genel Arama</label>
                    <div className="search-input-wrap">
                        <i className="ti ti-search search-icon" />
                        <input
                            type="text"
                            placeholder="Sefer, plaka, sürücü, irsaliye no..."
                            value={arama}
                            onChange={(e) => setArama(e.target.value)}
                        />
                    </div>
                </div>
                <button className="fetch-btn" onClick={evraklariGetir} disabled={loading || mergeLoading}>
                    <i className="ti ti-list-search" />
                    Listeyi Getir
                </button>
                <button
                    className="fetch-btn"
                    onClick={topluZipIndir}
                    disabled={
                        loading ||
                        fileLoading ||
                        zipLoading ||
                        evraklar.length === 0
                    }
                >
                    <i className="ti ti-file-zip" />
                    {zipLoading ? "Hazırlanıyor..." : "Toplu İndir"}
                </button>
            </section>

            {/* ── Error ── */}
            {hata && (
                <div className="error-banner">
                    <i className="ti ti-alert-circle" />
                    {hata}
                </div>
            )}
            {/* ── Empty states ── */}
            {!loading && ilkYuklemeTamamlandi && evraklar.length === 0 && (
                <div className="empty-state">
                    <i className="ti ti-folder-off" />
                    <strong>Evrak Bulunamadı</strong>
                    <span>Bu tarih aralığında kayıt bulunmuyor.</span>
                </div>
            )}
            {!ilkYuklemeTamamlandi && evraklar.length === 0 && !loading && (
                <div className="empty-state">
                    <i className="ti ti-calendar-search" />
                    <strong>Tarih Seçin</strong>
                    <span>Tarih aralığı belirleyip "Listeyi Getir" butonuna basın.</span>
                </div>
            )}

            {/* ── Table ── */}
            {evraklar.length > 0 && (
                <section className="table-card">
                    <div className="table-toolbar">
                        <div className="toolbar-left">
                            <h2>Sefer Listesi</h2>
                            <span className="record-count">{filtreliEvraklar.length} / {evraklar.length} kayıt</span>
                        </div>
                    </div>

                    <div className="table-scroll">
                        <table className="evrak-table">
                            <thead>
                                <tr>
                                    <th>Sefer / Nokta</th>
                                    <th>Araç / Treyler</th>
                                    <th>
                                        {musteriSiparisNoKurali
                                            ? "Sürücü / Müşteri Sipariş No"
                                            : "Sürücü"}
                                    </th>
                                    <th>Tarih</th>
                                    <th>Sefer Durumu</th>
                                    <th>Evrak Durumu</th>
                                    <th>Görüşme Notu</th>
                                    <th className="col-center">Görüntü / İrsaliye Sayısı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtreliEvraklar.map((evrak, index) => {
                                    const secili =
                                        seciliEvrak?.tmsDespatchDocumentId === evrak.tmsDespatchDocumentId &&
                                        seciliEvrak?.tmsDespatchId === evrak.tmsDespatchId;
                                    const seferDurum = seferDurumDegeriBul(evrak);
                                    return (
                                        <tr
                                            key={`${evrak.tmsDespatchDocumentId}-${evrak.tmsDespatchId}-${index}`}
                                            className={secili ? "row-selected" : ""}
                                            onClick={() => seferSec(evrak)}
                                        >
                                            <td>
                                                <span className="cell-primary">{deger(evrak.documentNo)}</span>
                                                <span className="cell-secondary">{deger(evrak.deliveryAddressCode)}</span>
                                            </td>
                                            <td>
                                                <span className="cell-primary">{deger(evrak.plateNumber)}</span>
                                                <span className="cell-secondary">{deger(evrak.trailerPlateNumber)}</span>
                                            </td>
                                            <td>
                                                <span className="cell-primary">{deger(evrak.fullName)}</span>

                                                {(
                                                    musteriSiparisNoKurali ||
                                                    JSON.parse(localStorage.getItem("permissions") || "[]").includes("musteriSiparisNo")
                                                ) && (
                                                        <span className="cell-secondary">
                                                            {deger(evrak.customerOrderNumber)}
                                                        </span>
                                                    )}
                                            </td>
                                            <td>
                                                <span className="cell-date">{formatTarih(evrak.despatchDate)}</span>
                                            </td>
                                            <td>
                                                <span className={`sefer-badge sefer-${seferDurum}`}>
                                                    {seferDurumuBul(seferDurum)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`evrak-badge evrak-${evrak.tmsDespatchDocumentStatu}`}>
                                                    {evrakDurumuBul(evrak.tmsDespatchDocumentStatu)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`tracking-open-btn ${evrak.takipError ? "error" : ""}`}
                                                    onClick={(e) => takipPanelAc(evrak, e)}
                                                    disabled={evrak.takipLoading}
                                                    title="Araç takip detayını aç"
                                                >
                                                    {evrak.takipLoading ? (
                                                        <span className="tracking-status-card loading">
                                                            <span className="tracking-status-icon"><i className="ti ti-loader-2 spin" /></span>
                                                            <span>
                                                                <strong>Kontrol ediliyor</strong>
                                                                <small>Takip bilgisi yükleniyor</small>
                                                            </span>
                                                        </span>
                                                    ) : evrak.takipError ? (
                                                        <span className="tracking-status-card empty">
                                                            <span className="tracking-status-icon"><i className="ti ti-map-off" /></span>
                                                            <span>
                                                                <strong>Kayıt Yok</strong>
                                                                <small>Takip hareketi bulunamadı</small>
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="tracking-status-card ok">
                                                            <span className="tracking-status-icon"><i className="ti ti-route" /></span>
                                                            <span>
                                                                <strong>Kayıt Var · {evrak.takipListesi?.length || 1}</strong>
                                                                <small>{takipDurumMetni(evrak.takip)} · {takipKonumMetni(evrak.takip)}</small>
                                                            </span>
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="col-center">
                                                {evrak.fileContentLoading ? (
                                                    <span className="file-chip loading">
                                                        <i className="ti ti-loader-2 spin" /> Yükleniyor
                                                    </span>
                                                ) : evrak.fileContentError ? (
                                                    <span className="file-chip error">
                                                        <i className="ti ti-file-off" /> Yok
                                                    </span>
                                                ) : (
                                                    <span className="file-chip ok">
                                                        <i className="ti ti-files" />
                                                        {evrak.files.filter((f) => f.hasFile).length}/{evrak.files.length}
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
            )}

            {/* ── Detail Modal ── */}
            {seciliEvrak && (
                <div className="modal-backdrop" onClick={() => setSeciliEvrak(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <div className="modal-icon">
                                    <i className="ti ti-file-text" />
                                </div>
                                <div>
                                    <p className="modal-eyebrow">Sefer Detayı</p>
                                    <h2 className="modal-title">{deger(seciliEvrak.documentNo)}</h2>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setSeciliEvrak(null)} aria-label="Kapat">
                                <i className="ti ti-x" />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Status pills */}
                            <div className="modal-status-row">
                                <div className="status-pill">
                                    <span className="pill-label">Sefer Durumu</span>
                                    <span className={`sefer-badge sefer-${seferDurumDegeriBul(seciliEvrak)}`}>
                                        {seferDurumuBul(seferDurumDegeriBul(seciliEvrak))}
                                    </span>
                                </div>
                                <div className="status-pill">
                                    <span className="pill-label">Evrak Durumu</span>
                                    <span className={`evrak-badge evrak-${seciliEvrak.tmsDespatchDocumentStatu}`}>
                                        {evrakDurumuBul(seciliEvrak.tmsDespatchDocumentStatu)}
                                    </span>
                                </div>
                                <div className="status-pill">
                                    <span className="pill-label">Araç Takip</span>
                                    {seciliEvrak.takipLoading ? (
                                        <span className="tracking-chip loading"><i className="ti ti-loader-2 spin" /> Yükleniyor</span>
                                    ) : seciliEvrak.takipError ? (
                                        <span className="tracking-chip error"><i className="ti ti-map-off" /> Yok</span>
                                    ) : (
                                        <span className="tracking-chip ok"><i className="ti ti-map-pin" /> Veri Geldi</span>
                                    )}
                                </div>
                            </div>

                            {/* Info grid */}
                            <div className="modal-info-grid">
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-truck" /> Plaka</span>
                                    <strong>{deger(seciliEvrak.plateNumber)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-user" /> Sürücü</span>
                                    <strong>{deger(seciliEvrak.fullName)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-container" /> Treyler</span>
                                    <strong>{deger(seciliEvrak.trailerPlateNumber)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-calendar" /> Sefer Tarihi</span>
                                    <strong>{formatTarih(seciliEvrak.despatchDate)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-map-pin" /> Teslim Noktası</span>
                                    <strong>{deger(seciliEvrak.deliveryAddressCode)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-hash" /> Müşteri Sipariş No</span>
                                    <strong>{deger(seciliEvrak.customerOrderNumber)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-map-pin" /> Son Konum</span>
                                    <strong>{deger(seciliEvrak.takip?.konum || seciliEvrak.takip?.durum)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-clock" /> Takip Tarihi</span>
                                    <strong>{takipTarihFormatla(seciliEvrak.takip?.tarih)}</strong>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label"><i className="ti ti-gauge" /> Hız / Koordinat</span>
                                    <strong>
                                        {seciliEvrak.takip?.hiz ? `${seciliEvrak.takip.hiz} km/s` : "-"}
                                        {seciliEvrak.takip?.lat && seciliEvrak.takip?.lng
                                            ? ` · ${seciliEvrak.takip.lat}, ${seciliEvrak.takip.lng}`
                                            : ""}
                                    </strong>
                                </div>
                            </div>

                            {/* File section */}
                            <div className="modal-files">
                                <div className="modal-files-header">
                                    <div className="mfh-left">
                                        <h3>Evrak Dosyaları</h3>
                                        <span>{seciliEvrak.files?.length || 0} dosya</span>
                                    </div>
                                    <div className="mfh-actions">
                                        {seciliDosya?.hasFile && (
                                            <a
                                                className="btn-light"
                                                href={dosyaUrlOlustur(seciliDosya.fileContent)}
                                                download={`${seciliDosya.documentReferenceNumber}.${dosyaUzantisiBul(seciliDosya.fileContent)}`}
                                            >
                                                <i className="ti ti-download" />
                                                Seçili Dosyayı İndir
                                            </a>
                                        )}
                                        {seciliEvrak.files?.length > 0 && (
                                            <button className="btn-dark" onClick={topluPdfOlustur} disabled={mergeLoading}>
                                                <i className="ti ti-files" />
                                                Toplu Birleştir
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {seciliEvrak.fileContentLoading ? (
                                    <div className="files-placeholder">
                                        <div className="spinner" />
                                        <span>Dosyalar yükleniyor...</span>
                                    </div>
                                ) : seciliEvrak.fileContentError ? (
                                    <div className="files-error">
                                        <i className="ti ti-alert-triangle" />
                                        {seciliEvrak.fileContentError}
                                    </div>
                                ) : (
                                    <div className="modal-files-body">
                                        {/* File tab list */}
                                        <div className="file-list">
                                            {seciliEvrak.files.map((file, index) => (
                                                <button
                                                    key={`${file.documentReferenceNumber}-${index}`}
                                                    className={`file-item ${seciliDosyaIndex === index ? "file-item-active" : ""}`}
                                                    onClick={() => { setSeciliDosyaIndex(index); setBirlesikPdfUrl(""); }}
                                                >
                                                    <span className={`file-type-badge type-${dosyaTipiBul(file.fileContent)}`}>
                                                        {dosyaEtiketiBul(file.fileContent)}
                                                    </span>
                                                    <span className="file-ref">{file.documentReferenceNumber}</span>
                                                    {!file.hasFile && <span className="file-missing">Görsel Yok</span>}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Viewer */}
                                        <div className="file-viewer-area">
                                            {birlesikPdfUrl ? (
                                                <>
                                                    <div className="viewer-toolbar">
                                                        <span className="viewer-title">
                                                            <i className="ti ti-files" /> Birleşik PDF
                                                        </span>
                                                        <a className="btn-dark" href={birlesikPdfUrl} download={`${seciliEvrak.documentNo || "birlesik-evrak"}.pdf`}>
                                                            <i className="ti ti-download" /> İndir
                                                        </a>
                                                    </div>
                                                    <iframe className="file-viewer" src={birlesikPdfUrl} title="Birleşik PDF" />
                                                </>
                                            ) : seciliDosya ? (
                                                <>
                                                    <div className="viewer-toolbar">
                                                        <span className="viewer-title">
                                                            <i className="ti ti-eye" /> {seciliDosya.documentReferenceNumber}
                                                        </span>
                                                    </div>
                                                    {seciliDosya.hasFile
                                                        ? dosyaGoster(seciliDosya, seciliEvrak)
                                                        : <div className="file-empty error"><i className="ti ti-photo-off" /> Görsel bulunamadı.</div>
                                                    }
                                                </>
                                            ) : (
                                                <div className="file-empty">Görüntülemek için sol taraftan dosya seçin.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {takipPanel && (
                <div
                    className="tracking-floating-panel modern"
                    style={{ left: takipPanelPozisyon.x, top: takipPanelPozisyon.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="tracking-panel-header modern" onMouseDown={takipPanelSurukleBaslat}>
                        <div className="tracking-panel-title-wrap">
                            <div className="tracking-panel-icon"><i className="ti ti-truck-delivery" /></div>
                            <div>
                                <span>Araç Takip Paneli</span>
                                <strong>{deger(takipPanel.documentNo)} · {deger(takipPanel.plateNumber)}</strong>
                            </div>
                        </div>
                        <button type="button" onClick={() => setTakipPanel(null)} aria-label="Kapat">
                            <i className="ti ti-x" />
                        </button>
                    </div>

                    <div className="tracking-panel-hero">
                        <div>
                            <span className="hero-label">Kayıt Durumu</span>
                            {takipPanel.takipLoading ? (
                                <strong className="hero-title loading-text">Kontrol ediliyor</strong>
                            ) : takipPanel.takipError ? (
                                <strong className="hero-title no-record">Kayıt Yok</strong>
                            ) : (
                                <strong className="hero-title has-record">Kayıt Var</strong>
                            )}
                            <p>
                                {takipPanel.takipError
                                    ? "Bu sefer için araç takip hareketi bulunamadı."
                                    : `Bu sefer için ${takipPanel.takipListesi?.length || 0} adet takip hareketi listeleniyor.`}
                            </p>
                        </div>
                        <div className="hero-count-card">
                            <span>{takipPanel.takipListesi?.length || 0}</span>
                            <small>hareket</small>
                        </div>
                    </div>

                    <div className="tracking-panel-summary modern">
                        <div>
                            <span>Sürücü</span>
                            <strong>{deger(takipPanel.fullName)}</strong>
                        </div>
                        <div>
                            <span>Son Durum</span>
                            <strong>{seferDurumuBul(seferDurumDegeriBul(takipPanel))}</strong>
                        </div>
                        <div>
                            <span>Son Konum</span>
                            <strong>
                                {takipPanel.takipError
                                    ? "-"
                                    : takipKonumMetni(takipPanel.takipListesi?.[takipPanel.takipListesi.length - 1])}
                            </strong>
                        </div>
                    </div>

                    {takipPanel.takipLoading ? (
                        <div className="tracking-panel-empty modern-empty">
                            <i className="ti ti-loader-2 spin" />
                            Takip verileri yükleniyor...
                        </div>
                    ) : takipPanel.takipError ? (
                        <div className="tracking-panel-empty modern-empty error">
                            <i className="ti ti-map-off" />
                            <strong>Kayıt bulunamadı</strong>
                            <span>Bu sefere ait araç takip hareketi yok.</span>
                        </div>
                    ) : (
                        <div className="tracking-timeline modern">
                            {(takipPanel.takipListesi || []).map((takip, index) => (
                                <div className="tracking-timeline-item modern" key={`${takipTarihDegeri(takip)}-${index}`}>
                                    <div className="tracking-dot modern">{index + 1}</div>
                                    <div className="tracking-item-card modern">
                                        <div className="tracking-item-top modern">
                                            <div>
                                                <strong>{takipDurumMetni(takip)}</strong>
                                                <small>Veri Giriş Tarihi : {takipTarihFormatla(takipTarihDegeri(takip))}</small>
                                            </div>
                                            <span className="movement-badge">Hareket {index + 1}</span>
                                        </div>
                                        <div className="tracking-item-grid">
                                            <div>
                                                <span><i className="ti ti-map-pin" /> Konum</span>
                                                <strong>{takipKonumMetni(takip)}</strong>
                                            </div>
                                            <div>
                                                <span><i className="ti ti-user" /> Oluşturan</span>
                                                <strong>{takipKullaniciMetni(takip)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {buyukGorsel && (
                <div
                    className="image-preview-backdrop"
                    onClick={() => setBuyukGorsel(null)}
                >
                    <div
                        className="image-preview-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="image-preview-header">
                            <strong>{buyukGorsel.title}</strong>

                            <div className="image-preview-actions">
                                <button onClick={() => setGorselZoom((z) => Math.max(1, z - 0.3))}>
                                    -
                                </button>

                                <button onClick={() => setGorselZoom((z) => z + 0.3)}>
                                    +
                                </button>

                                <button onClick={() => {
                                    setBuyukGorsel(null);
                                    setGorselZoom(1);
                                }}>
                                    <i className="ti ti-x" />
                                </button>
                            </div>
                        </div>

                        <div className="image-preview-body">
                            <img
                                src={buyukGorsel.url}
                                alt={buyukGorsel.title}
                                style={{
                                    transform: `scale(${gorselZoom})`,
                                    transformOrigin: "center center"
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default TeslimEvraklari;