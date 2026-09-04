import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModern.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes("import { supabaseDirect } from '../supabaseDirect';")) {
  src = src.replace(
    "import { supabase } from '../supabase';",
    "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';"
  );
}

src = src.replaceAll("supabase.from('pendaftaran_turnamen')", "supabaseDirect.from('pendaftaran_turnamen')");

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-admin-registration-direct-client] critical tournament registration DB reads/writes use native Supabase client');
