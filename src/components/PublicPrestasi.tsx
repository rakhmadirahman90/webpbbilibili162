import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, ChevronLeft, ChevronRight, Crown, CalendarDays, MapPin } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting } from '../utils/siteSettingsHelper';

const PAGE_SIZE = 6;
const TOURNAMENT_ID = 2;
const PHOTO_BUCKET = 'turnamen-dokumen';

const normalizeName = (value: string = '') =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const BILIBILI_162_CUP_RESULTS = [
  {
    id: 'bilibili-162-cup-cc-local',
    category: 'Ganda Putra CC — Lokal Parepare',
    results: [
      { rank: 'JUARA I', players: 'Tison & Kambo', aliases: [['TISON', 'KAMBO']], club: 'PB Sari Indah', icon: Trophy },
      { rank: 'JUARA II', players: 'Muslim & Sam', aliases: [['MUSLIM', 'SAM']], club: 'Rajawali 42', icon: Medal },
      { rank: 'JUARA III BERSAMA', players: 'Denis & Yusuf', aliases: [['DENIS', 'YUSUF']], club: 'PB Bilibili 162', icon: Medal },
      { rank: 'JUARA III BERSAMA', players: 'Ome & Ardi', aliases: [['OME', 'ARDI']], club: 'Rajawali 42', icon: Medal },
    ],
  },
  {
    id: 'bilibili-162-cup-ajatappareng',
    category: 'Ganda Putra AD/BC-/C+C — Ajatappareng',
    results: [
      {
        rank: 'JUARA I',
        players: 'Andi M. Fahrul & Ichal Bin Tura (Ayah E)',
        aliases: [['ANDIMFAHRUL', 'ICHALBINTURA']],
        club: 'PB Bulu Putih',
        icon: Trophy,
      },
      {
        rank: 'JUARA II',
        players: 'Ahmad Halim & Gusmulyadi',
        aliases: [['AHMADHALIM', 'GUSMULYADI']],
        club: 'PB Barokah',
        icon: Medal,
      },
      {
        rank: 'JUARA III BERSAMA',
        players: 'Nugi & Saldi',
        aliases: [['NUGI', 'SALDI']],
        club: 'THE GADE',
        icon: Medal,
      },
      {
        rank: 'JUARA III BERSAMA',
        players: 'Haykal & Restu',
        aliases: [['HAYKAL', 'RESTU']],
        club: 'PB ROVIDA',
        icon: Medal,
      },
    ],
  },
];

function pairMatches(row: any, aliases: string[][] = []) {
  const a = normalizeName(row?.nama_pemain_1);
  const b = normalizeName(row?.nama_pemain_2);
  return aliases.some(([first, second]) => {
    const f = normalizeName(first);
    const s = normalizeName(second);
    return (a.includes(f) && b.includes(s)) || (a.includes(s) && b.includes(f));
  });
}

function getPhotoPath(row: any, player: 1 | 2) {
  return row?.[`foto_pemain_${player}_url`] || row?.[`foto_pemain_${player}`] || '';
}

