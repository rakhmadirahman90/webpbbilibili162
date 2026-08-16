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

if (changed) {
  fs.writeFileSync(file, source, 'utf8');
  console.log('[popup-home-only] Home-only popup guard applied.');
} else {
  console.log('[popup-home-only] Already patched.');
}
