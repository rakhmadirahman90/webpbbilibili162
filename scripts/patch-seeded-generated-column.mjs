import fs from 'node:fs';

const file = 'src/components/SeededTurnamen.tsx';
if (!fs.existsSync(file)) {
  console.warn('[patch-seeded-generated-column] target file not found; leaving unchanged');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');

// normalized_name is derived by the database and must never be editable or written by the client.
s = s.replace(/\s*normalized_name:\s*string;?/g, '');
s = s.replace(/,\s*normalized_name:\s*''/g, '');
s = s.replace(/,\s*normalized_name:p\.normalized_name\|\|''/g, '');
s = s.replace(/,\s*normalized_name:form\.normalized_name\.trim\(\)\|\|norm\(form\.player_name\)/g, '');
s = s.replace(/\{field\('normalized_name','Nama Ter-normalisasi'\)\}/g, '');

// Remove the generated field defensively from any older payload construction.
const marker = "const result=editing?await supabase.from('seeded_players').update(payload):await supabase.from('seeded_players').insert(payload);";
if (s.includes(marker) && !s.includes("delete (payload as Record<string, unknown>).normalized_name")) {
  s = s.replace(marker, "delete (payload as Record<string, unknown>).normalized_name;\n      " + marker);
}

// Hard fail the build if the generated column is still present in the CRUD write payload.
const payloadStart = s.indexOf('const payload=');
const payloadEnd = s.indexOf(marker);
if (payloadStart >= 0 && payloadEnd > payloadStart) {
  const writeBlock = s.slice(payloadStart, payloadEnd);
  if (/normalized_name\s*:/.test(writeBlock)) {
    throw new Error('[patch-seeded-generated-column] normalized_name is still present in the CRUD payload');
  }
}

fs.writeFileSync(file, s, 'utf8');
console.log('[patch-seeded-generated-column] normalized_name CRUD protection applied and verified');