export default function PublicPrestasi() {
  const [prestasi, setPrestasi] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [acceptedParticipants, setAcceptedParticipants] = useState<any[]>([]);
  const [signedPhotos, setSignedPhotos] = useState<Record<string, string>>({});

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
          { id:'p5', nama_kejuaraan:'O2SN Tingkat SMA se-Sulsel', tingkat:'Provinsi', tahun:2023, medali_emas:2, medali_perak:1, medali_perunggu:0, atlet_berprestasi:'Hadi (Emas), Indah (Emas)'}
        ]);
      }
    };
    fetchPrestasi();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAcceptedParticipants = async () => {
      const { data, error } = await supabase
        .from('pendaftaran_turnamen')
        .select('id,tournament_id,status_pendaftaran,nama_pemain_1,nama_pemain_2,asal_pb,foto_pemain_1_url,foto_pemain_2_url,foto_pemain_1,foto_pemain_2')
        .eq('tournament_id', TOURNAMENT_ID)
        .eq('status_pendaftaran', 'Diterima');

      if (cancelled || error) return;
      setAcceptedParticipants(data || []);

      const paths = Array.from(new Set((data || []).flatMap(row => [getPhotoPath(row, 1), getPhotoPath(row, 2)]).filter(Boolean)));
      if (!paths.length) return;

      const { data: signed, error: signedError } = await supabase
        .storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(paths, 60 * 60);

      if (cancelled || signedError || !signed) return;
      const next: Record<string, string> = {};
      signed.forEach((item: any, index: number) => {
        if (item?.signedUrl) next[paths[index]] = item.signedUrl;
      });
      setSignedPhotos(next);
    };

    fetchAcceptedParticipants();
    return () => { cancelled = true; };
  }, []);

  const championEvents = useMemo(() => BILIBILI_162_CUP_RESULTS.map(event => ({
    ...event,
    results: event.results.map(result => {
      const row = acceptedParticipants.find(candidate => pairMatches(candidate, result.aliases));
      const photo1Path = row ? getPhotoPath(row, 1) : '';
      const photo2Path = row ? getPhotoPath(row, 2) : '';
      return {
        ...result,
        sourceRowId: row?.id,
        sourceNames: row ? `${row.nama_pemain_1} & ${row.nama_pemain_2}` : '',
        photo1: signedPhotos[photo1Path] || '',
        photo2: signedPhotos[photo2Path] || '',
      };
    }),
  })), [acceptedParticipants, signedPhotos]);

  const totalPages = Math.max(1, Math.ceil(prestasi.length / PAGE_SIZE));
  const current = useMemo(() => prestasi.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [prestasi, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section id="prestasi" className="py-20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-12">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-4"><Star size={14}/> Prestasi</motion.div>
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-3xl md:text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">Apresiasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">Juara</span></motion.h2>
          <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-sm sm:text-base text-slate-400 leading-relaxed">Daftar juara BILIBILI 162 CUP I Tahun 2026 terintegrasi dengan data peserta diterima. Foto ditampilkan dari berkas pasangan yang diunggah saat pendaftaran.</motion.p>
        </div>

        <div className="mb-10 md:mb-12">
          <div className="text-center mb-5 md:mb-7">
            <div className="inline-flex items-center gap-2 text-yellow-400 mb-2 max-w-full"><Crown size={19} className="shrink-0"/><span className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight leading-tight">Juara BILIBILI 162 CUP I Tahun 2026</span></div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] sm:text-xs text-slate-400 mt-2">
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-yellow-400"/>08–12 September 2026</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-yellow-400"/>GOR Titik Kumpul Soreang, Parepare</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-7">
            {championEvents.map((event, index) => (
              <motion.article key={event.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 md:p-6 shadow-2xl ${event.id.includes('ajatappareng') ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-black/60 to-amber-500/5' : 'border-blue-500/30 bg-gradient-to-br from-blue-600/10 via-black/60 to-cyan-500/5'}`}>
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex items-start sm:items-center justify-between gap-3 mb-5">
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-[0.22em] text-yellow-400 mb-1">BILIBILI 162 CUP I TAHUN 2026</div>
                    <h4 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-tight">{event.category}</h4>
                  </div>
                  <Trophy size={28} className="text-yellow-400 shrink-0 mt-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {event.results.map((result, resultIndex) => {
                    const Icon = result.icon;
                    const hasPhotos = Boolean(result.photo1 || result.photo2);
                    return (
                      <div key={`${event.id}-${result.rank}-${result.players}-${resultIndex}`} className={`rounded-2xl border overflow-hidden bg-black/45 shadow-lg ${result.rank === 'JUARA I' ? 'border-yellow-500/50' : result.rank === 'JUARA II' ? 'border-sky-400/30' : 'border-orange-500/30'}`}>
                        <div className="px-3 pt-3 pb-1 text-center min-h-[34px] flex items-center justify-center">
                          <div className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-yellow-400 leading-tight"><Icon size={13} className="shrink-0"/>{result.rank}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2 sm:p-2.5">
                          {[result.photo1, result.photo2].map((photo, photoIndex) => (
                            <div key={photoIndex} className="relative aspect-[4/5] sm:aspect-[3/4] rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center shadow-inner">
                              {photo ? (
                                <img
                                  src={photo}
                                  alt={`${result.players} - pemain ${photoIndex + 1}`}
                                  className="w-full h-full object-contain object-top bg-slate-950"
                                  loading="lazy"
                                  decoding="async"
                                  draggable={false}
                                />
                              ) : (
                                <div className="text-center px-1">
                                  <div className="text-2xl opacity-50">🏸</div>
                                  <div className="text-[8px] text-slate-500 mt-1">{hasPhotos ? 'Foto tidak tersedia' : 'Memuat foto...'}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="px-3 pb-4 text-center min-h-[82px] flex flex-col justify-start">
                          <div className="text-sm sm:text-base font-black text-white leading-tight break-words">{result.players}</div>
                          <div className="mt-1 text-[10px] text-slate-300 leading-snug">{result.club}</div>
                          {result.sourceRowId && <div className="mt-2 text-[8px] uppercase tracking-wider text-emerald-400">✓ Data peserta diterima</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="relative z-10 mt-4 md:mt-5 pt-3 md:pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-slate-400 leading-relaxed">
                  <Medal size={15} className="text-yellow-400 shrink-0" />
                  <span>Foto & identitas pasangan disinkronkan dari data pendaftaran peserta diterima.</span>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {current.map((item, index) => (
            <motion.div key={item.id ?? `${item.nama_kejuaraan}-${index}`} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.05}} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl p-5 sm:p-6 relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
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
