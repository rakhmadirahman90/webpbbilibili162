import fs from 'node:fs';

const file = 'src/components/AdminPopup.tsx';
let source = fs.readFileSync(file, 'utf8');

const fetchStart = source.indexOf('  const fetchPopups = async (isSilent = false) => {');
const effectStart = source.indexOf('  useEffect(() => {', fetchStart);
const persistStart = source.indexOf('  const persistPopups = async (updatedList: PopupConfig[]) => {');
const templateStart = source.indexOf('  const loadJadwalLatihanTemplate = () => {', persistStart);
const dragStart = source.indexOf('  const handleDragEnd = async (event: DragEndEvent) => {');
const imageUploadStart = source.indexOf('  const handleImageUpload = async', dragStart);
const saveStart = source.indexOf('  const handleSave = async (e: React.FormEvent) => {');
const editStart = source.indexOf('  const startEdit = (item: PopupConfig) => {', saveStart);
const toggleStart = source.indexOf('  const toggleStatus = async', editStart);
const returnStart = source.indexOf('  return (', toggleStart);

if ([fetchStart,effectStart,persistStart,templateStart,dragStart,imageUploadStart,saveStart,editStart,toggleStart,returnStart].some(i => i < 0)) {
  throw new Error('[popup-admin-realtime-v4] AdminPopup boundaries not found');
}

const fastFetch = `  const fetchPopups = async (isSilent = false) => {
    if (!isSilent && popups.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('konfigurasi_popup')
        .select('id,url_gambar,judul,deskripsi,is_active,urutan,file_url')
        .order('urutan', { ascending: true });
      if (error) throw error;
      const rows: PopupConfig[] = (Array.isArray(data) ? data : [])
        .map((item: any) => ({
          id: String(item.id), url_gambar: item.url_gambar || '', judul: item.judul || '',
          deskripsi: item.deskripsi || '', is_active: item.is_active === true,
          urutan: Number(item.urutan ?? 0), file_url: item.file_url || undefined,
        }))
        .filter(item => Boolean(item.id));
      rows.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.urutan - b.urutan;
      });
      setPopups(prev => JSON.stringify(prev) === JSON.stringify(rows) ? prev : rows);
    } catch (err) {
      console.warn('[popup-admin-realtime-v4] Supabase read failed:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

`;
source = source.slice(0, fetchStart) + fastFetch + source.slice(effectStart);

const newEffectStart = source.indexOf('  useEffect(() => {', fetchStart);
const newPersistStart = source.indexOf('  const persistPopups = async (updatedList: PopupConfig[]) => {', newEffectStart);
const fastEffect = `  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!disposed) void fetchPopups(true);
      }, 120);
    };
    void fetchPopups(false);
    const channel = supabase
      .channel('admin-konfigurasi-popup-realtime-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, refresh)
      .subscribe();
    const handleRefresh = () => refresh();
    window.addEventListener('table_updated_konfigurasi_popup', handleRefresh);
    window.addEventListener('online', handleRefresh);
    return () => {
      disposed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
      window.removeEventListener('table_updated_konfigurasi_popup', handleRefresh);
      window.removeEventListener('online', handleRefresh);
    };
  }, []);

`;
source = source.slice(0, newEffectStart) + fastEffect + source.slice(newPersistStart);

const newPersistBoundary = source.indexOf('  const persistPopups = async (updatedList: PopupConfig[]) => {', newEffectStart);
const newTemplateStart = source.indexOf('  const loadJadwalLatihanTemplate = () => {', newPersistBoundary);
const authoritativePersist = `  const persistPopups = async (updatedList: PopupConfig[]) => {
    const active = updatedList.filter(item => item.is_active);
    const inactive = updatedList.filter(item => !item.is_active);
    const standardizedList = [...active, ...inactive].map((item, index) => ({ ...item, urutan: index }));
    const previous = popups;
    setPopups(standardizedList);
    try {
      const dbUpdates = standardizedList.map(({ id, urutan, judul, deskripsi, url_gambar, is_active, file_url }) => ({
        id, urutan, judul: judul || '', deskripsi: deskripsi || '', url_gambar: url_gambar || '',
        is_active: Boolean(is_active), file_url: file_url || null
      }));
      const { error } = await supabase.from('konfigurasi_popup').upsert(dbUpdates, { onConflict: 'id' });
      if (error) throw error;
      broadcastDataChange('konfigurasi_popup', 'UPDATE', standardizedList);
      window.dispatchEvent(new CustomEvent('table_updated_konfigurasi_popup'));
    } catch (err) {
      setPopups(previous);
      throw err;
    }
  };

`;
source = source.slice(0, newPersistBoundary) + authoritativePersist + source.slice(newTemplateStart);

