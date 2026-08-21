import fs from 'node:fs';

const file = 'src/components/PublicNewsModern.tsx';
let source = fs.readFileSync(file, 'utf8');
const original = source;

const replacements = [
  [
    'fixed inset-0 z-[100000] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-5',
    'fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-5 h-[100dvh] w-screen overflow-hidden'
  ],
  [
    'max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl',
    'h-[100dvh] max-h-[100dvh] w-full overflow-hidden rounded-none bg-white shadow-2xl flex flex-col sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-3xl'
  ],
  [
    'sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5',
    'sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5'
  ],
  [
    'aspect-[16/9] w-full object-cover',
    'h-[28dvh] max-h-[280px] w-full shrink-0 object-cover sm:aspect-[16/9] sm:h-auto sm:max-h-none'
  ],
  [
    '<div className="p-5 sm:p-7">',
    '<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-5 sm:p-7">'
  ],
  [
    'text-2xl font-black leading-tight text-slate-900 sm:text-3xl',
    'text-xl font-black leading-tight text-slate-900 sm:text-3xl'
  ],
  [
    'mt-5 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base',
    'mt-4 whitespace-pre-line text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7'
  ]
];

let changed = 0;
for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.replace(from, to);
    changed++;
  }
}

const marker = '<style data-public-news-mobile-detail="true">';
if (!source.includes(marker)) {
  source = source.replace(
    '\n  return (\n    <main\n',
    `\n  return (\n    <style data-public-news-mobile-detail="true">{\`\n      @media (max-width: 639px) {\n        .public-news-modern { width: 100%; max-width: 100vw; overflow-x: hidden; }\n        .public-news-modern .fixed { max-width: 100vw; }\n      }\n    \`}</style>\n    <main\n`
  );
  changed++;
}

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log(`[patch-public-news-mobile-detail] applied ${changed} responsive changes`);
} else {
  console.log('[patch-public-news-mobile-detail] no changes needed');
}
