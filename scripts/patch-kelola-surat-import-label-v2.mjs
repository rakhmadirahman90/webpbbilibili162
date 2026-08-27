import fs from 'node:fs';
const path = 'src/components/KelolaSurat.tsx';
let src = fs.readFileSync(path, 'utf8');
const malformed = `{formData.import_page_count && formData.import_page_count > 1 ? "Dokumen Import: " + formData.import_page_count + " Halaman" : "{formData.import_page_count && formData.import_page_count > 1 ? \`Halaman 1 dari \${formData.import_page_count} — Dokumen Import\` : "Halaman 1 dari 2 (Surat Utama - A4)"}"}`;
const fixed = `{formData.import_page_count && formData.import_page_count > 1 ? 'Dokumen Import: ' + formData.import_page_count + ' Halaman' : 'Halaman 1 dari 2 (Surat Utama - A4)'}`;
if (src.includes(malformed)) {
  src = src.replaceAll(malformed, fixed);
  fs.writeFileSync(path, src);
  console.log('Fixed malformed KelolaSurat import label v2.');
} else {
  console.log('Malformed KelolaSurat expression not found; no-op.');
}
