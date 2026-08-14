import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { broadcastDataChange } from '../utils/realtimeHelper';
import { saveSiteSetting, getSiteSetting } from '../utils/siteSettingsHelper';
import { Mail, Plus, Search, Eye, Edit, Trash2, Printer, X, Upload, Sparkles, Send, ImageIcon, MessageCircle, Move, Loader2, FileText, CheckCircle2, Clock, AlertCircle, Filter, Building, UserCheck, ShieldAlert, ListOrdered, ZoomIn, ZoomOut, RotateCcw, Maximize2, Download, Calendar, Copy, Database, Save, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

export const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const parseIndonesianDateToIso = (text?: string): string => {
  if (!text) return '';
  const match = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const monthIdx = BULAN_INDONESIA.findIndex(b => b.toLowerCase() === monthName);
    if (monthIdx >= 0) {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(monthIdx + 1).padStart(2, '0');
      return `${year}-${mStr}-${dStr}`;
    }
  }
  return '';
};

export const getSafeIsoDate = (createdAt?: string, tempatTanggal?: string): string => {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const fromText = parseIndonesianDateToIso(tempatTanggal);
  if (fromText) return fromText;
  return new Date().toISOString().split('T')[0];
};

const JENIS_SURAT_TEMPLATES = [
  { 
    id: 'surat_tugas',
    label: 'Surat Tugas / Delegasi', 
    perihal: 'Surat Tugas Pendampingan Atlet',
    isi: `Dalam rangka pengembangan bakat dan peningkatan prestasi atlet, PB Bilibili 162 memandang perlu untuk mengirimkan delegasi pendamping pada kejuaraan bulutangkis yang akan datang.

Dengan ini memberikan tugas kepada personil yang namanya tercantum di bawah ini untuk mendampingi, mengawasi, dan memberikan dukungan teknis kepada atlet PB Bilibili 162 selama berlangsungnya turnamen tersebut.`,
    show_recipient: false,
    show_greetings: false,
    title_override: 'SURAT TUGAS'
  },
  { 
    id: 'surat_izin',
    label: 'Surat Izin / Dispensasi', 
    perihal: 'Permohonan Izin Dispensasi Atlet',
    isi: `Sehubungan dengan akan dilaksanakannya turnamen bulutangkis tingkat daerah/nasional yang akan diikuti oleh atlet kami, maka dengan ini kami memohon kesediaan Bapak/Ibu untuk memberikan izin dispensasi kepada atlet yang bersangkutan.

Kegiatan ini sangat penting bagi perkembangan karir atlet dan membawa nama baik klub serta daerah dalam kancah olahraga bulutangkis.`,
    show_recipient: true,
    show_greetings: true,
    title_override: 'SURAT IZIN / DISPENSASI'
  },
  { 
    id: 'surat_undangan_match',
    label: 'Undangan Match', 
    perihal: 'Undangan Pertandingan Persahabatan (Friendly Match)',
    isi: `Salam olahraga! Dalam upaya mempererat tali silaturahmi antar klub bulutangkis serta sebagai ajang evaluasi hasil latihan para atlet, kami PB Bilibili 162 bermaksud mengundang klub yang Bapak/Ibu pimpin untuk melaksanakan pertandingan persahabatan.

Besar harapan kami agar undangan ini dapat disambut baik demi kemajuan olahraga bulutangkis di wilayah kita.`,
    show_recipient: true,
    show_greetings: true,
    title_override: 'SURAT UNDANGAN'
  },
  { 
    id: 'surat_permohonan',
    label: 'Surat Permohonan', 
    perihal: 'Permohonan Dukungan dan Kerjasama',
    isi: `PB Bilibili 162 senantiasa berkomitmen untuk membina bibit-bibit muda atlet bulutangkis agar mampu berprestasi di tingkat yang lebih tinggi. Untuk mewujudkan hal tersebut, diperlukan dukungan dari berbagai pihak.

Bersama surat ini, kami mengajukan permohonan kerjasama dan dukungan dalam bentuk fasilitas/sponsorship demi kelancaran program pembinaan atlet kami.`,
    show_recipient: true,
    show_greetings: true,
    title_override: 'SURAT PERMOHONAN'
  }
];

const parseLampiranRow = (rawLine: string) => {
  let line = rawLine.trim();
  if (!line) return null;

  // Remove leading numbers if present (e.g., "1. ", "1) ", "[1] ")
  line = line.replace(/^(?:\d+[.)]|\[\d+\])\s*/, '').trim();

  let nama = line;
  let keterangan = '';

  if (line.includes('|')) {
    const parts = line.split('|');
    nama = parts[0].trim();
    keterangan = parts.slice(1).join('|').trim();
  } else if (line.includes('\t')) {
    const parts = line.split('\t');
    nama = parts[0].trim();
    keterangan = parts.slice(1).join(' ').trim();
  } else if (line.includes(' - ')) {
    const parts = line.split(' - ');
    nama = parts[0].trim();
    keterangan = parts.slice(1).join(' - ').trim();
  } else if (line.includes(';')) {
    const parts = line.split(';');
    nama = parts[0].trim();
    keterangan = parts.slice(1).join(';').trim();
  }

  return { nama, keterangan };
};

export const normalizeSuratNomor = (num?: string): string => {
  if (!num) return '';
  return num
    .trim()
    .toUpperCase()
    .replace(/PB[-_]BILIBILI[-_]?162/i, 'PB-BILIBILI162')
    .replace(/\s+/g, '')
    .replace(/\/+/g, '/');
};

export const sanitizeSuratItem = (item: any): any => {
  if (!item) return item;
  const copy = { ...item };
  const perihal = (copy.perihal || '').toLowerCase();
  const rawNomor = (copy.nomor_surat || '').toUpperCase();
  // Standardize Sidrap letter numbering if mislabeled
  if (perihal.includes('tiga lima sidrap') || perihal.includes('sidrap') || (rawNomor.includes('/V/2026') && (rawNomor.includes('002') || rawNomor.includes('003')))) {
    copy.nomor_surat = '003/PB-BILIBILI162/V/2026';
  }
  return copy;
};

export const getSuratDeduplicationKey = (item: any): string => {
  if (!item) return '';
  const sanitized = sanitizeSuratItem(item);
  const perihal = (sanitized.perihal || '').trim().toLowerCase();
  if (perihal.includes('tiga lima sidrap') || perihal.includes('sidrap')) {
    return 'surat_persahabatan_sidrap_003';
  }
  if (perihal.includes('narasumber') || (sanitized.nomor_surat && sanitized.nomor_surat.includes('001/'))) {
    return 'surat_narasumber_kajian_001';
  }
  if (perihal.includes('mengikuti kajian') || (sanitized.nomor_surat && sanitized.nomor_surat.includes('002/PB') && sanitized.nomor_surat.includes('/II/'))) {
    return 'surat_mengikuti_kajian_002';
  }
  if (perihal.includes('mabar arsy') || perihal.includes('surat tugas') || (sanitized.nomor_surat && sanitized.nomor_surat.includes('004/'))) {
    return 'surat_tugas_mabar_004';
  }
  const nomor = normalizeSuratNomor(sanitized.nomor_surat);
  if (nomor && nomor !== '__MASTER_DIGITAL_ASSETS__') {
    return `nomor_${nomor}`;
  }
  const tanggal = (sanitized.tanggal_surat || sanitized.tempat_tanggal || '').trim().toLowerCase();
  if (perihal) {
    return `perihal_${perihal}_${tanggal}`;
  }
  return `id_${sanitized.id || ''}`;
};

export const DEFAULT_TTD_KETUA_URL = "";
export const DEFAULT_TTD_SEKRETARIS_URL = "";
export const DEFAULT_CAP_STEMPEL_URL = "";
export const DEFAULT_LOGO_URL = "/logo_pb_bilibili_162.svg";

export const getValidAssetUrl = (url: string | undefined | null, fallbackUrl: string = "") => {
  if (
    !url || 
    typeof url !== 'string' || 
    url.trim() === '' || 
    url === 'null' || 
    url === 'undefined' || 
    url.includes('vclmzvnyvdfxtvkmurxy.supabase.co') ||
    url.startsWith('data:image/svg+xml;utf8') ||
    url.includes('PB. BILI-BILI 162') ||
    url.includes('rawTtd') ||
    url.includes('rawCap') ||
    (url.startsWith('data:image/svg+xml') && (url.includes('Ketua') || url.includes('Sekretaris') || url.includes('stroke') || url.includes('textPath') || url.includes('PAREPARE')))
  ) {
    return fallbackUrl || "";
  }
  return url;
};

export const getStoredDigitalAssets = () => {
  try {
    const saved = localStorage.getItem('pb_bilibili_digital_assets') || localStorage.getItem('site_setting_digital_assets_surat');
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      return {
        logo_url: getValidAssetUrl(parsed.logo_url, DEFAULT_LOGO_URL),
        ttd_ketua_url: getValidAssetUrl(parsed.ttd_ketua_url, ""),
        ttd_sekretaris_url: getValidAssetUrl(parsed.ttd_sekretaris_url, ""),
        cap_stempel_url: getValidAssetUrl(parsed.cap_stempel_url, ""),
        logo_scale: parsed.logo_scale || 100,
        ttd_ketua_scale: parsed.ttd_ketua_scale || 100,
        ttd_sekretaris_scale: parsed.ttd_sekretaris_scale || 100,
        stempel_scale: parsed.stempel_scale || 100,
        logo_pos: parsed.logo_pos || { x: 0, y: 0 },
        stempel_pos: parsed.stempel_pos || { x: -35, y: 0 },
        ttd_ketua_pos: parsed.ttd_ketua_pos || { x: 0, y: 0 },
        ttd_sekretaris_pos: parsed.ttd_sekretaris_pos || { x: 0, y: 0 },
        nama_ketua: parsed.nama_ketua || 'H. WAWAN',
        nama_sekretaris: parsed.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
      };
    }
  } catch (e) {
    console.error('Error reading stored digital assets:', e);
  }
  return {
    logo_url: DEFAULT_LOGO_URL,
    ttd_ketua_url: "",
    ttd_sekretaris_url: "",
    cap_stempel_url: "",
    logo_scale: 100,
    ttd_ketua_scale: 100,
    ttd_sekretaris_scale: 100,
    stempel_scale: 100,
    logo_pos: { x: 0, y: 0 },
    stempel_pos: { x: -35, y: 0 },
    ttd_ketua_pos: { x: 0, y: 0 },
    ttd_sekretaris_pos: { x: 0, y: 0 },
    nama_ketua: 'H. WAWAN',
    nama_sekretaris: 'H. BARHAMAN MUIN S.AG',
  };
};

export const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`LocalStorage quota exceeded or failed for key "${key}":`, e);
    return false;
  }
};

