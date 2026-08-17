import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');

// POPUP_SWIPE_FINAL: eliminate any legacy Framer drag callbacks that can
// survive earlier build patches and cause "handleDragEnd is not defined".
const replacements = [
  [/\s+onDragStart=\{handleDragStart\}/g, ''],
  [/\s+onDragEnd=\{handleDragEnd\}/g, ''],
  [/\s+drag=\"x\"/g, ''],
  [/\s+dragDirectionLock/g, ''],
  [/\s+dragConstraints=\{\{\s*left:\s*0,\s*right:\s*0\s*\}\}/g, ''],
  [/\s+dragElastic=\{\{[\s\S]*?\}\}/g, ''],
  [/\s+dragMomentum=\{false\}/g, ''],
  [/\s+dragTransition=\{\{[\s\S]*?\}\}/g, ''],
];

for (const [pattern, replacement] of replacements) {
  source = source.replace(pattern, replacement);
}

// Remove a legacy handler declaration if an earlier patch left it behind.
source = source.replace(
  /\n\s*const handleDragEnd\s*=\s*\(e:\s*any,\s*\{\s*offset,\s*velocity\s*\}:\s*any\)\s*=>\s*\{[\s\S]*?\n\s*\};\n/,
  '\n'
);

// Remove the legacy start handler if present.
source = source.replace(
  /\n\s*const handleDragStart\s*=\s*\([\s\S]*?\)\s*=>\s*\{[\s\S]*?\n\s*\};\n/,
  '\n'
);

if (!source.includes('POPUP_SWIPE_FINAL')) {
  source = source.replace(
    "function ImagePopup({ activeView = null }: ImagePopupProps = {}) {",
    "// POPUP_SWIPE_FINAL: legacy drag callbacks are intentionally removed; native pointer swipe from v4 is authoritative.\nfunction ImagePopup({ activeView = null }: ImagePopupProps = {}) {"
  );
}

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-swipe-final] removed all legacy drag callback references successfully');
