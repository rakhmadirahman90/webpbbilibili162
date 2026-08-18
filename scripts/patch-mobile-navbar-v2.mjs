import fs from 'node:fs';

const file = 'src/components/Navbar.tsx';
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('canonical menu definition so every dropdown remains functional')) {
  const old = `  const getSubMenus = (parentId: string) => {\n    const parentItem = navData.find(i => i.id === parentId);\n    return navData.filter(item => {\n      if (!item || !item.parent_id || item.parent_id === 'none' || item.parent_id === '') return false;\n      if (item.parent_id === parentId) return true;\n      if (parentItem && item.parent_id === parentItem.id) return true;\n      return false;\n    }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));\n  };`;

  const replacement = `  const getSubMenus = (parentId: string) => {\n    const parentItem = navData.find(i => String(i.id) === String(parentId));\n    const parentPath = String(parentItem?.path || '').toLowerCase().trim();\n    const parentLabel = String(parentItem?.label || '').toLowerCase().trim();\n\n    const children = navData.filter(item => {\n      if (!item || item.parent_id === null || item.parent_id === undefined || item.parent_id === '' || item.parent_id === 'none') return false;\n      return String(item.parent_id) === String(parentId) || String(item.parent_id) === String(parentItem?.id || '');\n    }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));\n\n    if (children.length > 0) return children;\n\n    // Resilient fallback: Supabase may contain different UUIDs or a parent row\n    // without children. Match the canonical menu by path/label so every\n    // dropdown, especially Atlet, remains functional on mobile.\n    const defaultParent = DEFAULT_NAV_ITEMS.find(item =>\n      String(item.path || '').toLowerCase().trim() === parentPath ||\n      String(item.label || '').toLowerCase().trim() === parentLabel\n    );\n\n    if (!defaultParent) return [];\n\n    return DEFAULT_NAV_ITEMS\n      .filter(item => String(item.parent_id || '') === String(defaultParent.id))\n      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));\n  };`;

  if (!text.includes(old)) throw new Error('Expected getSubMenus block not found');
  text = text.replace(old, replacement);
}

const replacements = [
  ['w-[270px] sm:w-[290px] max-w-[85vw]', 'w-[300px] sm:w-[320px] max-w-[88vw]'],
  ['bg-[#0b1224] border-r border-white/10 flex flex-col justify-between overflow-hidden shadow-2xl', 'bg-[#08101f]/98 border-r border-white/10 flex flex-col justify-between overflow-hidden shadow-[20px_0_60px_rgba(0,0,0,0.45)] backdrop-blur-xl'],
  ['py-2.5 px-3.5 border-b border-white/10', 'py-3 px-4 border-b border-white/10'],
  ['relative w-9 h-9 flex items-center justify-center shrink-0', 'relative w-10 h-10 flex items-center justify-center shrink-0'],
  ['text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/80', 'text-slate-400 hover:text-white w-10 h-10 p-0 rounded-xl bg-slate-800/80 border border-white/10'],
  ['flex-1 overflow-y-auto custom-scrollbar py-2 px-2 space-y-1 flex flex-col justify-start', 'flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1.5 flex flex-col justify-start'],
  ['w-full px-3 py-2 text-[11px] font-bold tracking-wider uppercase rounded-lg text-slate-200', 'w-full min-h-[48px] px-3.5 py-3 text-[12px] font-bold tracking-[0.045em] uppercase rounded-xl text-slate-200'],
  ["isExpanded ? 'bg-blue-600/15 text-blue-400' : ''", "isExpanded ? 'bg-gradient-to-r from-blue-600/25 via-blue-500/10 to-transparent text-blue-300 ring-1 ring-blue-500/20 shadow-lg shadow-blue-950/20' : ''"],
  ['bg-[#070c18]/80 border-l-2 border-blue-500/50 my-1 ml-2 pl-2 pr-1 flex flex-col py-1 gap-0.5 animate-in fade-in duration-200 rounded-r-lg', 'bg-[#050b16]/75 border border-white/5 border-l-2 border-l-blue-500/60 my-1.5 ml-2.5 pl-2 pr-1.5 flex flex-col py-2 gap-1 animate-in fade-in duration-200 rounded-r-xl shadow-inner'],
  ['text-left py-1.5 px-2 text-[10.5px] font-semibold', 'text-left min-h-[42px] py-2.5 px-2.5 text-[11.5px] font-semibold'],
  ['p-2.5 border-t border-white/10 bg-[#070d1a] shrink-0 flex flex-col gap-2', 'p-3 border-t border-white/10 bg-[#070d1a] shrink-0 flex flex-col gap-3'],
  ['bg-[#151d30]/60 border border-white/10 hover:border-blue-500/40 p-2 rounded-xl', 'bg-gradient-to-r from-[#111c32] to-[#0d1729] border border-white/10 hover:border-blue-500/40 p-3 rounded-2xl shadow-lg shadow-black/10'],
  ['w-7 h-7 rounded-lg bg-blue-600/20', 'w-9 h-9 rounded-xl bg-blue-600/20'],
  ['<Radio size={14}', '<Radio size={16}'],
  ['text-[8px] font-black tracking-widest', 'text-[9px] font-black tracking-widest'],
  ['text-[10px] font-bold text-white', 'text-[11px] font-bold text-white'],
  ['gap-5 pt-0.5', 'gap-7 pt-1'],
  ['<Youtube size={15} />', '<Youtube size={18} />'],
  ['<Instagram size={15} />', '<Instagram size={18} />'],
  ['<Facebook size={15} />', '<Facebook size={18} />'],
  ['<Twitter size={15} />', '<Twitter size={18} />'],
];

for (const [from, to] of replacements) text = text.replaceAll(from, to);

fs.writeFileSync(file, text);
console.log('Mobile navbar v2 patch applied.');
