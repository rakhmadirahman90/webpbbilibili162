import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { 
  Wallet, Plus, Search, FileText, Loader2, CheckCircle2, Filter, 
  Trash2, Edit3, X, ArrowUpCircle, ArrowDownCircle, Calendar,
  ChevronLeft, ChevronRight
} from 'lucide-react'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PB_LOGO_URL = "/logo_pb_bilibili_162.svg";

const DAFTAR_PEMASUKAN = [
  'Iuran Bulanan Tetap (10k)',
  'Pembayaran Iuran Binaan',
  'Pembayaran Shuttlecock',
  'Pendaftaran Atlet Baru',
  'Sumbangan Sukarela'
];

const formatRupiah = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '';
  if (val === 0) return '';
  const numberString = val.toString().replace(/[^0-9]/g, '');
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseRupiah = (str: string) => {
  const clean = str.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean) : 0;
};

interface Atlet {
  id: string;
  player_name: string;
}

interface KasEntry {
  id: string;
  created_at: string;
  tanggal_transaksi: string;
  nama_pembayar: string;
  kategori: string;
  jumlah_bayar: number;
  jumlah_bola: number;
  tipe_anggota: string; 
  jenis_transaksi: 'Masuk' | 'Keluar';
  keterangan?: string;
}

export default function KasManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kasData, setKasData] = useState<KasEntry[]>([]);
  const [atlets, setAtlets] = useState<Atlet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'form'>('list');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  const initialForm = {
    nama_pembayar: '',
    kategori: 'Iuran Bulanan Tetap (10k)',
    jumlah_bayar: 10000, 
    jumlah_bola: 0,
    tipe_anggota: 'Anggota Tetap',
    jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar',
    tanggal_transaksi: today,
    keterangan: ''
  };

  const [formData, setFormData] = useState(initialForm);

  const normalizedData = kasData.map(item => ({
    ...item,
    jenis_transaksi: DAFTAR_PEMASUKAN.includes(item.kategori) ? ('Masuk' as const) : item.jenis_transaksi
  }));

  const filteredData = normalizedData.filter(item => {
    const matchDate = item.tanggal_transaksi >= startDate && item.tanggal_transaksi <= endDate;
    const matchSearch = 
      item.nama_pembayar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDate && matchSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchTerm]);

  const stats = filteredData.reduce((acc, curr) => {
    if (curr.jenis_transaksi === 'Masuk') acc.masuk += curr.jumlah_bayar;
    else acc.keluar += curr.jumlah_bayar;
    return acc;
  }, { masuk: 0, keluar: 0 });

  const totalSaldoGlobal = normalizedData.reduce((acc, curr) => {
    return curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar;
  }, 0);

  const saldoSebelumnya = normalizedData
    .filter(item => item.tanggal_transaksi < startDate)
    .reduce((acc, curr) => {
      return curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar;
    }, 0);

  const saldoAkhirKumulatif = normalizedData
    .filter(item => item.tanggal_transaksi <= endDate)
    .reduce((acc, curr) => {
      return curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar;
    }, 0);

  const modalTetap = 600000;
  const saldoBendahara = saldoAkhirKumulatif - modalTetap;

  const getTransparentImageData = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; 
      img.src = url;
      img.onload = () => {
        const MAX_SIZE = 150;
        let w = img.width;
        let h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          if (w > h) {
            h = Math.round((h * MAX_SIZE) / w);
            w = MAX_SIZE;
          } else {
            w = Math.round((w * MAX_SIZE) / h);
            h = MAX_SIZE;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          if (!url.toLowerCase().endsWith('.svg')) {
            const imgData = ctx.getImageData(0, 0, w, h);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              if (r > 240 && g > 240 && b > 240) {
                data[i + 3] = 0;
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }
          resolve(canvas.toDataURL('image/png'));
        } else reject(new Error("Gagal mengambil context canvas"));
      };
      img.onerror = (e) => reject(e);
    });
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const fullDateStr = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const locationDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      // Ambil logo resmi terbaru dari database site_settings jika tersedia
      let logoUrl = PB_LOGO_URL;
      try {
        const { data: brandingData } = await supabase.from('site_settings').select('value').eq('key', 'navbar_branding').maybeSingle();
        if (brandingData && brandingData.value) {
          const val = typeof brandingData.value === 'string' ? JSON.parse(brandingData.value) : brandingData.value;
          if (val.logo_url) logoUrl = val.logo_url;
        }
      } catch (err) {}

      try {
        const transparentLogo = await getTransparentImageData(logoUrl);
        doc.addImage(transparentLogo, 'PNG', 15, 12, 25, 25);
      } catch (e) { console.error("Logo gagal dimuat", e); }

      doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(30, 64, 175);
      doc.text('PB. BILI BILI 162', 45, 20);
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(80, 80, 80);
      doc.text('Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Parepare 91131', 45, 26);
      doc.text('Email: pbbilibili162@gmail.com | Mobile: +62 812 902 7234', 45, 31);
      doc.setDrawColor(30, 64, 175).setLineWidth(0.8).line(15, 40, 195, 40);
      doc.setDrawColor(150, 150, 150).setLineWidth(0.2).line(15, 41.5, 195, 41.5);

      doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0);
      doc.text('LAPORAN PERTANGGUNGJAWABAN KEUANGAN KAS', 105, 52, { align: 'center' });
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(100);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 105, 58, { align: 'center' });

      const tableRows = filteredData.map(item => [
        new Date(item.tanggal_transaksi).toLocaleDateString('id-ID'),
        item.nama_pembayar?.toUpperCase() || '-',
        item.jenis_transaksi,
        item.kategori,
        item.jumlah_bola > 0 ? `${item.jumlah_bola} Pcs` : '-',
        `Rp ${item.jumlah_bayar.toLocaleString()}`
      ]);

      autoTable(doc, {
        head: [["Tanggal", "Nama", "Jenis", "Kategori", "Ket/Bola", "Nominal"]],
        body: tableRows,
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8, textColor: 50 },
        columnStyles: { 
            0: { halign: 'center', cellWidth: 22 }, 
            2: { halign: 'center', cellWidth: 18 }, 
            4: { halign: 'center', cellWidth: 20 }, 
            5: { halign: 'right', fontStyle: 'bold', cellWidth: 35 } 
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                if (data.cell.raw === 'Masuk') data.cell.styles.textColor = [16, 185, 129];
                if (data.cell.raw === 'Keluar') data.cell.styles.textColor = [239, 68, 68];
            }
        },
        margin: { bottom: 65 }
      });

      // Hitung Saldo Kas Sebelumnya (transaksi sebelum startDate)
      const saldoSebelumnya = normalizedData
        .filter(item => item.tanggal_transaksi < startDate)
        .reduce((acc, curr) => {
          return curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar;
        }, 0);

      let finalY = (doc as any).lastAutoTable.finalY + 10;
      const pageHeight = doc.internal.pageSize.height;

      if (finalY > pageHeight - 75) {
        doc.addPage();
        finalY = 20;
      }

      // Kotak Ringkasan Keuangan
      const modalTetap = 600000;
      const saldoBendahara = saldoAkhirKumulatif - modalTetap;

      doc.setDrawColor(230, 230, 230).setFillColor(248, 250, 252).roundedRect(100, finalY, 95, 48, 2, 2, 'FD');
      doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(50);
      
      doc.text(`Saldo Kas Sebelumnya:`, 105, finalY + 6);
      doc.setTextColor(50).text(`Rp ${saldoSebelumnya.toLocaleString()}`, 190, finalY + 6, { align: 'right' });

      doc.setTextColor(50).text(`Total Pemasukan:`, 105, finalY + 12);
      doc.setTextColor(16, 185, 129).text(`Rp ${stats.masuk.toLocaleString()}`, 190, finalY + 12, { align: 'right' });
      
      doc.setTextColor(50).text(`Total Pengeluaran:`, 105, finalY + 18);
      doc.setTextColor(239, 68, 68).text(`Rp ${stats.keluar.toLocaleString()}`, 190, finalY + 18, { align: 'right' });
      
      doc.setDrawColor(200).line(105, finalY + 21, 190, finalY + 21);
      
      doc.setTextColor(30, 64, 175).text(`Saldo Akhir Kas:`, 105, finalY + 27);
      doc.text(`Rp ${saldoAkhirKumulatif.toLocaleString()}`, 190, finalY + 27, { align: 'right' });

      doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(80);
      doc.text(`• Modal Kas Tetap Pemegang Bola:`, 105, finalY + 34);
      doc.text(`Rp 600.000`, 190, finalY + 34, { align: 'right' });

      doc.text(`• Saldo Kas Bendahara:`, 105, finalY + 41);
      doc.setFont("helvetica", "bold").setTextColor(30, 64, 175);
      doc.text(`Rp ${saldoBendahara.toLocaleString()}`, 190, finalY + 41, { align: 'right' });

      // Tanda Tangan
      const signY = finalY + 56;
      doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(0);
      doc.text(`Parepare, ${locationDate}`, 155, signY - 5); 
      
      doc.setFont("helvetica", "bold").text('Mengetahui,', 15, signY);
      doc.text('Ketua PB. Bili Bili 162', 15, signY + 6);
      doc.text('H. WAWAN', 15, signY + 30);
      doc.setDrawColor(0).setLineWidth(0.3).line(15, signY + 31, 60, signY + 31);
      
      doc.text('Bendahara Umum,', 155, signY + 6);
      doc.text('MUH. NUR', 155, signY + 30);
      doc.line(155, signY + 31, 195, signY + 31);

      doc.setFontSize(8).setFont("helvetica", "italic").setTextColor(180);
      doc.text(`* Dokumen ini digenerate secara otomatis melalui Treasury Master System pada ${fullDateStr}`, 15, 285);
      
      const pdfBlob = doc.output('blob');
      const fileName = `LPJ_KAS_PB162_${startDate}_TO_${endDate}.pdf`;
      const localPdfUrl = URL.createObjectURL(pdfBlob);

      const defaultMessage = `*LAPORAN PERTANGGUNGJAWABAN KAS - PB BILIBILI 162*\n\n` +
        `Periode: *${startDate} s/d ${endDate}*\n\n` +
        `• Saldo Sebelumnya: Rp ${saldoSebelumnya.toLocaleString()}\n` +
        `• Total Pemasukan: Rp ${stats.masuk.toLocaleString()}\n` +
        `• Total Pengeluaran: Rp ${stats.keluar.toLocaleString()}\n` +
        `• *Saldo Akhir Kas: Rp ${saldoAkhirKumulatif.toLocaleString()}*\n` +
        `  - Modal Kas Tetap Pemegang Bola: Rp 600.000\n` +
        `  - Saldo Kas Bendahara: Rp ${saldoBendahara.toLocaleString()}\n\n` +
        `Laporan keuangan lengkap terlampir dalam file PDF.\n\n` +
        `*Admin PB Bilibili 162*`;

      const { value: actionType } = await Swal.fire({
        title: '📱 Preview & Kirim PDF Kas ke WhatsApp',
        html: `
          <div class="text-left text-xs space-y-3 font-sans">
            <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-bold text-emerald-600 dark:text-emerald-400">PDF Terkompresi & Teks Siap Dikirim!</p>
                  <p class="text-[10px] text-slate-500 dark:text-slate-400">Gunakan tombol <b>"Bagikan File PDF + Teks"</b> atau unduh dokumen.</p>
                </div>
                <div class="flex gap-1.5">
                  <a href="${localPdfUrl}" target="_blank" class="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer">
                    👁️ Lihat
                  </a>
                  <a href="${localPdfUrl}" download="${fileName}" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer">
                    📥 Unduh
                  </a>
                </div>
              </div>
            </div>
            <div>
              <label class="font-black text-slate-400 uppercase tracking-wider block mb-1">Nomor WhatsApp Tujuan (Opsional)</label>
              <input id="swal-wa-number" class="swal2-input !m-0 !w-full !text-xs !rounded-xl !bg-slate-100 !text-slate-900 !font-bold" placeholder="Contoh: 08123456789 atau 62812...">
            </div>
            <div>
              <label class="font-black text-slate-400 uppercase tracking-wider block mb-1">Pesan Teks Pengantar</label>
              <textarea id="swal-wa-message" class="swal2-textarea !m-0 !w-full !text-xs !h-32 !rounded-xl !bg-slate-100 !text-slate-900">${defaultMessage}</textarea>
            </div>
          </div>
        `,
        focusConfirm: false,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '📤 Bagikan File PDF + Teks',
        denyButtonText: '💬 Buka WhatsApp (Teks Saja)',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#25D366',
        denyButtonColor: '#3B82F6',
        preConfirm: () => {
          return {
            type: 'share',
            phone: (document.getElementById('swal-wa-number') as HTMLInputElement)?.value || '',
            message: (document.getElementById('swal-wa-message') as HTMLTextAreaElement)?.value || defaultMessage
          };
        },
        preDeny: () => {
          return {
            type: 'wa',
            phone: (document.getElementById('swal-wa-number') as HTMLInputElement)?.value || '',
            message: (document.getElementById('swal-wa-message') as HTMLTextAreaElement)?.value || defaultMessage
          };
        }
      });

      if (actionType) {
        const phoneInput = (actionType as any).phone || '';
        const msgInput = (actionType as any).message || defaultMessage;

        if ((actionType as any).type === 'share') {
          try {
            await navigator.clipboard.writeText(msgInput);
          } catch (clipErr) {
            console.warn("Clipboard copy warning:", clipErr);
          }

          if (navigator.share && navigator.canShare) {
            try {
              const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: 'Laporan Kas PB Bilibili 162',
                  text: msgInput,
                  files: [file]
                });
                Swal.fire({
                  icon: 'success',
                  title: 'File PDF Dibagikan!',
                  html: '<p class="text-xs">Teks pesan telah disalin otomatis ke Clipboard. Silakan Paste di WhatsApp.</p>',
                  confirmButtonColor: '#25D366'
                });
                return;
              }
            } catch (shareErr: any) {
              if (shareErr.name !== 'AbortError') {
                console.warn("Native share error:", shareErr);
              } else {
                return;
              }
            }
          }

          const a = document.createElement('a');
          a.href = localPdfUrl;
          a.download = fileName;
          a.click();

          const cleanPhone = phoneInput.replace(/\D/g, '');
          const waUrl = cleanPhone
            ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(msgInput)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(msgInput)}`;
          window.open(waUrl, '_blank');

        } else if ((actionType as any).type === 'wa') {
          const cleanPhone = phoneInput.replace(/\D/g, '');
          const waUrl = cleanPhone
            ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(msgInput)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(msgInput)}`;
          window.open(waUrl, '_blank');
        }
      }
    } catch (error) { 
      console.error(error);
      alert("Terjadi kesalahan saat mengekspor PDF."); 
    }
  };

  useEffect(() => {
    if (formData.kategori === 'Pembayaran Shuttlecock' && formData.jenis_transaksi === 'Masuk') {
      const hargaPerBola = formData.tipe_anggota === 'Anggota Tetap' ? 4000 : 5000;
      const total = (formData.jumlah_bola || 0) * hargaPerBola;
      if (formData.jumlah_bayar !== total) {
        setFormData(prev => ({ ...prev, jumlah_bayar: total }));
      }
    }
    if (DAFTAR_PEMASUKAN.includes(formData.kategori) && formData.jenis_transaksi !== 'Masuk') {
      setFormData(prev => ({ ...prev, jenis_transaksi: 'Masuk' }));
    }
  }, [formData.jumlah_bola, formData.tipe_anggota, formData.kategori, formData.jenis_transaksi]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kasRes, pendaftaranRes] = await Promise.all([
        supabase.from('kas_pb').select('*').order('tanggal_transaksi', { ascending: false }),
        supabase.from('pendaftaran').select(`id, nama, atlet_stats (player_name)`).order('nama', { ascending: true })
      ]);
      setKasData(kasRes.data || []);
      if (pendaftaranRes.data) {
        const formattedAtlets = pendaftaranRes.data.map(item => ({
          id: item.id,
          player_name: item.nama || (Array.isArray(item.atlet_stats) ? item.atlet_stats[0]?.player_name : (item.atlet_stats as any)?.player_name) || 'Unknown'
        }));
        setAtlets(formattedAtlets);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalData = {
      ...formData,
      jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' : formData.jenis_transaksi
    };
    try {
      if (editingId) { 
        await supabase.from('kas_pb').update(finalData).eq('id', editingId); 
      } else { 
        await supabase.from('kas_pb').insert([finalData]); 
      }
      setEditingId(null); 
      setFormData(initialForm); 
      setActiveMobileTab('list');
      fetchData(); 
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Data Berhasil Disimpan!',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error: any) { 
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Data',
        text: error.message,
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
    } finally { 
      setSaving(false); 
    }
  };

  const handleEdit = (item: KasEntry) => {
    setEditingId(item.id);
    setFormData({
      nama_pembayar: item.nama_pembayar, 
      kategori: item.kategori, 
      jumlah_bayar: item.jumlah_bayar,
      jumlah_bola: item.jumlah_bola || 0, 
      tipe_anggota: item.tipe_anggota || 'Anggota Tetap',
      jenis_transaksi: item.jenis_transaksi, 
      tanggal_transaksi: item.tanggal_transaksi, 
      keterangan: item.keterangan || ''
    });
    setActiveMobileTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Transaksi?',
      text: "Data transaksi kas ini akan dihapus secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('kas_pb').delete().eq('id', id);
        if (error) throw error;
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Transaksi berhasil dihapus',
          showConfirmButton: false,
          timer: 3000
        });
        fetchData();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menghapus',
          text: err.message,
          confirmButtonColor: '#3B82F6',
          background: '#0F172A',
          color: '#fff'
        });
      }
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-y-auto select-none pb-28 md:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-[#0b1224] to-slate-900 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1">
            <Wallet size={10} />
            <span>Treasury Master Hub</span>
          </div>
          <h1 className="text-base sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter truncate leading-tight">
            Kelola <span className="text-blue-500">Kas Klub</span>
          </h1>
          <p className="text-slate-400 text-[9px] sm:text-xs md:text-sm font-medium mt-0.5 truncate">
            PB. BILI BILI 162 FINANCIAL HUB
          </p>
        </div>

        {/* Search, Filter & Export */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl focus-within:border-blue-500/50 transition-all w-full sm:w-52">
             <Search size={14} className="text-blue-400 shrink-0" />
             <input 
               type="text" 
               placeholder="Cari Atlet..." 
               className="bg-transparent text-[10px] sm:text-xs font-bold outline-none text-white w-full placeholder:text-zinc-600"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             {searchTerm && <X size={12} className="text-zinc-500 cursor-pointer hover:text-white" onClick={() => setSearchTerm('')} />}
          </div>

          <button onClick={exportToPDF} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95 shrink-0">
            <FileText size={14} /> <span className="hidden xs:inline">Export PDF</span><span className="xs:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 shrink-0 gap-1.5 shadow-xl">
        <button
          type="button"
          onClick={() => setActiveMobileTab('list')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'list'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white bg-black/40'
          }`}
        >
          📋 Daftar Transaksi ({kasData.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('form')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'form'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white bg-black/40'
          }`}
        >
          {editingId ? '✏️ Edit Record' : '➕ Tambah Kas'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 shrink-0">
        <div className="bg-slate-800/60 border border-white/10 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1 truncate"><Calendar size={12}/> Saldo Sebelumnya</p>
          <h2 className="text-xs sm:text-lg md:text-xl font-black italic text-slate-200 truncate">Rp {saldoSebelumnya.toLocaleString()}</h2>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1 truncate"><ArrowUpCircle size={12}/> Pemasukan</p>
          <h2 className="text-xs sm:text-lg md:text-xl font-black italic text-emerald-300 truncate">Rp {stats.masuk.toLocaleString()}</h2>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-red-400 mb-1 flex items-center gap-1 truncate"><ArrowDownCircle size={12}/> Pengeluaran</p>
          <h2 className="text-xs sm:text-lg md:text-xl font-black italic text-red-300 truncate">Rp {stats.keluar.toLocaleString()}</h2>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 sm:p-5 rounded-2xl md:rounded-[2rem]">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1 truncate"><Wallet size={12}/> Saldo Akhir Kas</p>
          <h2 className="text-xs sm:text-lg md:text-xl font-black italic text-white truncate">Rp {saldoAkhirKumulatif.toLocaleString()}</h2>
          <div className="mt-1 text-[9px] text-blue-300 font-medium space-y-0.5">
            <div>• Modal Tetap: Rp 600K</div>
            <div>• Bendahara: Rp {saldoBendahara.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-slate-900/90 border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-400 shrink-0" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-300">Filter Periode Transaksi:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-xl flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-slate-400">Dari:</span>
            <input 
              type="date" 
              className="bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none cursor-pointer"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-xl flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-slate-400">Sampai:</span>
            <input 
              type="date" 
              className="bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none cursor-pointer"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            type="button" 
            onClick={() => {
              setStartDate(firstDayOfMonth);
              setEndDate(today);
            }}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto"
          >
            Bulan Ini
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0 items-stretch pb-10 md:pb-0">
        {/* Form Column */}
        <div className={`lg:col-span-4 flex flex-col min-h-0 ${activeMobileTab === 'form' ? 'flex' : 'hidden md:flex'}`}>
          <div className="bg-[#0b1224]/90 border border-white/10 p-3 sm:p-5 rounded-2xl md:rounded-[2.5rem] flex flex-col h-auto max-h-[85vh] md:h-full min-h-0 overflow-y-auto shadow-xl">
            <h3 className="text-blue-400 font-black italic uppercase tracking-tighter text-sm sm:text-lg mb-3 flex items-center gap-2 shrink-0">
              {editingId ? <Edit3 size={16} /> : <Plus size={16} />} {editingId ? 'Edit Record' : 'Add Entry'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="flex bg-black p-1 rounded-xl border border-white/10">
                <button type="button" onClick={() => setFormData({...formData, jenis_transaksi: 'Masuk'})} className={`flex-1 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all ${formData.jenis_transaksi === 'Masuk' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Pemasukan</button>
                <button type="button" onClick={() => setFormData({...formData, jenis_transaksi: 'Keluar', kategori: 'Biaya Operasional'})} className={`flex-1 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase transition-all ${formData.jenis_transaksi === 'Keluar' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>Pengeluaran</button>
              </div>
              
              <div>
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Kategori</label>
                {formData.jenis_transaksi === 'Masuk' ? (
                  <select className="w-full bg-black border border-white/10 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm outline-none text-white" value={formData.kategori} 
                    onChange={(e) => {
                      let nominal = 10000;
                      if (e.target.value === 'Pendaftaran Atlet Baru') nominal = 50000;
                      if (e.target.value === 'Pembayaran Iuran Binaan') nominal = 25000;
                      setFormData({...formData, kategori: e.target.value, jumlah_bayar: nominal});
                    }}>
                    {DAFTAR_PEMASUKAN.map(kat => <option key={kat} value={kat}>{kat}</option>)}
                  </select>
                ) : (
                  <input type="text" className="w-full bg-black border border-white/10 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm outline-none text-white" placeholder="Detail Pengeluaran" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} />
                )}
              </div>

              {formData.kategori === 'Pembayaran Shuttlecock' && formData.jenis_transaksi === 'Masuk' && (

                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Tipe Member</label>
                    <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs" value={formData.tipe_anggota} onChange={(e) => setFormData({...formData, tipe_anggota: e.target.value})}>
                      <option value="Anggota Tetap">Tetap (4k)</option>
                      <option value="Anggota Tidak Tetap">Tidak Tetap (5k)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Jml Bola</label>
                    <input type="number" className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs font-bold text-emerald-400" placeholder="0" value={formData.jumlah_bola || ''} onChange={(e) => setFormData({...formData, jumlah_bola: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tanggal</label>
                <input type="date" required className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" value={formData.tanggal_transaksi} onChange={(e) => setFormData({...formData, tanggal_transaksi: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nama / Keterangan</label>
                {formData.jenis_transaksi === 'Masuk' ? (
                  <select required className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" value={formData.nama_pembayar} onChange={(e) => setFormData({...formData, nama_pembayar: e.target.value})}>
                    <option value="">Pilih Atlet...</option>
                    {atlets.map(a => <option key={a.id} value={a.player_name}>{a.player_name}</option>)}
                  </select>
                ) : (
                  <input type="text" required className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" placeholder="Nama Penerima" value={formData.nama_pembayar} onChange={(e) => setFormData({...formData, nama_pembayar: e.target.value})} />
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nominal (Rp)</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none font-bold text-blue-400" 
                  value={formatRupiah(formData.jumlah_bayar)} 
                  onChange={(e) => setFormData({...formData, jumlah_bayar: parseRupiah(e.target.value)})} 
                />
              </div>

              <div className="flex gap-2">
                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); setActiveMobileTab('list'); }} className="flex-1 bg-white/10 text-white font-black uppercase text-xs py-5 rounded-2xl cursor-pointer">Cancel</button>}
                <button type="submit" disabled={saving} className={`flex-[2] ${formData.jenis_transaksi === 'Masuk' ? 'bg-blue-600' : 'bg-red-600'} text-white font-black uppercase text-xs py-5 rounded-2xl flex items-center justify-center gap-2`}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? 'Update Record' : 'Submit Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={`lg:col-span-8 flex flex-col min-h-0 ${activeMobileTab === 'list' ? 'flex' : 'hidden md:flex'}`}>
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex flex-col h-auto max-h-[85vh] md:h-full min-h-0 shadow-xl">
            <div className="p-3 sm:p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400">Transaction_Ledger.log</h3>
              <div className="flex items-center gap-2">
                 <span className="text-[9px] sm:text-[10px] text-blue-400 font-bold uppercase italic">Page {currentPage} of {totalPages || 1}</span>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-white/5">
              {loading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24} /></div>
              ) : currentItems.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <Search size={30} className="text-zinc-800" />
                  <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                    {searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}"` : 'Belum Ada Data'}
                  </p>
                </div>
              ) : currentItems.map((item) => {
                const isMasuk = item.jenis_transaksi === 'Masuk';
                return (
                  <div key={item.id} className="p-3 sm:p-4 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <p className="font-bold text-xs sm:text-sm text-white group-hover:text-blue-400 uppercase leading-snug break-words">{item.nama_pembayar}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase border inline-block shrink-0 ${isMasuk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {item.kategori}
                        </span>
                      </div>
                      <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase flex items-center gap-1 mt-1">
                        <Calendar size={9}/> {item.tanggal_transaksi}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="text-left sm:text-right">
                        <p className={`font-black italic text-xs sm:text-base md:text-lg ${isMasuk ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isMasuk ? '+' : '-'} Rp {item.jumlah_bayar.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(item)} className="p-1.5 sm:p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer" title="Edit"><Edit3 size={12} className="sm:w-3.5 sm:h-3.5"/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 sm:p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer" title="Hapus"><Trash2 size={12} className="sm:w-3.5 sm:h-3.5"/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="p-3 sm:p-4 border-t border-white/5 flex items-center justify-between bg-black/30 shrink-0">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-white/10 transition-all cursor-pointer text-white"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none no-scrollbar">
                   {Array.from({ length: totalPages }, (_, i) => (
                     <button 
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`min-w-[28px] h-7 sm:h-8 rounded-lg text-[9px] sm:text-[10px] font-black transition-all cursor-pointer flex items-center justify-center ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                     >
                       {i + 1}
                     </button>
                   ))}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-white/10 transition-all cursor-pointer text-white"
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}