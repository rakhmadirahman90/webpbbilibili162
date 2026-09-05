import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const appPath = 'src/App.tsx';
const adminRoutePath = 'src/components/AdminRouteView.tsx';
const adminLayoutPath = 'src/components/AdminLayout.tsx';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');

// The production build restores several source files before applying patches.
// Keep the seeded admin entry and route deterministic after that restore.
{
  let src = read(sidebarPath);
  const memberEntry = "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },";
  const tournamentEntry = "{ name: 'Pendaftaran Peserta Turnamen', path: 'pendaftaran-turnamen', icon: Trophy, adminOnly: true },";
  const seededEntry = "{ name: 'Kelola Seeded Peserta', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },";

  src = src.replaceAll("path: 'kelola-pendaftaran-turnamen'", "path: 'pendaftaran-turnamen'");

  // Normalize an older seeded label/path if it exists, without creating duplicates.
  src = src.replace(/\{ name: 'Seeded Resmi Bilibili 162', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true \},/g, seededEntry);
  src = src.replace(/\{ name: 'Seeded Peserta Bilibili 162', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true \},/g, seededEntry);

  if (!src.includes("path: 'pendaftaran-turnamen'")) {
    if (src.includes(memberEntry)) src = src.replace(memberEntry, `${memberEntry}\n        ${tournamentEntry}`);
  }

  if (!src.includes("path: 'seeded-turnamen'")) {
    const anchor = src.includes(tournamentEntry) ? tournamentEntry : memberEntry;
    if (src.includes(anchor)) src = src.replace(anchor, `${anchor}\n        ${seededEntry}`);
  } else if (!src.includes("name: 'Kelola Seeded Peserta'")) {
    // A legacy seeded entry exists under another label; keep one canonical entry.
    src = src.replace(/\{ name: '[^']*Seeded[^']*', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true \},/g, seededEntry);
  }

  write(sidebarPath, src);
}

// AdminRouteView is the authoritative renderer for /admin/* in the current app.
// Do not rely on the standalone App route because AdminLayout intercepts /admin/*.
{
  let src = read(adminRoutePath);
  const importLine = "import SeededTurnamen from './SeededTurnamen';";
  if (!src.includes(importLine)) {
    const marker = "import AdminSponsorship from './AdminSponsorship';";
    if (src.includes(marker)) src = src.replace(marker, `${marker} ${importLine}`);
  }

  const seededRoute = "case'seeded':case'seeded-turnamen':case'seeded-peserta':case'seeded-peserta-turnamen':case'peserta-seeded':case'pendaftaran/seeded':case'pendaftaran/seeded-peserta':return adminOnly(SeededTurnamen);";
  const seededRouteFormatted = "case 'seeded':\n    case 'seeded-turnamen':\n    case 'seeded-peserta':\n    case 'seeded-peserta-turnamen':\n    case 'peserta-seeded':\n    case 'pendaftaran/seeded':\n    case 'pendaftaran/seeded-peserta': return adminOnly(SeededTurnamen);";

  if (src.includes(seededRoute)) {
    src = src.replace(seededRoute, seededRouteFormatted);
  } else {
    const compact = /case'seeded':(?:case'[^']+':)*return adminOnly\(SeededTurnamen\);/;
    const formatted = /case\s+'seeded':\s*(?:case\s+'[^']+':\s*)+return adminOnly\(SeededTurnamen\);/;
    if (compact.test(src)) src = src.replace(compact, seededRouteFormatted);
    else if (formatted.test(src)) src = src.replace(formatted, seededRouteFormatted);
    else {
      const quizMarker = "case'quiz':return <BadmintonQuiz/>;";
      const quizFormatted = "case 'quiz':return <BadmintonQuiz/>;";
      const replacement = `${seededRouteFormatted}${quizMarker}`;
      if (src.includes(quizMarker)) src = src.replace(quizMarker, replacement);
      else if (src.includes(quizFormatted)) src = src.replace(quizFormatted, `${seededRouteFormatted}\n    ${quizFormatted}`);
    }
  }

  write(adminRoutePath, src);
}

// Keep the old tournament DOM-bridge from treating the canonical link as a duplicate.
{
  let src = read(adminLayoutPath);
  src = src.replace(
    'a[data-tournament-registration-entry="true"]',
    'a[data-tournament-registration-entry="true"], a[href="/admin/pendaftaran-turnamen"]'
  );
  write(adminLayoutPath, src);
}

console.log('[patch-seeded-turnamen-menu] admin seeded peserta navigation/rendering normalized safely');
