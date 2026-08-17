import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');

// Replace the legacy drag callback with a touch-only swipe handler before the
// production cleanup runs. This prevents stale/legacy handleDragEnd references
// from ever reaching the browser bundle while preserving mobile popup swipe.
if (source.includes('handleDragEnd')) {
  const legacy = /\n\s*const handleDragEnd\s*=\s*\(e: any, \{ offset, velocity \}: any\) => \{[\s\S]*?\n\s*\};/;
  const replacement = `\n  const swipeStartXRef = useRef<number | null>(null);\n\n  const handleSwipeStart = (e: any) => {\n    const touch = e?.touches?.[0];\n    if (touch) swipeStartXRef.current = touch.clientX;\n  };\n\n  const handleSwipeEnd = (e: any) => {\n    const startX = swipeStartXRef.current;\n    swipeStartXRef.current = null;\n    const endX = e?.changedTouches?.[0]?.clientX;\n    if (startX === null || endX === undefined || promoImages.length < 2) return;\n\n    const deltaX = endX - startX;\n    if (Math.abs(deltaX) < 50) return;\n\n    if (deltaX < 0) {\n      setCurrentIndex((prev) => (prev + 1) % promoImages.length);\n    } else {\n      setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);\n    }\n  };`;
  source = source.replace(legacy, replacement);
}

source = source.replace(/\n\s*drag="x"/g, '');
source = source.replace(/\n\s*dragConstraints=\{\{\s*left:\s*0,\s*right:\s*0\s*\}\}/g, '');
source = source.replace(/\n\s*onDragEnd=\{handleDragEnd\}/g, '');

// Attach the safe touch handlers to the popup banner container.
source = source.replace(
  /(<motion\.div\s+\n\s+className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center")/,
  '$1\n                  onTouchStart={handleSwipeStart}\n                  onTouchEnd={handleSwipeEnd}'
);

if (/handleDragEnd/.test(source)) {
  throw new Error('Popup hardening failed: handleDragEnd reference remains');
}

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-runtime-hardening] legacy drag callback removed; touch swipe enabled');
