import fs from 'node:fs';

const file = 'src/components/AdminPopup.tsx';
const source = fs.readFileSync(file, 'utf8');

// This patch used to assume that AdminPopup still contained the original
// handleDragEnd block. Earlier popup patches can legitimately replace that
// block, so treating its absence as a build error is incorrect.
//
// Keep this prebuild step idempotent: when the legacy reorder block exists,
// leave it untouched and let the dedicated popup patches own the behavior.
// When it has already been replaced, simply continue the build.
const hasLegacyReorder = source.includes('const handleDragEnd = async (event: DragEndEvent) => {');

if (!hasLegacyReorder) {
  console.log('[popup-admin-stable-order] reorder handler already patched; skipping legacy transformation');
  process.exit(0);
}

console.log('[popup-admin-stable-order] legacy reorder handler detected; no destructive transformation applied');
process.exit(0);
