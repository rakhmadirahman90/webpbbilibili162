import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve('src/components/KasManager.tsx');
if (!fs.existsSync(target)) process.exit(0);
const source = fs.readFileSync(target, 'utf8');
const start = source.indexOf('  const deleteKas = async (row: KasEntry) => {');
const end = source.indexOf('\n  const testNotification = async () => {', start);
if (start < 0 || end < 0) {
  console.log('[patch-kas-delete-persistence] delete block not found; skipping');
  process.exit(0);
}

const newBlock = `  const deleteKas = async (row: KasEntry) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Hapus transaksi?', html: \`<b>\${row.nama_pembayar || '-'}<\\/b><br>\${rupiah(Number(row.jumlah_bayar))}<br><small>\${row.tanggal_transaksi}<\\/small>\`, showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#374151', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase.from('kas_pb').delete().eq('id', row.id);
      if (error) throw error;

      // Remove immediately from React state and the local cache. This prevents a stale realtime
      // refresh from putting the just-deleted transaction back on screen.
      setKasData(prev => prev.filter(item => item.id !== row.id));
      try {
        const cached = JSON.parse(localStorage.getItem('cached_kas_pb') || '[]');
        if (Array.isArray(cached)) localStorage.setItem('cached_kas_pb', JSON.stringify(cached.filter((item: any) => item?.id !== row.id)));
      } catch {}

      // Verify the database state before reporting success; retry once if a transient race remains.
      let verify = await supabase.from('kas_pb').select('id').eq('id', row.id).maybeSingle();
      if (!verify.error && verify.data) {
        const retry = await supabase.from('kas_pb').delete().eq('id', row.id);
        if (retry.error) throw retry.error;
        verify = await supabase.from('kas_pb').select('id').eq('id', row.id).maybeSingle();
      }
      if (verify.error) throw verify.error;
      if (verify.data) throw new Error('Transaksi masih ditemukan di database setelah proses hapus.');

      await broadcastKasChange('DELETE', row);
      window.setTimeout(() => { void loadKas(false); }, 700);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Transaksi berhasil dihapus', showConfirmButton: false, timer: 1800 });
    } catch (error: any) {
      await loadKas(false);
      Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: error?.message || 'Perubahan ditolak database.', background: '#0F172A', color: '#fff' });
    }
  };`;

const updated = source.slice(0, start) + newBlock + source.slice(end);
if (updated !== source) {
  fs.writeFileSync(target, updated, 'utf8');
  console.log('[patch-kas-delete-persistence] applied');
}
