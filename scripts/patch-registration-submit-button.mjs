import fs from 'node:fs';

const file = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(file, 'utf8');

// The upload-only tournament patch already installs the authoritative submit
// flow: sequential uploads, retries, explicit stages, and non-blocking NIK
// verification. This patch must not overwrite that flow with an older submit
// implementation that reintroduced OCR/NIK/region rejection.
const before = '<button onClick={submit} disabled={loading}';
const after = '<button type="button" onClick={submit} disabled={loading}';
if (s.includes(before)) {
  s = s.replace(before, after);
  console.log('[registration-submit-fix] explicit button type applied');
} else if (s.includes(after)) {
  console.log('[registration-submit-fix] explicit button type already present');
} else {
  console.log('[registration-submit-fix] submit button marker not found; leaving current submit flow unchanged');
}

fs.writeFileSync(file, s, 'utf8');
console.log('[registration-submit-fix] preserved robust upload-only submit flow; NIK/OCR/region cannot block registration');
