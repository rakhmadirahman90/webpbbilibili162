import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');
let changed = false;

const marker = `interface ImagePopupProps {\n  activeView?: string | null;\n}`;

const helper = `const isHomeRoute = () => {\n  if (typeof window === 'undefined') return true;\n  const path = window.location.pathname.replace(/\\/+$/, '').toLowerCase();\n  return path === '' || path === '/home' || path === '/beranda';\n};\n\n`;

if (!source.includes('const isHomeRoute = () =>')) {
  if (!source.includes(marker)) throw new Error('[popup-home-only] ImagePopupProps marker not found');
  source = source.replace(marker, `${helper}${marker}`);
  changed = true;
}

const fetchGuard = `      // Popup is strictly a home-page feature. Never load or display it on sub-pages.\n      if (!isHomeRoute() || activeView !== null) {\n        setPromoImages([]);\n        setIsOpen(false);\n        return;\n      }\n\n`;
const fetchTarget = `      // If user is currently on a full subpage view (not home session), don't show popup\n      if (activeView !== null) {\n        setIsOpen(false);\n        return;\n      }\n\n`;
if (source.includes(fetchTarget) && !source.includes('// Popup is strictly a home-page feature.')) {
  source = source.replace(fetchTarget, fetchGuard);
  changed = true;
}

const renderGuard = `  if (!isHomeRoute() || activeView !== null) return null;\n  if (promoImages.length === 0 || !isOpen) return null;`;
const renderTarget = `  if (promoImages.length === 0 || !isOpen) return null;`;
if (source.includes(renderTarget) && !source.includes('if (!isHomeRoute() || activeView !== null) return null;')) {
  source = source.replace(renderTarget, renderGuard);
  changed = true;
}

const effectTarget = `  useEffect(() => {\n    if (activeView !== null) {\n      setIsOpen(false);\n      isDismissedRef.current = false;\n    } else {\n      isDismissedRef.current = false;\n      fetchActivePopups(true);\n    }\n    prevActiveViewRef.current = activeView;\n  }, [activeView]);`;
const effectReplacement = `  useEffect(() => {\n    const syncPopupToRoute = () => {\n      const home = isHomeRoute() && activeView === null;\n      if (!home) {\n        setPromoImages([]);\n        setIsOpen(false);\n        isDismissedRef.current = false;\n        return;\n      }\n      isDismissedRef.current = false;\n      fetchActivePopups(true);\n    };\n\n    syncPopupToRoute();\n    window.addEventListener('popstate', syncPopupToRoute);\n    return () => window.removeEventListener('popstate', syncPopupToRoute);\n  }, [activeView]);`;
if (source.includes(effectTarget) && !source.includes('syncPopupToRoute')) {
  source = source.replace(effectTarget, effectReplacement);
  changed = true;
}

// POPUP_SWIPE_V2: make mobile/desktop horizontal swipe between active popups reliable.
if (!source.includes('POPUP_SWIPE_V2')) {
  const refTarget = `  const isDismissedRef = useRef<boolean>(false);`;
  const refReplacement = `${refTarget}\n  const isSwipingRef = useRef<boolean>(false);`;
  if (!source.includes(refTarget)) throw new Error('[popup-swipe-v2] dismissed ref target not found');
  source = source.replace(refTarget, refReplacement);

  const dragTarget = `  const handleDragEnd = (e: any, { offset, velocity }: any) => {\n    const swipe = Math.abs(offset.x) > 50; \n    if (swipe) {\n      if (offset.x < 0) {\n        setCurrentIndex((prev) => (prev + 1) % promoImages.length);\n      } else {\n        setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);\n      }\n    }\n  };`;
  const dragReplacement = `  // POPUP_SWIPE_V2: horizontal gesture is intentionally isolated from vertical content scroll.\n  const handleDragStart = () => {\n    isSwipingRef.current = true;\n  };\n\n  const handleDragEnd = (_e: any, { offset, velocity }: any) => {\n    isSwipingRef.current = false;\n    if (promoImages.length <= 1) return;\n\n    const distance = Math.abs(offset?.x || 0);\n    const speed = Math.abs(velocity?.x || 0);\n    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 360;\n    const threshold = Math.max(48, Math.min(90, viewportWidth * 0.14));\n    const committed = distance >= threshold || (speed >= 550 && distance >= 24);\n\n    if (!committed) return;\n\n    if ((offset?.x || 0) < 0) {\n      setCurrentIndex((prev) => (prev + 1) % promoImages.length);\n    } else {\n      setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);\n    }\n  };`;
  if (!source.includes(dragTarget)) throw new Error('[popup-swipe-v2] drag handler target not found');
  source = source.replace(dragTarget, dragReplacement);

  const motionTarget = `                <motion.div \n                  drag="x"\n                  dragConstraints={{ left: 0, right: 0 }}\n                  onDragEnd={handleDragEnd}\n                  className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"\n                >`;
  const motionReplacement = `                <motion.div \n                  drag="x"\n                  dragDirectionLock\n                  dragConstraints={{ left: 0, right: 0 }}\n                  dragElastic={{ left: 0.16, right: 0.16 }}\n                  dragMomentum={false}\n                  dragTransition={{ bounceStiffness: 500, bounceDamping: 38 }}\n                  onDragStart={handleDragStart}\n                  onDragEnd={handleDragEnd}\n                  style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}\n                  whileTap={{ scale: 0.995 }}\n                  className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"\n                >`;
  if (!source.includes(motionTarget)) throw new Error('[popup-swipe-v2] draggable image target not found');
  source = source.replace(motionTarget, motionReplacement);

  const autoScrollTarget = `          if (scrollRef.current) {\n            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;`;
  const autoScrollReplacement = `          if (scrollRef.current && !isSwipingRef.current) {\n            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;`;
  if (source.includes(autoScrollTarget)) {
    source = source.replace(autoScrollTarget, autoScrollReplacement);
  }

  changed = true;
}

if (changed) {
  fs.writeFileSync(file, source, 'utf8');
  console.log('[popup-home-only] Home-only + smooth popup swipe patch applied.');
} else {
  console.log('[popup-home-only] Already patched.');
}
