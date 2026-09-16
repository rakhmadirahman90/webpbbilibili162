import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// Render participant photos as true card-fitted portraits. The image fills the
// portrait card without distortion; object-position is adjusted toward the
// face when FaceDetector is available, with an upper-center fallback.
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
        const face = faces
          .map((item: any) => item?.boundingBox)
          .filter(Boolean)
          .sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height))[0];
        if (!face || !image.naturalWidth || !image.naturalHeight) return;
        const x = Math.max(20, Math.min(80, ((face.x + face.width / 2) / image.naturalWidth) * 100));
        const y = Math.max(18, Math.min(62, ((face.y + face.height * 0.35) / image.naturalHeight) * 100));
        if (!cancelled) setObjectPosition(x.toFixed(1) + '% ' + y.toFixed(1) + '%');
      } catch {}
    };
    image.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover scale-110 blur-xl opacity-20" />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="relative z-[1] block h-full w-full object-cover"
        style={{ objectPosition }}
      />
    </div>
  );
}

`;
  if (!src.includes(anchor)) throw new Error('[patch-public-player-photo-focus] directUrl anchor not found');
  src = src.replace(anchor, helper + anchor);
}

const old = `<img src={url} alt={\`Foto \${name}\`} loading="lazy" className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"/>`;
const newer = `<SmartPlayerPhoto src={url} alt={\`Foto \${name}\`} />`;
if (src.includes(old)) src = src.replace(old, newer);
else if (!src.includes('<SmartPlayerPhoto src={url}')) {
  const broad = /<img src=\{url\} alt=\{\`Foto \$\{name\}\`\} loading="lazy" className="[^"]*"\/>/;
  if (broad.test(src)) src = src.replace(broad, newer);
}

const cssPath = 'src/index.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  const marker = '/* __PUBLIC_PRESTASI_CARD_FIT_V2__ */';
  if (!css.includes(marker)) {
    css += `\n\n${marker}\n/* Photo frame follows the result card exactly. */\n#prestasi article .aspect-\\[3\\/4\\] { position: relative; width: 100%; aspect-ratio: 3 / 4 !important; min-height: 0 !important; height: auto !important; overflow: hidden; border-radius: .9rem; }\n#prestasi article .aspect-\\[3\\/4\\] > * { width: 100%; height: 100%; }\n#prestasi article .aspect-\\[3\\/4\\] img { width: 100%; height: 100%; object-fit: cover !important; display: block; }\n@media (min-width: 768px) {\n  #prestasi article .aspect-\\[3\\/4\\] { aspect-ratio: 3 / 4 !important; }\n}\n@media (max-width: 767px) {\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .aspect-\\[3\\/4\\] { width: 100%; aspect-ratio: 3 / 4 !important; min-height: 0 !important; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .grid.grid-cols-2 { gap: .5rem !important; }\n}\n@media (max-width: 380px) {\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .aspect-\\[3\\/4\\] { aspect-ratio: 3 / 4 !important; min-height: 0 !important; }\n}\n`;
    fs.writeFileSync(cssPath, css, 'utf8');
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-player-photo-focus] portrait card-fit photo renderer applied.');
