import fs from 'node:fs';

const path = 'src/supabase.ts';
let src = fs.readFileSync(path, 'utf8');

const before = `    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;\n    const timeout = typeof window !== 'undefined' ? window.setTimeout(() => controller?.abort(), 5_000) : setTimeout(() => controller?.abort(), 5_000);\n    try {\n      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller?.signal });`;
const after = `    // Do not abort authenticated/admin reads aggressively. A 5s deadline was causing\n    // large pendaftaran_turnamen queries to surface as "AbortError" / "signal is aborted".\n    // Respect an existing caller signal; only apply a generous fallback timeout when\n    // the caller did not provide one.\n    const controller = !init?.signal && typeof AbortController !== 'undefined' ? new AbortController() : null;\n    const timeoutMs = 30_000;\n    const timeout = controller\n      ? (typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : setTimeout(() => controller.abort(), timeoutMs))\n      : null;\n    try {\n      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller?.signal });`;

if (src.includes(before)) {
  src = src.replace(before, after);
} else if (!src.includes('const timeoutMs = 30_000;')) {
  throw new Error('[patch-supabase-fetch-timeout] target block not found');
}

src = src.replace(`      clearTimeout(timeout);`, `      if (timeout) clearTimeout(timeout);`);
fs.writeFileSync(path, src, 'utf8');
console.log('[patch-supabase-fetch-timeout] Supabase REST fallback timeout increased to 30s and caller signals are preserved');
