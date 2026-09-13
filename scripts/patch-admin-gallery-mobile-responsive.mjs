import fs from 'node:fs';

const file = 'src/components/AdminGallery.tsx';
if (!fs.existsSync(file)) {
  console.warn('[patch-admin-gallery-mobile-responsive] AdminGallery.tsx not found; skipped.');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');
const original = source;

// Remove any previously generated CSS template literal before Vite parses TSX.
source = source.replace(/\s*<style>\{`[\s\S]*?\.admin-gallery-modal[\s\S]*?`\}<\/style>\s*/g, '\n');
source = source.replace(/\s*<style>\{`[\s\S]*?admin-gallery-form[\s\S]*?`\}<\/style>\s*/g, '\n');

const replacements = [
  ['fixed inset-0 z-[250] bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto', 'fixed inset-0 z-[250] bg-black/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto overflow-x-hidden w-full max-w-[100vw]'],
  ['className="w-full max-w-4xl rounded-3xl bg-[#0d1423] border border-white/10 shadow-2xl overflow-hidden"', 'className="w-full max-w-4xl min-w-0 max-w-[calc(100vw-16px)] rounded-3xl bg-[#0d1423] border border-white/10 shadow-2xl overflow-hidden"'],
  ['<div className="p-5 sm:p-7 grid lg:grid-cols-[1fr_1.05fr] gap-7">', '<div className="p-3 sm:p-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-5 sm:gap-7 min-w-0 w-full">'],
  ['<div className="space-y-5">', '<div className="space-y-5 min-w-0 w-full">'],
  ['<div className="rounded-3xl bg-black/20 border border-white/5 p-4 sm:p-5 min-h-[300px]">', '<div className="rounded-3xl bg-black/20 border border-white/5 p-3 sm:p-5 min-h-[260px] min-w-0 w-full overflow-hidden">'],
  ['<div className="flex items-center justify-between p-5 sm:p-7 border-b border-white/10">', '<div className="flex items-center justify-between gap-3 p-4 sm:p-7 border-b border-white/10 min-w-0">'],
  ['<div><h2 className="text-xl sm:text-2xl font-black uppercase">', '<div className="min-w-0 flex-1"><h2 className="text-xl sm:text-2xl font-black uppercase break-words">'],
  ['<div className="grid grid-cols-2 gap-3">', '<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full">'],
];
for (const [from, to] of replacements) if (source.includes(from)) source = source.replace(from, to);

// Force the common field containers to stack on phones. This specifically
// fixes the label/input layout shown on narrow Android screens.
source = source.replace(/className="([^\"]*?)grid grid-cols-2([^\"]*)"/g, (full, before, after) => {
  if (/sm:grid-cols-2/.test(full)) return full;
  return `className="${before}grid-cols-1 sm:grid-cols-2${after}"`;
});

// Ensure all form controls can shrink instead of preserving a long-content width.
source = source.replace(/className="([^"]*)"/g, (full, classes) => {
  if (!/\b(?:w-full|px-3|px-4)\b/.test(classes)) return full;
  if (!/(input|select|textarea)/i.test(classes) && !/mt-2/.test(classes)) return full;
  if (/\bmin-w-0\b/.test(classes)) return full;
  return `className="${classes} min-w-0 max-w-full"`;
});

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('[patch-admin-gallery-mobile-responsive] mobile overflow + JSX safety fix applied.');
} else {
  console.log('[patch-admin-gallery-mobile-responsive] no changes needed.');
}
