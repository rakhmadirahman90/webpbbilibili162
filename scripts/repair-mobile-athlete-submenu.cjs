const fs = require('fs');
const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const anchor = `// Helper to check if an item is top-level (main menu)`;
const fallback = `const MOBILE_ATHLETE_SUBMENUS = [\n  { id: 'mobile-athlete-all', label: 'Semua Atlet', path: 'Semua', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 1 },\n  { id: 'mobile-athlete-senior', label: 'Atlet Senior', path: 'Senior', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 2 },\n  { id: 'mobile-athlete-young', label: 'Atlet Muda', path: 'Muda', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 3 },\n];\n\n`;
if (!s.includes('const MOBILE_ATHLETE_SUBMENUS')) {
  if (!s.includes(anchor)) throw new Error('Navbar anchor not found');
  s = s.replace(anchor, fallback + anchor);
}

const startMarker = '  const getSubMenus = (parentId: string) => {';
const endMarker = '\n  // Helper function to get an appropriate icon for any menu item';
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('getSubMenus block not found');

const replacement = `  const getSubMenus = (parentId: string) => {\n    const parentItem = navData.find(i => String(i?.id) === String(parentId));\n    const normalizedParentPath = String(parentItem?.path || '').toLowerCase().trim();\n    const normalizedParentLabel = String(parentItem?.label || '').toLowerCase().trim();\n\n    const children = navData.filter(item => {\n      if (!item) return false;\n      const childParent = String(item.parent_id ?? '').trim();\n      if (!childParent || childParent === 'none' || childParent === 'null') return false;\n      return childParent === String(parentId);\n    }).sort((a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));\n\n    const isAthlete = normalizedParentPath === 'atlet' || normalizedParentLabel === 'atlet' || String(parentId) === '9209cc42-be89-4086-9041-35f49acfd96e';\n    if (isAthlete) {\n      const athleteChildren = children.filter(item => {\n        const p = String(item.path || '').toLowerCase().trim();\n        const l = String(item.label || '').toLowerCase().trim();\n        return p === 'semua' || p === 'senior' || p === 'muda' || l.includes('semua atlet') || l.includes('atlet senior') || l.includes('atlet muda');\n      });\n      return athleteChildren.length ? athleteChildren : MOBILE_ATHLETE_SUBMENUS;\n    }\n\n    return children;\n  };\n`;
s = s.slice(0, start) + replacement + s.slice(end + 1);

const oldClick = `                              onClick={() => {\n                                handleNavClick(menu.path, sub.path);\n                              }}`;
const newClick = `                              onPointerDown={(e) => e.stopPropagation()}\n                              onClick={(e) => {\n                                e.preventDefault();\n                                e.stopPropagation();\n                                handleNavClick(menu.path, sub.path);\n                              }}`;
if (s.includes(oldClick)) s = s.replace(oldClick, newClick);

fs.writeFileSync(path, s);
console.log('Mobile Atlet submenu repair applied.');
