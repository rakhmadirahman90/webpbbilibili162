import fs from 'node:fs';

const path = 'src/components/SeededTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');

// Keep the quality choices aligned with values already present in the seeded database.
// The component already derives `qualities` from the loaded players, so the dropdown
// remains current when the source data changes.
const patterns = [
  /field\(\s*['"]seeded_quality['"]\s*,\s*['"]Kualitas Seeded['"]\s*\)/g,
  /field\(\s*['"]seeded_quality['"]\s*,\s*['"]Kualitas Seeded['"]\s*,\s*['"]text['"]\s*\)/g,
];

let changed = false;
for (const pattern of patterns) {
  if (pattern.test(s)) {
    s = s.replace(pattern, "selectField('seeded_quality','Kualitas Seeded',qualities)");
    changed = true;
  }
}

// If an earlier patch already converted the field, leave it untouched.
if (s.includes("selectField('seeded_quality','Kualitas Seeded',qualities)")) changed = true;

if (!changed) {
  throw new Error('[seeded-quality] Kualitas Seeded field marker not found');
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-seeded-quality-dropdown] Kualitas Seeded uses database-backed dropdown options');
