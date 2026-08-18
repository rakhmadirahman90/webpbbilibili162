const fs = require('fs');
const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const anchor = `// Helper to check if an item is top-level (main menu)`;
const fallback = `const MOBILE_ATHLETE_SUBMENUS = [\n  { id: 'mobile-athlete-all', label: 'Semua Atlet', path: 'Semua', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 1 },\n  { id: 'mobile-athlete-senior', label: 'Atlet Senior', path: 'Senior', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 2 },\n  { id: 'mobile-athlete-young', label: 'Atlet Muda', path: 'Muda', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 3 },\n];\n\n`;
if (!s.includes('const MOBILE_ATHLETE_SUBMENUS')) {
  if (!s.includes(anchor)) throw new Error('Navbar anchor not found');
  s = s.replace(anchor, fallback + anchor);
}

const re = /  const getSubMenus = \(parentId: string\) => \{[\\s\\S]*?\n  \};/;
const replacement = `  const getSubMenus = (parentId: string) => {\n    const parentItem = navData.find(i => String(i?.id) === String(parentId));\n    const normalizedParentPath = String(parentItem?.path || '').toLowerCase().trim();\n    const normalizedParentLabel = String(parentItem?.label || '').toLowerCase().trim();\n\n    const children = navData.filter(item => {\n      if (!item) return false;\n      const childParent = String(item.parent_id ?? '').trim();\n      if (!childParent || childParent === 'none' || childParent === 'null') return false;\n      return childParent === String(parentId);\n    }).sort((a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));\n\n    // Atlet is deliberately resilient to stale/legacy navbar records.\n    // If the DB/cache has the Atlet parent but its children have mismatched parent_id,\n    // still render the canonical three athlete filters on mobile.\n    const isAthlete = normalizedParentPath === 'atlet' || normalizedParentLabel === 'atlet' || String(parentId) === '9209cc42-be89-4086-9041-35f49acfd96e';\n    if (isAthlete) {\n      const athleteChildren = children.filter(item => {\n        const p = String(item.path || '').toLowerCase().trim();\n        const l = String(item.label || '').toLowerCase().trim();\n        return p === 'semua' || p === 'senior' || p === 'muda' || l.includes('semua atlet') || l.includes('atlet senior') || l.includes('atlet muda');\n      });\n      return athleteChildren.length ? athleteChildren : MOBILE_ATHLETE_SUBMENUS;\n    }\n\n    return children;\n  };`;
if (!re.test(s)) throw new Error('getSubMenus function not found');
s = s.replace(re, replacement);

// Keep the mobile drawer open while choosing a submenu so the tap is reliable; close only after navigation.
s = s.replace(
`                              onClick={() => {\n                                handleNavClick(menu.path, sub.path);\n                              }}`,
`                              onPointerDown={(e) => e.stopPropagation()}\n                              onClick={(e) => {\n                                e.preventDefault();\n                                e.stopPropagation();\n                                handleNavClick(menu.path, sub.path);\n                              }}`
);

fs.writeFileSync(path, s);
console.log('Mobile Atlet submenu repair applied.');
