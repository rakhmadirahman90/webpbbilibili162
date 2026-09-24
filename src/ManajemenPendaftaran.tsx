import React, { useEffect, useState } from 'react';
import { supabase } from "./supabase";
import { deleteAthleteCompletely } from "./utils/siteSettingsHelper";
import { 
  Trash2, 
  RefreshCcw, 
  Search, 
  Phone, 
  MapPin, 
  ChevronLeft,
  ChevronRight,
  Edit3,
  X,
  Save,
  User,
  Camera,
  Loader2,
  Users,
  FileSpreadsheet,
  FileText,
  Plus,
  Upload,
  Clock,
  Calendar,
  Download,
  Share2,
  Activity,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  Check
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

interface Registrant {
  id: string;
  created_at: string;
  nama: string;
  whatsapp: string;
  email?: string;
  kategori: string;
  domisili: string;
  pengalaman: string;
  foto_url: string;
  jenis_kelamin: string;
  kategori_atlet: string; // Kolom kategori atlet sesuai DB
  status?: string; // 'aktif' | 'tidak aktif' | 'Ditolak' | 'Pending'
  alasan_status?: string;
  tanggal_registrasi?: string;
  nama_panggilan?: string;
  nama_punggung?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  tahun_bergabung?: number;
  tangan_dominan?: string;
  hobi?: string;
  makanan_favorit?: string;
  prestasi?: string;
  updated_at?: string;
  bilibili_cup1_photo_path?: string | null;
  bilibili_cup1_partner_name?: string | null;
  display_foto_url?: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});

