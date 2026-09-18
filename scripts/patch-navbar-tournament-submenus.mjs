import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let src = fs.readFileSync(path, 'utf8');

const startMarker = "  const getSubMenus = (parentId: string) => {";
const endMarker = "\n  const iconFor =";
const start = src.indexOf(startMarker);
const end = src.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('[patch-navbar-tournament-submenus] getSubMenus block not found');
}

const replacement = `  const getSubMenus = (parentId: string) => {
    const parent = navData.find(i => i.id === parentId || i.path === parentId || String(i.label || '').toLowerCase() === String(parentId).toLowerCase());
    const matchesParent = (item: any) => item?.parent_id && (
      item.parent_id === parentId ||
      item.parent_id === parent?.id ||
      item.parent_id === parent?.path ||
      String(item.parent_id).toLowerCase() === String(parent?.label || '').toLowerCase()
    );
    const list = navData
      .filter(matchesParent)
      .filter((item: any) => item?.is_active !== false)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const isAtlet = parent?.path === 'atlet'
      || String(parent?.label || '').toLowerCase().trim() === 'atlet'
      || String(parentId).toLowerCase() === 'atlet';

    if (isAtlet) {
      const defaults = ATLET_DEFAULT_SUBMENUS.filter((item: any) => item?.is_active !== false);
      const key = (item: any) => normalizeNavigationPath(item?.path || '') || String(item?.label || '').toLowerCase().trim();
      const merged = [...list];
      for (const fallback of defaults) {
        if (!merged.some((item: any) => key(item) === key(fallback))) merged.push({ ...fallback });
      }
      return merged.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    }

    const isTournament = parent?.path === 'pendaftaran-turnamen'
      || String(parent?.label || '').toLowerCase().trim() === 'pendaftaran peserta'
      || String(parentId).toLowerCase() === 'pendaftaran-turnamen';

    if (isTournament) {
      const defaults = [
        { id: 'tournament-form-default', label: 'Formulir Pendaftaran Turnamen', path: 'pendaftaran-turnamen', type: 'link', parent_id: parent?.id || parentId, order_index: 1 },
        { id: 'tournament-seeded-default', label: 'Daftar Seeded Peserta', path: 'pendaftaran/seeded-peserta', type: 'link', parent_id: parent?.id || parentId, order_index: 2 },
        { id: 'tournament-accepted-default', label: 'Daftar Peserta Diterima', path: 'pendaftaran/peserta-diterima', type: 'link', parent_id: parent?.id || parentId, order_index: 3 },
        { id: 'tournament-sponsor-default', label: 'Daftar Sponsorship', path: 'sponsorship', type: 'link', parent_id: parent?.id || parentId, order_index: 4 },
      ];
      const key = (item: any) => ({
        p: normalizeNavigationPath(item?.path || ''),
        l: String(item?.label || '').toLowerCase().trim(),
      });
      const merged = [...list];
      for (const fallback of defaults) {
        const fp = normalizeNavigationPath(fallback.path);
        const fl = String(fallback.label).toLowerCase();
        const exists = merged.some((item: any) => {
          const k = key(item);
          return k.p === fp || k.l === fl
            || (fp === 'sponsorship' && (k.p.includes('sponsor') || k.l.includes('sponsor')))
            || (fp.includes('seeded-peserta') && (k.p.includes('seeded-peserta') || k.l.includes('seeded peserta')));
        });
        if (!exists) merged.push(fallback);
      }
      return merged.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    }

    return list;
  }`;

src = src.slice(0, start) + replacement + src.slice(end);

const preloadOld = `                                  : effective === 'pendaftaran-turnamen'\n                                    ? '/pendaftaran-turnamen'\n                                    : null;`;
const preloadNew = `                                  : (effective === 'pendaftaran-turnamen' || effective === 'pendaftaran/seeded-peserta' || effective === 'pendaftaran/peserta-diterima' || effective === 'sponsorship')\n                                    ? (effective === 'sponsorship' ? '/sponsorship' : effective === 'pendaftaran/seeded-peserta' ? '/pendaftaran/seeded-peserta' : effective === 'pendaftaran/peserta-diterima' ? '/pendaftaran/peserta-diterima' : '/pendaftaran-turnamen')\n                                    : null;`;
if (src.includes(preloadOld)) {
  src = src.replace(preloadOld, preloadNew);
} else if (!src.includes("effective === 'sponsorship'") || !src.includes("'/sponsorship'")) {
  throw new Error('[patch-navbar-tournament-submenus] preload mapping not found');
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-navbar-tournament-submenus] applied deterministic tournament submenu: Form + Seeded + Diterima + Sponsorship');
