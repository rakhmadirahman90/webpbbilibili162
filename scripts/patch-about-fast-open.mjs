import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/components');
let total = 0;

function patch(fileName, transform, label) {
  const file = path.join(root, fileName);
  let source = fs.readFileSync(file, 'utf8');
  const next = transform(source);
  if (next === source) {
    console.log(`[about-fast-open] ${fileName}: ${label} already applied`);
    return;
  }
  fs.writeFileSync(file, next, 'utf8');
  total++;
  console.log(`[about-fast-open] ${fileName}: ${label}`);
}

for (const fileName of ['Sejarah.tsx', 'VisiMisi.tsx', 'Fasilitas.tsx']) {
  patch(fileName, (source) => source
    .replace(/const \[loading, setLoading\] = useState\(true\);/g, 'const [loading, setLoading] = useState(false);')
    .replace(/\s*setLoading\(true\);\s*try \{/g, '\n      try {')
    .replace(/\s*\} finally \{\s*setLoading\(false\);\s*\}/g, '\n      }')
    .replace(/(setDynamicContent\(\{)/g, "try { localStorage.setItem('cached_about_content', JSON.stringify(val)); } catch (e) {}\n          $1")
  , 'non-blocking Supabase load');
}

patch('StrukturOrganisasiPublic.tsx', (source) => source
  .replace(
    /const \[members, setMembers\] = useState<Member\[\]>\(\[\]\);\s*const \[loading, setLoading\] = useState\(true\);/,
    `const [members, setMembers] = useState<Member[]>(() => {
    try {
      const cached = localStorage.getItem('cached_organizational_structure') || localStorage.getItem('structure_local_v3');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as Member[];
      }
    } catch (e) {}
    return DEFAULT_STRUKTUR as Member[];
  });
  const [loading, setLoading] = useState(false);`
  )
  .replace(/\s*\} finally \{\s*setLoading\(false\);\s*\}/g, '')
  .replace(/\s*window\.addEventListener\('site_setting_updated', handleUpdate\);/g, '')
  .replace(/\s*window\.removeEventListener\('site_setting_updated', handleUpdate\);/g, '')
  .replace(/initial="hidden" animate="visible"/g, 'initial={false} animate="visible"')
, 'instant cache and stable rendering');

console.log(`[about-fast-open] applied ${total} patch operations`);
