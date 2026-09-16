import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Crown, CalendarDays, MapPin, Users, Award } from 'lucide-react';
import { supabase } from '../supabase';

const TOURNAMENT_ID = 2;
const PHOTO_BUCKET = 'turnamen-dokumen';

type ChampionResult = {
  rank: 'JUARA I' | 'JUARA II' | 'JUARA III BERSAMA';
  players: string;
  aliases: string[][];
  club: string;
  icon: typeof Trophy;
};

type ChampionEvent = {
  id: string;
  category: string;
  region: string;
  accent: 'blue' | 'orange';
  results: ChampionResult[];
};

const BILIBILI_162_CUP_RESULTS: ChampionEvent[] = [
  {
    id: 'bilibili-162-cup-cc-local',
    category: 'Ganda Putra CC',
    region: 'KATEGORI LOKAL PAREPARE',
    accent: 'orange',
    results: [
      { rank: 'JUARA I', players: 'Tison & Kambo', aliases: [['TISON', 'KAMBO']], club: 'PB Sari Indah', icon: Trophy },
      { rank: 'JUARA II', players: 'Muslim & Sam', aliases: [['MUSLIM', 'SAM']], club: 'Rajawali 42', icon: Medal },
      { rank: 'JUARA III BERSAMA', players: 'Denis & Yusuf', aliases: [['DENIS', 'YUSUF']], club: 'PB Bilibili 162', icon: Medal },
      { rank: 'JUARA III BERSAMA', players: 'Ome & Ardi', aliases: [['OME', 'ARDI']], club: 'Rajawali 42', icon: Medal },
    ],
  },
  {
    id: 'bilibili-162-cup-ajatappareng',
    category: 'Ganda Putra AD/BC-/C+C',
    region: 'KATEGORI AJATAPPARENG',
    accent: 'blue',
    results: [
      { rank: 'JUARA I', players: 'Andi M. Fahrul & Ichal Bin Tura (Ayah E)', aliases: [['ANDIMFAHRUL', 'ICHALBINTURA']], club: 'PB Bulu Putih', icon: Trophy },
      { rank: 'JUARA II', players: 'Ahmad Halim & Gusmulyadi', aliases: [['AHMADHALIM', 'GUSMULYADI']], club: 'PB Barokah', icon: Medal },
      { rank: 'JUARA III BERSAMA', players: 'Nugi & Saldi', aliases: [['NUGI', 'SALDI']], club: 'THE GADE', icon: Medal },
      { rank: 'JUARA III BERSAMA', players: 'Haykal & Restu', aliases: [['HAYKAL', 'RESTU']], club: 'PB ROVIDA', icon: Medal },
    ],
  },
];

const normalizeName = (value = '') => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

function pairMatches(row: any, aliases: string[][]) {
  const a = normalizeName(row?.nama_pemain_1);
  const b = normalizeName(row?.nama_pemain_2);
  return aliases.some(([first, second]) => {
    const f = normalizeName(first);
    const s = normalizeName(second);
    return (a.includes(f) && b.includes(s)) || (a.includes(s) && b.includes(f));
  });
}

function photoPath(row: any, player: 1 | 2) {
  return row?.[`foto_pemain_${player}_url`] || row?.[`foto_pemain_${player}`] || '';
}

function facePosition(face: any, width: number, height: number) {
  if (!face || !width || !height) return '50% 28%';
  const box = face.boundingBox || face;
  const x = Number(box.x ?? box.left ?? 0) + Number(box.width ?? 0) / 2;
  const y = Number(box.y ?? box.top ?? 0) + Number(box.height ?? 0) / 2;
  const px = Math.max(15, Math.min(85, (x / width) * 100));
  const py = Math.max(15, Math.min(60, (y / height) * 100));
  return `${px}% ${py}%`;
}

function PlayerPhoto({ src, alt }: { src: string; alt: string }) {
  const [position, setPosition] = useState('50% 28%');

  const detectFace = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const FaceDetectorCtor = (window as any).FaceDetector;
    if (!FaceDetectorCtor || !img.naturalWidth || !img.naturalHeight) return;
    try {
      const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces?.[0]) setPosition(facePosition(faces[0], img.naturalWidth, img.naturalHeight));
    } catch {
      // Browser does not support FaceDetector; keep the safe portrait fallback.
    }
  };

  if (!src) {
    return (
      <div className="prestasi-photo-empty">
        <Award size={22} />
        <span>Foto belum tersedia</span>
      </div>
    );
  }

  return (
    <div className="prestasi-photo-frame">
      <img src={src} alt={alt} className="prestasi-photo-blur" aria-hidden="true" />
      <img
        src={src}
        alt={alt}
        className="prestasi-photo-main"
        style={{ objectPosition: position }}
        onLoad={detectFace}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <div className="prestasi-photo-shade" />
    </div>
  );
}

