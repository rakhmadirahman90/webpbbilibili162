import fs from 'node:fs';

const file = 'src/components/PendaftaranTurnamen.tsx';
const src = fs.readFileSync(file, 'utf8');
const oldValue = "const ADMIN_WA = '6289641676342';";
const newValue = "const ADMIN_WA = '6289616746342';";

if (src.includes(oldValue)) {
  fs.writeFileSync(file, src.replace(oldValue, newValue), 'utf8');
  console.log('[patch-registration-admin-wa] ADMIN_WA updated to 089616746342.');
} else if (src.includes(newValue)) {
  console.log('[patch-registration-admin-wa] ADMIN_WA already correct.');
} else {
  throw new Error('[patch-registration-admin-wa] ADMIN_WA marker not found.');
}
