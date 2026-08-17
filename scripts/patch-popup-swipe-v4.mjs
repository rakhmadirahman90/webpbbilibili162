import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');

// The current ImagePopup owns swipe navigation directly with native touch
// events. Do not inject the retired pointer-drag implementation into it.
if (source.includes('handleTouchStart') && source.includes("touchAction: 'pan-y'")) {
  console.log('[popup-swipe-v4] native touch swipe implementation already present; no patch needed');
  process.exit(0);
}

// Legacy compatibility for older ImagePopup revisions.
const refTarget = '  const isDismissedRef = useRef<boolean>(false);';
const swipeRefLine = '  const swipeRef = useRef({ pointerId: null as number | null, startX: 0, startY: 0, active: false, horizontal: false });';

if (!source.includes('POPUP_SWIPE_V4')) {
  if (!source.includes(refTarget)) {
    console.log('[popup-swipe-v4] no legacy target found; leaving current popup implementation unchanged');
    process.exit(0);
  }
  source = source.replace(refTarget, `${refTarget}\n\n  // POPUP_SWIPE_V4: safe pointer swipe on the entire popup card.\n${swipeRefLine}`);
}

if (!source.includes('const changePopupBySwipe')) {
  const legacyHandler = /\n\s*const handleDragEnd\s*=\s*\(e:\s*any,\s*\{[\s\S]*?\n\s*\};\n/;
  const swipeLogic = `\n  // POPUP_SWIPE_V4: reliable mobile + desktop pointer swipe.\n  const changePopupBySwipe = (direction: 1 | -1) => {\n    if (promoImages.length <= 1) return;\n    setIsExpanded(false);\n    setCurrentIndex((prev) => {\n      const next = prev + direction;\n      return (next + promoImages.length) % promoImages.length;\n    });\n  };\n\n  const handleSwipePointerDown = (e: any) => {\n    if (promoImages.length <= 1) return;\n    if (e.pointerType === 'mouse' && e.button !== 0) return;\n    const target = e.target as HTMLElement;\n    if (target.closest('button, a, input, textarea, select')) return;\n    swipeRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: true, horizontal: false };\n    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}\n  };\n\n  const handleSwipePointerMove = (e: any) => {\n    const state = swipeRef.current;\n    if (!state.active || state.pointerId !== e.pointerId) return;\n    const dx = e.clientX - state.startX;\n    const dy = e.clientY - state.startY;\n    if (!state.horizontal) {\n      if (Math.hypot(dx, dy) < 8) return;\n      if (Math.abs(dx) <= Math.abs(dy) * 1.05) { state.active = false; return; }\n      state.horizontal = true;\n    }\n    if (e.cancelable) e.preventDefault();\n  };\n\n  const handleSwipePointerUp = (e: any) => {\n    const state = swipeRef.current;\n    if (!state.active || state.pointerId !== e.pointerId) return;\n    const dx = e.clientX - state.startX;\n    const horizontal = state.horizontal;\n    state.active = false;\n    state.horizontal = false;\n    state.pointerId = null;\n    const threshold = Math.max(30, Math.min(75, window.innerWidth * 0.12));\n    if (horizontal && Math.abs(dx) >= threshold) changePopupBySwipe(dx < 0 ? 1 : -1);\n  };\n\n  const handleSwipePointerCancel = () => {\n    swipeRef.current.active = false;\n    swipeRef.current.horizontal = false;\n    swipeRef.current.pointerId = null;\n  };\n`;

  if (legacyHandler.test(source)) {
    source = source.replace(legacyHandler, swipeLogic);
  }
}

if (!source.includes('onPointerDown={handleSwipePointerDown}')) {
  const cardMarker = '          onClick={(e) => e.stopPropagation()}';
  if (source.includes(cardMarker)) {
    source = source.replace(cardMarker, `          style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}\n          onPointerDown={handleSwipePointerDown}\n          onPointerMove={handleSwipePointerMove}\n          onPointerUp={handleSwipePointerUp}\n          onPointerCancel={handleSwipePointerCancel}\n${cardMarker}`);
  }
}

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-swipe-v4] legacy compatibility patch applied');
