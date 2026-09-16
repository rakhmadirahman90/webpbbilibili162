import fs from 'node:fs';

const path = 'src/components/PublicPrestasi.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __PUBLIC_PRESTASI_PHOTO_FIX_V1__ */';

if (src.includes(marker)) {
  console.log('[patch-public-prestasi-photo-fix] already applied');
  process.exit(0);
}

const badSelect = "select('id,tournament_id,status_pendaftaran,nama_pemain_1,nama_pemain_2,asal_pb,foto_pemain_1_url,foto_pemain_2_url,foto_pemain_1,foto_pemain_2')";
const goodSelect = "select('id,tournament_id,status_pendaftaran,nama_pemain_1,nama_pemain_2,asal_pb,foto_pemain_1_url,foto_pemain_2_url')";
if (!src.includes(badSelect)) {
  throw new Error('[patch-public-prestasi-photo-fix] expected invalid Prestasi select was not found');
}
src = src.replace(badSelect, goodSelect);

src = src.replace(
  "if (item?.signedUrl) next[paths[index]] = item.signedUrl;",
  "const signedUrl = item?.signedUrl || item?.signedURL;\n        if (signedUrl) next[paths[index]] = signedUrl;"
);

src = src.replace("\n\nexport default function PublicPrestasi()", `\n\n${marker}\n\nexport default function PublicPrestasi()`);
fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-prestasi-photo-fix] fixed invalid photo columns and hardened signed URL mapping');
