import { motion, AnimatePresence } from "framer-motion";
import { X, User, Trophy, Instagram, Music2, CalendarDays, MapPin, Hand, Utensils, Heart, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import LazyImage from "./LazyImage";

const pick = (obj: any, keys: string[], fallback = "-") => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
};

export const PlayerDetailModal = ({ player, processedPlayers, onClose }: any) => {
  const [activeTab, setActiveTab] = useState<'profil' | 'stats'>('profil');

  useEffect(() => {
    setActiveTab('profil');
  }, [player]);

  const rank = Math.max(1, processedPlayers.findIndex((x: any) => x.id === player?.id) + 1);
  const info = player?.pendaftaran || {};

  const profile = useMemo(() => ({
    nickname: pick(info, ['nama_panggilan', 'nama_panggilan_atlet', 'panggilan'], player?.name?.split(" ")[0] || "-"),
    backName: pick(info, ['nama_punggung', 'nomor_punggung', 'nama_jersey']),
    birth: pick(info, ['tempat_tgl_lahir', 'tempat_tanggal_lahir', 'ttl', 'tanggal_lahir']),
    sector: pick(info, ['sektor', 'sektor_utama', 'jenis_kelamin'], player?.ageGroup === 'Muda' ? 'Atlet Muda' : 'Tunggal Putra'),
    joined: pick(info, ['tahun_bergabung', 'tahun_masuk', 'bergabung']),
    hand: pick(info, ['tangan', 'tangan_dominan', 'dominant_hand']),
    hobby: pick(info, ['hobi', 'hobby']),
    food: pick(info, ['makanan_favorit', 'makanan_favorite', 'favorite_food']),
    instagram: pick(info, ['instagram', 'instagram_url', 'ig'], ''),
    tiktok: pick(info, ['tiktok', 'tiktok_url'], ''),
  }), [info, player]);

  if (!player) return null;

  const goToPlayer = (direction: number) => {
    const index = processedPlayers.findIndex((x: any) => x.id === player.id);
    if (index < 0 || !processedPlayers.length) return;
    const next = (index + direction + processedPlayers.length) % processedPlayers.length;
    // Keep navigation inside the modal without exposing stale browser data.
    window.dispatchEvent(new CustomEvent('pb-player-navigate', { detail: processedPlayers[next] }));
  };

  const openSocial = (url: string) => {
    if (!url || url === "-") return;
    const normalized = url.startsWith("http") ? url : `https://${url.replace(/^@/, "")}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  const statItems = [
    ['Total Poin', Number(player.displayPoints || 0).toLocaleString(), 'PTS'],
    ['Peringkat Klub', `#${rank}`, ''],
    ['Seed', player.displaySeed || 'UNSEEDED', ''],
    ['Status', player.status || 'Active', ''],
  ];

  const fields = [
    [User, "Nama Panggilan", profile.nickname],
    [Award, "Nama Punggung", profile.backName],
    [MapPin, "Tempat/Tgl.Lahir", profile.birth],
    [Trophy, "Sektor", profile.sector],
    [CalendarDays, "Tahun Bergabung", profile.joined],
    [Hand, "Tangan", profile.hand],
    [Heart, "Hobi", profile.hobby],
    [Utensils, "Makanan Favorit", profile.food],
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110000] bg-black/90 backdrop-blur-sm overflow-y-auto"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ duration: 0.3 }}
          className="min-h-[100dvh] w-full bg-[#050505] text-white overflow-hidden"
        >
          {/* Header */}
          <header className="sticky top-0 z-50 h-16 sm:h-20 bg-[#b90000]/95 backdrop-blur-md border-b border-red-400/20 flex items-center justify-between px-4 sm:px-8">
            <div className="font-black tracking-tight text-xl sm:text-3xl italic">PB <span className="text-white">BILIBILI 162</span></div>
            <div className="flex items-center gap-2">
              <button onClick={() => goToPlayer(-1)} className="hidden sm:flex w-10 h-10 rounded-full border border-white/20 items-center justify-center hover:bg-white/15 transition" aria-label="Atlet sebelumnya"><ChevronLeft size={20}/></button>
              <button onClick={() => goToPlayer(1)} className="hidden sm:flex w-10 h-10 rounded-full border border-white/20 items-center justify-center hover:bg-white/15 transition" aria-label="Atlet berikutnya"><ChevronRight size={20}/></button>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/30 border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition" aria-label="Tutup profil"><X size={21}/></button>
            </div>
          </header>

          {/* Profile navigation */}
          <nav className="bg-[#080808] border-b border-white/10 px-4 sm:px-10">
            <div className="max-w-7xl mx-auto flex gap-7 sm:gap-12 overflow-x-auto no-scrollbar">
              {[
                ['profil', 'Profil'],
                ['stats', 'Statistik'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id as 'profil' | 'stats')} className={`relative py-4 sm:py-5 text-sm sm:text-base font-bold whitespace-nowrap transition-colors ${activeTab === id ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'}`}>
                  {label}
                  {activeTab === id && <span className="absolute left-0 right-0 bottom-0 h-1 bg-red-600 rounded-full" />}
                </button>
              ))}
            </div>
          </nav>

          {activeTab === 'profil' ? (
            <>
              {/* Hero */}
              <section className="relative min-h-[510px] sm:min-h-[620px] lg:min-h-[700px] overflow-hidden bg-[radial-gradient(circle_at_70%_35%,rgba(185,0,0,.28),transparent_34%),linear-gradient(120deg,#111,#050505_62%,#151515)]">
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(135deg,transparent_35%,rgba(220,0,0,.35)_36%,transparent_38%,transparent_60%,rgba(255,255,255,.06)_61%,transparent_63%)]" />
                <div className="absolute -right-24 top-20 w-[420px] h-[420px] rounded-full border border-red-600/20 blur-[1px]" />
                <div className="absolute left-6 sm:left-10 bottom-10 text-[70px] sm:text-[130px] font-black italic text-white/[0.025] leading-none select-none">PB 162</div>

                <div className="relative max-w-7xl mx-auto min-h-[510px] sm:min-h-[620px] lg:min-h-[700px] px-6 sm:px-10 flex items-center">
                  <div className="relative z-20 w-full lg:w-1/2 pt-10 lg:pt-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/10 border border-red-600/30 text-red-400 text-[10px] font-black uppercase tracking-[0.22em] mb-5">
                      {player.ageGroup || 'Atlet'} • PB Bilibili 162
                    </div>
                    <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter leading-[.88]">{player.name}</h1>
                    <p className="mt-5 text-base sm:text-2xl text-zinc-300 uppercase tracking-[0.12em] max-w-xl">{profile.backName !== '-' ? profile.backName : 'Atlet PB Bilibili 162'}</p>
                    <div className="mt-8 flex flex-wrap gap-2">
                      <span className="px-4 py-2 rounded-full bg-white/8 border border-white/10 text-xs font-bold">{profile.sector}</span>
                      <span className="px-4 py-2 rounded-full bg-red-600/15 border border-red-600/30 text-red-300 text-xs font-bold">{Number(player.displayPoints || 0).toLocaleString()} PTS</span>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 lg:left-[44%] lg:right-0 h-[72%] sm:h-[82%] lg:h-full flex items-end justify-center lg:justify-end">
                    {player.img ? (
                      <LazyImage src={player.img} className="w-auto h-full max-w-[94%] lg:max-w-none object-contain object-bottom drop-shadow-[0_25px_45px_rgba(0,0,0,.75)]" alt={player.name} containerClassName="h-full w-full flex items-end justify-center lg:justify-end" width={700} />
                    ) : (
                      <div className="w-64 h-80 flex items-center justify-center text-zinc-700"><User size={100}/></div>
                    )}
                  </div>
                </div>
              </section>

              {/* Details */}
              <section className="bg-[#060606] border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
                  <div className="grid lg:grid-cols-[1fr_320px] gap-10 lg:gap-16">
                    <div className="relative pl-5 sm:pl-7 border-l-4 border-red-600">
                      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-7">
                        {fields.map(([Icon, label, value]: any) => (
                          <div key={label} className="group">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm font-bold mb-1">
                              <Icon size={15} className="text-red-500"/>
                              <span>{label}</span>
                            </div>
                            <p className="text-base sm:text-lg text-white font-medium break-words">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <aside className="flex flex-col justify-between gap-8">
                      <div className="grid grid-cols-2 gap-2">
                        {statItems.map(([label, value, suffix]) => (
                          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">{label}</p>
                            <p className="mt-1 text-sm font-black text-white">{value} <span className="text-red-400">{suffix}</span></p>
                          </div>
                        ))}
                      </div>

                      {(profile.instagram || profile.tiktok) && (
                        <div className="flex gap-3">
                          {profile.instagram && <button onClick={() => openSocial(profile.instagram)} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition"><Instagram size={20}/></button>}
                          {profile.tiktok && <button onClick={() => openSocial(profile.tiktok)} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition"><Music2 size={20}/></button>}
                        </div>
                      )}
                      <div className="text-zinc-500 italic text-sm">"Disiplin hari ini, prestasi esok hari."</div>
                    </aside>
                  </div>
                </div>
              </section>

              {/* Footer teaser */}
              <section className="border-t border-white/5 bg-[#090909] px-6 sm:px-10 py-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-red-500 font-black">PB Bilibili 162</p>
                    <h3 className="text-xl sm:text-2xl font-black">Profil Atlet</h3>
                  </div>
                  <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 transition text-xs font-black uppercase">Kembali ke Daftar Atlet</button>
                </div>
              </section>
            </>
          ) : (
            <section className="min-h-[70dvh] bg-[#070707] px-6 sm:px-10 py-12">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-8">
                  <div><p className="text-red-500 text-[10px] font-black uppercase tracking-[.25em]">Performance</p><h2 className="text-3xl sm:text-5xl font-black italic uppercase">Statistik Atlet</h2></div>
                  <Trophy className="text-red-500" size={34}/>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statItems.map(([label, value, suffix]) => (
                    <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">{label}</p>
                      <p className="mt-3 text-2xl sm:text-4xl font-black">{value}</p>
                      {suffix && <p className="text-red-400 text-xs font-black mt-1">{suffix}</p>}
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-3xl border border-red-600/20 bg-red-600/[0.04] p-6">
                  <p className="text-zinc-400 text-sm leading-relaxed">{player.bio}</p>
                </div>
              </div>
            </section>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
