import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Mail, Plus, Search, Eye, Edit, Trash2, Printer, X, Upload, Sparkles, Send, ImageIcon, MessageCircle, Move, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

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

export function KelolaSurat() {
  const [suratList, setSuratList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [stempelPos, setStempelPos] = useState({ x: -40, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const defaultForm = {
    nomor_surat: '',
    lampiran: '-',
    perihal: 'Permohonan Menjadi Narasumber (Penceramah) Kajian Ramadan Online',
    tempat_tanggal: `Parepare, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
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
    ttd_ketua_url: '', 
    ttd_sekretaris_url: '',
    cap_stempel_url: '',
    show_recipient: true,
    show_greetings: true,
    title_override: '',
    include_lampiran_peserta: false,
    lampiran_peserta: ''
  };

  const [formData, setFormData] = useState(defaultForm);

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

      const element = printRef.current;
      if (!element) throw new Error("Element print tidak ditemukan");

      // Dynamically import html2pdf.js / jspdf
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
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

      // Mobile-friendly SweetAlert2 dialog for direct PDF file attachment + text message sharing
      const { value: actionType } = await Swal.fire({
        title: '📱 Kirim File PDF & Teks ke WhatsApp',
        html: `
          <div class="text-left text-xs space-y-3 font-sans">
            <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-bold text-emerald-600 dark:text-emerald-400">PDF Terkompresi & Teks Siap Dikirim!</p>
                  <p class="text-[10px] text-slate-500 dark:text-slate-400">Di HP/Ponsel, gunakan tombol <b>"Bagikan File PDF + Teks"</b>. Jika WhatsApp tidak otomatis menyertakan teks saat melampirkan PDF, teks telah disalin otomatis ke clipboard Anda untuk langsung ditempel (paste).</p>
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
              <input id="swal-wa-number" class="swal2-input !m-0 !w-full !text-xs !rounded-xl !bg-slate-100 !text-slate-900 !font-bold" placeholder="Contoh: 08123456789 atau 62812..." value="${surat.whatsapp || ''}">
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
        confirmButtonText: '📤 Bagikan File PDF + Teks (Satu Pesan)',
        denyButtonText: '💬 Buka WhatsApp (Teks Saja via Web)',
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
          // Copy message to clipboard automatically so user can easily paste in WhatsApp (since WhatsApp mobile share target strips text for PDF files)
          try {
            await navigator.clipboard.writeText(msgInput);
          } catch (clipErr) {
            console.warn("Clipboard copy warning:", clipErr);
          }

          // Native share with file attachment support (PDF + Text)
          if (navigator.share && navigator.canShare) {
            try {
              const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: suratPerihal,
                  text: msgInput,
                  files: [file]
                });
                
                // Show notification that text was copied so user can paste if WhatsApp app omitted it
                Swal.fire({
                  icon: 'success',
                  title: 'File PDF Dibagikan!',
                  html: '<p class="text-xs">Teks pesan telah disalin otomatis ke Clipboard. Jika WhatsApp belum menyertakan teks saat melampirkan file, cukup <b>Paste (Tempel)</b> di kolom chat WhatsApp.</p>',
                  confirmButtonColor: '#25D366'
                });
                return;
              }
            } catch (shareErr: any) {
              if (shareErr.name !== 'AbortError') {
                console.warn("Native share error:", shareErr);
              } else {
                return; // User cancelled share
              }
            }
          }

          // Fallback if native share not supported (e.g. desktop browser): download PDF + copy text + open WhatsApp
          Swal.fire({
            icon: 'success',
            title: 'PDF Diunduh & Teks Disalin',
            text: 'File PDF diunduh otomatis dan teks pesan telah disalin ke Clipboard. Cukup paste (tempel) teks di kolom pesan WhatsApp setelah melampirkan file PDF.',
            confirmButtonColor: '#25D366'
          });

          const a = document.createElement('a');
          a.href = localPdfUrl;
          a.download = fileName;
          a.click();

          let cleanPhone = phoneInput.replace(/\D/g, '');
          if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.substring(1);
          }
          const encodedMsg = encodeURIComponent(msgInput);
          const waUrl = cleanPhone 
            ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
            : `https://wa.me/?text=${encodedMsg}`;
          window.open(waUrl, '_blank');
        } else {
          // Standard WhatsApp Web / App redirection with text & link
          let cleanPhone = phoneInput.replace(/\D/g, '');
          if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.substring(1);
          }

          const encodedMsg = encodeURIComponent(msgInput);
          const waUrl = cleanPhone 
            ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
            : `https://wa.me/?text=${encodedMsg}`;

          const newWindow = window.open(waUrl, '_blank');
          if (!newWindow) {
            window.location.href = waUrl;
          }

          Swal.fire({
            icon: 'success',
            title: 'Berhasil Membuka WhatsApp',
            text: 'Pesan teks siap dikirim.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    } catch (error: any) {
      console.error("Gagal mengirim WhatsApp:", error);
      Swal.fire('Error', error.message || 'Gagal memproses surat untuk WhatsApp', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSurat = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('arsip_surat').select('*').order('created_at', { ascending: false });
      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      const combined = [...(data || []), ...localData];
      // Deduplicate by id or nomor_surat
      const unique = Array.from(new Map(combined.map(item => [item.id || item.nomor_surat, item])).values());
      setSuratList(unique);
    } catch (err: any) { 
        console.error(err);
        const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
        setSuratList(localData);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSurat(); }, []);

  const prepareNewSurat = () => {
    setEditId(null);
    setIsPreviewOnly(false);
    setActiveModalTab('form');
    setStempelPos({ x: -40, y: 0 });

    const currentYear = new Date().getFullYear().toString();
    const currentMonthRoman = getRomanMonth(new Date().getMonth());

    if (suratList.length > 0) {
      const lastSurat = suratList[0];
      const lastNomorStr = (lastSurat.nomor_surat || '').split('/')[0] || '1';
      const lastYear = (lastSurat.nomor_surat || '').split('/').pop();
      
      let nextNumber = 1;
      if (lastYear === currentYear) {
         nextNumber = parseInt(lastNomorStr) || 1;
      }
      
      const nextNumberPadded = nextNumber.toString().padStart(3, '0');
      const newFullNomor = `${nextNumberPadded}/PB-Bilibili162/${currentMonthRoman}/${currentYear}`;

      setFormData({
        ...defaultForm,
        nomor_surat: newFullNomor,
        logo_url: lastSurat.logo_url || defaultForm.logo_url,
        ttd_ketua_url: lastSurat.ttd_ketua_url || '',
        ttd_sekretaris_url: lastSurat.ttd_sekretaris_url || '',
        cap_stempel_url: lastSurat.cap_stempel_url || '',
        nama_ketua: lastSurat.nama_ketua || defaultForm.nama_ketua,
        nama_sekretaris: lastSurat.nama_sekretaris || defaultForm.nama_sekretaris
      });
    } else {
      setFormData({ ...defaultForm, nomor_surat: `001/PB-Bilibili162/${currentMonthRoman}/${currentYear}` });
    }
    setIsModalOpen(true);
  };

  const handleEdit = (surat: any) => {
    setEditId(surat.id);
    setIsPreviewOnly(false);
    setActiveModalTab('form');
    setFormData(surat);
    setIsModalOpen(true);
  };

  const handlePreview = (surat: any) => {
    setEditId(null);
    setIsPreviewOnly(true);
    setActiveModalTab('preview');
    setFormData(surat);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    const { id, created_at, show_recipient, show_greetings, title_override, ...payload } = formData as any;

    try {
      // Always save locally to localStorage as a reliable primary/backup archive store
      const localData = JSON.parse(localStorage.getItem('arsip_surat_local') || '[]');
      if (editId) {
        if (typeof editId === 'string' && editId.startsWith('local_')) {
          const updated = localData.map((item: any) => item.id === editId ? { ...item, ...payload } : item);
          localStorage.setItem('arsip_surat_local', JSON.stringify(updated));
        } else {
          const updated = localData.map((item: any) => item.id === editId ? { ...item, ...payload } : item);
          localStorage.setItem('arsip_surat_local', JSON.stringify(updated));
        }
        try {
          await supabase.from('arsip_surat').update(payload).eq('id', editId);
        } catch (supabaseErr) {
          console.warn("Supabase update fallback to local:", supabaseErr);
        }
        Swal.fire('Berhasil', 'Surat berhasil diperbarui dan disimpan ke arsip!', 'success');
      } else {
        const newLocalItem = { ...payload, id: 'local_' + Date.now(), created_at: new Date().toISOString() };
        localStorage.setItem('arsip_surat_local', JSON.stringify([newLocalItem, ...localData]));
        try {
          await supabase.from('arsip_surat').insert([payload]);
        } catch (supabaseErr) {
          console.warn("Supabase insert fallback to local:", supabaseErr);
        }
        Swal.fire('Berhasil', 'Surat berhasil disimpan ke arsip!', 'success');
      }
      setIsModalOpen(false);
      fetchSurat();
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menyimpan surat: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Surat?',
      text: "Data yang dihapus tidak bisa dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      await supabase.from('arsip_surat').delete().eq('id', id);
      fetchSurat();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (isPreviewOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - stempelPos.x, y: e.clientY - stempelPos.y });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setStempelPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.perihal) {
      Swal.fire('Info', 'Mohon isi perihal surat terlebih dahulu agar AI bisa memahami konteksnya.', 'info');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perihal: formData.perihal,
          tujuan_yth: formData.tujuan_yth,
          jabatan_tujuan: formData.jabatan_tujuan
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errorMsg = errData.error || errData.message || errorMsg;
          } else {
            const text = await response.text();
            if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
              errorMsg = "API route not found (404). Server might be restarting.";
            } else {
              errorMsg = text.slice(0, 100) || "Empty server response";
            }
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMsg);
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON success response received:", text);
        throw new Error("Server returned an unexpected success format (not JSON).");
      }

      const data = await response.json();
      
      if (!data || typeof data.text !== 'string') {
        console.error("Invalid response data format:", data);
        throw new Error("Server returned invalid data format (missing 'text' field).");
      }

      setFormData(prev => ({ ...prev, isi_surat: data.text }));
      
      Swal.fire({
        title: 'Berhasil!',
        text: 'Isi surat telah digenerate sesuai konteks.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire('AI Error', 'Gagal generate konten: ' + error.message, 'error');
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

  const filteredSurat = suratList.filter(s => 
    s.nomor_surat.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.perihal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col justify-between p-2.5 sm:p-5 md:p-8 space-y-2.5 sm:space-y-4 md:space-y-6 overflow-hidden md:overflow-visible min-h-0 select-none">
      <div className="flex flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-[#0b1224] to-slate-900 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1">
            <Mail size={10} />
            <span>Administrasi Surat</span>
          </div>
          <h1 className="text-base sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter truncate leading-tight">
            Kelola <span className="text-blue-500">Surat Klub</span>
          </h1>
          <p className="text-slate-400 text-[9px] sm:text-xs md:text-sm font-medium mt-0.5 truncate">
            PB Bilibili 162 Parepare
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
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
          <button onClick={prepareNewSurat} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95 shrink-0 shadow-lg shadow-blue-600/20 cursor-pointer">
            <Plus size={14} /> <span className="hidden xs:inline">Buat Surat Baru</span><span className="xs:hidden">Buat</span>
          </button>
        </div>
      </div>

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
        <div className="p-3 sm:p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
          <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400">Arsip_Surat.log ({filteredSurat.length})</h3>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24} /></div>
          ) : filteredSurat.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center gap-2">
              <Search size={30} className="text-zinc-800" />
              <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                {searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}"` : 'Belum Ada Arsip Surat'}
              </p>
            </div>
          ) : filteredSurat.map((s) => (
            <div key={s.id} className="p-3 sm:p-4 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-xs sm:text-sm text-blue-400 uppercase tracking-tight">{s.nomor_surat}</p>
                  <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase border border-blue-500/20 bg-blue-500/10 text-blue-300 inline-block">
                    {new Date(s.created_at).toLocaleDateString('id-ID')}
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
                  <h2 className="text-xl font-black uppercase italic">{editId ? 'Edit Surat' : 'Buat Surat Baru'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer"><X size={20}/></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Media & Identitas</p>
                      <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 cursor-pointer">
                              <ImageIcon size={14} className="mb-1 text-slate-400"/>
                              <span className="text-[7px] uppercase font-bold text-slate-500 text-center">Logo Kop</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} />
                          </label>
                          <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 cursor-pointer">
                              <Upload size={14} className="mb-1 text-slate-400"/>
                              <span className="text-[7px] uppercase font-bold text-slate-500 text-center">Cap Stempel</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cap_stempel_url')} />
                          </label>
                          <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 cursor-pointer">
                              <Upload size={14} className="mb-1 text-slate-400"/>
                              <span className="text-[7px] uppercase font-bold text-slate-500 text-center">TTD Ketua</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'ttd_ketua_url')} />
                          </label>
                          <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 cursor-pointer">
                              <Upload size={14} className="mb-1 text-slate-400"/>
                              <span className="text-[7px] uppercase font-bold text-slate-500 text-center">TTD Sekretaris</span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'ttd_sekretaris_url')} />
                          </label>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Jenis / Template Surat</label>
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
                        <option value="" disabled className="bg-slate-900 text-slate-500">Pilih jenis surat...</option>
                        {JENIS_SURAT_TEMPLATES.map(t => (
                          <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.label}</option>
                        ))}
                      </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all" onClick={() => setFormData({...formData, show_recipient: !formData.show_recipient})}>
                      <input type="checkbox" checked={formData.show_recipient} onChange={() => {}} className="w-3 h-3 rounded bg-blue-600 border-none pointer-events-none" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Tampilkan Penerima</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all" onClick={() => setFormData({...formData, show_greetings: !formData.show_greetings})}>
                      <input type="checkbox" checked={formData.show_greetings} onChange={() => {}} className="w-3 h-3 rounded bg-blue-600 border-none pointer-events-none" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Tampilkan Salam</span>
                    </div>
                  </div>

                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nomor Surat</label>
                  <input type="text" className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-blue-400" value={formData.nomor_surat} onChange={(e)=>setFormData({...formData, nomor_surat: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Ketua</label>
                          <input type="text" className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white" value={formData.nama_ketua} onChange={(e)=>setFormData({...formData, nama_ketua: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Sekretaris</label>
                          <input type="text" className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white" value={formData.nama_sekretaris} onChange={(e)=>setFormData({...formData, nama_sekretaris: e.target.value})} />
                      </div>
                  </div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tujuan (Yth)</label>
                  <input type="text" className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white" value={formData.tujuan_yth} onChange={(e)=>setFormData({...formData, tujuan_yth: e.target.value})} />
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Jabatan Tujuan</label>
                  <input type="text" className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white" value={formData.jabatan_tujuan} onChange={(e)=>setFormData({...formData, jabatan_tujuan: e.target.value})} />
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Perihal</label>
                  <textarea className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs h-16 text-white" value={formData.perihal} onChange={(e)=>setFormData({...formData, perihal: e.target.value})} />
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Isi Paragraf</label>
                    <button 
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                      className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingAI ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      {isGeneratingAI ? 'Generating...' : 'Generate AI'}
                    </button>
                  </div>
                  <textarea className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs h-32 text-white" value={formData.isi_surat} onChange={(e)=>setFormData({...formData, isi_surat: e.target.value})} />
                  
                  <div className="pt-2 border-t border-white/10 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 accent-blue-500 rounded bg-white/5 border-white/20"
                        checked={formData.include_lampiran_peserta}
                        onChange={(e) => setFormData({...formData, include_lampiran_peserta: e.target.checked})}
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sertakan Lampiran Peserta (Hal. 2)</span>
                    </label>
                    {formData.include_lampiran_peserta && (
                      <>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Daftar Peserta (1 baris per nama)</label>
                        <textarea 
                          placeholder="Budi Santoso&#10;Andi Irawan&#10;Citra Lestari" 
                          className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs h-24 mt-1 whitespace-pre-wrap text-white" 
                          value={formData.lampiran_peserta} 
                          onChange={(e)=>setFormData({...formData, lampiran_peserta: e.target.value})} 
                        />
                      </>
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
              <div className="absolute top-4 right-4 sm:top-6 sm:right-10 flex gap-2 sm:gap-3 z-50 no-print">
                  <button onClick={() => handleSendWhatsApp(formData)} disabled={isSubmitting} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xl hover:bg-green-500 transition-all disabled:opacity-50 cursor-pointer text-white">
                    {isSubmitting ? <Loader2 size={12} className="animate-spin"/> : <MessageCircle size={12}/>} <span className="hidden xs:inline">Kirim Link</span> WA
                  </button>
                  <button onClick={handlePrint} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xl hover:bg-blue-500 transition-all cursor-pointer text-white"><Printer size={12}/> Cetak</button>
                  <button onClick={() => setIsModalOpen(false)} className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all cursor-pointer text-white"><X size={16}/></button>
              </div>

              {/* Preview Paper wrapper with responsive scale on mobile */}
              <div className="w-full flex justify-center pt-10 sm:pt-4">
                <div 
                  ref={printRef} 
                  className="bg-white text-black p-[1.5cm] w-[21cm] min-h-[29.7cm] shadow-2xl font-serif text-[11pt] leading-relaxed relative overflow-hidden shrink-0 origin-top transform scale-[0.45] xs:scale-[0.52] sm:scale-[0.7] md:scale-[0.85] lg:scale-100 mb-[-320px] xs:mb-[-280px] sm:mb-[-150px] md:mb-0"
                >
                  <div className="flex items-center border-b-[4px] border-black pb-2 mb-6">
                    <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center mr-4 overflow-hidden">
                      {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                          <img src="/logo_pb_bilibili_162.svg" alt="Logo PB Bilibili 162" className="w-full h-full object-contain" />
                      )}
                    </div>
                    <div className="text-center flex-1">
                      <h1 className="text-2xl font-bold uppercase leading-tight tracking-tighter">PB BILIBILI 162</h1>
                      <p className="text-[8pt] leading-tight font-sans">Sekertariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131</p>
                      <p className="text-[8pt] font-sans">Telepon: 081219027234 | Email: pbilibili162@gmail.com</p>
                    </div>
                  </div>

                  {formData.title_override && (
                    <div className="mb-6 text-center">
                      <h2 className="text-xl font-bold underline underline-offset-8 decoration-2 uppercase tracking-widest">{formData.title_override}</h2>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                          <p>Nomor : {formData.nomor_surat}</p>
                          <p>Lampiran : {formData.lampiran}</p>
                          <p>Perihal : <strong>{formData.perihal}</strong></p>
                      </div>
                      <div className="whitespace-nowrap ml-4">
                          <p>{formData.tempat_tanggal}</p>
                      </div>
                  </div>

                  {formData.show_recipient && (
                    <div className="mb-6">
                        <p>Kepada Yth.</p>
                        <p className="font-bold">{formData.tujuan_yth}</p>
                        {formData.jabatan_tujuan && <p>{formData.jabatan_tujuan}</p>}
                        <p>Di - Tempat</p>
                    </div>
                  )}

                  <div className="space-y-4 text-justify">
                      {formData.show_greetings && (
                        <>
                          <p>Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
                          <p className="font-bold">Dengan hormat,</p>
                        </>
                      )}
                      <p className="whitespace-pre-line">{formData.isi_surat}</p>
                  </div>

                  <div className="mt-12 flex justify-between px-10 relative">
                      <div className="text-center w-48 relative">
                          <p className="mb-16">Ketua,</p>
                          {formData.ttd_ketua_url && (
                              <img src={formData.ttd_ketua_url} alt="TTD Ketua" className="absolute top-6 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply" />
                          )}
                          
                          {formData.cap_stempel_url && (
                              <div 
                                  onPointerDown={handlePointerDown}
                                  onPointerMove={handlePointerMove}
                                  onPointerUp={handlePointerUp}
                                  style={{ transform: `translate(${stempelPos.x}px, ${stempelPos.y}px)` }}
                                  className="absolute top-4 left-1/2 w-28 h-28 cursor-grab active:cursor-grabbing z-20 group select-none touch-none"
                              >
                                  <img src={formData.cap_stempel_url} alt="Cap Stempel" className="w-full h-full object-contain opacity-80 mix-blend-darken" />
                                  {!isPreviewOnly && (
                                      <div className="hidden group-hover:flex absolute inset-0 border-2 border-blue-500 border-dashed items-center justify-center">
                                          <Move size={16} className="text-blue-500"/>
                                      </div>
                                  )}
                              </div>
                          )}
                          <p className="font-bold underline uppercase whitespace-nowrap">{formData.nama_ketua}</p>
                      </div>

                      <div className="text-center w-48 relative">
                          <p className="mb-16">Sekretaris,</p>
                          {formData.ttd_sekretaris_url && (
                              <img src={formData.ttd_sekretaris_url} alt="TTD Sekretaris" className="absolute top-6 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply" />
                          )}
                          <p className="font-bold underline uppercase whitespace-nowrap">{formData.nama_sekretaris}</p>
                      </div>
                  </div>

                  {formData.include_lampiran_peserta && (
                    <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="pt-[1.5cm] mt-[1.5cm]">
                      <div className="mb-6">
                        <p>Lampiran Surat Nomor : {formData.nomor_surat}</p>
                        <p>Tanggal : {formData.tempat_tanggal.split(', ')[1] || formData.tempat_tanggal}</p>
                        <p>Perihal : {formData.perihal}</p>
                      </div>
                      <h3 className="text-lg font-bold text-center mb-6 uppercase">Daftar Lampiran Peserta</h3>
                      <table className="w-full border-collapse border border-black text-left font-sans text-[10pt]">
                        <thead>
                          <tr>
                            <th className="border border-black p-2 text-center w-12 bg-gray-100">No</th>
                            <th className="border border-black p-2 bg-gray-100">Nama Peserta</th>
                            <th className="border border-black p-2 bg-gray-100">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.lampiran_peserta.split('\n').filter(name => name.trim() !== '').map((name, i) => (
                            <tr key={i}>
                              <td className="border border-black p-2 text-center">{i + 1}</td>
                              <td className="border border-black p-2">{name}</td>
                              <td className="border border-black p-2"></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
