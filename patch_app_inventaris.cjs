const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /\{\(activeView === 'fasilitas'\) && <Fasilitas \/>\}/,
  `{(activeView === 'fasilitas') && <Fasilitas />}\n                        {(activeView === 'inventaris') && <PublicInventaris />}`
);

// We should also ensure PublicInventaris is fully scrollable and spacing is good, which the dedicated view should provide.
code = code.replace(
  /!\['register', 'pendaftaran', 'contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas'\]\.includes\(activeView\)/,
  `!['register', 'pendaftaran', 'contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris'].includes(activeView)`
);

// Update padding height for these dedicated views
code = code.replace(
  /\['contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas'\]\.includes\(activeView\)/,
  `['contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris'].includes(activeView)`
);

fs.writeFileSync('src/App.tsx', code);
