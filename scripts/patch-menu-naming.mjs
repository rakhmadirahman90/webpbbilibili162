import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const target = 'Edit Sambutan Ketua Umum';
const replacement = 'Kelola Sambutan Ketua Umum';
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) {
      const source = fs.readFileSync(full, 'utf8');
      if (source.includes(target)) {
        fs.writeFileSync(full, source.split(target).join(replacement), 'utf8');
        console.log(`[patch-menu-naming] ${path.relative(process.cwd(), full)}`);
      }
    }
  }
}

walk(root);
console.log(`[patch-menu-naming] ensured: ${target} -> ${replacement}`);
