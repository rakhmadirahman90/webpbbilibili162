import fs from 'node:fs';

const file = 'src/components/Navbar.tsx';
let s = fs.readFileSync(file, 'utf8');
let changes = 0;

const defaultMarker = "  { id: 'galeri', label: 'Galeri', path: 'gallery', type: 'link', parent_id: null, order_index: 5 },";
const defaultInsert = `${defaultMarker}\n  { id: 'sponsor', label: 'Daftar Sponsor', path: 'sponsorship', type: 'link', parent_id: null, order_index: 6 },`;
if (s.includes(defaultMarker) && !s.includes("id: 'sponsor', label: 'Daftar Sponsor'")) {
  s = s.replace(defaultMarker, defaultInsert);
  changes++;
}

const helperMarker = "  const fetchNav = useCallback(async () => {";
const helper = `  const ensureLandingSponsor = (items: any[]) => {\n    const list = Array.isArray(items) ? [...items] : [];\n    const exists = list.some(i => {\n      const path = normalizeNavigationPath(i?.path || '');\n      const label = String(i?.label || '').toLowerCase().trim();\n      return path === 'sponsorship' || path === 'sponsor' || label === 'sponsor' || label === 'daftar sponsor';\n    });\n    if (!exists) {\n      const maxOrder = list.reduce((m, i) => Math.max(m, Number(i?.order_index) || 0), 0);\n      list.push({ id: 'sponsor', label: 'Daftar Sponsor', path: 'sponsorship', type: 'link', parent_id: null, order_index: maxOrder + 1 });\n    }\n    return list;\n  };\n\n  const fetchNav = useCallback(async () => {`;
if (s.includes(helperMarker) && !s.includes('const ensureLandingSponsor')) {
  s = s.replace(helperMarker, helper);
  changes++;
}

const dataLine = "      if (Array.isArray(data) && data.length) { setNavData(data); localStorage.setItem('site_setting_navbar_items', JSON.stringify(data)); return; }";
const dataReplacement = "      if (Array.isArray(data) && data.length) { const next = ensureLandingSponsor(data); setNavData(next); localStorage.setItem('site_setting_navbar_items', JSON.stringify(next)); return; }";
if (s.includes(dataLine)) {
  s = s.replace(dataLine, dataReplacement);
  changes++;
}

const listLine = "      if (Array.isArray(list) && list.length) setNavData(list);";
const listReplacement = "      if (Array.isArray(list) && list.length) setNavData(ensureLandingSponsor(list));";
if (s.includes(listLine)) {
  s = s.replace(listLine, listReplacement);
  changes++;
}

const preloadTail = "                                    ? '/pendaftaran-turnamen'\n                                    : null;";
const preloadReplacement = "                                    ? '/pendaftaran-turnamen'\n                                    : effective === 'sponsorship' || effective === 'sponsor'\n                                      ? '/sponsorship'\n                                      : null;";
if (s.includes(preloadTail) && !s.includes("effective === 'sponsorship' || effective === 'sponsor'")) {
  s = s.replace(preloadTail, preloadReplacement);
  changes++;
}

const iconTail = "p.includes('contact') || l.includes('hubungi') ? MapPin : p.includes('faq') ? HelpCircle";
const iconReplacement = "p.includes('contact') || l.includes('hubungi') ? MapPin : p.includes('sponsorship') || p.includes('sponsor') || l.includes('sponsor') ? Sparkles : p.includes('faq') ? HelpCircle";
if (s.includes(iconTail) && !s.includes("p.includes('sponsorship') || p.includes('sponsor')")) {
  s = s.replace(iconTail, iconReplacement);
  changes++;
}

fs.writeFileSync(file, s);
console.log(`[patch-landing-sponsor-navbar] ${changes ? `applied ${changes} change(s)` : 'already applied / no change needed'}`);
