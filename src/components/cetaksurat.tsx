import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { getStoredDigitalAssets, getValidAssetUrl, DEFAULT_LOGO_URL } from './KelolaSurat';

export const cetakSuratPDF = async (surat: any) => {
  const masterAssets = getStoredDigitalAssets();
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- LOGIKA HELPER UNTUK DRAW IMAGE ---
  const addImageFromUrl = (url: string, x: number, y: number, w: number, h: number) => {
    return new Promise((resolve) => {
      if (!url || typeof url !== 'string' || url.trim() === '') {
        resolve(false);
        return;
      }
      const img = new Image();
      img.src = url;
      img.crossOrigin = "Anonymous"; // Penting agar tidak kena CORS
      img.onload = () => {
        try {
          doc.addImage(img, 'PNG', x, y, w, h);
        } catch (e) {}
        resolve(true);
      };
      img.onerror = () => resolve(false); // Tetap lanjut jika gambar gagal muat
    });
  };

  // 1. KOP SURAT (Header)
  const urlLogo = getValidAssetUrl(surat?.logo_url, masterAssets.logo_url || DEFAULT_LOGO_URL);
  if (urlLogo) {
    await addImageFromUrl(urlLogo, 15, 12, 22, 22);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PB BILIBILI 162", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sekertariat: Jl. Andi Makkasau No.171, Ujung Lare, Kec. Soreang, Kota Parepare, Sulawesi Selatan 91131", pageWidth / 2, 28, { align: "center" });
  doc.text("Telepon: 081219027234 | Email: pbilibili162@gmail.com", pageWidth / 2, 34, { align: "center" });
  
  // Garis Double Kop
  doc.setLineWidth(0.8);
  doc.line(15, 37, pageWidth - 15, 37);
  doc.setLineWidth(0.2);
  doc.line(15, 38, pageWidth - 15, 38);

  // 2. BODY SURAT
  doc.text(`Nomor  : ${surat.nomor_surat || '-'}`, 20, 50);
  doc.text(`Perihal : ${surat.perihal || '-'}`, 20, 56);
  
  // Format Tanggal Indonesia
  const tglFormatted = surat.tanggal_surat 
    ? new Date(surat.tanggal_surat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : (surat.tempat_tanggal || 'Parepare');
  doc.text(tglFormatted.startsWith('Parepare') ? tglFormatted : `Parepare, ${tglFormatted}`, pageWidth - 20, 50, { align: "right" });

  doc.text("Kepada Yth,", 20, 75);
  doc.setFont("helvetica", "bold");
  doc.text((surat.tujuan_yth || surat.tujuan_instansi || 'di Tempat').toUpperCase(), 20, 81);
  
  doc.setFont("helvetica", "normal");
  doc.text("Dengan hormat,", 20, 95);
  const isiSplit = doc.splitTextToSize(surat.isi_ringkas || surat.isi_surat || '', pageWidth - 40);
  doc.text(isiSplit, 20, 102);

  // 3. TANDA TANGAN (Footer) - DENGAN IMAGE REALTIME DARI DATABASE
  const footerY = 200;
  doc.text("Ketua Umum,", 30, footerY);
  doc.text("Sekretaris,", pageWidth - 70, footerY);

  // Resolusi Aset TTD & Stempel dari Surat / Database Default
  const urlKetua = getValidAssetUrl(surat?.ttd_ketua_url, masterAssets.ttd_ketua_url);
  const urlSekre = getValidAssetUrl(surat?.ttd_sekretaris_url, masterAssets.ttd_sekretaris_url);
  const urlStempel = getValidAssetUrl(surat?.cap_stempel_url, masterAssets.cap_stempel_url);

  // TTD Ketua
  if (urlKetua) {
    await addImageFromUrl(urlKetua, 25, footerY + 2, 35, 25);
  }
  // TTD Sekretaris
  if (urlSekre) {
    await addImageFromUrl(urlSekre, pageWidth - 75, footerY + 2, 35, 25);
  }
  // Stempel (Diposisikan agak menimpa TTD Ketua agar terlihat asli)
  if (urlStempel) {
    await addImageFromUrl(urlStempel, 45, footerY + 5, 30, 30);
  }

  const namaKetua = surat.nama_ketua || masterAssets.nama_ketua || "H. WAWAN";
  const namaSekre = surat.nama_sekretaris || masterAssets.nama_sekretaris || "H. BARHAMAN MUIN S.AG";

  doc.setFont("helvetica", "bold");
  doc.text(namaKetua.toUpperCase(), 30, footerY + 35);
  doc.text(namaSekre.toUpperCase(), pageWidth - 70, footerY + 35);

  // 4. LOGIKA KIRIM WHATSAPP
  const kirimWhatsApp = () => {
    const pesan = `*SURAT KELUAR PBSI*%0A----------------------------%0A*No:* ${surat.nomor_surat}%0A*Perihal:* ${surat.perihal}%0A*Tujuan:* ${surat.tujuan_yth || surat.tujuan_instansi || 'di Tempat'}%0A%0ASurat resmi telah dibuat secara digital. Silahkan unduh dokumen pada sistem.`;
    window.open(`https://wa.me/?text=${pesan}`, '_blank');
  };

  // Simpan PDF
  const cleanNomor = (surat.nomor_surat || 'surat').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
  doc.save(`Surat_${cleanNomor}.pdf`);
  
  // Opsi: Tanya user apakah ingin langsung kirim WA
  Swal.fire({
    title: 'PDF Berhasil Dibuat',
    text: "Kirim notifikasi via WhatsApp?",
    icon: 'success',
    showCancelButton: true,
    confirmButtonText: 'Ya, Kirim WA',
    cancelButtonText: 'Tidak'
  }).then((result) => {
    if (result.isConfirmed) kirimWhatsApp();
  });
};