import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

// App: add the public form import without relying on the exact formatting of previous patches.
{
  const path = 'src/App.tsx';
  let s = read(path);
  if (!s.includes('ContactFeedbackForm')) {
    const m = s.match(/import React[^\n]*\n/);
    if (!m) throw new Error('[patch-contact-feedback] React import not found');
    s = s.replace(m[0], `${m[0]}import ContactFeedbackForm from './components/ContactFeedbackForm';\n`);
  }
  if (!s.includes('<ContactFeedbackForm/>')) {
    const before = s;
    s = s.replace(/<Contact\s*\/>/g, '<><Contact/><ContactFeedbackForm/></>');
    if (s === before) throw new Error('[patch-contact-feedback] Contact render marker not found');
  }
  write(path, s);
  console.log('[patch-contact-feedback] public Contact form wired');
}

// Admin route: use the existing /admin/surat route and wrap KelolaSurat with the integrated inbox.
{
  const path = 'src/components/AdminRouteView.tsx';
  let s = read(path);
  if (!s.includes('KelolaSuratTerintegrasi')) {
    const m = s.match(/import[^\n]*KelolaSurat[^\n]*\n/);
    if (!m) throw new Error('[patch-contact-feedback] KelolaSurat import marker not found');
    s = s.replace(m[0], `${m[0]}import KelolaSuratTerintegrasi from './KelolaSuratTerintegrasi';\n`);
  }
  if (!s.includes('case \'surat\': return adminOnly(KelolaSuratTerintegrasi);')) {
    const before = s;
    s = s.replace(/case\s*['\"]surat['\"]\s*:\s*return\s+adminOnly\(KelolaSurat\)\s*;/, "case 'surat': return adminOnly(KelolaSuratTerintegrasi);");
    if (s === before) throw new Error('[patch-contact-feedback] surat route marker not found');
  }
  write(path, s);
  console.log('[patch-contact-feedback] admin surat integration wired');
}

// Sidebar: keep one admin entry, but make the integration visible.
{
  const path = 'src/components/Sidebar.tsx';
  let s = read(path);
  if (!s.includes('Kelola Surat & Masukan')) {
    const before = s;
    s = s.replace(/\{\s*name:\s*['\"]Kelola Surat['\"]\s*,\s*path:\s*['\"]surat['\"]\s*,\s*icon:\s*Mail\s*,\s*adminOnly:\s*true\s*\},/, "{ name: 'Kelola Surat & Masukan', path: 'surat', icon: Mail, adminOnly: true },");
    if (s === before) throw new Error('[patch-contact-feedback] sidebar surat marker not found');
  }
  write(path, s);
  console.log('[patch-contact-feedback] sidebar label wired');
}
