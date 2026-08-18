import React, { useEffect, useState } from 'react';
import { getSiteSetting } from '../utils/siteSettingsHelper';

const DEFAULT_IMAGE = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png';
const DEFAULT_TEXT = `Selamat datang di PB Bilibili 162. Kami menyambut hangat seluruh atlet bulutangkis dan para pecinta olahraga bulutangkis di Kota Parepare. Kehadiran Anda adalah semangat bagi kami untuk terus berkontribusi bagi kemajuan bulutangkis di daerah kita tercinta.

Bagi rekan-rekan atlet, kami berkomitmen menyediakan wadah pelatihan yang terstruktur, disiplin, dan berintegritas untuk mengasah potensi maksimal Anda. Sementara bagi seluruh pecinta bulutangkis di Parepare, mari kita jadikan klub ini sebagai rumah bersama dalam memupuk sportivitas dan kegemaran terhadap olahraga ini.

Mari kita terus bersinergi, meraih prestasi gemilang, dan mempererat tali persaudaraan di dalam maupun di luar lapangan. Terima kasih atas dukungan dan kepercayaan yang Anda berikan kepada PB Bilibili 162.`;

interface SambutanConfig {
  nama?: string;
  jabatan?: string;
  label?: string;
  judul?: string;
  deskripsi?: string;
  foto_url?: string;
}

const SambutanKetua = () => {
  const [config, setConfig] = useState<SambutanConfig>({
    nama: 'H. Wawan',
    jabatan: 'Ketua Umum PB Bilibili 162',
    label: 'Sambutan Pimpinan',
    judul: 'Sambutan Ketua Umum',
    deskripsi: DEFAULT_TEXT,
    foto_url: DEFAULT_IMAGE
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await getSiteSetting('sambutan_ketua');
        let parsed: any = raw;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch { parsed = null; }
        }
        if (mounted && parsed && typeof parsed === 'object') {
          setConfig(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.warn('Gagal memuat sambutan ketua:', error);
      }
    };
    load();

    const handler = (event: any) => {
      if (event.detail?.key !== 'sambutan_ketua') return;
      const value = event.detail?.value;
      if (value && typeof value === 'object') {
        setConfig(prev => ({ ...prev, ...value }));
      } else {
        load();
      }
    };
    window.addEventListener('site_setting_updated', handler);
    return () => {
      mounted = false;
      window.removeEventListener('site_setting_updated', handler);
    };
  }, []);

  const paragraphs = (config.deskripsi || DEFAULT_TEXT).split(/\n\s*\n/).filter(Boolean);

  return (
    <section className="bg-[#070d1a] text-white py-10 md:py-20 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative max-w-xs sm:max-w-sm md:max-w-full mx-auto w-full">
            <img
              src={config.foto_url || DEFAULT_IMAGE}
              alt={`${config.nama || 'Ketua'} - ${config.jabatan || 'Ketua Umum PB Bilibili 162'}`}
              className="rounded-2xl shadow-2xl border border-white/10 w-full h-auto object-cover aspect-[4/5]"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (e.currentTarget.src !== DEFAULT_IMAGE) e.currentTarget.src = DEFAULT_IMAGE;
              }}
            />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-blue-600/20 rounded-full blur-xl -z-10" />
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
              <span>{config.label || 'Sambutan Pimpinan'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic">
              {config.judul || 'Sambutan Ketua Umum'}
            </h2>
            <div className="space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="text-sm sm:text-base text-slate-300 leading-relaxed text-justify whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="pt-2 border-t border-white/10">
              <p className="text-lg font-extrabold text-white">{config.nama || 'H. Wawan'}</p>
              <p className="text-blue-400 font-semibold text-xs sm:text-sm">{config.jabatan || 'Ketua Umum PB Bilibili 162'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SambutanKetua;
