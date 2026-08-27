import fs from 'node:fs';
const path = 'src/components/KelolaSurat.tsx';
const src = fs.readFileSync(path, 'utf8');
const start = src.indexOf('<div className="no-print no-export absolute top-2 right-3');
if (start === -1) { console.log('KelolaSurat import label marker not found; nothing to patch.'); process.exit(0); }
const end = src.indexOf('</div>', start);
if (end === -1) throw new Error('KelolaSurat import label closing div not found');
const block = src.slice(start, end + 6);
const fixed = `<div className="no-print no-export absolute top-2 right-3 text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">\n                              {formData.import_page_count && formData.import_page_count > 1 ? 'Dokumen Import: ' + formData.import_page_count + ' Halaman' : 'Halaman 1 dari 2 (Surat Utama - A4)'}\n                            </div>`;
if (block.includes("'Dokumen Import: '") && !block.includes('{formData.import_page_count && formData.import_page_count > 1 ? `')) {
  console.log('KelolaSurat import label already clean.');
  process.exit(0);
}
fs.writeFileSync(path, src.slice(0, start) + fixed + src.slice(end + 6));
console.log('Fixed malformed KelolaSurat import-page label.');
