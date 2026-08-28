import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');

const replacements = [
  ['<h1 className="mt-3 text-2xl sm:text-4xl font-black italic uppercase text-white">Pendaftaran Peserta</h1>', '<h1 className="mt-3 text-2xl sm:text-4xl font-black italic uppercase text-white">Pendaftaran Peserta Turnamen</h1>'],
  ['Pendaftaran Berhasil</p><h2 className="mt-2 text-2xl sm:text-3xl font-black text-white">BILIBILI 162 CUP I</h2>', 'Pendaftaran Turnamen Berhasil</p><h2 className="mt-2 text-2xl sm:text-3xl font-black text-white">BILIBILI 162 CUP I</h2>'],
  ['PENDAFTARAN BILIBILI 162 CUP I 2026', 'PENDAFTARAN PESERTA TURNAMEN — BILIBILI 162 CUP I 2026']
];
for (const [from, to] of replacements) s = s.replaceAll(from, to);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-tournament-registration-labels] tournament registration labels separated from athlete signup');
