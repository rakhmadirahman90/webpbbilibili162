import fs from 'node:fs';

const path = 'src/components/FcmSettingsDashboard.tsx';
if (!fs.existsSync(path)) {
  console.warn('[patch-notification-update-center] target not found; skipped.');
  process.exit(0);
}

let s = fs.readFileSync(path, 'utf8');

if (!s.includes("import NotificationUpdates from './NotificationUpdates';")) {
  s = s.replace(
    "import Swal from 'sweetalert2';",
    "import Swal from 'sweetalert2';\nimport NotificationUpdates from './NotificationUpdates';"
  );
}

if (!s.includes('<NotificationUpdates />')) {
  const marker = '      {/* DUAL COLUMN WORKSPACE */}';
  if (s.includes(marker)) {
    s = s.replace(marker, '      <NotificationUpdates />\n\n' + marker);
  } else {
    console.warn('[patch-notification-update-center] insertion marker not found; import only.');
  }
}

fs.writeFileSync(path, s);
console.log('[patch-notification-update-center] notification update center applied.');