export const compressImage = (file: File, maxWidth = 600, maxHeight = 600, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    if (file.type === 'image/svg+xml' || file.size < 100 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', quality));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const SEED_SURAT = [
  {
    id: 'seed_surat_1',
    nomor_surat: '001/PB-BILIBILI162/II/2026',
    lampiran: '-',
    perihal: 'Permohonan Menjadi Narasumber (Penceramah) Kajian Ramadan Online',
    tempat_tanggal: 'Parepare, 10 Februari 2026',
    tujuan_yth: 'Al Hafidz Ustadz Prof. Dr. KH. Muamar Bakry, Lc., M.A',
    jabatan_tujuan: 'Rektor UIM Al-Ghazali Makassar',
    alamat_tujuan: 'di Tempat',
    isi_ringkas: 'Sehubungan dengan datangnya Bulan Suci Ramadan 1447 H, kami dari Pengurus PB Bilibili 162 Parepare bermaksud menyelenggarakan Kajian Ramadan Online. Bersama surat ini, kami memohon kesediaan Bapak/Ustadz untuk menjadi Narasumber/Penceramah pada kegiatan tersebut.',
    paragraf_2: 'Besar harapan kami agar Bapak berkenan memenuhi permohonan ini demi kelancaran dan keberkahan kegiatan kajian online yang kami selenggarakan.',
    paragraf_3: 'Demikian permohonan ini kami sampaikan. Atas perhatian dan kesediaan Bapak, kami ucapkan terima kasih.',
    nama_ketua: 'H. WAWAN',
    nama_sekretaris: 'H. BARHAMAN MUIN S.AG',
    ttd_ketua_url: '',
    ttd_sekretaris_url: '',
    cap_stempel_url: '',
    created_at: '2026-02-10T08:00:00.000Z'
  },
  {
    id: 'seed_surat_2',
    nomor_surat: '002/PB-BILIBILI162/II/2026',
    lampiran: '-',
    perihal: 'Permohonan Mengikuti Kajian Ramadan Online',
    tempat_tanggal: 'Parepare, 26 Februari 2026',
    tujuan_yth: 'Seluruh Anggota & Pembina PB Bilibili 162',
    jabatan_tujuan: 'PB Bilibili 162 Parepare',
    alamat_tujuan: 'di Tempat',
    isi_ringkas: 'Dalam rangka menyemarakkan amaliah Bulan Suci Ramadan, pengurus menghimbau dan mengundang seluruh anggota serta pembina PB Bilibili 162 untuk dapat mengikuti Kajian Ramadan Online.',
    paragraf_2: 'Kegiatan ini dilaksanakan secara rutin guna mempererat ukhuwah islamiyah dan menambah wawasan keagamaan seluruh anggota klub.',
    paragraf_3: 'Demikian penyampaian ini kami sampaikan. Atas perhatian dan partisipasi seluruh anggota, kami ucapkan terima kasih.',
    nama_ketua: 'H. WAWAN',
    nama_sekretaris: 'H. BARHAMAN MUIN S.AG',
    ttd_ketua_url: '',
    ttd_sekretaris_url: '',
    cap_stempel_url: '',
    created_at: '2026-02-26T08:00:00.000Z'
  },
  {
    id: 'seed_surat_3',
    nomor_surat: '003/PB-BILIBILI162/V/2026',
    lampiran: '-',
    perihal: 'Undangan Pertandingan Balasan Persahabatan PB Tiga Lima Sidrap',
    tempat_tanggal: 'Parepare, 10 Mei 2026',
    tujuan_yth: 'Pengurus & Atlet PB Tiga Lima Sidrap',
    jabatan_tujuan: 'PB Tiga Lima Sidrap',
    alamat_tujuan: 'di Tempat',
    isi_ringkas: 'Dalam rangka mempererat tali silaturahmi dan menjalin persahabatan antar klub bulutangkis, PB Bilibili 162 Parepare mengundang Pengurus dan Atlet PB Tiga Lima Sidrap untuk hadir dalam Pertandingan Balasan Persahabatan.',
    paragraf_2: 'Kegiatan pertandingan persahabatan ini diharapkan dapat menjadi ajang uji tanding yang sportif dan menyenangkan bagi seluruh atlet.',
    paragraf_3: 'Demikian undangan ini kami sampaikan. Atas perhatian dan perkenan kehadiran Bapak/Ibu/Rekan-rekan, kami ucapkan terima kasih.',
    nama_ketua: 'H. WAWAN',
    nama_sekretaris: 'H. BARHAMAN MUIN S.AG',
    ttd_ketua_url: '',
    ttd_sekretaris_url: '',
    cap_stempel_url: '',
    created_at: '2026-05-10T08:00:00.000Z'
  },
  {
    id: 'seed_surat_4',
    nomor_surat: '004/PB-BILIBILI162/VIII/2026',
    lampiran: '1 Lembar',
    perihal: 'Surat Tugas Manajer, Pelatih dan Atlet pada Mabar Arsy',
    tempat_tanggal: 'Parepare, 6 Agustus 2026',
    tujuan_yth: 'Manajer, Pelatih, dan Atlet PB Bilibili 162',
    jabatan_tujuan: 'PB Bilibili 162 Parepare',
    alamat_tujuan: 'di Tempat',
    isi_ringkas: 'Pengurus PB Bilibili 162 Parepare menerbitkan Surat Tugas Manajer, Pelatih, dan Atlet bagi nama-nama yang tercantum dalam daftar terlampir untuk menjadi perwakilan resmi klub pada ajang tersebut.',
    paragraf_2: 'Penugasan ini bertujuan sebagai sarana pemantapan pembinaan atlet melalui program *sparring* dan uji tanding, guna mengasah mental bertanding serta mengukur kualitas permainan para atlet PB Bilibili 162. Manajer dan pelatih yang ditunjuk diharapkan dapat mengoordinasikan tim secara optimal, menyusun strategi pertandingan dengan matang, serta memastikan seluruh atlet senantiasa menjunjung tinggi nilai sportivitas di dalam maupun di luar lapangan.',
    paragraf_3: 'Demikian surat tugas ini diberikan agar dapat dilaksanakan dengan penuh komitmen dan rasa tanggung jawab. Setelah seluruh rangkaian kegiatan selesai, Manajer Tim diwajibkan menyerahkan laporan hasil pertandingan dan evaluasi performa atlet kepada pengurus klub sebagai bahan acuan pembinaan pada ajang-ajang mendatang.',
    nama_ketua: 'H. WAWAN',
    nama_sekretaris: 'H. BARHAMAN MUIN S.AG',
    ttd_ketua_url: '',
    ttd_sekretaris_url: '',
    cap_stempel_url: '',
    include_lampiran_peserta: true,
    judul_lampiran: 'DAFTAR LAMPIRAN PESERTA',
    lampiran_peserta: `1. H.Ude | Manajer & Pelatih
2. Ali & Mas Ahmad | Pasangan Ganda
3. Abd. Majid & Owan | Pasangan Ganda`,
    created_at: '2026-08-06T08:00:00.000Z'
  }
];

export function KelolaSurat() {
  const [suratList, setSuratList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'png' | 'jpg' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  // Realtime Database Sync States
  const [realtimeSyncStatus, setRealtimeSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'idle'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialModalLoadRef = useRef<boolean>(true);

  const [masukSyncStatus, setMasukSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'idle'>('idle');
  const masukSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMasukInitialRef = useRef<boolean>(true);

  const [logoPos, setLogoPos] = useState({ x: 0, y: 0 });
  const [stempelPos, setStempelPos] = useState({ x: -35, y: 0 });
  const [ttdKetuaPos, setTtdKetuaPos] = useState({ x: 0, y: 0 });
  const [ttdSekretarisPos, setTtdSekretarisPos] = useState({ x: 0, y: 0 });

  const defaultForm = {
    nomor_surat: '',
    lampiran: '-',
    perihal: 'Permohonan Menjadi Narasumber (Penceramah) Kajian Ramadan Online',
    tempat_tanggal: `Parepare, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    created_at: new Date().toISOString(),
    tujuan_yth: 'Al Hafidz Ustadz Prof. Dr. KH. Muamar Bakry, Lc., M.A',
    jabatan_tujuan: 'Rektor UIM Al-Ghazali Makassar',
    isi_surat: `Segala puji bagi Allah SWT atas segala nikmat dan karunia-Nya yang senantiasa menyertai aktivitas kita. Shalawat serta salam semoga tetap tercurah kepada teladan kita Nabi Muhammad SAW, keluarga, serta para sahabatnya.

Dalam rangka menyemarakkan syiar Islam dan memperdalam pemahaman keagamaan di bulan suci Ramadan 1447 H, kami dari PB Bilibili 162 bermaksud menyelenggarakan kegiatan kajian rutin secara daring. Mengingat kapasitas keilmuan dan ketokohan Bapak, kami dengan kerendahan hati memohon kesediaan Bapak untuk menjadi narasumber pada kegiatan tersebut.`,
    hari_tanggal: 'Jumat, 27 Februari 2026',
    waktu: '05.30 - 06.30 WITA',
    tempat_kegiatan: 'Virtual Meeting Zoom',
    tema: 'Ramadan sebagai Madrasah Integritas dan Spiritual',
    nama_ketua: 'H. Wawan',
    nama_sekretaris: 'H. Barhaman Muin S.Ag',
    logo_url: '/logo_pb_bilibili_162.svg', 
    ttd_ketua_url: DEFAULT_TTD_KETUA_URL, 
    ttd_sekretaris_url: DEFAULT_TTD_SEKRETARIS_URL,
    cap_stempel_url: DEFAULT_CAP_STEMPEL_URL,
    logo_scale: 100,
    ttd_ketua_scale: 100,
    ttd_sekretaris_scale: 100,
    stempel_scale: 100,
    show_recipient: true,
    show_greetings: true,
    title_override: '',
    include_lampiran_peserta: false,
    judul_lampiran: 'Daftar Lampiran Peserta',
    lampiran_peserta: ''
  };

  const [formData, setFormData] = useState(defaultForm);

  const [draggingAsset, setDraggingAsset] = useState<'logo' | 'stempel' | 'ttd_ketua' | 'ttd_sekretaris' | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [paperHeight, setPaperHeight] = useState<number>(1123);
  const [selectedAsset, setSelectedAsset] = useState<'logo' | 'stempel' | 'ttd_ketua' | 'ttd_sekretaris' | null>(null);

  useEffect(() => {
    if (!printRef.current) return;
    const updateHeight = () => {
      if (printRef.current) {
        setPaperHeight(printRef.current.offsetHeight || 1123);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(printRef.current);
    return () => observer.disconnect();
  }, [formData, isModalOpen, activeModalTab]);

  const handleResizePointerDown = (
    e: React.PointerEvent,
    assetKey: 'logo_scale' | 'stempel_scale' | 'ttd_ketua_scale' | 'ttd_sekretaris_scale'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialScale = (formData as any)[assetKey] || 100;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      const newScale = Math.min(250, Math.max(30, Math.round(initialScale + delta * 0.8)));
      setFormData(prev => ({ ...prev, [assetKey]: newScale }));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const syncDigitalAssetsFromDatabase = async () => {
    try {
      let masterFromDb: any = null;
      try {
        const { data } = await supabase
          .from('arsip_surat')
          .select('*')
          .eq('nomor_surat', '__MASTER_DIGITAL_ASSETS__')
          .maybeSingle();

        if (data) {
          let extra: any = {};
          if (data.isi_surat) {
            try {
              extra = typeof data.isi_surat === 'string' ? JSON.parse(data.isi_surat) : data.isi_surat;
            } catch (e) {}
          }
          masterFromDb = {
            logo_url: data.logo_url,
            ttd_ketua_url: data.ttd_ketua_url,
            ttd_sekretaris_url: data.ttd_sekretaris_url,
            cap_stempel_url: data.cap_stempel_url,
            nama_ketua: data.nama_ketua || extra.nama_ketua,
            nama_sekretaris: data.nama_sekretaris || extra.nama_sekretaris,
            ...extra
          };
        }
      } catch (e) {
        console.warn('Error fetching master assets from arsip_surat:', e);
      }

      const dbAssets = masterFromDb || (await getSiteSetting('digital_assets_surat'));
      if (dbAssets && typeof dbAssets === 'object') {
        const parsed = typeof dbAssets === 'string' ? JSON.parse(dbAssets) : dbAssets;
        const validAssets = {
          logo_url: getValidAssetUrl(parsed.logo_url, DEFAULT_LOGO_URL),
          ttd_ketua_url: getValidAssetUrl(parsed.ttd_ketua_url, ""),
          ttd_sekretaris_url: getValidAssetUrl(parsed.ttd_sekretaris_url, ""),
          cap_stempel_url: getValidAssetUrl(parsed.cap_stempel_url, ""),
          logo_scale: parsed.logo_scale || 100,
          ttd_ketua_scale: parsed.ttd_ketua_scale || 100,
          ttd_sekretaris_scale: parsed.ttd_sekretaris_scale || 100,
          stempel_scale: parsed.stempel_scale || 100,
          logo_pos: parsed.logo_pos || { x: 0, y: 0 },
          stempel_pos: parsed.stempel_pos || { x: -35, y: 0 },
          ttd_ketua_pos: parsed.ttd_ketua_pos || { x: 0, y: 0 },
          ttd_sekretaris_pos: parsed.ttd_sekretaris_pos || { x: 0, y: 0 },
          nama_ketua: parsed.nama_ketua || 'H. WAWAN',
          nama_sekretaris: parsed.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
        };
        safeLocalStorageSet('pb_bilibili_digital_assets', JSON.stringify(validAssets));
        safeLocalStorageSet('site_setting_digital_assets_surat', JSON.stringify(validAssets));
        return validAssets;
      }
    } catch (e) {
      console.warn('Error syncing digital assets from database:', e);
    }
    return getStoredDigitalAssets();
  };

  const saveMasterDigitalAssetsToDatabase = async (customAssets?: any, showToast = true) => {
    const assetsToSave = customAssets || {
      logo_url: getValidAssetUrl(formData.logo_url, DEFAULT_LOGO_URL),
      ttd_ketua_url: getValidAssetUrl(formData.ttd_ketua_url, ""),
      ttd_sekretaris_url: getValidAssetUrl(formData.ttd_sekretaris_url, ""),
      cap_stempel_url: getValidAssetUrl(formData.cap_stempel_url, ""),
      logo_scale: formData.logo_scale || 100,
      ttd_ketua_scale: formData.ttd_ketua_scale || 100,
      ttd_sekretaris_scale: formData.ttd_sekretaris_scale || 100,
      stempel_scale: formData.stempel_scale || 100,
      logo_pos: logoPos || { x: 0, y: 0 },
      stempel_pos: stempelPos || { x: -35, y: 0 },
      ttd_ketua_pos: ttdKetuaPos || { x: 0, y: 0 },
      ttd_sekretaris_pos: ttdSekretarisPos || { x: 0, y: 0 },
      nama_ketua: formData.nama_ketua || 'H. WAWAN',
      nama_sekretaris: formData.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
    };

    // 1. Simpan ke LocalStorage & site_settings
    safeLocalStorageSet('pb_bilibili_digital_assets', JSON.stringify(assetsToSave));
    safeLocalStorageSet('site_setting_digital_assets_surat', JSON.stringify(assetsToSave));
    try {
      await saveSiteSetting('digital_assets_surat', assetsToSave, 'Aset Digital Kop Surat & TTD PB Bilibili');
    } catch (err) {
      console.warn('saveSiteSetting digital_assets_surat warning:', err);
    }

    // 2. Simpan master config ke table arsip_surat di Supabase
    try {
      const masterRecord = {
        nomor_surat: '__MASTER_DIGITAL_ASSETS__',
        jenis_surat: 'MASTER_CONFIG',
        perihal: 'Master Aset Digital Kop Surat & TTD PB Bilibili',
        nama_ketua: assetsToSave.nama_ketua || 'H. WAWAN',
        nama_sekretaris: assetsToSave.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
        logo_url: assetsToSave.logo_url || '/logo_pb_bilibili_162.svg',
        ttd_ketua_url: assetsToSave.ttd_ketua_url || '',
        ttd_sekretaris_url: assetsToSave.ttd_sekretaris_url || '',
        cap_stempel_url: assetsToSave.cap_stempel_url || '',
        isi_surat: JSON.stringify({
          logo_scale: assetsToSave.logo_scale || 100,
          ttd_ketua_scale: assetsToSave.ttd_ketua_scale || 100,
          ttd_sekretaris_scale: assetsToSave.ttd_sekretaris_scale || 100,
          stempel_scale: assetsToSave.stempel_scale || 100,
          logo_pos: assetsToSave.logo_pos || { x: 0, y: 0 },
          stempel_pos: assetsToSave.stempel_pos || { x: -35, y: 0 },
          ttd_ketua_pos: assetsToSave.ttd_ketua_pos || { x: 0, y: 0 },
          ttd_sekretaris_pos: assetsToSave.ttd_sekretaris_pos || { x: 0, y: 0 },
          nama_ketua: assetsToSave.nama_ketua || 'H. WAWAN',
          nama_sekretaris: assetsToSave.nama_sekretaris || 'H. BARHAMAN MUIN S.AG'
        }),
        status: 'CONFIG'
      };

      await supabase.from('arsip_surat').delete().eq('nomor_surat', '__MASTER_DIGITAL_ASSETS__');
      await supabase.from('arsip_surat').insert([masterRecord]);
    } catch (dbErr) {
      console.warn('Error saving master assets to arsip_surat table:', dbErr);
    }

    // 3. Broadcast realtime
    broadcastDataChange('digital_assets_surat', 'UPDATE', assetsToSave);
    broadcastDataChange('site_settings', 'UPDATE', { key: 'digital_assets_surat', value: assetsToSave });
    broadcastDataChange('arsip_surat', 'UPDATE', { is_master_config: true, ...assetsToSave });
    window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'digital_assets_surat', value: assetsToSave } }));
    window.dispatchEvent(new CustomEvent('table_updated_arsip_surat'));

    // 4. Update local surat list
    setSuratList(prev => prev.map(item => ({
      ...item,
      logo_url: getValidAssetUrl(item.logo_url, assetsToSave.logo_url),
      ttd_ketua_url: getValidAssetUrl(item.ttd_ketua_url, assetsToSave.ttd_ketua_url),
      ttd_sekretaris_url: getValidAssetUrl(item.ttd_sekretaris_url, assetsToSave.ttd_sekretaris_url),
      cap_stempel_url: getValidAssetUrl(item.cap_stempel_url, assetsToSave.cap_stempel_url),
    })));

    if (showToast) {
      Swal.fire({
        title: 'Tersimpan Permanen ke Database! 💾',
        text: 'Cap stempel, tanda tangan Ketua & Sekretaris berhasil disimpan permanen ke database dan dijadikan default untuk semua surat secara realtime.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  // Surat Masuk States
  const [activeTab, setActiveTab] = useState<'keluar' | 'masuk'>('keluar');
  const [suratMasukList, setSuratMasukList] = useState<any[]>([]);
  const [isMasukModalOpen, setIsMasukModalOpen] = useState(false);
  const [editMasukId, setEditMasukId] = useState<string | null>(null);
  const [searchMasuk, setSearchMasuk] = useState('');
  const [masukFilterStatus, setMasukFilterStatus] = useState('semua');
  const [viewFileModalUrl, setViewFileModalUrl] = useState<string | null>(null);

  const defaultSuratMasuk = {
    nomor_surat: '',
    tanggal_diterima: new Date().toISOString().split('T')[0],
    tanggal_surat: new Date().toISOString().split('T')[0],
    pengirim: '',
    perihal: '',
    sifat_surat: 'Biasa',
    disposisi_kepada: 'Ketua PB Bilibili 162',
    status_disposisi: 'Belum Disposisi',
    catatan_disposisi: '',
    file_url: ''
  };

  const [suratMasukForm, setSuratMasukForm] = useState(defaultSuratMasuk);

  const getRomanMonth = (monthIndex: number) => {
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanMonths[monthIndex];
  };

  const handleSendWhatsApp = async (surat: any) => {
    setIsSubmitting(true);
    try {
      // 1. Pastikan data surat di-load dan preview di-render agar printRef.current siap
      setFormData(surat);
      setIsModalOpen(true);
      setActiveModalTab('preview');
      setIsPreviewOnly(true);

      // Tunggu DOM merender printRef.current
      await new Promise(resolve => setTimeout(resolve, 300));

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (surat.include_lampiran_peserta && page1Ref.current && page2Ref.current) {
        const canvas1 = await getCanvasFromElement(page1Ref.current);
        const img1 = canvas1.toDataURL('image/png', 1.0);
        pdf.addImage(img1, 'PNG', 0, 0, pdfWidth, pageHeight);

        const canvas2 = await getCanvasFromElement(page2Ref.current);
        const img2 = canvas2.toDataURL('image/png', 1.0);
        pdf.addPage();
        pdf.addImage(img2, 'PNG', 0, 0, pdfWidth, pageHeight);
      } else {
        const target = page1Ref.current || printRef.current;
        if (!target) throw new Error("Element print tidak ditemukan");
        const canvas = await getCanvasFromElement(target);
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      
      const pdfBlob = pdf.output('blob');
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const ddmmyy = `${dd}${mm}${yy}`;
      const cleanNomor = (surat.nomor_surat || 'arsip').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `Surat_${cleanNomor}_${ddmmyy}.pdf`;
      const localPdfUrl = URL.createObjectURL(pdfBlob);

      let publicUrl = '';
      try {
        const { error: uploadError } = await supabase.storage
          .from('surat-pdf')
          .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl: pUrl } } = supabase.storage
            .from('surat-pdf')
            .getPublicUrl(fileName);
          publicUrl = pUrl;
        }
      } catch (storageErr) {
        console.warn("Storage upload fallback:", storageErr);
      }

      const suratYth = surat.tujuan_yth || '-';
      const suratJabatan = surat.jabatan_tujuan || '';
      const suratPerihal = surat.perihal || '-';
      const suratNomor = surat.nomor_surat || '-';
      const linkToUse = publicUrl || localPdfUrl;

      const defaultMessage = `*UNDANGAN RESMI - PB BILIBILI 162*\n\n` +
        `Yth. *${suratYth}*\n` + 
        `${suratJabatan}\n\n` +
        `Assalamu'alaikum Wr. Wb.\n` +
        `Berikut kami sampaikan surat resmi (Nomor: ${suratNomor}) terkait *${suratPerihal}*.\n\n` +
        `Terima kasih.\n*Admin PB Bilibili 162*`;

      // Mobile-friendly SweetAlert2 dialog for direct PDF / Image file attachment + text message sharing
      const hasLampiran = Boolean(surat.include_lampiran_peserta);
      const { value: actionType } = await Swal.fire({
        title: '📱 Kirim Surat ke WhatsApp (Anti-Buram)',
        html: `
          <div class="text-left text-xs space-y-3 font-sans">
            <!-- Penjelasan Solusi Anti Buram -->
            <div class="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1.5">
              <p class="font-bold text-blue-400 flex items-center gap-1.5 text-[11px]">
                <span>💡 Pilihan Pengiriman Dokumen Resmi</span>
              </p>
              <p class="text-[10px] text-slate-300 leading-relaxed">
                Pilih format dokumen yang ingin dibagikan ke WhatsApp. Semua opsi gambar & PDF telah ditingkatkan ke <b>Resolusi Ultra HD (300+ DPI)</b> agar tulisan tetap tajam & jernih:
              </p>
            </div>

            <!-- Pilihan Opsi Pengiriman -->
            <div class="space-y-2">
              <button id="swal-wa-share-pdf" class="w-full text-left p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 transition-all cursor-pointer">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-emerald-300">📄 1. Bagikan File Dokumen PDF (Paling Direkomendasikan ⭐)</span>
                  <span class="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded font-black">100% BEBAS KOMPRESI</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Format file dokumen PDF asli. Sangat tajam, resmi, dan mudah dicetak di semua jenis HP penerima.</p>
              </button>

              <!-- Opsi Gabungan Dokumen Gambar JPG / PNG -->
              <div class="p-2.5 rounded-xl bg-slate-800/80 border border-white/10 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-amber-300 text-[11px]">🖼️ 2. Bagikan Dokumen Gambar Gabungan (Utuh 2 Halaman)</span>
                  <span class="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">GABUNGAN</span>
                </div>
                <p class="text-[10px] text-slate-400">Seluruh halaman surat & lampiran disambung memanjang ke bawah dalam 1 file resolusi tinggi:</p>
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <button id="swal-wa-share-comb-jpg" class="py-2 px-2.5 rounded-lg bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/40 text-amber-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all">
                    <span>🖼️ Format JPG HD</span>
                  </button>
                  <button id="swal-wa-share-comb-png" class="py-2 px-2.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all">
                    <span>✨ Format PNG Master</span>
                  </button>
                </div>
              </div>

              <!-- Opsi Per Halaman Satuan A4 -->
              <div class="grid ${hasLampiran ? 'grid-cols-2' : 'grid-cols-1'} gap-2">
                <button id="swal-wa-share-img1" class="text-left p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 transition-all cursor-pointer">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-blue-300 text-[11px]">📄 Hal 1 (Surat Utama)</span>
                  </div>
                  <p class="text-[9px] text-slate-400 mt-0.5">Format A4 satuan proporsional.</p>
                </button>

                ${hasLampiran ? `
                  <button id="swal-wa-share-img2" class="text-left p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 transition-all cursor-pointer">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-purple-300 text-[11px]">📋 Hal 2 (Lampiran)</span>
                    </div>
                    <p class="text-[9px] text-slate-400 mt-0.5">Tabel peserta & TTD mandiri.</p>
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Form Nomor & Pesan -->
            <div class="pt-1 border-t border-white/10 space-y-2">
              <div>
                <label class="font-black text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Nomor WhatsApp Tujuan (Opsional)</label>
                <input id="swal-wa-number" class="swal2-input !m-0 !w-full !text-xs !rounded-xl !bg-slate-900 !border-white/20 !text-white !font-bold" placeholder="Contoh: 08123456789 atau 62812..." value="${surat.whatsapp || ''}">
              </div>
              <div>
                <label class="font-black text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Pesan Pengantar WhatsApp</label>
                <textarea id="swal-wa-message" class="swal2-textarea !m-0 !w-full !text-xs !h-24 !rounded-xl !bg-slate-900 !border-white/20 !text-white">${defaultMessage}</textarea>
              </div>
            </div>

            <!-- Petunjuk Manual WA -->
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[10px] space-y-1">
              <p class="font-bold flex items-center gap-1">📌 Tips Mengirim dari Galeri HP:</p>
              <p class="text-slate-300 leading-tight">Jika mengirim gambar lewat WhatsApp, gunakan menu <b>Dokumen</b> (ikon klip kertas 📎 lalu Dokumen) atau tekan tombol <b>HD</b> di pojok atas WhatsApp agar tulisan tidak buram.</p>
            </div>
          </div>
        `,
        focusConfirm: false,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '📤 Bagikan PDF Langsung',
        denyButtonText: '💬 Buka Chat WA Saja',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#10B981',
        denyButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff',
        didOpen: () => {
          const getInputs = () => ({
            phone: (document.getElementById('swal-wa-number') as HTMLInputElement)?.value || '',
            msg: (document.getElementById('swal-wa-message') as HTMLTextAreaElement)?.value || defaultMessage
          });

          document.getElementById('swal-wa-share-pdf')?.addEventListener('click', () => {
            const { phone, msg } = getInputs();
            Swal.close();
            executeWhatsAppAction('share_pdf', phone, msg);
          });
          document.getElementById('swal-wa-share-comb-jpg')?.addEventListener('click', () => {
            const { phone, msg } = getInputs();
            Swal.close();
            executeWhatsAppAction('share_comb_jpg', phone, msg);
          });
          document.getElementById('swal-wa-share-comb-png')?.addEventListener('click', () => {
            const { phone, msg } = getInputs();
            Swal.close();
            executeWhatsAppAction('share_comb_png', phone, msg);
          });
          document.getElementById('swal-wa-share-img1')?.addEventListener('click', () => {
            const { phone, msg } = getInputs();
            Swal.close();
            executeWhatsAppAction('share_img1', phone, msg);
          });
          document.getElementById('swal-wa-share-img2')?.addEventListener('click', () => {
            const { phone, msg } = getInputs();
            Swal.close();
            executeWhatsAppAction('share_img2', phone, msg);
          });
        },
        preConfirm: () => {
          return {
            type: 'share_pdf',
            phone: (document.getElementById('swal-wa-number') as HTMLInputElement)?.value || '',
            message: (document.getElementById('swal-wa-message') as HTMLTextAreaElement)?.value || defaultMessage
          };
        },
        preDeny: () => {
          return {
            type: 'wa_text_only',
            phone: (document.getElementById('swal-wa-number') as HTMLInputElement)?.value || '',
            message: (document.getElementById('swal-wa-message') as HTMLTextAreaElement)?.value || defaultMessage
          };
        }
      });

      const executeWhatsAppAction = async (actionTypeStr: string, phoneInput: string, msgInput: string) => {
        try {
          await navigator.clipboard.writeText(msgInput);
        } catch (e) {}

        let cleanPhone = phoneInput.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '62' + cleanPhone.substring(1);
        }
        const encodedMsg = encodeURIComponent(msgInput);
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

        if (actionTypeStr === 'share_pdf') {
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: suratPerihal,
                text: msgInput,
                files: [file]
              });
              return;
            } catch (err: any) {
              if (err.name === 'AbortError') return;
            }
          }

          // Fallback download PDF + open WA
          const a = document.createElement('a');
          a.href = localPdfUrl;
          a.download = fileName;
          a.click();
          window.open(waUrl, '_blank');
          Swal.fire({
            icon: 'success',
            title: 'File PDF Diunduh & Chat WA Terbuka',
            html: '<p class="text-xs">Lampirkan file PDF yang baru saja diunduh ke chat WhatsApp. Teks pengantar sudah otomatis tersalin ke Clipboard.</p>',
            confirmButtonColor: '#25D366',
            background: '#0F172A',
            color: '#fff'
          });
        } else if (actionTypeStr.startsWith('share_comb') || actionTypeStr === 'share_img1' || actionTypeStr === 'share_img2') {
          const isComb = actionTypeStr.startsWith('share_comb');
          const isJpg = actionTypeStr.endsWith('jpg');
          const format = isJpg ? 'jpg' : 'png';
          const mimeType = isJpg ? 'image/jpeg' : 'image/png';
          const ext = isJpg ? 'jpg' : 'png';

          let targetEl: HTMLElement | null = null;
          let suffix = '';
          if (actionTypeStr === 'share_img2') {
            targetEl = page2Ref.current;
            suffix = '_Hal2';
          } else if (actionTypeStr === 'share_img1') {
            targetEl = page1Ref.current || printRef.current;
            suffix = '_Hal1';
          } else {
            // Combined document
            targetEl = printRef.current;
            suffix = '_Gabungan';
          }

          if (!targetEl) throw new Error("Halaman surat tidak ditemukan.");

          const canvas = await getCanvasFromElement(targetEl);
          const imgName = `Surat_PB162_${cleanNomor}${suffix}_${ddmmyy}.${ext}`;
          
          const processBlob = async (blob: Blob | null) => {
            if (!blob) throw new Error("Gagal memproses gambar.");
            const imgFile = new File([blob], imgName, { type: mimeType });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [imgFile] })) {
              try {
                await navigator.share({
                  title: suratPerihal,
                  text: msgInput,
                  files: [imgFile]
                });
                return;
              } catch (err: any) {
                if (err.name === 'AbortError') return;
              }
            }

            // Fallback download image + open WA
            const imgUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = imgUrl;
            a.download = imgName;
            a.click();
            window.open(waUrl, '_blank');
            Swal.fire({
              icon: 'success',
              title: `Dokumen Gambar ${ext.toUpperCase()} Tersimpan!`,
              html: `<p class="text-xs">Gambar <b>${imgName}</b> telah diunduh. Kirim gambar ini via WhatsApp (pilih <b>Dokumen</b> atau aktifkan tombol <b>HD</b> di WhatsApp) agar teks tidak buram.</p>`,
              confirmButtonColor: '#25D366',
              background: '#0F172A',
              color: '#fff'
            });
          };

          if (isJpg) {
            // Render to white background canvas for high quality JPEG
            const outCanvas = document.createElement('canvas');
            outCanvas.width = canvas.width;
            outCanvas.height = canvas.height;
            const ctx = outCanvas.getContext('2d', { alpha: false });
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
              ctx.drawImage(canvas, 0, 0);
              outCanvas.toBlob(processBlob, 'image/jpeg', 0.98);
            } else {
              canvas.toBlob(processBlob, 'image/jpeg', 0.98);
            }
          } else {
            canvas.toBlob(processBlob, 'image/png', 1.0);
          }
        } else {
          // wa_text_only
          window.open(waUrl, '_blank');
        }
      };

      if (actionType) {
        const phone = (actionType as any).phone || '';
        const msg = (actionType as any).message || defaultMessage;
        executeWhatsAppAction((actionType as any).type, phone, msg);
      }
    } catch (error: any) {
      console.error("Gagal mengirim WhatsApp:", error);
      Swal.fire('Error', error.message || 'Gagal memproses surat untuk WhatsApp', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveSuratToSupabase = async (
    currentFormData: any,
    currentEditId: string | null,
    currentPositions: {
      logoPos: { x: number; y: number };
      stempelPos: { x: number; y: number };
      ttdKetuaPos: { x: number; y: number };
      ttdSekretarisPos: { x: number; y: number };
    }
  ) => {
    const { id, ...rawPayload } = currentFormData as any;
    const isoDateFromText = parseIndonesianDateToIso(rawPayload.tempat_tanggal);
    const resolvedCreatedAt = rawPayload.created_at || (isoDateFromText ? new Date(isoDateFromText + 'T12:00:00.000Z').toISOString() : new Date().toISOString());
    const stored = getStoredDigitalAssets();

    const resolvedLogoUrl = getValidAssetUrl(rawPayload.logo_url, stored.logo_url || DEFAULT_LOGO_URL);
    const resolvedTtdKetuaUrl = getValidAssetUrl(rawPayload.ttd_ketua_url, stored.ttd_ketua_url);
    const resolvedTtdSekreUrl = getValidAssetUrl(rawPayload.ttd_sekretaris_url, stored.ttd_sekretaris_url);
    const resolvedStempelUrl = getValidAssetUrl(rawPayload.cap_stempel_url, stored.cap_stempel_url);

    const extraMetadata = {
      isi_ringkas: rawPayload.isi_ringkas || '',
      paragraf_2: rawPayload.paragraf_2 || '',
      paragraf_3: rawPayload.paragraf_3 || '',
      alamat_tujuan: rawPayload.alamat_tujuan || 'di Tempat',
      logo_pos: currentPositions.logoPos || stored.logo_pos || { x: 0, y: 0 },
      stempel_pos: currentPositions.stempelPos || stored.stempel_pos || { x: -35, y: 0 },
      ttd_ketua_pos: currentPositions.ttdKetuaPos || stored.ttd_ketua_pos || { x: 0, y: 0 },
      ttd_sekretaris_pos: currentPositions.ttdSekretarisPos || stored.ttd_sekretaris_pos || { x: 0, y: 0 },
      logo_scale: rawPayload.logo_scale || stored.logo_scale || 100,
      ttd_ketua_scale: rawPayload.ttd_ketua_scale || stored.ttd_ketua_scale || 100,
      ttd_sekretaris_scale: rawPayload.ttd_sekretaris_scale || stored.ttd_sekretaris_scale || 100,
      stempel_scale: rawPayload.stempel_scale || stored.stempel_scale || 100,
      show_recipient: rawPayload.show_recipient !== false,
      show_greetings: rawPayload.show_greetings !== false,
      title_override: rawPayload.title_override || '',
      include_lampiran_peserta: Boolean(rawPayload.include_lampiran_peserta),
      judul_lampiran: rawPayload.judul_lampiran || 'Daftar Lampiran Peserta',
      lampiran_peserta: rawPayload.lampiran_peserta || '',
      nama_ketua: rawPayload.nama_ketua || stored.nama_ketua || 'H. WAWAN',
      nama_sekretaris: rawPayload.nama_sekretaris || stored.nama_sekretaris || 'H. BARHAMAN MUIN S.AG'
    };

    const fullPayload: any = {
      ...rawPayload,
      created_at: resolvedCreatedAt,
      logo_url: resolvedLogoUrl,
      ttd_ketua_url: resolvedTtdKetuaUrl,
      ttd_sekretaris_url: resolvedTtdSekreUrl,
      cap_stempel_url: resolvedStempelUrl,
      tujuan_instansi: rawPayload.alamat_tujuan || rawPayload.tujuan_instansi || 'di Tempat',
      isi_surat: JSON.stringify(extraMetadata),
      ...extraMetadata
    };

    // Columns that strictly exist in Supabase DB schema for arsip_surat
    const VALID_DB_COLS = [
      'id', 'created_at', 'nomor_surat', 'jenis_surat', 'perihal', 
      'tujuan_instansi', 'isi_surat', 'tanggal_surat', 'file_lampiran', 
      'nama_ketua', 'nama_sekretaris', 'status', 'logo_url', 'ttd_ketua_url', 
      'ttd_sekretaris_url', 'cap_stempel_url', 'lampiran', 'tempat_tanggal', 
      'jabatan_tujuan', 'hari_tanggal', 'waktu', 'tempat_kegiatan', 'tema', 'tujuan_yth'
    ];

    const dbPayload: any = {};
    VALID_DB_COLS.forEach(col => {
      if (fullPayload[col] !== undefined) {
        dbPayload[col] = fullPayload[col];
      }
    });

    let resultId = currentEditId;
    const targetId = resultId || currentEditId || 'local_' + Date.now();
    const localItem = { ...fullPayload, id: targetId, created_at: resolvedCreatedAt };

    // 1. Immediately Save to LocalStorage for zero-latency local availability
    try {
      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      const normTarget = normalizeSuratNomor(localItem.nomor_surat);
      const filteredLocal = localData.filter((i: any) => {
        if (!i) return false;
        if (i.id === targetId || (currentEditId && i.id === currentEditId)) return false;
        if (normTarget && normalizeSuratNomor(i.nomor_surat) === normTarget) return false;
        return true;
      });
      const updated = [localItem, ...filteredLocal];
      safeLocalStorageSet('arsip_surat_local', JSON.stringify(updated));
    } catch (e) {}

    // 2. Broadcast real-time change instantly
    try {
      broadcastDataChange('arsip_surat', 'UPDATE', localItem);
      window.dispatchEvent(new CustomEvent('table_updated_arsip_surat'));
    } catch (e) {}

    // 3. Update global persistent digital assets in local cache
    try {
      if (rawPayload.ttd_ketua_url || rawPayload.ttd_sekretaris_url || rawPayload.cap_stempel_url) {
        const latestAssets = {
          logo_url: resolvedLogoUrl,
          ttd_ketua_url: resolvedTtdKetuaUrl,
          ttd_sekretaris_url: resolvedTtdSekreUrl,
          cap_stempel_url: resolvedStempelUrl,
          logo_scale: extraMetadata.logo_scale,
          ttd_ketua_scale: extraMetadata.ttd_ketua_scale,
          ttd_sekretaris_scale: extraMetadata.ttd_sekretaris_scale,
          stempel_scale: extraMetadata.stempel_scale,
          logo_pos: extraMetadata.logo_pos,
          stempel_pos: extraMetadata.stempel_pos,
          ttd_ketua_pos: extraMetadata.ttd_ketua_pos,
          ttd_sekretaris_pos: extraMetadata.ttd_sekretaris_pos,
          nama_ketua: extraMetadata.nama_ketua,
          nama_sekretaris: extraMetadata.nama_sekretaris
        };
        safeLocalStorageSet('pb_bilibili_digital_assets', JSON.stringify(latestAssets));
        safeLocalStorageSet('site_setting_digital_assets_surat', JSON.stringify(latestAssets));
        saveSiteSetting('digital_assets_surat', latestAssets, 'Aset Digital Kop Surat & TTD PB Bilibili').catch(() => {});
      }
    } catch (e) {}

    // 4. Non-blocking parallel background sync to Supabase & Express API
    const syncPromise = Promise.allSettled([
      // Supabase write
      (async () => {
        try {
          if (currentEditId && !currentEditId.toString().startsWith('local_') && !currentEditId.toString().startsWith('seed_')) {
            await supabase.from('arsip_surat').delete().eq('id', currentEditId);
            const insertWithId = { ...dbPayload, id: currentEditId };
            const { data } = await supabase.from('arsip_surat').insert([insertWithId]).select().single();
            if (data?.id) resultId = data.id;
          } else {
            if (dbPayload.nomor_surat) {
              await supabase.from('arsip_surat').delete().eq('nomor_surat', dbPayload.nomor_surat);
            }
            const { data } = await supabase.from('arsip_surat').insert([dbPayload]).select().single();
            if (data?.id) resultId = data.id;
          }
        } catch (err) {
          console.warn("Background DB sync notice:", err);
        }
      })(),
      // Server API write
      (async () => {
        try {
          await fetch('/api/arsip-surat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localItem)
          });
        } catch (e) {}
      })()
    ]);

    // Timeout guard so function returns targetId in < 250ms
    const quickTimeout = new Promise(resolve => setTimeout(resolve, 200));
    await Promise.race([syncPromise, quickTimeout]);

    return resultId || targetId;
  };

  const fetchSurat = async () => {
    setLoading(true);
    try {
      // Sync master digital assets from database in background
      syncDigitalAssetsFromDatabase().catch(() => {});

      // Parallel fetch from Server API and Supabase with 2.5s timeout
      const serverFetchPromise = fetch('/api/arsip-surat')
        .then(r => r.ok ? r.json() : [])
        .catch(() => []);

      const supabaseFetchPromise = supabase
        .from('arsip_surat')
        .select('*')
        .neq('nomor_surat', '__MASTER_DIGITAL_ASSETS__')
        .order('created_at', { ascending: false })
        .then(r => r.data || [])
        .catch(() => []);

      const [serverRes, supabaseRes] = await Promise.allSettled([serverFetchPromise, supabaseFetchPromise]);
      const serverData: any[] = serverRes.status === 'fulfilled' ? serverRes.value : [];
      const data: any[] = supabaseRes.status === 'fulfilled' ? supabaseRes.value : [];

      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      const deletedIds: string[] = JSON.parse(localStorage.getItem('arsip_surat_deleted') || '[]');
      const storedAssets = getStoredDigitalAssets();

      const parseSuratFromDb = (item: any) => {
        if (!item) return item;
        let extra: any = {};
        if (item.isi_surat && typeof item.isi_surat === 'string' && item.isi_surat.trim().startsWith('{')) {
          try {
            extra = JSON.parse(item.isi_surat);
          } catch (e) {}
        }
        return {
          ...item,
          ...extra,
          isi_ringkas: extra.isi_ringkas || item.isi_ringkas || (item.isi_surat && !item.isi_surat.startsWith('{') ? item.isi_surat : '') || '',
          paragraf_2: extra.paragraf_2 || item.paragraf_2 || '',
          paragraf_3: extra.paragraf_3 || item.paragraf_3 || '',
          alamat_tujuan: extra.alamat_tujuan || item.alamat_tujuan || item.tujuan_instansi || 'di Tempat',
          tujuan_yth: item.tujuan_yth || extra.tujuan_yth || item.tujuan_instansi || '',
          nama_ketua: item.nama_ketua || extra.nama_ketua || storedAssets.nama_ketua || "H. WAWAN",
          nama_sekretaris: item.nama_sekretaris || extra.nama_sekretaris || storedAssets.nama_sekretaris || "H. BARHAMAN MUIN S.AG",
          logo_url: getValidAssetUrl(item.logo_url || extra.logo_url, storedAssets.logo_url || DEFAULT_LOGO_URL),
          logo_scale: extra.logo_scale || item.logo_scale || storedAssets.logo_scale || 100,
          logo_pos: extra.logo_pos || item.logo_pos || storedAssets.logo_pos || { x: 0, y: 0 },
          ttd_ketua_url: getValidAssetUrl(item.ttd_ketua_url || extra.ttd_ketua_url, storedAssets.ttd_ketua_url),
          ttd_sekretaris_url: getValidAssetUrl(item.ttd_sekretaris_url || extra.ttd_sekretaris_url, storedAssets.ttd_sekretaris_url),
          cap_stempel_url: getValidAssetUrl(item.cap_stempel_url || extra.cap_stempel_url, storedAssets.cap_stempel_url),
          ttd_ketua_scale: extra.ttd_ketua_scale || item.ttd_ketua_scale || storedAssets.ttd_ketua_scale || 100,
          ttd_sekretaris_scale: extra.ttd_sekretaris_scale || item.ttd_sekretaris_scale || storedAssets.ttd_sekretaris_scale || 100,
          stempel_scale: extra.stempel_scale || item.stempel_scale || storedAssets.stempel_scale || 100,
          ttd_ketua_pos: extra.ttd_ketua_pos || item.ttd_ketua_pos || storedAssets.ttd_ketua_pos || { x: 0, y: 0 },
          ttd_sekretaris_pos: extra.ttd_sekretaris_pos || item.ttd_sekretaris_pos || storedAssets.ttd_sekretaris_pos || { x: 0, y: 0 },
          stempel_pos: extra.stempel_pos || item.stempel_pos || storedAssets.stempel_pos || { x: -35, y: 0 },
          show_recipient: extra.show_recipient !== undefined ? extra.show_recipient : (item.show_recipient !== undefined ? item.show_recipient : true),
          show_greetings: extra.show_greetings !== undefined ? extra.show_greetings : (item.show_greetings !== undefined ? item.show_greetings : true),
          title_override: extra.title_override || item.title_override || '',
          include_lampiran_peserta: extra.include_lampiran_peserta !== undefined ? extra.include_lampiran_peserta : Boolean(item.include_lampiran_peserta),
          judul_lampiran: extra.judul_lampiran || item.judul_lampiran || 'Daftar Lampiran Peserta',
          lampiran_peserta: extra.lampiran_peserta || item.lampiran_peserta || ''
        };
      };

      const map = new Map<string, any>();

      const addOrMergeSurat = (item: any) => {
        if (!item) return;
        const rawNomor = (item.nomor_surat || '').trim().toUpperCase();
        if (rawNomor === '__MASTER_DIGITAL_ASSETS__' || rawNomor.includes('TEST') || item.jenis_surat === 'MASUK') {
          return;
        }

        const normNomor = normalizeSuratNomor(item.nomor_surat);
        if (
          deletedIds.includes(item.id) || 
          (normNomor && deletedIds.includes(normNomor)) || 
          (item.nomor_surat && deletedIds.includes(item.nomor_surat))
        ) {
          return;
        }

        const key = getSuratDeduplicationKey(item);
        if (!key) return;

        const parsed = parseSuratFromDb(item);

        if (!map.has(key)) {
          map.set(key, parsed);
        } else {
          // Merge best values: keep database UUID if available, keep latest edits
          const existing = map.get(key);
          const isExistingDb = existing.id && !existing.id.toString().startsWith('seed_') && !existing.id.toString().startsWith('local_');
          const isItemDb = parsed.id && !parsed.id.toString().startsWith('seed_') && !parsed.id.toString().startsWith('local_');
          const chosenId = isItemDb ? parsed.id : (isExistingDb ? existing.id : (parsed.id || existing.id));

          map.set(key, {
            ...existing,
            ...parsed,
            id: chosenId,
            isi_ringkas: parsed.isi_ringkas || existing.isi_ringkas || '',
            paragraf_2: parsed.paragraf_2 || existing.paragraf_2 || '',
            paragraf_3: parsed.paragraf_3 || existing.paragraf_3 || '',
            lampiran_peserta: parsed.lampiran_peserta || existing.lampiran_peserta || '',
            ttd_ketua_url: getValidAssetUrl(parsed.ttd_ketua_url || existing.ttd_ketua_url, storedAssets.ttd_ketua_url),
            ttd_sekretaris_url: getValidAssetUrl(parsed.ttd_sekretaris_url || existing.ttd_sekretaris_url, storedAssets.ttd_sekretaris_url),
            cap_stempel_url: getValidAssetUrl(parsed.cap_stempel_url || existing.cap_stempel_url, storedAssets.cap_stempel_url)
          });
        }
      };

      // 1. Base seed templates
      SEED_SURAT.forEach(addOrMergeSurat);

      // 2. Server API JSON store data
      (serverData || []).forEach(addOrMergeSurat);

      // 3. User local custom data
      localData.forEach(addOrMergeSurat);

      // 4. Supabase database data takes ultimate precedence
      (data || []).forEach(addOrMergeSurat);

      const allItems = Array.from(map.values());

      // Ensure STRICT uniqueness of both ID and Nomor Surat
      const seenIds = new Set<string>();
      const seenNomor = new Set<string>();
      const strictlyUnique: any[] = [];

      for (const item of allItems) {
        if (!item) continue;
        const normNom = normalizeSuratNomor(item.nomor_surat);
        const itemId = String(item.id || '');
        if (itemId && seenIds.has(itemId)) {
          continue;
        }
        if (normNom && seenNomor.has(normNom)) {
          continue;
        }
        if (itemId) seenIds.add(itemId);
        if (normNom) seenNomor.add(normNom);
        strictlyUnique.push(item);
      }

      const unique = strictlyUnique.sort((a, b) => {
        const timeA = new Date(a.created_at || a.created_at_time || 0).getTime();
        const timeB = new Date(b.created_at || b.created_at_time || 0).getTime();
        return timeB - timeA;
      });

      setSuratList(unique);
    } catch (err: any) { 
      console.error(err);
      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      const deletedIds: string[] = JSON.parse(localStorage.getItem('arsip_surat_deleted') || '[]');
      const map = new Map<string, any>();
      
      const addFallback = (item: any) => {
        if (!item) return;
        const normNomor = normalizeSuratNomor(item.nomor_surat);
        if (deletedIds.includes(item.id) || (normNomor && deletedIds.includes(normNomor))) return;
        const key = getSuratDeduplicationKey(item);
        if (key && !map.has(key)) map.set(key, item);
      };

      SEED_SURAT.forEach(addFallback);
      localData.forEach(addFallback);

      const seenIds = new Set<string>();
      const seenNomor = new Set<string>();
      const fallbackList: any[] = [];
      for (const item of Array.from(map.values())) {
        if (!item) continue;
        const normNom = normalizeSuratNomor(item.nomor_surat);
        const itemId = String(item.id || '');
        if (itemId && seenIds.has(itemId)) continue;
        if (normNom && seenNomor.has(normNom)) continue;
        if (itemId) seenIds.add(itemId);
        if (normNom) seenNomor.add(normNom);
        fallbackList.push(item);
      }

      const fallbackItems = fallbackList.sort((a, b) => {
        const timeA = new Date(a.created_at || a.created_at_time || 0).getTime();
        const timeB = new Date(b.created_at || b.created_at_time || 0).getTime();
        return timeB - timeA;
      });
      const storedAssets = getStoredDigitalAssets();
      const fallbackRef = fallbackItems.find((i: any) => i.ttd_ketua_url && i.ttd_ketua_url.trim() !== '') || fallbackItems[0];
      const fallbackLogo = getValidAssetUrl(fallbackRef?.logo_url, storedAssets.logo_url);
      const fallbackTtdKetua = getValidAssetUrl(fallbackRef?.ttd_ketua_url, storedAssets.ttd_ketua_url);
      const fallbackTtdSekre = getValidAssetUrl(fallbackRef?.ttd_sekretaris_url, storedAssets.ttd_sekretaris_url);
      const fallbackStempel = getValidAssetUrl(fallbackRef?.cap_stempel_url, storedAssets.cap_stempel_url);

      const sanitizeFallback = (item: any) => ({
        ...item,
        nama_ketua: item.nama_ketua || fallbackRef?.nama_ketua || storedAssets.nama_ketua || "H. WAWAN",
        nama_sekretaris: item.nama_sekretaris || fallbackRef?.nama_sekretaris || storedAssets.nama_sekretaris || "H. BARHAMAN MUIN S.AG",
        logo_url: getValidAssetUrl(item.logo_url, fallbackLogo),
        logo_scale: item.logo_scale || fallbackRef?.logo_scale || storedAssets.logo_scale || 100,
        logo_pos: item.logo_pos || fallbackRef?.logo_pos || storedAssets.logo_pos || { x: 0, y: 0 },
        ttd_ketua_url: getValidAssetUrl(item.ttd_ketua_url, fallbackTtdKetua),
        ttd_sekretaris_url: getValidAssetUrl(item.ttd_sekretaris_url, fallbackTtdSekre),
        cap_stempel_url: getValidAssetUrl(item.cap_stempel_url, fallbackStempel),
        ttd_ketua_scale: item.ttd_ketua_scale || fallbackRef?.ttd_ketua_scale || storedAssets.ttd_ketua_scale || 100,
        ttd_sekretaris_scale: item.ttd_sekretaris_scale || fallbackRef?.ttd_sekretaris_scale || storedAssets.ttd_sekretaris_scale || 100,
        stempel_scale: item.stempel_scale || fallbackRef?.stempel_scale || storedAssets.stempel_scale || 100,
        ttd_ketua_pos: item.ttd_ketua_pos || fallbackRef?.ttd_ketua_pos || storedAssets.ttd_ketua_pos || { x: 0, y: 0 },
        ttd_sekretaris_pos: item.ttd_sekretaris_pos || fallbackRef?.ttd_sekretaris_pos || storedAssets.ttd_sekretaris_pos || { x: 0, y: 0 },
        stempel_pos: item.stempel_pos || fallbackRef?.stempel_pos || storedAssets.stempel_pos || { x: -35, y: 0 }
      });

      setSuratList(fallbackItems.map(sanitizeFallback));
    } finally { setLoading(false); }
  };

  const fetchSuratMasuk = async () => {
    try {
      const { data } = await supabase
        .from('arsip_surat')
        .select('*')
        .eq('jenis_surat', 'MASUK')
        .order('created_at', { ascending: false });

      const localData = JSON.parse(localStorage.getItem('arsip_surat_masuk_local') || '[]');
      const map = new Map();

      const addMasuk = (item: any) => {
        if (!item) return;
        let extra: any = {};
        if (item.isi_surat && typeof item.isi_surat === 'string' && item.isi_surat.startsWith('{')) {
          try { extra = JSON.parse(item.isi_surat); } catch (e) {}
        }
        const parsed = {
          ...item,
          ...extra,
          pengirim: extra.pengirim || item.tujuan_instansi || '',
          file_url: extra.file_url || item.file_lampiran || '',
          status_tindak_lanjut: extra.status_tindak_lanjut || item.status || 'Belum Ditindaklanjuti',
          sifat_surat: extra.sifat_surat || 'Biasa',
          disposisi_kepada: extra.disposisi_kepada || 'Ketua PB Bilibili 162',
          catatan_disposisi: extra.catatan_disposisi || '',
          tanggal_diterima: extra.tanggal_diterima || item.tanggal_surat || new Date().toISOString().split('T')[0]
        };
        const key = parsed.nomor_surat ? normalizeSuratNomor(parsed.nomor_surat) : (parsed.id || `${parsed.perihal}_${parsed.pengirim}`);
        if (key) map.set(key, parsed);
      };

      localData.forEach(addMasuk);
      (data || []).forEach(addMasuk);

      const seenMasukIds = new Set<string>();
      const strictlyUniqueMasuk: any[] = [];
      for (const item of Array.from(map.values())) {
        if (!item) continue;
        const idStr = String(item.id || item.nomor_surat || '');
        if (idStr && seenMasukIds.has(idStr)) continue;
        if (idStr) seenMasukIds.add(idStr);
        strictlyUniqueMasuk.push(item);
      }

      setSuratMasukList(strictlyUniqueMasuk);
    } catch (err) {
      const localData = JSON.parse(localStorage.getItem('arsip_surat_masuk_local') || '[]');
      setSuratMasukList(localData);
    }
  };

  useEffect(() => { 
    fetchSurat(); 
    fetchSuratMasuk();

    // Subscribe to real-time changes in Supabase for site_settings (Aset Digital Surat)
    const channelSettings = supabase
      .channel('realtime_site_settings_surat_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload: any) => {
          if (payload?.new?.key === 'digital_assets_surat' || payload?.key === 'digital_assets_surat') {
            fetchSurat();
          }
        }
      )
      .subscribe();

    // Subscribe to real-time changes in Supabase for arsip_surat
    const channelSurat = supabase
      .channel('realtime_arsip_surat_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arsip_surat' },
        () => {
          fetchSurat();
        }
      )
      .subscribe();

    // Subscribe to real-time changes in Supabase for arsip_surat_masuk
    const channelSuratMasuk = supabase
      .channel('realtime_arsip_surat_masuk_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arsip_surat_masuk' },
        () => {
          fetchSuratMasuk();
        }
      )
      .subscribe();

    const handleRealtimeSync = (e: any) => {
      if (!e || !e.detail || e.detail.table === 'arsip_surat' || e.detail.key === 'arsip_surat' || e.detail.table === 'site_settings' || e.detail.key === 'digital_assets_surat' || !e.detail.table) {
        fetchSurat();
      }
    };

    window.addEventListener('app_data_changed', handleRealtimeSync);
    window.addEventListener('table_updated_arsip_surat', handleRealtimeSync);
    window.addEventListener('site_setting_updated', handleRealtimeSync);
    window.addEventListener('focus', fetchSurat);
    window.addEventListener('online', fetchSurat);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchSurat();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channelSettings);
      supabase.removeChannel(channelSurat);
      supabase.removeChannel(channelSuratMasuk);
      window.removeEventListener('app_data_changed', handleRealtimeSync);
      window.removeEventListener('table_updated_arsip_surat', handleRealtimeSync);
      window.removeEventListener('site_setting_updated', handleRealtimeSync);
      window.removeEventListener('focus', fetchSurat);
      window.removeEventListener('online', fetchSurat);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Debounced Realtime Auto-Save for Surat Keluar
  useEffect(() => {
    if (!isModalOpen || isPreviewOnly) return;

    if (isInitialModalLoadRef.current) {
      isInitialModalLoadRef.current = false;
      return;
    }

    setRealtimeSyncStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const dbId = await saveSuratToSupabase(formData, editId, {
          logoPos,
          stempelPos,
          ttdKetuaPos,
          ttdSekretarisPos
        });
        if (dbId && dbId !== editId) {
          setEditId(dbId);
        }
        setRealtimeSyncStatus('synced');
      } catch (err) {
        console.warn('Realtime auto-save error:', err);
        setRealtimeSyncStatus('offline');
      }
    }, 750);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, logoPos, stempelPos, ttdKetuaPos, ttdSekretarisPos, isModalOpen, isPreviewOnly]);

  // Debounced Realtime Auto-Save for Surat Masuk
  useEffect(() => {
    if (!isMasukModalOpen) return;

    if (isMasukInitialRef.current) {
      isMasukInitialRef.current = false;
      return;
    }

    setMasukSyncStatus('saving');

    if (masukSaveTimeoutRef.current) {
      clearTimeout(masukSaveTimeoutRef.current);
    }

    masukSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const { id, created_at, ...payload } = suratMasukForm as any;
        if (!payload.nomor_surat && !payload.pengirim && !payload.perihal) return;

        const dbRecord = {
          nomor_surat: payload.nomor_surat,
          jenis_surat: 'MASUK',
          perihal: payload.perihal,
          tujuan_instansi: payload.pengirim,
          tanggal_surat: payload.tanggal_surat,
          file_lampiran: payload.file_url || null,
          status: payload.status_tindak_lanjut || 'MASUK',
          isi_surat: JSON.stringify(payload)
        };

        if (editMasukId && !editMasukId.toString().startsWith('local_')) {
          await supabase.from('arsip_surat').delete().eq('id', editMasukId);
          const { data } = await supabase.from('arsip_surat').insert([{ ...dbRecord, id: editMasukId }]).select().single();
          if (data?.id) setEditMasukId(data.id);
        } else {
          if (dbRecord.nomor_surat) {
            await supabase.from('arsip_surat').delete().eq('nomor_surat', dbRecord.nomor_surat).eq('jenis_surat', 'MASUK');
          }
          const { data } = await supabase.from('arsip_surat').insert([dbRecord]).select().single();
          if (data?.id) {
            setEditMasukId(data.id);
          }
        }
        setMasukSyncStatus('synced');
      } catch (err) {
        setMasukSyncStatus('offline');
      }
    }, 750);

    return () => {
      if (masukSaveTimeoutRef.current) clearTimeout(masukSaveTimeoutRef.current);
    };
  }, [suratMasukForm, isMasukModalOpen]);

  const prepareNewSuratMasuk = () => {
    setEditMasukId(null);
    setSuratMasukForm(defaultSuratMasuk);
    isMasukInitialRef.current = true;
    setIsMasukModalOpen(true);
  };

  const handleEditSuratMasuk = (surat: any) => {
    setEditMasukId(surat.id);
    setSuratMasukForm(surat);
    isMasukInitialRef.current = true;
    setIsMasukModalOpen(true);
  };

  const handleSaveSuratMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suratMasukForm.nomor_surat || !suratMasukForm.pengirim || !suratMasukForm.perihal) {
      Swal.fire('Peringatan', 'Mohon lengkapi Nomor Surat, Pengirim, dan Perihal.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const { id, created_at, ...payload } = suratMasukForm as any;

    const dbRecord = {
      nomor_surat: payload.nomor_surat,
      jenis_surat: 'MASUK',
      perihal: payload.perihal,
      tujuan_instansi: payload.pengirim,
      tanggal_surat: payload.tanggal_surat,
      file_lampiran: payload.file_url || null,
      status: payload.status_tindak_lanjut || 'MASUK',
      isi_surat: JSON.stringify(payload)
    };

    // Optimistic UI updates
    const localData = JSON.parse(localStorage.getItem('arsip_surat_masuk_local') || '[]');
    let updatedLocal: any[] = [];
    if (editMasukId) {
      updatedLocal = localData.map((item: any) => item.id === editMasukId ? { ...item, ...payload } : item);
      setSuratMasukList(prev => prev.map(item => item.id === editMasukId ? { ...item, ...payload } : item));
    } else {
      const newItem = { ...payload, id: 'local_' + Date.now(), created_at: new Date().toISOString() };
      updatedLocal = [newItem, ...localData];
      setSuratMasukList(prev => [newItem, ...prev]);
    }

    safeLocalStorageSet('arsip_surat_masuk_local', JSON.stringify(updatedLocal));
    setIsMasukModalOpen(false);
    setIsSubmitting(false);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: editMasukId ? 'Surat masuk berhasil diperbarui!' : 'Surat masuk berhasil dicatat!',
      showConfirmButton: false,
      timer: 2000
    });

    // Background database sync
    try {
      if (editMasukId) {
        await supabase.from('arsip_surat').delete().eq('id', editMasukId);
        await supabase.from('arsip_surat').insert([{ ...dbRecord, id: editMasukId }]);
      } else {
        if (dbRecord.nomor_surat) {
          await supabase.from('arsip_surat').delete().eq('nomor_surat', dbRecord.nomor_surat).eq('jenis_surat', 'MASUK');
        }
        await supabase.from('arsip_surat').insert([dbRecord]);
      }
      fetchSuratMasuk().catch(() => {});
    } catch (err: any) {
      console.warn("Background surat masuk save error:", err);
    }
  };

  const handleDeleteSuratMasuk = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Surat Masuk?',
      text: 'Data arsip surat masuk akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    if (res.isConfirmed) {
      // Optimistic delete
      setSuratMasukList(prev => prev.filter(i => i.id !== id));
      const localData = JSON.parse(localStorage.getItem('arsip_surat_masuk_local') || '[]');
      safeLocalStorageSet('arsip_surat_masuk_local', JSON.stringify(localData.filter((i: any) => i.id !== id)));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Surat masuk berhasil dihapus.',
        showConfirmButton: false,
        timer: 2000
      });

      try {
        await supabase.from('arsip_surat').delete().eq('id', id);
        fetchSuratMasuk().catch(() => {});
      } catch (err: any) {
        console.warn("Background delete surat masuk error:", err);
      }
    }
  };

  const handleMasukFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSuratMasukForm(prev => ({ ...prev, file_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNextNomorSurat = (list: any[], customDate: Date = new Date()) => {
    const currentYear = customDate.getFullYear().toString();
    const currentMonthRoman = getRomanMonth(customDate.getMonth());

    let maxNum = 0;
    let orgCode = 'PB-BILIBILI162';

    if (Array.isArray(list) && list.length > 0) {
      list.forEach((s) => {
        if (!s || !s.nomor_surat) return;
        const parts = s.nomor_surat.split('/');
        if (parts.length >= 2) {
          const numPart = parseInt(parts[0], 10);
          if (parts[1] && parts[1].trim()) {
            orgCode = parts[1].trim();
          }
          if (!isNaN(numPart)) {
            const itemYear = parts[parts.length - 1];
            if (!itemYear || itemYear.trim() === currentYear) {
              if (numPart > maxNum) maxNum = numPart;
            } else if (numPart > maxNum) {
              maxNum = numPart;
            }
          }
        }
      });
    }

    const nextPadded = (maxNum + 1).toString().padStart(3, '0');
    return `${nextPadded}/${orgCode}/${currentMonthRoman}/${currentYear}`;
  };

  const handleApplyAssetsToAllSurat = async () => {
    await saveMasterDigitalAssetsToDatabase(null, true);
  };

  const handleClearAllDatabaseSignatures = async () => {
    const result = await Swal.fire({
      title: 'Hapus Seluruh Stempel & TTD?',
      text: 'Seluruh tanda tangan Ketua, tanda tangan Sekretaris, dan cap stempel pada DATABASE & arsip surat akan dihapus/dikosongkan secara permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua Dari Database',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      // 1. Reset current form
      setFormData(prev => ({
        ...prev,
        ttd_ketua_url: '',
        ttd_sekretaris_url: '',
        cap_stempel_url: ''
      }));

      // 2. Clear global stored digital assets in site_settings and localStorage
      const clearedAssets = {
        logo_url: DEFAULT_LOGO_URL,
        ttd_ketua_url: '',
        ttd_sekretaris_url: '',
        cap_stempel_url: '',
        logo_scale: 100,
        ttd_ketua_scale: 100,
        ttd_sekretaris_scale: 100,
        stempel_scale: 100,
        logo_pos: { x: 0, y: 0 },
        stempel_pos: { x: -35, y: 0 },
        ttd_ketua_pos: { x: 0, y: 0 },
        ttd_sekretaris_pos: { x: 0, y: 0 },
        nama_ketua: 'H. WAWAN',
        nama_sekretaris: 'H. BARHAMAN MUIN S.AG'
      };

      await saveMasterDigitalAssetsToDatabase(clearedAssets, false);

      // 3. Clear local storage surat
      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      const updatedLocal = localData.map((item: any) => ({
        ...item,
        ttd_ketua_url: '',
        ttd_sekretaris_url: '',
        cap_stempel_url: ''
      }));
      safeLocalStorageSet('arsip_surat_local', JSON.stringify(updatedLocal));

      // 4. Update in Supabase database
      try {
        const { data: allDbSurat } = await supabase.from('arsip_surat').select('id');
        if (allDbSurat && allDbSurat.length > 0) {
          for (const row of allDbSurat) {
            await supabase.from('arsip_surat').update({
              ttd_ketua_url: '',
              ttd_sekretaris_url: '',
              cap_stempel_url: ''
            }).eq('id', row.id);
          }
        }
      } catch (dbErr) {
        console.warn('Supabase clear error:', dbErr);
      }

      // 5. Update state
      setSuratList(prev => prev.map(item => ({
        ...item,
        ttd_ketua_url: '',
        ttd_sekretaris_url: '',
        cap_stempel_url: ''
      })));

      broadcastDataChange('arsip_surat', 'UPDATE', { cleared_all_signatures: true });
      window.dispatchEvent(new CustomEvent('table_updated_arsip_surat'));

      Swal.fire({
        title: 'Berhasil Dihapus Dari Database!',
        text: 'Seluruh stempel & tanda tangan telah dihapus bersih dari database & sistem.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const prepareNewSurat = () => {
    setEditId(null);
    setIsPreviewOnly(false);
    setActiveModalTab('form');

    const storedAssets = getStoredDigitalAssets();
    // Sort suratList by newest created_at to find the most recent letter
    const sortedLetters = [...suratList].sort((a, b) => {
      const timeA = new Date(a.created_at || a.created_at_time || 0).getTime();
      const timeB = new Date(b.created_at || b.created_at_time || 0).getTime();
      return timeB - timeA;
    });
    const lastSurat = sortedLetters.length > 0 ? sortedLetters[0] : null;

    const resolvedLogoUrl = getValidAssetUrl(lastSurat?.logo_url, storedAssets.logo_url);
    const resolvedTtdKetuaUrl = getValidAssetUrl(lastSurat?.ttd_ketua_url, storedAssets.ttd_ketua_url || "");
    const resolvedTtdSekreUrl = getValidAssetUrl(lastSurat?.ttd_sekretaris_url, storedAssets.ttd_sekretaris_url || "");
    const resolvedStempelUrl = getValidAssetUrl(lastSurat?.cap_stempel_url, storedAssets.cap_stempel_url || "");

    const resolvedLogoPos = lastSurat?.logo_pos || storedAssets.logo_pos || { x: 0, y: 0 };
    const resolvedStempelPos = lastSurat?.stempel_pos || storedAssets.stempel_pos || { x: -35, y: 0 };
    const resolvedTtdKetuaPos = lastSurat?.ttd_ketua_pos || storedAssets.ttd_ketua_pos || { x: 0, y: 0 };
    const resolvedTtdSekrePos = lastSurat?.ttd_sekretaris_pos || storedAssets.ttd_sekretaris_pos || { x: 0, y: 0 };

    setLogoPos(resolvedLogoPos);
    setStempelPos(resolvedStempelPos);
    setTtdKetuaPos(resolvedTtdKetuaPos);
    setTtdSekretarisPos(resolvedTtdSekrePos);

    const newFullNomor = generateNextNomorSurat(suratList);

    setFormData({
      ...defaultForm,
      nomor_surat: newFullNomor,
      logo_url: resolvedLogoUrl,
      ttd_ketua_url: resolvedTtdKetuaUrl,
      ttd_sekretaris_url: resolvedTtdSekreUrl,
      cap_stempel_url: resolvedStempelUrl,
      logo_scale: lastSurat?.logo_scale || storedAssets.logo_scale || 100,
      ttd_ketua_scale: lastSurat?.ttd_ketua_scale || storedAssets.ttd_ketua_scale || 100,
      ttd_sekretaris_scale: lastSurat?.ttd_sekretaris_scale || storedAssets.ttd_sekretaris_scale || 100,
      stempel_scale: lastSurat?.stempel_scale || storedAssets.stempel_scale || 100,
      nama_ketua: lastSurat?.nama_ketua || storedAssets.nama_ketua || defaultForm.nama_ketua,
      nama_sekretaris: lastSurat?.nama_sekretaris || storedAssets.nama_sekretaris || defaultForm.nama_sekretaris
    });
    isInitialModalLoadRef.current = true;
    setIsModalOpen(true);
  };

  const handleResequenceNumbers = async () => {
    if (suratList.length === 0) {
      Swal.fire('Informasi', 'Belum ada data surat untuk dirapikan.', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Rapikan & Urutkan Penomoran Surat?',
      html: 'Seluruh surat keluar akan diurutkan secara otomatis (001, 002, 003, dst) berdasarkan urutan tanggal pembuatan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Ya, Rapikan Penomoran',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    try {
      // Sort ascending by created_at time so older letters come first (001, 002, ...)
      const sorted = [...suratList].sort((a, b) => {
        const timeA = new Date(a.created_at || a.created_at_time || 0).getTime();
        const timeB = new Date(b.created_at || b.created_at_time || 0).getTime();
        return timeA - timeB;
      });

      const updatedMap = new Map();

      sorted.forEach((item, index) => {
        const seq = (index + 1).toString().padStart(3, '0');
        const parts = (item.nomor_surat || '').split('/');
        const orgCode = parts[1] || 'PB-BILIBILI162';
        const monthRoman = parts[2] || getRomanMonth(new Date().getMonth());
        const year = parts[3] || new Date().getFullYear().toString();

        const newNomor = `${seq}/${orgCode}/${monthRoman}/${year}`;
        updatedMap.set(item.id || item.nomor_surat, { ...item, nomor_surat: newNomor });
      });

      const updatedArray = Array.from(updatedMap.values());

      // Update LocalStorage
      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      const updatedLocal = localData.map((locItem: any) => {
        const updated = updatedMap.get(locItem.id || locItem.nomor_surat);
        return updated || locItem;
      });
      localStorage.setItem('arsip_surat_local', JSON.stringify(updatedLocal));

      // Update Supabase
      for (const item of updatedArray) {
        if (item.id && !item.id.toString().startsWith('local_')) {
          try {
            await supabase.from('arsip_surat').update({ nomor_surat: item.nomor_surat }).eq('id', item.id);
          } catch (e) {
            console.warn('Supabase update error:', e);
          }
        }
      }

      await fetchSurat();
      Swal.fire('Berhasil', 'Penomoran surat telah dirapikan secara berurutan!', 'success');
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'Gagal merapikan penomoran: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (surat: any) => {
    setEditId(surat.id);
    setIsPreviewOnly(false);
    setActiveModalTab('form');

    const storedAssets = getStoredDigitalAssets();

    setLogoPos(surat.logo_pos || storedAssets.logo_pos || { x: 0, y: 0 });
    setStempelPos(surat.stempel_pos || storedAssets.stempel_pos || { x: -35, y: 0 });
    setTtdKetuaPos(surat.ttd_ketua_pos || storedAssets.ttd_ketua_pos || { x: 0, y: 0 });
    setTtdSekretarisPos(surat.ttd_sekretaris_pos || storedAssets.ttd_sekretaris_pos || { x: 0, y: 0 });

    const initialCreatedAt = surat.created_at || (parseIndonesianDateToIso(surat.tempat_tanggal) ? new Date(parseIndonesianDateToIso(surat.tempat_tanggal) + 'T12:00:00.000Z').toISOString() : new Date().toISOString());

    setFormData({
      ...defaultForm,
      ...surat,
      created_at: initialCreatedAt,
      logo_url: getValidAssetUrl(surat.logo_url, DEFAULT_LOGO_URL),
      ttd_ketua_url: getValidAssetUrl(surat.ttd_ketua_url, ""),
      ttd_sekretaris_url: getValidAssetUrl(surat.ttd_sekretaris_url, ""),
      cap_stempel_url: getValidAssetUrl(surat.cap_stempel_url, ""),
      logo_scale: surat.logo_scale || storedAssets.logo_scale || 100,
      ttd_ketua_scale: surat.ttd_ketua_scale || storedAssets.ttd_ketua_scale || 100,
      ttd_sekretaris_scale: surat.ttd_sekretaris_scale || storedAssets.ttd_sekretaris_scale || 100,
      stempel_scale: surat.stempel_scale || storedAssets.stempel_scale || 100,
      nama_ketua: surat.nama_ketua || storedAssets.nama_ketua || defaultForm.nama_ketua,
      nama_sekretaris: surat.nama_sekretaris || storedAssets.nama_sekretaris || defaultForm.nama_sekretaris,
      show_recipient: surat.show_recipient !== undefined ? Boolean(surat.show_recipient) : true,
      show_greetings: surat.show_greetings !== undefined ? Boolean(surat.show_greetings) : true,
      title_override: surat.title_override || '',
      include_lampiran_peserta: surat.include_lampiran_peserta !== undefined ? Boolean(surat.include_lampiran_peserta) : false,
      judul_lampiran: surat.judul_lampiran || 'Daftar Lampiran Peserta',
      lampiran_peserta: surat.lampiran_peserta || '',
      tempat_tanggal: surat.tempat_tanggal || defaultForm.tempat_tanggal,
      lampiran: surat.lampiran || '-',
    });
    isInitialModalLoadRef.current = true;
    setIsModalOpen(true);
  };

  const handlePreview = (surat: any) => {
    setEditId(null);
    setIsPreviewOnly(true);
    setActiveModalTab('preview');

    const storedAssets = getStoredDigitalAssets();

    setLogoPos(surat.logo_pos || storedAssets.logo_pos || { x: 0, y: 0 });
    setStempelPos(surat.stempel_pos || storedAssets.stempel_pos || { x: -35, y: 0 });
    setTtdKetuaPos(surat.ttd_ketua_pos || storedAssets.ttd_ketua_pos || { x: 0, y: 0 });
    setTtdSekretarisPos(surat.ttd_sekretaris_pos || storedAssets.ttd_sekretaris_pos || { x: 0, y: 0 });

    const initialCreatedAt = surat.created_at || (parseIndonesianDateToIso(surat.tempat_tanggal) ? new Date(parseIndonesianDateToIso(surat.tempat_tanggal) + 'T12:00:00.000Z').toISOString() : new Date().toISOString());

    setFormData({
      ...defaultForm,
      ...surat,
      created_at: initialCreatedAt,
      logo_url: getValidAssetUrl(surat.logo_url, storedAssets.logo_url),
      ttd_ketua_url: getValidAssetUrl(surat.ttd_ketua_url, storedAssets.ttd_ketua_url),
      ttd_sekretaris_url: getValidAssetUrl(surat.ttd_sekretaris_url, storedAssets.ttd_sekretaris_url),
      cap_stempel_url: getValidAssetUrl(surat.cap_stempel_url, storedAssets.cap_stempel_url),
      logo_scale: surat.logo_scale || storedAssets.logo_scale || 100,
      ttd_ketua_scale: surat.ttd_ketua_scale || storedAssets.ttd_ketua_scale || 100,
      ttd_sekretaris_scale: surat.ttd_sekretaris_scale || storedAssets.ttd_sekretaris_scale || 100,
      stempel_scale: surat.stempel_scale || storedAssets.stempel_scale || 100,
      nama_ketua: surat.nama_ketua || storedAssets.nama_ketua || defaultForm.nama_ketua,
      nama_sekretaris: surat.nama_sekretaris || storedAssets.nama_sekretaris || defaultForm.nama_sekretaris,
      show_recipient: surat.show_recipient !== undefined ? Boolean(surat.show_recipient) : true,
      show_greetings: surat.show_greetings !== undefined ? Boolean(surat.show_greetings) : true,
      title_override: surat.title_override || '',
      include_lampiran_peserta: surat.include_lampiran_peserta !== undefined ? Boolean(surat.include_lampiran_peserta) : false,
      judul_lampiran: surat.judul_lampiran || 'Daftar Lampiran Peserta',
      lampiran_peserta: surat.lampiran_peserta || '',
      tempat_tanggal: surat.tempat_tanggal || defaultForm.tempat_tanggal,
      lampiran: surat.lampiran || '-',
    });
    isInitialModalLoadRef.current = true;
    setIsModalOpen(true);
  };

  const handleAutoFitMobile = useCallback(() => {
    const container = document.getElementById('preview-paper-container');
    const containerWidth = container ? container.clientWidth : (window.innerWidth - 32);
    const availableWidth = Math.max(240, containerWidth - 28);
    const fitScale = parseFloat((availableWidth / 794).toFixed(2));
    const targetScale = Math.max(0.25, Math.min(1.0, fitScale));
    setZoomScale(targetScale);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      handleAutoFitMobile();
      const handleResize = () => handleAutoFitMobile();
      window.addEventListener('resize', handleResize);
      const timer1 = setTimeout(handleAutoFitMobile, 50);
      const timer2 = setTimeout(handleAutoFitMobile, 200);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isModalOpen, activeModalTab, isPreviewOnly, handleAutoFitMobile]);

  const handleSave = async () => {
    setIsSubmitting(true);
    const targetEditId = editId;

    // Optimistically update suratList immediately
    const optimisticSurat = {
      ...formData,
      id: targetEditId || 'local_' + Date.now(),
      created_at: new Date().toISOString(),
      logo_pos: logoPos,
      stempel_pos: stempelPos,
      ttd_ketua_pos: ttdKetuaPos,
      ttd_sekretaris_pos: ttdSekretarisPos
    };

    setSuratList(prev => {
      const filtered = prev.filter(s => s.id !== targetEditId && s.nomor_surat !== formData.nomor_surat);
      return [optimisticSurat, ...filtered];
    });

    setRealtimeSyncStatus('synced');
    setIsModalOpen(false);
    setIsSubmitting(false);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Surat berhasil diperbarui & disimpan!',
      showConfirmButton: false,
      timer: 2000
    });

    // Run persistence in background
    try {
      const dbId = await saveSuratToSupabase(formData, targetEditId, {
        logoPos,
        stempelPos,
        ttdKetuaPos,
        ttdSekretarisPos
      });
      if (dbId && !targetEditId) setEditId(dbId);
      fetchSurat().catch(() => {});
    } catch (err: any) {
      console.warn("Background save notice:", err);
    }
  };

  const handleDelete = async (id: string) => {
    const targetSurat = suratList.find(s => s.id === id);
    const targetNomor = targetSurat?.nomor_surat;
    const normNomor = normalizeSuratNomor(targetNomor);

    const result = await Swal.fire({
      title: 'Hapus Surat?',
      text: "Data yang dihapus tidak bisa dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      // Optimistic delete immediately
      setSuratList(prev => prev.filter(s => s.id !== id && (!targetNomor || s.nomor_surat !== targetNomor)));
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Surat berhasil dihapus',
        showConfirmButton: false,
        timer: 2000
      });

      const deletedIds: string[] = JSON.parse(localStorage.getItem('arsip_surat_deleted') || '[]');
      if (!deletedIds.includes(id)) deletedIds.push(id);
      if (targetNomor && !deletedIds.includes(targetNomor)) deletedIds.push(targetNomor);
      if (normNomor && !deletedIds.includes(normNomor)) deletedIds.push(normNomor);
      safeLocalStorageSet('arsip_surat_deleted', JSON.stringify(deletedIds));

      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      const filteredLocal = localData.filter((i: any) => {
        if (!i) return false;
        if (i.id === id) return false;
        if (normNomor && normalizeSuratNomor(i.nomor_surat) === normNomor) return false;
        return true;
      });
      safeLocalStorageSet('arsip_surat_local', JSON.stringify(filteredLocal));

      // Background remote deletions
      Promise.allSettled([
        (async () => {
          try {
            await supabase.from('arsip_surat').delete().eq('id', id);
            if (targetNomor) {
              await supabase.from('arsip_surat').delete().eq('nomor_surat', targetNomor);
            }
          } catch (e) {}
        })(),
        (async () => {
          try {
            await fetch('/api/arsip-surat', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, nomor_surat: targetNomor })
            });
          } catch (e) {}
        })()
      ]).then(() => {
        fetchSurat().catch(() => {});
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (isPreviewOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      const stored = getStoredDigitalAssets();
      try {
        const compressed = await compressImage(file, 600, 600, 0.85);
        if (compressed) {
          setFormData(prev => {
            const updated = { ...prev, [field]: compressed };
            const mergedAssets = {
              logo_url: field === 'logo_url' ? compressed : getValidAssetUrl(updated.logo_url, stored.logo_url || DEFAULT_LOGO_URL),
              ttd_ketua_url: field === 'ttd_ketua_url' ? compressed : getValidAssetUrl(updated.ttd_ketua_url, stored.ttd_ketua_url),
              ttd_sekretaris_url: field === 'ttd_sekretaris_url' ? compressed : getValidAssetUrl(updated.ttd_sekretaris_url, stored.ttd_sekretaris_url),
              cap_stempel_url: field === 'cap_stempel_url' ? compressed : getValidAssetUrl(updated.cap_stempel_url, stored.cap_stempel_url),
              logo_scale: updated.logo_scale || stored.logo_scale || 100,
              ttd_ketua_scale: updated.ttd_ketua_scale || stored.ttd_ketua_scale || 100,
              ttd_sekretaris_scale: updated.ttd_sekretaris_scale || stored.ttd_sekretaris_scale || 100,
              stempel_scale: updated.stempel_scale || stored.stempel_scale || 100,
              logo_pos: logoPos || stored.logo_pos || { x: 0, y: 0 },
              stempel_pos: stempelPos || stored.stempel_pos || { x: -35, y: 0 },
              ttd_ketua_pos: ttdKetuaPos || stored.ttd_ketua_pos || { x: 0, y: 0 },
              ttd_sekretaris_pos: ttdSekretarisPos || stored.ttd_sekretaris_pos || { x: 0, y: 0 },
              nama_ketua: updated.nama_ketua || stored.nama_ketua || 'H. WAWAN',
              nama_sekretaris: updated.nama_sekretaris || stored.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
            };
            saveMasterDigitalAssetsToDatabase(mergedAssets, false);
            return updated;
          });
          Swal.fire({
            title: 'Tersimpan Permanen di Database! 💾',
            text: 'Aset digital berhasil diunggah dan otomatis menjadi default untuk seluruh surat.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
          });
        }
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          setFormData(prev => {
            const updated = { ...prev, [field]: res };
            const mergedAssets = {
              logo_url: field === 'logo_url' ? res : getValidAssetUrl(updated.logo_url, stored.logo_url || DEFAULT_LOGO_URL),
              ttd_ketua_url: field === 'ttd_ketua_url' ? res : getValidAssetUrl(updated.ttd_ketua_url, stored.ttd_ketua_url),
              ttd_sekretaris_url: field === 'ttd_sekretaris_url' ? res : getValidAssetUrl(updated.ttd_sekretaris_url, stored.ttd_sekretaris_url),
              cap_stempel_url: field === 'cap_stempel_url' ? res : getValidAssetUrl(updated.cap_stempel_url, stored.cap_stempel_url),
              logo_scale: updated.logo_scale || stored.logo_scale || 100,
              ttd_ketua_scale: updated.ttd_ketua_scale || stored.ttd_ketua_scale || 100,
              ttd_sekretaris_scale: updated.ttd_sekretaris_scale || stored.ttd_sekretaris_scale || 100,
              stempel_scale: updated.stempel_scale || stored.stempel_scale || 100,
              logo_pos: logoPos || stored.logo_pos || { x: 0, y: 0 },
              stempel_pos: stempelPos || stored.stempel_pos || { x: -35, y: 0 },
              ttd_ketua_pos: ttdKetuaPos || stored.ttd_ketua_pos || { x: 0, y: 0 },
              ttd_sekretaris_pos: ttdSekretarisPos || stored.ttd_sekretaris_pos || { x: 0, y: 0 },
              nama_ketua: updated.nama_ketua || stored.nama_ketua || 'H. WAWAN',
              nama_sekretaris: updated.nama_sekretaris || stored.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
            };
            saveMasterDigitalAssetsToDatabase(mergedAssets, false);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveAsset = (field: 'logo_url' | 'ttd_ketua_url' | 'ttd_sekretaris_url' | 'cap_stempel_url') => {
    if (isPreviewOnly) return;
    const stored = getStoredDigitalAssets();
    setFormData(prev => {
      const updated = { ...prev, [field]: '' };
      const mergedAssets = {
        logo_url: field === 'logo_url' ? DEFAULT_LOGO_URL : getValidAssetUrl(updated.logo_url, stored.logo_url || DEFAULT_LOGO_URL),
        ttd_ketua_url: field === 'ttd_ketua_url' ? '' : getValidAssetUrl(updated.ttd_ketua_url, stored.ttd_ketua_url),
        ttd_sekretaris_url: field === 'ttd_sekretaris_url' ? '' : getValidAssetUrl(updated.ttd_sekretaris_url, stored.ttd_sekretaris_url),
        cap_stempel_url: field === 'cap_stempel_url' ? '' : getValidAssetUrl(updated.cap_stempel_url, stored.cap_stempel_url),
        logo_scale: updated.logo_scale || stored.logo_scale || 100,
        ttd_ketua_scale: updated.ttd_ketua_scale || stored.ttd_ketua_scale || 100,
        ttd_sekretaris_scale: updated.ttd_sekretaris_scale || stored.ttd_sekretaris_scale || 100,
        stempel_scale: updated.stempel_scale || stored.stempel_scale || 100,
        logo_pos: logoPos || stored.logo_pos || { x: 0, y: 0 },
        stempel_pos: stempelPos || stored.stempel_pos || { x: -35, y: 0 },
        ttd_ketua_pos: ttdKetuaPos || stored.ttd_ketua_pos || { x: 0, y: 0 },
        ttd_sekretaris_pos: ttdSekretarisPos || stored.ttd_sekretaris_pos || { x: 0, y: 0 },
        nama_ketua: updated.nama_ketua || stored.nama_ketua || 'H. WAWAN',
        nama_sekretaris: updated.nama_sekretaris || stored.nama_sekretaris || 'H. BARHAMAN MUIN S.AG',
      };
      saveMasterDigitalAssetsToDatabase(mergedAssets, false);
      return updated;
    });
    Swal.fire({
      title: 'Aset Dikosongkan',
      text: 'Aset telah dihapus dan disinkronkan ke database.',
      icon: 'info',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const [dragStartClient, setDragStartClient] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  const handleAssetPointerDown = (
    e: React.PointerEvent,
    asset: 'logo' | 'stempel' | 'ttd_ketua' | 'ttd_sekretaris'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedAsset(asset);
    setDraggingAsset(asset);

    let currentPos = { x: 0, y: 0 };
    if (asset === 'logo') currentPos = logoPos;
    else if (asset === 'stempel') currentPos = stempelPos;
    else if (asset === 'ttd_ketua') currentPos = ttdKetuaPos;
    else if (asset === 'ttd_sekretaris') currentPos = ttdSekretarisPos;

    setDragStartClient({
      x: e.clientX,
      y: e.clientY
    });
    setDragStartPos(currentPos);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleAssetPointerMove = (e: React.PointerEvent) => {
    if (!draggingAsset) return;
    e.preventDefault();
    e.stopPropagation();
    const effectiveZoom = zoomScale > 0 ? zoomScale : 1;
    const deltaX = (e.clientX - dragStartClient.x) / effectiveZoom;
    const deltaY = (e.clientY - dragStartClient.y) / effectiveZoom;

    const newPos = {
      x: Math.round(dragStartPos.x + deltaX),
      y: Math.round(dragStartPos.y + deltaY)
    };

    if (draggingAsset === 'logo') {
      setLogoPos(newPos);
      setFormData(prev => ({ ...prev, logo_pos: newPos }));
    } else if (draggingAsset === 'stempel') {
      setStempelPos(newPos);
      setFormData(prev => ({ ...prev, stempel_pos: newPos }));
    } else if (draggingAsset === 'ttd_ketua') {
      setTtdKetuaPos(newPos);
      setFormData(prev => ({ ...prev, ttd_ketua_pos: newPos }));
    } else if (draggingAsset === 'ttd_sekretaris') {
      setTtdSekretarisPos(newPos);
      setFormData(prev => ({ ...prev, ttd_sekretaris_pos: newPos }));
    }
  };

  const handleAssetPointerUp = (e: React.PointerEvent) => {
    if (draggingAsset) {
      setDraggingAsset(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.perihal || !formData.perihal.trim()) {
      Swal.fire('Info', 'Mohon isi perihal surat terlebih dahulu agar AI bisa memahami konteksnya.', 'info');
      return;
    }

    setIsGeneratingAI(true);
    const getLocalFallback = (perihal: string) => {
      const p = perihal.toLowerCase();
      if (p.includes('tugas') || p.includes('mabar') || p.includes('mandat') || p.includes('delegasi')) {
        return `Sehubungan dengan keikutsertaan PB Bilibili 162 Parepare dalam agenda "${perihal}", bersama ini Pengurus PB Bilibili 162 memberikan penugasan dan mandat resmi kepada nama-nama terlampir untuk mewakili dan menjalankan tugas organisasi dengan penuh tanggung jawab serta menjunjung tinggi sportivitas.\n\nSeluruh personil yang ditugaskan diharapkan dapat menjaga nama baik klub, mematuhi seluruh tata tertib kegiatan yang berlaku, serta berkoordinasi secara aktif dengan jajaran panitia pelaksana.\n\nDemikian surat tugas ini diberikan untuk dapat dipergunakan sebagaimana mestinya dengan penuh dedikasi dan rasa tanggung jawab.`;
      }
      if (p.includes('kajian') || p.includes('narasumber') || p.includes('pemateri') || p.includes('religi')) {
        return `Dalam rangka meningkatkan pemahaman keilmuan, pembinaan mental spiritual, serta mempererat tali ukhuwah dan silaturahmi, bersama ini Pengurus PB Bilibili 162 bermaksud mengundang Bapak/Ibu untuk berkenan hadir sebagai Narasumber / Peserta pada kegiatan kajian bersama keluarga besar PB Bilibili 162.\n\nKehadiran dan ilmu yang Bapak/Ibu sampaikan tentu akan memberikan manfaat yang sangat besar serta membawa keberkahan bagi seluruh jajaran pengurus dan atlet kami.\n\nDemikian surat permohonan ini kami sampaikan. Atas keikhlasan, perkenan, dan kesediaan waktu Bapak/Ibu, kami ucapkan terima kasih yang sebesar-besarnya.`;
      }
      if (p.includes('sparing') || p.includes('sparring') || p.includes('persahabatan') || p.includes('tanding')) {
        return `Sehubungan dengan agenda rutin pembinaan atlet serta program kerja Pengurus PB Bilibili 162 Parepare dalam rangka meningkatkan kualitas teknik bertanding dan mempererat tali silaturahmi antar pecinta bulutangkis, bersama ini kami bermaksud mengajukan permohonan laga sparing persahabatan bersama tim yang Bapak/Ibu pimpin.\n\nMelalui laga persahabatan ini, kami berharap dapat saling berbagi pengalaman taktis di lapangan serta menambah jam terbang atlet kedua belah pihak dalam suasana yang sportif dan penuh keakraban.\n\nDemikian permohonan ini kami sampaikan, besar harapan kami atas kesediaan dan konfirmasi baik dari Bapak/Ibu. Atas perhatian, dukungan, dan kerjasamanya kami ucapkan terima kasih.`;
      }
      if (p.includes('undangan') || p.includes('turnamen') || p.includes('kejuaraan') || p.includes('rapat')) {
        return `Dalam rangka menyukseskan agenda kegiatan "${perihal}" serta memperkuat sinergi dan kebersamaan keluarga besar pecinta bulutangkis di Kota Parepare, kami segenap Pengurus PB Bilibili 162 bermaksud mengundang Bapak/Ibu untuk berkenan hadir dan berpartisipasi dalam kegiatan resmi tersebut.\n\nKehadiran dan dukungan Bapak/Ibu sekalian tentunya akan memberikan kehormatan besar serta menjadi motivasi semangat bagi para peserta dan seluruh jajaran panitia pelaksana.\n\nDemikian surat undangan ini kami sampaikan. Atas kesediaan, perhatian, serta kehadiran Bapak/Ibu tepat pada waktunya, kami haturkan terima kasih.`;
      }
      if (p.includes('izin') || p.includes('pinjam') || p.includes('gor') || p.includes('lapangan')) {
        return `Sehubungan dengan rencana pelaksanaan kegiatan ${perihal} oleh PB Bilibili 162 Parepare, bersama surat ini kami bermaksud mengajukan permohonan izin penggunaan fasilitas sarana dan prasarana sebagaimana yang dimaksud.\n\nKegiatan ini merupakan bagian integral dari program pembinaan atlet dan pemeliharaan performa rutin klub kami. Pihak PB Bilibili 162 berkomitmen penuh untuk senantiasa menjaga kebersihan, ketertiban, serta merawat fasilitas yang digunakan dengan sebaik-baiknya.\n\nDemikian surat permohonan izin ini kami ajukan dengan penuh rasa hormat. Besar harapan kami atas perkenan dan restu dari Bapak/Ibu. Atas kebijaksanaan dan kerjasamanya, kami sampaikan terima kasih.`;
      }
      return `Sehubungan dengan pelaksanaan program kerja PB Bilibili 162 Parepare dan menindaklanjuti perihal "${perihal}", bersama ini kami menyampaikan maksud dan permohonan resmi kepada Bapak/Ibu.\n\nKami meyakini bahwa melalui komunikasi dan koordinasi yang baik, tujuan bersama dalam mendukung pembinaan serta kelancaran agenda tersebut dapat terwujud secara optimal dan profesional.\n\nDemikian surat ini kami sampaikan dengan penuh rasa hormat. Atas perhatian, arahan, dan kerja sama yang senantiasa terjalin baik dari Bapak/Ibu, kami ucapkan terima kasih.`;
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          perihal: formData.perihal,
          tujuan_yth: formData.tujuan_yth,
          jabatan_tujuan: formData.jabatan_tujuan
        })
      }).finally(() => clearTimeout(timeoutId));

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) {
          setFormData(prev => ({ ...prev, isi_surat: data.text }));
          Swal.fire({
            title: 'Berhasil!',
            text: 'Isi surat resmi telah siap.',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
          });
          return;
        }
      }
      throw new Error('Fallback required');
    } catch (error: any) {
      const fallbackText = getLocalFallback(formData.perihal);
      setFormData(prev => ({ ...prev, isi_surat: fallbackText }));
      Swal.fire({
        title: 'Berhasil!',
        text: 'Isi surat telah dibuat otomatis berdasarkan standar PB Bilibili.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Surat - PB Bilibili 162</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print { 
                @page { size: A4; margin: 0; } 
                body { margin: 0; -webkit-print-color-adjust: exact; }
                .no-print { display: none; }
              }
              .font-serif { font-family: 'Times New Roman', Times, serif; }
              body { font-family: 'Times New Roman', serif; }
            </style>
          </head>
          <body>
            <div class="p-[1.5cm]">
                ${content.innerHTML}
            </div>
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getCanvasFromElement = async (element: HTMLElement) => {
    const html2canvas = (await import('html2canvas')).default;
    
    // Pastikan web fonts selesai dimuat secara sempurna
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn("Fonts ready check ignored:", e);
      }
    }

    // Create a clean offscreen container with explicit rendering standards
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0px';
    container.style.left = '-99999px';
    container.style.width = '794px';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '794px';
    clone.style.height = 'auto';
    clone.style.minHeight = '1123px';
    clone.style.transform = 'none';
    clone.style.zoom = '1';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#000000';
    clone.style.letterSpacing = 'normal';
    clone.style.textRendering = 'geometricPrecision';
    (clone.style as any).webkitFontSmoothing = 'antialiased';
    (clone.style as any).mozOsxFontSmoothing = 'grayscale';

    // Hilangkan elemen kontrol editor & tombol resize interaktif di clone (JANGAN sembunyikan TTD & Stempel)
    const editorControls = clone.querySelectorAll('.no-print, .no-export, [title*="Tarik untuk mengubah"], [title*="Klik / Tarik"]');
    editorControls.forEach(h => {
      // Pastikan bukan elemen img atau container utama gambar TTD/Stempel
      if (!h.querySelector('img') && !(h instanceof HTMLImageElement)) {
        (h as HTMLElement).style.display = 'none';
      }
    });

    // Bersihkan highlight/ring seleksi editor di dalam clone
    const highlightedElements = clone.querySelectorAll('.ring-2, .ring-blue-500, .border-dashed, [class*="ring-"]');
    highlightedElements.forEach(el => {
      el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'hover:ring-1', 'hover:ring-blue-300', 'border-dashed');
    });

    // Pastikan semua teks di dalam clone berwarna hitam pekat & tajam
    const allTexts = clone.querySelectorAll('p, h1, h2, h3, h4, span, td, th, strong, div, b');
    allTexts.forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.color = '#000000';
      htmlEl.style.textRendering = 'geometricPrecision';
      (htmlEl.style as any).webkitFontSmoothing = 'antialiased';
      (htmlEl.style as any).mozOsxFontSmoothing = 'grayscale';
    });
    
    container.appendChild(clone);
    document.body.appendChild(container);

    // Tunggu dan pastikan semua gambar (logo, ttd, stempel) selesai dimuat dan disiapkan dengan CORS
    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (!img.src.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = () => {
            console.warn("Gambar gagal dimuat di clone canvas:", img.src);
            resolve(null);
          };
        });
      })
    );

    // Beri jeda sejenak untuk rendering layout engine
    await new Promise(resolve => setTimeout(resolve, 120));

    try {
      const canvas = await html2canvas(clone, {
        scale: 4.0, // 4.0x scale (3176px width) menghasilkan kerapatan 300+ DPI standar percetakan Ultra HD
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const texts = clonedDoc.querySelectorAll('p, h1, h2, h3, span, td, th, strong');
          texts.forEach(el => {
            (el as HTMLElement).style.color = '#000000';
            (el as HTMLElement).style.textRendering = 'geometricPrecision';
            ((el as HTMLElement).style as any).webkitFontSmoothing = 'antialiased';
            ((el as HTMLElement).style as any).mozOsxFontSmoothing = 'grayscale';
          });
        }
      });
      return canvas;
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  // Helper untuk mengubah canvas menjadi Blob atau DataURL berkualitas tinggi tanpa distorsi kompresi
  const getHighQualityImageDataUrl = (canvas: HTMLCanvasElement, format: 'png' | 'jpg'): string => {
    if (format === 'png') {
      return canvas.toDataURL('image/png', 1.0);
    }
    // Untuk JPG: render ke canvas berlatar belakang putih murni untuk mencegah artefak kompresi hitam di sudut
    const outCanvas = document.createElement('canvas');
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height;
    const ctx = outCanvas.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      ctx.drawImage(canvas, 0, 0);
      return outCanvas.toDataURL('image/jpeg', 0.98);
    }
    return canvas.toDataURL('image/jpeg', 0.98);
  };

  const handleCopyImageToClipboard = async (pageTarget?: 'page1' | 'page2' | 'single' | 'combined') => {
    try {
      if (formData.include_lampiran_peserta && !pageTarget) {
        await Swal.fire({
          title: '📋 Salin Gambar ke Clipboard',
          html: `
            <div class="text-left text-xs space-y-2.5 font-sans">
              <p class="text-slate-300">Pilih halaman yang ingin disalin ke Clipboard (bisa langsung Ctrl+V / Paste di WhatsApp Web):</p>
              <div class="space-y-2">
                <button id="swal-copy-comb" class="w-full text-left p-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/40 transition-all cursor-pointer">
                  <p class="font-bold text-amber-300">🖼️ Salin Dokumen Gabungan (Halaman 1 + 2 Bersambung)</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">Kedua halaman utuh dalam 1 gambar resolusi tinggi.</p>
                </button>
                <button id="swal-copy-hal1" class="w-full text-left p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 transition-all cursor-pointer">
                  <p class="font-bold text-blue-300">📄 Salin Halaman 1 (Surat Utama - A4 HD)</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">Hanya halaman pertama.</p>
                </button>
                <button id="swal-copy-hal2" class="w-full text-left p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 transition-all cursor-pointer">
                  <p class="font-bold text-purple-300">📋 Salin Halaman 2 (Lampiran Peserta - A4 HD)</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">Tabel peserta dan otorisasi stempel.</p>
                </button>
              </div>
            </div>
          `,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Batal',
          background: '#0F172A',
          color: '#fff',
          didOpen: () => {
            document.getElementById('swal-copy-comb')?.addEventListener('click', () => {
              Swal.close();
              handleCopyImageToClipboard('combined');
            });
            document.getElementById('swal-copy-hal1')?.addEventListener('click', () => {
              Swal.close();
              handleCopyImageToClipboard('page1');
            });
            document.getElementById('swal-copy-hal2')?.addEventListener('click', () => {
              Swal.close();
              handleCopyImageToClipboard('page2');
            });
          }
        });
        return;
      }

      let target: HTMLElement | null = null;
      if (pageTarget === 'page2') {
        target = page2Ref.current;
      } else if (pageTarget === 'page1') {
        target = page1Ref.current || printRef.current;
      } else if (pageTarget === 'combined') {
        target = printRef.current;
      } else {
        target = page1Ref.current || printRef.current;
      }

      if (!target) {
        Swal.fire({ title: 'Error', text: 'Halaman surat tidak ditemukan.', icon: 'error', background: '#0F172A', color: '#fff' });
        return;
      }
      setIsDownloading('png');
      const canvas = await getCanvasFromElement(target);
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Gagal membuat blob gambar.');
        if (navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob })
          ]);
          Swal.fire({
            title: 'Gambar Berhasil Disalin! 📋',
            text: 'Gambar resolusi Ultra HD telah disalin ke Clipboard. Anda bisa langsung paste (Ctrl+V / Tempel) di WhatsApp Web, Telegram, atau Word!',
            icon: 'success',
            background: '#0F172A',
            color: '#fff'
          });
        } else {
          throw new Error('Fitur salin clipboard gambar tidak didukung di browser ini.');
        }
        setIsDownloading(null);
      }, 'image/png');
    } catch (err: any) {
      console.warn("Clipboard copy failed:", err);
      Swal.fire({
        title: 'Info Salin',
        text: 'Browser Anda tidak mengizinkan akses salin gambar otomatis. Silakan gunakan tombol "Unduh PNG / JPG" untuk menyimpan file.',
        icon: 'info',
        background: '#0F172A',
        color: '#fff'
      });
      setIsDownloading(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      Swal.fire({
        title: 'Error',
        text: 'Elemen preview surat tidak ditemukan.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    setIsDownloading('pdf');
    try {
      setSelectedAsset(null);
      await new Promise(r => setTimeout(r, 100));

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Multi-halaman jika ada lampiran
      if (formData.include_lampiran_peserta && page1Ref.current && page2Ref.current) {
        // Render Halaman 1 (Surat Utama)
        const canvas1 = await getCanvasFromElement(page1Ref.current);
        const img1 = canvas1.toDataURL('image/png', 1.0);
        pdf.addImage(img1, 'PNG', 0, 0, pdfWidth, pageHeight);

        // Render Halaman 2 (Lampiran Peserta)
        const canvas2 = await getCanvasFromElement(page2Ref.current);
        const img2 = canvas2.toDataURL('image/png', 1.0);
        pdf.addPage();
        pdf.addImage(img2, 'PNG', 0, 0, pdfWidth, pageHeight);
      } else {
        // Surat 1 Halaman Standar
        const target = page1Ref.current || printRef.current;
        const canvas = await getCanvasFromElement(target);
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const now = new Date();
      const ddmmyy = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
      const cleanNomor = (formData.nomor_surat || 'surat').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
      const fileName = `Surat_PB162_${cleanNomor}_${ddmmyy}.pdf`;

      pdf.save(fileName);

      Swal.fire({
        title: 'File PDF Berhasil Diunduh! 📄',
        text: `Dokumen "${fileName}" berhasil disimpan ke perangkat Anda.`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        background: '#0F172A',
        color: '#fff'
      });
    } catch (err: any) {
      console.error("PDF Download error:", err);
      Swal.fire({
        title: 'Gagal Unduh PDF',
        text: err.message || 'Terjadi kesalahan saat memproses PDF.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadImage = async (format: 'png' | 'jpg', targetPageOption?: 'single' | 'page1' | 'page2' | 'all' | 'combined') => {
    if (!printRef.current) {
      Swal.fire({
        title: 'Error',
        text: 'Elemen preview surat tidak ditemukan.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    // Jika ada lampiran dan opsi belum ditentukan, tampilkan pilihan cerdas
    if (formData.include_lampiran_peserta && !targetPageOption) {
      const extUpper = format.toUpperCase();
      await Swal.fire({
        title: `📸 Unduh Gambar ${extUpper} (Ultra HD)`,
        html: `
          <div class="text-left text-xs space-y-3 font-sans">
            <p class="text-slate-300">Surat ini memiliki <b>2 Halaman</b> (Surat Utama & Lampiran). Pilih opsi unduhan gambar sesuai kebutuhan Anda:</p>
            <div class="space-y-2">
              <button id="swal-btn-dl-comb" class="w-full text-left p-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/40 transition-all cursor-pointer">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-amber-300">🖼️ 1. Unduh Dokumen Gambar Gabungan (Utuh 2 Halaman)</span>
                  <span class="text-[9px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded font-black">GABUNGAN</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Kedua halaman disambung memanjang ke bawah dalam 1 file resolusi tinggi (300+ DPI).</p>
              </button>

              <button id="swal-btn-dl-hal1" class="w-full text-left p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 transition-all cursor-pointer">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-blue-300">📄 2. Halaman 1 (Surat Utama - A4 Ultra HD)</span>
                  <span class="text-[9px] px-1.5 py-0.5 bg-blue-500/30 text-blue-200 rounded font-black">A4 HD</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-0.5">Format A4 pas standar (300+ DPI). Teks surat, tanda tangan & stempel sangat tajam.</p>
              </button>
              
              <button id="swal-btn-dl-hal2" class="w-full text-left p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 transition-all cursor-pointer">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-purple-300">📋 3. Halaman 2 (Lampiran Peserta - A4 Ultra HD)</span>
                  <span class="text-[9px] px-1.5 py-0.5 bg-purple-500/30 text-purple-200 rounded font-black">A4 HD</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-0.5">Tabel peserta dan kolom keterangan dalam format A4 HD mandiri.</p>
              </button>

              <button id="swal-btn-dl-all" class="w-full text-left p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 transition-all cursor-pointer">
                <p class="font-bold text-emerald-300">📦 4. Unduh Semua Halaman (2 File Gambar Terpisah A4)</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Otomatis mengunduh Halaman 1 dan Halaman 2 terpisah secara berurutan.</p>
              </button>
            </div>
            
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[10px] space-y-1">
              <p class="font-bold flex items-center gap-1">💡 Tips WhatsApp agar Tulisan Tidak Buram:</p>
              <p class="text-slate-300">Saat mengirim foto di WhatsApp, pilih menu <b>Dokumen</b> (ikon klip kertas 📎 lalu Dokumen) atau tekan tombol <b>HD</b> di WhatsApp sebelum kirim.</p>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Tutup',
        background: '#0F172A',
        color: '#fff',
        didOpen: () => {
          document.getElementById('swal-btn-dl-comb')?.addEventListener('click', () => {
            Swal.close();
            handleDownloadImage(format, 'combined');
          });
          document.getElementById('swal-btn-dl-hal1')?.addEventListener('click', () => {
            Swal.close();
            handleDownloadImage(format, 'page1');
          });
          document.getElementById('swal-btn-dl-hal2')?.addEventListener('click', () => {
            Swal.close();
            handleDownloadImage(format, 'page2');
          });
          document.getElementById('swal-btn-dl-all')?.addEventListener('click', () => {
            Swal.close();
            handleDownloadImage(format, 'all');
          });
        }
      });
      return;
    }

    setIsDownloading(format);
    try {
      setSelectedAsset(null);
      await new Promise(r => setTimeout(r, 100));

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpg' ? 'jpg' : 'png';
      const now = new Date();
      const ddmmyy = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
      const cleanNomor = (formData.nomor_surat || 'surat').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');

      const triggerDownload = (canvas: HTMLCanvasElement, suffix: string) => {
        const imgData = getHighQualityImageDataUrl(canvas, format);
        const fileName = `Surat_PB162_${cleanNomor}${suffix}_${ddmmyy}.${ext}`;
        const link = document.createElement('a');
        link.href = imgData;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return fileName;
      };

      let savedFileNames: string[] = [];

      if (targetPageOption === 'page1' && page1Ref.current) {
        const canvas = await getCanvasFromElement(page1Ref.current);
        const name = triggerDownload(canvas, '_Hal1');
        savedFileNames.push(name);
      } else if (targetPageOption === 'page2' && page2Ref.current) {
        const canvas = await getCanvasFromElement(page2Ref.current);
        const name = triggerDownload(canvas, '_Hal2');
        savedFileNames.push(name);
      } else if (targetPageOption === 'all' && page1Ref.current && page2Ref.current) {
        const canvas1 = await getCanvasFromElement(page1Ref.current);
        const name1 = triggerDownload(canvas1, '_Hal1');
        savedFileNames.push(name1);
        await new Promise(r => setTimeout(r, 400));
        const canvas2 = await getCanvasFromElement(page2Ref.current);
        const name2 = triggerDownload(canvas2, '_Hal2');
        savedFileNames.push(name2);
      } else {
        const target = targetPageOption === 'combined' ? printRef.current : (page1Ref.current || printRef.current);
        const suffix = targetPageOption === 'combined' ? '_Gabungan' : '';
        if (target) {
          const canvas = await getCanvasFromElement(target);
          const name = triggerDownload(canvas, suffix);
          savedFileNames.push(name);
        }
      }

      Swal.fire({
        title: `Gambar ${ext.toUpperCase()} Ultra HD Tersimpan! 🖼️`,
        html: `
          <div class="text-left text-xs space-y-2 font-sans">
            <p class="text-slate-300">File <b>${savedFileNames.join(', ')}</b> berhasil diunduh dengan resolusi tinggi (300+ DPI).</p>
            <div class="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] space-y-1">
              <p class="font-bold">📱 Rekomendasi Kirim ke WhatsApp:</p>
              <p class="text-slate-300">Kirim gambar menggunakan menu <b>Dokumen</b> di WhatsApp atau klik tombol <b>HD</b> saat mengirim agar WhatsApp tidak mengkompres kualitas tulisan.</p>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
    } catch (err: any) {
      console.error(`Download ${format} error:`, err);
      Swal.fire({
        title: `Gagal Unduh ${format.toUpperCase()}`,
        text: err.message || 'Terjadi kesalahan saat membuat file gambar.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const filteredSurat = suratList.filter(s => 
    s.nomor_surat.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.perihal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuratMasuk = suratMasukList.filter(s => {
    const matchesSearch = 
      (s.nomor_surat || '').toLowerCase().includes(searchMasuk.toLowerCase()) ||
      (s.pengirim || '').toLowerCase().includes(searchMasuk.toLowerCase()) ||
      (s.perihal || '').toLowerCase().includes(searchMasuk.toLowerCase());
    const matchesStatus = masukFilterStatus === 'semua' || s.status_disposisi === masukFilterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full h-full flex flex-col justify-between p-2.5 sm:p-5 md:p-8 space-y-2.5 sm:space-y-4 md:space-y-6 overflow-hidden md:overflow-visible min-h-0 select-none">
      <div className="flex flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-[#0b1224] to-slate-900 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1">
            <Mail size={10} />
            <span>Administrasi Surat</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
            <span className="text-[8px] text-emerald-400 font-bold lowercase tracking-normal">realtime db active</span>
          </div>
          <h1 className="text-base sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter truncate leading-tight">
            Kelola <span className="text-blue-500">Surat Klub</span>
          </h1>
          <p className="text-slate-400 text-[9px] sm:text-xs md:text-sm font-medium mt-0.5 truncate">
            PB Bilibili 162 Parepare
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          {activeTab === 'keluar' && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl focus-within:border-blue-500/50 transition-all w-48">
              <Search size={14} className="text-blue-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Cari surat..." 
                className="bg-transparent text-[10px] sm:text-xs font-bold outline-none text-white w-full placeholder:text-zinc-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <X size={12} className="text-zinc-500 cursor-pointer hover:text-white" onClick={() => setSearchTerm('')} />}
            </div>
          )}
          <button 
            onClick={activeTab === 'keluar' ? prepareNewSurat : prepareNewSuratMasuk} 
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95 shrink-0 shadow-lg cursor-pointer text-white ${
              activeTab === 'keluar' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
            }`}
          >
            <Plus size={14} /> 
            <span>{activeTab === 'keluar' ? 'Buat Surat Baru' : 'Catat Surat Masuk'}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 shrink-0">
        <button
          onClick={() => setActiveTab('keluar')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'keluar'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Send size={14} /> Surat Keluar & Generator ({suratList.length})
        </button>
        <button
          onClick={() => setActiveTab('masuk')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'masuk'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Mail size={14} /> Surat Masuk ({suratMasukList.length})
        </button>
      </div>

      {activeTab === 'masuk' ? (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Surat Masuk</p>
                <p className="text-2xl font-black text-white mt-1">{suratMasukList.length}</p>
              </div>
              <div className="p-3 bg-purple-600/10 rounded-xl text-purple-400">
                <Mail size={20} />
              </div>
            </div>
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Belum Disposisi</p>
                <p className="text-2xl font-black text-amber-400 mt-1">{suratMasukList.filter(s => s.status_disposisi === 'Belum Disposisi').length}</p>
              </div>
              <div className="p-3 bg-amber-600/10 rounded-xl text-amber-400">
                <Clock size={20} />
              </div>
            </div>
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sedang Diproses</p>
                <p className="text-2xl font-black text-blue-400 mt-1">{suratMasukList.filter(s => s.status_disposisi === 'Diproses').length}</p>
              </div>
              <div className="p-3 bg-blue-600/10 rounded-xl text-blue-400">
                <AlertCircle size={20} />
              </div>
            </div>
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Selesai</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">{suratMasukList.filter(s => s.status_disposisi === 'Selesai').length}</p>
              </div>
              <div className="p-3 bg-emerald-600/10 rounded-xl text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-white/10 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-72 bg-black/40 border border-white/10 px-3 py-2 rounded-xl">
              <Search size={14} className="text-purple-400 shrink-0" />
              <input
                type="text"
                placeholder="Cari nomor, pengirim, perihal..."
                className="bg-transparent text-xs font-bold outline-none text-white w-full placeholder:text-zinc-600"
                value={searchMasuk}
                onChange={(e) => setSearchMasuk(e.target.value)}
              />
              {searchMasuk && <X size={12} className="text-zinc-500 cursor-pointer hover:text-white" onClick={() => setSearchMasuk('')} />}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
              <select
                value={masukFilterStatus}
                onChange={(e) => setMasukFilterStatus(e.target.value)}
                className="bg-black/50 border border-white/10 text-xs text-white font-bold p-2 rounded-xl outline-none"
              >
                <option value="semua">Semua Status</option>
                <option value="Belum Disposisi">Belum Disposisi</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>

          {/* Surat Masuk List */}
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex flex-col flex-1 min-h-0 shadow-xl">
            <div className="p-3 sm:p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400">Arsip_Surat_Masuk.log ({filteredSuratMasuk.length})</h3>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-white/5 custom-scrollbar">
              {filteredSuratMasuk.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <FileText size={30} className="text-slate-600" />
                  <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                    {searchMasuk || masukFilterStatus !== 'semua' ? 'Tidak ada surat masuk yang sesuai filter' : 'Belum Ada Surat Masuk Tercatat'}
                  </p>
                </div>
              ) : (
                filteredSuratMasuk.map((s, idx) => (
                  <div key={s.id ? `masuk_${s.id}` : `masuk_idx_${idx}_${s.nomor_surat || ''}`} className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-bold text-purple-400">{s.nomor_surat}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          s.sifat_surat === 'Penting' || s.sifat_surat === 'Segera' 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                            : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                        }`}>
                          {s.sifat_surat || 'Biasa'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          s.status_disposisi === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          s.status_disposisi === 'Diproses' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {s.status_disposisi || 'Belum Disposisi'}
                        </span>
                      </div>
                      <p className="text-white text-xs sm:text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                        <Building size={14} className="text-purple-400 shrink-0" />
                        Pengirim: {s.pengirim}
                      </p>
                      <p className="text-slate-300 text-xs font-medium">{s.perihal}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                        <span>Diterima: {s.tanggal_diterima}</span>
                        <span>Disposisi ke: <strong className="text-purple-300">{s.disposisi_kepada}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                      {s.file_url && (
                        <button onClick={() => setViewFileModalUrl(s.file_url)} className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border border-blue-500/20 cursor-pointer">
                          <Eye size={14} /> Lihat File
                        </button>
                      )}
                      <button onClick={() => handleEditSuratMasuk(s)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer" title="Edit Surat Masuk">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteSuratMasuk(s.id)} className="p-2 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl transition-all cursor-pointer" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          <div className="flex sm:hidden items-center gap-2 bg-slate-900 border border-white/10 px-3 py-2 rounded-xl shrink-0">
            <Search size={14} className="text-blue-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Cari nomor atau perihal surat..." 
              className="bg-transparent text-xs font-bold outline-none text-white w-full placeholder:text-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <X size={12} className="text-zinc-500 cursor-pointer hover:text-white" onClick={() => setSearchTerm('')} />}
          </div>

          <div className="bg-[#0b1224]/90 border border-white/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex flex-col flex-1 min-h-0 shadow-xl">
            <div className="p-3 sm:p-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-black/20">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400">Arsip_Surat.log ({filteredSurat.length})</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearAllDatabaseSignatures}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/10 hover:bg-rose-600/25 text-rose-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-rose-500/20 transition-all cursor-pointer"
                  title="Hapus / Kosongkan seluruh stempel & tanda tangan di database"
                >
                  <Trash2 size={12} />
                  <span>Hapus Semua TTD Database</span>
                </button>
                <button 
                  onClick={handleResequenceNumbers}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-500/30 transition-all cursor-pointer"
                  title="Urutkan & Rapikan Penomoran Surat"
                >
                  <ListOrdered size={13} />
                  <span>Rapikan Penomoran</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24} /></div>
          ) : filteredSurat.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center gap-2">
              <Search size={30} className="text-slate-600" />
              <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                {searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}"` : 'Belum Ada Arsip Surat'}
              </p>
            </div>
          ) : filteredSurat.map((s, idx) => (
            <div key={s.id ? `surat_${s.id}` : `surat_idx_${idx}_${s.nomor_surat || ''}`} className="p-3 sm:p-4 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-xs sm:text-sm text-blue-400 uppercase tracking-tight">{s.nomor_surat}</p>
                  <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase border border-blue-500/20 bg-blue-500/10 text-blue-300 inline-block">
                    {s.tempat_tanggal ? (s.tempat_tanggal.split(', ')[1] || s.tempat_tanggal) : (s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-')}
                  </span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1 break-words line-clamp-2">{s.perihal}</p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <button onClick={() => handleSendWhatsApp(s)} title="Kirim Link WhatsApp" className="p-1.5 sm:p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-all cursor-pointer">
                  <MessageCircle size={14}/>
                </button>
                <button onClick={() => handlePreview(s)} title="Preview Surat" className="p-1.5 sm:p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all cursor-pointer">
                  <Eye size={14}/>
                </button>
                <button onClick={() => handleEdit(s)} title="Edit Surat" className="p-1.5 sm:p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer">
                  <Edit size={14}/>
                </button>
                <button onClick={() => handleDelete(s.id)} title="Hapus" className="p-1.5 sm:p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0F172A] border border-white/10 w-full max-w-[98%] md:max-w-[95%] h-[95vh] md:h-[90vh] rounded-2xl md:rounded-[2.5rem] flex flex-col md:flex-row overflow-hidden shadow-2xl">
            
            {/* Mobile Tab Switcher when not preview only */}
            {!isPreviewOnly && (
              <div className="flex md:hidden bg-slate-950 border-b border-white/10 p-2 shrink-0 items-center justify-between">
                <div className="flex gap-1">
                  <button 
                    onClick={() => setActiveModalTab('form')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeModalTab === 'form' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
                  >
                    Formulir
                  </button>
                  <button 
                    onClick={() => setActiveModalTab('preview')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeModalTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
                  >
                    Preview Surat
                  </button>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 bg-white/10 rounded-lg text-slate-400 hover:text-white"><X size={16}/></button>
              </div>
            )}

            {/* Form Column */}
            {!isPreviewOnly && (
              <div className={`w-full md:w-1/3 p-4 sm:p-6 overflow-y-auto border-r border-white/5 space-y-4 custom-scrollbar shrink-0 ${activeModalTab === 'form' ? 'flex flex-col flex-1' : 'hidden md:flex md:flex-col'}`}>
                <div className="hidden md:flex justify-between items-center border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black uppercase italic">{editId ? 'Edit Surat' : 'Buat Surat Baru'}</h2>
                    {realtimeSyncStatus === 'saving' && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-bold flex items-center gap-1 animate-pulse">
                        <Loader2 size={10} className="animate-spin" /> Auto-Saving...
                      </span>
                    )}
                    {realtimeSyncStatus === 'synced' && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-bold flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-emerald-400" /> Realtime Sync Active
                      </span>
                    )}
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X size={20}/></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {/* SECTION 1: Media & Identitas Kop */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Media & Ukuran Aset Kop/TTD</p>
                      <div className="grid grid-cols-2 gap-2">
                          {/* Logo */}
                          <div className="relative border border-white/10 rounded-xl p-2 bg-black/20 flex flex-col items-center justify-between">
                            {formData.logo_url ? (
                              <div className="w-full flex flex-col items-center">
                                <img src={formData.logo_url} alt="Logo" className="h-8 max-w-full object-contain mb-1" />
                                <div className="flex items-center gap-1 w-full mt-1">
                                  <label className="flex-1 text-center text-[8px] font-bold text-blue-400 bg-blue-600/20 hover:bg-blue-600/30 py-1 rounded cursor-pointer">
                                    Ganti
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} />
                                  </label>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveAsset('logo_url')}
                                    className="p-1 text-rose-400 bg-rose-600/20 hover:bg-rose-600/30 rounded cursor-pointer"
                                    title="Hapus Logo"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full py-2 border-2 border-dashed border-white/10 rounded-lg hover:bg-white/5 cursor-pointer">
                                <ImageIcon size={14} className="mb-1 text-slate-400"/>
                                <span className="text-[7px] uppercase font-bold text-slate-500 text-center">Upload Logo</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} />
                              </label>
                            )}
                          </div>

                          {/* Cap Stempel */}
                          <div className="relative border border-white/10 rounded-xl p-2 bg-black/20 flex flex-col items-center justify-between">
                            {formData.cap_stempel_url ? (
                              <div className="w-full flex flex-col items-center">
                                <img src={formData.cap_stempel_url} alt="Stempel" className="h-8 max-w-full object-contain mb-1" />
                                <div className="flex items-center gap-1 w-full mt-1">
                                  <label className="flex-1 text-center text-[8px] font-bold text-blue-400 bg-blue-600/20 hover:bg-blue-600/30 py-1 rounded cursor-pointer">
                                    Ganti
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cap_stempel_url')} />
                                  </label>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveAsset('cap_stempel_url')}
                                    className="p-1 text-rose-400 bg-rose-600/20 hover:bg-rose-600/30 rounded cursor-pointer"
                                    title="Hapus Cap Stempel"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full py-2 border-2 border-dashed border-white/10 rounded-lg hover:bg-white/5 cursor-pointer">
                                <Upload size={14} className="mb-1 text-slate-400"/>
                                <span className="text-[7px] uppercase font-bold text-slate-500 text-center">Upload Stempel</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cap_stempel_url')} />
                              </label>
                            )}
                          </div>

                          {/* TTD Ketua */}
                          <div className="relative border border-white/10 rounded-xl p-2 bg-black/20 flex flex-col items-center justify-between">
                            {formData.ttd_ketua_url ? (
                              <div className="w-full flex flex-col items-center">
                                <img src={formData.ttd_ketua_url} alt="TTD Ketua" className="h-8 max-w-full object-contain mb-1 bg-white/10 rounded" />
                                <div className="flex items-center gap-1 w-full mt-1">
                                  <label className="flex-1 text-center text-[8px] font-bold text-blue-400 bg-blue-600/20 hover:bg-blue-600/30 py-1 rounded cursor-pointer">
                                    Ganti
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'ttd_ketua_url')} />
                                  </label>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveAsset('ttd_ketua_url')}
                                    className="p-1 text-rose-400 bg-rose-600/20 hover:bg-rose-600/30 rounded cursor-pointer"
                                    title="Hapus TTD Ketua"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full py-2 border-2 border-dashed border-white/10 rounded-lg hover:bg-white/5 cursor-pointer">
                                <Upload size={14} className="mb-1 text-slate-400"/>
                                <span className="text-[7px] uppercase font-bold text-slate-500 text-center">Upload TTD Ketua</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'ttd_ketua_url')} />
                              </label>
                            )}
                          </div>

                          {/* TTD Sekretaris */}
                          <div className="relative border border-white/10 rounded-xl p-2 bg-black/20 flex flex-col items-center justify-between">
                            {formData.ttd_sekretaris_url ? (
                              <div className="w-full flex flex-col items-center">
                                <img src={formData.ttd_sekretaris_url} alt="TTD Sekretaris" className="h-8 max-w-full object-contain mb-1 bg-white/10 rounded" />
                                <div className="flex items-center gap-1 w-full mt-1">
                                  <label className="flex-1 text-center text-[8px] font-bold text-blue-400 bg-blue-600/20 hover:bg-blue-600/30 py-1 rounded cursor-pointer">
                                    Ganti
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'ttd_sekretaris_url')} />
                                  </label>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveAsset('ttd_sekretaris_url')}
                                    className="p-1 text-rose-400 bg-rose-600/20 hover:bg-rose-600/30 rounded cursor-pointer"
                                    title="Hapus TTD Sekretaris"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-full py-2 border-2 border-dashed border-white/10 rounded-lg hover:bg-white/5 cursor-pointer">
                                <Upload size={14} className="mb-1 text-slate-400"/>
                                <span className="text-[7px] uppercase font-bold text-slate-500 text-center">Upload TTD Sekre</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'ttd_sekretaris_url')} />
                              </label>
                            )}
                          </div>
                      </div>

                      {/* Explicit Scale Controls in Form */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Pengaturan Skala Ukuran (%)</p>
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div className="p-2 bg-black/40 border border-white/10 rounded-lg">
                            <div className="flex justify-between font-bold text-slate-300 mb-1">
                              <span>Skala Logo</span>
                              <span className="text-blue-400">{formData.logo_scale || 100}%</span>
                            </div>
                            <input 
                              type="range" min="30" max="250" 
                              value={formData.logo_scale || 100} 
                              onChange={(e) => setFormData({...formData, logo_scale: parseInt(e.target.value, 10)})}
                              className="w-full accent-blue-500 cursor-pointer" 
                            />
                          </div>

                          <div className="p-2 bg-black/40 border border-white/10 rounded-lg">
                            <div className="flex justify-between font-bold text-slate-300 mb-1">
                              <span>Skala Cap Stempel</span>
                              <span className="text-blue-400">{formData.stempel_scale || 100}%</span>
                            </div>
                            <input 
                              type="range" min="30" max="250" 
                              value={formData.stempel_scale || 100} 
                              onChange={(e) => setFormData({...formData, stempel_scale: parseInt(e.target.value, 10)})}
                              className="w-full accent-blue-500 cursor-pointer" 
                            />
                          </div>

                          <div className="p-2 bg-black/40 border border-white/10 rounded-lg">
                            <div className="flex justify-between font-bold text-slate-300 mb-1">
                              <span>Skala TTD Ketua</span>
                              <span className="text-blue-400">{formData.ttd_ketua_scale || 100}%</span>
                            </div>
                            <input 
                              type="range" min="30" max="250" 
                              value={formData.ttd_ketua_scale || 100} 
                              onChange={(e) => setFormData({...formData, ttd_ketua_scale: parseInt(e.target.value, 10)})}
                              className="w-full accent-blue-500 cursor-pointer" 
                            />
                          </div>

                          <div className="p-2 bg-black/40 border border-white/10 rounded-lg">
                            <div className="flex justify-between font-bold text-slate-300 mb-1">
                              <span>Skala TTD Sekretaris</span>
                              <span className="text-blue-400">{formData.ttd_sekretaris_scale || 100}%</span>
                            </div>
                            <input 
                              type="range" min="30" max="250" 
                              value={formData.ttd_sekretaris_scale || 100} 
                              onChange={(e) => setFormData({...formData, ttd_sekretaris_scale: parseInt(e.target.value, 10)})}
                              className="w-full accent-blue-500 cursor-pointer" 
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyAssetsToAllSurat}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 text-blue-300 border border-blue-500/40 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-[0.99]"
                      >
                        <CheckCircle2 size={13} className="text-blue-400" />
                        Simpan Permanen ke Database (Default Seluruh Surat)
                      </button>
                  </div>

                  {/* SECTION 2: Template & Judul Khusus */}
                  <div className="space-y-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Jenis / Template Surat</label>
                      <select 
                        className="w-full p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-xs font-bold text-blue-400 outline-none cursor-pointer"
                        onChange={(e) => {
                          const template = JENIS_SURAT_TEMPLATES.find(t => t.id === e.target.value);
                          if (template) {
                            setFormData(prev => ({
                              ...prev,
                              perihal: template.perihal,
                              isi_surat: template.isi,
                              show_recipient: template.show_recipient ?? true,
                              show_greetings: template.show_greetings ?? true,
                              title_override: template.title_override ?? ''
                            }));
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled className="bg-slate-900 text-slate-500">Pilih template (opsional)...</option>
                        {JENIS_SURAT_TEMPLATES.map(t => (
                          <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.label}</option>
                        ))}
                      </select>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mt-2">Judul Khusus Surat (Title Override)</label>
                        <input 
                          type="text" 
                          placeholder="Contoh: SURAT TUGAS, SURAT IZIN (Kosongkan jika biasa)" 
                          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white font-bold" 
                          value={formData.title_override || ''} 
                          onChange={(e)=>setFormData({...formData, title_override: e.target.value})} 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center gap-2 p-2 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all" onClick={() => setFormData({...formData, show_recipient: !formData.show_recipient})}>
                          <input type="checkbox" checked={formData.show_recipient} onChange={() => {}} className="w-3 h-3 rounded bg-blue-600 border-none pointer-events-none" />
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Tampilkan Penerima</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-black/30 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all" onClick={() => setFormData({...formData, show_greetings: !formData.show_greetings})}>
                          <input type="checkbox" checked={formData.show_greetings} onChange={() => {}} className="w-3 h-3 rounded bg-blue-600 border-none pointer-events-none" />
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Tampilkan Salam</span>
                        </div>
                      </div>
                  </div>

                  {/* SECTION 3: Detail Utama Surat (Hal. 1) */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Detail Dokumen & Tanggal Surat (Hal. 1)</p>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nomor Surat</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, nomor_surat: generateNextNomorSurat(suratList) })}
                          className="text-[9px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                        >
                          Generate Otomatis Berikutnya
                        </button>
                      </div>
                      <input type="text" className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-blue-400 font-bold" value={formData.nomor_surat || ''} onChange={(e)=>setFormData({...formData, nomor_surat: e.target.value})} />
                    </div>

                    {/* Tanggal Pembuatan Surat (Kalender & Teks Format Resmi) */}
                    <div className="p-2.5 bg-blue-950/30 border border-blue-500/20 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={13} className="text-blue-400" />
                          Tanggal Pembuatan Surat
                        </label>
                        <span className="text-[9px] text-slate-400 font-medium">Kalender &amp; Format Teks</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Pilih Tanggal (Kalender)</label>
                          <input 
                            type="date" 
                            className="w-full p-2 bg-black/60 border border-white/15 rounded-lg text-xs text-blue-300 font-bold outline-none cursor-pointer focus:border-blue-500"
                            value={getSafeIsoDate(formData.created_at, formData.tempat_tanggal)}
                            onChange={(e) => {
                              const newIso = e.target.value;
                              if (newIso) {
                                const [y, m, d] = newIso.split('-').map(Number);
                                const dateObj = new Date(y, m - 1, d, 12, 0, 0);
                                const bulan = BULAN_INDONESIA[m - 1] || '';
                                
                                const existingCity = formData.tempat_tanggal?.includes(',') 
                                  ? formData.tempat_tanggal.split(',')[0].trim() 
                                  : 'Parepare';
                                
                                const newTempatTanggal = `${existingCity}, ${d} ${bulan} ${y}`;
                                
                                setFormData(prev => ({
                                  ...prev,
                                  created_at: dateObj.toISOString(),
                                  tempat_tanggal: newTempatTanggal
                                }));
                              }
                            }}
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Tempat & Tanggal Surat (Teks)</label>
                          <input 
                            type="text" 
                            className="w-full p-2 bg-black/60 border border-white/15 rounded-lg text-xs text-white font-bold outline-none focus:border-blue-500" 
                            value={formData.tempat_tanggal || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              const parsedIso = parseIndonesianDateToIso(val);
                              setFormData(prev => ({
                                ...prev,
                                tempat_tanggal: val,
                                ...(parsedIso ? { created_at: new Date(parsedIso + 'T12:00:00.000Z').toISOString() } : {})
                              }));
                            }} 
                            placeholder="Parepare, 27 Februari 2026" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Lampiran</label>
                        <input type="text" className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white" value={formData.lampiran || ''} onChange={(e)=>setFormData({...formData, lampiran: e.target.value})} placeholder="1 Lembar / -" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Perihal</label>
                        <textarea className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs h-10 text-white resize-none" value={formData.perihal || ''} onChange={(e)=>setFormData({...formData, perihal: e.target.value})} />
                      </div>
                    </div>

                    {formData.show_recipient && (
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Tujuan Yth.</label>
                          <input type="text" className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white" value={formData.tujuan_yth || ''} onChange={(e)=>setFormData({...formData, tujuan_yth: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Jabatan / Lokasi Tujuan</label>
                          <input type="text" className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white" value={formData.jabatan_tujuan || ''} onChange={(e)=>setFormData({...formData, jabatan_tujuan: e.target.value})} />
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between my-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Isi Paragraf Surat</label>
                        <button 
                          type="button"
                          onClick={handleGenerateAI}
                          disabled={isGeneratingAI}
                          className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-500/30 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isGeneratingAI ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          {isGeneratingAI ? 'Generating...' : 'Generate AI'}
                        </button>
                      </div>
                      <textarea className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs h-32 text-white" value={formData.isi_surat || ''} onChange={(e)=>setFormData({...formData, isi_surat: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Ketua</label>
                        <input type="text" className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white" value={formData.nama_ketua || ''} onChange={(e)=>setFormData({...formData, nama_ketua: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Sekretaris</label>
                        <input type="text" className="w-full p-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white" value={formData.nama_sekretaris || ''} onChange={(e)=>setFormData({...formData, nama_sekretaris: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Halaman Lampiran (Hal. 2 Seterusnya) */}
                  <div className="p-3 bg-purple-900/20 border border-purple-500/20 rounded-2xl space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-purple-500 rounded bg-black/40 border-white/20"
                        checked={formData.include_lampiran_peserta}
                        onChange={(e) => setFormData({...formData, include_lampiran_peserta: e.target.checked})}
                      />
                      <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider">Sertakan Halaman Lampiran (Hal. 2)</span>
                    </label>
                    
                    {formData.include_lampiran_peserta && (
                      <div className="space-y-2 pt-2 border-t border-purple-500/20">
                        <div>
                          <label className="text-[10px] font-bold text-purple-300 uppercase">Judul Lampiran</label>
                          <input 
                            type="text"
                            className="w-full p-2.5 bg-black/40 border border-purple-500/30 rounded-lg text-xs text-white font-bold"
                            value={formData.judul_lampiran || 'Daftar Lampiran Peserta'}
                            onChange={(e) => setFormData({...formData, judul_lampiran: e.target.value})}
                            placeholder="Daftar Lampiran Peserta / Daftar Delegasi / Atlet"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-purple-300 uppercase block">Daftar Nama &amp; Keterangan (1 baris per item)</label>
                          <p className="text-[9px] text-purple-200/80 mb-1">
                            Format: <code className="bg-purple-900/60 px-1 py-0.5 rounded text-purple-200 font-mono">Nama | Keterangan</code> atau <code className="bg-purple-900/60 px-1 py-0.5 rounded text-purple-200 font-mono">Nama - Keterangan</code>
                          </p>
                          <textarea 
                            placeholder={"Ali & Mas Ahmad | Manajer & Pelatih\nAbd. Majid & Owan | Pasangan Ganda\nH. Wawan & Janggoe - Ofisial"} 
                            className="w-full p-2.5 bg-black/40 border border-purple-500/30 rounded-lg text-xs h-32 whitespace-pre-wrap text-white font-mono" 
                            value={formData.lampiran_peserta || ''} 
                            onChange={(e)=>setFormData({...formData, lampiran_peserta: e.target.value})} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-4">
                    <button onClick={handleSave} disabled={isSubmitting} className="w-full py-3 bg-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all cursor-pointer">
                      {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} 
                      {editId ? 'Perbarui & Simpan' : 'Simpan ke Arsip'}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={handlePrint} className="flex-1 py-3 bg-slate-700 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-slate-600 transition-all cursor-pointer"><Printer size={14}/> Cetak PDF</button>
                      <button onClick={()=>setIsModalOpen(false)} className="flex-1 py-3 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold text-[10px] hover:bg-rose-500 hover:text-white transition-all cursor-pointer">Batal</button>
                    </div>
                </div>
              </div>
            )}

            {/* Preview Column */}
            <div className={`flex-1 bg-slate-800 p-2 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative flex flex-col items-center ${!isPreviewOnly && activeModalTab === 'form' ? 'hidden md:flex' : 'flex'}`}>
              
              {/* Preview Header Toolbar with Action Buttons & Zoom Controls */}
              <div className="w-full max-w-4xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 pt-1 sm:pt-0 z-50 no-print">
                {/* Zoom & Screen Fit Controls */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar py-0.5">
                  <div className="flex items-center gap-1 bg-slate-900/95 border border-white/10 rounded-xl p-1 text-white shadow-xl shrink-0">
                    <button 
                      onClick={() => setZoomScale(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))} 
                      className="p-1.5 hover:bg-white/10 active:bg-blue-600 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Zoom Out (-10%)"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 bg-black/60 border border-white/10 rounded-md text-blue-400 min-w-[44px] text-center">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button 
                      onClick={() => setZoomScale(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))} 
                      className="p-1.5 hover:bg-white/10 active:bg-blue-600 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Zoom In (+10%)"
                    >
                      <ZoomIn size={14} />
                    </button>

                    {/* Auto-Fit Mobile Screen Button */}
                    <button 
                      onClick={handleAutoFitMobile}
                      className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ml-0.5 shrink-0"
                      title="Sesuaikan Ukuran Layar HP"
                    >
                      <Maximize2 size={12} />
                      <span>Fit Layar</span>
                    </button>

                    <button 
                      onClick={() => setZoomScale(1.0)} 
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Reset 100%"
                    >
                      <RotateCcw size={13} />
                    </button>

                    {/* Zoom Presets */}
                    <div className="hidden md:flex items-center gap-1 border-l border-white/10 pl-1.5 ml-1">
                      {[0.5, 0.75, 1.0, 1.25].map(p => (
                        <button
                          key={p}
                          onClick={() => setZoomScale(p)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                            Math.abs(zoomScale - p) < 0.05
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {Math.round(p * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Realtime DB Sync Status Indicator Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/95 border border-white/10 rounded-xl text-white shadow-xl text-[10px] font-bold shrink-0">
                    {realtimeSyncStatus === 'saving' && (
                      <span className="flex items-center gap-1 text-amber-300 animate-pulse">
                        <Loader2 size={12} className="animate-spin text-amber-400" />
                        <span className="hidden xs:inline">Saving...</span>
                      </span>
                    )}
                    {(realtimeSyncStatus === 'synced' || realtimeSyncStatus === 'idle') && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span className="hidden xs:inline">Synced</span>
                      </span>
                    )}
                    {realtimeSyncStatus === 'offline' && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span className="hidden xs:inline">Offline</span>
                      </span>
                    )}
                  </div>

                  {/* Mobile Close Button */}
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="sm:hidden p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer text-white shrink-0"
                    title="Tutup Pratinjau"
                  >
                    <X size={18}/>
                  </button>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar w-full sm:w-auto py-0.5 shrink-0">
                  <button 
                    onClick={handleDownloadPDF} 
                    disabled={isDownloading !== null} 
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg shrink-0 transition-all cursor-pointer active:scale-95"
                    title="Unduh Surat sebagai Dokumen PDF (A4)"
                  >
                    {isDownloading === 'pdf' ? <Loader2 size={12} className="animate-spin"/> : <FileText size={12}/>} 
                    <span>Unduh PDF</span>
                  </button>

                  <button 
                    onClick={() => handleDownloadImage('jpg')} 
                    disabled={isDownloading !== null} 
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg shrink-0 transition-all cursor-pointer active:scale-95"
                    title="Unduh Surat sebagai Gambar JPG (Ultra HD)"
                  >
                    {isDownloading === 'jpg' ? <Loader2 size={12} className="animate-spin"/> : <ImageIcon size={12}/>} 
                    <span>JPG HD</span>
                  </button>

                  <button 
                    onClick={() => handleDownloadImage('png')} 
                    disabled={isDownloading !== null} 
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg shrink-0 transition-all cursor-pointer active:scale-95"
                    title="Unduh Surat sebagai Gambar PNG (Lossless Master HD)"
                  >
                    {isDownloading === 'png' ? <Loader2 size={12} className="animate-spin"/> : <ImageIcon size={12}/>} 
                    <span>PNG HD</span>
                  </button>

                  <button 
                    onClick={() => handleCopyImageToClipboard('page1')} 
                    disabled={isDownloading !== null} 
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg shrink-0 transition-all cursor-pointer active:scale-95"
                    title="Salin Gambar Halaman 1 ke Clipboard (Bisa langsung Paste / Ctrl+V di WA Web)"
                  >
                    <Copy size={12}/> 
                    <span className="hidden xs:inline">Salin WA</span>
                  </button>

                  <button 
                    onClick={() => handleSendWhatsApp(formData)} 
                    disabled={isSubmitting || isDownloading !== null} 
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg shrink-0 transition-all cursor-pointer active:scale-95"
                    title="Kirim Link PDF ke WhatsApp"
                  >
                    {isSubmitting ? <Loader2 size={12} className="animate-spin"/> : <MessageCircle size={12}/>} 
                    <span>WA</span>
                  </button>

                  <button 
                    onClick={handlePrint} 
                    disabled={isDownloading !== null}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg shrink-0 transition-all cursor-pointer active:scale-95"
                    title="Cetak Surat Langsung"
                  >
                    <Printer size={12}/> 
                    <span>Cetak</span>
                  </button>

                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="hidden sm:flex p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer text-white shrink-0"
                    title="Tutup Pratinjau"
                  >
                    <X size={16}/>
                  </button>
                </div>
              </div>

              {/* Floating Active Asset Controls Bar */}
              {selectedAsset && !isPreviewOnly && (
                <div className="w-full max-w-4xl mb-3 p-3 bg-slate-900/95 border border-blue-500/50 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 text-white no-print z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600/30 border border-blue-400/30 rounded-xl text-blue-400">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Aset Digital Terpilih</p>
                        {realtimeSyncStatus === 'saving' && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-bold flex items-center gap-1 animate-pulse">
                            <Loader2 size={10} className="animate-spin" /> Auto-Saving...
                          </span>
                        )}
                        {(realtimeSyncStatus === 'synced' || realtimeSyncStatus === 'idle') && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} className="text-emerald-400" /> Posisi & Skala Synced
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black text-white">
                        {selectedAsset === 'logo' && 'Logo PB Bilibili 162'}
                        {selectedAsset === 'ttd_ketua' && 'Tanda Tangan Ketua'}
                        {selectedAsset === 'stempel' && 'Cap Stempel Organisasi'}
                        {selectedAsset === 'ttd_sekretaris' && 'Tanda Tangan Sekretaris'}
                      </p>
                    </div>
                  </div>

                  {/* Sizing Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Ukuran:</span>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const key = `${selectedAsset}_scale` as any;
                        setFormData(prev => ({
                          ...prev,
                          [key]: Math.max(30, ((prev as any)[key] || 100) - 10)
                        }));
                      }}
                      className="p-1.5 bg-white/10 hover:bg-blue-600 rounded-lg text-white font-bold transition-all cursor-pointer"
                      title="Perkecil (-10%)"
                    >
                      <ZoomOut size={14} />
                    </button>

                    <input 
                      type="range"
                      min="30"
                      max="250"
                      value={
                        selectedAsset === 'logo' ? (formData.logo_scale || 100) :
                        selectedAsset === 'ttd_ketua' ? (formData.ttd_ketua_scale || 100) :
                        selectedAsset === 'stempel' ? (formData.stempel_scale || 100) :
                        (formData.ttd_sekretaris_scale || 100)
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const key = `${selectedAsset}_scale` as any;
                        setFormData(prev => ({ ...prev, [key]: val }));
                      }}
                      className="w-24 sm:w-32 accent-blue-500 cursor-pointer"
                    />

                    <span className="text-xs font-mono font-black text-blue-400 bg-black/60 px-2 py-1 rounded-md border border-white/10 min-w-[50px] text-center">
                      {selectedAsset === 'logo' ? (formData.logo_scale || 100) :
                       selectedAsset === 'ttd_ketua' ? (formData.ttd_ketua_scale || 100) :
                       selectedAsset === 'stempel' ? (formData.stempel_scale || 100) :
                       (formData.ttd_sekretaris_scale || 100)}%
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const key = `${selectedAsset}_scale` as any;
                        setFormData(prev => ({
                          ...prev,
                          [key]: Math.min(250, ((prev as any)[key] || 100) + 10)
                        }));
                      }}
                      className="p-1.5 bg-white/10 hover:bg-blue-600 rounded-lg text-white font-bold transition-all cursor-pointer"
                      title="Perbesar (+10%)"
                    >
                      <ZoomIn size={14} />
                    </button>

                    <div className="hidden xs:flex items-center gap-1 border-l border-white/10 pl-2">
                      {[50, 75, 100, 125, 150, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const key = `${selectedAsset}_scale` as any;
                            setFormData(prev => ({ ...prev, [key]: preset }));
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                            ((selectedAsset === 'logo' ? formData.logo_scale :
                              selectedAsset === 'ttd_ketua' ? formData.ttd_ketua_scale :
                              selectedAsset === 'stempel' ? formData.stempel_scale :
                              formData.ttd_sekretaris_scale) || 100) === preset
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/5 text-slate-300 hover:bg-white/15'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const key = `${selectedAsset}_scale` as any;
                        setFormData(prev => ({ ...prev, [key]: 100 }));
                      }}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 ml-1"
                      title="Reset Ukuran ke 100%"
                    >
                      <RotateCcw size={11} /> Reset Ukuran
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAsset === 'logo') setLogoPos({ x: 0, y: 0 });
                        else if (selectedAsset === 'stempel') setStempelPos({ x: -35, y: 0 });
                        else if (selectedAsset === 'ttd_ketua') setTtdKetuaPos({ x: 0, y: 0 });
                        else if (selectedAsset === 'ttd_sekretaris') setTtdSekretarisPos({ x: 0, y: 0 });
                      }}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      title="Reset Posisi Awal"
                    >
                      <RotateCcw size={11} /> Reset Posisi
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedAsset(null)}
                      className="p-1 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-all cursor-pointer ml-1"
                      title="Tutup Kontrol Aset"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Paper wrapper with smooth zoom scale & exact layout bounds */}
              <div id="preview-paper-container" className="w-full flex justify-center items-start overflow-x-auto overflow-y-auto p-2 sm:p-6 pb-20 min-h-[500px] flex-1">
                <div 
                  style={{ 
                    width: `${Math.round(794 * zoomScale)}px`,
                    height: `${Math.round((paperHeight + 40) * zoomScale)}px`,
                    position: 'relative'
                  }}
                  className="shrink-0 transition-all duration-150 ease-out mx-auto my-2"
                >
                  <div 
                    style={{ 
                      transform: `scale(${zoomScale})`, 
                      transformOrigin: 'top left',
                      width: '794px',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}
                    className="shrink-0 space-y-8"
                  >
                    <div ref={printRef} className="space-y-8">
                      {/* === HALAMAN 1: SURAT UTAMA === */}
                      <div 
                        ref={page1Ref} 
                        onClick={() => setSelectedAsset(null)}
                        className="bg-white text-black p-[1.5cm] w-[794px] min-h-[1123px] shadow-2xl font-serif text-[11.5pt] leading-[1.65] relative overflow-hidden shrink-0 select-text rounded-sm border border-slate-200"
                        style={{ textRendering: 'geometricPrecision' }}
                      >
                        {/* Halaman 1 Badge Header in Preview */}
                        {formData.include_lampiran_peserta && (
                          <div className="no-print no-export absolute top-2 right-3 text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Halaman 1 dari 2 (Surat Utama - A4)
                          </div>
                        )}

                        <div className="flex items-center border-b-[4px] border-black pb-2 mb-6">
                          <div 
                            onPointerDown={(e) => handleAssetPointerDown(e, 'logo')}
                            onPointerMove={handleAssetPointerMove}
                            onPointerUp={handleAssetPointerUp}
                            style={{
                              transform: `translate(${logoPos.x}px, ${logoPos.y}px)`,
                              width: `${160 * ((formData.logo_scale || 100) / 100)}px`,
                              height: `${160 * ((formData.logo_scale || 100) / 100)}px`,
                            }}
                            className={`flex-shrink-0 flex items-center justify-center mr-4 relative cursor-grab active:cursor-grabbing group transition-all select-none touch-none ${
                              selectedAsset === 'logo' ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : 'hover:ring-1 hover:ring-blue-300 rounded-lg'
                            }`}
                            title="Klik / Tarik untuk menggeser & ubah ukuran Logo"
                          >
                            <img 
                              src={getValidAssetUrl(formData.logo_url, DEFAULT_LOGO_URL)} 
                              alt="Logo PB Bilibili 162" 
                              crossOrigin="anonymous"
                              onError={(e) => { e.currentTarget.src = DEFAULT_LOGO_URL; }}
                              className="w-full h-full object-contain pointer-events-none" 
                            />
                            {!isPreviewOnly && (
                              <div className="hidden group-hover:flex absolute inset-0 border-2 border-blue-500 border-dashed rounded-lg items-center justify-center">
                                <Move size={14} className="text-blue-500"/>
                              </div>
                            )}
                            {selectedAsset === 'logo' && !isPreviewOnly && (
                              <div 
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  handleResizePointerDown(e, 'logo_scale');
                                }}
                                className="no-print absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-se-resize z-30 hover:scale-125 transition-transform"
                                title="Tarik untuk mengubah ukuran Logo"
                              >
                                <Maximize2 size={10} />
                              </div>
                            )}
                          </div>
                          <div className="text-center flex-1">
                            <h1 className="text-2xl sm:text-[26px] font-black uppercase leading-tight tracking-tight text-black">PB BILIBILI 162</h1>
                            <p className="text-[9pt] leading-tight font-sans font-semibold text-black mt-0.5">Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131</p>
                            <p className="text-[9pt] font-sans font-semibold text-black">Telepon: 081219027234 | Email: pbilibili162@gmail.com</p>
                          </div>
                        </div>

                        {formData.title_override && (
                          <div className="mb-6 text-center">
                            <h2 className="text-xl font-bold underline underline-offset-8 decoration-2 uppercase tracking-widest text-black">{formData.title_override}</h2>
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-6 text-black">
                            <div className="flex-1 space-y-0.5">
                                <p>Nomor : {formData.nomor_surat}</p>
                                <p>Lampiran : {formData.lampiran}</p>
                                <p>Perihal : <strong className="font-bold">{formData.perihal}</strong></p>
                            </div>
                            <div className="whitespace-nowrap ml-4 text-right">
                                <p>{formData.tempat_tanggal}</p>
                            </div>
                        </div>

                        {formData.show_recipient && (
                          <div className="mb-6 text-black space-y-0.5">
                              <p>Kepada Yth.</p>
                              <p className="font-bold">{formData.tujuan_yth}</p>
                              {formData.jabatan_tujuan && <p>{formData.jabatan_tujuan}</p>}
                              <p>Di - Tempat</p>
                          </div>
                        )}

                        <div className="space-y-4 text-justify text-black">
                            {formData.show_greetings && (
                              <>
                                <p>Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
                                <p className="font-bold">Dengan hormat,</p>
                              </>
                            )}
                            <p className="whitespace-pre-line leading-[1.65]">{formData.isi_surat}</p>
                        </div>

                        <div className="mt-12 flex justify-between px-10 relative text-black">
                            <div className="text-center w-48 relative">
                                <p className="mb-20 font-medium">Ketua,</p>
                                <div 
                                    onPointerDown={(e) => handleAssetPointerDown(e, 'ttd_ketua')}
                                    onPointerMove={handleAssetPointerMove}
                                    onPointerUp={handleAssetPointerUp}
                                    style={{
                                      left: '50%',
                                      top: '32px',
                                      transform: `translate(calc(-50% + ${ttdKetuaPos.x}px), ${ttdKetuaPos.y}px)`,
                                      height: `${80 * ((formData.ttd_ketua_scale || 100) / 100)}px`,
                                      minWidth: `${120 * ((formData.ttd_ketua_scale || 100) / 100)}px`,
                                    }}
                                    className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing group transition-all z-10 select-none touch-none ${
                                      selectedAsset === 'ttd_ketua' ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : 'hover:ring-1 hover:ring-blue-300 rounded-lg'
                                    }`}
                                    title="Klik / Tarik untuk menggeser & ubah ukuran TTD Ketua"
                                >
                                    {getValidAssetUrl(formData.ttd_ketua_url, '') ? (
                                      <img 
                                          src={getValidAssetUrl(formData.ttd_ketua_url, '')} 
                                          alt="TTD Ketua" 
                                          crossOrigin="anonymous"
                                          className="h-full object-contain mix-blend-multiply pointer-events-none" 
                                      />
                                    ) : (
                                      !isPreviewOnly && (
                                        <div className="w-full h-full border border-dashed border-slate-300 rounded flex items-center justify-center text-[8px] text-slate-400">
                                          (TTD Ketua)
                                        </div>
                                      )
                                    )}
                                    {!isPreviewOnly && (
                                      <div className="hidden group-hover:flex absolute inset-0 border-2 border-blue-500 border-dashed rounded-lg items-center justify-center">
                                        <Move size={14} className="text-blue-500"/>
                                      </div>
                                    )}
                                    {selectedAsset === 'ttd_ketua' && !isPreviewOnly && (
                                      <div 
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          handleResizePointerDown(e, 'ttd_ketua_scale');
                                        }}
                                        className="no-print absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-se-resize z-30 hover:scale-125 transition-transform"
                                        title="Tarik untuk mengubah ukuran TTD Ketua"
                                      >
                                        <Maximize2 size={10} />
                                      </div>
                                    )}
                                </div>
                                
                                <div 
                                    onPointerDown={(e) => handleAssetPointerDown(e, 'stempel')}
                                    onPointerMove={handleAssetPointerMove}
                                    onPointerUp={handleAssetPointerUp}
                                    style={{ 
                                      left: '50%',
                                      top: '20px',
                                      transform: `translate(calc(-50% + ${stempelPos.x}px), ${stempelPos.y}px)`,
                                      width: `${112 * ((formData.stempel_scale || 100) / 100)}px`,
                                      height: `${112 * ((formData.stempel_scale || 100) / 100)}px`,
                                    }}
                                    className={`absolute cursor-grab active:cursor-grabbing z-20 group select-none touch-none transition-all ${
                                      selectedAsset === 'stempel' ? 'ring-2 ring-blue-500 ring-offset-2 rounded-full' : 'hover:ring-1 hover:ring-blue-300 rounded-full'
                                    }`}
                                    title="Klik / Tarik untuk menggeser & ubah ukuran Cap Stempel"
                                >
                                    {getValidAssetUrl(formData.cap_stempel_url, '') ? (
                                      <img 
                                          src={getValidAssetUrl(formData.cap_stempel_url, '')} 
                                          alt="Cap Stempel" 
                                          crossOrigin="anonymous"
                                          className="w-full h-full object-contain opacity-80 mix-blend-darken pointer-events-none" 
                                      />
                                    ) : (
                                      !isPreviewOnly && (
                                        <div className="w-full h-full border border-dashed border-slate-300 rounded-full flex items-center justify-center text-[8px] text-slate-400">
                                          (Stempel)
                                        </div>
                                      )
                                    )}
                                    {!isPreviewOnly && (
                                        <div className="hidden group-hover:flex absolute inset-0 border-2 border-blue-500 border-dashed rounded-full items-center justify-center">
                                            <Move size={16} className="text-blue-500"/>
                                        </div>
                                    )}
                                    {selectedAsset === 'stempel' && !isPreviewOnly && (
                                      <div 
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          handleResizePointerDown(e, 'stempel_scale');
                                        }}
                                        className="no-print absolute bottom-0 right-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-se-resize z-30 hover:scale-125 transition-transform"
                                        title="Tarik untuk mengubah ukuran Cap Stempel"
                                      >
                                        <Maximize2 size={10} />
                                      </div>
                                    )}
                                </div>
                                <p className="font-bold underline uppercase whitespace-nowrap">{formData.nama_ketua}</p>
                            </div>

                            <div className="text-center w-48 relative">
                                <p className="mb-20 font-medium">Sekretaris,</p>
                                <div 
                                    onPointerDown={(e) => handleAssetPointerDown(e, 'ttd_sekretaris')}
                                    onPointerMove={handleAssetPointerMove}
                                    onPointerUp={handleAssetPointerUp}
                                    style={{
                                      left: '50%',
                                      top: '32px',
                                      transform: `translate(calc(-50% + ${ttdSekretarisPos.x}px), ${ttdSekretarisPos.y}px)`,
                                      height: `${80 * ((formData.ttd_sekretaris_scale || 100) / 100)}px`,
                                      minWidth: `${120 * ((formData.ttd_sekretaris_scale || 100) / 100)}px`,
                                    }}
                                    className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing group transition-all z-10 select-none touch-none ${
                                      selectedAsset === 'ttd_sekretaris' ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : 'hover:ring-1 hover:ring-blue-300 rounded-lg'
                                    }`}
                                    title="Klik / Tarik untuk menggeser & ubah ukuran TTD Sekretaris"
                                >
                                    {getValidAssetUrl(formData.ttd_sekretaris_url, '') ? (
                                      <img 
                                          src={getValidAssetUrl(formData.ttd_sekretaris_url, '')} 
                                          alt="TTD Sekretaris" 
                                          crossOrigin="anonymous"
                                          className="h-full object-contain mix-blend-multiply pointer-events-none" 
                                      />
                                    ) : (
                                      !isPreviewOnly && (
                                        <div className="w-full h-full border border-dashed border-slate-300 rounded flex items-center justify-center text-[8px] text-slate-400">
                                          (TTD Sekretaris)
                                        </div>
                                      )
                                    )}
                                    {!isPreviewOnly && (
                                      <div className="hidden group-hover:flex absolute inset-0 border-2 border-blue-500 border-dashed rounded-lg items-center justify-center">
                                        <Move size={14} className="text-blue-500"/>
                                      </div>
                                    )}
                                    {selectedAsset === 'ttd_sekretaris' && !isPreviewOnly && (
                                      <div 
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          handleResizePointerDown(e, 'ttd_sekretaris_scale');
                                        }}
                                        className="no-print absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-se-resize z-30 hover:scale-125 transition-transform"
                                        title="Tarik untuk mengubah ukuran TTD Sekretaris"
                                      >
                                        <Maximize2 size={10} />
                                      </div>
                                    )}
                                </div>
                                <p className="font-bold underline uppercase whitespace-nowrap">{formData.nama_sekretaris}</p>
                            </div>
                        </div>
                      </div>

                      {/* === HALAMAN 2: LAMPIRAN PESERTA === */}
                      {formData.include_lampiran_peserta && (
                        <div 
                          ref={page2Ref}
                          className="bg-white text-black p-[1.5cm] w-[794px] min-h-[1123px] shadow-2xl font-serif text-[11.5pt] leading-[1.65] relative overflow-hidden shrink-0 select-text rounded-sm border border-slate-200"
                          style={{ textRendering: 'geometricPrecision' }}
                        >
                          {/* Halaman 2 Badge Header in Preview */}
                          <div className="no-print no-export absolute top-2 right-3 text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Halaman 2 dari 2 (Lampiran Peserta - A4)
                          </div>

                          <div className="mb-6 border-b-2 border-black pb-3">
                            <div className="flex justify-between items-start text-[11pt] text-black">
                              <div className="space-y-0.5">
                                <p className="font-bold uppercase tracking-wide">Lampiran Surat</p>
                                <p>Nomor : {formData.nomor_surat}</p>
                                <p>Perihal : <strong className="font-bold">{formData.perihal}</strong></p>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <p>{formData.tempat_tanggal}</p>
                                <p className="text-[10pt] font-sans text-slate-700">PB BILIBILI 162</p>
                              </div>
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-center mb-6 uppercase tracking-wider underline underline-offset-4 text-black">
                            {formData.judul_lampiran || 'Daftar Lampiran Peserta'}
                          </h3>

                          <table className="w-full border-collapse border-[1.5px] border-black text-left font-sans text-[10.5pt] text-black">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border-[1.5px] border-black p-2.5 text-center w-12 font-bold text-black">No</th>
                                <th className="border-[1.5px] border-black p-2.5 font-bold text-black">Nama Peserta</th>
                                <th className="border-[1.5px] border-black p-2.5 font-bold text-black">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(formData.lampiran_peserta || '')
                                .split('\n')
                                .map(line => parseLampiranRow(line))
                                .filter((row): row is { nama: string; keterangan: string } => row !== null && (row.nama.length > 0 || row.keterangan.length > 0))
                                .map((row, i) => (
                                  <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                                    <td className="border-[1.5px] border-black p-2.5 text-center font-medium text-black">{i + 1}</td>
                                    <td className="border-[1.5px] border-black p-2.5 font-bold text-black">{row.nama}</td>
                                    <td className="border-[1.5px] border-black p-2.5 text-black">{row.keterangan || '-'}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>

                          {/* Formal Authorization Footer for Lampiran (Page 2) */}
                          <div className="mt-8 pt-4 border-t border-slate-300">
                            <div className="text-right text-[11pt] font-serif text-black mb-4">
                              <p>{formData.tempat_tanggal}</p>
                              <p className="font-bold text-sm tracking-wide mt-0.5 uppercase">PENGURUS PB BILIBILI 162 PAREPARE</p>
                            </div>

                            <div className="flex justify-between px-10 relative text-black">
                              {/* Ketua */}
                              <div className="text-center w-48 relative">
                                <p className="mb-20 font-medium">Ketua,</p>
                                <div 
                                  style={{
                                    left: '50%',
                                    top: '32px',
                                    transform: `translate(calc(-50% + ${ttdKetuaPos.x}px), ${ttdKetuaPos.y}px)`,
                                    height: `${80 * ((formData.ttd_ketua_scale || 100) / 100)}px`,
                                    minWidth: `${120 * ((formData.ttd_ketua_scale || 100) / 100)}px`,
                                  }}
                                  className="absolute flex items-center justify-center pointer-events-none z-10"
                                >
                                  {getValidAssetUrl(formData.ttd_ketua_url, '') ? (
                                    <img 
                                      src={getValidAssetUrl(formData.ttd_ketua_url, '')} 
                                      alt="TTD Ketua" 
                                      crossOrigin="anonymous"
                                      className="h-full object-contain mix-blend-multiply" 
                                    />
                                  ) : null}
                                </div>
                                
                                <div 
                                  style={{ 
                                    left: '50%',
                                    top: '20px',
                                    transform: `translate(calc(-50% + ${stempelPos.x}px), ${stempelPos.y}px)`,
                                    width: `${112 * ((formData.stempel_scale || 100) / 100)}px`,
                                    height: `${112 * ((formData.stempel_scale || 100) / 100)}px`,
                                  }}
                                  className="absolute pointer-events-none z-20"
                                >
                                  {getValidAssetUrl(formData.cap_stempel_url, '') ? (
                                    <img 
                                      src={getValidAssetUrl(formData.cap_stempel_url, '')} 
                                      alt="Cap Stempel" 
                                      crossOrigin="anonymous"
                                      className="w-full h-full object-contain opacity-80 mix-blend-darken" 
                                    />
                                  ) : null}
                                </div>
                                <p className="font-bold underline uppercase whitespace-nowrap">{formData.nama_ketua}</p>
                              </div>

                              {/* Sekretaris */}
                              <div className="text-center w-48 relative">
                                <p className="mb-20 font-medium">Sekretaris,</p>
                                <div 
                                  style={{
                                    left: '50%',
                                    top: '32px',
                                    transform: `translate(calc(-50% + ${ttdSekretarisPos.x}px), ${ttdSekretarisPos.y}px)`,
                                    height: `${80 * ((formData.ttd_sekretaris_scale || 100) / 100)}px`,
                                    minWidth: `${120 * ((formData.ttd_sekretaris_scale || 100) / 100)}px`,
                                  }}
                                  className="absolute flex items-center justify-center pointer-events-none z-10"
                                >
                                  {getValidAssetUrl(formData.ttd_sekretaris_url, '') ? (
                                    <img 
                                      src={getValidAssetUrl(formData.ttd_sekretaris_url, '')} 
                                      alt="TTD Sekretaris" 
                                      crossOrigin="anonymous"
                                      className="h-full object-contain mix-blend-multiply" 
                                    />
                                  ) : null}
                                </div>
                                <p className="font-bold underline uppercase whitespace-nowrap">{formData.nama_sekretaris}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SURAT MASUK */}
      {isMasukModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
              <h3 className="text-base font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                <Mail className="text-purple-500" size={18} />
                {editMasukId ? 'Edit Surat Masuk' : 'Catat Surat Masuk Baru'}
              </h3>
              <button onClick={() => setIsMasukModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSuratMasuk} className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nomor Surat Masuk *</label>
                  <input
                    type="text"
                    required
                    className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:border-purple-500 outline-none"
                    placeholder="Contoh: 042/SM/II/2026"
                    value={suratMasukForm.nomor_surat}
                    onChange={e => setSuratMasukForm({...suratMasukForm, nomor_surat: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Pengirim / Instansi Asal *</label>
                  <input
                    type="text"
                    required
                    className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none"
                    placeholder="Contoh: Dispora Parepare"
                    value={suratMasukForm.pengirim}
                    onChange={e => setSuratMasukForm({...suratMasukForm, pengirim: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Surat</label>
                  <input
                    type="date"
                    className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none"
                    value={suratMasukForm.tanggal_surat}
                    onChange={e => setSuratMasukForm({...suratMasukForm, tanggal_surat: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Diterima</label>
                  <input
                    type="date"
                    className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none"
                    value={suratMasukForm.tanggal_diterima}
                    onChange={e => setSuratMasukForm({...suratMasukForm, tanggal_diterima: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Perihal Surat *</label>
                <textarea
                  required
                  className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white h-20 focus:border-purple-500 outline-none"
                  placeholder="Ringkasan atau perihal isi surat masuk..."
                  value={suratMasukForm.perihal}
                  onChange={e => setSuratMasukForm({...suratMasukForm, perihal: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sifat Surat</label>
                  <select
                    className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none"
                    value={suratMasukForm.sifat_surat}
                    onChange={e => setSuratMasukForm({...suratMasukForm, sifat_surat: e.target.value})}
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Segera">Segera</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Disposisi Kepada</label>
                  <select
                    className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none"
                    value={suratMasukForm.disposisi_kepada}
                    onChange={e => setSuratMasukForm({...suratMasukForm, disposisi_kepada: e.target.value})}
                  >
                    <option value="Ketua PB Bilibili 162">Ketua PB Bilibili 162</option>
                    <option value="Sekretaris Klub">Sekretaris Klub</option>
                    <option value="Pelatih Kepala">Pelatih Kepala</option>
                    <option value="Bendahara">Bendahara</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Status Disposisi</label>
                  <select
                    className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none"
                    value={suratMasukForm.status_disposisi}
                    onChange={e => setSuratMasukForm({...suratMasukForm, status_disposisi: e.target.value})}
                  >
                    <option value="Belum Disposisi">Belum Disposisi</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Catatan Disposisi / Tindak Lanjut</label>
                <input
                  type="text"
                  className="w-full mt-1 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-purple-500 outline-none"
                  placeholder="Instruksi atau catatan tindak lanjut..."
                  value={suratMasukForm.catatan_disposisi}
                  onChange={e => setSuratMasukForm({...suratMasukForm, catatan_disposisi: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Lampiran File / Scan Surat (Opsional)</label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all border border-white/10 flex items-center gap-2">
                    <Upload size={14} /> Pilih File / Gambar
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleMasukFileUpload} />
                  </label>
                  {suratMasukForm.file_url && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> File Terlampir
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {editMasukId ? 'Perbarui Surat Masuk' : 'Simpan Surat Masuk'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMasukModalOpen(false)}
                  className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FILE MODAL */}
      {viewFileModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/30">
              <h3 className="text-sm font-black text-white uppercase italic tracking-wider">Pratinjau Lampiran Surat Masuk</h3>
              <button onClick={() => setViewFileModalUrl(null)} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-black/60">
              {viewFileModalUrl.startsWith('data:image/') || viewFileModalUrl.startsWith('http') ? (
                <img src={viewFileModalUrl} alt="Lampiran Surat Masuk" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
              ) : (
                <iframe src={viewFileModalUrl} className="w-full h-[70vh] rounded-xl border border-white/10 bg-white" title="PDF Viewer" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
