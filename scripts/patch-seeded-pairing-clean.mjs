import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
if (!fs.existsSync(path)) process.exit(0);
let s = fs.readFileSync(path, 'utf8');

// Final build-time sanitizer for the seeded pairing helpers. Previous patch
// generations could leave an invalid template literal around "Kombinasi level"
// in the generated TSX. Replace the whole helper blocks with plain strings.
const seededHelper = `
const seededLevel = (value: unknown) => {
  const raw = String(value || '').toUpperCase().trim();
  const match = raw.match(/\\b(C\\+|C-|A|B|C|D)\\b/);
  return match ? match[1] : '';
};
const pairRuleText = (category: string) => category === CATEGORIES[0]
  ? 'Ajatappareng: A + D, B + C-, atau C+ + C.'
  : 'Lokal CC: C + C-, C + D, C + C, C- + C-, C- + D, atau D + D.';
const isValidSeededPair = (category: string, a: string, b: string) => {
  const x = seededLevel(a);
  const y = seededLevel(b);
  if (!x || !y) return false;
  const key = [x, y].sort().join('|');
  if (category === CATEGORIES[0]) return ['A|D', 'B|C-', 'C|C+'].includes(key);
  return ['C|C', 'C|C-', 'C|D', 'C-|C-', 'C-|D', 'D|D'].includes(key);
};
const pairValidationMessage = (category: string, p1: any, p2: any) => {
  const l1 = seededLevel(p1?.seeded_quality || p1?.division_level);
  const l2 = seededLevel(p2?.seeded_quality || p2?.division_level);
  if (!l1 || !l2) return 'Level seeded Pemain 1 dan Pemain 2 belum lengkap.';
  return 'Kombinasi level ' + l1 + ' + ' + l2 + ' tidak diperbolehkan pada kategori ini. ' + pairRuleText(category);
};
`;

// Remove any prior generated pairing helper block if present.
const start = s.indexOf('const seededLevel =');
const ruleEnd = s.indexOf('const isValidSeededPair =', start);
if (start >= 0 && ruleEnd > start) {
  const end = s.indexOf('};', ruleEnd);
  if (end > ruleEnd) {
    // Also consume a following pairValidationMessage block when present.
    const msgStart = s.indexOf('const pairValidationMessage =', end + 2);
    let blockEnd = end + 2;
    if (msgStart >= 0 && msgStart < blockEnd + 3000) {
      const msgEnd = s.indexOf('};', msgStart);
      if (msgEnd > msgStart) blockEnd = msgEnd + 2;
    }
    s = s.slice(0, start) + seededHelper + s.slice(blockEnd);
  }
} else if (!s.includes('const pairValidationMessage =')) {
  const marker = "const CATEGORIES = ['Ganda Putra AD/BC-/C+C Ajatappareng', 'Ganda Putra CC Lokal Parepare'];";
  if (s.includes(marker)) s = s.replace(marker, marker + seededHelper);
}

// Independently replace a malformed pairValidationMessage block, if one survived.
const msgStart = s.indexOf('const pairValidationMessage =');
if (msgStart >= 0) {
  const msgEnd = s.indexOf('};', msgStart);
  if (msgEnd > msgStart) {
    const safeMsg = `const pairValidationMessage = (category: string, p1: any, p2: any) => {\n  const l1 = seededLevel(p1?.seeded_quality || p1?.division_level);\n  const l2 = seededLevel(p2?.seeded_quality || p2?.division_level);\n  if (!l1 || !l2) return 'Level seeded Pemain 1 dan Pemain 2 belum lengkap.';\n  return 'Kombinasi level ' + l1 + ' + ' + l2 + ' tidak diperbolehkan pada kategori ini. ' + pairRuleText(category);\n};`;
    s = s.slice(0, msgStart) + safeMsg + s.slice(msgEnd + 2);
  }
}

fs.writeFileSync(path, s);
console.log('[pairing-clean] seeded pairing helpers sanitized for production build');
