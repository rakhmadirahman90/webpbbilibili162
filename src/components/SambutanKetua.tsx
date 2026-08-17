import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const FALLBACK = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/identitas/1775222807673-ccq2ee.jpg';

interface SambutanConfig {
  nama: string;
  jabatan: string;
  foto_url: string;
  paragraf_1: string;
  paragraf_2: string;
  paragraf_3: string;
  updated_at?: string;
}

const DEFAULT_CONFIG: SambutanConfig = {
  nama: 'H. Wawan',
  jabatan: 'Ketua Umum PB Bilibili 162',
  foto_url: FALLBACK,
  paragraf_1: 'Selamat datang di PB Bilibili 162. Kami menyambut hangat seluruh atlet bulutangkis dan para pecinta olahraga bulutangkis di Kota Parepare. Kehadiran Anda adalah semangat bagi kami untuk terus berkontribusi bagi kemajuan bulutangkis di daerah kita tercinta.',
  paragraf_2: 'Bagi rekan-rekan atlet, kami berkomitmen menyediakan wadah pelatihan yang terstruktur, disiplin, dan berintegritas untuk mengasah potensi maksimal Anda. Sementara bagi seluruh pecinta bulutangkis di Parepare, mari kita jadikan klub ini sebagai rumah bersama dalam memupuk sportivitas dan kegemaran terhadap olahraga ini.',
  paragraf_3: 'Mari kita terus bersinergi, meraih prestasi gemilang, dan mempererat tali persaudaraan di dalam maupun di luar lapangan. Terima kasih atas dukungan dan kepercayaan yang Anda berikan kepada PB Bilibili 162.'
};

const SambutanKetua = () => {
  const [content, setContent] = useState<SambutanConfig>(DEFAULT_CONFIG);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'sambutan_ketua_umum')
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        const value = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setContent((prev) => ({ ...prev, ...value }));
      }
    } catch (error) {
      console.warn('[SambutanKetua] Konfigurasi Supabase gagal dimuat, memakai fallback:', error);
    }
  };

  useEffect(() => {
    loadContent();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.key === 'sambutan_ketua_umum' && detail.value) {
        setContent((prev) => ({ ...prev, ...detail.value }));
      } else if (detail?.key === 'sambutan_ketua_umum') {
        loadContent();
      }
    };

    window.addEventListener('site_setting_updated', handleUpdate);
    window.addEventListener('sambutan_ketua_updated', (event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) setContent((prev) => ({ ...prev, ...detail }));
    });

    const channel = supabase
      .channel('landing-sambutan-ketua-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.sambutan_ketua_umum' }, (payload: any) => {
        const value = payload?.new?.value;
        if (value) setContent((prev) => ({ ...prev, ...(typeof value === 'string' ? JSON.parse(value) : value) }));
        else loadContent();
      })
      .subscribe();

    return () => {
      window.removeEventListener('site_setting_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const paragraphs = [content.paragraf_1, content.paragraf_2, content.paragraf_3].filter((text) => String(text || '').trim());
  const fotoUrl = String(content.foto_url || FALLBACK).trim() || FALLBACK;

  return (
    <section className="bg-[#070d1a] text-white py-10 md:py-20 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative max-w-xs sm:max-w-sm md:max-w-full mx-auto w-full">
            <img src={fotoUrl} alt={`${content.nama} - ${content.jabatan}`} className="rounded-2xl shadow-2xl border border-white/10 w-full h-auto object-cover aspect-[4/5]" loading="lazy" decoding="async" onError={(event) => { if (event.currentTarget.src !== FALLBACK) event.currentTarget.src = FALLBACK; }} />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-blue-600/20 rounded-full blur-xl -z-10" />
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest"><span>Sambutan Pimpinan</span></div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic">Sambutan <span className="text-blue-500">Ketua Umum</span></h2>
            {paragraphs.map((paragraph, index) => <p key={index} className="text-sm sm:text-base text-slate-300 leading-relaxed text-justify">{paragraph}</p>)}
            <div className="pt-2 border-t border-white/10">
              <p className="text-lg font-extrabold text-white">{content.nama}</p>
              <p className="text-blue-400 font-semibold text-xs sm:text-sm">{content.jabatan}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SambutanKetua;
