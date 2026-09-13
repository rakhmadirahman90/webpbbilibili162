import fs from 'node:fs';

const path = 'src/components/AdminKeuanganTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');

// Latest official report: 13 September 2026.
// The detailed expense rows total Rp54.473.800. Only show a warning when
// the live detailed total differs from that official detailed total.
s = s.replace(
  'const discrepancy = totalOut - 55303800;',
  'const officialExpenseTotal = 54473800;\n  const discrepancy = totalOut - officialExpenseTotal;'
);

s = s.replace(
  'sedangkan total tertulis pada laporan resmi adalah <b className="text-white">Rp 55.303.800</b>. Selisih <b className="text-amber-200">{rupiah(Math.abs(discrepancy))}</b>. Sistem tidak mengubah angka sumber otomatis.',
  'sedangkan total pengeluaran resmi terbaru adalah <b className="text-white">{rupiah(officialExpenseTotal)}</b>. Selisih <b className="text-amber-200">{rupiah(Math.abs(discrepancy))}</b>. Periksa rincian transaksi sebelum mengubah data.'
);

// Sponsor & Donatur must contain only the 20 sponsor/donor entities.
// Tenant rent, shuttlecock profit and participant registration are separate
// income categories in the official report.
s = s.replace(
  "const sponsor = useMemo(() => income.filter(x => !['Uang Registrasi Peserta', 'Penjualan Shuttlecock'].includes(x.source_name)).reduce((a, x) => a + Number(x.amount || 0), 0), [income]);",
  "const sponsor = useMemo(() => income.filter(x => !['Uang Registrasi Peserta', 'Penjualan Shuttlecock', 'Sewa Tenan'].includes(x.source_name)).reduce((a, x) => a + Number(x.amount || 0), 0), [income]);"
);

s = s.replace(
  'Update resmi: 12 September 2026',
  'Update resmi: 13 September 2026'
);

fs.writeFileSync(path, s);
console.log('[patch-admin-finance-crud-visible] Finance dashboard aligned to official 13 September 2026 report.');
