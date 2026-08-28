import fs from 'node:fs';

const KEY = 'seeded_public_submenu_enabled';

function patchNavbar() {
  const path = 'src/components/Navbar.tsx';
  let s = fs.readFileSync(path, 'utf8');

  if (!s.includes('const isSeededPublicSubmenu =')) {
    const marker = 'const LiveClock = memo(() => {';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar LiveClock marker not found');
    s = s.replace(marker, `const isSeededPublicSubmenu = (item: any) => {\n  const p = String(item?.path || '').toLowerCase();\n  const l = String(item?.label || '').toLowerCase();\n  return p.includes('seeded-peserta') || p.includes('pendaftaran/seeded') || l.includes('seeded peserta') || l.includes('daftar seeded');\n};\n\n${marker}`);
  }

  if (!s.includes('const [seededPublicEnabled, setSeededPublicEnabled]')) {
    const marker = '  const [mobileOpen, setMobileOpen] = useState(false);';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar state marker not found');
    s = s.replace(marker, `${marker}\n  const [seededPublicEnabled, setSeededPublicEnabled] = useState(false);`);
  }

  if (!s.includes('const fetchSeededPublicVisibility = useCallback')) {
    const marker = '  const fetchBranding = useCallback(async () => {';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar branding marker not found');
    const fn = `  const fetchSeededPublicVisibility = useCallback(async () => {\n    try {\n      const { data } = await supabase.from('site_settings').select('value').eq('key', '${KEY}').maybeSingle();\n      const value = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;\n      const enabled = typeof value === 'object' && value !== null ? value.enabled : value;\n      setSeededPublicEnabled(enabled === true || enabled === 'true');\n    } catch {\n      setSeededPublicEnabled(false);\n    }\n  }, []);\n\n`;
    s = s.replace(marker, fn + marker);
  }

  const oldGet = `  const getSubMenus = (parentId: string) => {\n    const parent = navData.find(i => i.id === parentId || i.path === parentId || String(i.label || '').toLowerCase() === String(parentId).toLowerCase());\n    const list = navData.filter(i => i?.parent_id && (i.parent_id === parentId || i.parent_id === parent?.id || i.parent_id === parent?.path || String(i.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase())).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));\n    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;\n    return list;\n  };`;
  const newGet = `  const getSubMenus = (parentId: string) => {\n    const parent = navData.find(i => i.id === parentId || i.path === parentId || String(i.label || '').toLowerCase() === String(parentId).toLowerCase());\n    const list = navData.filter(i => i?.parent_id && (i.parent_id === parentId || i.parent_id === parent?.id || i.parent_id === parent?.path || String(i.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase())).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));\n    const visibleList = seededPublicEnabled ? list : list.filter(item => !isSeededPublicSubmenu(item));\n    if (!visibleList.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS.filter(item => !isSeededPublicSubmenu(item));\n    return visibleList;\n  };`;
  if (!s.includes('const visibleList = seededPublicEnabled ? list : list.filter(item => !isSeededPublicSubmenu(item));')) {
    if (!s.includes(oldGet)) throw new Error('[patch-seeded-visibility] Navbar getSubMenus marker not found');
    s = s.replace(oldGet, newGet);
  }

  if (!s.includes('fetchNav(); fetchBranding(); fetchSeededPublicVisibility();')) {
    if (!s.includes('fetchNav(); fetchBranding();')) throw new Error('[patch-seeded-visibility] Navbar effect marker not found');
    s = s.replace('fetchNav(); fetchBranding();', 'fetchNav(); fetchBranding(); fetchSeededPublicVisibility();');
  }

  if (!s.includes(`if (key === '${KEY}') fetchSeededPublicVisibility();`)) {
    const marker = "        if (key === 'navbar_items') fetchNav();";
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar realtime marker not found');
    s = s.replace(marker, `${marker}\n        if (key === '${KEY}') fetchSeededPublicVisibility();`);
  }

  if (!s.includes(`if (e.detail?.key === '${KEY}')`)) {
    const marker = "    const onSetting = (e: any) => { if (e.detail?.key === 'navbar_branding') fetchBranding(); if (e.detail?.key === 'navbar_items') fetchNav(); };";
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility] Navbar custom-event marker not found');
    const replacement = `    const onSetting = (e: any) => {\n      if (e.detail?.key === 'navbar_branding') fetchBranding();\n      if (e.detail?.key === 'navbar_items') fetchNav();\n      if (e.detail?.key === '${KEY}') {\n        const value = e.detail?.value;\n        const enabled = typeof value === 'object' && value !== null ? value.enabled : value;\n        setSeededPublicEnabled(enabled === true || enabled === 'true');\n      }\n    };`;
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
    const fn = `  const fetchSeededPublicVisibility = async () => {\n    try {\n      const { data, error } = await supabase.from('site_settings').select('value').eq('key', '${KEY}').maybeSingle();\n      if (error) throw error;\n      const value = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;\n      const enabled = typeof value === 'object' && value !== null ? value.enabled : value;\n      setSeededPublicEnabled(enabled === true || enabled === 'true');\n    } catch {\n      setSeededPublicEnabled(false);\n    }\n  };\n\n`;
    s = s.replace(marker, fn + marker);
  }

  if (!s.includes('const setSeededPublicVisibility = async')) {
    const marker = '  const saveBranding = async () => {';
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] saveBranding marker not found');
    const fn = `  const setSeededPublicVisibility = async (enabled: boolean) => {\n    setIsSaving(true);\n    try {\n      const value = { enabled };\n      const { error } = await saveSiteSetting('${KEY}', value, 'Visibilitas Submenu Seeded');\n      if (error) throw error;\n      setSeededPublicEnabled(enabled);\n      window.dispatchEvent(new CustomEvent('site_setting_updated', { detail: { key: '${KEY}', value } }));\n      notifySuccess(enabled ? 'Submenu Seeded diaktifkan' : 'Submenu Seeded dinonaktifkan');\n    } catch (error: any) {\n      notifyError(enabled ? 'Gagal mengaktifkan submenu Seeded' : 'Gagal menonaktifkan submenu Seeded', error?.message || 'Silakan coba lagi.');\n    } finally {\n      setIsSaving(false);\n    }\n  };\n\n`;
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
    const marker = `      if (event.detail?.key === 'navbar_branding' || event.detail?.key === 'navbar_items') {\n        fetchNavbar();\n        fetchBrandSettings();\n      }`;
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] admin custom-event marker not found');
    const replacement = `${marker}\n      if (event.detail?.key === '${KEY}') {\n        const value = event.detail?.value;\n        const enabled = typeof value === 'object' && value !== null ? value.enabled : value;\n        setSeededPublicEnabled(enabled === true || enabled === 'true');\n      }`;
    s = s.replace(marker, replacement);
  }

  if (!s.includes('Visibilitas Submenu Seeded')) {
    const marker = `          {activePanel === 'menu' ? (\n            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">`;
    if (!s.includes(marker)) throw new Error('[patch-seeded-visibility-admin] panel marker not found');
    const panel = `          {activePanel === 'menu' ? (\n            <>\n              <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">\n                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">\n                  <div className="flex items-start gap-3">\n                    <div className={\`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl \${seededPublicEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}\`}>\n                      {seededPublicEnabled ? <Eye size={19} /> : <EyeOff size={19} />}\n                    </div>\n                    <div>\n                      <h2 className="font-semibold text-slate-900">Visibilitas Submenu Seeded</h2>\n                      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">Atur apakah <strong>Daftar Seeded Peserta</strong> tampil pada navbar publik. Saat nonaktif, submenu disembunyikan dari peserta/pengunjung, sedangkan data seeded tetap tersimpan dan tetap dapat dikelola dari admin.</p>\n                    </div>\n                  </div>\n                  <button type="button" onClick={() => setSeededPublicVisibility(!seededPublicEnabled)} disabled={isSaving} className={\`inline-flex min-w-[185px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition \${seededPublicEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-50\`}>\n                    {seededPublicEnabled ? <Eye size={17} /> : <EyeOff size={17} />}\n                    {seededPublicEnabled ? 'AKTIF — TAMPIL PUBLIK' : 'NONAKTIF — SEMBUNYI'}\n                  </button>\n                </div>\n                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] text-slate-500">Perubahan tersimpan otomatis dan tersinkron ke navbar desktop & mobile.</div>\n              </section>\n              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">`;
    s = s.replace(marker, panel);
    const close = `            </div>\n          ) : (`;
    if (!s.includes(close)) throw new Error('[patch-seeded-visibility-admin] panel close marker not found');
    s = s.replace(close, `            </div>\n            </>\n          ) : (`);
  }

  fs.writeFileSync(path, s, 'utf8');
}

patchNavbar();
patchAdmin();
console.log('[patch-seeded-public-visibility] seeded submenu public visibility control applied safely');
