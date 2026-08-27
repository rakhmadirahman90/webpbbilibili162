import fs from 'node:fs';

const path = 'src/ManajemenPendaftaran.tsx';
let source = fs.readFileSync(path, 'utf8');

if (source.includes('PATCH_WHATSAPP_STATUS_MOBILE_V2')) process.exit(0);

const oldCall = '      sendWaStatusNotification(item, newStatus, catatan);';
const newCall = [
  '      // PATCH_WHATSAPP_STATUS_MOBILE_V2: preserve the user gesture for WhatsApp on mobile browsers.',
  '      const waUrl = buildWaStatusNotificationUrl(item, newStatus, catatan);',
  '      if (waUrl) {',
  "        const waWindow = window.open('about:blank', '_blank');",
  '        if (waWindow) {',
  '          waWindow.location.href = waUrl;',
  '        } else {',
  '          // Same-tab fallback when the mobile browser blocks a new tab.',
  '          window.location.href = waUrl;',
  '        }',
  '      }'
].join('\n');

if (!source.includes(oldCall)) throw new Error('WhatsApp status call target not found.');
source = source.replace(oldCall, newCall);

const startMarker = "  const sendWaStatusNotification = (item: Registrant, status: 'Diterima' | 'Ditolak', reason: string = '') => {";
const endMarker = '\n  const handleSendAccountHistory';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('WhatsApp status function boundaries not found.');

const replacement = [
  '  const buildWaStatusNotificationUrl = (item: Registrant, status: \'Diterima\' | \'Ditolak\', reason: string = \'\') => {',
  '    const rawWa = (item.whatsapp || \'\').replace(/\\D/g, \'\');',
  "    const phone = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : rawWa;",
  '',
  "    if (!phone || phone.length < 8) {",
  "      Swal.fire('No WhatsApp Tidak Valid', 'Nomor WhatsApp atlet ini tidak lengkap.', 'warning');",
  "      return '';",
  '    }',
  '',
  "    let message = '';",
  "    if (status === 'Diterima') {",
  '      message =',
  '        `*PEMBERITAHUAN VERIFIKASI PENDAFTARAN ATLET*\\n` +',
  '        `*PB BILIBILI 162 PAREPARE*\\n\\n` +',
  '        `Halo *${item.nama.toUpperCase()}*,\\n` +',
  '        `Selamat! Pendaftaran Anda sebagai atlet/anggota baru di *PB BILIBILI 162* telah *DITERIMA & DIVERIFIKASI RESMI* oleh Admin.\\n\\n` +',
  '        `📋 *INFORMASI ATLET VERIFIED:*\\n` +',
  '        `• Nama Atlet: ${item.nama.toUpperCase()}\\n` +',
  '        `• Status Verifikasi: ✅ *DITERIMA (AKTIF)*\\n` +',
  '        `• Kelompok Usia: ${item.kategori || \'-\'}\\n` +',
  '        `• Kategori Atlet: ${item.kategori_atlet || \'MUDA\'}\\n` +',
  '        `• Domisili: ${item.domisili || \'-\'}\\n\\n` +',
  '        `🌐 *AKSES LOGIN SISTEM:*\\n` +',
  '        `Silakan login untuk mengecek profil atlet Anda di:\\n` +',
  '        `https://pbilibili162.99apps.id/login\\n\\n` +',
  '        `Selamat bergabung dan salam olahraga!\\n` +',
  '        `*Pengurus PB BILIBILI 162*`;',
  '    } else {',
  '      message =',
  '        `*PEMBERITAHUAN STATUS PENDAFTARAN ATLET*\\n` +',
  '        `*PB BILIBILI 162 PAREPARE*\\n\\n` +',
  '        `Halo *${item.nama.toUpperCase()}*,\\n` +',
  '        `Mohon maaf, berdasarkan hasil verifikasi berkas, pendaftaran Anda di *PB BILIBILI 162* saat ini *BELUM DAPAT DITERIMA / DITOLAK*.\\n\\n` +',
  '        `📋 *DETAIL PENDAFTARAN:*\\n` +',
  '        `• Nama: ${item.nama.toUpperCase()}\\n` +',
  '        `• Status: ❌ *DITOLAK*\\n` +',
  '        `• Catatan/Alasan: ${reason || \'Persyaratan pendaftaran belum terpenuhi.\'}\\n\\n` +',
  '        `Apabila ada pertanyaan lebih lanjut, silakan hubungi Pengurus PB BILIBILI 162. Terima kasih.\\n\\n` +',
  '        `*Pengurus PB BILIBILI 162*`;',
  '    }',
  '',
  '    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;',
  '  };',
  '  // PATCH_WHATSAPP_STATUS_MOBILE_V2'
].join('\n');

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(path, source);
console.log('WhatsApp mobile status notification patch applied.');
