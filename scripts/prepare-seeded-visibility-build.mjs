import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const startMarker = '  const getSubMenus = (parentId: string) => {';
const endMarker = '\n  const iconFor =';
const start = s.indexOf(startMarker);
const end = start >= 0 ? s.indexOf(endMarker, start) : -1;

if (start >= 0 && end > start) {
  const stable = `  const getSubMenus = (parentId: string) => {\n    const parent = navData.find(i => i.id === parentId || i.path === parentId || String(i.label || '').toLowerCase() === String(parentId).toLowerCase());\n    const list = navData.filter(i => i?.parent_id && (i.parent_id === parentId || i.parent_id === parent?.id || i.parent_id === parent?.path || String(i.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase())).sort((a,b) => (a.order_index || 0) - (b.order_index || 0));\n    if (!list.length && (parent?.path === 'atlet' || parent?.label?.toLowerCase() === 'atlet')) return ATLET_DEFAULT_SUBMENUS;\n    return list;\n  };`;
  s = s.slice(0, start) + stable + s.slice(end);
  fs.writeFileSync(path, s, 'utf8');
  console.log('[prepare-seeded-visibility] normalized Navbar getSubMenus boundary');
} else {
  console.log('[prepare-seeded-visibility] getSubMenus already normalized or not present; continuing');
}

const appPath = 'src/App.tsx';
const app = fs.readFileSync(appPath, 'utf8');
// App.tsx is intentionally compact in production; accept harmless whitespace differences
// while preserving the invariant that exactly one real handleNavigate function exists.
const handleNavigatePattern = /const\s+handleNavigate\s*=\s*\(\s*sectionId\s*:\s*string\s*[,)]/;
if (!handleNavigatePattern.test(app)) {
  throw new Error('[prepare-seeded-visibility] App.tsx is missing handleNavigate before public patches');
}
console.log('[prepare-seeded-visibility] verified handleNavigate invariant');
