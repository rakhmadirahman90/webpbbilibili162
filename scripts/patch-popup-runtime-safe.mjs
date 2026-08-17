import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/ImagePopup.tsx');
let source = fs.readFileSync(file, 'utf8');

// Runtime-safe popup cleanup: never leave references to legacy drag callbacks.
// The public popup uses the current native/pointer navigation implementation.
source = source.replace(/\s+onDragStart=\{handleDragStart\}/g, '');
source = source.replace(/\s+onDragEnd=\{handleDragEnd\}/g, '');
source = source.replace(/\s+drag=\"x\"/g, '');
source = source.replace(/\s+dragDirectionLock/g, '');
source = source.replace(/\s+dragConstraints=\{\{\s*left:\s*0,\s*right:\s*0\s*\}\}/g, '');
source = source.replace(/\s+dragElastic=\{\{[\s\S]*?\}\}/g, '');
source = source.replace(/\s+dragMomentum=\{false\}/g, '');
source = source.replace(/\s+dragTransition=\{\{[\s\S]*?\}\}/g, '');

// Remove any legacy handler regardless of formatting/body contents.
source = source.replace(/\n\s*const handleDragEnd\s*=\s*\([\s\S]*?\n\s*\};\s*(?=\n\s*if \(promoImages\.length|\n\s*return \()/, '\n');
source = source.replace(/\n\s*const handleDragStart\s*=\s*\([\s\S]*?\n\s*\};\s*(?=\n)/, '\n');

if (/handleDragEnd|handleDragStart/.test(source)) {
  throw new Error('Popup runtime safety patch failed: legacy drag callback reference remains');
}

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-runtime-safe] removed legacy popup drag callback references');
