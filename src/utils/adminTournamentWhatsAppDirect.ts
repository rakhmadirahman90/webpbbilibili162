export type AdminTournamentWhatsAppRow = {
  kode_pendaftaran?: string | null;
  nama_pemain_1?: string | null;
  nama_pemain_2?: string | null;
  whatsapp?: string | null;
  kategori?: string | null;
  asal_pb?: string | null;
  domisili?: string | null;
  status_pembayaran?: string | null;
  status_pendaftaran?: string | null;
  catatan_admin?: string | null;
};

const GROUP_URL = 'https://chat.whatsapp.com/Bs7TWJMPB2v78GTcTl30vO';
const clean = (value: unknown) => String(value ?? '').trim();

const normalizeWhatsApp = (value?: string | null) => {
  let number = clean(value).replace(/[^\d+]/g, '');
  if (number.startsWith('+')) number = number.slice(1);
  if (number.startsWith('0')) number = `62${number.slice(1)}`;
  else if (number.startsWith('8')) number = `62${number}`;
  return number;
};

export function openAdminTournamentWhatsApp(row: AdminTournamentWhatsAppRow) {
  const phone = normalizeWhatsApp(row.whatsapp);
  if (!phone) {
    void import('sweetalert2').then(({ default: Swal }) => Swal.fire({
      icon: 'error',
      title: 'WhatsApp belum tersedia',
      text: 'Nomor WhatsApp penanggung jawab belum diisi pada data pendaftaran.'
    }));
    return;
  }

  const message = [
    'PENDAFTARAN BERHASIL DIVERIFIKASI',
    'PB BILIBILI 162 CUP I TAHUN 2026', '',
    'Halo Penanggung Jawab,',
    'Pendaftaran pasangan Anda telah DITERIMA & DIVERIFIKASI oleh Admin.', '',
    `* Kode: ${clean(row.kode_pendaftaran) || '-'}`,
    `* Kategori: ${clean(row.kategori) || '-'}`,
    `* Pemain 1: ${clean(row.nama_pemain_1) || '-'}`,
    `* Pemain 2: ${clean(row.nama_pemain_2) || '-'}`,
    `* PB/Klub: ${clean(row.asal_pb) || '-'}`,
    `* Domisili: ${clean(row.domisili) || '-'}`,
    `* Pembayaran: ${clean(row.status_pembayaran) || '-'}`,
    `* Status: ${clean(row.status_pendaftaran) || 'DITERIMA & DIVERIFIKASI'}`,
    `* Catatan Admin: ${clean(row.catatan_admin) || '-'}`, '',
    'Selamat, pasangan Anda resmi terdaftar sebagai peserta pada kategori tersebut.', '',
    '08–12 September 2026 • GOR Titik Kumpul Soreang Parepare',
    'Panitia PB BILIBILI 162', '',
    '📲 INFORMASI GRUP WA PESERTA',
    'Silakan bergabung ke Grup WhatsApp Peserta untuk mendapatkan informasi dan pembaruan turnamen:',
    GROUP_URL
  ].join('\n');

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}
