import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { 
  Wallet, FileText, Loader2, ArrowUpCircle, ArrowDownCircle, Calendar,
  ChevronLeft, ChevronRight, Search, Info, TrendingUp, TrendingDown,
  Package, Zap
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

interface KasEntry {
  id: string;
  tanggal_transaksi: string;
  nama_pembayar: string;
  kategori: string;
  jumlah_bayar: number;
  jumlah_bola: number;
  jenis_transaksi: 'Masuk' | 'Keluar';
}

interface PublicKasViewProps {
  memberOnlyName?: string;
}

export default function PublicKasView({ memberOnlyName }: PublicKasViewProps = {}) {
  const [loading, setLoading] = useState(true);
  const [kasData, setKasData] = useState<KasEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Tanggal
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('kas_pb')
        .select('*');
      
      if (memberOnlyName) {
        query = query.ilike('nama_pembayar', memberOnlyName.trim());
      }
      
      const { data, error } = await query.order('tanggal_transaksi', { ascending: false });
      
      if (error) throw error;
      setKasData(data || []);
    } catch (error) {
      console.error("Error fetching kas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [memberOnlyName]);

  // --- LOGIKA SALDO GLOBAL ---
  const globalStats = kasData.reduce((acc, curr) => {
    const jenis = DAFTAR_PEMASUKAN.includes(curr.kategori) ? 'Masuk' : curr.jenis_transaksi;
    if (jenis === 'Masuk') acc.totalMasuk += curr.jumlah_bayar;
    else acc.totalKeluar += curr.jumlah_bayar;
    return acc;
  }, { totalMasuk: 0, totalKeluar: 0 });

  const saldoGlobalTerkini = globalStats.totalMasuk - globalStats.totalKeluar;

  // --- LOGIKA FILTER PENCARIAN & TANGGAL ---
  const filteredData = kasData.filter(item => {
    const matchDate = item.tanggal_transaksi >= startDate && item.tanggal_transaksi <= endDate;
    const searchLower = searchTerm.toLowerCase().trim();
    const matchSearch = 
      item.nama_pembayar.toLowerCase().includes(searchLower) || 
      item.kategori.toLowerCase().includes(searchLower);

    return matchDate && matchSearch;
  }).map(item => ({
    ...item,
    jenis_transaksi: (DAFTAR_PEMASUKAN.includes(item.kategori) ? 'Masuk' : item.jenis_transaksi) as 'Masuk' | 'Keluar'
  }));

  const stats = filteredData.reduce((acc, curr) => {
    if (curr.jenis_transaksi === 'Masuk') acc.masuk += curr.jumlah_bayar;
    else acc.keluar += curr.jumlah_bayar;
    return acc;
  }, { masuk: 0, keluar: 0 });

  const normalizedAll = kasData.map(item => ({
    ...item,
    jenis_transaksi: (DAFTAR_PEMASUKAN.includes(item.kategori) ? 'Masuk' : item.jenis_transaksi) as 'Masuk' | 'Keluar'
  }));

  const saldoSebelumnya = normalizedAll
    .filter(item => item.tanggal_transaksi < startDate)
    .reduce((acc, curr) => curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar, 0);

  const saldoAkhirPeriode = normalizedAll
    .filter(item => item.tanggal_transaksi <= endDate)
    .reduce((acc, curr) => curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar, 0);

  const memberStats = filteredData.reduce((acc, curr) => {
    if (curr.kategori === 'Iuran Bulanan Tetap (10k)' || curr.kategori === 'Pembayaran Iuran Binaan') {
      acc.iuran += curr.jumlah_bayar;
    } else if (curr.kategori === 'Pembayaran Shuttlecock') {
      acc.shuttlecock += curr.jumlah_bayar;
    } else {
      acc.lainnya += curr.jumlah_bayar;
    }
    acc.total += curr.jumlah_bayar;
    return acc;
  }, { iuran: 0, shuttlecock: 0, lainnya: 0, total: 0 });

  const modalTetap = 600000;
  const saldoBendahara = saldoAkhirPeriode - modalTetap;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        } else reject(new Error("Gagal"));
      };
      img.onerror = (e) => reject(e);
    });
  };

  // --- PERBAIKAN EXPORT PDF AGAR SAMA DENGAN ADMIN ---
  const exportToPDF = async () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const locationDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const fullDateStr = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      // 1. Header & Logo (Ambil logo resmi dari database site_settings jika ada)
      let logoUrl = PB_LOGO_URL;
      try {
        const { data: brandingData } = await supabase.from('site_settings').select('value').eq('key', 'navbar_branding').maybeSingle();
        if (brandingData && brandingData.value) {
          const val = typeof brandingData.value === 'string' ? JSON.parse(brandingData.value) : brandingData.value;
          if (val.logo_url) logoUrl = val.logo_url;
        }
      } catch (err) {}

      try {
        const logo = await getTransparentImageData(logoUrl);
        doc.addImage(logo, 'PNG', 15, 12, 22, 22);
      } catch (e) {}

      doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(30, 64, 175);
      doc.text('PB. BILI BILI 162', 42, 20);
      
      doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(100);
      doc.text('Sekretariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Parepare 91131', 42, 25);
      doc.text('Email: pbbilibili162@gmail.com | Mobile: +62 812 902 7234', 42, 30);
      
      doc.setDrawColor(30, 64, 175).setLineWidth(0.8).line(15, 38, 195, 38);

      // 2. Judul Laporan
      doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(40);
      const titleText = memberOnlyName 
        ? `LAPORAN SETORAN KAS ANGGOTA - ${memberOnlyName.toUpperCase()}`
        : 'LAPORAN PERTANGGUNGJAWABAN KEUANGAN KAS';
      doc.text(titleText, 105, 50, { align: 'center' });
      doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(120);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 105, 56, { align: 'center' });

      // 3. Tabel Transaksi
      autoTable(doc, {
        startY: 65,
        head: [['Tanggal', 'Nama', 'Jenis', 'Kategori', 'Ket/Bola', 'Nominal']],
        body: filteredData.map(item => [
          item.tanggal_transaksi,
          item.nama_pembayar.toUpperCase(),
          { content: item.jenis_transaksi, styles: { textColor: item.jenis_transaksi === 'Masuk' ? [16, 185, 129] : [225, 29, 72] } },
          item.kategori,
          item.jumlah_bola > 0 ? `${item.jumlah_bola}` : '-',
          `Rp ${item.jumlah_bayar.toLocaleString()}`
        ]),
        headStyles: { fillColor: [30, 64, 175], fontSize: 9, halign: 'center', fontStyle: 'bold' },
        columnStyles: { 
          0: { cellWidth: 25 },
          2: { halign: 'center', fontStyle: 'bold' },
          4: { halign: 'center' },
          5: { halign: 'right', fontStyle: 'bold' } 
        },
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { bottom: 65 }
      });

      // Hitung Saldo Kas Sebelumnya & Saldo Akhir
      const normalizedAll = kasData.map(item => ({
        ...item,
        jenis_transaksi: (DAFTAR_PEMASUKAN.includes(item.kategori) ? 'Masuk' : item.jenis_transaksi) as 'Masuk' | 'Keluar'
      }));

      const saldoSebelumnya = normalizedAll
        .filter(item => item.tanggal_transaksi < startDate)
        .reduce((acc, curr) => curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar, 0);

      const saldoAkhirPeriode = normalizedAll
        .filter(item => item.tanggal_transaksi <= endDate)
        .reduce((acc, curr) => curr.jenis_transaksi === 'Masuk' ? acc + curr.jumlah_bayar : acc - curr.jumlah_bayar, 0);

      // 4. Ringkasan Keuangan
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      const pageHeight = doc.internal.pageSize.height;
      if (finalY > pageHeight - 75) {
        doc.addPage();
        finalY = 20;
      }

      const modalTetap = 600000;
      const saldoBendahara = saldoAkhirPeriode - modalTetap;

      if (memberOnlyName) {
        doc.setDrawColor(230).setFillColor(248, 250, 252).roundedRect(100, finalY, 95, 30, 2, 2, 'FD');
        doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(100);
        doc.text('Total Iuran Bulanan:', 105, finalY + 6);
        doc.text(`Rp ${memberStats.iuran.toLocaleString()}`, 190, finalY + 6, { align: 'right' });

        doc.text('Total Pembelian Shuttlecock:', 105, finalY + 12);
        doc.text(`Rp ${memberStats.shuttlecock.toLocaleString()}`, 190, finalY + 12, { align: 'right' });

        doc.text('Kontribusi Lainnya:', 105, finalY + 18);
        doc.text(`Rp ${memberStats.lainnya.toLocaleString()}`, 190, finalY + 18, { align: 'right' });

        doc.setDrawColor(230).line(105, finalY + 21, 190, finalY + 21);
        doc.setTextColor(30, 64, 175);
        doc.text('Total Kontribusi Periode:', 105, finalY + 26);
        doc.text(`Rp ${memberStats.total.toLocaleString()}`, 190, finalY + 26, { align: 'right' });
      } else {
        doc.setDrawColor(230).setFillColor(248, 250, 252).roundedRect(100, finalY, 95, 48, 2, 2, 'FD');
        
        doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(100);
        doc.text('Saldo Kas Sebelumnya:', 105, finalY + 6);
        doc.setTextColor(100).text(`Rp ${saldoSebelumnya.toLocaleString()}`, 190, finalY + 6, { align: 'right' });

        doc.text('Total Pemasukan:', 105, finalY + 12);
        doc.setTextColor(16, 185, 129);
        doc.text(`Rp ${stats.masuk.toLocaleString()}`, 190, finalY + 12, { align: 'right' });

        doc.setTextColor(100);
        doc.text('Total Pengeluaran:', 105, finalY + 18);
        doc.setTextColor(225, 29, 72);
        doc.text(`Rp ${stats.keluar.toLocaleString()}`, 190, finalY + 18, { align: 'right' });

        doc.setDrawColor(230).line(105, finalY + 21, 190, finalY + 21);

        doc.setTextColor(30, 64, 175);
        doc.text('Saldo Akhir Kas:', 105, finalY + 27);
        doc.text(`Rp ${saldoAkhirPeriode.toLocaleString()}`, 190, finalY + 27, { align: 'right' });

        doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(100);
        doc.text(`• Modal Kas Tetap Pemegang Bola:`, 105, finalY + 34);
        doc.text(`Rp 600.000`, 190, finalY + 34, { align: 'right' });

        doc.text(`• Saldo Kas Bendahara:`, 105, finalY + 41);
        doc.setFont("helvetica", "bold").setTextColor(30, 64, 175);
        doc.text(`Rp ${saldoBendahara.toLocaleString()}`, 190, finalY + 41, { align: 'right' });
      }

      // 5. Tanda Tangan
      const signY = finalY + 56;
      doc.setTextColor(40).setFontSize(9);
      doc.text(`Parepare, ${locationDate}`, 155, signY - 5); 
      
      doc.setFont("helvetica", "bold");
      doc.text('Mengetahui,', 15, signY);
      doc.text('Ketua PB. Bili Bili 162', 15, signY + 6);
      doc.text('H. WAWAN', 15, signY + 30);
      doc.line(15, signY + 31, 60, signY + 31);
      
      doc.text('Bendahara Umum,', 155, signY + 6);
      doc.text('MUH. NUR', 155, signY + 30);
      doc.line(155, signY + 31, 195, signY + 31);

      doc.setFontSize(8).setFont("helvetica", "italic").setTextColor(180);
      doc.text(`* Dokumen ini digenerate secara otomatis melalui Treasury Master System pada ${fullDateStr}`, 15, 285);

      const pdfBlob = doc.output('blob');
      const fileName = memberOnlyName 
        ? `LAPORAN_SETORAN_KAS_${memberOnlyName.toUpperCase().replace(/\s+/g, '_')}_${startDate}_TO_${endDate}.pdf`
        : `LPJ_KAS_PB162_${startDate}_TO_${endDate}.pdf`;
      const localPdfUrl = URL.createObjectURL(pdfBlob);

      const defaultMessage = memberOnlyName
        ? `*LAPORAN SETORAN KAS ANGGOTA - ${memberOnlyName.toUpperCase()}*\n\n` +
          `Periode: *${startDate} s/d ${endDate}*\n\n` +
          `• Total Iuran Bulanan: Rp ${memberStats.iuran.toLocaleString()}\n` +
          `• Total Pembelian Shuttlecock: Rp ${memberStats.shuttlecock.toLocaleString()}\n` +
          `• Total Lain-lain: Rp ${memberStats.lainnya.toLocaleString()}\n` +
          `• *Total Kontribusi Periode: Rp ${memberStats.total.toLocaleString()}*\n\n` +
          `Riwayat detail terlampir dalam file PDF.\n\n` +
          `*PB Bilibili 162*`
        : `*LAPORAN PERTANGGUNGJAWABAN KAS - PB BILIBILI 162*\n\n` +
          `Periode: *${startDate} s/d ${endDate}*\n\n` +
          `• Saldo Sebelumnya: Rp ${saldoSebelumnya.toLocaleString()}\n` +
          `• Total Pemasukan: Rp ${stats.masuk.toLocaleString()}\n` +
          `• Total Pengeluaran: Rp ${stats.keluar.toLocaleString()}\n` +
          `• *Saldo Akhir Kas: Rp ${saldoAkhirPeriode.toLocaleString()}*\n` +
          `  - Modal Kas Tetap Pemegang Bola: Rp 600.000\n` +
          `  - Saldo Kas Bendahara: Rp ${saldoBendahara.toLocaleString()}\n\n` +
          `Laporan keuangan lengkap terlampir dalam file PDF.\n\n` +
          `*Admin PB Bilibili 162*`;

      const { value: actionType } = await Swal.fire({
        title: memberOnlyName ? '📱 Preview & Bagikan PDF Kas Anda' : '📱 Preview & Kirim PDF Kas ke WhatsApp',
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
    } catch (e) { alert("Gagal export PDF"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 xs:p-4 md:p-8 bg-white text-slate-900 rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-slate-100">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 mb-2">
            <Zap size={12} fill="currentColor" /> {memberOnlyName ? 'Riwayat Kas Anda' : 'Live Financial Report'}
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-2.5 italic">
            <div className="p-1.5 md:p-2 bg-blue-600 rounded-xl md:rounded-2xl text-white shadow-xl shadow-blue-200"><Wallet size={20} className="md:w-[28px] md:h-[28px]" /></div>
            {memberOnlyName ? 'REKAP KAS ANDA' : 'TRANSPARANSI KAS'}
          </h2>
          <div className="text-xs sm:text-sm text-slate-500 mt-2 font-medium flex items-center gap-2">
            <Info size={14} className="text-blue-500 shrink-0" />
            <span className="leading-tight">
              {memberOnlyName 
                ? `Pemantauan riwayat penyetoran iuran dan pembelian shuttlecock untuk ${memberOnlyName}.`
                : 'Pemantauan saldo dan mutasi dana PB. Bili Bili 162 secara terbuka.'
              }
            </span>
          </div>
        </div>
        
        <button 
          onClick={exportToPDF}
          className="group flex w-full sm:w-auto justify-center items-center gap-2 px-5 py-3 md:px-8 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[11px] tracking-[0.15em] md:tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95"
        >
          <FileText size={16} className="group-hover:rotate-12 transition-transform" /> UNDUH LAPORAN PDF
        </button>
      </div>

      {/* Filter Section */}
      <div className={`grid grid-cols-1 ${memberOnlyName ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-4 md:gap-6 mb-6 md:mb-10 bg-slate-50 p-4 xs:p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-inner`}>
        {!memberOnlyName && (
          <div className="space-y-1.5">
            <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Cari Atlet / Kategori</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
              <input 
                type="text" 
                placeholder="Ketik nama atlet atau jenis..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-xs md:text-sm bg-white"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Periode Awal</label>
          <input 
            type="date" 
            className="w-full px-4 py-2.5 rounded-xl md:rounded-2xl border border-slate-200 outline-none font-bold text-xs md:text-sm bg-white focus:ring-4 focus:ring-blue-100 transition-all"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Periode Akhir</label>
          <input 
            type="date" 
            className="w-full px-4 py-2.5 rounded-xl md:rounded-2xl border border-slate-200 outline-none font-bold text-xs md:text-sm bg-white focus:ring-4 focus:ring-blue-100 transition-all"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      {memberOnlyName ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-12">
          <div className="bg-slate-50 border border-slate-200 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 transition-transform">
              <Calendar className="text-slate-600 w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Total Iuran Bulanan Anda</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-slate-800 tracking-tighter">Rp {memberStats.iuran.toLocaleString()}</div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 transition-transform">
              <Package className="text-amber-600 w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-amber-600 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Pembelian Shuttlecock</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-amber-700 tracking-tighter">Rp {memberStats.shuttlecock.toLocaleString()}</div>
          </div>
          
          <div className="bg-rose-50 border border-rose-100 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp className="text-rose-600 w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-rose-600 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Kontribusi Lainnya</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-rose-700 tracking-tighter">Rp {memberStats.lainnya.toLocaleString()}</div>
          </div>
          
          <div className="bg-blue-600 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.15)] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-15 group-hover:scale-110 transition-transform">
              <Wallet className="text-white w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-blue-100 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Total Kontribusi Anda</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-white tracking-tighter">Rp {memberStats.total.toLocaleString()}</div>
            <div className="hidden xs:block mt-1.5 text-[8px] md:text-[10px] text-blue-100 font-semibold border-t border-white/10 pt-1.5">
              Penyetoran riwayat kas aktif
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-12">
          <div className="bg-slate-50 border border-slate-200 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 transition-transform">
              <Calendar className="text-slate-600 w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Saldo Sebelumnya</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-slate-800 tracking-tighter">Rp {saldoSebelumnya.toLocaleString()}</div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp className="text-emerald-600 w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Pemasukan Periode</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-emerald-700 tracking-tighter">Rp {stats.masuk.toLocaleString()}</div>
          </div>
          
          <div className="bg-rose-50 border border-rose-100 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingDown className="text-rose-600 w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-rose-600 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Pengeluaran Periode</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-rose-700 tracking-tighter">Rp {stats.keluar.toLocaleString()}</div>
          </div>
          
          <div className="bg-blue-600 p-3 xs:p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.15)] relative overflow-hidden group">
            <div className="absolute -right-3 -bottom-3 opacity-15 group-hover:scale-110 transition-transform">
              <Wallet className="text-white w-16 h-16 md:w-28 md:h-28" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black text-blue-100 uppercase tracking-[0.15em] md:tracking-[0.3em] mb-1">Saldo Akhir Kas</div>
            <div className="text-sm xs:text-base md:text-2xl font-black text-white tracking-tighter">Rp {saldoAkhirPeriode.toLocaleString()}</div>
            <div className="mt-1 text-[7px] xs:text-[9px] text-blue-100 font-bold space-y-0.5 border-t border-white/10 pt-1 md:mt-2 md:text-[10px] md:pt-2">
              <div>• Modal: Rp 600k</div>
              <div>• Bendahara: Rp {saldoBendahara.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Area */}
      <div className="bg-white border border-slate-100 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-sm">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Waktu</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Nama / Keterangan</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Kategori Transaksi</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/5">Ket / Bola</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/5">Tipe</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-blue-600" size={48} />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Menyinkronkan Database...</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-32 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="text-slate-300" size={32} />
                      </div>
                      <div className="text-slate-900 font-black uppercase text-xs tracking-widest">Data Kosong / Tidak Ditemukan</div>
                      <div className="text-xs text-slate-400 mt-2">Coba periksa kembali ejaan nama atlet atau filter tanggal.</div>
                    </div>
                  </td>
                </tr>
              ) : currentItems.map((item) => {
                const isIncome = item.jenis_transaksi === 'Masuk';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="p-6">
                      <div className="flex items-center gap-3 text-slate-400 text-[11px] font-black uppercase tracking-tighter">
                        <Calendar size={14} className="text-blue-500" /> 
                        {new Date(item.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="font-black text-slate-800 uppercase text-xs tracking-tight group-hover:text-blue-600 transition-colors">
                        {item.nama_pembayar}
                      </div>
                    </td>
                    <td className="p-6">
                       <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200">
                          {item.kategori}
                       </span>
                    </td>
                    <td className="p-6 text-center">
                       {item.jumlah_bola > 0 ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 shadow-sm">
                             <Package size={12} className="text-amber-500" />
                             <span className="text-[10px] font-black uppercase tracking-tighter">{item.jumlah_bola} Pcs</span>
                          </div>
                       ) : (
                          <span className="text-slate-200 font-black">--</span>
                       )}
                    </td>
                    <td className="p-6 text-center">
                       <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                          {isIncome ? <ArrowUpCircle size={10}/> : <ArrowDownCircle size={10}/>}
                          {item.jenis_transaksi}
                       </div>
                    </td>
                    <td className={`p-6 text-right font-black text-sm tracking-tighter ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+' : '-'} Rp {item.jumlah_bayar.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin text-blue-600 mx-auto" size={28} />
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-2">Menyinkronkan Database...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="text-slate-300 mx-auto mb-3" size={24} />
              <div className="text-slate-950 font-black uppercase text-[10px] tracking-widest">Data Kosong / Tidak Ditemukan</div>
              <div className="text-[10px] text-slate-400 mt-1">Coba periksa filter nama atau tanggal.</div>
            </div>
          ) : (
            currentItems.map((item) => {
              const isIncome = item.jenis_transaksi === 'Masuk';
              return (
                <div key={item.id} className="p-3 xs:p-4 hover:bg-slate-50 transition-all flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar size={10} className="text-blue-500" />
                      {new Date(item.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[7.5px] font-black uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                      {isIncome ? <ArrowUpCircle size={8}/> : <ArrowDownCircle size={8}/>}
                      {item.jenis_transaksi}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-slate-800 uppercase text-xs tracking-tight truncate">{item.nama_pembayar}</div>
                      <div className="flex gap-1.5 mt-1 items-center flex-wrap">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200 truncate max-w-[140px]">
                          {item.kategori}
                        </span>
                        {item.jumlah_bola > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100 text-[8px] font-black">
                            <Package size={8} className="text-amber-500" />
                            {item.jumlah_bola} Pcs
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className={`text-right font-black text-xs xs:text-sm tracking-tighter shrink-0 ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+' : '-'} Rp {item.jumlah_bayar.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Section */}
        <div className="p-4 xs:p-6 md:p-8 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 border-t border-slate-100">
           <div className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] md:tracking-[0.2em] text-center sm:text-left">
              Data Ke <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)}</span> Dari <span className="text-slate-900">{filteredData.length}</span> Transaksi
           </div>
           <div className="flex items-center gap-2 xs:gap-3">
              <button 
                disabled={currentPage === 1}
                onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => { setCurrentPage(i + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                    className={`w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl font-black text-[10px] md:text-[11px] transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-200'}`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
              >
                Next <ChevronRight size={12} />
              </button>
           </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 md:mt-12 flex flex-col md:flex-row justify-between items-center gap-3 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-slate-400 text-center">
        <div>© 2026 PB. BILI BILI 162</div>
        <div className="flex items-center gap-2 italic justify-center">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> 
          Verified by Admin
        </div>
      </div>
    </div>
  );
}