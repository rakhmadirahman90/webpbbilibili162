import fs from 'node:fs';

const path = 'src/supabase.ts';
let src = fs.readFileSync(path, 'utf8');

const replacement = `    // Large admin reads must not inherit short-lived caller abort signals.
    // React/Supabase lifecycle events can cancel a caller while the database request
    // is still valid, which previously surfaced as "AbortError / signal is aborted"
    // and left admin tables showing 0 rows. Give these reads their own 30s deadline.
    const largeAdminReadTables = new Set(['pendaftaran_turnamen', 'seeded_players']);
    const isLargeAdminRead = largeAdminReadTables.has(getTableFromRestUrl(targetUrl));
    const controller = (isLargeAdminRead || !init?.signal) && typeof AbortController !== 'undefined'
      ? new AbortController()
      : null;
    const timeoutMs = 30_000;
    const timeout = controller
      ? (typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : setTimeout(() => controller.abort(), timeoutMs))
      : null;
    const effectiveSignal = isLargeAdminRead ? controller?.signal : (init?.signal || controller?.signal);
    try {
      const response = await nativeFetch(input, { ...init, signal: effectiveSignal });`;

const original = `    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = typeof window !== 'undefined' ? window.setTimeout(() => controller?.abort(), 5_000) : setTimeout(() => controller?.abort(), 5_000);
    try {
      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller?.signal });`;

const previous = `    // Do not abort authenticated/admin reads aggressively. A 5s deadline was causing
    // large pendaftaran_turnamen queries to surface as "AbortError" / "signal is aborted".
    // Respect an existing caller signal; only apply a generous fallback timeout when
    // the caller did not provide one.
    const controller = !init?.signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = 30_000;
    const timeout = controller
      ? (typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : setTimeout(() => controller.abort(), timeoutMs))
      : null;
    try {
      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller?.signal });`;

if (src.includes("const largeAdminReadTables = new Set(['pendaftaran_turnamen', 'seeded_players']);")) {
  console.log('[patch-supabase-fetch-timeout] already applied; no-op');
} else if (src.includes(original)) {
  src = src.replace(original, replacement);
  console.log('[patch-supabase-fetch-timeout] applied to original 5s fetch block');
} else if (src.includes(previous)) {
  src = src.replace(previous, replacement);
  console.log('[patch-supabase-fetch-timeout] upgraded previous 30s fetch block');
} else {
  throw new Error('[patch-supabase-fetch-timeout] target block not found');
}

src = src.replace(`      clearTimeout(timeout);`, `      if (timeout) clearTimeout(timeout);`);
fs.writeFileSync(path, src, 'utf8');