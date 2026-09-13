import fs from 'node:fs';

const file = 'src/components/AdminGallery.tsx';
if (!fs.existsSync(file)) {
  console.warn('[patch-admin-gallery-mobile-responsive] AdminGallery.tsx not found; skipped.');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');
const original = source;

// Remove a previously generated invalid <style>{`...`}</style> block if a
// failed build had written it into the working source. The responsive rules
// below use Tailwind classes only, so no runtime CSS template is required.
const badStyleStart = '      <style>{`\n        .admin-gallery-modal';
const badStyleEnd = '      `}</style>\n';
const badStart = source.indexOf(badStyleStart);
if (badStart !== -1) {
  const badEnd = source.indexOf(badStyleEnd, badStart);
  if (badEnd !== -1) source = source.slice(0, badStart) + source.slice(badEnd + badStyleEnd.length);
}

const replacements = [
  [
    'fixed inset-0 z-[250] bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto',
    'fixed inset-0 z-[250] bg-black/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto overflow-x-hidden w-full max-w-[100vw]'
  ],
  [
    'className="w-full max-w-4xl rounded-3xl bg-[#0d1423] border border-white/10 shadow-2xl overflow-hidden"',
    'className="w-full max-w-4xl min-w-0 rounded-3xl bg-[#0d1423] border border-white/10 shadow-2xl overflow-hidden"'
  ],
  [
    '<div className="p-5 sm:p-7 grid lg:grid-cols-[1fr_1.05fr] gap-7">',
    '<div className="p-3 sm:p-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-5 sm:gap-7 min-w-0">'
  ],
  [
    '<div className="space-y-5">',
    '<div className="space-y-5 min-w-0 w-full">'
  ],
  [
    '<div className="rounded-3xl bg-black/20 border border-white/5 p-4 sm:p-5 min-h-[300px]">',
    '<div className="rounded-3xl bg-black/20 border border-white/5 p-3 sm:p-5 min-h-[260px] min-w-0 w-full overflow-hidden">'
  ],
  [
    '<div className="flex items-center justify-between p-5 sm:p-7 border-b border-white/10">',
    '<div className="flex items-center justify-between gap-3 p-4 sm:p-7 border-b border-white/10 min-w-0">'
  ],
  [
    '<div><h2 className="text-xl sm:text-2xl font-black uppercase">',
    '<div className="min-w-0 flex-1"><h2 className="text-xl sm:text-2xl font-black uppercase break-words">'
  ],
  [
    '<div className="grid grid-cols-2 gap-3">',
    '<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">'
  ],
  [
    'className="mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"',
    'className="mt-2 w-full min-w-0 max-w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500"'
  ],
  [
    'className="mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"',
    'className="mt-2 w-full min-w-0 max-w-full bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"'
  ]
];

for (const [from, to] of replacements) {
  if (source.includes(from)) source = source.replace(from, to);
}

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('[patch-admin-gallery-mobile-responsive] responsive mobile modal fix applied safely.');
} else {
  console.log('[patch-admin-gallery-mobile-responsive] no changes needed.');
}
