import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

// The two registration flows are intentionally different:
// - register -> athlete/member registration (pendaftaran)
// - pendaftaran-turnamen -> tournament pair registration (pendaftaran_turnamen)
// Keep tournament registration as its own top-level menu.
const oldDefault = "{ id: 'register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 },";
const newDefault = "{ id: 'register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 },\n  { id: 'tournament-registration', label: 'Pendaftaran Peserta Turnamen', path: 'pendaftaran-turnamen', type: 'dropdown', parent_id: null, order_index: 5.5 },\n  { id: 'tournament-form', label: 'Formulir Pendaftaran Turnamen', path: 'pendaftaran-turnamen', type: 'link', parent_id: 'tournament-registration', order_index: 1 },\n  { id: 'tournament-seeded', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: 'tournament-registration', order_index: 2 },";
if (s.includes(oldDefault) && !s.includes("id: 'tournament-registration'")) s = s.replace(oldDefault, newDefault);

// Repair the previous patch if it turned the athlete registration item into
// a generic participant dropdown. Tournament registration must not live under Atlet.
s = s.replace(
  "{ id: 'register', label: 'Pendaftaran Peserta', path: 'register', type: 'dropdown', parent_id: 'atlet', order_index: 5 },\n  { id: 'register-form', label: 'Formulir Pendaftaran Peserta', path: 'register', type: 'link', parent_id: 'register', order_index: 1 },\n  { id: 'register-seeded', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: 'register', order_index: 2 },",
  newDefault
);

// Make DB/cached navbar data converge to the same separation on every load.
const marker = "  const fetchBranding = useCallback(async () => {";
if (!s.includes('const normalizeRegistrationMenus =') && s.includes(marker)) {
  const helper = `  const normalizeRegistrationMenus = useCallback((items: any[]) => {\n    const base = Array.isArray(items) ? items : [];\n    const cleaned = base\n      .filter(i => !['register-form', 'register-seeded'].includes(String(i?.id)))\n      .filter(i => !(String(i?.path) === 'pendaftaran-turnamen' && String(i?.id) !== 'tournament-registration'))\n      .map(i => {\n        if (String(i?.path) === 'register' || String(i?.id) === 'register') {\n          return { ...i, id: 'register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 };\n        }\n        return i;\n      });\n    const athleteExists = cleaned.some(i => String(i?.id) === 'register' || String(i?.path) === 'register');\n    const withAthlete = athleteExists ? cleaned : [{ id: 'register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 }, ...cleaned];\n    const tournament = { id: 'tournament-registration', label: 'Pendaftaran Peserta Turnamen', path: 'pendaftaran-turnamen', type: 'dropdown', parent_id: null, order_index: 5.5 };\n    const children = [\n      { id: 'tournament-form', label: 'Formulir Pendaftaran Turnamen', path: 'pendaftaran-turnamen', type: 'link', parent_id: 'tournament-registration', order_index: 1 },\n      { id: 'tournament-seeded', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: 'tournament-registration', order_index: 2 }\n    ];\n    return [...withAthlete.filter(i => !['tournament-registration','tournament-form','tournament-seeded'].includes(String(i?.id))), tournament, ...children].sort((a,b) => (a.order_index || 0) - (b.order_index || 0));\n  }, []);\n\n`;
  s = s.replace(marker, helper + marker);
}

// Apply normalization to DB, site_settings and cached navigation sources.
s = s.replace(
  "if (Array.isArray(data) && data.length) { setNavData(data); localStorage.setItem('site_setting_navbar_items', JSON.stringify(data)); return; }",
  "if (Array.isArray(data) && data.length) { const normalized = normalizeRegistrationMenus(data); setNavData(normalized); localStorage.setItem('site_setting_navbar_items', JSON.stringify(normalized)); return; }"
);
s = s.replace(
  "if (Array.isArray(list) && list.length) setNavData(list);",
  "if (Array.isArray(list) && list.length) setNavData(normalizeRegistrationMenus(list));"
);
s = s.replace(
  "if (Array.isArray(value) && value.length) setNavData(value);",
  "if (Array.isArray(value) && value.length) setNavData(normalizeRegistrationMenus(value));"
);

// Route-specific preload/navigation. Never send tournament registration to /register.
s = s.replace(
  "const target = effective === 'atlet' || effective === 'players' || ['semua', 'senior', 'muda'].includes(effective)",
  "const target = effective === 'pendaftaran-turnamen' ? '/pendaftaran-turnamen' : effective === 'atlet' || effective === 'players' || ['semua', 'senior', 'muda'].includes(effective)"
);
s = s.replace(
  "case '/register': void import('./RegistrationForm'); break;",
  "case '/register': void import('./RegistrationForm'); break;\n      case '/pendaftaran-turnamen': void import('./PendaftaranTurnamen'); break;"
);

s = s.replace(
  "if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);",
  "if (section === 'pendaftaran-turnamen') { navigate('/pendaftaran-turnamen'); return; }\n      if (section === 'pendaftaran/seeded-peserta') { navigate('/pendaftaran/seeded-peserta'); return; }\n      if (section === 'register') { navigate('/register'); return; }\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);"
);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-registration-separation] athlete and tournament registration kept separate');
