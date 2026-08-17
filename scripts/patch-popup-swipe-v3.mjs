import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('POPUP_SWIPE_V3')) {
  console.log('[popup-swipe-v3] already applied');
  process.exit(0);
}

const refTarget = '  const isDismissedRef = useRef<boolean>(false);';
const refReplacement = `${refTarget}\n  // POPUP_SWIPE_V3: native pointer gesture avoids Framer Motion/touch-scroll conflicts.\n  const popupSwipeStartRef = useRef<{ x: number; y: number } | null>(null);\n  const popupSwipeMovedRef = useRef(false);`;
if (!source.includes(refTarget)) throw new Error('[popup-swipe-v3] ref target not found');
source = source.replace(refTarget, refReplacement);

const handlerMarker = '  const closePopup = () => {';
const handlers = `  // POPUP_SWIPE_V3: reliable horizontal swipe between active popups.\n  const goToNextPopup = () => {\n    if (promoImages.length <= 1) return;\n    setCurrentIndex((prev) => (prev + 1) % promoImages.length);\n  };\n\n  const goToPreviousPopup = () => {\n    if (promoImages.length <= 1) return;\n    setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);\n  };\n\n  const handlePopupPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {\n    if (promoImages.length <= 1) return;\n    popupSwipeStartRef.current = { x: event.clientX, y: event.clientY };\n    popupSwipeMovedRef.current = false;\n    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}\n  };\n\n  const handlePopupPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {\n    const start = popupSwipeStartRef.current;\n    if (!start) return;\n    const dx = event.clientX - start.x;\n    const dy = event.clientY - start.y;\n    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {\n      popupSwipeMovedRef.current = true;\n    }\n  };\n\n  const handlePopupPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {\n    const start = popupSwipeStartRef.current;\n    popupSwipeStartRef.current = null;\n    if (!start || promoImages.length <= 1) return;\n\n    const dx = event.clientX - start.x;\n    const dy = event.clientY - start.y;\n    const distance = Math.abs(dx);\n    const speedThreshold = 0;\n    const threshold = Math.max(45, Math.min(90, (typeof window !== 'undefined' ? window.innerWidth : 360) * 0.13));\n\n    if (Math.abs(dx) <= Math.abs(dy) * 1.15 || distance < threshold) {\n      popupSwipeMovedRef.current = false;\n      return;\n    }\n\n    if (dx < -threshold || (dx < 0 && distance > speedThreshold && popupSwipeMovedRef.current)) {\n      goToNextPopup();\n    } else if (dx > threshold || (dx > 0 && distance > speedThreshold && popupSwipeMovedRef.current)) {\n      goToPreviousPopup();\n    }\n    popupSwipeMovedRef.current = false;\n  };\n\n`;
if (!source.includes('POPUP_SWIPE_V3: reliable horizontal swipe')) {
  if (!source.includes(handlerMarker)) throw new Error('[popup-swipe-v3] close handler target not found');
  source = source.replace(handlerMarker, `${handlers}${handlerMarker}`);
}

// Disable the competing Framer Motion drag listener and use native pointer gestures.
const motionRegex = /(<motion\.div\s+)([\s\S]*?)(\s+className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"\s*>)/;
const match = source.match(motionRegex);
if (!match) throw new Error('[popup-swipe-v3] popup image motion container not found');

const attrs = match[2];
const cleanedAttrs = attrs
  .replace(/\s+drag="x"/g, '')
  .replace(/\s+dragDirectionLock/g, '')
  .replace(/\s+dragConstraints=\{\{ left: 0, right: 0 \}\}/g, '')
  .replace(/\s+dragElastic=\{\{ left: 0\.16, right: 0\.16 \}\}/g, '')
  .replace(/\s+dragMomentum=\{false\}/g, '')
  .replace(/\s+dragTransition=\{\{ bounceStiffness: 500, bounceDamping: 38 \}\}/g, '')
  .replace(/\s+onDragStart=\{handleDragStart\}/g, '')
  .replace(/\s+onDragEnd=\{handleDragEnd\}/g, '')
  .replace(/\s+style=\{\{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' \}\}/g, '')
  .replace(/\s+whileTap=\{\{ scale: 0\.995 \}\}/g, '');

const replacement = `${match[1]}\n                  onPointerDown={handlePopupPointerDown}\n                  onPointerMove={handlePopupPointerMove}\n                  onPointerUp={handlePopupPointerUp}\n                  onPointerCancel={() => { popupSwipeStartRef.current = null; popupSwipeMovedRef.current = false; }}\n                  style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}${cleanedAttrs}${match[3]}`;
source = source.replace(motionRegex, replacement);

// Reuse the same navigation functions for any remaining Framer drag callback.
source = source.replace(/const handleDragEnd = \(_e: any, \{ offset, velocity \}: any\) => \{[\s\S]*?\n  \};/, 'const handleDragEnd = () => {};');

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-swipe-v3] Native pointer swipe applied.');
