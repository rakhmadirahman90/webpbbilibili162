import fs from 'node:fs';

const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');
const original = code;

const addImport = "const PublicNewsModern = lazy(() => import('./components/PublicNewsModern'));";
if (!code.includes('PublicNewsModern')) {
  code = code.replace(
    "const PublicProgram = lazy(() => import('./components/PublicProgram'));",
    "const PublicProgram = lazy(() => import('./components/PublicProgram'));\n" + addImport
  );
}

// Prestasi is a public news category, while AdminPrestasi remains the management screen.
const menuNeedle = "'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'";
if (code.includes(menuNeedle)) {
  code = code.replaceAll(menuNeedle, "'berita', 'news', 'prestasi', 'program', 'faq', 'sambutan', 'sambutan-ketua'");
}

const initialNeedle = "'berita', 'news', 'faq'";
if (code.includes(initialNeedle)) {
  code = code.replace(initialNeedle, "'berita', 'news', 'prestasi', 'faq'");
}

// Replace the public route so /prestasi consistently renders filtered achievement news.
code = code.replace(
  /<Route path=\\"prestasi\\" element=\{isAdmin \? <AdminPrestasi \/> : <div className=\\"p-4 sm:p-6\\"><PublicPrestasi \/><\/div>\} \/>/,
  '<Route path="prestasi" element={isAdmin ? <AdminPrestasi /> : <PublicNewsModern initialCategory="PRESTASI" />} />'
);

// Replace active-view renderers when the existing News renderer is present.
if (!code.includes("activeView === 'prestasi'")) {
  const newsRenderer = "{(activeView === 'berita' || activeView === 'news') && <News />}";
  if (code.includes(newsRenderer)) {
    code = code.replace(
      newsRenderer,
      "{(activeView === 'berita' || activeView === 'news') && <PublicNewsModern />}\n                    {activeView === 'prestasi' && <PublicNewsModern initialCategory=\"PRESTASI\" />}"
    );
  }
}

// If the old PublicPrestasi renderer is used outside Routes, keep it from being selected for the public page.
code = code.replace(
  "{(activeView === 'prestasi') && <PublicPrestasi />}",
  "{activeView === 'prestasi' && <PublicNewsModern initialCategory=\"PRESTASI\" />}"
);

if (code !== original) fs.writeFileSync(path, code);
console.log(`[patch-modern-public-news] ${path}: ${code !== original ? 'updated' : 'no changes'}`);
