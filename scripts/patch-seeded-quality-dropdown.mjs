import fs from 'node:fs';

const path = 'src/components/SeededTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');
const replacement = "selectField('seeded_quality','Kualitas Seeded',qualities)";

const patterns = [
  /field\(\s*['"]seeded_quality['"]\s*,\s*['"]Kualitas Seeded['"]\s*\)/g,
  /field\(\s*['"]seeded_quality['"]\s*,\s*['"]Kualitas Seeded['"]\s*,\s*['"]text['"]\s*\)/g,
];

if (s.includes(replacement)) {
  console.log('[patch-seeded-quality-dropdown] already applied');
  process.exit(0);
}

let changed = false;
for (const pattern of patterns) {
  if (pattern.test(s)) {
    s = s.replace(pattern, replacement);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(path, s, 'utf8');
  console.log('[patch-seeded-quality-dropdown] Kualitas Seeded now uses database-backed dropdown options');
} else {
  // Do not break production builds if the known-good source already renders
  // the field through another equivalent implementation.
  console.log('[patch-seeded-quality-dropdown] marker not found; leaving source unchanged');
}
