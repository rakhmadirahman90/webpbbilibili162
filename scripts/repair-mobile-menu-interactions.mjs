import fs from 'node:fs';

const file = 'src/components/Navbar.tsx';
let text = fs.readFileSync(file, 'utf8');

// Final mobile interaction pass: run last so earlier compatibility patches
// cannot reintroduce the double-event/toggle bug.
const oldMobileMenuHandlers = /onPointerDown=\{\(e\) => \{ e\.preventDefault\(\); e\.stopPropagation\(\); if \(isDropdown\) setActiveDropdown\(activeDropdown === menu\.id \? null : menu\.id\); else handleNavClick\(menu\.path\); \}\} onClick=\{\(e\) => \{ e\.preventDefault\(\); e\.stopPropagation\(\); if \(isDropdown\) setActiveDropdown\(activeDropdown === menu\.id \? null : menu\.id\); \}\}/;
const newMobileMenuHandler = `onClick={(e) => {\n                      e.preventDefault();\n                      e.stopPropagation();\n                      if (isDropdown) setActiveDropdown(prev => prev === menu.id ? null : menu.id);\n                      else handleNavClick(menu.path);\n                    }}`;
if (oldMobileMenuHandlers.test(text)) {
  text = text.replace(oldMobileMenuHandlers, newMobileMenuHandler);
  console.log('Mobile menu row: removed duplicate pointer/click toggles.');
}

// Hamburger: one native click path is sufficient and avoids pointer/touch/click
// firing three times on Android browsers. Keep the touch target large.
text = text.replace(
  /onPointerDown=\{openMobileMenu\}\s*onTouchStart=\{openMobileMenu\}\s*onClick=\{openMobileMenu\}/,
  'onClick={openMobileMenu}'
);

// Robust athlete submenu resolution. Supabase may contain stale parent UUIDs;
// never allow unrelated children to suppress the canonical athlete submenu.
const getSubMenusBlock = /  const getSubMenus = \([^)]*\) => \{[\s\S]*?\n  \};/;
const replacement = `  const getSubMenus = (parentId: string, parentOverride?: any) => {
    const parentItem = parentOverride || navData.find(i => String(i?.id) === String(parentId));
    const parentPath = String(parentItem?.path || '').toLowerCase().trim();
    const parentLabel = String(parentItem?.label || '').toLowerCase().trim();
    const isAthlete = parentPath === 'atlet' || parentLabel === 'atlet' || String(parentId) === '9209cc42-be89-4086-9041-35f49acfd96e';

    const children = navData.filter(item => {
      if (!item) return false;
      const childParent = String(item.parent_id ?? '').trim();
      if (!childParent || childParent === 'none' || childParent === 'null') return false;
      return childParent === String(parentId) || childParent === String(parentItem?.id || '');
    }).sort((a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));

    if (isAthlete) {
      const athleteChildren = children.filter(item => {
        const p = String(item.path || '').toLowerCase().trim();
        const l = String(item.label || '').toLowerCase().trim();
        return p === 'semua' || p === 'senior' || p === 'muda' || l.includes('semua atlet') || l.includes('atlet senior') || l.includes('atlet muda');
      });
      return athleteChildren.length > 0 ? athleteChildren : MOBILE_ATHLETE_SUBMENUS;
    }

    if (children.length > 0) return children;

    const canonical: Record<string, any[]> = {
      informasi: [
        { id: 'mobile-info-berita', label: 'Berita', path: 'berita', type: 'link', order_index: 1 },
        { id: 'mobile-info-prestasi', label: 'Prestasi', path: 'prestasi', type: 'link', order_index: 2 },
      ],
      peringkat: [
        { id: 'mobile-rank-atlet', label: 'Ranking Atlet', path: 'peringkat', type: 'link', order_index: 1 },
        { id: 'mobile-rank-quiz', label: 'Quiz Badminton', path: 'quiz', type: 'link', order_index: 2 },
      ],
    };
    return canonical[parentPath] || [];
  };`;

if (getSubMenusBlock.test(text)) {
  text = text.replace(getSubMenusBlock, replacement);
  console.log('Mobile menu: robust athlete submenu resolver applied.');
}

// Canonical dropdowns must remain expandable even if Supabase says "link".
text = text.replace(
  /const isDropdown = menu\.type === 'dropdown' \|\| subMenus\.length > 0;/g,
  "const isDropdown = menu.type === 'dropdown' || subMenus.length > 0 || ['atlet', 'informasi', 'about', 'peringkat'].includes(String(menu.path || '').toLowerCase().trim());"
);
text = text.replace(
  /const isDropdown = isAthleteMenu \|\| menu\.type === 'dropdown' \|\| subMenus\.length > 0;/g,
  "const isDropdown = isAthleteMenu || menu.type === 'dropdown' || subMenus.length > 0 || ['atlet', 'informasi', 'about', 'peringkat'].includes(String(menu.path || '').toLowerCase().trim());"
);

// Make the mobile hamburger stable against narrow screens and browser chrome.
text = text.replace(
  'className="lg:hidden relative z-[1000001] flex items-center justify-center w-12 h-12 sm:w-[52px] sm:h-[52px] mr-0 rounded-2xl',
  'className="lg:hidden relative z-[1000001] ml-auto shrink-0 flex items-center justify-center w-12 h-12 sm:w-[52px] sm:h-[52px] mr-0 rounded-2xl'
);

fs.writeFileSync(file, text);
console.log('Final mobile menu interaction repair applied successfully.');
