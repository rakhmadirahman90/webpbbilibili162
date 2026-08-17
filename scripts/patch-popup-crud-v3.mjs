import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/AdminPopup.tsx');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('POPUP_CRUD_V3')) {
  console.log('[patch-popup-crud-v3] already applied');
  process.exit(0);
}

function replaceBlock(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) {
    console.error(`[patch-popup-crud-v3] target not found: ${label}`);
    process.exit(1);
  }
  source = next;
}

replaceBlock(
  /  const fetchPopups = async \(isSilent = false\) => \{[\s\S]*?\n  \};\n\n  useEffect\(\(\) => \{/, 
`  const fetchPopups = async (isSilent = false) => {
    if (!isSilent && popups.length === 0) setLoading(true);
    try {
      // POPUP_CRUD_V3: konfigurasi_popup is the single authoritative source.
      const { data, error } = await supabase
        .from('konfigurasi_popup')
        .select('*')
        .order('urutan', { ascending: true });
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const normalized = rows
        .filter((item: any) => item && item.id)
        .map((item: any, index: number) => ({
          id: String(item.id),
          judul: item.judul || '',
          deskripsi: item.deskripsi || '',
          url_gambar: item.url_gambar || '',
          file_url: item.file_url || '',
          is_active: item.is_active !== false,
          urutan: Number.isFinite(Number(item.urutan)) ? Number(item.urutan) : index
        }))
        .sort((a: PopupConfig, b: PopupConfig) => a.urutan - b.urutan);

      setPopups(normalized.length ? normalized : [OFFICIAL_LATEST_POPUP]);
    } catch (err: any) {
      console.error('[AdminPopup] Supabase read failed:', err);
      if (!isSilent && popups.length === 0) setPopups([OFFICIAL_LATEST_POPUP]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {`,
  'fetchPopups'
);

replaceBlock(
  /  const persistPopups = async \(updatedList: PopupConfig\[\]\) => \{[\s\S]*?\n  \};\n\n  const loadJadwalLatihanTemplate/, 
`  const persistPopups = async (updatedList: PopupConfig[]) => {
    // POPUP_CRUD_V3: normalize positions and persist every row to Supabase.
    const standardizedList = updatedList.map((item, idx) => ({
      id: item.id,
      urutan: idx,
      judul: item.judul || '',
      deskripsi: item.deskripsi || '',
      url_gambar: item.url_gambar || '',
      is_active: item.is_active !== false,
      file_url: item.file_url || null
    }));

    setPopups(standardizedList);

    try {
      // Use a temporary negative range first so future unique-order constraints cannot collide.
      if (standardizedList.length) {
        const tempRows = standardizedList.map((item, idx) => ({ ...item, urutan: -(idx + 1) }));
        const { error: tempError } = await supabase
          .from('konfigurasi_popup')
          .upsert(tempRows, { onConflict: 'id' });
        if (tempError) throw tempError;

        const { error: finalError } = await supabase
          .from('konfigurasi_popup')
          .upsert(standardizedList, { onConflict: 'id' });
        if (finalError) throw finalError;
      }

      // Remove stale rows that no longer exist in the canonical list.
      const keepIds = standardizedList.map(item => item.id);
      if (keepIds.length) {
        const { data: existing, error: readError } = await supabase
          .from('konfigurasi_popup')
          .select('id');
        if (readError) throw readError;
        const staleIds = (existing || []).map((row: any) => String(row.id)).filter((id: string) => !keepIds.includes(id));
        if (staleIds.length) {
          const { error: deleteError } = await supabase
            .from('konfigurasi_popup')
            .delete()
            .in('id', staleIds);
          if (deleteError) throw deleteError;
        }
      }

      // Keep legacy consumers synchronized, but never use them as the source of truth.
      try { await saveSiteSetting('popup_config', standardizedList, 'Konfigurasi Popup Promo'); } catch (e) {}
      try {
        await fetch('/api/konfigurasi-popup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(standardizedList)
        });
      } catch (e) {}

      broadcastDataChange('popup_config', 'UPDATE', standardizedList);
      broadcastDataChange('konfigurasi_popup', 'UPDATE', standardizedList);
      window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'popup_config', value: standardizedList } }));
      window.dispatchEvent(new CustomEvent('table_updated_popup_config'));
      window.dispatchEvent(new CustomEvent('table_updated_konfigurasi_popup'));
      await fetchPopups(true);
    } catch (err: any) {
      console.error('[AdminPopup] Supabase persistence failed:', err);
      await fetchPopups(true);
      throw err;
    }
  };

  const loadJadwalLatihanTemplate`,
  'persistPopups'
);

replaceBlock(
  /  const handleDragEnd = async \(event: DragEndEvent\) => \{[\s\S]*?\n  \};\n\n  const movePosition = async \(itemId: string, targetIndex: number\) => \{[\s\S]*?\n  \};\n\n  const handleImageUpload/, 
`  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = popups.findIndex(p => p.id === active.id);
    const newIndex = popups.findIndex(p => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newOrder = arrayMove(popups, oldIndex, newIndex).map((popup, index) => ({
      ...popup,
      urutan: index
    }));

    setIsSaving(true);
    try {
      await persistPopups(newOrder);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Urutan tersimpan di Supabase', showConfirmButton: false, timer: 1800 });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal menyimpan urutan', text: err?.message || 'Supabase gagal memperbarui urutan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const movePosition = async (itemId: string, targetIndex: number) => {
    const currentIndex = popups.findIndex(p => p.id === itemId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= popups.length || currentIndex === targetIndex) return;

    const newOrder = arrayMove(popups, currentIndex, targetIndex).map((popup, index) => ({
      ...popup,
      urutan: index
    }));

    setIsSaving(true);
    try {
      await persistPopups(newOrder);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: \`Dipindah ke Urutan \${targetIndex + 1}\`, showConfirmButton: false, timer: 1500 });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal mengubah posisi', text: err?.message || 'Supabase gagal memperbarui urutan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload`,
  'reorder functions'
);

replaceBlock(
  /  const handleSave = async \(e: React\.FormEvent\) => \{[\s\S]*?\n  \};\n\n  const startEdit/, 
`  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!newPopup.url_gambar) return Swal.fire('Oops!', 'Harap unggah gambar terlebih dahulu', 'warning');

    setIsSaving(true);
    const newId = editingId || ('popup-' + Date.now());
    const payload = {
      id: newId,
      judul: newPopup.judul.trim(),
      deskripsi: newPopup.deskripsi,
      url_gambar: newPopup.url_gambar,
      file_url: newPopup.file_url || null,
      is_active: true,
      urutan: editingId ? (popups.find(p => p.id === editingId)?.urutan ?? 0) : popups.length
    };

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .update({
            judul: payload.judul,
            deskripsi: payload.deskripsi,
            url_gambar: payload.url_gambar,
            file_url: payload.file_url,
            is_active: payload.is_active
          })
          .eq('id', editingId)
          .select('*')
          .single();
        if (error) throw error;
        if (!data) throw new Error('Supabase tidak mengembalikan data popup yang diperbarui.');
      } else {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .insert([payload])
          .select('*')
          .single();
        if (error) throw error;
        if (!data) throw new Error('Supabase tidak mengembalikan data popup baru.');
      }

      // Re-normalize all positions after every add/edit.
      const { data: rows, error: readError } = await supabase
        .from('konfigurasi_popup')
        .select('*')
        .order('urutan', { ascending: true });
      if (readError) throw readError;
      const normalized = (rows || []).map((row: any, index: number) => ({ ...row, urutan: index }));
      await persistPopups(normalized);

      setEditingId(null);
      setNewPopup({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
      setPreviewImage(null);
      Swal.fire({ title: 'Berhasil', text: editingId ? 'Pop-up diperbarui dan tersimpan di Supabase' : 'Pop-up baru tersimpan di Supabase', icon: 'success', background: '#0F172A', color: '#fff' });
    } catch (err: any) {
      console.error('[AdminPopup] save failed:', err);
      Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Pop-up', text: err?.message || 'Supabase menolak perubahan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit`,
  'handleSave'
);

replaceBlock(
  /  const toggleStatus = async \(id: string, currentStatus: boolean\) => \{[\s\S]*?\n  \};\n\n  const handleDelete = async \(id: string\) => \{[\s\S]*?\n  \};/, 
`  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('konfigurasi_popup')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      await fetchPopups(true);
      broadcastDataChange('konfigurasi_popup', 'UPDATE', { id, is_active: !currentStatus });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: !currentStatus ? 'Pop-up diaktifkan' : 'Pop-up dinonaktifkan', showConfirmButton: false, timer: 1500 });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal mengubah status', text: err?.message || 'Supabase gagal memperbarui status.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Pop-up?',
      text: 'Tindakan ini akan menghapus data dari Supabase dan menyesuaikan seluruh nomor urutan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });
    if (!res.isConfirmed) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('konfigurasi_popup').delete().eq('id', id);
      if (error) throw error;

      const { data: rows, error: readError } = await supabase
        .from('konfigurasi_popup')
        .select('*')
        .order('urutan', { ascending: true });
      if (readError) throw readError;

      const normalized = (rows || []).map((row: any, index: number) => ({ ...row, urutan: index }));
      await persistPopups(normalized);

      setPopups(normalized);
      if (editingId === id) cancelEdit();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pop-up dihapus & urutan disesuaikan', showConfirmButton: false, timer: 1800 });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal Menghapus Pop-up', text: err?.message || 'Supabase gagal menghapus data.' });
    } finally {
      setIsSaving(false);
    }
  };`
  , 'status/delete functions'
);

fs.writeFileSync(file, source, 'utf8');
console.log('[patch-popup-crud-v3] authoritative Supabase CRUD + realtime + contiguous ordering applied');
