import fs from 'node:fs';

const KEY = 'seeded_public_submenu_enabled';

function patchNavbar() {
  const path = 'src/components/Navbar.tsx';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes('const isSeededPublicSubmenu =')) {
    const marker = 'const LiveClock = memo(() => {';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar LiveClock marker not found');
    s = s.replace(marker, `const isSeededPublicSubmenu = (item: any) => {
  const p = String(item?.path || '').toLowerCase();
  const l = String(item?.label || '').toLowerCase();
  return p.includes('seeded-peserta') || p.includes('pendaftaran/seeded') || l.includes('seeded peserta') || l.includes('daftar seeded');
};

${marker}`);
  }

  if (!s.includes('const [seededPublicEnabled, setSeededPublicEnabled]')) {
    const marker = '  const [mobileOpen, setMobileOpen] = useState(false);';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar state marker not found');
    s = s.replace(marker, `${marker}
  const [seededPublicEnabled, setSeededPublicEnabled] = useState(false);`);
  }

  if (!s.includes('const fetchSeededPublicVisibility = useCallback')) {
    const marker = '  const fetchBranding = useCallback(async () => {';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar branding marker not found');
    const fn = `  const fetchSeededPublicVisibility = useCallback(async () => {
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', '${KEY}').maybeSingle();
      const value = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;
      const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
      setSeededPublicEnabled(enabled === true || enabled === 'true');
    } catch {
      setSeededPublicEnabled(false);
    }
  }, []);

`;
    s = s.replace(marker, fn + marker);
  }

  // Do not depend on the exact getSubMenus body: other build-prep patches may
  // legitimately change that function before this patch runs. Replace the
  // whole function by its stable declaration boundary instead.
  const getPattern = /  const getSubMenus = \(parentId: string\) => \{[\s\S]*?\n  \};/;
  const newGet = `  const getSubMenus = (parentId: string) => {
    const parent = navData.find(i => i.id === parentId || i.path === parentId || String(i.label || '').toLowerCase() === String(parentId).toLowerCase());
    const list = navData.filter(i => i?.parent_id && (i.parent_id === parentId || i.parent_id === parent?.id || i.parent_id === parent?.path || String(i.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase())).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
    const visibleList = seededPublicEnabled ? list : list.filter(item => !isSeededPublicSubmenu(item));
    if (!visibleList.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS.filter(item => !isSeededPublicSubmenu(item));
    return visibleList;
  };`;

  if (!s.includes('const visibleList = seededPublicEnabled ? list : list.filter(item => !isSeededPublicSubmenu(item));')) {
    if (!getPattern.test(s)) throw new Error('[patch-seeded-visibility] Navbar getSubMenus declaration not found');
    s = s.replace(getPattern, newGet);
  }

  if (!s.includes('fetchNav(); fetchBranding(); fetchSeededPublicVisibility();')) {
    if (!s.includes('fetchNav(); fetchBranding();')) throw new Error('[patch-seeded-visibility] Navbar effect marker not found');
    s = s.replace('fetchNav(); fetchBranding();', 'fetchNav(); fetchBranding(); fetchSeededPublicVisibility();');
  }

  if (!s.includes(`if (key === '${KEY}') fetchSeededPublicVisibility();`)) {
    const marker = "        if (key === 'navbar_items') fetchNav();";
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar realtime marker not found');
    s = s.replace(marker, `${marker}
        if (key === '${KEY}') fetchSeededPublicVisibility();`);
  }

  if (!s.includes(`if (e.detail?.key === '${KEY}')`)) {
    const marker = "    const onSetting = (e: any) => { if (e.detail?.key === 'navbar_branding') fetchBranding(); if (e.detail?.key === 'navbar_items') fetchNav(); };";
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar custom-event marker not found');
    const replacement = `    const onSetting = (e: any) => {
      if (e.detail?.key === 'navbar_branding') fetchBranding();
      if (e.detail?.key === 'navbar_items') fetchNav();
      if (e.detail?.key === '${KEY}') {
        const value = e.detail?.value;
        const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
        setSeededPublicEnabled(enabled === true || enabled === 'true');
      }
    };`;
    s = s.replace(marker, replacement);
  }

  s = s.replace('  }, [fetchNav, fetchBranding]);', '  }, [fetchNav, fetchBranding, fetchSeededPublicVisibility]);');
  fs.writeFileSync(path, s, 'utf8');
}

