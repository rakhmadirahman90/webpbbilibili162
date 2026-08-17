import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/KasManager.tsx');
let source = fs.readFileSync(file, 'utf8');

if (source.includes('KAS_PERSISTENCE_V2')) {
  console.log('[patch-kas-persistence] already applied');
  process.exit(0);
}

// Match the whole function across newlines. The previous expression used .*?
// without the dotAll flag, so it could never match a multiline handleSave.
const pattern = /  const handleSave = async \(e: React\.FormEvent\) => \{[\s\S]*?\n  \};\n\n  const handleEdit/;

const replacement = `  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const finalData = {
      ...formData,
      jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' : formData.jenis_transaksi
    };

    const withTimeout = async <T,>(promise: PromiseLike<T>, ms = 15000): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          Promise.resolve(promise),
          new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Supabase timeout: penyimpanan kas melebihi 15 detik.')), ms);
          })
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    try {
      let savedRecord: KasEntry;

      if (editingId) {
        const { data, error } = await withTimeout(
          supabase.from('kas_pb').update(finalData).eq('id', editingId).select('*').single()
        );
        if (error) throw error;
        if (!data) throw new Error('Supabase tidak mengembalikan data transaksi yang diperbarui.');
        savedRecord = data as KasEntry;
      } else {
        const { data, error } = await withTimeout(
          supabase.from('kas_pb').insert([finalData]).select('*').single()
        );
        if (error) throw error;
        if (!data) throw new Error('Supabase tidak mengembalikan data transaksi baru.');
        savedRecord = data as KasEntry;
      }

      // KAS_PERSISTENCE_V2: database row is the authoritative saved state.
      setKasData(prev => {
        const next = editingId
          ? prev.map(item => item.id === savedRecord.id ? savedRecord : item)
          : [savedRecord, ...prev];
        try { localStorage.setItem('cached_kas_pb', JSON.stringify(next)); } catch (_) {}
        return next;
      });

      broadcastKasChange(editingId ? 'UPDATE' : 'INSERT', savedRecord);
      setEditingId(null);
      setFormData({ ...initialForm, tanggal_transaksi: savedRecord.tanggal_transaksi || today });
      setActiveMobileTab('list');

      // Re-read from Supabase so the UI is synchronized with the database.
      await fetchData(false);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Data Kas Tersimpan di Supabase',
        text: 'ID transaksi: ' + savedRecord.id,
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error: any) {
      console.error('Kas save error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Data Kas',
        text: error?.message || 'Supabase menolak atau gagal menyimpan transaksi.',
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit`;

const next = source.replace(pattern, replacement);
if (next === source) {
  console.error('[patch-kas-persistence] target handleSave block not found; no change made');
  process.exit(1);
}
fs.writeFileSync(file, next, 'utf8');
console.log('[patch-kas-persistence] applied authoritative Supabase save/read-back');
