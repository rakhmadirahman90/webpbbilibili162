import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/KelolaSurat.tsx');
const source = fs.readFileSync(file, 'utf8');

const oldBlock = `    // Timeout guard so function returns targetId smoothly\n    const quickTimeout = new Promise(resolve => setTimeout(resolve, 300));\n    await Promise.race([syncPromise, quickTimeout]);\n\n    return resultId || targetId;`;

const newBlock = `    // Fast authoritative persistence: wait for the main write, but never block the UI on read-back verification.\n    // Edit/save should return promptly after Supabase/API persistence completes.\n    let persistenceTimer;\n    try {\n      await Promise.race([\n        syncPromise,\n        new Promise((_, reject) => {\n          persistenceTimer = setTimeout(() => reject(new Error('Penyimpanan surat timeout setelah 7 detik. Periksa koneksi database.')), 7000);\n        })\n      ]);\n    } finally {\n      if (persistenceTimer) clearTimeout(persistenceTimer);\n    }\n\n    // Do not perform a blocking read-back query here. The list/realtime sync will refresh the UI.\n    return resultId || targetId;`;

if (!source.includes(oldBlock)) {
  if (source.includes('Fast authoritative persistence: wait for the main write')) {
    console.log('[KelolaSurat] Fast persistence patch already applied.');
    process.exit(0);
  }
  throw new Error('Target persistence block was not found; source was not modified.');
}

fs.writeFileSync(file, source.replace(oldBlock, newBlock), 'utf8');
console.log('[KelolaSurat] Applied fast save persistence patch.');
