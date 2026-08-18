import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let source = fs.readFileSync(path, 'utf8');

// The mobile hamburger was being squeezed out of the header by the fixed-width
// left branding/clock group. Keep the trigger independently positioned so it
// is always visible on phones and remains above the navbar content.
const oldTrigger = '<button className="lg:hidden p-2 text-slate-300 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(true)}>';
const newTrigger = '<button aria-label="Buka menu navigasi" type="button" className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 z-[10001] p-2.5 text-white bg-slate-800/90 border border-white/10 rounded-xl shadow-lg hover:bg-slate-700 transition-colors shrink-0" onClick={() => setIsMobileMenuOpen(true)}>';
if (source.includes(oldTrigger)) source = source.replace(oldTrigger, newTrigger);

// Give the navbar a positioning context for the absolute mobile trigger.
source = source.replace(
  '<nav className="fixed top-0 w-full bg-slate-900/95',
  '<nav className="fixed top-0 w-full bg-slate-900/95'
);

// Prevent the left side from claiming the trigger area on narrow screens.
source = source.replace(
  '<div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 h-14 lg:h-16 flex justify-between items-center overflow-visible">',
  '<div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 h-14 lg:h-16 flex justify-between items-center overflow-visible relative pr-14 lg:pr-8">'
);

// Add a stable keep-open navigation mode for mobile sidebar. Existing desktop
// behavior remains unchanged; only calls explicitly passing true keep it open.
const oldSignature = "const handleNavClick = (path: string, subPath?: string) => {\n    setActiveDropdown(null);\n    setIsMobileMenuOpen(false);";
const newSignature = "const handleNavClick = (path: string, subPath?: string, keepMobileMenuOpen = false) => {\n    setActiveDropdown(null);\n    if (!keepMobileMenuOpen) setIsMobileMenuOpen(false);";
if (source.includes(oldSignature)) source = source.replace(oldSignature, newSignature);

// Mobile Atlet parent: navigate to Atlet and keep the drawer visible.
const oldMobileHandler = `onClick={() => {\n                          if (isDropdown) {\n                            setActiveDropdown(activeDropdown === menu.id ? null : menu.id);\n                          } else {\n                            handleNavClick(menu.path);\n                          }\n                        }}`;
const newMobileHandler = `onClick={() => {\n                          const menuPath = (menu.path || '').toLowerCase();\n                          if (menuPath === 'atlet' || menuPath === 'players' || menuPath === 'player' || menuPath === 'pemain') {\n                            setActiveDropdown(activeDropdown === menu.id ? null : menu.id);\n                            handleNavClick(menu.path, undefined, true);\n                          } else if (isDropdown) {\n                            setActiveDropdown(activeDropdown === menu.id ? null : menu.id);\n                          } else {\n                            handleNavClick(menu.path);\n                          }\n                        }}`;
if (source.includes(oldMobileHandler)) source = source.replace(oldMobileHandler, newMobileHandler);

// Athlete child filters also keep the sidebar visible.
const oldChild = `onClick={() => {\n                                handleNavClick(menu.path, sub.path);\n                              }}`;
const newChild = `onClick={() => {\n                                const parentPath = (menu.path || '').toLowerCase();\n                                handleNavClick(menu.path, sub.path, parentPath === 'atlet' || parentPath === 'players' || parentPath === 'player' || parentPath === 'pemain');\n                              }}`;
if (source.includes(oldChild)) source = source.replace(oldChild, newChild);

fs.writeFileSync(path, source, 'utf8');
console.log('[patch-mobile-sidebar-visibility] Mobile sidebar trigger and keep-open behavior applied.');
