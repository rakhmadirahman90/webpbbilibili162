import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');
const original = source;

const replacements = [
  [
    "import { useState, useMemo, useEffect, useCallback, useRef } from 'react';",
    "import { useState, useMemo, useEffect, useCallback, useRef } from 'react';\nimport { createPortal } from 'react-dom';"
  ],
  [
    'gallery-lightbox fixed inset-0 z-[110000] bg-white text-slate-900 overflow-y-auto flex flex-col',
    'gallery-lightbox fixed inset-0 z-[2147483000] bg-white text-slate-900 overflow-hidden flex flex-col h-[100dvh] w-screen'
  ],
  [
    'sticky top-0 bg-[#0b1224] text-white px-4 py-3 md:py-4 flex items-center justify-between z-[110] shadow-md',
    'sticky top-0 bg-[#0b1224] text-white px-4 py-3 md:py-4 flex items-center justify-between z-[110] shadow-md shrink-0 min-h-16'
  ],
  [
    'w-full flex-grow bg-white pb-20',
    'w-full flex-1 min-h-0 bg-white overflow-hidden flex flex-col'
  ],
  [
    'w-full bg-[#030712] relative h-[38vh] sm:h-[48vh] md:h-[58vh] lg:h-[65vh] overflow-hidden flex items-center justify-center border-b border-slate-900/40',
    'w-full bg-[#030712] relative h-[34dvh] sm:h-[48dvh] md:h-[58dvh] lg:h-[65dvh] overflow-hidden flex items-center justify-center border-b border-slate-900/40 shrink-0'
  ],
  [
    'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8',
    'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 sm:mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain'
  ],
  [
    'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0f172a] mb-4 uppercase leading-tight',
    'text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0f172a] mb-2 sm:mb-4 uppercase leading-tight line-clamp-2'
  ],
  [
    'border-b border-gray-100 pb-4 mb-6',
    'border-b border-gray-100 pb-3 sm:pb-4 mb-3 sm:mb-6'
  ],
  [
    'bg-slate-50 border-l-4 border-blue-600 p-5 rounded-r-2xl mb-8',
    'bg-slate-50 border-l-4 border-blue-600 p-3 sm:p-5 rounded-r-2xl mb-3 sm:mb-8 max-h-[22dvh] sm:max-h-none overflow-hidden'
  ],
  [
    'text-slate-700 text-sm sm:text-base leading-relaxed italic font-medium',
    'text-slate-700 text-xs sm:text-base leading-relaxed italic font-medium line-clamp-4 sm:line-clamp-none'
  ],
  [
    '{images.length > 1 && <div className="mt-8 pt-6 border-t border-gray-100">',
    '{images.length > 1 && <div className="hidden sm:block mt-8 pt-6 border-t border-gray-100">'
  ],
  [
    '<div className="mt-12 p-6 bg-slate-50 rounded-2xl',
    '<div className="hidden sm:flex mt-12 p-6 bg-slate-50 rounded-2xl'
  ],
  [
    '<div className="mt-16 pb-10"><button',
    '<div className="hidden sm:block mt-16 pb-10"><button'
  ],
  [
    'return (\n            <div className="gallery-lightbox',
    'return createPortal((\n            <div className="gallery-lightbox'
  ],
  [
    '            </div>\n          );\n        })()}',
    '            </div>\n          ), document.body);\n        })()}'
  ]
];

let changed = 0;
for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.replace(from, to);
    changed++;
  }
}

// Lock the page behind the fullscreen gallery detail on mobile and desktop.
const effectMarker = "  useEffect(() => {\n    window.dispatchEvent(new CustomEvent(selectedId ? 'pb-overlay-open' : 'pb-overlay-close'));";
const effectReplacement = "  useEffect(() => {\n    const previousOverflow = document.body.style.overflow;\n    if (selectedId) document.body.style.overflow = 'hidden';\n    else document.body.style.overflow = previousOverflow || '';\n    window.dispatchEvent(new CustomEvent(selectedId ? 'pb-overlay-open' : 'pb-overlay-close'));";
if (source.includes(effectMarker) && !source.includes("const previousOverflow = document.body.style.overflow;")) {
  source = source.replace(effectMarker, effectReplacement);
  source = source.replace(
    "    return () => window.dispatchEvent(new CustomEvent('pb-overlay-close'));\n  }, [selectedId]);",
    "    return () => {\n      document.body.style.overflow = previousOverflow;\n      window.dispatchEvent(new CustomEvent('pb-overlay-close'));\n    };\n  }, [selectedId]);"
  );
  changed++;
}

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log(`[patch-gallery-mobile-detail] applied ${changed} fullscreen gallery fixes`);
} else {
  console.log('[patch-gallery-mobile-detail] no changes needed');
}
