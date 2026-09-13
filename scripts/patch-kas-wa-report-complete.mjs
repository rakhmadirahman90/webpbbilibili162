import fs from 'node:fs';

const path = 'src/components/KasRealtimeNotifier.tsx';
let s = fs.readFileSync(path, 'utf8');

const oldDetail = `const detail = (label: string, tx: any, income: boolean) => {
  if (!tx) return \`${label}: Nihil\\n\`;
  return \`${label}:\\n• Status: BERHASIL\\n• Jenis: \${income ? 'Pemasukan' : 'Pengeluaran'}\\n• Tanggal & Waktu: \${formatDateTime(tx)}\\n• Nama/Keterangan: \${tx.nama_pembayar || '-'}\\n• Kategori: \${tx.kategori || '-'}\\n• Jumlah: \${formatRupiah(tx.jumlah_bayar)}\\n\`;
};`;

const newDetail = `const detail = (label: string, tx: any, income: boolean) => {
  if (!tx) return \`${label}: Nihil\\n\`;
  return \`${label}:\\n• Status: BERHASIL\\n• Jenis: \${income ? 'Pemasukan' : 'Pengeluaran'}\\n• Tanggal & Waktu: \${formatDateTime(tx)}\\n• Nama/Keterangan: \${tx.nama_pembayar || '-'}\\n• Kategori: \${tx.kategori || '-'}\\n• Jumlah: \${formatRupiah(tx.jumlah_bayar)}\\n• Bola: \${Number(tx.jumlah_bola || 0)}\\n• Tipe Anggota: \${tx.tipe_anggota || '-'}\\n• Catatan: \${tx.keterangan || '-'}\\n\`;
};`;
if (s.includes(oldDetail)) s = s.replace(oldDetail, newDetail);

const oldWa = `const waText = \`📢 *\${title} — PB BILIBILI 162*\\n\\n\` +
        detail('*Detail Penerimaan Terbaru*', latestIncome, true) + '\\n' +
        detail('*Detail Pengeluaran Terbaru*', latestExpense, false) + '\\n' +
        \`*Ringkasan Periode \${startDate} s/d \${endDate}:*\\n\` +
        \`• Saldo Sebelumnya: \${formatRupiah(previous)}\\n\` +
        \`• Total Pemasukan: \${formatRupiah(income)}\\n\` +
        \`• Total Pengeluaran: \${formatRupiah(expense)}\\n\` +
        \`• *Saldo Akhir: \${formatRupiah(saldo)}*\\n\\n\` +
        \`🔗 \${window.location.origin}/kas\\n\\nAdmin PB Bilibili 162\`;`;

const newWa = `const modalTetap = 600000;
      const bendahara = saldo - modalTetap;
      const waText = \`📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*\\n\\n\` +
        \`*Detail Transaksi Penerimaan Terbaru:*\\n\` +
        detail('', latestIncome, true).replace(/^:\\n/, '') + '\\n' +
        \`*Detail Transaksi Pengeluaran Terbaru:* \${latestExpense ? '\\n' + detail('', latestExpense, false).replace(/^:\\n/, '') : 'Nihil'}\\n\\n\` +
        \`*Status Keuangan Klub (Filter \${startDate} s/d \${endDate}):*\\n\` +
        \`• Saldo Sebelumnya: \${formatRupiah(previous)}\\n\` +
        \`• Total Pemasukan Periode: \${formatRupiah(income)}\\n\` +
        \`• Total Pengeluaran Periode: \${formatRupiah(expense)}\\n\` +
        \`• Detail Pemasukan Terakhir: \${latestIncome ? `${latestIncome.nama_pembayar || latestIncome.kategori || '-'} — ${formatRupiah(latestIncome.jumlah_bayar)}` : 'Nihil'}\\n\` +
        \`• Detail Pengeluaran Terakhir: \${latestExpense ? `${latestExpense.nama_pembayar || latestExpense.kategori || '-'} — ${formatRupiah(latestExpense.jumlah_bayar)}` : 'Nihil'}\\n\` +
        \`• *Sisa Saldo Akhir: \${formatRupiah(saldo)}*\\n\` +
        \`  - Modal Tetap (Pengelola Bola): \${formatRupiah(modalTetap)}\\n\` +
        \`  - Kas Bendahara: \${formatRupiah(bendahara)}\\n\\n\` +
        \`🔗 Akses Kas Klub: \${window.location.origin}/kas\\n\\n\` +
        \`Admin PB Bilibili 162\`;`;

if (s.includes(oldWa)) s = s.replace(oldWa, newWa);

const oldHtml = `<b>Periode:</b> \${startDate} s/d \${endDate}<br/>` +
            `<b>Pemasukan:</b> \${formatRupiah(income)}<br/>` +
            `<b>Pengeluaran:</b> \${formatRupiah(expense)}<br/>` +
            `<b>Saldo Akhir:</b> \${formatRupiah(saldo)}<br/><br/>` +
            `<b>Penerimaan Terbaru:</b> \${latestIncome ? \`${latestIncome.nama_pembayar || latestIncome.kategori} — \${formatRupiah(latestIncome.jumlah_bayar)}\` : 'Nihil'}<br/>` +
            `<b>Pengeluaran Terbaru:</b> \${latestExpense ? \`${latestExpense.nama_pembayar || latestExpense.kategori} — \${formatRupiah(latestExpense.jumlah_bayar)}\` : 'Nihil'}`;

const newHtml = `<b>Periode:</b> \${startDate} s/d \${endDate}<br/>` +
            `<b>Saldo Sebelumnya:</b> \${formatRupiah(previous)}<br/>` +
            `<b>Total Pemasukan:</b> \${formatRupiah(income)}<br/>` +
            `<b>Total Pengeluaran:</b> \${formatRupiah(expense)}<br/>` +
            `<b>Saldo Akhir:</b> \${formatRupiah(saldo)}<br/>` +
            `<b>Modal Tetap:</b> \${formatRupiah(modalTetap)}<br/>` +
            `<b>Kas Bendahara:</b> \${formatRupiah(bendahara)}<br/><br/>` +
            `<b>Penerimaan Terbaru:</b> \${latestIncome ? \`${latestIncome.nama_pembayar || latestIncome.kategori} — \${formatRupiah(latestIncome.jumlah_bayar)}\` : 'Nihil'}<br/>` +
            `<b>Pengeluaran Terbaru:</b> \${latestExpense ? \`${latestExpense.nama_pembayar || latestExpense.kategori} — \${formatRupiah(latestExpense.jumlah_bayar)}\` : 'Nihil'}`;
if (s.includes(oldHtml)) s = s.replace(oldHtml, newHtml);

s = s.replace("const title = eventInFilter\n        ? eventType === 'INSERT' ? 'TRANSAKSI KAS BARU!' : eventType === 'DELETE' ? 'TRANSAKSI KAS DIHAPUS!' : 'UPDATE KAS TERBARU!'\n        : 'LAPORAN KAS TERBARU';", "const title = eventInFilter\n        ? eventType === 'INSERT' ? 'TRANSAKSI KAS BARU!' : eventType === 'DELETE' ? 'TRANSAKSI KAS DIHAPUS!' : 'UPDATE KAS TERBARU!'\n        : 'LAPORAN KAS TERBARU';");

fs.writeFileSync(path, s);
console.log('[patch-kas-wa-report-complete] WhatsApp kas admin report completed.');