function patchAdmin() {
  const path = 'src/components/KelolaNavbar.tsx';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes('Eye,') && !s.includes('EyeOff,')) {
    const marker = '  ExternalLink,\n';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] icon import marker not found');
    s = s.replace(marker, `${marker}  Eye,\n  EyeOff,\n`);
  }

  if (!s.includes('const [seededPublicEnabled, setSeededPublicEnabled]')) {
    const marker = "  const [showAddForm, setShowAddForm] = useState(false);";
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] state marker not found');
    s = s.replace(marker, `${marker}\n  const [seededPublicEnabled, setSeededPublicEnabled] = useState(false);`);
  }

  if (!s.includes('const fetchSeededPublicVisibility = async')) {
    const marker = '  const fetchBrandSettings = async () => {';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] branding marker not found');
    const fn = `  const fetchSeededPublicVisibility = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', '${KEY}').maybeSingle();
      if (error) throw error;
      const value = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;
      const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
      setSeededPublicEnabled(enabled === true || enabled === 'true');
    } catch {
      setSeededPublicEnabled(false);
    }
  };

`;
    s = s.replace(marker, fn + marker);
  }

  if (!s.includes('const setSeededPublicVisibility = async')) {
    const marker = '  const saveBranding = async () => {';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] saveBranding marker not found');
    const fn = `  const setSeededPublicVisibility = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const value = { enabled };
      const { error } = await saveSiteSetting('${KEY}', value, 'Visibilitas Submenu Seeded');
      if (error) throw error;
      setSeededPublicEnabled(enabled);
      window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: '${KEY}', value } }));
      notifySuccess(enabled ? 'Submenu Seeded diaktifkan' : 'Submenu Seeded dinonaktifkan');
    } catch (error: any) {
      notifyError(enabled ? 'Gagal mengaktifkan submenu Seeded' : 'Gagal menonaktifkan submenu Seeded', error?.message || 'Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

`;
    s = s.replace(marker, fn + marker);
  }

  if (!s.includes('fetchSeededPublicVisibility();')) {
    const marker = '    fetchBrandSettings();';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] admin effect marker not found');
    s = s.replace(marker, `${marker}\n    fetchSeededPublicVisibility();`);
  }

  if (!s.includes(`payload.new?.key === '${KEY}'`)) {
    const marker = "        if (payload.new?.key === 'navbar_branding' || payload.old?.key === 'navbar_branding') fetchBrandSettings();";
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] admin realtime marker not found');
    s = s.replace(marker, `${marker}\n        if (payload.new?.key === '${KEY}' || payload.old?.key === '${KEY}') fetchSeededPublicVisibility();`);
  }

  if (!s.includes(`event.detail?.key === '${KEY}'`)) {
    const marker = `      if (event.detail?.key === 'navbar_branding' || event.detail?.key === 'navbar_items') {
        fetchNavbar();
        fetchBrandSettings();
      }`;
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] admin custom-event marker not found');
    const replacement = `${marker}
      if (event.detail?.key === '${KEY}') {
        const value = event.detail?.value;
        const enabled = typeof value === 'object' && value !== null ? value.enabled : value;
        setSeededPublicEnabled(enabled === true || enabled === 'true');
      }`;
    s = s.replace(marker, replacement);
  }

  if (!s.includes('Visibilitas Submenu Seeded')) {
    const marker = `          {activePanel === 'menu' ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">`;
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] panel marker not found');
    const panel = `          {activePanel === 'menu' ? (
            <>
              <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={\`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl \${seededPublicEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}\`}>
                      {seededPublicEnabled ? <Eye size={19} /> : <EyeOff size={19} />}
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Visibilitas Submenu Seeded</h2>
                      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">Atur apakah <strong>Daftar Seeded Peserta</strong> tampil pada navbar publik. Saat nonaktif, submenu disembunyikan dari peserta/pengunjung, sedangkan data seeded tetap tersimpan dan tetap dapat dikelola dari admin.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSeededPublicVisibility(!seededPublicEnabled)} disabled={isSaving} className={\`inline-flex min-w-[185px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition \${seededPublicEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-50\`}>
                    {seededPublicEnabled ? <Eye size={17} /> : <EyeOff size={17} />}
                    {seededPublicEnabled ? 'AKTIF — TAMPIL PUBLIK' : 'NONAKTIF — SEMBUNYI'}
                  </button>
                </div>
                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] text-slate-500">Perubahan tersimpan otomatis dan tersinkron ke navbar desktop & mobile.</div>
              </section>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">`;
    s = s.replace(marker, panel);
    const close = `            </div>
          ) : (`;
    if (!s.includes(close)) throw new Error('[patch-seeded-visibility-admin] panel close marker not found');
    s = s.replace(close, `            </div>
            </>
          ) : (`);
  }

  fs.writeFileSync(path, s, 'utf8');
}

patchNavbar();
patchAdmin();
console.log('[patch-seeded-public-visibility] seeded submenu public visibility control applied safely');
