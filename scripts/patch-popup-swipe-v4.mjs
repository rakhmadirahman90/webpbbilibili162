import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('POPUP_SWIPE_V4')) {
  const refTarget = `  const isDismissedRef = useRef<boolean>(false);`;
  const refReplacement = `${refTarget}\n\n  // POPUP_SWIPE_V4: pointer gesture is attached to the entire popup card.\n  // Vertical movement remains native scrolling; horizontal movement changes popup index.\n  const swipeRef = useRef({\n    pointerId: null as number | null,\n    startX: 0,\n    startY: 0,\n    active: false,\n    horizontal: false\n  });`;
  if (!source.includes(refTarget)) throw new Error('[popup-swipe-v4] dismissed ref target not found');
  source = source.replace(refTarget, refReplacement);
}

const dragReplacement = `  // POPUP_SWIPE_V4: reliable mobile + desktop pointer swipe.\n  const changePopupBySwipe = (direction: 1 | -1) => {\n    if (promoImages.length <= 1) return;\n    setIsExpanded(false);\n    setCurrentIndex((prev) => {\n      const next = prev + direction;\n      return (next + promoImages.length) % promoImages.length;\n    });\n  };\n\n  const handleSwipePointerDown = (e: any) => {\n    if (promoImages.length <= 1) return;\n    if (e.pointerType === 'mouse' && e.button !== 0) return;\n    const target = e.target as HTMLElement;\n    if (target.closest('button, a, input, textarea, select')) return;\n    swipeRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: true, horizontal: false };\n  };\n\n  const handleSwipePointerMove = (e: any) => {\n    const state = swipeRef.current;\n    if (!state.active || state.pointerId !== e.pointerId) return;\n    const dx = e.clientX - state.startX;\n    const dy = e.clientY - state.startY;\n    if (!state.horizontal) {\n      const distance = Math.hypot(dx, dy);\n      if (distance < 8) return;\n      if (Math.abs(dx) <= Math.abs(dy) * 1.05) { state.active = false; return; }\n      state.horizontal = true;\n    }\n    if (e.cancelable) e.preventDefault();\n  };\n\n  const handleSwipePointerUp = (e: any) => {\n    const state = swipeRef.current;\n    if (!state.active || state.pointerId !== e.pointerId) return;\n    const dx = e.clientX - state.startX;\n    const threshold = Math.max(30, Math.min(75, window.innerWidth * 0.12));\n    const horizontal = state.horizontal;\n    state.active = false;\n    state.horizontal = false;\n    state.pointerId = null;\n    if (horizontal && Math.abs(dx) >= threshold) changePopupBySwipe(dx < 0 ? 1 : -1);\n  };\n\n  const handleSwipePointerCancel = () => {\n    swipeRef.current.active = false;\n    swipeRef.current.horizontal = false;\n    swipeRef.current.pointerId = null;\n  };`;

// Replace any existing legacy drag handler, regardless of whitespace/formatting.
const handlerRegex = /  const handleDragEnd = \(e: any, \{ offset, velocity \}: any\) => \{[\s\S]*?\n  \};/;
if (handlerRegex.test(source)) {
  source = source.replace(handlerRegex, dragReplacement);
} else if (!source.includes('const changePopupBySwipe')) {
  throw new Error('[popup-swipe-v4] swipe handler target not found');
}

const cardRegex = /          className="relative w-full max-w-\[calc\(100vw-2rem\)\] sm:max-w-\[420px\] max-h-\[85vh\] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"\n          (?:style=\{\{[^\n]+\}\}\n          )?onClick=\{\(e\) => e\.stopPropagation\(\)\}\n        >/;
const cardReplacement = `          className="relative w-full max-w-[calc(100vw-2rem)] sm:max-w-[420px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"\n          style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}\n          onPointerDown={handleSwipePointerDown}\n          onPointerMove={handleSwipePointerMove}\n          onPointerUp={handleSwipePointerUp}\n          onPointerCancel={handleSwipePointerCancel}\n          onClick={(e) => e.stopPropagation()}\n        >`;
if (cardRegex.test(source)) source = source.replace(cardRegex, cardReplacement);
else if (!source.includes('onPointerDown={handleSwipePointerDown}')) throw new Error('[popup-swipe-v4] popup card target not found');

const innerDragRegex = /                 <motion\.div \n                  drag="x"\n                  dragConstraints=\{\{ left: 0, right: 0 \}\}\n                  onDragEnd=\{handleDragEnd\}\n                  className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"\n                >/;
const innerDragReplacement = `                 <div \n                  className="relative w-full bg-slate-950 shrink-0 overflow-hidden flex items-center justify-center"\n                >`;
if (innerDragRegex.test(source)) source = source.replace(innerDragRegex, innerDragReplacement);

const innerCloseRegex = /                <\/motion\.div>\n\n                <div className="px-6 pt-2 pb-8 bg-white">/;
if (innerCloseRegex.test(source)) source = source.replace(innerCloseRegex, `                </div>\n\n                <div className="px-6 pt-2 pb-8 bg-white">`);

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-swipe-v4] popup-wide pointer swipe applied successfully');
