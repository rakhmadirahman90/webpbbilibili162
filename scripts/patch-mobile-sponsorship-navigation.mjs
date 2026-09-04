import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let source = fs.readFileSync(path, 'utf8');

const oldHandler = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n    go(path, subPath);\n  };`;

const newHandler = `  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>, path: string, subPath?: string) => {\n    event.preventDefault();\n    event.stopPropagation();\n    const normalizedSub = normalizeNavigationPath(subPath || '');\n    const normalizedPath = normalizeNavigationPath(path || '');\n    const target = normalizedSub || normalizedPath || 'home';\n    setOpenMenu(null);\n    setMobileOpen(false);\n    // Sponsorship has a dedicated Router route, so use an explicit navigation\n    // target on mobile to avoid the sidebar state swallowing the route change.\n    if (target === 'sponsorship' || target === 'sponsor' || target === 'daftar-sponsorship') {\n      try { navigate('/sponsorship'); } catch { window.location.assign('/sponsorship'); }\n      return;\n    }\n    const resolved = target === 'home' ? '/' : \`/\${target}\`;\n    try { navigate(resolved); } catch { window.location.assign(resolved); }\n  };`;

if (source.includes(oldHandler)) {
  source = source.replace(oldHandler, newHandler);
} else if (!source.includes('const handleMobileMenuClick')) {
  throw new Error('[patch-mobile-sponsorship-navigation] mobile handler boundary not found');
} else {
  console.log('[patch-mobile-sponsorship-navigation] handler already patched or boundary changed');
}

// Add a stable mobile-navigation marker to submenu buttons so future CSS/QA can
// distinguish the route without changing the visual design.
source = source.replace(
  `onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path)} className="w-full min-h-[44px]`,
  `onClick={(e) => handleMobileMenuClick(e, menu.path, sub.path)} data-mobile-nav-path={normalizeNavigationPath(sub.path || '')} className="w-full min-h-[44px]`
);

fs.writeFileSync(path, source, 'utf8');
console.log('[patch-mobile-sponsorship-navigation] mobile submenu navigation fixed for dedicated sponsorship route');
