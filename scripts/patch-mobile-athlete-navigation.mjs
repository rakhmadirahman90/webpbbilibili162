import fs from 'node:fs';

const file = 'src/components/Navbar.tsx';
if (!fs.existsSync(file)) {
  console.warn('[patch-mobile-athlete-navigation] Navbar.tsx not found; skipped.');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');
const original = source;

// The Navbar has its own router navigation helper. Route-aware public pages
// (especially Players) already expose the correct onNavigate callback, so use
// that callback instead of pushing /Senior or /Muda, which App.tsx does not
// recognize as standalone routes. This also makes the top-level Atlet item
// selectable on mobile.
const goRegex = /  const go = \(path: string, subPath\?: string\) => \{[\s\S]*?\n  \};/;
const replacement = `  const go = (path: string, subPath?: string) => {
    setOpenMenu(null);
    setMobileOpen(false);
    try {
      onNavigate(path, subPath);
    } catch {
      const p = normalizeNavigationPath(subPath || path || 'home');
      const athlete = ['atlet', 'players', 'player', 'semua', 'senior', 'muda'].includes(p);
      window.location.assign(athlete ? '/atlet' : (p === 'home' ? '/' : \`/\${p}\`));
    }
  };`;

if (goRegex.test(source)) {
  source = source.replace(goRegex, replacement);
} else {
  console.warn('[patch-mobile-athlete-navigation] go() helper pattern not found; skipped helper replacement.');
}

// Make Atlet parent navigation explicit: tapping the menu itself opens the
// athlete page, while submenu buttons remain responsible for their filters.
const parentRegex = /  const handleMobileParentClick = \(event: React\.MouseEvent<HTMLButtonElement>, menu: any, expanded: boolean, drop: boolean\) => \{[\s\S]*?\n  \};/;
const parentReplacement = `  const handleMobileParentClick = (event: React.MouseEvent<HTMLButtonElement>, menu: any, expanded: boolean, drop: boolean) => {
    event.preventDefault();
    event.stopPropagation();

    const menuPath = normalizeNavigationPath(menu?.path || '');
    const menuLabel = String(menu?.label || '').toLowerCase().trim();
    const isAthlete = menuPath === 'atlet' || menuPath === 'players' || menuLabel === 'atlet';

    if (isAthlete) {
      go(menu.path || 'atlet');
      return;
    }

    if (drop) {
      setOpenMenu(expanded ? null : menu.id);
    } else {
      go(menu.path);
    }
  };`;

if (parentRegex.test(source)) {
  source = source.replace(parentRegex, parentReplacement);
} else {
  console.warn('[patch-mobile-athlete-navigation] parent click handler pattern not found; skipped parent handler replacement.');
}

if (source !== original) {
  fs.writeFileSync(file, source, 'utf8');
  console.log('[patch-mobile-athlete-navigation] Atlet parent + Semua/Senior/Muda navigation fixed.');
} else {
  console.log('[patch-mobile-athlete-navigation] no changes needed.');
}
