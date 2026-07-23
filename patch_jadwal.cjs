const fs = require('fs');
let code = fs.readFileSync('src/components/JadwalLatihanView.tsx', 'utf-8');

// Replace state structure usage
code = code.replace(/isRabuActive/g, 'isSelasaActive');
code = code.replace(/isRabuFinished/g, 'isSelasaFinished');

// The file JadwalLatihanView.tsx uses schedules static array. Let's rewrite JadwalLatihanView.tsx entirely to match Tarung Derajat schedules.
