import fs from 'node:fs';

function replaceOnce(path, find, replacement, label) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes(replacement)) return;
  if (!s.includes(find)) throw new Error(`[patch-contact-feedback] ${label} marker not found`);
  s = s.replace(find, replacement);
  fs.writeFileSync(path, s, 'utf8');
  console.log(`[patch-contact-feedback] ${label} applied`);
}

function replaceRegexOnce(path, regex, replacement, label, alreadyMarker = replacement) {
  let s = fs.readFileSync(path, 'utf8');
  if (alreadyMarker && s.includes(alreadyMarker)) return;
  if (!regex.test(s)) throw new Error(`[patch-contact-feedback] ${label} marker not found`);
  s = s.replace(regex, replacement);
  fs.writeFileSync(path, s, 'utf8');
  console.log(`[patch-contact-feedback] ${label} applied`);
}

replaceRegexOnce(
  'src/App.tsx',
  /import\s+Contact\s+from\s+['\"]\.\/components\/Contact['\"];?/,
  "import Contact from './components/Contact';\nimport ContactFeedbackForm from './components/ContactFeedbackForm';",
  'ContactFeedbackForm import',
  "import ContactFeedbackForm from './components/ContactFeedbackForm';"
);

replaceRegexOnce(
  'src/App.tsx',
  /case\s*['\"]contact['\"]\s*:\s*case\s*['\"]kontak['\"]\s*:\s*return\s*<Contact\s*\/?>\s*;/,
  "case'contact':case'kontak':return <><Contact/><ContactFeedbackForm/></>;",
  'public contact feedback form',
  "case'contact':case'kontak':return <><Contact/><ContactFeedbackForm/></>;"
);

replaceRegexOnce(
  'src/components/AdminRouteView.tsx',
  /import\s+\{\s*KelolaSurat\s*\}\s+from\s+['\"]\.\/KelolaSurat['\"];?/,
  "import { KelolaSurat } from './KelolaSurat';\nimport KelolaSuratTerintegrasi from './KelolaSuratTerintegrasi';",
  'integrated surat import',
  "import KelolaSuratTerintegrasi from './KelolaSuratTerintegrasi';"
);
replaceOnce(
  'src/components/AdminRouteView.tsx',
  "case 'surat': return adminOnly(KelolaSurat);",
  "case 'surat': return adminOnly(KelolaSuratTerintegrasi);",
  'integrated surat route'
);

replaceOnce(
  'src/components/Sidebar.tsx',
  "{ name: 'Kelola Surat', path: 'surat', icon: Mail, adminOnly: true },",
  "{ name: 'Kelola Surat & Masukan', path: 'surat', icon: Mail, adminOnly: true },",
  'sidebar surat label'
);
