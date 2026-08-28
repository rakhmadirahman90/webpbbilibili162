import fs from 'node:fs';

const file = 'src/components/SeededTurnamen.tsx';
if (!fs.existsSync(file)) {
  console.warn('[patch-seeded-generated-column] target file not found; leaving unchanged');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');

// normalized_name is a PostgreSQL generated column. It must never be written by the client.
s = s.replace(/\s*normalized_name:\s*string;?/, '');
s = s.replace(/,\s*normalized_name:\s*''/, '');
s = s.replace(/,\s*normalized_name:p\.normalized_name\|\|''/, '');
s = s.replace(/,\s*normalized_name:form\.normalized_name\.trim\(\)\|\|norm\(form\.player_name\)/, '');

// Defensive protection for older payload variants that may still contain the generated field.
const marker = "const result=editing?await supabase.from('seeded_players').update(payload):await supabase.from('seeded_players').insert(payload);";
if (s.includes(marker) && !s.includes("delete (payload as Record<string, unknown>).normalized_name")) {
  s = s.replace(marker, "delete (payload as Record<string, unknown>).normalized_name;\n      " + marker);
}

fs.writeFileSync(file, s, 'utf8');
console.log('[patch-seeded-generated-column] normalized_name write protection applied');
