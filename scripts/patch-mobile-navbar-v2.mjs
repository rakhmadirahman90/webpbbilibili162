import fs from 'node:fs';

const file = 'src/components/Navbar.tsx';
let text = fs.readFileSync(file, 'utf8');

// Deterministic mobile submenu repair. Do not depend on Supabase UUIDs.
const getSubMenusBlock = /  const getSubMenus = \(parentId: string\) => \{[\s\S]*?\n  \};/;
const replacement = `  const getSubMenus = (parentId: string) => {
    const parentItem = navData.find(i => String(i.id) === String(parentId));
    const parentPath = String(parentItem?.path || '').toLowerCase().trim();
    const parentLabel = String(parentItem?.label || '').toLowerCase().trim();

    const children = navData.filter(item => {
      if (!item || item.parent_id === null || item.parent_id === undefined || item.parent_id === '' || item.parent_id === 'none') return false;
      return String(item.parent_id) === String(parentId) || String(item.parent_id) === String(parentItem?.id || '');
    }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    if (children.length > 0) return children;

    // Canonical fallback: keeps the mobile dropdown usable even when
    // navbar_settings contains stale/mismatched parent UUIDs.
    const canonical: Record<string, any[]> = {
      atlet: [
        { id: 'mobile-atlet-semua', label: 'Semua Atlet', path: 'Semua', type: 'link', order_index: 1 },
        { id: 'mobile-atlet-senior', label: 'Atlet Senior', path: 'Senior', type: 'link', order_index: 2 },
        { id: 'mobile-atlet-muda', label: 'Atlet Muda', path: 'Muda', type: 'link', order_index: 3 },
      ],
      informasi: [
        { id: 'mobile-info-berita', label: 'Berita', path: 'berita', type: 'link', order_index: 1 },
        { id: 'mobile-info-prestasi', label: 'Prestasi', path: 'prestasi', type: 'link', order_index: 2 },
      ],
      peringkat: [
        { id: 'mobile-rank-atlet', label: 'Ranking Atlet', path: 'peringkat', type: 'link', order_index: 1 },
        { id: 'mobile-rank-quiz', label: 'Quiz Badminton', path: 'quiz', type: 'link', order_index: 2 },
      ],
    };

    if (canonical[parentPath]) return canonical[parentPath];

    const defaultParent = DEFAULT_NAV_ITEMS.find(item =>
      String(item.path || '').toLowerCase().trim() === parentPath ||
      String(item.label || '').toLowerCase().trim() === parentLabel
    );
    if (!defaultParent) return [];

    return DEFAULT_NAV_ITEMS
      .filter(item => String(item.parent_id || '') === String(defaultParent.id))
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  };`;

if (!getSubMenusBlock.test(text)) throw new Error('Navbar getSubMenus block not found');
text = text.replace(getSubMenusBlock, replacement);

// Canonical dropdown paths remain expandable even if Supabase stores them as links.
text = text.replace(
  /const isDropdown = menu\.type === 'dropdown' \|\| subMenus\.length > 0;/g,
  "const isDropdown = menu.type === 'dropdown' || subMenus.length > 0 || ['atlet', 'informasi', 'about', 'peringkat'].includes(String(menu.path || '').toLowerCase().trim());"
);

// Make mobile submenu rows clearly visible and comfortable to tap.
text = text.replace(
  'className="bg-[#070c18]/80 border-l-2 border-blue-500/50 my-1 ml-2 pl-2 pr-1 flex flex-col py-1 gap-0.5 animate-in fade-in duration-200 rounded-r-lg"',
  'className="bg-[#050b16]/90 border border-white/5 border-l-2 border-l-blue-500/70 my-1.5 ml-2 pl-2 pr-1 flex flex-col py-2 gap-1 animate-in fade-in duration-200 rounded-r-xl shadow-inner"'
);
text = text.replace(
  'className="text-left py-1.5 px-2 text-[10.5px] font-semibold tracking-wider uppercase text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors flex items-center justify-between"',
  'className="text-left min-h-[42px] py-2.5 px-2.5 text-[11.5px] font-semibold tracking-wider uppercase text-slate-300 hover:text-white hover:bg-blue-600/10 rounded-lg transition-colors flex items-center justify-between touch-manipulation"'
);

fs.writeFileSync(file, text);
console.log('Mobile navbar v2 final submenu repair applied.');
