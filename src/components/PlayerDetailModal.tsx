import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Trophy, Instagram, Music2, CalendarDays, MapPin, Hand,
  Utensils, Heart, Award, ChevronLeft, ChevronRight, Shield, Medal
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"profil" | "stats">("profil");

  useEffect(() => {
    setActiveTab("profil");
  }, [player]);

  const rankIndex = processedPlayers.findIndex((x: any) => x.id === player?.id);
  const rank = rankIndex >= 0 ? rankIndex + 1 : "-";
  const info = player?.pendaftaran || {};

  const profile = useMemo(() => ({
    nickname: pick(info, ["nama_panggilan", "nama_panggilan_atlet", "panggilan"], player?.name?.split(" ")[0] || "-"),
    backName: pick(info, ["nama_punggung", "nomor_punggung", "nama_jersey"]),
    birth: pick(info, ["tempat_tgl_lahir", "tempat_tanggal_lahir", "ttl", "tanggal_lahir"]),
    sector: pick(info, ["sektor", "sektor_utama"], player?.ageGroup === "Muda" ? "Atlet Muda" : "Tunggal Putra"),
    joined: pick(info, ["tahun_bergabung", "tahun_masuk", "bergabung"]),
    hand: pick(info, ["tangan", "tangan_dominan", "dominant_hand"]),
    hobby: pick(info, ["hobi", "hobby"]),
    food: pick(info, ["makanan_favorit", "makanan_favorite", "favorite_food"]),
    instagram: pick(info, ["instagram", "instagram_url", "ig"], ""),
    tiktok: pick(info, ["tiktok", "tiktok_url"], ""),
  }), [info, player]);

  if (!player) return null;

  const goToPlayer = (direction: number) => {
    const index = processedPlayers.findIndex((x: any) => x.id === player.id);
    if (index < 0 || !processedPlayers.length) return;
    const next = (index + direction + processedPlayers.length) % processedPlayers.length;
    window.dispatchEvent(new CustomEvent("pb-player-navigate", { detail: processedPlayers[next] }));
  };

  const openSocial = (url: string) => {
    if (!url || url === "-") return;
    const normalized = url.startsWith("http") ? url : `https://${url.replace(/^@/, "")}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  const points = Number(player.displayPoints || 0).toLocaleString();
  const statItems = [
    ["Total Poin", points, "PTS", Trophy],
    ["Peringkat", rank === "-" ? "-" : `#${rank}`, "", Medal],
    ["Seed", player.displaySeed || "UNSEEDED", "", Shield],
    ["Status", player.status || "Active", "", User],
  ];

  const fields = [
    [User, "Nama Panggilan", profile.nickname],
    [Award, "Nama Punggung", profile.backName],
    [MapPin, "Tempat/Tgl. Lahir", profile.birth],
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
        className="fixed inset-0 z-[110000] bg-[#02050b]/90 backdrop-blur-md overflow-y-auto overscroll-contain"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="min-h-[100dvh] w-full bg-[#05070c] text-white overflow-hidden"
        >
          {/* HEADER */}
          <header className="sticky top-0 z-[60] h-[72px] sm:h-[82px] bg-[#071126]/95 backdrop-blur-xl border-b border-blue-500/15">
            <div className="max-w-7xl mx-auto h-full px-5 sm:px-8 lg:px-10 flex items-center justify-between">
              <div>
                <div className="text-xl sm:text-3xl font-black italic tracking-tight leading-none">
                  PB <span className="text-blue-400">BILIBILI 162</span>
                </div>
                <div className="hidden sm:block mt-1 text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold">
                  Athlete Profile
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => goToPlayer(-1)} className="hidden sm:flex w-10 h-10 rounded-full border border-white/10 bg-white/[0.03] items-center justify-center hover:bg-blue-600/15 hover:border-blue-500/40 transition" aria-label="Atlet sebelumnya">
                  <ChevronLeft size={19} />
                </button>
                <button onClick={() => goToPlayer(1)} className="hidden sm:flex w-10 h-10 rounded-full border border-white/10 bg-white/[0.03] items-center justify-center hover:bg-blue-600/15 hover:border-blue-500/40 transition" aria-label="Atlet berikutnya">
                  <ChevronRight size={19} />
                </button>
                <button onClick={onClose} className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/15 bg-black/25 flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition" aria-label="Tutup profil">
                  <X size={22} />
                </button>
              </div>
            </div>
          </header>

          {/* TABS */}
          <nav className="sticky top-[72px] sm:top-[82px] z-50 bg-[#05070c]/96 backdrop-blur-xl border-b border-white/8">
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
              <div className="flex gap-8 sm:gap-12">
                {[
                  ["profil", "Profil"],
                  ["stats", "Statistik"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as "profil" | "stats")}
                    className={`relative py-4 sm:py-5 text-sm sm:text-base font-bold transition-colors ${activeTab === id ? "text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {label}
                    {activeTab === id && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-blue-500 rounded-full shadow-[0_0_14px_rgba(59,130,246,.65)]" />}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {activeTab === "profil" ? (
            <>
              {/* HERO */}
              <section className="relative overflow-hidden bg-[#05070c]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,rgba(37,99,235,.18),transparent_30%),linear-gradient(120deg,#05070c_0%,#071126_55%,#03050a_100%)]" />
                <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(125deg,transparent_0%,transparent_47%,rgba(59,130,246,.45)_48%,transparent_49%,transparent_67%,rgba(255,255,255,.06)_68%,transparent_69%)]" />
                <div className="absolute -right-40 top-24 w-[520px] h-[520px] rounded-full border border-blue-500/10" />
                <div className="absolute right-[-100px] bottom-[-220px] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute left-4 sm:left-10 bottom-5 sm:bottom-8 text-[62px] sm:text-[130px] font-black italic tracking-tighter text-white/[0.025] leading-none select-none pointer-events-none">
                  PB 162
                </div>

                <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
                  <div className="min-h-[650px] sm:min-h-[700px] lg:min-h-[650px] grid lg:grid-cols-[0.9fr_1.1fr] items-center gap-2 lg:gap-0">
                    {/* Text: deliberately kept separate from image on mobile to prevent overlap */}
                    <div className="relative z-20 pt-12 sm:pt-14 lg:pt-0 pb-3 lg:pb-0 max-w-2xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/35 bg-blue-500/[0.07] px-4 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,.9)]" />
                        {player.ageGroup || "Atlet"} • PB Bilibili 162
                      </div>
                      <h1 className="mt-5 text-[46px] leading-[0.88] sm:text-7xl lg:text-[78px] font-black uppercase italic tracking-[-0.045em] break-words">
                        {player.name}
                      </h1>
                      <p className="mt-5 text-sm sm:text-xl lg:text-2xl text-zinc-300 uppercase tracking-[0.09em] leading-relaxed">
                        {profile.backName !== "-" ? profile.backName : "ATLET PB BILIBILI 162"}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-bold text-zinc-200">
                          {profile.sector}
                        </span>
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-300">
                          {points} PTS
                        </span>
                      </div>
                    </div>

                    {/* Athlete image: constrained independently so it cannot cover the name/details */}
                    <div className="relative h-[390px] sm:h-[470px] lg:h-[620px] flex items-end justify-center lg:justify-end">
                      {player.img ? (
                        <LazyImage
                          src={player.img}
                          className="w-full h-full object-contain object-bottom drop-shadow-[0_28px_45px_rgba(0,0,0,.8)]"
                          alt={player.name}
                          containerClassName="w-full h-full flex items-end justify-center lg:justify-end"
                          width={800}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <User size={110} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* PROFILE DETAILS */}
              <section className="relative bg-[#04070d] border-t border-blue-500/10">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-8 sm:py-12 lg:py-14">
                  <div className="rounded-2xl sm:rounded-3xl border border-blue-500/20 bg-[linear-gradient(135deg,rgba(7,17,38,.96),rgba(4,8,16,.98))] shadow-[0_25px_80px_rgba(0,0,0,.35)] overflow-hidden">
                    <div className="grid lg:grid-cols-[1fr_280px]">
                      <div className="relative px-5 sm:px-8 lg:px-10 py-7 sm:py-9">
                        <div className="absolute left-0 top-7 bottom-7 w-1 bg-blue-500 rounded-r-full shadow-[0_0_16px_rgba(59,130,246,.45)]" />
                        <div className="grid sm:grid-cols-2 gap-x-8">
                          {fields.map(([Icon, label, value]: any, index) => (
                            <div key={label} className={`flex gap-3 sm:gap-4 py-4 ${index < fields.length - 1 ? "border-b border-white/[0.07]" : ""} ${index === fields.length - 2 ? "sm:border-b-0" : ""}`}>
                              <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600/15 border border-blue-500/25 flex items-center justify-center">
                                <Icon size={18} className="text-blue-400" />
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">{label}</p>
                                <p className="mt-1 text-sm sm:text-base lg:text-lg font-medium text-white leading-relaxed break-words">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {(profile.instagram || profile.tiktok) && (
                          <div className="mt-6 pt-5 border-t border-white/[0.07] flex gap-3">
                            {profile.instagram && (
                              <button onClick={() => openSocial(profile.instagram)} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.025] flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition" aria-label="Instagram">
                                <Instagram size={20} />
                              </button>
                            )}
                            {profile.tiktok && (
                              <button onClick={() => openSocial(profile.tiktok)} className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.025] flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition" aria-label="TikTok">
                                <Music2 size={20} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Summary stats */}
                      <aside className="border-t lg:border-t-0 lg:border-l border-white/[0.07] bg-black/10 p-5 sm:p-7">
                        <p className="text-[9px] uppercase tracking-[0.25em] text-blue-400 font-black mb-4">Ringkasan Atlet</p>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                          {statItems.map(([label, value, suffix, Icon]: any) => (
                            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5">
                              <div className="flex items-center gap-2 text-zinc-500">
                                <Icon size={14} className="text-blue-400" />
                                <span className="text-[9px] uppercase tracking-widest font-black">{label}</span>
                              </div>
                              <p className="mt-1.5 text-sm font-black text-white break-words">
                                {value} {suffix && <span className="text-blue-400">{suffix}</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              </section>

              {/* FOOTER */}
              <section className="border-t border-white/[0.06] bg-[#071126] px-5 sm:px-8 lg:px-10 py-7">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.28em] text-blue-400 font-black">PB BILIBILI 162</p>
                    <h3 className="mt-1 text-lg sm:text-xl font-black">Profil Atlet</h3>
                  </div>
                  <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 transition text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-600/15">
                    Kembali ke Daftar Atlet
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section className="min-h-[70dvh] bg-[#04070d] px-5 sm:px-8 lg:px-10 py-10 sm:py-14">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-end justify-between gap-4 mb-7">
                  <div>
                    <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.25em]">Performance</p>
                    <h2 className="mt-1 text-3xl sm:text-5xl font-black italic uppercase tracking-tight">Statistik Atlet</h2>
                  </div>
                  <Trophy className="text-blue-500 shrink-0" size={32} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {statItems.map(([label, value, suffix, Icon]: any) => (
                    <div key={label} className="rounded-2xl border border-blue-500/15 bg-[#071126] p-4 sm:p-6">
                      <Icon size={20} className="text-blue-400" />
                      <p className="mt-4 text-[9px] uppercase tracking-widest text-zinc-500 font-black">{label}</p>
                      <p className="mt-2 text-xl sm:text-3xl font-black break-words">{value}</p>
                      {suffix && <p className="text-blue-400 text-xs font-black mt-1">{suffix}</p>}
                    </div>
                  ))}
                </div>
                {player.bio && (
                  <div className="mt-5 rounded-2xl border border-blue-500/15 bg-blue-500/[0.035] p-5 sm:p-7">
                    <p className="text-zinc-400 text-sm leading-relaxed">{player.bio}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
