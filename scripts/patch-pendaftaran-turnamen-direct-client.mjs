import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(path, 'utf8');

const directImport = "import { supabaseDirect as supabase } from '../supabaseDirect';";
const normalImport = "import { supabase } from '../supabase';";

if (src.includes(directImport)) {
  console.log('[patch-pendaftaran-turnamen-direct-client] already applied; no-op');
} else if (src.includes(normalImport)) {
  src = src.replace(normalImport, directImport);
  fs.writeFileSync(path, src, 'utf8');
  console.log('[patch-pendaftaran-turnamen-direct-client] applied');
} else {
  throw new Error('[patch-pendaftaran-turnamen-direct-client] target import not found');
}
