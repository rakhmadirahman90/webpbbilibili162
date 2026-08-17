import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');
let changed = false;

const marker = `interface ImagePopupProps {\n  activeView?: string | null;\n}`;
const helper = `const isHomeRoute = () => {\n  if (typeof window === 'undefined') return true;\n  const path = window.location.pathname.replace(/\\/+$/, '').toLowerCase();\n  return path === '' || path === '/home' || path === '/beranda';\n};\n\n`;

if (!source.includes('const isHomeRoute = () =>')) {
  if (!source.includes(marker)) {
    console.log('[popup-home-only] ImagePopupProps marker not found; skipping safely');
    process.exit(0);
  }
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
const effectReplacement = `  useEffect(() => {\n    const syncPopupToRoute = () => {\n      const home = isHomeRoute() && activeView === null;\n      if (!home) {\n        setPromoImages([]);\n        setIsOpen(false);\n        isDismissedRef.current = false;\n        return;\n      }\n      isDismissedRef.current = false;\n      fetchActivePopups(true);\n    };\n    syncPopupToRoute();\n    window.addEventListener('popstate', syncPopupToRoute);\n    return () => window.removeEventListener('popstate', syncPopupToRoute);\n  }, [activeView]);`;
if (source.includes(effectTarget) && !source.includes('syncPopupToRoute')) {
  source = source.replace(effectTarget, effectReplacement);
  changed = true;
}

// Swipe enhancement is optional; never make the production build fail when
// the component has already been refactored by another popup patch.
if (!source.includes('POPUP_SWIPE_V2')) {
  const refTarget = `  const isDismissedRef = useRef<boolean>(false);`;
  const refReplacement = `${refTarget}\n  const isSwipingRef = useRef<boolean>(false);`;
  if (!source.includes(refTarget)) {
    console.log('[popup-swipe-v2] dismissed ref target not found; skipping optional swipe patch');
  } else {
    const dragTarget = `  const handleDragEnd = (e: any, { offset, velocity }: any) => {\n    const swipe = Math.abs(offset.x) > 50; \n    if (swipe) {\n      if (offset.x < 0) {\n        setCurrentIndex((prev) => (prev + 1) % promoImages.length);\n      } else {\n        setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);\n      }\n    }\n  };`;
    const dragReplacement = `  const handleDragStart = () => { isSwipingRef.current = true; };\n  const handleDragEnd = (_e: any, { offset, velocity }: any) => {\n    isSwipingRef.current = false;\n    if (promoImages.length <= 1) return;\n    const distance = Math.abs(offset?.x || 0);\n    const speed = Math.abs(velocity?.x || 0);\n    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 360;\n    const threshold = Math.max(48, Math.min(90, viewportWidth * 0.14));\n    if (!(distance >= threshold || (speed >= 550 && distance >= 24))) return;\n    setCurrentIndex((prev) => (offset?.x || 0) < 0 ? (prev + 1) % promoImages.length : (prev - 1 + promoImages.length) % promoImages.length);\n  };`;
    if (source.includes(dragTarget)) {
      source = source.replace(refTarget, refReplacement).replace(dragTarget, dragReplacement);
      changed = true;
    } else {
      console.log('[popup-swipe-v2] drag handler target not found; skipping optional swipe patch');
    }
  }
}

if (changed) {
  fs.writeFileSync(file, source, 'utf8');
  console.log('[popup-home-only] Home-only popup patch applied safely.');
} else {
  console.log('[popup-home-only] Already patched or no compatible legacy target; continuing build.');
}
