import fs from 'node:fs';

const file = 'src/components/KelolaSurat.tsx';
let source = fs.readFileSync(file, 'utf8');

const oldText = `      setIsModalOpen(false);\n      await fetchSurat();\n      Swal.fire({ toast: true, position: 'top-end', icon: 'success'`;
const newText = `      setIsModalOpen(false);\n      // Refresh is deliberately fire-and-forget. The save button must never wait on list refresh.\n      void fetchSurat().catch((refreshErr) => {\n        console.warn('[KelolaSurat] Background refresh failed after save:', refreshErr);\n      });\n      Swal.fire({ toast: true, position: 'top-end', icon: 'success'`;

if (source.includes(oldText)) {
  source = source.replace(oldText, newText);
  fs.writeFileSync(file, source, 'utf8');
  console.log('[KelolaSurat spinner fix] save no longer awaits fetchSurat');
} else {
  console.log('[KelolaSurat spinner fix] target not found; no change');
}
