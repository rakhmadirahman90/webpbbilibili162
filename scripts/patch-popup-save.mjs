import fs from 'node:fs';

const file = 'src/components/AdminPopup.tsx';
let source = fs.readFileSync(file, 'utf8');

// SUPABASE_POPUP_DB_ONLY_V2
// konfigurasi_popup is the single source of truth. site_settings/API/local fallback
// must never override the database state used by the public popup.

const persistStart = source.indexOf('  const persistPopups = async (updatedList: PopupConfig[]) => {');
const persistEnd = source.indexOf('  const loadJadwalLatihanTemplate', persistStart);
if (persistStart < 0 || persistEnd < 0) {
  throw new Error('[popup-save] persistPopups boundary not found');
}

const persistBlock = `  const persistPopups = async (updatedList: PopupConfig[]) => {
    // SUPABASE_POPUP_DB_ONLY_V2: PostgreSQL table is the authoritative popup store.
    // The table uses UUID primary keys, so client-created rows must use UUIDs.
    const standardizedList = updatedList.map((item, idx) => ({
      id: String(item.id),
      urutan: idx,
      judul: item.judul || '',
      deskripsi: item.deskripsi || '',
      url_gambar: item.url_gambar || '',
      is_active: item.is_active === true,
      file_url: item.file_url || null,
    }));

    setPopups(standardizedList);

    try {
      const { data: existingRows, error: existingError } = await supabase
        .from('konfigurasi_popup')
        .select('id');
      if (existingError) throw existingError;

      if (standardizedList.length > 0) {
        const { error: upsertError } = await supabase
          .from('konfigurasi_popup')
          .upsert(standardizedList, { onConflict: 'id' });
        if (upsertError) throw upsertError;
      }

      // Keep deletes authoritative too: anything removed from the UI is removed from DB.
      const keepIds = new Set(standardizedList.map(item => item.id));
      const staleIds = (existingRows || [])
        .map((row: any) => String(row.id))
        .filter(id => !keepIds.has(id));

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('konfigurasi_popup')
          .delete()
          .in('id', staleIds);
        if (deleteError) throw deleteError;
      }

      broadcastDataChange('konfigurasi_popup', 'UPDATE', standardizedList);
      window.dispatchEvent(new CustomEvent('table_updated_konfigurasi_popup', {
        detail: { table: 'konfigurasi_popup', value: standardizedList }
      }));
    } catch (error: any) {
      console.error('[AdminPopup] Supabase persistence failed:', error);
      // Re-read the authoritative database state so the UI cannot lie about a failed save.
      try { await fetchPopups(true); } catch {}
      throw error;
    }
  };

`;
source = source.slice(0, persistStart) + persistBlock + source.slice(persistEnd);

// Postgres konfigurasi_popup.id is UUID. Do not create ids such as popup-<timestamp>.
source = source.replace(
  "const newId = editingId || ('popup-' + Date.now());",
  "const newId = editingId || crypto.randomUUID();"
);

// Remove the old direct write from handleSave. persistPopups performs one authoritative write.
const directSaveStart = source.indexOf('    // Attempt direct Supabase write safely');
const directSaveEnd = source.indexOf('    // Save to resilient site_settings & local storage backup', directSaveStart);
if (directSaveStart >= 0 && directSaveEnd >= 0) {
  source = source.slice(0, directSaveStart) + source.slice(directSaveEnd);
}

// The old comment + call now becomes the single persistence call.
source = source.replace(
  "    // Save to resilient site_settings & local storage backup\n    await persistPopups(updatedList);",
  "    try {\n      await persistPopups(updatedList);\n    } catch (err: any) {\n      Swal.fire('Gagal menyimpan', err?.message || 'Perubahan popup tidak tersimpan ke database.', 'error');\n      setIsSaving(false);\n      return;\n    }"
);

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-save] applied DB-only UUID-safe popup persistence');
