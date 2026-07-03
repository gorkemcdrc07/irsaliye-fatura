import { Fragment, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RTooltip,
    LabelList,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { yeniRapor, sayfaEkle, ozetSayfasiEkle, indir } from "./excelExport";
import "./karlilik.css";

// Türkiye il merkezleri (enlem, boylam) — OpenStreetMap üzerinde gösterim için
const IL_KOORDINATLARI = {
    ADANA: [37.0, 35.3213],
    ADIYAMAN: [37.7648, 38.2786],
    AFYONKARAHİSAR: [38.7507, 30.5567],
    AĞRI: [39.7191, 43.0503],
    AMASYA: [40.6499, 35.8353],
    ANKARA: [39.9334, 32.8597],
    ANTALYA: [36.8969, 30.7133],
    ARTVİN: [41.1828, 41.8183],
    AYDIN: [37.8444, 27.8458],
    BALIKESİR: [39.6484, 27.8826],
    BİLECİK: [40.1506, 29.9792],
    BİNGÖL: [38.8855, 40.4988],
    BİTLİS: [38.3938, 42.1232],
    BOLU: [40.7892, 31.6089],
    BURDUR: [37.7203, 30.2908],
    BURSA: [40.1828, 29.0665],
    ÇANAKKALE: [40.1553, 26.4142],
    ÇANKIRI: [40.6013, 33.6134],
    ÇORUM: [40.5506, 34.9556],
    DENİZLİ: [37.7765, 29.0864],
    DİYARBAKIR: [37.9144, 40.2306],
    EDİRNE: [41.6818, 26.5623],
    ELAZIĞ: [38.681, 39.2264],
    ERZİNCAN: [39.75, 39.5],
    ERZURUM: [39.9, 41.27],
    ESKİŞEHİR: [39.7767, 30.5206],
    GAZİANTEP: [37.0662, 37.3833],
    GİRESUN: [40.9128, 38.3895],
    GÜMÜŞHANE: [40.46, 39.48],
    HAKKARİ: [37.5744, 43.7408],
    HATAY: [36.4018, 36.3498],
    ISPARTA: [37.7648, 30.5566],
    MERSİN: [36.8, 34.6333],
    İSTANBUL: [41.0082, 28.9784],
    İZMİR: [38.4237, 27.1428],
    KARS: [40.6013, 43.0975],
    KASTAMONU: [41.3887, 33.7827],
    KAYSERİ: [38.7312, 35.4787],
    KIRKLARELİ: [41.7333, 27.2167],
    KIRŞEHİR: [39.1425, 34.1709],
    KOCAELİ: [40.8533, 29.8815],
    KONYA: [37.8746, 32.4932],
    KÜTAHYA: [39.4242, 29.9833],
    MALATYA: [38.3552, 38.3095],
    MANİSA: [38.6191, 27.4289],
    KAHRAMANMARAŞ: [37.5753, 36.9228],
    MARDİN: [37.3212, 40.7245],
    MUĞLA: [37.2153, 28.3636],
    MUŞ: [38.9462, 41.7539],
    NEVŞEHİR: [38.6939, 34.6857],
    NİĞDE: [37.9667, 34.6833],
    ORDU: [40.9839, 37.8764],
    RİZE: [41.0201, 40.5234],
    SAKARYA: [40.6940, 30.4358],
    SAMSUN: [41.2867, 36.33],
    SİİRT: [37.9333, 41.95],
    SİNOP: [42.0231, 35.1531],
    SİVAS: [39.7477, 37.0179],
    TEKİRDAĞ: [40.9833, 27.5167],
    TOKAT: [40.3167, 36.55],
    TRABZON: [41.0027, 39.7168],
    TUNCELİ: [39.3074, 39.4388],
    ŞANLIURFA: [37.1591, 38.7969],
    UŞAK: [38.6823, 29.4082],
    VAN: [38.4891, 43.4089],
    YOZGAT: [39.8181, 34.8147],
    ZONGULDAK: [41.4564, 31.7987],
    AKSARAY: [38.3687, 34.0370],
    BAYBURT: [40.2552, 40.2249],
    KARAMAN: [37.1759, 33.2287],
    KIRIKKALE: [39.8468, 33.5153],
    BATMAN: [37.8812, 41.1351],
    ŞIRNAK: [37.4187, 42.4918],
    BARTIN: [41.6358, 32.3375],
    ARDAHAN: [41.1105, 42.7022],
    IĞDIR: [39.9167, 44.0333],
    YALOVA: [40.65, 29.2667],
    KARABÜK: [41.2061, 32.6204],
    KİLİS: [36.7184, 37.1212],
    OSMANİYE: [37.075, 36.2475],
    DÜZCE: [40.8438, 31.1565],
};

// Pasta grafiği için döngüsel renk paleti
const PASTA_RENKLERI = [
    "#4F5DF7",
    "#0EA472",
    "#D97A1F",
    "#E5484D",
    "#8B5CF6",
    "#0EA5B7",
    "#EC4899",
    "#84CC16",
    "#FB923C",
    "#14B8A6",
    "#6366F1",
    "#EAB308",
];

function temizle(value) {
    return String(value || "")
        .trim()
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ");
}

function sayiyaCevir(value) {
    if (typeof value === "number") return value;
    if (!value) return 0;

    const clean = String(value)
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, "");

    return Number(clean) || 0;
}

function para(value) {
    return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function kisaPara(value) {
    const abs = Math.abs(value || 0);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₺`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K ₺`;
    return para(value);
}

function kolonBul(row, alternatifler) {
    const keys = Object.keys(row || {});
    return keys.find((key) =>
        alternatifler.some((alt) => temizle(key) === temizle(alt))
    );
}

function kisalt(value, uzunluk = 20) {
    const text = String(value || "");
    return text.length > uzunluk ? `${text.slice(0, uzunluk).trim()}…` : text;
}

function tarihFormatla(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toLocaleDateString("tr-TR");
    }
    return value || "";
}

