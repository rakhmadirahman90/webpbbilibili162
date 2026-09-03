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
        if (!cancelled) setObjectPosition(\`${x.toFixed(1)}% \${y.toFixed(1)}%\`);
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

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-player-photo-focus] full-photo fit + face-aware focus applied safely.');