const newDragStart = source.indexOf('  const handleDragEnd = async (event: DragEndEvent) => {');
const newImageUploadStart = source.indexOf('  const handleImageUpload = async', newDragStart);
const stableReorder = `  const reorderWithinGroup = (items: PopupConfig[], itemId: string, targetIndex: number) => {
    const item = items.find(p => p.id === itemId);
    if (!item) return items;
    const active = items.filter(p => p.is_active);
    const inactive = items.filter(p => !p.is_active);
    const group = item.is_active ? active : inactive;
    const currentIndex = group.findIndex(p => p.id === itemId);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= group.length || currentIndex === targetIndex) return items;
    const moved = arrayMove(group, currentIndex, targetIndex);
    const combined = item.is_active ? [...moved, ...inactive] : [...active, ...moved];
    return combined.map((p, index) => ({ ...p, urutan: index }));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const item = popups.find(p => p.id === active.id);
    const overItem = popups.find(p => p.id === over.id);
    if (!item || !overItem || item.is_active !== overItem.is_active) return;
    const group = popups.filter(p => p.is_active === item.is_active);
    const targetIndex = group.findIndex(p => p.id === over.id);
    try {
      await persistPopups(reorderWithinGroup(popups, item.id, targetIndex));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Urutan tersimpan', showConfirmButton: false, timer: 1000 });
    } catch (err: any) {
      Swal.fire('Gagal menyimpan urutan', err?.message || 'Supabase tidak dapat menyimpan perubahan', 'error');
    }
  };

  const movePosition = async (itemId: string, targetIndex: number) => {
    const item = popups.find(p => p.id === itemId);
    if (!item) return;
    const group = popups.filter(p => p.is_active === item.is_active);
    if (targetIndex < 0 || targetIndex >= group.length) return;
    try {
      await persistPopups(reorderWithinGroup(popups, itemId, targetIndex));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Urutan ' + (targetIndex + 1) + ' tersimpan', showConfirmButton: false, timer: 1000 });
    } catch (err: any) {
      Swal.fire('Gagal menyimpan urutan', err?.message || 'Supabase tidak dapat menyimpan perubahan', 'error');
    }
  };

`;
source = source.slice(0, newDragStart) + stableReorder + source.slice(newImageUploadStart);

const newSaveStart = source.indexOf('  const handleSave = async (e: React.FormEvent) => {');
const newEditStart = source.indexOf('  const startEdit = (item: PopupConfig) => {', newSaveStart);
const stableSave = `  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPopup.url_gambar) return Swal.fire('Perhatian', 'Harap unggah gambar terlebih dahulu', 'warning');
    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('konfigurasi_popup').update({
          judul: newPopup.judul, deskripsi: newPopup.deskripsi, url_gambar: newPopup.url_gambar,
          file_url: newPopup.file_url || null, is_active: true
        }).eq('id', editingId);
        if (error) throw error;
      } else {
        const activeCount = popups.filter(p => p.is_active).length;
        const { error } = await supabase.from('konfigurasi_popup').insert([{
          id: 'popup-' + Date.now(), judul: newPopup.judul, deskripsi: newPopup.deskripsi,
          url_gambar: newPopup.url_gambar, file_url: newPopup.file_url || null,
          is_active: true, urutan: activeCount
        }]);
        if (error) throw error;
      }
      await fetchPopups(true);
      Swal.fire({ title: 'Berhasil', text: editingId ? 'Pop-up diperbarui' : 'Pop-up ditambahkan sebagai pop-up aktif terakhir', icon: 'success', background: '#0F172A', color: '#fff' });
      setEditingId(null);
      setNewPopup({ url_gambar: '', judul: '', deskripsi: '', file_url: '' });
      setPreviewImage(null);
    } catch (err: any) {
      Swal.fire('Gagal menyimpan', err?.message || 'Supabase tidak dapat menyimpan perubahan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

`;
source = source.slice(0, newSaveStart) + stableSave + source.slice(newEditStart);

const newToggleStart = source.indexOf('  const toggleStatus = async');
const newReturnStart = source.indexOf('  return (', newToggleStart);
const stableActions = `  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('konfigurasi_popup').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      await fetchPopups(true);
    } catch (err: any) {
      Swal.fire('Gagal', err?.message || 'Status pop-up tidak tersimpan', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({ title: 'Hapus Pop-up?', text: 'Tindakan ini tidak dapat dibatalkan!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#1e293b', confirmButtonText: 'Ya, Hapus!', background: '#0F172A', color: '#fff' });
    if (!res.isConfirmed) return;
    try {
      const { error } = await supabase.from('konfigurasi_popup').delete().eq('id', id);
      if (error) throw error;
      await fetchPopups(true);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pop-up dihapus', showConfirmButton: false, timer: 1000 });
    } catch (err: any) {
      Swal.fire('Gagal menghapus', err?.message || 'Supabase tidak dapat menghapus data', 'error');
    }
  };

`;
source = source.slice(0, newToggleStart) + stableActions + source.slice(newReturnStart);

source = source.replace('useSensor(PointerSensor),', 'useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),');
source = source.replace('totalCount={popups.length}', 'totalCount={popups.filter(p => p.is_active === item.is_active).length}');
source = source.replace('className="absolute top-3 right-3 sm:top-5 sm:right-5 z-40 p-2', 'style={{ touchAction: \'none\' }}\n          className="absolute top-3 right-3 sm:top-5 sm:right-5 z-40 p-2');

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-admin-realtime-v4] Supabase-authoritative fast load, realtime, reorder and mobile-scroll fix applied');
