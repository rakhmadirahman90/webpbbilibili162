import fs from 'node:fs';

const path = 'src/components/AdminKeuanganTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');

// The latest official report dated 13 September 2026 confirms the detailed
// expense rows total Rp54.473.800. Show a warning only when the live detail
// total differs from that official detailed total; never compare against the
// superseded Rp55.303.800 figure.
s = s.replace(
  'const discrepancy = totalOut - 55303800;',
  'const officialExpenseTotal = 54473800;\n  const discrepancy = totalOut - officialExpenseTotal;'
);

s = s.replace(
  'sedangkan total tertulis pada laporan resmi adalah <b className="text-white">Rp 55.303.800</b>. Selisih <b className="text-amber-200">{rupiah(Math.abs(discrepancy))}</b>. Sistem tidak mengubah angka sumber otomatis.',
  'sedangkan total pengeluaran resmi terbaru adalah <b className="text-white">{rupiah(officialExpenseTotal)}</b>. Selisih <b className="text-amber-200">{rupiah(Math.abs(discrepancy))}</b>. Periksa rincian transaksi sebelum mengubah data.'
);

s = s.replace(
  'Update resmi: 12 September 2026',
  'Update resmi: 13 September 2026'
);

fs.writeFileSync(path, s);
console.log('[patch-admin-finance-crud-visible] Finance warning aligned to official 13 September 2026 report.');
