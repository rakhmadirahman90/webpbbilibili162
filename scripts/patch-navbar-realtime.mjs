import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/Navbar.tsx');
let source = fs.readFileSync(file, 'utf8');

const legacy = ".channel('navbar_realtime_sync')";
const replacement = ".channel(`navbar_realtime_sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)";

if (source.includes(legacy)) {
  source = source.replace(legacy, replacement);
  fs.writeFileSync(file, source, 'utf8');
  console.log('[patch-navbar-realtime] replaced static channel name with a unique channel id');
} else if (source.includes('navbar_realtime_sync_${Date.now()}')) {
  console.log('[patch-navbar-realtime] already patched');
} else {
  console.log('[patch-navbar-realtime] target not found; no change needed');
}
