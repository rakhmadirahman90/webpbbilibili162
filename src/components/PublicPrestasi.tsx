import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting } from '../utils/siteSettingsHelper';

const PAGE_SIZE = 6;

export default function PublicPrestasi() {
  const [prestasi, setPrestasi] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchPrestasi = async () => {
      try {
        const data = await getSiteSetting('prestasi_list');
        if (Array.isArray(data) && data.length) {
          setPrestasi(data);
          localStorage.setItem('prestasi_local_v3', JSON.stringify(data));
          return;
        }
        const { data: sb1 } = await supabase.from('prestasi').select('*').order('tahun', { ascending: false });
        if (sb1?.length) {
          setPrestasi(sb1);
          localStorage.setItem('prestasi_local_v3', JSON.stringify(sb1));
          return;
        }
        const { data: sb2 } = await supabase.from('prestasi_klub').select('*').order('tahun', { ascending: false });
        if (sb2?.length) {
          setPrestasi(sb2);
          localStorage.setItem('prestasi_local_v3', JSON.stringify(sb2));
          return;
        }
        throw new Error('No data');
      } catch {
        const local = JSON.parse(localStorage.getItem('prestasi_local_v3') || '[]');
        setPrestasi(local.length ? local : [
          { id:'p1', nama_kejuaraan:'Kejurkot Parepare (Tunggal Putra Dewasa)', tingkat:'Kabupaten/Kota', tahun:2023, medali_emas:1, medali_perak:0, medali_perunggu:1, atlet_berprestasi:'Andi (Emas), Budi (Perunggu)' },
          { id:'p2', nama_kejuaraan:'Kejuaraan Provinsi (Kejurprov) Sulsel', tingkat:'Provinsi', tahun:2023, medali_emas:0, medali_perak:1, medali_perunggu:2, atlet_berprestasi:'Ganda Putra: Candra/Deni (Perak)' },
          { id:'p3', nama_kejuaraan:'Sirkuit Nasional (Sirnas) B Sulawesi', tingkat:'Nasional', tahun:2022, medali_emas:1, medali_perak:1, medali_perunggu:1, atlet_berprestasi:'Eka (Emas - Tunggal Taruna Putri)' },
          { id:'p4', nama_kejuaraan:'Walikota Cup Makassar (Ganda Campuran)', tingkat:'Provinsi', tahun:2024, medali_emas:1, medali_perak:0, medali_perunggu:0, atlet_berprestasi:'Fajar/Gita (Emas)' },
          { id:'p5', nama_kejuaraan:'O2SN Tingkat SMA se-Sulsel', tingkat:'Provinsi', tahun:2023, medali_emas:2, medali_perak:1, medali_perunggu:0, atlet_berprestasi:'Hadi (Emas), Indah (Emas)' }
        ]);
      }
    };
    fetchPrestasi();
  }, []);

  const totalPages = Math.max(1, Math.ceil(prestasi.length / PAGE_SIZE));
  const current = useMemo(() => prestasi.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [prestasi, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (!prestasi.length) return null;

  return (
    <section id="prestasi" className="py-20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-black uppercase tracking-widest mb-4"><Star size={14}/> Prestasi</motion.div>
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-3xl md:text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">Apresiasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">Juara</span></motion.h2>
          <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-slate-400">Dedikasi dan kerja keras menghasilkan prestasi. Berikut adalah beberapa pencapaian terbaik atlet kami di berbagai kejuaraan.</motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {current.map((item, index) => (
            <motion.div key={item.id ?? `${item.nama_kejuaraan}-${index}`} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.05}} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 flex flex-col items-center justify-center border border-yellow-500/20 mb-6"><Trophy size={20} className="text-yellow-500 mb-0.5"/><span className="text-[9px] font-black text-yellow-500 leading-none">{item.tahun}</span></div>
              <h3 className="text-xl font-bold text-white mb-1">{item.nama_kejuaraan}</h3>
              <p className="text-sm text-yellow-500/80 mb-5">Tingkat {item.tingkat}</p>
              <div className="flex justify-between items-center bg-white/5 rounded-2xl p-3 border border-white/5 mb-5">
                <div className="text-center"><Medal size={20} className="text-yellow-400 mx-auto mb-1"/><div className="text-lg font-black text-white">{item.medali_emas ?? 0}</div><div className="text-[9px] uppercase tracking-wider text-slate-500">Emas</div></div>
                <div className="w-px h-10 bg-white/10"/>
                <div className="text-center"><Medal size={20} className="text-slate-300 mx-auto mb-1"/><div className="text-lg font-black text-white">{item.medali_perak ?? 0}</div><div className="text-[9px] uppercase tracking-wider text-slate-500">Perak</div></div>
                <div className="w-px h-10 bg-white/10"/>
                <div className="text-center"><Medal size={20} className="text-amber-600 mx-auto mb-1"/><div className="text-lg font-black text-white">{item.medali_perunggu ?? 0}</div><div className="text-[9px] uppercase tracking-wider text-slate-500">Prgg</div></div>
              </div>
              {item.atlet_berprestasi && <div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Atlet Peraih Medali:</div><div className="text-sm text-slate-300 leading-relaxed">{item.atlet_berprestasi}</div></div>}
            </motion.div>
          ))}
        </div>

        {totalPages > 1 && <div className="pagination flex items-center justify-center gap-2 mt-8" aria-label="Pagination prestasi">
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="min-w-10 min-h-10 rounded-xl border border-white/10 bg-white/5 disabled:opacity-40" aria-label="Halaman sebelumnya"><ChevronLeft size={18}/></button>
          {Array.from({length:totalPages},(_,i)=>i+1).map(p => <button key={p} onClick={() => setPage(p)} className={`min-w-10 min-h-10 rounded-xl border text-sm font-bold ${p===page?'bg-yellow-500/20 border-yellow-500/40 text-yellow-400':'border-white/10 bg-white/5 text-slate-300'}`}>{p}</button>)}
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="min-w-10 min-h-10 rounded-xl border border-white/10 bg-white/5 disabled:opacity-40" aria-label="Halaman berikutnya"><ChevronRight size={18}/></button>
        </div>}
      </div>
    </section>
  );
}
