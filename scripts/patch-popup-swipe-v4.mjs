import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('POPUP_SWIPE_V4')) {
  console.log('[popup-swipe-v4] already applied');
  process.exit(0);
}

const refTarget = `  const isDismissedRef = useRef<boolean>(false);`;
const refReplacement = `${refTarget}\n\n  // POPUP_SWIPE_V4: pointer gesture is attached to the entire popup card.\n  // Vertical movement remains native scrolling; horizontal movement changes popup index.\n  const swipeRef = useRef({\n    pointerId: null as number | null,\n    startX: 0,\n    startY: 0,\n    active: false,\n    horizontal: false\n  });`;
if (!source.includes(refTarget)) throw new Error('[popup-swipe-v4] dismissed ref target not found');
source = source.replace(refTarget, refReplacement);

const dragTarget = `  const handleDragEnd = (e: any, { offset, velocity }: any) => {\n    const swipe = Math.abs(offset.x) > 50; \n    if (swipe) {\n      if (offset.x < 0) {\n        setCurrentIndex((prev) => (prev + 1) % promoImages.length);\n      } else {\n        setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);\n      }\n    }\n  };`;
const dragReplacement = `  // POPUP_SWIPE_V4: reliable mobile + desktop pointer swipe.\n  const changePopupBySwipe = (direction: 1 | -1) => {\n    if (promoImages.length <= 1) return;\n    setIsExpanded(false);\n    setCurrentIndex((prev) => {\n      const next = prev + direction;\n      return (next + promoImages.length) % promoImages.length;\n    });\n  };\n\n  const handleSwipePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {\n    if (promoImages.length <= 1) return;\n    if (e.pointerType === 'mouse' && e.button !== 0) return;\n\n    const target = e.target as HTMLElement;\n    if (target.closest('button, a, input, textarea, select')) return;\n\n    swipeRef.current = {\n      pointerId: e.pointerId,\n      startX: e.clientX,\n      startY: e.clientY,\n      active: true,\n      horizontal: false\n    };\n  };\n\n  const handleSwipePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {\n    const state = swipeRef.current;\n    if (!state.active || state.pointerId !== e.pointerId) return;\n\n    const dx = e.clientX - state.startX;\n    const dy = e.clientY - state.startY;\n\n    if (!state.horizontal) {\n      const distance = Math.hypot(dx, dy);\n      if (distance < 10) return;\n\n      // Lock the gesture to horizontal only when horizontal movement clearly wins.\n      if (Math.abs(dx) <= Math.abs(dy) * 1.15) {\n        state.active = false;\n        return;\n      }\n      state.horizontal = true;\n    }\n\n    // Once horizontal is locked, prevent the browser's horizontal gesture/navigation.\n    e.preventDefault();\n  };\n\n  const finishSwipe = (e: React.PointerEvent<HTMLDivElement>) => {\n    const state = swipeRef.current;\n    if (!state.active || state.pointerId !== e.pointerId) return;\n\n    const dx = e.clientX - state.startX;\n    const threshold = Math.max(42, Math.min(90, window.innerWidth * 0.14));\n    const horizontal = state.horizontal;\n\n    swipeRef.current.active = false;\n    swipeRef.current.horizontal = false;\n    swipeRef.current.pointerId = null;\n\n    if (!horizontal || Math.abs(dx) < threshold) return;\n    changePopupBySwipe(dx < 0 ? 1 : -1);\n  };\n\n  const handleSwipePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {\n    finishSwipe(e);\n  };\n\n  const handleSwipePointerCancel = () => {\n    swipeRef.current.active = false;\n    swipeRef.current.horizontal = false;\n    swipeRef.current.pointerId = null;\n  };`;
if (!source.includes(dragTarget)) throw new Error('[popup-swipe-v4] drag handler target not found');
source = source.replace(dragTarget, dragReplacement);

const cardTarget = `          className="relative w-full max-w-[calc(100vw-2rem)] sm:max-w-[420px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"\n          onClick={(e) => e.stopPropagation()}\n        >`;
const cardReplacement = `          className="relative w-full max-w-[calc(100vw-2rem)] sm:max-w-[420px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"\n          style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}\n          onPointerDown={handleSwipePointerDown}\n          onPointerMove={handleSwipePointerMove}\n          onPointerUp={handleSwipePointerUp}\n          onPointerCancel={handleSwipePointerCancel}\n          onClick={(e) => e.stopPropagation()}\n        >`;
if (!source.includes(cardTarget)) throw new Error('[popup-swipe-v4] popup card target not found');
source = source.replace(cardTarget, cardReplacement);

const innerDragTarget = `                 <motion.div \n                  drag="x"\n                  dragConstraints={{ left: 0, right: 0 }}\n                  onDragEnd={handleDragEnd}\n                  className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"\n                >`;
const innerDragReplacement = `                 <div \n                  className="relative w-full bg-slate-950 shrink-0 overflow-hidden flex items-center justify-center"\n                >`;
if (!source.includes(innerDragTarget)) throw new Error('[popup-swipe-v4] inner draggable image target not found');
source = source.replace(innerDragTarget, innerDragReplacement);

// The inner banner was the old drag surface. It is now a normal div because the whole card owns the pointer gesture.
const innerCloseTarget = `                </motion.div>\n\n                <div className="px-6 pt-2 pb-8 bg-white">`;
const innerCloseReplacement = `                </div>\n\n                <div className="px-6 pt-2 pb-8 bg-white">`;
if (!source.includes(innerCloseTarget)) throw new Error('[popup-swipe-v4] inner banner closing tag not found');
source = source.replace(innerCloseTarget, innerCloseReplacement);

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-swipe-v4] popup-wide pointer swipe applied successfully');
