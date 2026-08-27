import fs from 'node:fs';

const file = 'src/ManajemenPendaftaran.tsx';
const source = fs.readFileSync(file, 'utf8');

const start = source.indexOf('  const sendWaStatusNotification = ');
const end = source.indexOf('  const handleSendAccountHistory = ', start);

if (start === -1 || end === -1) {
  throw new Error('Tidak menemukan blok sendWaStatusNotification pada ManajemenPendaftaran.tsx');
}

const replacement = String.raw`  const sendWaStatusNotification = (item: Registrant, status: 'Diterima' | 'Ditolak', reason: string = '') => {
    // Normalisasi nomor Indonesia secara konsisten: 08..., 8..., 62..., +62...
    const rawWa = String(item.whatsapp || '').trim().replace(/\D/g, '');
    let phone = rawWa;
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    else if (phone.startsWith('8')) phone = '62' + phone;
    else if (phone.startsWith('620')) phone = '62' + phone.slice(3);

    if (!phone || phone.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Nomor WhatsApp Tidak Valid',
        text: 'Nomor WhatsApp yang terdaftar tidak valid atau belum tersedia.',
        confirmButtonColor: '#2563EB'
      });
      return;
    }

    const message = status === 'Diterima'
      ? `*PEMBERITAHUAN VERIFIKASI PENDAFTARAN ATLET*\n` +
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
        `*Pengurus PB BILIBILI 162*`
      : `*PEMBERITAHUAN STATUS PENDAFTARAN ATLET*\n` +
        `*PB BILIBILI 162 PAREPARE*\n\n` +
        `Halo *${item.nama.toUpperCase()}*,\n` +
        `Mohon maaf, berdasarkan hasil verifikasi berkas, pendaftaran Anda di *PB BILIBILI 162* saat ini *BELUM DAPAT DITERIMA / DITOLAK*.\n\n` +
        `📋 *DETAIL PENDAFTARAN:*\n` +
        `• Nama: ${item.nama.toUpperCase()}\n` +
        `• Status: ❌ *DITOLAK*\n` +
        `• Catatan/Alasan: ${reason || 'Persyaratan pendaftaran belum terpenuhi.'}\n\n` +
        `Apabila ada pertanyaan lebih lanjut, silakan hubungi Pengurus PB BILIBILI 162. Terima kasih.\n\n` +
        `*Pengurus PB BILIBILI 162*`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Penting: jangan gunakan window.open() setelah await/Promise.
    // Browser mobile dapat memblokir popup karena user gesture sudah selesai.
    // Navigasi langsung ke wa.me jauh lebih konsisten untuk membuka WhatsApp.
    window.location.assign(waUrl);
  };

`;

const nextSource = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, nextSource);
console.log('[patch-registration-whatsapp-direct] OK');
