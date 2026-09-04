import fs from 'node:fs';

const path = 'src/supabase.ts';
let src = fs.readFileSync(path, 'utf8');

const before = `    // Do not abort authenticated/admin reads aggressively. A 5s deadline was causing\n    // large pendaftaran_turnamen queries to surface as "AbortError" / "signal is aborted".\n    // Respect an existing caller signal; only apply a generous fallback timeout when\n    // the caller did not provide one.\n    const controller = !init?.signal && typeof AbortController !== 'undefined' ? new AbortController() : null;\n    const timeoutMs = 30_000;\n    const timeout = controller\n      ? (typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : setTimeout(() => controller.abort(), timeoutMs))\n      : null;\n    try {\n      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller?.signal });`;
const after = `    // Admin tournament reads must not inherit short-lived caller abort signals.\n    // React/Supabase lifecycle events can cancel a caller while the database request\n    // is still valid, which previously surfaced as "AbortError / signal is aborted"\n    // and left the admin table showing 0 rows. Give this read its own 30s deadline.\n    const isTournamentRegistrationRead = getTableFromRestUrl(targetUrl) === 'pendaftaran_turnamen';\n    const controller = (isTournamentRegistrationRead || !init?.signal) && typeof AbortController !== 'undefined'\n      ? new AbortController()\n      : null;\n    const timeoutMs = 30_000;\n    const timeout = controller\n      ? (typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : setTimeout(() => controller.abort(), timeoutMs))\n      : null;\n    const effectiveSignal = isTournamentRegistrationRead ? controller?.signal : (init?.signal || controller?.signal);\n    try {\n      const response = await nativeFetch(input, { ...init, signal: effectiveSignal });`;

if (src.includes(before)) {
  src = src.replace(before, after);
} else if (!src.includes('const isTournamentRegistrationRead = getTableFromRestUrl(targetUrl) === \'pendaftaran_turnamen\';')) {
  throw new Error('[patch-supabase-fetch-timeout] target block not found');
}

src = src.replace(`      clearTimeout(timeout);`, `      if (timeout) clearTimeout(timeout);`);
fs.writeFileSync(path, src, 'utf8');
console.log('[patch-supabase-fetch-timeout] tournament admin reads isolated from caller abort signals with 30s timeout');
