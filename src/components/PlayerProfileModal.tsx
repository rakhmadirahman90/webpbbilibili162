import React, { useEffect, useMemo, useState } from 'react';
import {
  X, User, Trophy, Medal, Calendar, MapPin, Award, Camera, PlayCircle,
  Newspaper, ExternalLink, Loader2, History, ShieldCheck, ArrowUpRight, Activity,
  ArrowDownRight, Clock
} from 'lucide-react';
import { supabase } from '../supabase';

interface Player {
  id: string;
  pendaftaran_id?: string;
  player_name: string;
  category: string;
  seed: string;
  poin?: number;
  total_points: number;
  bonus?: number;
  photo_url?: string;
  updated_at?: string;
}

interface Props {
  player: Player | null;
  globalRank: number;
  onClose: () => void;
}

type Tab = 'profil' | 'performa' | 'prestasi' | 'foto' | 'video' | 'berita';

type RaporData = { id: string; nama: string; fisik: { stamina:number; kecepatan:number; kekuatan:number; kelincahan:number; kelenturan:number }; teknik: { lob:number; smash:number; netting:number; dropShot:number; backhand:number; service:number }; winLossHistory: { bulan:string; menang:number; kalah:number }[]; updatedAt?:string; };

type GalleryItem = {
  id: string;
  title?: string;
  type: 'image' | 'video';
  url: string;
  description?: string;
  category?: string;
  created_at?: string;
  thumbnail_url?: string;
};

type NewsItem = {
  id: string;
  judul: string;
  ringkasan?: string;
  konten?: string;
  kategori?: string;
  gambar_url?: string;
  tanggal?: string;
};

type MatchItem = {
  id: string;
  kategori_kegiatan?: string;
  hasil?: string;
  keterangan?: string;
  created_at?: string;
};

type AuditItem = {
  id: string;
  created_at: string;
  perubahan: number;
  poin_sebelum: number;
  poin_sesudah: number;
  tipe_kegiatan?: string;
};

const norm = (v = '') => v.toLowerCase().trim();

const containsPlayer = (item: any, name: string) => {
  const n = norm(name);
  return [item?.title, item?.description, item?.category, item?.judul, item?.ringkasan, item?.konten]
    .filter(Boolean)
    .some((v: string) => norm(v).includes(n));
};

const firstUrl = (value?: string) =>
  (value || '').split(/[\s,]+/).map(v => v.trim()).find(v => /^https?:\/\//i.test(v)) || '';

const isYoutube = (url: string) =>
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i.test(url);

const youtubeEmbed = (url: string) => {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/i);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
};

