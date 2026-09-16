import fs from 'node:fs';

const path = 'src/components/PublicPrestasi.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __PUBLIC_PRESTASI_LEGACY_CARDS_REMOVED_V1__ */';

if (!src.includes(marker)) {
  const legacyStart = '        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">';
  const paginationStart = '        {totalPages > 1 && <div className="pagination';
  const start = src.indexOf(legacyStart);
  const pagination = src.indexOf(paginationStart, start);
  const paginationEnd = pagination >= 0 ? src.indexOf('\n      </div>', pagination) : -1;

  if (start >= 0 && pagination >= 0 && paginationEnd >= 0) {
    src = src.slice(0, start) + `        ${marker}\n` + src.slice(paginationEnd + 1);
    fs.writeFileSync(path, src, 'utf8');
    console.log('[patch-hide-legacy-prestasi] removed legacy Tingkat/Emas/Perak/Prgg cards and pagination.');
  } else {
    console.log('[patch-hide-legacy-prestasi] legacy cards already absent or anchors not found; leaving source unchanged.');
  }
} else {
  console.log('[patch-hide-legacy-prestasi] legacy Prestasi cards already removed.');
}
