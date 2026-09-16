import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes('function SmartPlayerPhoto')) {
  const anchor = 'function directUrl(value: unknown) {';
  const helper = `function SmartPlayerPhoto({ src, alt }: { src: string; alt: string }) {
  const [objectPosition, setObjectPosition] = useState('50% 30%');
  useEffect(() => {
    let cancelled = false;
    const Detector = (window as any).FaceDetector;
    if (!Detector || !src) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = async () => {
      try {
        const detector = new Detector({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await detector.detect(image);
        if (!faces?.length || cancelled) return;
        const face = faces.map((item: any) => item?.boundingBox).filter(Boolean).sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height))[0];
        if (!face || !image.naturalWidth || !image.naturalHeight) return;
        const x = Math.max(20, Math.min(80, ((face.x + face.width / 2) / image.naturalWidth) * 100));
        const y = Math.max(18, Math.min(62, ((face.y + face.height * 0.35) / image.naturalHeight) * 100));
        if (!cancelled) setObjectPosition(x.toFixed(1) + '% ' + y.toFixed(1) + '%');
      } catch {}
    };
    image.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return <div className="relative h-full w-full overflow-hidden bg-slate-950"><img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover scale-110 blur-xl opacity-20" /><img src={src} alt={alt} loading="lazy" decoding="async" className="relative z-[1] block h-full w-full object-cover" style={{ objectPosition }} /></div>;
}

`;
  if (!src.includes(anchor)) throw new Error('[patch-public-player-photo-focus] directUrl anchor not found');
  src = src.replace(anchor, helper + anchor);
}
const newer = '<SmartPlayerPhoto src={url} alt={`Foto ${name}`} />';
if (!src.includes('<SmartPlayerPhoto src={url}')) {
  const broad = /<img src=\{url\} alt=\{`Foto \$\{name\}`} loading="lazy" className="[^\"]*"\/>/;
  if (broad.test(src)) src = src.replace(broad, newer);
}

const cssPath = 'src/index.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  const marker = '/* __PUBLIC_PRESTASI_CARD_FIT_V5__ */';
  if (!css.includes(marker)) {
    css += `\n\n${marker}
/* Canonical Prestasi viewport-fit layout: content determines height; no artificial page-height. */
#prestasi { width: 100% !important; max-width: 100% !important; overflow-x: clip !important; box-sizing: border-box; }
#prestasi > * { min-width: 0 !important; max-width: 100% !important; box-sizing: border-box; }
#prestasi .max-w-7xl { width: min(100%, 1280px) !important; max-width: 1280px !important; min-width: 0 !important; margin-inline: auto !important; box-sizing: border-box; }
#prestasi article { min-width: 0 !important; max-width: 100% !important; width: 100% !important; overflow: hidden !important; box-sizing: border-box; }
#prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 { width: 100% !important; max-width: 100% !important; min-width: 0 !important; display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .6rem !important; align-items: stretch !important; }
#prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div { min-width: 0 !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; overflow: hidden !important; }
#prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div > .grid.grid-cols-2 { width: 100% !important; min-width: 0 !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .4rem !important; }
#prestasi article .aspect-\\[3\\/4\\] { width: 100% !important; min-width: 0 !important; max-width: 100% !important; height: auto !important; aspect-ratio: 3 / 4 !important; overflow: hidden !important; box-sizing: border-box !important; }
#prestasi article .aspect-\\[3\\/4\\] > * { width: 100% !important; max-width: 100% !important; height: 100% !important; min-width: 0 !important; }
#prestasi article .aspect-\\[3\\/4\\] img { width: 100% !important; max-width: none !important; height: 100% !important; min-width: 0 !important; display: block !important; object-fit: cover !important; object-position: 50% 22% !important; }

/* Desktop: both tournament categories share one compact viewport-friendly row. */
@media (min-width: 1024px) {
  #prestasi { padding-block: 1.25rem !important; }
  #prestasi .max-w-7xl { padding-inline: 1.25rem !important; }
  #prestasi > .max-w-7xl > *:first-child { margin-bottom: .8rem !important; }
  #prestasi > .max-w-7xl > .grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .9rem !important; align-items: start !important; }
  #prestasi article { padding: .8rem !important; border-radius: 1rem !important; }
  #prestasi article > div:first-child { margin-bottom: .6rem !important; }
  #prestasi article > div:first-child h3 { font-size: .92rem !important; line-height: 1.25 !important; }
  #prestasi article > div:first-child p { font-size: .68rem !important; line-height: 1.25 !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .55rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div { padding: .55rem !important; border-radius: .8rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div > .grid.grid-cols-2 { gap: .35rem !important; padding: 0 !important; }
  #prestasi article .aspect-\\[3\\/4\\] { aspect-ratio: 4 / 3 !important; }
  #prestasi article .aspect-\\[3\\/4\\] img { object-position: 50% 22% !important; }
  #prestasi article .text-sm.md\\:text-base { font-size: .7rem !important; line-height: 1.18 !important; overflow-wrap: anywhere; }
  #prestasi article .text-\\[10px\\] { font-size: .54rem !important; line-height: 1.15 !important; }
}

/* Tablet: keep two event columns only when there is enough width. */
@media (min-width: 768px) and (max-width: 1023px) {
  #prestasi .max-w-7xl { padding-inline: 1rem !important; }
  #prestasi > .max-w-7xl > .grid { grid-template-columns: 1fr !important; gap: .8rem !important; }
  #prestasi article { padding: .8rem !important; }
}

/* Mobile: one event card per row; inside each result the two player photos stay side-by-side. */
@media (max-width: 767px) {
  #prestasi { padding-block: .75rem !important; }
  #prestasi .max-w-7xl { width: 100% !important; padding-left: .75rem !important; padding-right: .75rem !important; }
  #prestasi > .max-w-7xl > *:first-child { margin-bottom: .65rem !important; }
  #prestasi > .max-w-7xl > .grid { grid-template-columns: 1fr !important; gap: .75rem !important; }
  #prestasi article { padding: .7rem !important; border-radius: 1rem !important; }
  #prestasi article > div:first-child { margin-bottom: .55rem !important; }
  #prestasi article > div:first-child h3 { font-size: .85rem !important; line-height: 1.2 !important; }
  #prestasi article > div:first-child p { font-size: .62rem !important; line-height: 1.2 !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 { grid-template-columns: 1fr !important; gap: .6rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div { padding: .55rem !important; border-radius: .8rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div > .grid.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .35rem !important; padding: 0 !important; }
  #prestasi article .aspect-\\[3\\/4\\] { aspect-ratio: 3 / 4 !important; }
  #prestasi article .aspect-\\[3\\/4\\] img { object-position: 50% 20% !important; }
  #prestasi article .text-sm.md\\:text-base { font-size: .72rem !important; line-height: 1.15 !important; overflow-wrap: anywhere; }
  #prestasi article .text-\\[10px\\] { font-size: .55rem !important; line-height: 1.15 !important; }
}

@media (max-width: 380px) {
  #prestasi .max-w-7xl { padding-left: .6rem !important; padding-right: .6rem !important; }
  #prestasi article { padding: .6rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div { padding: .45rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div > .grid.grid-cols-2 { gap: .3rem !important; }
}
`;
    fs.writeFileSync(cssPath, css, 'utf8');
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-player-photo-focus] responsive Prestasi card fit and participant photo focus applied safely.');
