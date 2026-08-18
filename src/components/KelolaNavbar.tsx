import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { saveSiteSetting } from '../utils/siteSettingsHelper';
import Swal from 'sweetalert2';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe2,
  GripVertical,
  Image as ImageIcon,
  Layers3,
  Link2,
  Loader2,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  path: string;
  type?: string;
  parent_id?: string | null;
  order_index?: number;
  [key: string]: any;
};

type BrandSettings = {
  logo_url: string;
  brand_name_main: string;
  brand_name_accent: string;
  sub_text: string;
  default_lang: string;
};

const DEFAULT_BRAND: BrandSettings = {
  logo_url: '/logo_pb_bilibili_162.svg',
  brand_name_main: 'PB Bilibili',
  brand_name_accent: '162',
  sub_text: 'Professional Badminton',
  default_lang: 'ID',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

const KelolaNavbar: React.FC = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(DEFAULT_BRAND);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingPath, setEditingPath] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'menu' | 'branding'>('menu');
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');
  const [type, setType] = useState('link');
  const [parentId, setParentId] = useState('none');
  const [formError, setFormError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mainMenus = useMemo(
    () => navItems.filter((item) => !item.parent_id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [navItems]
  );

  const childrenOf = (parentIdValue: string) =>
    navItems
      .filter((item) => item.parent_id === parentIdValue)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const totalSubmenus = navItems.filter((item) => !!item.parent_id).length;

  const notifySuccess = (title: string) => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title,
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    });
  };

  const notifyError = (title: string, text: string) => {
    Swal.fire({ icon: 'error', title, text, confirmButtonColor: '#2563eb' });
  };

  const fetchNavbar = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('navbar_settings')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      setNavItems((data || []) as NavItem[]);
    } catch (error: any) {
      notifyError('Gagal memuat menu', error?.message || 'Tidak dapat membaca konfigurasi navbar.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrandSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'navbar_branding')
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        const value = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setBrandSettings({ ...DEFAULT_BRAND, ...value });
      }
    } catch (error) {
      console.error('Gagal memuat branding navbar:', error);
    }
  };

  useEffect(() => {
    fetchNavbar();
    fetchBrandSettings();

    const channelName = `kelola_navbar_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'navbar_settings' }, () => fetchNavbar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload.new?.key === 'navbar_branding' || payload.old?.key === 'navbar_branding') fetchBrandSettings();
      })
      .subscribe();

    const handleCustomUpdate = (event: any) => {
      if (event.detail?.key === 'navbar_branding' || event.detail?.key === 'navbar_items') {
        fetchNavbar();
        fetchBrandSettings();
      }
    };
    window.addEventListener('site_setting_updated', handleCustomUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleCustomUpdate);
    };
  }, []);

  const saveBranding = async () => {
    setIsSaving(true);
    try {
      const { error } = await saveSiteSetting('navbar_branding', brandSettings, 'Pengaturan Header & Branding');
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: 'navbar_branding', value: brandSettings } }));
      notifySuccess('Branding berhasil disimpan');
    } catch (error: any) {
      notifyError('Gagal menyimpan branding', error?.message || 'Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notifyError('File tidak valid', 'Gunakan file gambar untuk logo.');
      return;
    }
    setIsUploading(true);
    try {
      const extension = file.name.split('.').pop() || 'png';
      const filePath = `branding/logo-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from('assets').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      if (!data?.publicUrl) throw new Error('URL logo tidak tersedia.');
      const next = { ...brandSettings, logo_url: data.publicUrl };
      setBrandSettings(next);
      const saveResult = await saveSiteSetting('navbar_branding', next, 'Pengaturan Header & Branding');
      if (saveResult.error) throw saveResult.error;
      notifySuccess('Logo berhasil diperbarui');
    } catch (error: any) {
      notifyError('Upload logo gagal', error?.message || 'Silakan coba lagi.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddMenu = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const cleanLabel = label.trim();
    const cleanPath = path.trim();
    if (!cleanLabel || !cleanPath) {
      setFormError('Nama menu dan URL wajib diisi.');
      return;
    }

    const siblings = parentId === 'none' ? mainMenus : childrenOf(parentId);
    const payload = {
      label: cleanLabel,
      path: cleanPath.startsWith('/') || cleanPath.startsWith('http') ? cleanPath : `/${cleanPath}`,
      type,
      parent_id: parentId === 'none' ? null : parentId,
      order_index: siblings.length,
    };

    setIsSaving(true);
    try {
      const { error } = await supabase.from('navbar_settings').insert([payload]);
      if (error) throw error;
      setLabel('');
      setPath('');
      setType('link');
      setParentId('none');
      setShowAddForm(false);
      await fetchNavbar();
      notifySuccess('Menu baru berhasil ditambahkan');
    } catch (error: any) {
      setFormError(error?.message || 'Menu gagal ditambahkan.');
    } finally {
      setIsSaving(false);
    }
  };

  const beginEdit = (item: NavItem) => {
    setEditingId(item.id);
    setEditingLabel(item.label || '');
    setEditingPath(item.path || '');
  };

  const saveInlineEdit = async (item: NavItem) => {
    const nextLabel = editingLabel.trim();
    const nextPath = editingPath.trim();
    if (!nextLabel || !nextPath) {
      notifyError('Data belum lengkap', 'Nama menu dan URL tidak boleh kosong.');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('navbar_settings')
        .update({ label: nextLabel, path: nextPath })
        .eq('id', item.id);
      if (error) throw error;
      setNavItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, label: nextLabel, path: nextPath } : entry)));
      setEditingId(null);
      notifySuccess('Menu berhasil diperbarui');
    } catch (error: any) {
      notifyError('Gagal memperbarui menu', error?.message || 'Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMenu = async (item: NavItem) => {
    const children = childrenOf(item.id);
    const warning = children.length
      ? `Menu ini memiliki ${children.length} submenu. Semua submenu akan ikut dihapus.`
      : 'Menu ini akan dihapus dari navigasi website.';
    const result = await Swal.fire({
      title: 'Hapus menu?',
      text: warning,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setIsSaving(true);
    try {
      if (children.length) {
        const { error: childError } = await supabase.from('navbar_settings').delete().eq('parent_id', item.id);
        if (childError) throw childError;
      }
      const { error } = await supabase.from('navbar_settings').delete().eq('id', item.id);
      if (error) throw error;
      await fetchNavbar();
      notifySuccess('Menu berhasil dihapus');
    } catch (error: any) {
      notifyError('Gagal menghapus menu', error?.message || 'Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const reorderMainMenus = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const current = [...mainMenus];
    const fromIndex = current.findIndex((item) => item.id === fromId);
    const toIndex = current.findIndex((item) => item.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    setNavItems((prev) => {
      const byId = new Map(current.map((item, index) => [item.id, index]));
      return prev.map((item) => (byId.has(item.id) ? { ...item, order_index: byId.get(item.id) } : item));
    });

    setIsSaving(true);
    try {
      for (let index = 0; index < current.length; index += 1) {
        const { error } = await supabase.from('navbar_settings').update({ order_index: index }).eq('id', current[index].id);
        if (error) throw error;
      }
      await fetchNavbar();
      notifySuccess('Urutan menu berhasil diperbarui');
    } catch (error: any) {
      await fetchNavbar();
      notifyError('Gagal mengatur urutan', error?.message || 'Silakan coba lagi.');
    } finally {
      setIsSaving(false);
      setDraggedId(null);
    }
  };

  const moveMenu = async (item: NavItem, direction: 'up' | 'down') => {
    const index = mainMenus.findIndex((entry) => entry.id === item.id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= mainMenus.length) return;
    await reorderMainMenus(item.id, mainMenus[target].id);
  };

  const renderMenuItem = (item: NavItem, index: number) => {
    const children = childrenOf(item.id);
    const isExpanded = expanded[item.id] ?? true;
    const isEditing = editingId === item.id;

    return (
      <div
        key={item.id}
        draggable={!isEditing}
        onDragStart={() => setDraggedId(item.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => draggedId && reorderMainMenus(draggedId, item.id)}
        className={`group rounded-2xl border bg-white transition-all ${draggedId === item.id ? 'border-blue-400 shadow-lg ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
      >
        <div className="flex items-center gap-3 p-3.5">
          <button
            type="button"
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-grab active:cursor-grabbing"
            title="Tarik untuk mengatur urutan"
            aria-label="Atur urutan menu"
          >
            <GripVertical size={18} />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input autoFocus value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} className={inputClass} placeholder="Nama menu" />
                <input value={editingPath} onChange={(e) => setEditingPath(e.target.value)} className={inputClass} placeholder="/path atau https://..." onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(item)} />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{item.label || 'Tanpa nama'}</p>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 uppercase">{item.type || 'link'}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400 truncate">{item.path || '—'}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <button type="button" onClick={() => saveInlineEdit(item)} disabled={isSaving} className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Simpan"><Check size={16} /></button>
                <button type="button" onClick={() => setEditingId(null)} className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200" title="Batal"><X size={16} /></button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => beginEdit(item)} className="h-9 w-9 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Edit menu"><Pencil size={15} /></button>
                <button type="button" onClick={() => moveMenu(item, 'up')} disabled={index === 0} className="hidden md:flex h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-20" title="Naik"><ChevronDown className="rotate-180" size={15} /></button>
                <button type="button" onClick={() => moveMenu(item, 'down')} disabled={index === mainMenus.length - 1} className="hidden md:flex h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-20" title="Turun"><ChevronDown size={15} /></button>
                {children.length > 0 && (
                  <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }))} className="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-100" title="Tampilkan submenu">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
                <button type="button" onClick={() => deleteMenu(item)} className="h-9 w-9 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Hapus menu"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        </div>

        {isExpanded && children.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/70 px-3 pb-3 pt-2.5">
            <div className="space-y-2 pl-5 sm:pl-12">
              {children.map((child) => (
                <div key={child.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <div className="text-slate-300"><Link2 size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{child.label || 'Tanpa nama'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{child.path || '—'}</p>
                  </div>
                  <button type="button" onClick={() => beginEdit(child)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Edit submenu"><Pencil size={14} /></button>
                  <button type="button" onClick={() => deleteMenu(child)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Hapus submenu"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden bg-slate-50 text-slate-800">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Menu size={22} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Atur Menu Website</h1>
                  <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:inline-flex">Admin</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">Kelola struktur navigasi, submenu, URL, dan identitas header secara terpusat.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { fetchNavbar(); fetchBrandSettings(); }} disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Sinkronkan
              </button>
              <button type="button" onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700">
                <Plus size={17} /> Tambah Menu
              </button>
            </div>
          </header>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className={`${cardClass} flex items-center gap-3 p-4`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Menu size={18} /></div><div><p className="text-xs text-slate-400">Menu utama</p><p className="text-xl font-bold text-slate-800">{mainMenus.length}</p></div></div>
            <div className={`${cardClass} flex items-center gap-3 p-4`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Layers3 size={18} /></div><div><p className="text-xs text-slate-400">Submenu</p><p className="text-xl font-bold text-slate-800">{totalSubmenus}</p></div></div>
            <div className={`${cardClass} flex items-center gap-3 p-4`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={18} /></div><div><p className="text-xs text-slate-400">Status konfigurasi</p><p className="text-sm font-bold text-emerald-600">Aktif & tersinkron</p></div></div>
          </div>

          <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
            <button type="button" onClick={() => setActivePanel('menu')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activePanel === 'menu' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Struktur Menu</button>
            <button type="button" onClick={() => setActivePanel('branding')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activePanel === 'branding' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Header & Branding</button>
          </div>

          {activePanel === 'menu' ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className={`${cardClass} overflow-hidden`}>
                <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="font-semibold text-slate-900">Struktur Navigasi</h2><p className="text-xs text-slate-400">Tarik menu utama untuk mengubah urutan.</p></div>
                  {isSaving && <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-600"><Loader2 size={14} className="animate-spin" /> Menyimpan...</span>}
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  {isLoading && navItems.length === 0 ? (
                    <div className="flex min-h-48 items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 animate-spin" size={18} /> Memuat struktur menu...</div>
                  ) : mainMenus.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><Menu className="mx-auto mb-3 text-slate-300" size={32} /><p className="font-semibold text-slate-600">Belum ada menu</p><p className="mt-1 text-xs text-slate-400">Tambahkan menu utama untuk memulai.</p></div>
                  ) : mainMenus.map(renderMenuItem)}
                </div>
              </section>

              <aside className={`${cardClass} h-fit overflow-hidden`}>
                <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Tambah Menu</h2><p className="text-xs text-slate-400">Buat menu utama atau submenu.</p></div>
                {!showAddForm ? (
                  <div className="p-5"><button type="button" onClick={() => setShowAddForm(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-8 text-sm font-semibold text-slate-500 hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-600"><Plus size={18} /> Tambah item navigasi</button></div>
                ) : (
                  <form onSubmit={handleAddMenu} className="space-y-4 p-5">
                    <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Nama menu</label><input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="Contoh: Tentang Kami" /></div>
                    <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">URL / Path</label><div className="relative"><Link2 size={15} className="absolute left-3 top-3 text-slate-400" /><input value={path} onChange={(e) => setPath(e.target.value)} className={`${inputClass} pl-9`} placeholder="/tentang-kami" /></div></div>
                    <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Jenis</label><select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}><option value="link">Link</option><option value="external">External</option><option value="dropdown">Dropdown</option></select></div>
                    <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Parent menu</label><select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}><option value="none">Menu Utama</option>{mainMenus.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
                    {formError && <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600"><AlertCircle size={15} className="mt-0.5 shrink-0" />{formError}</div>}
                    <div className="flex gap-2"><button type="button" onClick={() => { setShowAddForm(false); setFormError(''); }} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button><button type="submit" disabled={isSaving} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Tambahkan</button></div>
                  </form>
                )}
              </aside>
            </div>
          ) : (
            <section className={`${cardClass} max-w-3xl overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Identitas Header</h2><p className="text-xs text-slate-400">Pengaturan ini digunakan oleh navbar publik.</p></div>
              <div className="grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-6">
                <div>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30">
                    {brandSettings.logo_url ? <img src={brandSettings.logo_url} alt="Logo PB Bilibili 162" className="max-h-28 max-w-[85%] object-contain" /> : <ImageIcon className="text-slate-300" size={36} />}
                    {isUploading && <span className="absolute inset-0 flex items-center justify-center bg-white/85"><Loader2 className="animate-spin text-blue-600" /></span>}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <p className="mt-2 text-center text-[11px] text-slate-400">Klik gambar untuk mengganti logo</p>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Nama utama</label><input value={brandSettings.brand_name_main} onChange={(e) => setBrandSettings({ ...brandSettings, brand_name_main: e.target.value })} className={inputClass} /></div><div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Aksen</label><input value={brandSettings.brand_name_accent} onChange={(e) => setBrandSettings({ ...brandSettings, brand_name_accent: e.target.value })} className={inputClass} /></div></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Subteks</label><input value={brandSettings.sub_text} onChange={(e) => setBrandSettings({ ...brandSettings, sub_text: e.target.value })} className={inputClass} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-slate-600">Bahasa default</label><div className="relative"><Globe2 size={15} className="absolute left-3 top-3 text-slate-400" /><select value={brandSettings.default_lang} onChange={(e) => setBrandSettings({ ...brandSettings, default_lang: e.target.value })} className={`${inputClass} pl-9`}><option value="ID">ID — Indonesia</option><option value="EN">EN — English</option></select></div></div>
                  <div className="flex justify-end pt-1"><button type="button" onClick={saveBranding} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Branding</button></div>
                </div>
              </div>
            </section>
          )}

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-800">
            <Settings2 size={17} className="mt-0.5 shrink-0 text-blue-600" />
            <div><p className="font-semibold">Standar pengelolaan menu</p><p className="mt-1 leading-relaxed text-blue-700/80">Gunakan label singkat dan konsisten, URL yang jelas, maksimal satu tingkat submenu, serta urutan menu berdasarkan prioritas pengguna. Perubahan tersimpan langsung ke konfigurasi navbar.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KelolaNavbar;