export default function PlayerProfileModal({ player, globalRank, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('profil');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rapor, setRapor] = useState<RaporData | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const name = player?.player_name || '';

  useEffect(() => {
    if (!player) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const pId = player.pendaftaran_id || player.id;
      // Ambil profil berdasarkan ID terlebih dahulu. Jika ID dari sumber ranking tidak cocok,
      // fallback ke nama atlet agar biodata tetap terbaca.
      const profileLookup = async () => {
        const fields = 'id,nama,kategori,kategori_atlet,domisili,foto_url,jenis_kelamin,pengalaman,status,tanggal_registrasi,created_at,nama_panggilan,nama_punggung,tempat_lahir,tanggal_lahir,tahun_bergabung,tangan_dominan,hobi,makanan_favorit,updated_at';
        const byId = await supabase.from('pendaftaran').select(fields).eq('id', pId).maybeSingle();
        if (byId.data) return byId;
        return await supabase.from('pendaftaran').select(fields).ilike('nama', name.trim()).maybeSingle();
      };
      const [profileRes, matchRes, auditRes, galleryRes, newsRes, raporRes, rankingsRes, attendanceRes] = await Promise.allSettled([
        profileLookup(),
        supabase.from('pertandingan').select('id,pendaftaran_id,kategori_kegiatan,hasil,keterangan,created_at').eq('pendaftaran_id', pId).order('created_at', { ascending: false }),
        supabase.from('audit_poin').select('id,created_at,perubahan,poin_sebelum,poin_sesudah,tipe_kegiatan').ilike('atlet_nama', name.trim()).order('created_at', { ascending: false }).limit(12),
        supabase.from('gallery').select('id,title,type,url,description,category,created_at,thumbnail_url').order('created_at', { ascending: false }).limit(100),
        supabase.from('berita').select('id,judul,ringkasan,konten,kategori,gambar_url,tanggal').order('tanggal', { ascending: false }).limit(100),
        import('../utils/siteSettingsHelper').then(({ getSiteSetting }) => getSiteSetting('rapor_atlet_data')),
        supabase.from('rankings').select('*').eq('player_name', name.trim()).maybeSingle(),
        import('../utils/siteSettingsHelper').then(({ getSiteSetting }) => getSiteSetting('absensi_list'))
      ]);

      if (cancelled) return;

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data || null);
        if (profileRes.value.error) console.warn('Profil atlet tidak terbaca:', profileRes.value.error.message);
      }
      if (matchRes.status === 'fulfilled') setMatches(matchRes.value.data || []);
      if (auditRes.status === 'fulfilled') setAudit(auditRes.value.data || []);

      if (galleryRes.status === 'fulfilled') {
        const rows = galleryRes.value.data || [];
        setGallery(rows.filter((row: GalleryItem) => containsPlayer(row, name)));
      }

      if (newsRes.status === 'fulfilled') {
        const rows = newsRes.value.data || [];
        setNews(rows.filter((row: NewsItem) => containsPlayer(row, name)));
      }

      let exactRapor: RaporData | null = null;
      if (raporRes.status === 'fulfilled') {
        const raw = raporRes.value;
        const rows = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
        exactRapor = rows.find((row: any) =>
          String(row?.id || '') === String(player.id || '') ||
          String(row?.id || '') === String(player.pendaftaran_id || '') ||
          norm(row?.nama || '') === norm(name)
        ) || null;
        setRapor(exactRapor);
      }

      const rankingRow = rankingsRes.status === 'fulfilled' ? rankingsRes.value.data : null;
      const rawAttendance = attendanceRes.status === 'fulfilled' ? attendanceRes.value : null;
      const attendanceRows = Array.isArray(rawAttendance)
        ? rawAttendance
        : (Array.isArray(rawAttendance?.items) ? rawAttendance.items : []);
      const playerAttendance = attendanceRows.filter((a: any) =>
        String(a?.user_id || '') === String(player.pendaftaran_id || player.id) ||
        norm(a?.nama || '') === norm(name)
      );
      const attendanceTotal = playerAttendance.length;
      const attendancePresent = playerAttendance.filter((a: any) => norm(a?.status) === 'hadir').length;
      const attendanceRate = attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 100) : null;

      const matchRows = matchRes.status === 'fulfilled' ? (matchRes.value.data || []) : [];
      const wins = matchRows.filter((m: any) => norm(m?.hasil).includes('menang')).length;
      const losses = matchRows.filter((m: any) => norm(m?.hasil).includes('kalah')).length;
      const draws = matchRows.filter((m: any) => norm(m?.hasil).includes('seri') || norm(m?.hasil).includes('imbang')).length;
      const decidedMatches = wins + losses;
      const winRateReal = decidedMatches ? Math.round((wins / decidedMatches) * 100) : 0;
      let streak = 0;
      for (const match of matchRows) {
        if (norm(match?.hasil).includes('menang')) streak++;
        else break;
      }

      const physicalValues = exactRapor ? Object.values(exactRapor.fisik || {}).map(Number).filter(Number.isFinite) : [];
      const technicalValues = exactRapor ? Object.values(exactRapor.teknik || {}).map(Number).filter(Number.isFinite) : [];
      const allRaporValues = [...physicalValues, ...technicalValues];
      const avgRapor = allRaporValues.length ? Math.round(allRaporValues.reduce((a:number,b:number)=>a+b,0) / allRaporValues.length) : null;
      const techniqueAverage = technicalValues.length ? Math.round(technicalValues.reduce((a:number,b:number)=>a+b,0) / technicalValues.length) : null;

      setAnalytics({
        matchesPlayed: matchRows.length,
        wins,
        losses,
        draws,
        winRate: winRateReal,
        attendanceRate,
        stamina: exactRapor?.fisik?.stamina ?? null,
        speed: exactRapor?.fisik?.kecepatan ?? null,
        power: exactRapor?.fisik?.kekuatan ?? null,
        technique: techniqueAverage,
        agility: exactRapor?.fisik?.kelincahan ?? null,
        flexibility: exactRapor?.fisik?.kelenturan ?? null,
        streak,
        poin: Number(rankingRow?.total_points ?? player.total_points ?? 0),
        raporScore: avgRapor,
        radar: {
          stamina: exactRapor?.fisik?.stamina ?? 0,
          speed: exactRapor?.fisik?.kecepatan ?? 0,
          power: exactRapor?.fisik?.kekuatan ?? 0,
          technique: techniqueAverage ?? 0,
          agility: exactRapor?.fisik?.kelincahan ?? 0
        }
      });

      if ([galleryRes, newsRes].some((r: any) => r.status === 'rejected')) {
        setError('Sebagian dokumentasi belum dapat dimuat.');
      }

      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`athlete-profile-realtime-${player.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atlet_stats' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pertandingan' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (!payload?.new?.key || ['rapor_atlet_data', 'absensi_list', 'users_list'].includes(payload.new.key)) load();
      })
      .subscribe();

    const refresh = () => load();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [player, name]);

  useEffect(() => {
    if (player) setTab('profil');
  }, [player]);

  const photos = useMemo(() => gallery.filter(item => item.type === 'image'), [gallery]);
  const videos = useMemo(() => gallery.filter(item => item.type === 'video'), [gallery]);
  const achievementText = profile?.pengalaman || 'Riwayat prestasi dan pertandingan atlet akan tampil di bagian ini.';
  const physicalMetrics = rapor ? [['Stamina', rapor.fisik?.stamina], ['Kecepatan', rapor.fisik?.kecepatan], ['Kekuatan', rapor.fisik?.kekuatan], ['Kelincahan', rapor.fisik?.kelincahan], ['Kelenturan', rapor.fisik?.kelenturan]] : [];
  const technicalMetrics = rapor ? [['Lob', rapor.teknik?.lob], ['Smash', rapor.teknik?.smash], ['Netting', rapor.teknik?.netting], ['Drop Shot', rapor.teknik?.dropShot], ['Backhand', rapor.teknik?.backhand], ['Service', rapor.teknik?.service]] : [];
  const allMetrics = [...physicalMetrics, ...technicalMetrics].map(([,v]) => Number(v)).filter(Number.isFinite);
  const performanceScore = allMetrics.length ? Math.round(allMetrics.reduce((a,b) => a+b, 0) / allMetrics.length) : 0;
  const totalWins = rapor?.winLossHistory?.reduce((s,m) => s + Number(m.menang || 0), 0) || 0;
  const totalLosses = rapor?.winLossHistory?.reduce((s,m) => s + Number(m.kalah || 0), 0) || 0;
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0;
  const displayAnalytics = analytics || { matchesPlayed: totalMatches, wins: totalWins, losses: totalLosses, draws: 0, winRate, attendanceRate: null, stamina: rapor?.fisik?.stamina ?? null, speed: rapor?.fisik?.kecepatan ?? null, power: rapor?.fisik?.kekuatan ?? null, technique: technicalMetrics.length ? Math.round(technicalMetrics.map(([,v]) => Number(v) || 0).reduce((a,b)=>a+b,0) / technicalMetrics.length) : null, agility: rapor?.fisik?.kelincahan ?? null, flexibility: rapor?.fisik?.kelenturan ?? null, streak: 0, poin: Number(player.total_points || 0), raporScore: performanceScore, radar: { stamina: rapor?.fisik?.stamina ?? 0, speed: rapor?.fisik?.kecepatan ?? 0, power: rapor?.fisik?.kekuatan ?? 0, technique: 0, agility: rapor?.fisik?.kelincahan ?? 0 } };

  if (!player) return null;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'profil', label: 'Profil' },
    { id: 'performa', label: 'Performa', count: rapor ? 1 : undefined },
    { id: 'prestasi', label: 'Prestasi', count: matches.length },
    { id: 'foto', label: 'Foto', count: photos.length },
    { id: 'video', label: 'Video', count: videos.length },
    { id: 'berita', label: 'Berita', count: news.length },
  ];

  const navigate = (path: string) => {
    onClose();
    window.location.href = path;
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#050a14]/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4">
      <div className="relative w-full sm:max-w-2xl h-[100dvh] sm:h-[92vh] bg-[#071226] text-white overflow-hidden sm:rounded-[2rem] shadow-2xl border border-blue-500/20 flex flex-col">
        <div className="shrink-0 bg-[#071226]/95 border-b border-white/10">
          <div className="px-4 sm:px-7 pt-5 pb-2 flex items-center justify-between">
            <div className="font-black italic text-xl tracking-tight">
              PB <span className="text-blue-400">BILIBILI</span> 162
            </div>
            <button onClick={onClose} aria-label="Tutup" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 grid place-items-center">
              <X size={20} />
            </button>
          </div>

          <div className="px-2 sm:px-5 overflow-x-auto no-scrollbar">
            <div className="flex min-w-max">
              {tabs.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`px-4 sm:px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                    tab === item.id ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  {item.label}{item.count ? <span className="ml-1.5 text-[10px] text-blue-400">({item.count})</span> : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-5 sm:px-8 pt-7 pb-8">
            {tab !== 'profil' && (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/5 px-4 py-2 text-[10px] font-black tracking-[0.18em] text-blue-400 uppercase">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {player.seed || 'SENIOR'} • PB BILIBILI 162
                </div>
                <h2 className="mt-5 text-3xl sm:text-4xl font-black italic uppercase tracking-tight break-words">{name}</h2>
                <p className="mt-2 text-slate-400 font-medium uppercase tracking-wide">ATLET PB BILIBILI 162</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold">{player.category || 'SENIOR'}</span>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-300">{Number(player.total_points || 0).toLocaleString('id-ID')} PTS</span>
                  {globalRank > 0 && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-300">RANK #{globalRank}</span>}
                </div>
              </>
            )}

            {tab === 'profil' && (
              <div className="mt-7 space-y-5">
                {/* PROFIL ATLET — ringkas, terstruktur, responsif */}
                <div className="space-y-5">
                  <div className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-[#0b2345] via-[#071a33] to-[#06101f] shadow-xl">
                    <div className="absolute -right-16 -top-20 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl" />
                    <div className="relative p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="w-full sm:w-[38%] sm:min-h-[300px] shrink-0 rounded-[1.5rem] overflow-hidden border border-blue-400/15 bg-[#0b1930] shadow-lg">
                          {profile?.foto_url || player.photo_url ? (
                            <img
                              src={profile?.foto_url || player.photo_url}
                              alt={profile?.nama || name}
                              className="w-full h-[280px] sm:h-[320px] object-contain bg-white"
                            />
                          ) : (
                            <div className="h-[280px] sm:h-[320px] grid place-items-center text-slate-600">
                              <User size={64} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300">
                              Profil Atlet
                            </span>
                            {profile?.status && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                                {profile.status}
                              </span>
                            )}
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight break-words">
                            {profile?.nama || name}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            {profile?.kategori_atlet || profile?.kategori || player.category || 'Atlet PB BILIBILI 162'}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-bold text-slate-300">
                              <MapPin size={13} className="text-blue-400" />
                              {profile?.domisili || 'Domisili belum diisi'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[10px] font-bold text-slate-300">
                              <Trophy size={13} className="text-amber-400" />
                              {Number(player.total_points || 0).toLocaleString('id-ID')} PTS
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          ['Sektor', profile?.kategori || player.category || '—'],
                          ['Tangan', profile?.tangan_dominan || '—'],
                          ['Gabung', profile?.tahun_bergabung || '—'],
                          ['Peringkat', globalRank > 0 ? '#' + globalRank : '—']
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                            <p className="mt-1 text-sm font-black text-white truncate">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                    <section className="rounded-[1.75rem] border border-blue-500/25 bg-[#061a35] overflow-hidden shadow-lg">
                      <div className="px-5 py-4 bg-gradient-to-r from-blue-600/15 to-transparent border-b border-blue-500/15 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center text-white shadow-lg shadow-blue-900/30">
                          <User size={19} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-black text-white">Biodata Atlet</p>
                          <p className="text-[9px] uppercase tracking-widest text-blue-300 mt-0.5">Identitas & keanggotaan</p>
                        </div>
                      </div>
                      <div className="px-4 sm:px-5 py-2">
                        {[
                          ['Nama Lengkap', profile?.nama || name, User],
                          ['Nama Panggilan', profile?.nama_panggilan, User],
                          ['Jenis Kelamin', profile?.jenis_kelamin, User],
                          ['Tempat, Tgl. Lahir', [profile?.tempat_lahir, profile?.tanggal_lahir ? new Date(profile.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''].filter(Boolean).join(', '), Calendar],
                          ['Domisili', profile?.domisili, MapPin],
                          ['Kategori / Sektor', profile?.kategori || player.category, User],
                          ['Kategori Atlet', profile?.kategori_atlet || player.category, Trophy],
                          ['Status', profile?.status, ShieldCheck],
                        ].map(([label, value, Icon]) => (
                          <div key={String(label)} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 items-center py-3.5 border-b border-blue-500/10 last:border-b-0">
                            <Icon size={17} className="text-slate-300" />
                            <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,1.35fr)] gap-2 sm:gap-4 items-center min-w-0">
                              <p className="text-xs sm:text-sm text-slate-300 leading-5">{label}</p>
                              <p className="text-xs sm:text-sm font-bold text-white leading-5 break-words">
                                {value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : 'Belum diisi'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[1.75rem] border border-blue-500/25 bg-[#061a35] overflow-hidden shadow-lg">
                      <div className="px-5 py-4 bg-gradient-to-r from-blue-600/15 to-transparent border-b border-blue-500/15 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center text-white shadow-lg shadow-blue-900/30">
                          <Activity size={19} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-black text-white">Data Profil Atlet</p>
                          <p className="text-[9px] uppercase tracking-widest text-blue-300 mt-0.5">Informasi profil & preferensi</p>
                        </div>
                      </div>
                      <div className="px-4 sm:px-5 py-2">
                        {[
                          ['Nama Punggung', profile?.nama_punggung, User],
                          ['Tahun Bergabung', profile?.tahun_bergabung, Calendar],
                          ['Tangan Dominan', profile?.tangan_dominan, User],
                          ['Hobi', profile?.hobi, Activity],
                          ['Makanan Favorit', profile?.makanan_favorit, Activity],
                          ['Tanggal Registrasi', profile?.tanggal_registrasi ? new Date(profile.tanggal_registrasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '', Calendar],
                          ['Terakhir Diupdate', profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''), Clock],
                        ].map(([label, value, Icon]) => (
                          <div key={String(label)} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 items-center py-3.5 border-b border-blue-500/10 last:border-b-0">
                            <Icon size={17} className="text-slate-300" />
                            <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,1.35fr)] gap-2 sm:gap-4 items-center min-w-0">
                              <p className="text-xs sm:text-sm text-slate-300 leading-5">{label}</p>
                              <p className="text-xs sm:text-sm font-bold text-white leading-5 break-words">
                                {value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : 'Belum diisi'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-white/[0.035] to-blue-500/[0.035] overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-300">
                        <History size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Ringkasan Keanggotaan</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Informasi registrasi dan pengalaman atlet</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="rounded-2xl bg-slate-950/40 border border-white/5 p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pengalaman</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          {profile?.pengalaman || 'Belum diisi pada database.'}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-300">
                          <ShieldCheck size={12} /> Data terintegrasi
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          <Clock size={12} /> Diperbarui real-time
                        </span>
                      </div>
                    </div>
                  </section>
                </div>

              </div>
            )}

            {tab === 'performa' && (
              <div className="mt-7 space-y-5">
                <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/5 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Analisis Performa & Statistik Atlet</p><p className="text-sm text-slate-300 mt-1">Ringkasan individual dari modul analitik admin dan Rapor Atlet.</p></div>
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/25 grid place-items-center"><div className="text-center"><p className="text-2xl font-black text-blue-300">{displayAnalytics.raporScore || 0}</p><p className="text-[7px] font-black uppercase text-slate-500">Rapor</p></div></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ['Pertandingan', displayAnalytics.matchesPlayed, 'text-blue-300'],
                    ['Win Rate', displayAnalytics.winRate + '%', 'text-emerald-400'],
                    ['Kehadiran', displayAnalytics.attendanceRate === null ? '—' : displayAnalytics.attendanceRate + '%', 'text-indigo-300'],
                    ['Streak', displayAnalytics.streak + ' Win', 'text-amber-400']
                  ].map(([label,value,cls]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center"><p className={'text-xl font-black '+String(cls)}>{String(value)}</p><p className="text-[8px] uppercase tracking-widest text-slate-500 font-black mt-1">{String(label)}</p></div>)}
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between mb-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Metrik Analisis</p><span className="text-[9px] font-black text-blue-400">{Number(displayAnalytics.poin || 0).toLocaleString('id-ID')} PTS</span></div>
                  <div className="space-y-3">
                    {[['Stamina',displayAnalytics.radar.stamina],['Kecepatan',displayAnalytics.radar.speed],['Kekuatan',displayAnalytics.radar.power],['Teknik',displayAnalytics.radar.technique],['Kelincahan',displayAnalytics.radar.agility]].map(([label,value]) => <div key={String(label)}><div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">{String(label)}</span><span className="text-slate-200">{Number(value)||0}</span></div><div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{width:Math.max(0,Math.min(100,Number(value)||0))+'%'}}/></div></div>)}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">Rapor Fisik Lengkap</p>
                  <div className="grid grid-cols-2 gap-3">{physicalMetrics.map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-slate-950/60 border border-white/5 p-3"><div className="flex justify-between text-[9px] font-black uppercase"><span className="text-slate-500">{String(label)}</span><span className="text-blue-300">{Number(value)||0}</span></div></div>)}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">Rapor Teknik Lengkap</p>
                  <div className="grid grid-cols-2 gap-3">{technicalMetrics.map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-slate-950/60 border border-white/5 p-3"><div className="flex justify-between text-[9px] font-black uppercase"><span className="text-slate-500">{String(label)}</span><span className="text-amber-300">{Number(value)||0}</span></div></div>)}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">Tren Menang / Kalah</p>
                  <div className="space-y-2">{(rapor?.winLossHistory || []).map(m => <div key={m.bulan} className="flex items-center gap-3"><span className="w-9 text-[9px] font-black uppercase text-slate-500">{m.bulan}</span><div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width:Math.min(100,Number(m.menang||0)*10)+'%'}}/></div><span className="text-[9px] font-black text-emerald-400">{m.menang}W</span><span className="text-[9px] font-black text-red-400">{m.kalah}L</span></div>)}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">Statistik Tambahan</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-950/60 border border-white/5 p-3"><p className="text-[8px] uppercase text-slate-500 font-black">Poin Klasemen</p><p className="text-lg font-black text-white mt-1">{Number(displayAnalytics.poin||0).toLocaleString('id-ID')} PTS</p></div>
                    <div className="rounded-2xl bg-slate-950/60 border border-white/5 p-3"><p className="text-[8px] uppercase text-slate-500 font-black">Total Aktivitas Poin</p><p className="text-lg font-black text-white mt-1">{audit.length}</p></div>
                  </div>
                </div>

                {rapor?.updatedAt && <p className="text-[9px] text-slate-500 text-right">Rapor diperbarui: {new Date(rapor.updatedAt).toLocaleDateString('id-ID')}</p>}
              </div>
            )}

            {tab === 'prestasi' && (
              <div className="mt-7 space-y-5">
                <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-300"><Trophy size={22} /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Prestasi & Rekam Pertandingan</p>
                      <p className="text-sm text-slate-300 mt-1">{achievementText}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-center"><Award className="mx-auto text-blue-400" size={19}/><p className="text-lg font-black mt-2">{matches.length}</p><p className="text-[8px] uppercase text-slate-500 font-black">Pertandingan</p></div>
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-center"><Trophy className="mx-auto text-amber-400" size={19}/><p className="text-lg font-black mt-2">{audit.filter(x => x.perubahan > 0).length}</p><p className="text-[8px] uppercase text-slate-500 font-black">Perolehan Poin</p></div>
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-center"><History className="mx-auto text-emerald-400" size={19}/><p className="text-lg font-black mt-2">{audit.length}</p><p className="text-[8px] uppercase text-slate-500 font-black">Aktivitas</p></div>
                </div>

                {matches.length > 0 ? matches.map(match => (
                  <div key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-200">{match.kategori_kegiatan || 'Pertandingan'}</p>
                        <p className="text-sm font-bold text-blue-300 mt-1">{match.hasil || 'Hasil belum dicatat'}</p>
                        {match.keterangan && <p className="text-xs leading-5 text-slate-400 mt-2">{match.keterangan}</p>}
                      </div>
                      <Calendar size={16} className="text-slate-500 shrink-0" />
                    </div>
                    {match.created_at && <p className="text-[9px] text-slate-500 mt-3">{new Date(match.created_at).toLocaleDateString('id-ID')}</p>}
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Belum ada rekam pertandingan.</div>
                )}

                {audit.length > 0 && (
                  <div className="space-y-2">
                    {audit.slice(0, 6).map(log => {
                      const gain = Number(log.perubahan) > 0;
                      return <div key={log.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {gain ? <ArrowUpRight size={17} className="text-emerald-400"/> : <ArrowDownRight size={17} className="text-red-400"/>}
                          <div className="min-w-0"><p className="text-xs font-bold truncate">{log.tipe_kegiatan || 'Aktivitas'}</p><p className="text-[9px] text-slate-500">{new Date(log.created_at).toLocaleDateString('id-ID')}</p></div>
                        </div>
                        <span className={`text-xs font-black ${gain ? 'text-emerald-400' : 'text-red-400'}`}>{gain ? '+' : ''}{log.perubahan}</span>
                      </div>;
                    })}
                  </div>
                )}
              </div>
            )}

            {(tab === 'foto' || tab === 'video') && (
              <div className="mt-7">
                {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-400" /></div> :
                  (tab === 'foto' ? photos : videos).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {(tab === 'foto' ? photos : videos).map(item => {
                        const url = item.url?.split(/[\s,]+/).find(Boolean) || '';
                        return <button key={item.id} onClick={() => navigate(`/galeri?gallery=${encodeURIComponent(item.id)}`)} className="text-left rounded-2xl overflow-hidden border border-white/10 bg-white/[0.035] hover:border-blue-500/40 transition-all">
                          <div className="aspect-square bg-black relative overflow-hidden">
                            {tab === 'foto' ? <img src={url} alt={item.title || name} className="w-full h-full object-cover" loading="lazy"/> :
                              item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title || name} className="w-full h-full object-cover"/> :
                              <div className="w-full h-full grid place-items-center text-blue-400"><PlayCircle size={48}/></div>}
                            {tab === 'video' && <span className="absolute inset-0 grid place-items-center text-white"><PlayCircle size={44}/></span>}
                          </div>
                          <div className="p-3"><p className="text-xs font-black uppercase line-clamp-2">{item.title || 'Dokumentasi Atlet'}</p><p className="text-[9px] text-slate-500 mt-1">{item.category || 'DOKUMENTASI'}</p></div>
                        </button>;
                      })}
                    </div>
                  ) : (
                    <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl">
                      <Camera className="mx-auto text-slate-600" size={36}/>
                      <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">Belum ada {tab === 'foto' ? 'foto' : 'video'} terkait atlet</p>
                      <p className="mt-2 text-[10px] text-slate-600">Dokumentasi dapat ditautkan melalui menu Galeri yang sudah tersedia.</p>
                    </div>
                  )}
              </div>
            )}

            {tab === 'berita' && (
              <div className="mt-7 space-y-3">
                {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-400" /></div> :
                  news.length > 0 ? news.map(item => (
                    <button key={item.id} onClick={() => navigate(`/berita?newsId=${encodeURIComponent(item.id)}`)} className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.035] p-3 flex gap-3 hover:border-blue-500/40 transition-all">
                      {firstUrl(item.gambar_url) ? <img src={firstUrl(item.gambar_url)} alt="" className="w-24 h-20 rounded-xl object-cover shrink-0"/> : <div className="w-24 h-20 rounded-xl bg-blue-500/10 grid place-items-center text-blue-400 shrink-0"><Newspaper size={25}/></div>}
                      <div className="min-w-0"><span className="text-[8px] font-black uppercase tracking-widest text-blue-400">{item.kategori || 'BERITA'}</span><p className="text-sm font-black uppercase leading-5 mt-1 line-clamp-2">{item.judul}</p><p className="text-[10px] text-slate-500 mt-1">{item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : ''}</p></div>
                    </button>
                  )) : (
                    <div className="py-16 text-center border border-dashed border-white/10 rounded-3xl">
                      <Newspaper className="mx-auto text-slate-600" size={36}/>
                      <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">Belum ada berita terkait atlet</p>
                      <p className="mt-2 text-[10px] text-slate-600">Berita akan terhubung otomatis berdasarkan nama atlet.</p>
                    </div>
                  )}
              </div>
            )}

            {error && <p className="mt-4 text-[10px] text-amber-400">{error}</p>}

            <div className="mt-8 pt-5 border-t border-white/10 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
              <span className="inline-flex items-center gap-1"><ShieldCheck size={12}/> Data terintegrasi</span>
              <span className="inline-flex items-center gap-1"><MapPin size={12}/> PB Bilibili 162</span>
              <span className="inline-flex items-center gap-1"><Clock size={12}/> Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
