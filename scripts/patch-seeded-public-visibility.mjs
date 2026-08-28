import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const key = "seeded_public_submenu_enabled";

const helper = `const isSeededPublicSubmenu = (item: any) => {
  const path = String(item?.path || '').toLowerCase();
  const label = String(item?.label || '').toLowerCase();
  return path.includes('seeded-peserta') ||
    path.includes('pendaftaran/seeded') ||
    label.includes('seeded peserta') ||
    label.includes('daftar seeded');
};

`;

if (!s.includes('const isSeededPublicSubmenu =')) {
  const marker = "const LiveClock = memo(() => {";
  if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar marker not found');
  s = s.replace(marker, helper + marker);
}

if (!s.includes('const [seededPublicEnabled, setSeededPublicEnabled]')) {
  const marker = "  const [mobileOpen, setMobileOpen] = useState(false);";
  if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar state marker not found');
  s = s.replace(marker, marker + "\n  const [seededPublicEnabled, setSeededPublicEnabled] = useState(false);");
}

if (!s.includes('const fetchSeededPublicVisibility = useCallback')) {
  const marker = "  const fetchBranding = useCallback(async () => {";
  const fn = `  const fetchSeededPublicVisibility = useCallback(async () => {
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', '${key}').maybeSingle();
      const value = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;
      const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
      setSeededPublicEnabled(enabled === true || enabled === 'true');
    } catch {
      setSeededPublicEnabled(false);
    }
  }, []);

`;
  if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar branding marker not found');
  s = s.replace(marker, fn + marker);
}

const oldGet = `    const list = navData.filter(i => i?.parent_id && (i.parent_id === parentId || i.parent_id === parent?.id || i.parent_id === parent?.path || String(i.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase())).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;
    return list;`;
const newGet = `    const list = navData.filter(i => i?.parent_id && (i.parent_id === parentId || i.parent_id === parent?.id || i.parent_id === parent?.path || String(i.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase())).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
    const visibleList = seededPublicEnabled ? list : list.filter(item => !isSeededPublicSubmenu(item));
    if (!visibleList.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;
    return visibleList;`;
if (!s.includes("const visibleList = seededPublicEnabled ? list : list.filter(item => !isSeededPublicSubmenu(item));")) {
  if (!s.includes(oldGet)) throw new Error('[patch-seeded-visibility] Navbar getSubMenus marker not found');
  s = s.replace(oldGet, newGet);
}

if (!s.includes('fetchSeededPublicVisibility();')) {
  s = s.replace("    fetchNav(); fetchBranding();", "    fetchNav(); fetchBranding(); fetchSeededPublicVisibility();");
}

const oldRealtime = `        if (key === 'navbar_branding') fetchBranding();
        if (key === 'navbar_items') fetchNav();`;
const newRealtime = `        if (key === 'navbar_branding') fetchBranding();
        if (key === 'navbar_items') fetchNav();
        if (key === '${key}') fetchSeededPublicVisibility();`;
if (!s.includes(`if (key === '${key}') fetchSeededPublicVisibility();`)) {
  if (!s.includes(oldRealtime)) throw new Error('[patch-seeded-visibility] Navbar realtime marker not found');
  s = s.replace(oldRealtime, newRealtime);
}

const oldCustom = `    const onSetting = (e: any) => { if (e.detail?.key === 'navbar_branding') fetchBranding(); if (e.detail?.key === 'navbar_items') fetchNav(); };`;
const newCustom = `    const onSetting = (e: any) => {
      if (e.detail?.key === 'navbar_branding') fetchBranding();
      if (e.detail?.key === 'navbar_items') fetchNav();
      if (e.detail?.key === '${key}') {
        const value = e.detail?.value;
        const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
        setSeededPublicEnabled(enabled === true || enabled === 'true');
      }
    };`;
if (!s.includes(`if (e.detail?.key === '${key}')`)) {
  if (!s.includes(oldCustom)) throw new Error('[patch-seeded-visibility] Navbar custom-event marker not found');
  s = s.replace(oldCustom, newCustom);
}

s = s.replace("  }, [fetchNav, fetchBranding]);", "  }, [fetchNav, fetchBranding, fetchSeededPublicVisibility]);");

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-seeded-visibility] public seeded submenu visibility control applied to Navbar');

const adminPath = 'src/components/KelolaNavbar.tsx';
let admin = fs.readFileSync(adminPath, 'utf8');

if (!admin.includes('Eye,')) {
  admin = admin.replace("  ExternalLink,\n", "  ExternalLink,\n  Eye,\n  EyeOff,\n");
}

if (!admin.includes('const [seededPublicEnabled, setSeededPublicEnabled]')) {
  const marker = "  const [showAddForm, setShowAddForm] = useState(false);";
  if (!admin.includes(marker)) throw new Error('[patch-seeded-visibility-admin] state marker not found');
  admin = admin.replace(marker, marker + "\n  const [seededPublicEnabled, setSeededPublicEnabled] = useState(false);");
}

if (!admin.includes('const fetchSeededPublicVisibility = async')) {
  const marker = "  const fetchBrandSettings = async () => {";
  const fn = `  const fetchSeededPublicVisibility = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', '${key}')
        .maybeSingle();
      if (error) throw error;
      const value = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;
      const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
      setSeededPublicEnabled(enabled === true || enabled === 'true');
    } catch {
      setSeededPublicEnabled(false);
    }
  };

`;
  if (!admin.includes(marker)) throw new Error('[patch-seeded-visibility-admin] branding marker not found');
  admin = admin.replace(marker, fn + marker);
}

