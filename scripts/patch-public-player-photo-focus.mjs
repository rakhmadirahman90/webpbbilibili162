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
const old = `<img src={url} alt={\\`Foto \\${name}\\`} loading="lazy" className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"/>`;
const newer = `<SmartPlayerPhoto src={url} alt={\\`Foto \\${name}\\`} />`;
if (src.includes(old)) src = src.replace(old, newer);
else if (!src.includes('<SmartPlayerPhoto src={url}')) {
  const broad = /<img src=\\{url\\} alt=\\{\\`Foto \\$\\{name\\}\\`\\} loading="lazy" className="[^"]*"\\/>/;
  if (broad.test(src)) src = src.replace(broad, newer);
}

const cssPath = 'src/index.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  const marker = '/* __PUBLIC_PRESTASI_CARD_FIT_V3__ */';
  if (!css.includes(marker)) {
    css += `\n\n${marker}
#prestasi { width: 100%; max-width: 100%; overflow-x: clip; }
#prestasi .max-w-7xl { width: 100%; max-width: 1280px; min-width: 0; }
#prestasi article { min-width: 0 !important; max-width: 100%; overflow: hidden; box-sizing: border-box; }
#prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 { width: 100%; min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; align-items: stretch; }
#prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div { min-width: 0 !important; width: 100% !important; max-width: 100%; box-sizing: border-box; overflow: hidden; }
#prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div > .grid.grid-cols-2 { width: 100%; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
#prestasi article .aspect-\\[3\\/4\\] { width: 100% !important; min-width: 0 !important; max-width: 100% !important; height: auto !important; aspect-ratio: 3 / 4 !important; overflow: hidden !important; box-sizing: border-box; }
#prestasi article .aspect-\\[3\\/4\\] > * { width: 100% !important; max-width: 100% !important; height: 100% !important; min-width: 0 !important; }
#prestasi article .aspect-\\[3\\/4\\] img { width: 100% !important; max-width: none !important; height: 100% !important; min-width: 0 !important; display: block; object-fit: cover !important; object-position: 50% 22% !important; }
@media (max-width: 767px) {
  #prestasi { padding-left: 0; padding-right: 0; }
  #prestasi > .max-w-7xl, #prestasi > .relative.z-10 { min-width: 0 !important; }
  #prestasi .max-w-7xl { padding-left: 1rem !important; padding-right: 1rem !important; }
  #prestasi .text-center { min-width: 0; }
  #prestasi article { border-radius: 1.25rem !important; padding: .875rem !important; }
  #prestasi article > .relative.z-10 { min-width: 0 !important; }
  #prestasi article > .relative.z-10 h4 { font-size: 1rem !important; line-height: 1.2 !important; overflow-wrap: anywhere; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 { grid-template-columns: 1fr !important; gap: .75rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div { border-radius: .9rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div > .grid.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .5rem !important; padding: .5rem !important; }
  #prestasi article .aspect-\\[3\\/4\\] { aspect-ratio: 3 / 4 !important; }
  #prestasi article .aspect-\\[3\\/4\\] img { object-position: 50% 20% !important; }
  #prestasi article .px-3.pb-4 { padding-left: .625rem !important; padding-right: .625rem !important; padding-bottom: .75rem !important; }
  #prestasi article .text-sm.md\\:text-base { font-size: .78rem !important; line-height: 1.2 !important; overflow-wrap: anywhere; }
  #prestasi article .text-\\[10px\\] { font-size: .58rem !important; line-height: 1.25 !important; }
  #prestasi > .relative.z-10 > .mb-12 > .text-center { margin-bottom: 1rem !important; }
  #prestasi > .relative.z-10 > .mb-12 > .text-center .text-xl { font-size: 1rem !important; line-height: 1.2 !important; }
}
@media (min-width: 768px) {
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  #prestasi article .aspect-\\[3\\/4\\] img { object-position: 50% 22% !important; }
}
@media (min-width: 1280px) {
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
}
@media (max-width: 380px) {
  #prestasi .max-w-7xl { padding-left: .75rem !important; padding-right: .75rem !important; }
  #prestasi article { padding: .7rem !important; }
  #prestasi article > .grid.grid-cols-2.md\\:grid-cols-4 > div > .grid.grid-cols-2 { gap: .35rem !important; padding: .4rem !important; }
  #prestasi article .text-sm.md\\:text-base { font-size: .72rem !important; }
}
`;
    fs.writeFileSync(cssPath, css, 'utf8');
  }
}
fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-player-photo-focus] responsive photo cards and face focus applied.');