export default function ManajemenPendaftaran() {
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'pending' | 'diterima' | 'ditolak'>('semua');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Registrant | null>(null);
  const [newItem, setNewItem] = useState<Partial<Registrant>>({
    nama: '',
    whatsapp: '',
    kategori: 'Pra Dini (U-9)',
    domisili: '',
    jenis_kelamin: 'Putra',
    foto_url: '',
    kategori_atlet: 'Muda',
    status: 'Pending'
  });
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 8; 

  const kategoriUmur = [
    "Pra Dini (U-9)", "Usia Dini (U-11)", "Anak-anak (U-13)", 
    "Pemula (U-15)", "Remaja (U-17)", "Taruna (U-19)", 
    "Dewasa / Umum", "Veteran (35+ / 40+)"
  ];

// Helper untuk normalisasi status agar konsisten dengan DB
const getStatusCategory = (st?: string): 'pending' | 'diterima' | 'ditolak' | 'tidak_aktif' => {
  const clean = String(st ?? '').trim().toLowerCase();
  if (['aktif', 'active', 'diterima', 'verified', 'approved', 'terima', 'disetujui'].includes(clean)) return 'diterima';
  if (['ditolak', 'rejected', 'tolak', 'disapproved'].includes(clean)) return 'ditolak';
  if (['tidak aktif', 'inactive', 'nonaktif', 'non-aktif'].includes(clean)) return 'tidak_aktif';
  if (!clean || ['pending', 'menunggu', 'menunggu verifikasi', 'belum diverifikasi', 'verifikasi'].includes(clean)) return 'pending';
  return 'pending';
};

// --- MENGHITUNG JUMLAH PENDAFTAR (STATISTIK LENGKAP REALTIME) ---
const totalPendaftar = registrants.length;

// Filter Status Verifikasi
const totalPending = registrants.filter(r => getStatusCategory(r.status) === 'pending').length;
const totalDiterima = registrants.filter(r => getStatusCategory(r.status) === 'diterima').length;
const totalDitolak = registrants.filter(r => getStatusCategory(r.status) === 'ditolak').length;

// Filter Jenis Kelamin Umum (Dipaksa Uppercase untuk keamanan)
const totalPutra = registrants.filter(r => (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRA').length;
const totalPutri = registrants.filter(r => (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRI').length;

// --- STATISTIK ATLET MUDA ---
const totalMuda = registrants.filter(r => (r.kategori_atlet || '').toUpperCase().trim() === 'MUDA').length;
const totalMudaPutra = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() === 'MUDA' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRA'
).length;
const totalMudaPutri = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() === 'MUDA' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRI'
).length;

// --- STATISTIK ATLET SENIOR ---
const totalSenior = registrants.filter(r => (r.kategori_atlet || '').toUpperCase().trim() !== 'MUDA').length;
const totalSeniorPutra = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() !== 'MUDA' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRA'
).length;
const totalSeniorPutri = registrants.filter(r => 
  (r.kategori_atlet || '').toUpperCase().trim() !== 'MUDA' && (r.jenis_kelamin || '').toUpperCase().trim() === 'PUTRI'
).length;

  // --- UTILS ---
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            resolve(blob as Blob);
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  // --- EXPORT & TEMPLATE FUNCTIONS ---
  const exportToExcel = () => {
    if (filteredData.length === 0) return Swal.fire("Opps!", "Tidak ada data untuk diekspor", "warning");
    const dataToExport = filteredData.map((item, index) => ({
      No: index + 1,
      Nama: (item.nama || '').toUpperCase(),
      Gender: item.jenis_kelamin || '-',
      Kategori_Umur: item.kategori || '-',
      Kategori_Atlet: item.kategori_atlet || '-',
      WhatsApp: item.whatsapp || '-',
      Domisili: item.domisili || '-',
      Tanggal_Daftar: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-',
      Waktu_Daftar: item.created_at ? new Date(item.created_at).toLocaleTimeString('id-ID') : '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pendaftar");
    XLSX.writeFile(workbook, `Data_Atlet_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) return Swal.fire("Opps!", "Tidak ada data untuk diekspor", "warning");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("LAPORAN DATA PENDAFTARAN ATLET", 14, 15);
    const tableColumn = ["No", "Nama Atlet", "Gender", "Kat. Atlet", "Kat. Umur", "Domisili", "WhatsApp", "Tgl Daftar"];
    const tableRows = filteredData.map((item, index) => [
      index + 1,
      (item.nama || '').toUpperCase(),
      item.jenis_kelamin || '-',
      item.kategori_atlet || '-',
      item.kategori || '-',
      item.domisili || '-',
      item.whatsapp || '-',
      item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
    });
    doc.save(`Data_Atlet_${Date.now()}.pdf`);
  };

  const downloadTemplate = () => {
    const templateData = [
      { Nama: "Contoh Nama Atlet", WhatsApp: "081234567890", Kategori_Umur: "Dewasa / Umum", Kategori_Atlet: "Senior", Domisili: "Makassar", Gender: "Putra" },
      { Nama: "Susi Susanti", WhatsApp: "089876543210", Kategori_Umur: "Remaja (U-17)", Kategori_Atlet: "Muda", Domisili: "Jakarta", Gender: "Putri" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_Import_Atlet.xlsx");
  };

  // --- IMPORT EXCEL ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) throw new Error("File kosong");

        const formattedData = data.map((item: any) => ({
          nama: (item.Nama || item.nama || '').toUpperCase(),
          whatsapp: String(item.WhatsApp || item.whatsapp || ''),
          kategori: item.Kategori_Umur || item.Kategori || item.kategori || 'Umum',
          kategori_atlet: item.Kategori_Atlet || item.kategori_atlet || 'Muda',
          domisili: (item.Domisili || item.domisili || '').toUpperCase(),
          jenis_kelamin: item.Gender || item.jenis_kelamin || 'Putra',
        }));

        const { error } = await supabase.from('pendaftaran').insert(formattedData);
        if (error) throw error;

        Toast.fire({ icon: 'success', title: `${data.length} Data berhasil diimport` });
        fetchData();
      } catch (err: any) {
        Swal.fire("Gagal Import", err.message, "error");
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // --- CORE FUNCTIONS ---
  const enrichTournamentPhotos = async (rows: Registrant[]): Promise<Registrant[]> => {
    const paths = Array.from(new Set(
      rows
        .filter(row => !row.foto_url && row.bilibili_cup1_photo_path)
        .map(row => row.bilibili_cup1_photo_path as string)
        .filter(Boolean)
    ));

    if (paths.length === 0) {
      return rows.map(row => ({ ...row, display_foto_url: row.foto_url || '' }));
    }

    try {
      const { data: signedRows, error } = await supabase.storage
        .from('turnamen-dokumen')
        .createSignedUrls(paths, 60 * 60);

      if (error) {
        console.warn('Foto peserta CUP I belum dapat dibuat signed URL:', error.message);
      }

      const signedByPath = new Map(
        (signedRows || [])
          .filter((row: any) => row?.path && row?.signedUrl)
          .map((row: any) => [row.path, row.signedUrl])
      );

      return rows.map(row => ({
        ...row,
        display_foto_url:
          (row.bilibili_cup1_photo_path ? signedByPath.get(row.bilibili_cup1_photo_path) || '' : '') ||
          row.foto_url || ''
      }));
    } catch (error) {
      console.warn('Gagal sinkron foto peserta CUP I:', error);
      return rows.map(row => ({ ...row, display_foto_url: row.foto_url || '' }));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pendaftaran')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const enriched = await enrichTournamentPhotos((data || []) as Registrant[]);
      setRegistrants(enriched);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('app_data_changed', handleUpdate);
    window.addEventListener('table_updated_pendaftaran', handleUpdate);

    const channel = supabase
      .channel('pendaftaran_changes')
      .on('postgres_changes', { event: '*', table: 'pendaftaran', schema: 'public' }, 
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            void fetchData();
          }
        }
      ).subscribe();
    return () => { 
      window.removeEventListener('app_data_changed', handleUpdate);
      window.removeEventListener('table_updated_pendaftaran', handleUpdate);
      supabase.removeChannel(channel); 
    };
  }, []);

  const filteredData = (registrants || []).filter(item => {
    const matchesSearch = 
      (item?.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item?.domisili || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item?.kategori || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item?.kategori_atlet || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item?.whatsapp || '').toLowerCase().includes(searchTerm.toLowerCase());

    const cat = getStatusCategory(item?.status);
    const isAccepted = cat === 'diterima';
    const isPending = cat === 'pending';
    const isRejected = cat === 'ditolak';

    if (statusFilter === 'pending') return matchesSearch && isPending;
    if (statusFilter === 'diterima') return matchesSearch && isAccepted;
    if (statusFilter === 'ditolak') return matchesSearch && isRejected;

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) setCurrentPage(1);
    else if (totalPages > 0 && currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- VERIFIKASI & WHATSAPP FUNCTIONS ---
  // Tombol Terima/Tolak bersifat langsung: sekali dipilih, status langsung disimpan.
  const handleVerifyStatus = async (item: Registrant, newStatus: 'Diterima' | 'Ditolak') => {
    if (getStatusCategory(item.status) === 'diterima') {
      Toast.fire({ icon: 'info', title: `${item.nama} sudah DITERIMA / AKTIF` });
      return;
    }
    const savedStatus = newStatus === 'Diterima' ? 'aktif' : 'Ditolak';
    const catatan = newStatus === 'Ditolak'
      ? 'Pendaftaran ditolak oleh Admin PB BILIBILI 162.'
      : '';

    try {
      const { error } = await supabase
        .from('pendaftaran')
        .update({ status: savedStatus })
        .eq('id', item.id);

      if (error) throw error;

      // Update UI seketika tanpa menunggu refresh halaman.
      setRegistrants(prev =>
        prev.map(r => r.id === item.id ? { ...r, status: savedStatus } : r)
      );

      Toast.fire({
        icon: newStatus === 'Diterima' ? 'success' : 'info',
        title: `${item.nama} → ${newStatus === 'Diterima' ? 'DITERIMA / AKTIF' : 'DITOLAK'}`
      });

      // Notifikasi WA hanya ditawarkan setelah status berhasil tersimpan.
      sendWaStatusNotification(item, newStatus, catatan);
    } catch (err: any) {
      Swal.fire('Gagal Update Status', err.message, 'error');
    }
  };

  const sendWaStatusNotification = (item: Registrant, status: 'Diterima' | 'Ditolak', reason: string = '') => {
    const rawWa = (item.whatsapp || '').replace(/\D/g, '');
    const phone = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : rawWa;

    if (!phone) {
      Swal.fire('No WhatsApp Tidak Valid', 'Nomor WhatsApp atlet ini tidak lengkap.', 'warning');
      return;
    }

    let message = '';
    if (status === 'Diterima') {
      message = 
        `*PEMBERITAHUAN VERIFIKASI PENDAFTARAN ATLET*\n` +
        `*PB BILIBILI 162 PAREPARE*\n\n` +
        `Halo *${item.nama.toUpperCase()}*,\n` +
        `Selamat! Pendaftaran Anda sebagai atlet/anggota baru di *PB BILIBILI 162* telah *DITERIMA & DIVERIFIKASI RESMI* oleh Admin.\n\n` +
        `📋 *INFORMASI ATLET VERIFIED:*\n` +
        `• Nama Atlet: ${item.nama.toUpperCase()}\n` +
        `• Status Verifikasi: ✅ *DITERIMA (AKTIF)*\n` +
        `• Kelompok Usia: ${item.kategori || '-'}\n` +
        `• Kategori Atlet: ${item.kategori_atlet || 'MUDA'}\n` +
        `• Domisili: ${item.domisili || '-'}\n\n` +
        `🌐 *AKSES LOGIN SISTEM:*\n` +
        `Silakan login untuk mengecek profil atlet Anda di:\n` +
        `https://pbilibili162.99apps.id/login\n\n` +
        `Selamat bergabung dan salam olahraga!\n` +
        `*Pengurus PB BILIBILI 162*`;
    } else {
      message = 
        `*PEMBERITAHUAN STATUS PENDAFTARAN ATLET*\n` +
        `*PB BILIBILI 162 PAREPARE*\n\n` +
        `Halo *${item.nama.toUpperCase()}*,\n` +
        `Mohon maaf, berdasarkan hasil verifikasi berkas, pendaftaran Anda di *PB BILIBILI 162* saat ini *BELUM DAPAT DITERIMA / DITOLAK*.\n\n` +
        `📋 *DETAIL PENDAFTARAN:*\n` +
        `• Nama: ${item.nama.toUpperCase()}\n` +
        `• Status: ❌ *DITOLAK*\n` +
        `• Catatan/Alasan: ${reason || 'Persyaratan pendaftaran belum terpenuhi.'}\n\n` +
        `Apabila ada pertanyaan lebih lanjut, silakan hubungi Pengurus PB BILIBILI 162. Terima kasih.\n\n` +
        `*Pengurus PB BILIBILI 162*`;
    }

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    Swal.fire({
      title: 'Kirim Notifikasi WA?',
      html: `Ingin membuka WhatsApp untuk mengirim konfirmasi status <b>${status.toUpperCase()}</b> ke <b>${item.nama}</b> (${phone})?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '📱 Kirim Ke WhatsApp',
      cancelButtonText: 'Nanti Saja',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#64748B'
    }).then((res) => {
      if (res.isConfirmed) {
        window.open(waUrl, '_blank');
      }
    });
  };

  const handleShareProfileWhatsApp = (item: Registrant) => {
    const rawWa = (item.whatsapp || '').replace(/\D/g, '');
    const phone = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : rawWa.startsWith('8') ? '62' + rawWa : rawWa;

    if (!/^62\d{8,15}$/.test(phone)) {
      Swal.fire('No WhatsApp Tidak Valid', 'Nomor WhatsApp atlet ini tidak tersedia atau formatnya tidak valid.', 'warning');
      return;
    }

    const profileUrl = `https://pbilibili162.99apps.id/api/share-athlete?athleteId=${encodeURIComponent(item.id)}`;
    const message = [
      '*DETAIL PROFILE ATLET*',
      '',
      `*Nama Lengkap:* ${item.nama || '-'}`,
      `*Kategori Umur:* ${item.kategori || '-'}`,
      `*Kategori Atlet:* ${item.kategori_atlet || '-'}`,
      `*Domisili:* ${item.domisili || '-'}`,
      `*Status:* ${item.status || 'Aktif'}`,
      '',
      '📋 Profil resmi PB BILIBILI 162:',
      profileUrl,
      '',
      'Foto profil pada pratinjau WhatsApp menggunakan foto atlet terbaru yang tersimpan di database.'
    ].join('\\n');

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSendAccountHistory = (item: Registrant) => {
    const rawWa = (item.whatsapp || '').replace(/\D/g, '');
    const phone = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : rawWa;

    if (!phone) {
      Swal.fire('No WhatsApp Tidak Ada', 'Nomor WhatsApp atlet ini tidak tersedia.', 'warning');
      return;
    }

    const statusCategory = getStatusCategory(item.status);
    const statusLabel = statusCategory === 'diterima'
      ? '✅ DITERIMA (AKTIF)'
      : statusCategory === 'ditolak'
        ? '❌ DITOLAK'
        : '⏳ MENUNGGU VERIFIKASI';

    const message = 
      `*RINCIAN DOKUMEN & HISTORY PENDAFTARAN ATLET*\n` +
      `*PB BILIBILI 162 PAREPARE*\n\n` +
      `Halo *${item.nama.toUpperCase()}*,\n` +
      `Berikut rincian dokumen pendaftaran dan status histori akun Anda di sistem PB BILIBILI 162:\n\n` +
      `📋 *DETAIL PROFILE ATLET:*\n` +
      `• *ID Atlet:* ${item.id}\n` +
      `• *Nama Lengkap:* ${item.nama.toUpperCase()}\n` +
      `• *No. WhatsApp:* ${item.whatsapp}\n` +
      `• *Jenis Kelamin:* ${item.jenis_kelamin || '-'}\n` +
      `• *Kategori Umur:* ${item.kategori || '-'}\n` +
      `• *Kategori Atlet:* ${item.kategori_atlet || 'MUDA'}\n` +
      `• *Domisili:* ${item.domisili || '-'}\n` +
      `• *Status Verifikasi:* ${statusLabel}\n` +
      `• *Tgl Registrasi:* ${item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}\n\n` +
      `🌐 *LINK LOGIN SISTEM:*\nhttps://pbilibili162.99apps.id/login\n\n` +
      `⚠️ *PENTING:* Gunakan Email & Password yang Anda masukkan saat pendaftaran untuk login. Apabila lupa password, silakan minta reset ke Admin PB Bilibili 162.`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const deleteOldFile = async (url: string) => {
    if (!url || !url.includes('identitas-atlet')) return;
    try {
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      if (fileName) {
        await supabase.storage.from('identitas-atlet').remove([`identitas/${fileName}`]);
      }
    } catch (e) { console.error("Gagal hapus file lama", e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'edit' | 'add') => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    
    try {
      const compressedBlob = await compressImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `identitas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('identitas-atlet')
        .upload(filePath, compressedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('identitas-atlet').getPublicUrl(filePath);

      if (mode === 'edit' && editingItem) {
        setEditingItem({ ...editingItem, foto_url: publicUrl });
      } else {
        setNewItem(prev => ({ ...prev, foto_url: publicUrl }));
      }
      
      Toast.fire({ icon: 'success', title: 'Foto berhasil diunggah' });
    } catch (error: any) { 
      Swal.fire("Gagal upload", error.message, "error");
    } finally { 
      setUploading(false); 
    }
  };

  const handleDelete = async (id: string, nama: string, foto_url: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: `Apakah Anda yakin ingin menghapus data ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        if (foto_url) await deleteOldFile(foto_url);
        await deleteAthleteCompletely(id, nama);
        Toast.fire({ icon: 'success', title: 'Data berhasil dihapus' });
      } catch (error: any) { 
        Swal.fire('Gagal', error.message, 'error');
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanNama = (newItem.nama || '').toUpperCase().trim();
      const { error } = await supabase.from('pendaftaran').insert([{
        ...newItem,
        nama: cleanNama,
        domisili: (newItem.domisili || '').toUpperCase().trim()
      }]);
      
      if (error) {
        if (
          error.message.includes("pendaftaran_nama_key") ||
          error.message.includes("duplicate key value violates unique constraint") ||
          (error as any).code === "23505"
        ) {
          throw new Error(`Nama atlet "${cleanNama}" sudah ada di database pendaftaran. Silakan gunakan nama lain atau tambahkan pembeda.`);
        }
        throw error;
      }
      
      setIsAddModalOpen(false);
      setNewItem({ nama: '', whatsapp: '', kategori: 'Pra Dini (U-9)', domisili: '', jenis_kelamin: 'Putra', foto_url: '', kategori_atlet: 'Muda' });
      Toast.fire({ icon: 'success', title: 'Atlet baru berhasil ditambahkan' });
    } catch (error: any) {
      Swal.fire("Gagal", error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  // Pastikan editingItem tidak null
  if (!editingItem || uploading) return;

  setIsSaving(true);
  try {
    const { error } = await supabase
      .from('pendaftaran')
      .update({
        // Tambahkan || '' agar jika null tetap terbaca sebagai string kosong
        nama: (editingItem.nama || '').toUpperCase(),
        whatsapp: editingItem.whatsapp,
        kategori: editingItem.kategori,
        // Pastikan kategori_atlet juga aman dari null
        kategori_atlet: (editingItem.kategori_atlet || 'MUDA').toUpperCase(), 
        domisili: (editingItem.domisili || '').toUpperCase(),
        pengalaman: editingItem.pengalaman || '',
        prestasi: editingItem.prestasi || '',
        jenis_kelamin: editingItem.jenis_kelamin,
        foto_url: editingItem.foto_url || '',
        nama_panggilan: editingItem.nama_panggilan || '',
        nama_punggung: editingItem.nama_punggung || '',
        tempat_lahir: editingItem.tempat_lahir || '',
        tanggal_lahir: editingItem.tanggal_lahir || null,
        tahun_bergabung: editingItem.tahun_bergabung || null,
        tangan_dominan: editingItem.tangan_dominan || '',
        hobi: editingItem.hobi || '',
        makanan_favorit: editingItem.makanan_favorit || '',
        status: editingItem.status || 'aktif',
        alasan_status: editingItem.status === 'aktif' ? '' : (editingItem.alasan_status || ''),
        tanggal_registrasi: editingItem.tanggal_registrasi || null
      })
      .eq('id', editingItem.id);

    if (error) throw error;
    
    Swal.fire('Berhasil', 'Data berhasil diperbarui!', 'success');
    setIsEditModalOpen(false);
    fetchData(); 
  } catch (err: any) {
    Swal.fire('Gagal', err.message, 'error');
  } finally {
    setIsSaving(false);
  }
};
  const toDateTimeLocal = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const inputClass = "w-full min-h-12 rounded-xl border border-blue-400/20 bg-[#07172b] px-3.5 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const textareaClass = "w-full rounded-xl border border-blue-400/20 bg-[#07172b] px-3.5 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-y";
  const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <label className="ml-0.5 block text-[9px] font-black uppercase tracking-wider text-blue-100/70 sm:text-[10px]">{label}</label>
      {children}
    </div>
  );
  const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-2.5">
      <span className="text-blue-400">{icon}</span>
      <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white sm:text-sm">{title}</h3>
    </div>
  );

  return (
    <div className="min-h-full flex flex-col bg-[#061225] text-white font-sans pb-6 lg:pb-8">
      <div className="flex-1 flex flex-col max-w-[1500px] w-full mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-5 md:py-7">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 md:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-950/40">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-none">
                Manajemen <span className="text-blue-400">Pendaftaran</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Database & Administrasi Real-time</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-end gap-2 w-full lg:w-auto">
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-5 py-3 rounded-xl font-bold text-[9px] sm:text-[10px] tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-blue-950/30">
              <Plus size={16} /> TAMBAH ATLET
            </button>

            <button onClick={downloadTemplate} className="flex items-center gap-2 bg-[#173b73] text-blue-100 border border-blue-400/20 px-5 py-3 rounded-xl font-bold text-[10px] tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-950/20">
              <Download size={16} /> TEMPLATE IMPORT
            </button>

            <label className="flex items-center gap-2 bg-[#b7791f] text-white px-5 py-3 rounded-xl font-bold text-[10px] tracking-widest hover:bg-[#d08a22] transition-all active:scale-95 shadow-lg shadow-amber-950/20 cursor-pointer">
              <Upload size={16} /> IMPORT EXCEL
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
            </label>

            <div className="h-10 w-px bg-white/10 mx-1 hidden lg:block"></div>
             
            <button onClick={exportToExcel} className="p-3 bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 rounded-xl hover:bg-emerald-600 hover:text-white transition-all" title="Export Excel">
              <FileSpreadsheet size={20} />
            </button>
            <button onClick={exportToPDF} className="p-3 bg-rose-500/10 text-rose-300 border border-rose-400/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all" title="Export PDF">
              <FileText size={20} />
            </button>

            <button onClick={fetchData} className="p-3 bg-[#0b1b34] text-white border border-white/10 rounded-xl hover:bg-blue-600 transition-all">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* --- STATISTIK LENGKAP (RESPONSIVE GRID) --- */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-5 md:mb-6">
          {/* Card Total */}
          <div className="bg-[#0c203b] p-4 rounded-2xl border border-white/10 shadow-lg shadow-black/20 flex items-center justify-between col-span-2 lg:col-span-1">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Pendaftar</p>
              <p className="text-2xl font-black text-white mt-0.5">{totalPendaftar}</p>
            </div>
            <div className="p-3 bg-white/5 text-blue-200 rounded-xl border border-white/10">
              <Users size={20} />
            </div>
          </div>
          
          {/* Card Putra */}
          <div className="bg-[#0c203b] p-3.5 md:p-4 rounded-2xl border border-white/10 shadow-lg shadow-black/20 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Putra</p>
              <p className="text-2xl font-black text-blue-300 mt-0.5">{totalPutra}</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-300 rounded-xl border border-blue-400/15">
              <User size={20} />
            </div>
          </div>

          {/* Card Putri */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Putri</p>
              <p className="text-2xl font-black text-rose-300 mt-0.5">{totalPutri}</p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-300 rounded-xl border border-rose-400/15">
              <User size={20} />
            </div>
          </div>

          {/* Card Muda */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Muda</p>
              <p className="text-2xl font-black text-blue-300 mt-0.5 leading-none">{totalMuda}</p>
              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">PA: <span className="text-blue-300">{totalMudaPutra}</span> | PI: <span className="text-rose-300">{totalMudaPutri}</span></p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-300 rounded-xl border border-blue-400/15">
              <Activity size={20} />
            </div>
          </div>

          {/* Card Senior */}
          <div className="bg-white p-4 rounded-[1.2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atlet Senior</p>
              <p className="text-2xl font-black text-emerald-300 mt-0.5 leading-none">{totalSenior}</p>
              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">PA: <span className="text-blue-500">{totalSeniorPutra}</span> | PI: <span className="text-rose-500">{totalSeniorPutri}</span></p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-300 rounded-xl border border-emerald-400/15">
              <Activity size={20} />
            </div>
          </div>
        </section>

        {/* SEARCH BAR & STATUS FILTER */}
        <section className="mb-5 md:mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:overflow-x-auto sm:pb-1 sm:-mx-1 sm:px-1">
            <button
              type="button"
              onClick={() => { setStatusFilter('semua'); setCurrentPage(1); }}
              className={`px-3.5 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${statusFilter === 'semua' ? 'bg-blue-600 text-white shadow-md shadow-blue-950/30' : 'bg-[#0c203b] text-slate-300 hover:bg-[#132b4d] border border-white/10'}`}
            >
              Semua Pendaftar <span className="px-2 py-0.5 rounded-full text-[9px] bg-white/10 text-slate-200 ml-1">{totalPendaftar}</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
              className={`w-full justify-center px-3 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-[#0c203b] text-amber-300 hover:bg-amber-500/10 border border-amber-400/20'}`}
            >
              <Clock size={12} /> Menunggu Verifikasi <span className={`px-2 py-0.5 rounded-full text-[9px] ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-500/15 text-amber-200'} ml-1`}>{totalPending}</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('diterima'); setCurrentPage(1); }}
              className={`w-full justify-center px-3 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${statusFilter === 'diterima' ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#0c203b] text-emerald-300 hover:bg-emerald-500/10 border border-emerald-400/20'}`}
            >
              <CheckCircle2 size={12} /> Diterima <span className={`px-2 py-0.5 rounded-full text-[9px] ${statusFilter === 'diterima' ? 'bg-emerald-700 text-white' : 'bg-emerald-500/15 text-emerald-200'} ml-1`}>{totalDiterima}</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('ditolak'); setCurrentPage(1); }}
              className={`w-full justify-center px-3 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${statusFilter === 'ditolak' ? 'bg-rose-600 text-white shadow-md' : 'bg-[#0c203b] text-rose-300 hover:bg-rose-500/10 border border-rose-400/20'}`}
            >
              <XCircle size={12} /> Ditolak <span className={`px-2 py-0.5 rounded-full text-[9px] ${statusFilter === 'ditolak' ? 'bg-rose-700 text-white' : 'bg-rose-500/15 text-rose-200'} ml-1`}>{totalDitolak}</span>
            </button>
          </div>

          <div className="relative rounded-2xl bg-[#0b1b34] border border-white/10 shadow-lg transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari berdasarkan nama, kategori umur, nomor WA, atau kota domisili..."
              className="w-full pl-11 pr-4 sm:pr-6 py-3.5 bg-transparent outline-none font-bold text-sm placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </section>

        {/* TABLE SECTION (RESPONSIVE NO SCROLL ON DESKTOP) */}
        <section className="bg-[#0b1b34] rounded-2xl md:rounded-[1.75rem] border border-white/10 shadow-2xl shadow-black/20 overflow-hidden mb-4">
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#07172b] text-white whitespace-nowrap sticky top-0 z-10">
                  <th className="px-3 py-3.5.5 font-bold uppercase text-[9px] tracking-widest text-center w-10">No</th>
                  <th className="px-3 py-4 font-bold uppercase text-[9px] tracking-widest">Profil Atlet</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Status Verifikasi</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Gender</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Kategori Umur</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Kategori Atlet</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Kontak WA</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Lokasi</th>
                  <th className="px-2 py-4 font-bold uppercase text-[9px] tracking-widest">Tgl Registrasi</th>
                  <th className="px-4 py-4 font-bold uppercase text-[9px] tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && registrants.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Memuat Database Atlet...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Tidak ada data atlet ditemukan</td></tr>
                ) : currentItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-blue-500/10 even:bg-white/[0.015] transition-all duration-200 group">
                    
                    <td className="px-2.5 py-3.5 text-center">
                      <span className="text-[10px] font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                        {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => (item.display_foto_url || item.foto_url) && setPreviewImage(item.display_foto_url || item.foto_url)}
                          className="w-10 h-10 rounded-xl bg-[#132947] border border-white/10 shadow-sm overflow-hidden flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                        >
                          {(item.display_foto_url || item.foto_url) ? (
                            <img src={item.display_foto_url || item.foto_url} loading="lazy" decoding="async" className="w-full h-full object-cover object-top" alt={item.nama} />
                          ) : (
                            <User className="m-auto mt-1.5 text-slate-400" size={20} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-[100px] max-w-[180px]">
                          <h4 className="font-black text-white text-[11px] uppercase leading-tight truncate" title={item.nama}>{item.nama || 'No Name'}</h4>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">UID: {item.id.split('-')[0]}</span>
                          {item.bilibili_cup1_partner_name && (
                            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-amber-400/20 bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-amber-300">
                              CUP I • PARTNER: {item.bilibili_cup1_partner_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* STATUS VERIFIKASI */}
                    <td className="px-2.5 py-3.5 whitespace-nowrap">
                      {(!item.status || item.status === 'Pending' || item.status === 'Menunggu') && (
                        <span className="px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-300 animate-pulse inline-flex items-center gap-1">
                          <Clock size={10} /> MENUNGGU
                        </span>
                      )}
                      {getStatusCategory(item.status) === 'diterima' && (
                        <span className="px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-400/15 border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 size={10} /> DITERIMA
                        </span>
                      )}
                      {item.status === 'Ditolak' && (
                        <span className="px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest bg-rose-500/15 text-rose-300 border border-rose-400/15 border border-rose-300 inline-flex items-center gap-1">
                          <XCircle size={10} /> DITOLAK
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${item.jenis_kelamin === 'Putra' ? 'bg-blue-500/15 text-blue-300 border border-blue-400/15' : 'bg-rose-500/15 text-rose-300 border border-rose-400/15'}`}>
                        {item.jenis_kelamin || '-'}
                      </span>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">
                        {item.kategori || '-'}
                      </span>
                    </td>

                    {/* KATEGORI ATLET (MUDA/SENIOR) */}
                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${item.kategori_atlet === 'Muda' ? 'bg-blue-500/15 text-blue-300 border border-blue-400/15' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/15'}`}>
                        {item.kategori_atlet || 'MUDA'}
                      </span>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <a href={`https://wa.me/${(item.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-slate-300 hover:text-green-400 text-[10px] transition-colors">
                        <Phone size={10} className="text-green-500" /> {item.whatsapp || '-'}
                      </a>
                    </td>

                    <td className="px-2 py-3 max-w-[100px] truncate" title={item.domisili}>
                      <div className="inline-flex items-center gap-1.5 font-bold text-slate-400 uppercase text-[9px]">
                        <MapPin size={10} className="text-rose-500 shrink-0" /> {item.domisili || '-'}
                      </div>
                    </td>

                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-slate-300 font-bold text-[9px] uppercase tracking-wider">
                        <Calendar size={10} className="text-blue-500" /> {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <div className="flex justify-end items-center gap-1">
                        <button
                           type="button"
                           disabled={getStatusCategory(item.status) === 'diterima'}
                           onClick={() => handleVerifyStatus(item, 'Diterima')}
                           className={`p-1.5 rounded-lg transition-all shadow-sm border border-emerald-400/20 ${getStatusCategory(item.status) === 'diterima' ? 'cursor-not-allowed bg-slate-500/10 text-slate-600 opacity-50' : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-600 hover:text-white'}`}
                           title={getStatusCategory(item.status) === 'diterima' ? 'Sudah diterima — tombol dinonaktifkan' : 'Verifikasi & Terima Atlet'}
                         >
                           <CheckCircle2 size={13} />
                         </button>
                         <button
                           type="button"
                           disabled={getStatusCategory(item.status) === 'diterima'}
                           onClick={() => handleVerifyStatus(item, 'Ditolak')}
                           className={`p-1.5 rounded-lg transition-all shadow-sm border border-rose-400/20 ${getStatusCategory(item.status) === 'diterima' ? 'cursor-not-allowed bg-slate-500/10 text-slate-600 opacity-50' : 'bg-rose-500/10 text-rose-300 hover:bg-rose-600 hover:text-white'}`}
                           title={getStatusCategory(item.status) === 'diterima' ? 'Sudah diterima — tombol dinonaktifkan' : 'Tolak Pendaftaran'}
                         >
                           <XCircle size={13} />
                         </button>
                        <button
                          onClick={() => handleShareProfileWhatsApp(item)}
                          className="p-1.5 bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 rounded-lg hover:bg-cyan-600 hover:text-white transition-all shadow-sm"
                          title="Bagikan Profil Atlet via WhatsApp"
                        >
                          <Share2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleSendAccountHistory(item)} 
                          className="p-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm border border-emerald-400/20"
                          title="Kirim Rincian Akun Ke WA Atlet"
                        >
                          <MessageSquare size={13} />
                        </button>
                        <button 
                          onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} 
                          className="p-1.5 bg-blue-500/10 text-blue-300 border border-blue-400/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Edit Data"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.nama, item.foto_url)} 
                          className="p-1.5 bg-white/5 text-slate-300 border border-white/10 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                          title="Hapus Data"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="lg:hidden space-y-2 py-2">
            {loading && registrants.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Memuat Database Atlet...
              </div>
            ) : currentItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Tidak ada data atlet ditemukan
              </div>
            ) : (
              currentItems.map((item, index) => (
                <article key={item.id} className="m-2 rounded-2xl border border-white/10 bg-[#0c203b] p-3.5 sm:p-4 flex flex-col gap-3 hover:bg-[#102847] transition-all duration-200 shadow-lg shadow-black/10">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-500/15 px-2 py-1 rounded-md border border-blue-400/15">
                      #{String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(!item.status || item.status === 'Pending' || item.status === 'Menunggu') && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-400/30 animate-pulse inline-flex items-center gap-1">
                          <Clock size={9} /> MENUNGGU
                        </span>
                      )}
                      {item.status === 'Diterima' && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
                          <CheckCircle2 size={9} /> DITERIMA
                        </span>
                      )}
                      {item.status === 'Ditolak' && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-rose-500/15 text-rose-300 border border-rose-400/30 inline-flex items-center gap-1">
                          <XCircle size={9} /> DITOLAK
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.jenis_kelamin === 'Putra' ? 'bg-blue-500/15 text-blue-300 border border-blue-400/15' : 'bg-rose-100 text-rose-700'}`}>
                        {item.jenis_kelamin || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => (item.display_foto_url || item.foto_url) && setPreviewImage(item.display_foto_url || item.foto_url)}
                      className="w-14 h-14 rounded-2xl bg-[#132947] border border-white/10 shadow-sm overflow-hidden flex-shrink-0 cursor-zoom-in"
                    >
                      {(item.display_foto_url || item.foto_url) ? (
                        <img src={item.display_foto_url || item.foto_url} loading="lazy" decoding="async" className="w-full h-full object-cover object-top" alt={item.nama} />
                      ) : (
                        <User className="m-auto mt-2 text-slate-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-white text-sm uppercase leading-tight truncate">{item.nama || 'No Name'}</h4>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{item.kategori || '-'}</p>
                      <div className="inline-flex items-center gap-1 mt-0.5 text-slate-400 uppercase text-[8px] font-bold">
                        <MapPin size={9} className="text-rose-500 shrink-0" /> {item.domisili || '-'}
                      </div>
                      {item.bilibili_cup1_partner_name && (
                        <span className="mt-1 inline-flex w-fit max-w-full truncate rounded-md border border-amber-400/20 bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-amber-300">
                          CUP I • PARTNER: {item.bilibili_cup1_partner_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pt-1.5 border-t border-white/10 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">WhatsApp</span>
                      <a href={`https://wa.me/${(item.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-green-600 transition-colors">
                        <Phone size={10} className="text-green-500" /> {item.whatsapp || '-'}
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tanggal</span>
                      <span className="text-slate-300 font-bold">{new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed border-white/10">
                    <button
                       type="button"
                       disabled={getStatusCategory(item.status) === 'diterima'}
                       onClick={() => handleVerifyStatus(item, 'Diterima')}
                       className={`py-2.5 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border flex items-center justify-center gap-1 ${getStatusCategory(item.status) === 'diterima' ? 'cursor-not-allowed bg-slate-500/10 text-slate-500 border-slate-500/20 opacity-50' : 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-200'}`}
                     >
                       <CheckCircle2 size={11} /> Terima
                     </button>
                     <button
                       type="button"
                       disabled={getStatusCategory(item.status) === 'diterima'}
                       onClick={() => handleVerifyStatus(item, 'Ditolak')}
                       className={`py-2.5 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border flex items-center justify-center gap-1 ${getStatusCategory(item.status) === 'diterima' ? 'cursor-not-allowed bg-slate-500/10 text-slate-500 border-slate-500/20 opacity-50' : 'bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-200'}`}
                     >
                       <XCircle size={11} /> Tolak
                     </button>
                    <button
                      onClick={() => handleShareProfileWhatsApp(item)}
                      className="py-2.5 bg-cyan-500/10 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border border-cyan-400/20 flex items-center justify-center gap-1 col-span-2"
                      title="Bagikan Profil Atlet via WhatsApp"
                    >
                      <Share2 size={11} /> Bagikan Profil via WA
                    </button>
                    <button 
                      onClick={() => handleSendAccountHistory(item)} 
                      className="py-2.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border border-green-200 flex items-center justify-center gap-1 col-span-2"
                    >
                      <MessageSquare size={11} /> Kirim Akun Ke WA Atlet
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }}
                      className="py-2.5 bg-blue-500/10 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border border-blue-400/20 flex items-center justify-center gap-1"
                      title="Edit Data"
                    >
                      <Edit3 size={11} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.nama, item.foto_url)}
                      className="py-2.5 bg-white/5 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-1"
                      title="Hapus Data"
                    >
                      <Trash2 size={11} /> Hapus
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* PAGINATION */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 px-3 sm:px-5 py-4 bg-[#07172b] rounded-2xl text-white shadow-2xl shadow-black/20 border border-white/10">
          <div className="flex flex-col text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Navigasi Data</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Halaman {currentPage} Dari {totalPages || 1}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 bg-white/10 rounded-xl disabled:opacity-20 hover:bg-white/20 transition-all active:scale-90">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5 max-w-[58vw] overflow-x-auto py-1">
              {[...Array(totalPages || 0)].map((_, i) => (
                 <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-9 h-9 rounded-lg shrink-0 text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/50' : 'bg-white/5 hover:bg-blue-500/20 text-slate-400'}`}>
                    {i + 1}
                 </button>
              ))}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 bg-white/10 rounded-xl disabled:opacity-20 hover:bg-white/20 transition-all active:scale-90">
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </div>

      {/* ======================= MODAL TAMBAH (ADD) ======================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Tambah <span className="text-blue-600">Atlet Baru</span></h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Input data atlet resmi ke database</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-500 rounded-xl text-slate-400 transition-all"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-8 space-y-5">
              <div className="flex items-center gap-6 mb-2">
                <div className="relative">
                  <div className="w-24 h-24 rounded-[1.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex-shrink-0">
                    {newItem.foto_url ? (
                      <img src={newItem.foto_url} className="w-full h-full object-cover object-top" alt="preview" /> 
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <User size={32} />
                        <span className="text-[7px] font-black uppercase mt-1">No Photo</span>
                      </div>
                    )}
                    {uploading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={20} /></div>}
                  </div>
                  <label className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 text-white rounded-xl shadow-xl cursor-pointer hover:bg-slate-900 transition-all border-4 border-white">
                    <Camera size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'add')} />
                  </label>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Lengkap</label>
                    <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs focus:border-blue-600 focus:bg-white outline-none transition-all" placeholder="CONTOH: BUDI SANTOSO" value={newItem.nama} onChange={e => setNewItem({...newItem, nama: e.target.value})} required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Atlet</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {['Muda', 'Senior'].map((k) => (
                      <button key={k} type="button" onClick={() => setNewItem({...newItem, kategori_atlet: k})} className={`py-2 rounded-lg font-black text-[9px] tracking-widest transition-all ${newItem.kategori_atlet === k ? (k === 'Muda' ? 'bg-indigo-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>
                        {k.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {['Putra', 'Putri'].map((g) => (
                      <button key={g} type="button" onClick={() => setNewItem({...newItem, jenis_kelamin: g})} className={`py-2 rounded-lg font-black text-[9px] tracking-widest transition-all ${newItem.jenis_kelamin === g ? (g === 'Putra' ? 'bg-blue-600 text-white shadow-md' : 'bg-rose-500 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>
                        {g.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Umur</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600 focus:bg-white" value={newItem.kategori} onChange={e => setNewItem({...newItem, kategori: e.target.value})}>
                    {kategoriUmur.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nomor WhatsApp</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-600 focus:bg-white" placeholder="0812..." value={newItem.whatsapp} onChange={e => setNewItem({...newItem, whatsapp: e.target.value})} required />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kota Domisili</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:border-blue-600 focus:bg-white" placeholder="SURABAYA" value={newItem.domisili} onChange={e => setNewItem({...newItem, domisili: e.target.value})} required />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button type="submit" disabled={isSaving || uploading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan Atlet ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL EDIT ======================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !isSaving && setIsEditModalOpen(false)} />
          <div className="relative flex w-full h-[100dvh] sm:h-auto sm:max-h-[94vh] sm:max-w-4xl min-h-0 flex-col overflow-hidden rounded-none sm:rounded-[2rem] border border-blue-400/15 bg-[#07172b] text-white shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#07172b] via-[#0b2450] to-[#063b86] px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-950/50">
                  <User size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black uppercase italic tracking-tight sm:text-2xl">
                    Edit Data <span className="text-blue-300">Atlet</span>
                  </h2>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-100/70 sm:text-[10px]">
                    Perbarui seluruh informasi pendaftar
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsEditModalOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 transition hover:bg-rose-500/20 hover:text-white disabled:opacity-40"
                aria-label="Tutup edit data"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="flex min-h-0 flex-1 flex-col">
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 py-4 pb-8 sm:px-6 sm:py-5 sm:pb-8"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="mx-auto max-w-3xl space-y-4">

                  {/* FOTO & IDENTITAS */}
                  <section className="rounded-2xl border border-white/10 bg-[#0a203a] p-3.5 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Camera size={18} className="text-blue-400" />
                      <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white sm:text-sm">Foto & Identitas</h3>
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="relative mx-auto shrink-0 sm:mx-0">
                        <div className="h-28 w-28 overflow-hidden rounded-2xl border-2 border-blue-400/30 bg-[#07172b] shadow-xl sm:h-32 sm:w-32">
                          {editingItem.foto_url ? (
                            <img src={editingItem.foto_url} className="h-full w-full object-cover object-top" alt="Foto atlet" />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center text-slate-500">
                              <User size={38} />
                              <span className="mt-1 text-[8px] font-black uppercase">No Photo</span>
                            </div>
                          )}
                          {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#07172b]/90">
                              <Loader2 className="animate-spin text-blue-400" size={24} />
                            </div>
                          )}
                        </div>
                        <label className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-xl border-4 border-[#0a203a] bg-blue-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white shadow-lg hover:bg-blue-500">
                          <Camera size={14} /> Pilih Foto
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'edit')} />
                        </label>
                      </div>
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <Field label="Nama Lengkap *" className="sm:col-span-2">
                          <input required value={editingItem.nama || ''} onChange={e => setEditingItem({...editingItem, nama: e.target.value})} className={inputClass} placeholder="NAMA LENGKAP" />
                        </Field>
                        <Field label="Nama Panggilan">
                          <input value={editingItem.nama_panggilan || ''} onChange={e => setEditingItem({...editingItem, nama_panggilan: e.target.value})} className={inputClass} placeholder="NAMA PANGGILAN" />
                        </Field>
                        <Field label="Nama Punggung">
                          <input value={editingItem.nama_punggung || ''} onChange={e => setEditingItem({...editingItem, nama_punggung: e.target.value})} className={inputClass} placeholder="NAMA PUNGGUNG" />
                        </Field>
                      </div>
                    </div>
                  </section>

                  {/* DATA PRIBADI */}
                  <section className="rounded-2xl border border-white/10 bg-[#0a203a] p-3.5 sm:p-5">
                    <SectionTitle icon={<User size={18} />} title="Data Pribadi" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Tempat Lahir">
                        <input value={editingItem.tempat_lahir || ''} onChange={e => setEditingItem({...editingItem, tempat_lahir: e.target.value})} className={inputClass} placeholder="KOTA TEMPAT LAHIR" />
                      </Field>
                      <Field label="Tanggal Lahir">
                        <input type="date" value={editingItem.tanggal_lahir || ''} onChange={e => setEditingItem({...editingItem, tanggal_lahir: e.target.value})} className={inputClass} />
                      </Field>
                      <Field label="Tahun Bergabung">
                        <input type="number" min="1900" max="2100" value={editingItem.tahun_bergabung ?? ''} onChange={e => setEditingItem({...editingItem, tahun_bergabung: e.target.value ? Number(e.target.value) : undefined})} className={inputClass} placeholder="2026" />
                      </Field>
                      <Field label="Tangan Dominan">
                        <select value={editingItem.tangan_dominan || ''} onChange={e => setEditingItem({...editingItem, tangan_dominan: e.target.value})} className={inputClass}>
                          <option value="">Pilih tangan dominan</option>
                          <option value="Kanan">Kanan</option>
                          <option value="Kiri">Kiri</option>
                          <option value="Ambidextrous">Ambidextrous</option>
                        </select>
                      </Field>
                    </div>
                  </section>

                  {/* KATEGORI */}
                  <section className="rounded-2xl border border-white/10 bg-[#0a203a] p-3.5 sm:p-5">
                    <SectionTitle icon={<Users size={18} />} title="Kategori Atlet" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Kategori Atlet *">
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#07172b] p-1.5">
                          {['Muda', 'Senior'].map(k => (
                            <button type="button" key={k} onClick={() => setEditingItem({...editingItem, kategori_atlet: k})}
                              className={`rounded-lg py-3 text-[10px] font-black tracking-widest transition-all ${editingItem.kategori_atlet === k ? (k === 'Muda' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-emerald-600 text-white shadow-lg') : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                              {k.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Kategori Umur *">
                        <select required value={editingItem.kategori || ''} onChange={e => setEditingItem({...editingItem, kategori: e.target.value})} className={inputClass}>
                          {kategoriUmur.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                      <Field label="Jenis Kelamin *">
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#07172b] p-1.5">
                          {['Putra', 'Putri'].map(g => (
                            <button type="button" key={g} onClick={() => setEditingItem({...editingItem, jenis_kelamin: g})}
                              className={`rounded-lg py-3 text-[10px] font-black tracking-widest transition-all ${editingItem.jenis_kelamin === g ? (g === 'Putra' ? 'bg-blue-600 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                              {g.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </section>

                  {/* KONTAK & DOMISILI */}
                  <section className="rounded-2xl border border-white/10 bg-[#0a203a] p-3.5 sm:p-5">
                    <SectionTitle icon={<Phone size={18} />} title="Kontak & Domisili" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="WhatsApp *">
                        <input required type="tel" inputMode="tel" value={editingItem.whatsapp || ''} onChange={e => setEditingItem({...editingItem, whatsapp: e.target.value})} className={inputClass} placeholder="08XXXXXXXXXX" />
                      </Field>
                      <Field label="Domisili *" className="sm:col-span-2">
                        <input required value={editingItem.domisili || ''} onChange={e => setEditingItem({...editingItem, domisili: e.target.value})} className={inputClass} placeholder="KOTA / KABUPATEN DOMISILI" />
                      </Field>
                    </div>
                  </section>

                  {/* INFORMASI ATLET */}
                  <section className="rounded-2xl border border-white/10 bg-[#0a203a] p-3.5 sm:p-5">
                    <SectionTitle icon={<Activity size={18} />} title="Informasi Atlet" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Hobi">
                        <input value={editingItem.hobi || ''} onChange={e => setEditingItem({...editingItem, hobi: e.target.value})} className={inputClass} placeholder="HOBI ATLET" />
                      </Field>
                      <Field label="Makanan Favorit">
                        <input value={editingItem.makanan_favorit || ''} onChange={e => setEditingItem({...editingItem, makanan_favorit: e.target.value})} className={inputClass} placeholder="MAKANAN FAVORIT" />
                      </Field>
                      <Field label="Pengalaman" className="sm:col-span-2">
                        <textarea rows={4} value={editingItem.pengalaman || ''} onChange={e => setEditingItem({...editingItem, pengalaman: e.target.value})} className={textareaClass} placeholder="Pengalaman, klub sebelumnya, perjalanan atlet..." />
                      </Field>
                      <Field label="Prestasi" className="sm:col-span-2">
                        <textarea rows={4} value={editingItem.prestasi || ''} onChange={e => setEditingItem({...editingItem, prestasi: e.target.value})} className={textareaClass} placeholder="Prestasi / pencapaian atlet..." />
                      </Field>
                    </div>
                  </section>

                  {/* STATUS */}
                  <section className="rounded-2xl border border-white/10 bg-[#0a203a] p-3.5 sm:p-5">
                    <SectionTitle icon={<ShieldCheck size={18} />} title="Status Keanggotaan" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Status Atlet *">
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#07172b] p-1.5">
                          {[
                            { value: 'aktif', label: 'AKTIF', icon: <CheckCircle2 size={15} />, active: 'bg-emerald-600' },
                            { value: 'tidak aktif', label: 'TIDAK AKTIF', icon: <XCircle size={15} />, active: 'bg-amber-600' },
                            { value: 'Ditolak', label: 'DITOLAK', icon: <XCircle size={15} />, active: 'bg-rose-600' },
                            { value: 'Pending', label: 'PENDING', icon: <Clock size={15} />, active: 'bg-slate-600' }
                          ].map(s => (
                            <button type="button" key={s.value} onClick={() => setEditingItem({...editingItem, status: s.value})}
                              className={`flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-3 text-[9px] font-black tracking-wider transition-all ${editingItem.status === s.value || (s.value === 'aktif' && getStatusCategory(editingItem.status) === 'diterima') ? `${s.active} text-white shadow-lg` : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                              {s.icon}{s.label}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Alasan Status">
                        <select value={editingItem.alasan_status || ''} onChange={e => setEditingItem({...editingItem, alasan_status: e.target.value})} className={inputClass}>
                          <option value="">Pilih alasan (opsional)</option>
                          <option value="Pindah Alamat">Pindah Alamat</option>
                          <option value="Meninggal Dunia">Meninggal Dunia</option>
                          <option value="Pindah Kerja">Pindah Kerja</option>
                          <option value="Pensiun">Pensiun</option>
                          <option value="Cedera/Istirahat">Cedera/Istirahat</option>
                          <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                          <option value="Tidak Aktif Sementara">Tidak Aktif Sementara</option>
                          <option value="Alasan Lainnya">Alasan Lainnya</option>
                        </select>
                      </Field>
                    </div>
                  </section>

                  <div className="rounded-xl border border-blue-400/15 bg-blue-500/5 px-3 py-2.5 text-[9px] font-bold text-blue-200/80">
                    <span className="font-black text-blue-300">Catatan:</span> Data yang tersimpan akan memperbarui profil atlet dan status keanggotaan secara realtime.
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="shrink-0 border-t border-white/10 bg-[#061225] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:gap-3">
                  <button type="button" disabled={isSaving} onClick={() => setIsEditModalOpen(false)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/10 disabled:opacity-50">
                    <X size={17} /> Batal
                  </button>
                  <button type="submit" disabled={isSaving || uploading}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* LIGHTBOX PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-xl w-full">
            <button className="absolute -top-12 right-0 text-white hover:text-rose-500 transition-colors flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
              Tutup <X size={20} />
            </button>
            <img src={previewImage} className="w-full h-auto rounded-[2rem] border-4 border-white shadow-2xl animate-in zoom-in duration-300" alt="preview-large" />
          </div>
        </div>
      )}
    </div>
  );
}