if (!admin.includes('const setSeededPublicVisibility = async')) {
  const marker = "  const saveBranding = async () => {";
  const fn = `  const setSeededPublicVisibility = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const value = { enabled };
      const { error } = await saveSiteSetting('${key}', value, 'Visibilitas Submenu Seeded');
      if (error) throw error;
      setSeededPublicEnabled(enabled);
      window.dispatchEvent(new CustomEvent('site_setting_updated', {
        detail: { key: '${key}', value }
      }));
      notifySuccess(enabled ? 'Submenu Seeded diaktifkan' : 'Submenu Seeded dinonaktifkan');
    } catch (error: any) {
      notifyError(
        enabled ? 'Gagal mengaktifkan submenu Seeded' : 'Gagal menonaktifkan submenu Seeded',
        error?.message || 'Silakan coba lagi.'
      );
    } finally {
      setIsSaving(false);
    }
  };

`;
  if (!admin.includes(marker)) throw new Error('[patch-seeded-visibility-admin] saveBranding marker not found');
  admin = admin.replace(marker, fn + marker);
}

if (!admin.includes('fetchSeededPublicVisibility();')) {
  admin = admin.replace("    fetchNavbar();\n    fetchBrandSettings();", "    fetchNavbar();\n    fetchBrandSettings();\n    fetchSeededPublicVisibility();");
}

const oldRealtimeAdmin = `        if (payload.new?.key === 'navbar_branding' || payload.old?.key === 'navbar_branding') fetchBrandSettings();`;
const newRealtimeAdmin = `        if (payload.new?.key === 'navbar_branding' || payload.old?.key === 'navbar_branding') fetchBrandSettings();
        if (payload.new?.key === '${key}' || payload.old?.key === '${key}') fetchSeededPublicVisibility();`;
if (!admin.includes(`payload.new?.key === '${key}'`)) {
  if (!admin.includes(oldRealtimeAdmin)) throw new Error('[patch-seeded-visibility-admin] realtime marker not found');
  admin = admin.replace(oldRealtimeAdmin, newRealtimeAdmin);
}

const oldCustomAdmin = `      if (event.detail?.key === 'navbar_branding' || event.detail?.key === 'navbar_items') {
        fetchNavbar();
        fetchBrandSettings();
      }`;
const newCustomAdmin = `      if (event.detail?.key === 'navbar_branding' || event.detail?.key === 'navbar_items') {
        fetchNavbar();
        fetchBrandSettings();
      }
      if (event.detail?.key === '${key}') {
        const value = event.detail?.value;
        const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
        setSeededPublicEnabled(enabled === true || enabled === 'true');
      }`;
if (!admin.includes(`event.detail?.key === '${key}'`)) {
  if (!admin.includes(oldCustomAdmin)) throw new Error('[patch-seeded-visibility-admin] custom-event marker not found');
  admin = admin.replace(oldCustomAdmin, newCustomAdmin);
}

const marker = `          {activePanel === 'menu' ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">`;
const panel = `          {activePanel === 'menu' ? (
            <>
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={\`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl \${seededPublicEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}\`}>
                      {seededPublicEnabled ? <Eye size={19} /> : <EyeOff size={19} />}
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Visibilitas Submenu Seeded</h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Atur apakah <strong>Daftar Seeded Peserta</strong> boleh tampil pada navbar publik. Saat dinonaktifkan, submenu tidak terlihat oleh peserta/pengunjung, tetapi data Seeded tetap tersimpan dan dapat dikelola dari halaman admin.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeededPublicVisibility(!seededPublicEnabled)}
                    disabled={isSaving}
                    className={\`inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition \${seededPublicEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-50\`}
                  >
                    {seededPublicEnabled ? <Eye size={17} /> : <EyeOff size={17} />}
                    {seededPublicEnabled ? 'AKTIF — TAMPIL PUBLIK' : 'NONAKTIF — SEMBUNYI'}
                  </button>
                </div>
                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={\`rounded-full px-2.5 py-1 font-semibold \${seededPublicEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}\`}>
                      Status: {seededPublicEnabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className="text-slate-400">Perubahan tersimpan otomatis dan tersinkron ke navbar desktop & mobile.</span>
                  </div>
                </div>
              </section>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">`;
if (!admin.includes('Visibilitas Submenu Seeded')) {
  if (!admin.includes(marker)) throw new Error('[patch-seeded-visibility-admin] panel marker not found');
  admin = admin.replace(marker, panel);
  const closeMarker = `            </div>
          ) : (
            <section className={\`${cardClass} max-w-3xl overflow-hidden\`}>`;
  if (!admin.includes(closeMarker)) throw new Error('[patch-seeded-visibility-admin] panel close marker not found');
  admin = admin.replace(closeMarker, `            </div>
            </>
          ) : (
            <section className={\`${cardClass} max-w-3xl overflow-hidden\`}>`);
}

fs.writeFileSync(adminPath, admin, 'utf8');
console.log('[patch-seeded-visibility-admin] admin toggle for public Seeded submenu applied');
