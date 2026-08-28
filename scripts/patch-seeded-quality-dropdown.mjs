import fs from 'node:fs';

const path = 'src/components/SeededTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');
const replacement = "selectField('seeded_quality','Kualitas Seeded',qualities)";

const patterns = [
  /field\(\s*['"]seeded_quality['"]\s*,\s*['"]Kualitas Seeded['"]\s*\)/g,
  /field\(\s*['"]seeded_quality['"]\s*,\s*['"]Kualitas Seeded['"]\s*,\s*['"]text['"]\s*\)/g,
];

for (const pattern of patterns) {
  s = s.replace(pattern, replacement);
}

// `normalized_name` is a PostgreSQL generated column. It must never be sent
// in INSERT/UPDATE payloads; the database derives it automatically from
// `player_name`.
s = s.replace(/,normalized_name:form\.normalized_name\.trim\(\)\|\|norm\(form\.player_name\)/g, '');
s = s.replace(/,\s*normalized_name\s*:\s*form\.normalized_name\.trim\(\)\s*\|\|\s*norm\(form\.player_name\)/g, '');

// Do not expose a generated database column as an editable form control.
s = s.replace(/\{field\(['"]normalized_name['"]\s*,\s*['"]Nama Ter-normalisasi['"]\)\}/g, '');

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-seeded-quality-dropdown] applied database-backed quality dropdown and generated normalized_name CRUD fix');
