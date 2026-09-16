import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// Keep the complete uploaded photo visible (no object-cover cropping) while
// using the browser Face Detection API when available to bias the visual focus
// toward the player's face. Browsers without FaceDetector use a portrait-safe
// upper-center fallback. A blurred cover layer fills the photo frame cleanly.
if (!src.includes('function SmartPlayerPhoto')) {
  const anchor = 'function directUrl(value: unknown) {';
  const helper = `function SmartPlayerPhoto({ src, alt }: { src: string; alt: string }) {
  const [objectPosition, setObjectPosition] = useState('50% 38%');

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
        const x = Math.max(15, Math.min(85, ((face.x + face.width / 2) / image.naturalWidth) * 100));
        const y = Math.max(15, Math.min(85, ((face.y + face.height * 0.42) / image.naturalHeight) * 100));
        if (!cancelled) setObjectPosition(x.toFixed(1) + '% ' + y.toFixed(1) + '%');
      } catch {
        // CORS/unsupported detector: keep the safe upper-center fallback.
      }
    };
    image.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-xl" />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="relative z-[1] h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.01]"
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
if (src.includes(old)) {
  src = src.replace(old, newer);
} else if (!src.includes('<SmartPlayerPhoto src={url}')) {
  const broad = /<img src=\{url\} alt=\{\`Foto \$\{name\}\`\} loading="lazy" className="[^"]*"\/>/;
  if (broad.test(src)) src = src.replace(broad, newer);
  else console.warn('[patch-public-player-photo-focus] player photo img marker not found; leaving current photo renderer unchanged.');
}

const prestasiPath = 'src/components/PublicPrestasi.tsx';
if (fs.existsSync(prestasiPath)) {
  const prestasiMarker = '/* __PUBLIC_PRESTASI_LEGACY_CARDS_REMOVED_V1__ */';
  const prestasi = fs.readFileSync(prestasiPath, 'utf8');
  if (prestasi.includes(prestasiMarker)) {
    fs.writeFileSync(prestasiPath, prestasi.replaceAll(prestasiMarker, ''), 'utf8');
    console.log('[patch-public-player-photo-focus] removed internal Prestasi marker');
  }
}

const cssPath = 'src/index.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  const cssMarker = '/* __PUBLIC_PRESTASI_RESPONSIVE_POLISH_V1__ */';
  if (!css.includes(cssMarker)) {
    css += `\n\n${cssMarker}\n#prestasi { width: 100%; max-width: 100%; overflow-x: hidden; }\n#prestasi > .relative.z-10 { width: 100%; min-width: 0; }\n#prestasi .max-w-7xl { width: 100%; min-width: 0; }\n#prestasi article { min-width: 0; }\n#prestasi article h4 { overflow-wrap: anywhere; }\n#prestasi article .grid { min-width: 0; }\n#prestasi article .grid > div { min-width: 0; }\n#prestasi article img { display: block; max-width: 100%; }\n\n@media (min-width: 768px) {\n  #prestasi { padding-top: 5rem; padding-bottom: 5rem; }\n  #prestasi .max-w-7xl { padding-left: 2rem; padding-right: 2rem; }\n  #prestasi article { padding: 1.5rem; }\n  #prestasi article .grid { gap: .75rem; }\n  #prestasi article .grid > div { border-radius: 1rem; }\n}\n\n@media (max-width: 767px) {\n  #prestasi { padding-top: 5rem; padding-bottom: 4rem; }\n  #prestasi .max-w-7xl { padding-left: .9rem; padding-right: .9rem; }\n  #prestasi .text-center { min-width: 0; }\n  #prestasi .text-center > p { max-width: 42rem; margin-left: auto; margin-right: auto; font-size: .82rem; line-height: 1.55; }\n  #prestasi .inline-flex { max-width: 100%; }\n  #prestasi .mb-12 { margin-bottom: 2rem; }\n  #prestasi .grid.grid-cols-1.xl\\:grid-cols-2 { grid-template-columns: minmax(0, 1fr) !important; gap: 1rem !important; }\n  #prestasi article { width: 100%; padding: .9rem !important; border-radius: 1.25rem !important; }\n  #prestasi article > .relative.z-10.flex { align-items: flex-start; margin-bottom: 1rem; gap: .65rem; }\n  #prestasi article > .relative.z-10.flex > div { min-width: 0; flex: 1 1 auto; }\n  #prestasi article > .relative.z-10.flex h4 { font-size: 1rem; line-height: 1.25; }\n  #prestasi article > .relative.z-10.flex > svg { width: 24px; height: 24px; margin-top: .1rem; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; gap: .7rem !important; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 > div { border-radius: 1rem; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .grid.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: .45rem !important; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .aspect-\\[3\\/4\\] { min-height: 155px; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .text-sm { font-size: .82rem; line-height: 1.25; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .text-\\[10px\\] { font-size: .62rem; }\n  #prestasi article > .relative.z-10.mt-5 { margin-top: 1rem; padding-top: .8rem; font-size: .68rem; line-height: 1.35; }\n  #prestasi > .relative.z-10 > .grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3 { grid-template-columns: minmax(0, 1fr) !important; gap: .8rem !important; }\n  #prestasi > .relative.z-10 > .grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3 > * { width: 100%; min-width: 0; }\n}\n\n@media (max-width: 380px) {\n  #prestasi .max-w-7xl { padding-left: .7rem; padding-right: .7rem; }\n  #prestasi article { padding: .75rem !important; }\n  #prestasi article > .relative.z-10.flex h4 { font-size: .92rem; }\n  #prestasi article .grid.grid-cols-2.md\\:grid-cols-4 .aspect-\\[3\\/4\\] { min-height: 135px; }\n}\n`;
    fs.writeFileSync(cssPath, css, 'utf8');
    console.log('[patch-public-player-photo-focus] responsive Prestasi polish applied.');
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-player-photo-focus] full-photo fit + face-aware focus applied safely.');
