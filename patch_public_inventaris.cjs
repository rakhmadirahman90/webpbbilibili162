const fs = require('fs');

let code = fs.readFileSync('src/components/PublicInventaris.tsx', 'utf-8');

// The error happened because I used a bad regex for removing the button or something.
// Actually, I can just leave the component as-is but hide the Add/Edit buttons!
// This is much safer.
code = code.replace(
  /<button[^>]*onClick=\{handleOpenAdd\}[^>]*>[\s\S]*?<\/button>/,
  ''
);

code = code.replace(
  /<th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Aksi<\/th>/,
  ''
);

code = code.replace(
  /<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">[\s\S]*?<\/td>/g,
  (match) => {
    if (match.includes('handleEdit') || match.includes('handleDelete')) {
      return '';
    }
    return match;
  }
);

// We need to carefully remove showModal section OR just leave it alone since it's never triggered (because handleOpenAdd and handleEdit are removed)
// Actually leaving the showModal is fine.

fs.writeFileSync('src/components/PublicInventaris.tsx', code);