function dosyaTarihEtiketi() {
    return new Date().toISOString().slice(0, 10);
}

function guvenliDosyaAdi(value) {
    return String(value || "Tedarikci").replace(/[^\p{L}\p{N}]+/gu, "_");
}

// Tedarikçi isimleri uzun olduğunda birbirine girmesin diye kısaltılmış,
// tam adın yalnızca üzerine gelince (title) göründüğü özel eksen etiketi
function TedarikciEkseni({ x, y, payload }) {
    return (
        <g transform={`translate(${x},${y})`}>
            <title>{payload.value}</title>
            <text x={-10} y={0} dy={4} textAnchor="end" fontSize={12} fill="#5B6478">
                {kisalt(payload.value, 18)}
            </text>
        </g>
    );
}

// Panel başlıklarında kullanılan tekil "Excel'e Aktar" butonu
function ExportButton({ onClick, disabled, label = "Aktar" }) {
    return (
        <button
            type="button"
            className="export-btn"
            onClick={onClick}
            disabled={disabled}
            title="Excel'e aktar"
        >
            <i className="ti ti-file-export" />
            {label}
        </button>
    );
}

function Karlilik() {
    const inputRef = useRef(null);
    const [dosyaAdi, setDosyaAdi] = useState("");
    const [hamVeri, setHamVeri] = useState([]);
    const [hata, setHata] = useState("");
    const [yukleniyor, setYukleniyor] = useState(false);

    async function excelOku(file) {
        if (!file) return;

        setHata("");
        setYukleniyor(true);
        setDosyaAdi(file.name);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const json = XLSX.utils.sheet_to_json(worksheet, {
                defval: "",
            });

            if (!json.length) {
                setHamVeri([]);
                setHata("Excel içinde okunabilir veri bulunamadı.");
                return;
            }

            setHamVeri(json);
        } catch (err) {
            console.error(err);
            setHata("Excel okunamadı. Dosya formatını kontrol edin.");
        } finally {
            setYukleniyor(false);
        }
    }

    function onDrop(e) {
        e.preventDefault();
        excelOku(e.dataTransfer.files?.[0]);
    }

    const analiz = useMemo(() => {
        const bos = {
            musteriler: [],
            tedarikciGrafik: [],
            karlilikGrafik: [],
            tedarikciPasta: [],
            tedarikciDetayMap: {},
            harita: [],
            toplamGelir: 0,
            toplamGider: 0,
            toplamKarlilik: 0,
            toplamSefer: 0,
        };

        if (!hamVeri.length) {
            return bos;
        }

        const ilkSatir = hamVeri[0];

        const musteriKolon = kolonBul(ilkSatir, ["Müşteri Adı", "Musteri Adi", "Müşteri"]);
        const tedarikciKolon = kolonBul(ilkSatir, ["Tedarikçi Firma", "Tedarikci Firma", "Tedarikçi Adı"]);
        const gelirKolon = kolonBul(ilkSatir, ["Toplam Gelir", "Gelir", "Hizmet Gelir"]);
        const giderKolon = kolonBul(ilkSatir, ["Toplam Gider", "Gider", "Hizmet Gider"]);
        const karKolon = kolonBul(ilkSatir, ["Toplam Gelir-Gider Farkı", "Karlılık", "Kar", "Fark"]);
        const seferKolon = kolonBul(ilkSatir, ["Sefer No", "Sefer Id", "Sefer ID"]);
        const ilKolon = kolonBul(ilkSatir, ["Teslim ili", "Teslim İl", "Yükleme ili", "Yükleme İl"]);
        const tarihKolon = kolonBul(ilkSatir, ["Sefer Tarihi", "Tarih", "Yükleme Tarihi"]);
        const guzergahKolon = kolonBul(ilkSatir, ["Güzergah", "Guzergah", "Sefer Güzergahı"]);

        if (!musteriKolon || !tedarikciKolon || !gelirKolon || !giderKolon) {
            setHata(
                "Excel kolonları bulunamadı. Gerekli kolonlar: Müşteri Adı, Tedarikçi Firma, Toplam Gelir, Toplam Gider."
            );
            return bos;
        }

        // musteri+tedarikçi ikilisi bazlı grup; her grup kendi sefer kayıtlarını taşır
        const grup = {};
        const tedarikciGrup = {};
        const ilGrup = {};

        hamVeri.forEach((row, index) => {
            const musteri = String(row[musteriKolon] || "Müşteri Yok").trim();
            const tedarikci = String(row[tedarikciKolon] || "Tedarikçi Yok").trim();

            const gelir = sayiyaCevir(row[gelirKolon]);
            const gider = sayiyaCevir(row[giderKolon]);
            const karlilik = karKolon ? sayiyaCevir(row[karKolon]) : gelir - gider;
            const seferNo = seferKolon ? String(row[seferKolon] || index + 1) : String(index + 1);
            const tarih = tarihKolon ? row[tarihKolon] : "";
            const guzergah = guzergahKolon ? row[guzergahKolon] : "";

            const key = `${musteri}___${tedarikci}`;

            if (!grup[key]) {
                grup[key] = {
                    musteri,
                    tedarikci,
                    gelir: 0,
                    gider: 0,
                    karlilik: 0,
                    seferMap: new Map(),
                };
            }

            grup[key].gelir += gelir;
            grup[key].gider += gider;
            grup[key].karlilik += karlilik;

            if (!grup[key].seferMap.has(seferNo)) {
                grup[key].seferMap.set(seferNo, {
                    seferNo,
                    gelir: 0,
                    gider: 0,
                    karlilik: 0,
                    tarih,
                    guzergah,
                });
            }

            const seferKaydi = grup[key].seferMap.get(seferNo);
            seferKaydi.gelir += gelir;
            seferKaydi.gider += gider;
            seferKaydi.karlilik += karlilik;

            if (!tedarikciGrup[tedarikci]) {
                tedarikciGrup[tedarikci] = {
                    tedarikci,
                    seferSayisi: 0,
                    gelir: 0,
                    gider: 0,
                    karlilik: 0,
                };
            }

            tedarikciGrup[tedarikci].seferSayisi += 1;
            tedarikciGrup[tedarikci].gelir += gelir;
            tedarikciGrup[tedarikci].gider += gider;
            tedarikciGrup[tedarikci].karlilik += karlilik;

            if (ilKolon) {
                const iller = String(row[ilKolon] || "")
                    .split(";")
                    .map((x) => temizle(x))
                    .filter(Boolean);

                iller.forEach((il) => {
                    if (!ilGrup[il]) {
                        ilGrup[il] = {
                            il,
                            karlilik: 0,
                            seferSayisi: 0,
                        };
                    }

                    ilGrup[il].karlilik += karlilik / Math.max(iller.length, 1);
                    ilGrup[il].seferSayisi += 1;
                });
            }
        });

        // her musteri+tedarikçi grubunu, sıralı sefer listesiyle birlikte düzleştir
        const grupListesi = Object.values(grup).map((item) => ({
            musteri: item.musteri,
            tedarikci: item.tedarikci,
            gelir: item.gelir,
            gider: item.gider,
            karlilik: item.karlilik,
            seferSayisi: item.seferMap.size,
            seferler: Array.from(item.seferMap.values()).sort((a, b) =>
                a.seferNo.localeCompare(b.seferNo, "tr", { numeric: true })
            ),
        }));

        // benzersiz müşteri listesi; her müşteri altında benzersiz tedarikçiler nest edilir
        const musteriMap = {};

        grupListesi.forEach((item) => {
            if (!musteriMap[item.musteri]) {
                musteriMap[item.musteri] = {
                    musteri: item.musteri,
                    gelir: 0,
                    gider: 0,
                    karlilik: 0,
                    seferSet: new Set(),
                    tedarikciler: [],
                };
            }

            const m = musteriMap[item.musteri];
            m.gelir += item.gelir;
            m.gider += item.gider;
            m.karlilik += item.karlilik;
            item.seferler.forEach((s) => m.seferSet.add(s.seferNo));
            m.tedarikciler.push(item);
        });

        const musteriler = Object.values(musteriMap)
            .map((m) => ({
                ...m,
                seferSayisi: m.seferSet.size,
                tedarikciler: m.tedarikciler.sort((a, b) => b.karlilik - a.karlilik),
            }))
            .sort((a, b) => a.musteri.localeCompare(b.musteri, "tr"));

        // pasta grafiği için TÜM tedarikçiler (limitsiz), gelir payına göre sıralı
        const tedarikciPasta = Object.values(tedarikciGrup).sort((a, b) => b.gelir - a.gelir);

        // her tedarikçi için müşteri kırılımı + sefer detayları (tıklayınca açılan panel için)
        const tedarikciDetayMap = {};

        grupListesi.forEach((item) => {
            if (!tedarikciDetayMap[item.tedarikci]) {
                tedarikciDetayMap[item.tedarikci] = {
                    tedarikci: item.tedarikci,
                    gelir: 0,
                    gider: 0,
                    karlilik: 0,
                    seferSet: new Set(),
                    musteriler: [],
                };
            }

            const t = tedarikciDetayMap[item.tedarikci];
            t.gelir += item.gelir;
            t.gider += item.gider;
            t.karlilik += item.karlilik;
            item.seferler.forEach((s) => t.seferSet.add(s.seferNo));
            t.musteriler.push(item);
        });

        Object.values(tedarikciDetayMap).forEach((t) => {
            t.seferSayisi = t.seferSet.size;
            delete t.seferSet;
            t.musteriler.sort((a, b) => b.karlilik - a.karlilik);
        });

        const tedarikciGrafik = Object.values(tedarikciGrup)
            .sort((a, b) => b.seferSayisi - a.seferSayisi)
            .slice(0, 10);

        const karlilikGrafik = Object.values(tedarikciGrup)
            .sort((a, b) => b.karlilik - a.karlilik)
            .slice(0, 10);

        const harita = Object.values(ilGrup)
            .map((item) => ({
                ...item,
                konum: IL_KOORDINATLARI[item.il],
            }))
            .filter((item) => item.konum)
            .sort((a, b) => b.karlilik - a.karlilik);

        const toplamGelir = grupListesi.reduce((a, b) => a + b.gelir, 0);
        const toplamGider = grupListesi.reduce((a, b) => a + b.gider, 0);
        const toplamKarlilik = grupListesi.reduce((a, b) => a + b.karlilik, 0);
        const toplamSefer = grupListesi.reduce((a, b) => a + b.seferSayisi, 0);

        return {
            musteriler,
            tedarikciGrafik,
            karlilikGrafik,
            tedarikciPasta,
            tedarikciDetayMap,
            harita,
            toplamGelir,
            toplamGider,
            toplamKarlilik,
            toplamSefer,
        };
    }, [hamVeri]);

    const [acikMusteriler, setAcikMusteriler] = useState(() => new Set());
    const [acikTedarikciler, setAcikTedarikciler] = useState(() => new Set());

    function musteriToggle(musteri) {
        setAcikMusteriler((prev) => {
            const next = new Set(prev);
            if (next.has(musteri)) next.delete(musteri);
            else next.add(musteri);
            return next;
        });
    }

    function tedarikciToggle(key) {
        setAcikTedarikciler((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    const [seciliTedarikci, setSeciliTedarikci] = useState(null);
    const [acikModalMusteri, setAcikModalMusteri] = useState(null);

    function modalMusteriToggle(musteri) {
        setAcikModalMusteri((prev) => (prev === musteri ? null : musteri));
    }

    function modalKapat() {
        setSeciliTedarikci(null);
        setAcikModalMusteri(null);
    }

    const tedarikciDetay = seciliTedarikci ? analiz.tedarikciDetayMap[seciliTedarikci] : null;

    const enYuksekMutlakKarlilik = useMemo(
        () => Math.max(1, ...analiz.harita.map((item) => Math.abs(item.karlilik))),
        [analiz.harita]
    );

    // ---- Excel'e aktarma yardımcıları (ExcelJS ile stilli, markalı rapor) --

    function musteriTedarikciSatirlariUret() {
        const detayData = [];
        const seferData = [];

        analiz.musteriler.forEach((m) => {
            m.tedarikciler.forEach((t) => {
                detayData.push({
                    musteri: m.musteri,
                    tedarikci: t.tedarikci,
                    gelir: t.gelir,
                    gider: t.gider,
                    karlilik: t.karlilik,
                    seferSayisi: t.seferSayisi,
                });

                t.seferler.forEach((s) => {
                    seferData.push({
                        musteri: m.musteri,
                        tedarikci: t.tedarikci,
                        seferNo: s.seferNo,
                        tarih: tarihFormatla(s.tarih),
                        guzergah: s.guzergah,
                        gelir: s.gelir,
                        gider: s.gider,
                        karlilik: s.karlilik,
                    });
                });
            });
        });

        return { detayData, seferData };
    }

    // Sayfalar arası ortak kolon tanımları — tek yerden yönetilsin
    const KOLON = {
        tedarikci: { key: "tedarikci", header: "Tedarikçi", type: "text", width: 30 },
        musteri: { key: "musteri", header: "Müşteri", type: "text", width: 28 },
        il: { key: "il", header: "İl", type: "text", width: 22 },
        seferNo: { key: "seferNo", header: "Sefer No", type: "text", width: 14 },
        tarih: { key: "tarih", header: "Tarih", type: "text", width: 14 },
        guzergah: { key: "guzergah", header: "Güzergah", type: "text", width: 28 },
        gelir: { key: "gelir", header: "Gelir", type: "money", width: 18 },
        gider: { key: "gider", header: "Gider", type: "money", width: 18 },
        karlilik: { key: "karlilik", header: "Karlılık", type: "money", width: 18, renkli: true },
        seferSayisi: { key: "seferSayisi", header: "Sefer Sayısı", type: "number", width: 16 },
    };

    async function tedarikciSeferAktar() {
        const wb = yeniRapor();
        sayfaEkle(wb, {
            ad: "Sefer Sayısı",
            baslik: "Tedarikçi Bazlı Sefer Sayısı",
            altBaslik: `İlk ${analiz.tedarikciGrafik.length} tedarikçi · ${new Date().toLocaleDateString("tr-TR")}`,
            kolonlar: [KOLON.tedarikci, KOLON.seferSayisi, KOLON.gelir, KOLON.gider, KOLON.karlilik],
            satirlar: analiz.tedarikciGrafik,
        });
        await indir(wb, `Tedarikci_Sefer_Sayisi_${dosyaTarihEtiketi()}.xlsx`);
    }

    async function tedarikciKarlilikAktar() {
        const wb = yeniRapor();
        sayfaEkle(wb, {
            ad: "Karlılık",
            baslik: "Tedarikçi Bazlı Karlılık",
            altBaslik: `İlk ${analiz.karlilikGrafik.length} tedarikçi · ${new Date().toLocaleDateString("tr-TR")}`,
            kolonlar: [KOLON.tedarikci, KOLON.karlilik, KOLON.gelir, KOLON.gider, KOLON.seferSayisi],
            satirlar: analiz.karlilikGrafik,
        });
        await indir(wb, `Tedarikci_Karlilik_${dosyaTarihEtiketi()}.xlsx`);
    }

    async function pastaAktar() {
        const wb = yeniRapor();
        sayfaEkle(wb, {
            ad: "Gelir Payı",
            baslik: "Tedarikçi Bazlı Gelir Payı",
            altBaslik: `Tüm ${analiz.tedarikciPasta.length} tedarikçi · ${new Date().toLocaleDateString("tr-TR")}`,
            kolonlar: [KOLON.tedarikci, KOLON.gelir, KOLON.gider, KOLON.karlilik, KOLON.seferSayisi],
            satirlar: analiz.tedarikciPasta,
        });
        await indir(wb, `Tedarikci_Gelir_Payi_${dosyaTarihEtiketi()}.xlsx`);
    }

    async function haritaAktar() {
        const wb = yeniRapor();
        sayfaEkle(wb, {
            ad: "İl Bazlı",
            baslik: "Türkiye Haritası — İl Bazlı Karlılık",
            altBaslik: `${analiz.harita.length} il · ${new Date().toLocaleDateString("tr-TR")}`,
            kolonlar: [KOLON.il, KOLON.karlilik, KOLON.seferSayisi],
            satirlar: analiz.harita,
        });
        await indir(wb, `Il_Bazli_Karlilik_${dosyaTarihEtiketi()}.xlsx`);
    }

    async function tabloDetayAktar() {
        if (!analiz.musteriler.length) return;
        const { detayData, seferData } = musteriTedarikciSatirlariUret();

        const wb = yeniRapor();
        sayfaEkle(wb, {
            ad: "Müşteri-Tedarikçi",
            baslik: "Müşteri ve Tedarikçi Karlılık Detayı",
            altBaslik: `${analiz.musteriler.length} müşteri · ${new Date().toLocaleDateString("tr-TR")}`,
            kolonlar: [KOLON.musteri, KOLON.tedarikci, KOLON.gelir, KOLON.gider, KOLON.karlilik, KOLON.seferSayisi],
            satirlar: detayData,
        });
        sayfaEkle(wb, {
            ad: "Sefer Detayı",
            baslik: "Sefer Bazlı Detay",
            altBaslik: `${seferData.length} sefer kaydı`,
            kolonlar: [
                KOLON.musteri,
                KOLON.tedarikci,
                KOLON.seferNo,
                KOLON.tarih,
                KOLON.guzergah,
                KOLON.gelir,
                KOLON.gider,
                KOLON.karlilik,
            ],
            satirlar: seferData,
        });
        await indir(wb, `Musteri_Tedarikci_Detay_${dosyaTarihEtiketi()}.xlsx`);
    }

    async function tumunuAktar() {
        if (!analiz.musteriler.length) return;
        const { detayData, seferData } = musteriTedarikciSatirlariUret();

        const wb = yeniRapor();

        ozetSayfasiEkle(wb, {
            toplamGelir: analiz.toplamGelir,
            toplamGider: analiz.toplamGider,
            toplamKarlilik: analiz.toplamKarlilik,
            toplamSefer: analiz.toplamSefer,
            dosyaAdi,
        });

        sayfaEkle(wb, {
            ad: "Müşteri-Tedarikçi",
            baslik: "Müşteri ve Tedarikçi Karlılık Detayı",
            altBaslik: `${analiz.musteriler.length} müşteri`,
            kolonlar: [KOLON.musteri, KOLON.tedarikci, KOLON.gelir, KOLON.gider, KOLON.karlilik, KOLON.seferSayisi],
            satirlar: detayData,
        });

        sayfaEkle(wb, {
            ad: "Sefer Detayı",
            baslik: "Sefer Bazlı Detay",
            altBaslik: `${seferData.length} sefer kaydı`,
            kolonlar: [
                KOLON.musteri,
                KOLON.tedarikci,
                KOLON.seferNo,
                KOLON.tarih,
                KOLON.guzergah,
                KOLON.gelir,
                KOLON.gider,
                KOLON.karlilik,
            ],
            satirlar: seferData,
        });

        sayfaEkle(wb, {
            ad: "Tedarikçi Bazlı",
            baslik: "Tedarikçi Bazlı Özet",
            altBaslik: `${analiz.tedarikciPasta.length} tedarikçi`,
            kolonlar: [KOLON.tedarikci, KOLON.gelir, KOLON.gider, KOLON.karlilik, KOLON.seferSayisi],
            satirlar: analiz.tedarikciPasta,
        });

        sayfaEkle(wb, {
            ad: "İl Bazlı",
            baslik: "İl Bazlı Karlılık",
            altBaslik: `${analiz.harita.length} il`,
            kolonlar: [KOLON.il, KOLON.karlilik, KOLON.seferSayisi],
            satirlar: analiz.harita,
        });

        await indir(wb, `Karlilik_Analizi_Tam_Rapor_${dosyaTarihEtiketi()}.xlsx`);
    }

    async function tedarikciDetayAktar() {
        if (!tedarikciDetay) return;

        const musteriData = tedarikciDetay.musteriler.map((m) => ({
            musteri: m.musteri,
            gelir: m.gelir,
            gider: m.gider,
            karlilik: m.karlilik,
            seferSayisi: m.seferSayisi,
        }));

        const seferData = [];
        tedarikciDetay.musteriler.forEach((m) => {
            m.seferler.forEach((s) => {
                seferData.push({
                    musteri: m.musteri,
                    seferNo: s.seferNo,
                    tarih: tarihFormatla(s.tarih),
                    guzergah: s.guzergah,
                    gelir: s.gelir,
                    gider: s.gider,
                    karlilik: s.karlilik,
                });
            });
        });

        const wb = yeniRapor();

        sayfaEkle(wb, {
            ad: "Müşteri Kırılımı",
            baslik: `${tedarikciDetay.tedarikci} — Müşteri Kırılımı`,
            altBaslik: `${tedarikciDetay.musteriler.length} müşteri · ${new Date().toLocaleDateString("tr-TR")}`,
            kolonlar: [KOLON.musteri, KOLON.gelir, KOLON.gider, KOLON.karlilik, KOLON.seferSayisi],
            satirlar: musteriData,
        });

        sayfaEkle(wb, {
            ad: "Sefer Detayı",
            baslik: `${tedarikciDetay.tedarikci} — Sefer Detayı`,
            altBaslik: `${seferData.length} sefer kaydı`,
            kolonlar: [KOLON.musteri, KOLON.seferNo, KOLON.tarih, KOLON.guzergah, KOLON.gelir, KOLON.gider, KOLON.karlilik],
            satirlar: seferData,
        });

        await indir(wb, `${guvenliDosyaAdi(tedarikciDetay.tedarikci)}_Detay_${dosyaTarihEtiketi()}.xlsx`);
    }

    // -------------------------------------------------------------------------

    return (
        <main className="karlilik-page">
            <section className="karlilik-header">
                <div className="header-text">
                    <span className="page-badge">
                        <i className="ti ti-chart-line" />
                        Finansal Analiz
                    </span>
                    <h1>Karlılık Analizi</h1>
                    <p>
                        Excel yükleyerek müşteri, tedarikçi, gelir, gider, karlılık
                        ve sefer sayısı bazlı analiz oluşturun — sonuçları gerçek
                        Türkiye haritası üzerinde görün, tek tıkla Excel'e aktarın.
                    </p>
                </div>

                <div className="header-actions">
                    <button className="upload-main-btn" onClick={() => inputRef.current?.click()}>
                        <i className="ti ti-upload" />
                        Excel Yükle
                    </button>

                    <button
                        className="upload-main-btn ghost"
                        onClick={tumunuAktar}
                        disabled={!analiz.musteriler.length}
                    >
                        <i className="ti ti-file-spreadsheet" />
                        Tümünü Excel'e Aktar
                    </button>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    hidden
                    onChange={(e) => excelOku(e.target.files?.[0])}
                />

                <span className="route-line" aria-hidden="true" />
            </section>

            <section
                className="excel-drop-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
            >
                <div className="drop-icon">
                    <i className="ti ti-file-spreadsheet" />
                </div>

                <div>
                    <strong>
                        {dosyaAdi ? dosyaAdi : "Excel dosyasını buraya sürükle veya tıkla"}
                    </strong>
                    <span>
                        Müşteri Adı, Tedarikçi Firma, Toplam Gelir, Toplam Gider kolonları okunur.
                    </span>
                </div>

                {dosyaAdi && <span className="drop-status">Yüklendi</span>}
            </section>

            {hata && (
                <div className="karlilik-alert">
                    <i className="ti ti-alert-circle" />
                    {hata}
                </div>
            )}

            {yukleniyor && (
                <div className="karlilik-loading">
                    <i className="ti ti-loader-2 spin" />
                    Excel analiz ediliyor...
                </div>
            )}

            <section className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon income">
                        <i className="ti ti-arrow-up-right" />
                    </div>
                    <div>
                        <span>Toplam Gelir</span>
                        <strong>{para(analiz.toplamGelir)}</strong>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon expense">
                        <i className="ti ti-arrow-down-right" />
                    </div>
                    <div>
                        <span>Toplam Gider</span>
                        <strong>{para(analiz.toplamGider)}</strong>
                    </div>
                </div>

                <div className={`kpi-card ${analiz.toplamKarlilik < 0 ? "danger" : "success"}`}>
                    <div className={`kpi-icon ${analiz.toplamKarlilik < 0 ? "expense" : "income"}`}>
                        <i className="ti ti-trending-up" />
                    </div>
                    <div>
                        <span>Net Karlılık</span>
                        <strong>{para(analiz.toplamKarlilik)}</strong>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon neutral">
                        <i className="ti ti-route" />
                    </div>
                    <div>
                        <span>Sefer Sayısı</span>
                        <strong>{analiz.toplamSefer}</strong>
                    </div>
                </div>
            </section>

            {analiz.musteriler.length > 0 && (
                <>
                    <section className="analysis-grid">
                        <div className="chart-card">
                            <div className="card-title">
                                <div className="card-title-text">
                                    <h2>Tedarikçi Bazlı Sefer Sayısı</h2>
                                    <span>İlk {analiz.tedarikciGrafik.length} tedarikçi</span>
                                </div>
                                <ExportButton onClick={tedarikciSeferAktar} />
                            </div>

                            <ResponsiveContainer
                                width="100%"
                                height={Math.max(280, analiz.tedarikciGrafik.length * 44 + 40)}
                            >
                                <BarChart
                                    data={analiz.tedarikciGrafik}
                                    layout="vertical"
                                    margin={{ top: 4, right: 36, bottom: 4, left: 4 }}
                                    barCategoryGap="32%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="tedarikci"
                                        width={170}
                                        tick={<TedarikciEkseni />}
                                        stroke="#e2e8f0"
                                        interval={0}
                                    />
                                    <RTooltip
                                        cursor={{ fill: "rgba(79,93,247,0.06)" }}
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                                        labelFormatter={(label) => label}
                                    />
                                    <Bar
                                        dataKey="seferSayisi"
                                        name="Sefer Sayısı"
                                        radius={[0, 8, 8, 0]}
                                        fill="#4F5DF7"
                                        maxBarSize={22}
                                    >
                                        <LabelList
                                            dataKey="seferSayisi"
                                            position="right"
                                            style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <div className="card-title">
                                <div className="card-title-text">
                                    <h2>Tedarikçi Bazlı Karlılık</h2>
                                    <span>İlk {analiz.karlilikGrafik.length} tedarikçi</span>
                                </div>
                                <ExportButton onClick={tedarikciKarlilikAktar} />
                            </div>

                            <ResponsiveContainer
                                width="100%"
                                height={Math.max(280, analiz.karlilikGrafik.length * 44 + 40)}
                            >
                                <BarChart
                                    data={analiz.karlilikGrafik}
                                    layout="vertical"
                                    margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
                                    barCategoryGap="32%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tickFormatter={(v) => kisaPara(v)}
                                        stroke="#94a3b8"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="tedarikci"
                                        width={170}
                                        tick={<TedarikciEkseni />}
                                        stroke="#e2e8f0"
                                        interval={0}
                                    />
                                    <RTooltip
                                        formatter={(value) => para(value)}
                                        cursor={{ fill: "rgba(14,164,114,0.06)" }}
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                                        labelFormatter={(label) => label}
                                    />
                                    <Bar
                                        dataKey="karlilik"
                                        name="Karlılık"
                                        radius={[0, 8, 8, 0]}
                                        fill="#0EA472"
                                        maxBarSize={22}
                                    >
                                        <LabelList
                                            dataKey="karlilik"
                                            position="right"
                                            formatter={(v) => kisaPara(v)}
                                            style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="chart-card pie-card">
                        <div className="card-title">
                            <div className="card-title-text">
                                <h2>Tedarikçi Bazlı Gelir Payı</h2>
                                <span>
                                    Tüm {analiz.tedarikciPasta.length} tedarikçi · detay için tıklayın
                                </span>
                            </div>
                            <ExportButton onClick={pastaAktar} />
                        </div>

                        <div className="pie-layout">
                            <ResponsiveContainer width="100%" height={380}>
                                <PieChart>
                                    <Pie
                                        data={analiz.tedarikciPasta}
                                        dataKey="gelir"
                                        nameKey="tedarikci"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={78}
                                        outerRadius={150}
                                        paddingAngle={0}
                                        stroke="#fff"
                                        strokeWidth={0.4}
                                        isAnimationActive={false}
                                        cursor="pointer"
                                        onClick={(data) => setSeciliTedarikci(data.tedarikci)}
                                    >
                                        {analiz.tedarikciPasta.map((entry, index) => (
                                            <Cell
                                                key={entry.tedarikci}
                                                fill={PASTA_RENKLERI[index % PASTA_RENKLERI.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <RTooltip
                                        formatter={(value, name) => [para(value), name]}
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="pie-legend">
                                {analiz.tedarikciPasta.map((item, index) => (
                                    <button
                                        key={item.tedarikci}
                                        className="pie-legend-item"
                                        onClick={() => setSeciliTedarikci(item.tedarikci)}
                                    >
                                        <span
                                            className="legend-swatch"
                                            style={{ background: PASTA_RENKLERI[index % PASTA_RENKLERI.length] }}
                                        />
                                        <span className="legend-name">{item.tedarikci}</span>
                                        <span className="legend-value">{kisaPara(item.gelir)}</span>
                                        <i className="ti ti-chevron-right legend-arrow" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="map-card">
                        <div className="card-title">
                            <div className="card-title-text">
                                <h2>Türkiye Haritası — Karlılık Dağılımı</h2>
                                <span>Teslim ili / yükleme ili bazlı karlılık · OpenStreetMap</span>
                            </div>
                            <ExportButton onClick={haritaAktar} />
                        </div>

                        <div className="turkiye-map">
                            <MapContainer
                                center={[39.0, 35.2]}
                                zoom={6}
                                scrollWheelZoom={true}
                                style={{ width: "100%", height: "100%" }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {analiz.harita.map((item) => {
                                    const oran = Math.abs(item.karlilik) / enYuksekMutlakKarlilik;
                                    const radius = 6 + oran * 22;
                                    const renk = item.karlilik >= 0 ? "#0EA472" : "#E5484D";

                                    return (
                                        <CircleMarker
                                            key={item.il}
                                            center={item.konum}
                                            radius={radius}
                                            pathOptions={{
                                                color: "#fff",
                                                weight: 1.5,
                                                fillColor: renk,
                                                fillOpacity: 0.75,
                                            }}
                                        >
                                            <LeafletTooltip direction="top" offset={[0, -4]} opacity={1}>
                                                <strong>{item.il}</strong>
                                                <br />
                                                {para(item.karlilik)} · {item.seferSayisi} sefer
                                            </LeafletTooltip>
                                        </CircleMarker>
                                    );
                                })}
                            </MapContainer>
                        </div>

                        <div className="map-legend">
                            <span><i className="legend-dot positive" /> Pozitif karlılık</span>
                            <span><i className="legend-dot negative" /> Negatif karlılık</span>
                            <span className="legend-note">Daire büyüklüğü karlılık büyüklüğünü gösterir</span>
                        </div>

                        <div className="map-list">
                            {analiz.harita.slice(0, 10).map((item) => (
                                <div key={item.il} className="map-list-item">
                                    <strong>{item.il}</strong>
                                    <span className={item.karlilik >= 0 ? "positive-text" : "negative-text"}>
                                        {para(item.karlilik)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="table-card">
                        <div className="card-title">
                            <div className="card-title-text">
                                <h2>Müşteri ve Tedarikçi Karlılık Detayı</h2>
                                <span>{analiz.musteriler.length} benzersiz müşteri</span>
                            </div>
                            <ExportButton onClick={tabloDetayAktar} label="Detayı Aktar" />
                        </div>

                        <p className="table-hint">
                            Detayları görmek için bir müşteriye, sefer bilgilerini görmek için
                            altındaki bir tedarikçiye tıklayın.
                        </p>

                        <div className="table-scroll">
                            <table className="profit-table tree-table">
                                <thead>
                                    <tr>
                                        <th>Müşteri / Tedarikçi</th>
                                        <th>Gelir</th>
                                        <th>Gider</th>
                                        <th>Karlılık</th>
                                        <th>Sefer Sayısı</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {analiz.musteriler.map((m) => {
                                        const musteriAcik = acikMusteriler.has(m.musteri);

                                        return (
                                            <Fragment key={m.musteri}>
                                                <tr
                                                    className="row-musteri"
                                                    onClick={() => musteriToggle(m.musteri)}
                                                >
                                                    <td>
                                                        <span className={`chevron ${musteriAcik ? "open" : ""}`}>
                                                            <i className="ti ti-chevron-right" />
                                                        </span>
                                                        <i className="ti ti-building-store row-icon" />
                                                        {m.musteri}
                                                        <span className="row-sub-count">
                                                            {m.tedarikciler.length} tedarikçi
                                                        </span>
                                                    </td>
                                                    <td>{para(m.gelir)}</td>
                                                    <td>{para(m.gider)}</td>
                                                    <td className={m.karlilik >= 0 ? "positive-text" : "negative-text"}>
                                                        {para(m.karlilik)}
                                                    </td>
                                                    <td>{m.seferSayisi}</td>
                                                </tr>

                                                {musteriAcik &&
                                                    m.tedarikciler.map((t) => {
                                                        const tedarikciKey = `${m.musteri}__${t.tedarikci}`;
                                                        const tedarikciAcik = acikTedarikciler.has(tedarikciKey);

                                                        return (
                                                            <Fragment key={tedarikciKey}>
                                                                <tr
                                                                    className="row-tedarikci"
                                                                    onClick={() => tedarikciToggle(tedarikciKey)}
                                                                >
                                                                    <td>
                                                                        <span
                                                                            className={`chevron level-2 ${tedarikciAcik ? "open" : ""}`}
                                                                        >
                                                                            <i className="ti ti-chevron-right" />
                                                                        </span>
                                                                        <i className="ti ti-truck row-icon" />
                                                                        {t.tedarikci}
                                                                    </td>
                                                                    <td>{para(t.gelir)}</td>
                                                                    <td>{para(t.gider)}</td>
                                                                    <td className={t.karlilik >= 0 ? "positive-text" : "negative-text"}>
                                                                        {para(t.karlilik)}
                                                                    </td>
                                                                    <td>{t.seferSayisi}</td>
                                                                </tr>

                                                                {tedarikciAcik && (
                                                                    <tr className="row-sefer-detail">
                                                                        <td colSpan={5}>
                                                                            <div className="sefer-detail-wrap">
                                                                                <table className="sefer-table">
                                                                                    <thead>
                                                                                        <tr>
                                                                                            <th>Sefer No</th>
                                                                                            <th>Gelir</th>
                                                                                            <th>Gider</th>
                                                                                            <th>Karlılık</th>
                                                                                        </tr>
                                                                                    </thead>

                                                                                    <tbody>
                                                                                        {t.seferler.map((s) => (
                                                                                            <tr key={s.seferNo}>
                                                                                                <td>
                                                                                                    <i className="ti ti-route row-icon" />
                                                                                                    {s.seferNo}
                                                                                                </td>
                                                                                                <td>{para(s.gelir)}</td>
                                                                                                <td>{para(s.gider)}</td>
                                                                                                <td
                                                                                                    className={
                                                                                                        s.karlilik >= 0
                                                                                                            ? "positive-text"
                                                                                                            : "negative-text"
                                                                                                    }
                                                                                                >
                                                                                                    {para(s.karlilik)}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    })}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {!analiz.musteriler.length && !yukleniyor && !hata && (
                <section className="empty-state">
                    <i className="ti ti-file-spreadsheet" />
                    <strong>Henüz veri yok</strong>
                    <span>Analizi görmek için yukarıdan bir Excel dosyası yükleyin.</span>
                </section>
            )}

            {tedarikciDetay && (
                <div className="modal-overlay" onClick={modalKapat}>
                    <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="modal-eyebrow">Tedarikçi Detayı</span>
                                <h3>{tedarikciDetay.tedarikci}</h3>
                            </div>
                            <div className="modal-header-actions">
                                <ExportButton onClick={tedarikciDetayAktar} />
                                <button className="modal-close" onClick={modalKapat}>
                                    <i className="ti ti-x" />
                                </button>
                            </div>
                        </div>

                        <div className="modal-kpis">
                            <div className="modal-kpi">
                                <span>Gelir</span>
                                <strong>{para(tedarikciDetay.gelir)}</strong>
                            </div>
                            <div className="modal-kpi">
                                <span>Gider</span>
                                <strong>{para(tedarikciDetay.gider)}</strong>
                            </div>
                            <div className={`modal-kpi ${tedarikciDetay.karlilik >= 0 ? "success" : "danger"}`}>
                                <span>Karlılık</span>
                                <strong>{para(tedarikciDetay.karlilik)}</strong>
                            </div>
                            <div className="modal-kpi">
                                <span>Sefer</span>
                                <strong>{tedarikciDetay.seferSayisi}</strong>
                            </div>
                        </div>

                        <div className="modal-body">
                            <p className="modal-section-title">
                                Müşteri Bazlı Kırılım
                                <span>{tedarikciDetay.musteriler.length} müşteri</span>
                            </p>

                            <div className="modal-musteri-list">
                                {tedarikciDetay.musteriler.map((m) => {
                                    const acik = acikModalMusteri === m.musteri;

                                    return (
                                        <div key={m.musteri} className="modal-musteri-card">
                                            <button
                                                className="modal-musteri-head"
                                                onClick={() => modalMusteriToggle(m.musteri)}
                                            >
                                                <span className={`chevron ${acik ? "open" : ""}`}>
                                                    <i className="ti ti-chevron-right" />
                                                </span>
                                                <span className="modal-musteri-name">{m.musteri}</span>
                                                <span className="modal-musteri-meta">{m.seferSayisi} sefer</span>
                                                <span className={m.karlilik >= 0 ? "positive-text" : "negative-text"}>
                                                    {para(m.karlilik)}
                                                </span>
                                            </button>

                                            {acik && (
                                                <div className="modal-sefer-list">
                                                    <table className="sefer-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Sefer No</th>
                                                                <th>Gelir</th>
                                                                <th>Gider</th>
                                                                <th>Karlılık</th>
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            {m.seferler.map((s) => (
                                                                <tr key={s.seferNo}>
                                                                    <td>
                                                                        <i className="ti ti-route row-icon" />
                                                                        {s.seferNo}
                                                                    </td>
                                                                    <td>{para(s.gelir)}</td>
                                                                    <td>{para(s.gider)}</td>
                                                                    <td
                                                                        className={
                                                                            s.karlilik >= 0
                                                                                ? "positive-text"
                                                                                : "negative-text"
                                                                        }
                                                                    >
                                                                        {para(s.karlilik)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Karlilik;