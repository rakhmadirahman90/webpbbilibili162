import fs from 'node:fs';

const file = 'src/components/AdminPopup.tsx';
const source = fs.readFileSync(file, 'utf8');

// Compatibility guard: the current AdminPopup writes directly to Supabase.
// Older builds used persistPopups; never fail production builds when that
// legacy helper is absent.
if (!source.includes('const persistPopups = async')) {
  console.log('[popup-save] direct Supabase AdminPopup detected; legacy patch skipped');
  process.exit(0);
}

const persistStart = source.indexOf('  const persistPopups = async (updatedList: PopupConfig[]) => {');
const persistEnd = source.indexOf('  const loadJadwalLatihanTemplate', persistStart);
if (persistStart < 0 || persistEnd < 0) {
  console.log('[popup-save] legacy persistPopups boundary not found; skipping safely');
  process.exit(0);
}

const persistBlock = `  const persistPopups = async (updatedList: PopupConfig[]) => {
    const standardizedList = updatedList.map((item, idx) => ({
      ...item,
      urutan: idx,
    }));
    setPopups(standardizedList);
    const dbUpdates = standardizedList
      .filter(item => typeof item.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id))
      .map(({ id, urutan, judul, deskripsi, url_gambar, is_active, file_url }) => ({
        id, urutan, judul: judul || '', deskripsi: deskripsi || '', url_gambar: url_gambar || '', is_active: is_active ?? true, file_url: file_url || null
      }));
    if (dbUpdates.length) {
      const { error } = await supabase.from('konfigurasi_popup').upsert(dbUpdates, { onConflict: 'id' });
      if (error) throw error;
    }
  };

`;
let next = source.slice(0, persistStart) + persistBlock + source.slice(persistEnd);
next = next.replace("const newId = editingId || ('popup-' + Date.now());", "const newId = editingId || crypto.randomUUID();");
fs.writeFileSync(file, next, 'utf8');
console.log('[popup-save] legacy persistence patched');