function RankBadge({ result }: { result: ChampionResult }) {
  const Icon = result.icon;
  const rankClass = result.rank === 'JUARA I' ? 'rank-gold' : result.rank === 'JUARA II' ? 'rank-silver' : 'rank-bronze';
  return (
    <div className={`prestasi-rank ${rankClass}`}>
      <Icon size={15} />
      <span>{result.rank}</span>
    </div>
  );
}

export default function PublicPrestasi() {
  const [acceptedParticipants, setAcceptedParticipants] = useState<any[]>([]);
  const [signedPhotos, setSignedPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadWinners = async () => {
      const { data, error } = await supabase
        .from('pendaftaran_turnamen')
        .select('id,tournament_id,status_pendaftaran,nama_pemain_1,nama_pemain_2,asal_pb,foto_pemain_1_url,foto_pemain_2_url,foto_pemain_1,foto_pemain_2')
        .eq('tournament_id', TOURNAMENT_ID)
        .eq('status_pendaftaran', 'Diterima');

      if (cancelled || error) return;
      setAcceptedParticipants(data || []);

      const paths = Array.from(new Set(
        (data || [])
          .flatMap(row => [photoPath(row, 1), photoPath(row, 2)])
          .filter(Boolean)
      ));
      if (!paths.length) return;

      const { data: signed, error: signedError } = await supabase
        .storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(paths, 60 * 60);

      if (cancelled || signedError || !signed) return;
      const next: Record<string, string> = {};
      signed.forEach((item: any, index: number) => {
        const url = item?.signedUrl || item?.signedURL || '';
        if (url) next[paths[index]] = url;
      });
      setSignedPhotos(next);
    };

    loadWinners();
    return () => { cancelled = true; };
  }, []);

  const championEvents = useMemo(() => BILIBILI_162_CUP_RESULTS.map(event => ({
    ...event,
    results: event.results.map(result => {
      const row = acceptedParticipants.find(candidate => pairMatches(candidate, result.aliases));
      const p1 = row ? photoPath(row, 1) : '';
      const p2 = row ? photoPath(row, 2) : '';
      return {
        ...result,
        photo1: signedPhotos[p1] || '',
        photo2: signedPhotos[p2] || '',
      };
    }),
  })), [acceptedParticipants, signedPhotos]);

  return (
    <section id="prestasi" className="prestasi-modern-page">
      <style>{`
        #prestasi.prestasi-modern-page {
          --navy: #061426;
          --navy-2: #0a2038;
          --panel: rgba(5, 19, 34, .96);
          --line: rgba(148, 163, 184, .18);
          --gold: #f4b400;
          width: 100%; max-width: 100%; min-width: 0; overflow-x: clip;
          box-sizing: border-box; color: #fff; background: #06101d;
          position: relative; isolation: isolate;
          padding: clamp(28px, 5vw, 64px) 0 54px;
        }
        #prestasi.prestasi-modern-page *, #prestasi.prestasi-modern-page *::before, #prestasi.prestasi-modern-page *::after { box-sizing: border-box; }
        #prestasi .prestasi-bg-glow { position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:-1; }
        #prestasi .prestasi-bg-glow::before { content:""; position:absolute; width:70vw; height:40vw; max-height:520px; left:15%; top:8%; background:radial-gradient(circle, rgba(0,118,255,.16), transparent 68%); filter:blur(35px); }
        #prestasi .prestasi-shell { width:min(1280px, calc(100% - 32px)); margin:0 auto; min-width:0; }
        #prestasi .prestasi-hero { text-align:center; max-width:960px; margin:0 auto clamp(24px, 4vw, 42px); }
        #prestasi .prestasi-kicker { display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border:1px solid rgba(244,180,0,.28); background:rgba(244,180,0,.08); color:#f6c33b; border-radius:999px; font-size:11px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; }
        #prestasi .prestasi-title { margin:14px 0 8px; font-size:clamp(34px, 5vw, 64px); line-height:.98; font-weight:950; font-style:italic; letter-spacing:-.045em; text-transform:uppercase; }
        #prestasi .prestasi-title span { color:#f4b400; }
        #prestasi .prestasi-subtitle { margin:0 auto; max-width:760px; color:#9fb0c3; font-size:clamp(12px, 1.5vw, 16px); line-height:1.65; }
        #prestasi .prestasi-event-heading { text-align:center; margin-bottom:24px; }
        #prestasi .prestasi-event-title { display:flex; align-items:center; justify-content:center; gap:10px; margin:0; font-size:clamp(20px, 2.7vw, 34px); line-height:1.12; font-weight:950; text-transform:uppercase; letter-spacing:-.02em; }
        #prestasi .prestasi-event-title svg { color:var(--gold); flex:none; }
        #prestasi .prestasi-meta { display:flex; flex-wrap:wrap; justify-content:center; gap:8px 18px; margin-top:10px; color:#aab9ca; font-size:12px; }
        #prestasi .prestasi-meta span { display:inline-flex; align-items:center; gap:6px; }
        #prestasi .prestasi-meta svg { color:#1890ff; }
        #prestasi .prestasi-events { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; min-width:0; }
        #prestasi .prestasi-event-card { min-width:0; max-width:100%; overflow:hidden; border:1px solid var(--line); border-radius:24px; background:linear-gradient(145deg, rgba(8,30,54,.98), rgba(3,12,23,.98)); box-shadow:0 20px 55px rgba(0,0,0,.26); }
        #prestasi .prestasi-event-card.orange { border-color:rgba(245,158,11,.28); background:linear-gradient(145deg, rgba(57,31,8,.82), rgba(3,12,23,.98)); }
        #prestasi .prestasi-event-card.blue { border-color:rgba(14,126,255,.34); }
        #prestasi .prestasi-event-head { padding:18px 20px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid rgba(255,255,255,.08); }
        #prestasi .prestasi-event-head-copy { min-width:0; }
        #prestasi .prestasi-event-region { color:#f6c33b; font-size:9px; font-weight:900; letter-spacing:.2em; text-transform:uppercase; margin-bottom:5px; }
        #prestasi .prestasi-event-name { margin:0; font-size:clamp(18px, 2vw, 25px); line-height:1.12; font-weight:950; overflow-wrap:anywhere; }
        #prestasi .prestasi-event-icon { width:42px; height:42px; display:grid; place-items:center; border-radius:13px; color:#fff; background:rgba(16,118,255,.16); border:1px solid rgba(16,118,255,.3); flex:none; }
        #prestasi .orange .prestasi-event-icon { background:rgba(245,158,11,.13); border-color:rgba(245,158,11,.3); color:#ffc64a; }
        #prestasi .prestasi-results { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding:14px; min-width:0; }
        #prestasi .prestasi-result-card { min-width:0; max-width:100%; overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:18px; background:rgba(2,10,19,.72); }
        #prestasi .prestasi-rank { min-height:35px; margin:10px 10px 8px; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:6px; padding:6px 7px; font-size:9px; line-height:1.1; font-weight:950; letter-spacing:.08em; text-align:center; text-transform:uppercase; }
        #prestasi .rank-gold { color:#17130a; background:linear-gradient(90deg,#d99d00,#ffd447,#d99d00); }
        #prestasi .rank-silver { color:#eaf0f7; background:linear-gradient(90deg,#405268,#9aa9ba,#405268); }
        #prestasi .rank-bronze { color:#fff4ea; background:linear-gradient(90deg,#5a3827,#9b6445,#5a3827); }
        #prestasi .prestasi-player-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; padding:0 10px; min-width:0; }
        #prestasi .prestasi-player { min-width:0; text-align:center; }
        #prestasi .prestasi-photo-frame { position:relative; width:100%; aspect-ratio:4/5; min-width:0; overflow:hidden; border-radius:12px; border:1px solid rgba(255,255,255,.11); background:#020a13; isolation:isolate; }
        #prestasi .prestasi-photo-blur { position:absolute; inset:-12%; width:124%; height:124%; object-fit:cover; filter:blur(12px); opacity:.35; transform:scale(1.04); }
        #prestasi .prestasi-photo-main { position:absolute; inset:0; width:100%; height:100%; max-width:none; object-fit:contain; object-position:50% 28%; display:block; z-index:1; }
        #prestasi .prestasi-photo-shade { position:absolute; inset:auto 0 0; height:32%; z-index:2; background:linear-gradient(transparent,rgba(0,0,0,.48)); pointer-events:none; }
        #prestasi .prestasi-photo-empty { width:100%; aspect-ratio:4/5; border-radius:12px; border:1px dashed rgba(148,163,184,.18); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; color:#64748b; font-size:8px; }
        #prestasi .prestasi-player-name { margin-top:8px; min-height:34px; display:flex; align-items:flex-start; justify-content:center; font-size:11px; line-height:1.18; font-weight:900; overflow-wrap:anywhere; }
        #prestasi .prestasi-player-club { margin:5px 0 11px; min-height:25px; display:flex; align-items:center; justify-content:center; padding:4px 7px; border-radius:999px; border:1px solid rgba(47,115,183,.32); color:#c7d8e9; background:rgba(10,38,64,.7); font-size:8px; line-height:1.15; font-weight:800; overflow-wrap:anywhere; }
        #prestasi .prestasi-result-card:has(.rank-gold) { border-color:rgba(244,180,0,.34); }
        #prestasi .prestasi-result-card:has(.rank-silver) { border-color:rgba(148,163,184,.23); }
        #prestasi .prestasi-result-card:has(.rank-bronze) { border-color:rgba(180,101,58,.28); }
        #prestasi .prestasi-footer { display:flex; align-items:center; justify-content:center; gap:12px; margin:34px auto 0; max-width:980px; text-align:center; }
        #prestasi .prestasi-footer-line { height:1px; flex:1; background:linear-gradient(90deg,transparent,rgba(148,163,184,.65)); }
        #prestasi .prestasi-footer-line:last-child { transform:scaleX(-1); }
        #prestasi .prestasi-footer-title { display:flex; align-items:center; gap:8px; color:#f4b400; font-size:clamp(13px, 1.7vw, 19px); font-weight:950; text-transform:uppercase; white-space:nowrap; }
        #prestasi .prestasi-footer-title span { color:#fff; }
        #prestasi .prestasi-footer-copy { margin:9px auto 0; text-align:center; color:#8fa3b8; font-size:11px; line-height:1.6; }
        @media (min-width:1280px) {
          #prestasi .prestasi-shell { width:min(1320px, calc(100% - 48px)); }
          #prestasi .prestasi-events { gap:18px; }
          #prestasi .prestasi-results { grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; padding:12px; }
          #prestasi .prestasi-event-head { padding:16px 18px 14px; }
          #prestasi .prestasi-rank { margin:8px 8px 7px; font-size:8px; min-height:32px; }
          #prestasi .prestasi-player-grid { gap:5px; padding:0 8px; }
          #prestasi .prestasi-player-name { font-size:10px; }
          #prestasi .prestasi-player-club { font-size:7px; margin-bottom:8px; }
        }
        @media (max-width:1023px) {
          #prestasi .prestasi-events { grid-template-columns:1fr; max-width:760px; margin:0 auto; }
        }
        @media (max-width:767px) {
          #prestasi.prestasi-modern-page { padding:24px 0 40px; }
          #prestasi .prestasi-shell { width:min(100% - 20px, 620px); }
          #prestasi .prestasi-kicker { font-size:9px; padding:7px 11px; }
          #prestasi .prestasi-title { font-size:clamp(30px, 11vw, 45px); margin-top:12px; }
          #prestasi .prestasi-subtitle { font-size:11px; line-height:1.55; }
          #prestasi .prestasi-event-heading { margin-bottom:18px; }
          #prestasi .prestasi-event-title { font-size:clamp(18px, 6vw, 25px); gap:7px; }
          #prestasi .prestasi-event-title svg { width:19px; height:19px; }
          #prestasi .prestasi-meta { font-size:9px; gap:6px 12px; }
          #prestasi .prestasi-events { gap:14px; }
          #prestasi .prestasi-event-card { border-radius:20px; }
          #prestasi .prestasi-event-head { padding:14px 14px 12px; }
          #prestasi .prestasi-event-region { font-size:8px; letter-spacing:.15em; }
          #prestasi .prestasi-event-name { font-size:18px; }
          #prestasi .prestasi-event-icon { width:36px; height:36px; border-radius:11px; }
          #prestasi .prestasi-results { grid-template-columns:1fr 1fr; gap:8px; padding:9px; }
          #prestasi .prestasi-rank { min-height:31px; margin:7px 7px 6px; padding:5px 4px; font-size:7px; letter-spacing:.045em; }
          #prestasi .prestasi-player-grid { gap:5px; padding:0 7px; }
          #prestasi .prestasi-photo-frame, #prestasi .prestasi-photo-empty { aspect-ratio:4/5; border-radius:10px; }
          #prestasi .prestasi-player-name { margin-top:6px; min-height:31px; font-size:9px; }
          #prestasi .prestasi-player-club { min-height:23px; margin:4px 0 7px; padding:3px 5px; font-size:7px; }
          #prestasi .prestasi-footer { margin-top:24px; gap:7px; }
          #prestasi .prestasi-footer-title { font-size:11px; gap:5px; }
          #prestasi .prestasi-footer-title svg { width:14px; }
          #prestasi .prestasi-footer-copy { font-size:9px; padding:0 14px; }
        }
        @media (max-width:380px) {
          #prestasi .prestasi-shell { width:calc(100% - 14px); }
          #prestasi .prestasi-event-name { font-size:16px; }
          #prestasi .prestasi-results { gap:6px; padding:7px; }
          #prestasi .prestasi-rank { margin:6px 5px 5px; font-size:6.5px; }
          #prestasi .prestasi-player-grid { gap:4px; padding:0 5px; }
          #prestasi .prestasi-player-name { font-size:8px; }
          #prestasi .prestasi-player-club { font-size:6.5px; }
        }
      `}</style>

      <div className="prestasi-bg-glow" aria-hidden="true" />
      <div className="prestasi-shell">
        <header className="prestasi-hero">
          <div className="prestasi-kicker"><Trophy size={14} /> Prestasi</div>
          <h1 className="prestasi-title">Apresiasi <span>Juara</span></h1>
          <p className="prestasi-subtitle">Dokumentasi juara BILIBILI 162 CUP I Tahun 2026 dalam tampilan yang ringkas, modern, dan responsif.</p>
        </header>

        <div className="prestasi-event-heading">
          <h2 className="prestasi-event-title"><Crown size={24} /> Juara BILIBILI 162 CUP I Tahun 2026</h2>
          <div className="prestasi-meta">
            <span><CalendarDays size={13} /> 08–12 September 2026</span>
            <span><MapPin size={13} /> GOR Titik Kumpul Soreang, Parepare</span>
            <span><Users size={13} /> 2 Kategori Pertandingan</span>
          </div>
        </div>

        <div className="prestasi-events">
          {championEvents.map((event, index) => (
            <motion.article
              key={event.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: .12 }}
              transition={{ duration: .38, delay: index * .06 }}
              className={`prestasi-event-card ${event.accent}`}
            >
              <div className="prestasi-event-head">
                <div className="prestasi-event-head-copy">
                  <div className="prestasi-event-region">{event.region}</div>
                  <h3 className="prestasi-event-name">{event.category}</h3>
                </div>
                <div className="prestasi-event-icon"><Trophy size={21} /></div>
              </div>

              <div className="prestasi-results">
                {event.results.map((result, resultIndex) => (
                  <div className="prestasi-result-card" key={`${event.id}-${result.rank}-${resultIndex}`}>
                    <RankBadge result={result} />
                    <div className="prestasi-player-grid">
                      <div className="prestasi-player">
                        <PlayerPhoto src={result.photo1} alt={`${result.players} - pemain 1`} />
                        <div className="prestasi-player-name">{result.players.split(' & ')[0]}</div>
                        <div className="prestasi-player-club">{result.club}</div>
                      </div>
                      <div className="prestasi-player">
                        <PlayerPhoto src={result.photo2} alt={`${result.players} - pemain 2`} />
                        <div className="prestasi-player-name">{result.players.split(' & ').slice(1).join(' & ')}</div>
                        <div className="prestasi-player-club">{result.club}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}
        </div>

        <div className="prestasi-footer" aria-label="Ucapan selamat">
          <div className="prestasi-footer-line" />
          <div className="prestasi-footer-title"><Trophy size={17} /> <span>Selamat kepada para juara</span></div>
          <div className="prestasi-footer-line" />
        </div>
        <p className="prestasi-footer-copy">Teruslah berlatih, junjung tinggi sportivitas, dan sampai jumpa di turnamen berikutnya.</p>
      </div>
    </section>
  );
}
