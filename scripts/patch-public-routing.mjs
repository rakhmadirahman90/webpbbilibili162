import fs from 'node:fs';

function patchFile(path, replacements) {
  let code = fs.readFileSync(path, 'utf8');
  const original = code;
  let changed = 0;

  for (const { test, replace, label } of replacements) {
    if (test(code)) {
      const next = replace(code);
      if (next !== code) {
        code = next;
        changed += 1;
        console.log(`[patch-public-routing] ${path}: ${label}`);
      }
    }
  }

  if (code !== original) fs.writeFileSync(path, code);
  console.log(`[patch-public-routing] ${path}: ${changed} change(s)`);
}

const app = 'src/App.tsx';
patchFile(app, [
  {
    label: 'add prestasi/program to every full-page menu list',
    test: code => code.includes("'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'"),
    replace: code => code.replaceAll(
      "'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'",
      "'berita', 'news', 'prestasi', 'program', 'faq', 'sambutan', 'sambutan-ketua'"
    )
  },
  {
    label: 'add prestasi/program to initial full-page menu state',
    test: code => code.includes("'inventaris', 'berita', 'news', 'faq'") && !code.includes("'inventaris', 'berita', 'news', 'prestasi', 'program', 'faq'"),
    replace: code => code.replace(
      "'inventaris', 'berita', 'news', 'faq'",
      "'inventaris', 'berita', 'news', 'prestasi', 'program', 'faq'"
    )
  },
  {
    label: 'add public prestasi/program renderers',
    test: code => !code.includes("activeView === 'prestasi'") && code.includes("activeView === 'berita'") && code.includes("activeView === 'galeri'"),
    replace: code => code.replace(
      /(\s*\{\(activeView === 'berita' \|\| activeView === 'news'\) && <News \/>\})/,
      `$1\n                    {(activeView === 'prestasi') && <PublicPrestasi />}\n                    {(activeView === 'program') && <PublicProgram onNavigate={(path) => handleNavigate(path)} />}`
    )
  }
]);

const navbar = 'src/components/Navbar.tsx';
patchFile(navbar, [
  {
    label: 'child submenu routing',
    test: code => !code.includes('// Submenu navigation must target the child path') && code.includes("if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');"),
    replace: code => code.replace(
      "    if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');",
      `    if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');
    // Submenu navigation must target the child path, not the parent dropdown.
    if (s) {
      if (['sejarah','visi-misi','visi','misi','fasilitas','struktur','struktur-organisasi','dokumen','dokumen-penting','prestasi','program','faq','berita','news'].includes(s)) return onNavigate(s);
      if (s === 'peringkat' || s === 'ranking' || s === 'rankings') return onNavigate('peringkat');
      if (s === 'register' || s === 'pendaftaran') return onNavigate('register');
      if (s === 'gallery' || s === 'galeri') return onNavigate('galeri');
      if (s === 'jadwal' || s.includes('jadwal')) return onNavigate('jadwal');
      if (s === 'contact' || s === 'kontak') return onNavigate('contact');
    }`
    )
  }
]);

console.log('[patch-public-routing] Public routing patch completed safely.');
