import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, WalletCards, Trophy, Smartphone, Images, ShieldCheck } from 'lucide-react';

const updates = [
  {
    icon: Trophy,
    tone: 'amber',
    date: '14 Sep 2026',
    title: 'Manajemen Turnamen diperbarui',
    body: 'Kontrol Aktif/Nonaktif turnamen tersedia secara manual. Status juga akan otomatis Nonaktif setelah tanggal selesai terlewati.',
    tag: 'TURNAMEN'
  },
  {
    icon: AlertTriangle,
    tone: 'rose',
    date: '14 Sep 2026',
    title: 'Rekonsiliasi laporan keuangan perlu diperiksa',
    body: 'Dashboard saat ini menampilkan rincian pengeluaran Rp54.673.800, sedangkan total pengeluaran resmi terbaru Rp54.473.800. Selisih Rp200.000 ditandai untuk pemeriksaan sebelum data diubah.',
    tag: 'PRIORITAS'
  },
  {
    icon: WalletCards,
    tone: 'emerald',
    date: '13 Sep 2026',
    title: 'Pemasukan turnamen diperbarui',
    body: 'Total pemasukan terbaru tercatat Rp54.730.000, termasuk pembaruan keuntungan bola final. Angka ini menjadi acuan informasi pemasukan terbaru.',
    tag: 'KEUANGAN'
  },
  {
    icon: Smartphone,
    tone: 'blue',
    date: '13 Sep 2026',
    title: 'Tampilan mobile Kelola Turnamen diperbaiki',
    body: 'Pendaftaran Terhubung menggunakan kartu responsif di ponsel, sementara tabel tetap dipertahankan untuk desktop. Tab juga dibuat stabil dalam dua kolom.',
    tag: 'MOBILE'
  },
  {
    icon: CheckCircle2,
    tone: 'emerald',
    date: '13 Sep 2026',
    title: 'Pendaftaran turnamen terhubung ke turnamen aktif',
    body: 'Data peserta dapat difilter berdasarkan turnamen yang sedang dikelola sehingga daftar pendaftaran tidak tercampur dengan event lain.',
    tag: 'PENDAFTARAN'
  },
  {
    icon: Images,
    tone: 'violet',
    date: '10–13 Sep 2026',
    title: 'Galeri dan upload media diperkuat',
    body: 'Form galeri dibuat lebih responsif dan pipeline kompresi foto/video diperkuat sebelum upload untuk mengurangi kegagalan dan ukuran file.',
    tag: 'GALERI'
  },
  {
    icon: Smartphone,
    tone: 'blue',
    date: '7–10 Sep 2026',
    title: 'Navigasi mobile atlet dan sponsorship diperbaiki',
    body: 'Menu Atlet beserta submenu dibuat dapat dipilih dengan benar di perangkat mobile, dan akses sponsorship diperjelas di header portal.',
    tag: 'NAVIGASI'
  },
  {
    icon: ShieldCheck,
    tone: 'slate',
    date: 'Terbaru',
    title: 'Notifikasi real-time tetap terhubung',
    body: 'Saluran notifikasi Kas, Berita, dan Jadwal tetap tersedia. Perubahan transaksi Kas juga dapat memicu pemberitahuan real-time sesuai pengaturan perangkat.',
    tag: 'REAL-TIME'
  }
];

const toneClass = (tone: string) => {
  const map: Record<string, string> = {
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    blue: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
    violet: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
    slate: 'border-white/10 bg-white/5 text-slate-300'
  };
  return map[tone] || map.slate;
};

export default function NotificationUpdates() {
  return (
    <section className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-300">
            <Clock3 size={13} /> Pusat Update Sistem
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white">Info Notifikasi & Perubahan Terbaru</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Ringkasan perubahan penting aplikasi, turnamen, keuangan, pendaftaran, dan optimasi mobile yang perlu diketahui pengguna.</p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">Sinkron Informasi</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {updates.map((item) => {
          const Icon = item.icon;
          return (
            <article key={`${item.date}-${item.title}`} className="rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-white/[.03] transition-colors">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 shrink-0 rounded-xl border p-2.5 ${toneClass(item.tone)}`}><Icon size={17} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${toneClass(item.tone)}`}>{item.tag}</span>
                    <span className="text-[9px] font-mono text-slate-500">{item.date}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-black leading-5 text-white">{item.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-400">{item.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
