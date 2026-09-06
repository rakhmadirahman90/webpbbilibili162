import fs from 'node:fs';
const path='src/components/PublicKasView.tsx';
let source=fs.readFileSync(path,'utf8');
if(!source.includes('created_at?: string;')){
 const anchor="  id: string;\n  tanggal_transaksi: string;";
 if(!source.includes(anchor)) throw new Error('KasEntry anchor not found');
 source=source.replace(anchor,"  id: string;\n  created_at?: string;\n  tanggal_transaksi: string;");
}
if(source.includes('const kasWhatsappMessage = [')){console.log('already applied');process.exit(0)}
const lines=[
"      // Pesan WhatsApp real-time mengikuti filter aktif dan transaksi terbaru pada periode tersebut.",
"      const sortByCreatedAtDesc = (a: any, b: any) => {",
"        const ta = a.created_at ? new Date(a.created_at).getTime() : new Date(`${a.tanggal_transaksi}T00:00:00+08:00`).getTime();",
"        const tb = b.created_at ? new Date(b.created_at).getTime() : new Date(`${b.tanggal_transaksi}T00:00:00+08:00`).getTime();",
"        return tb - ta;",
"      };",
"      const latestIncoming = [...filteredData].filter(item => item.jenis_transaksi === 'Masuk').sort(sortByCreatedAtDesc)[0];",
"      const latestOutgoing = [...filteredData].filter(item => item.jenis_transaksi === 'Keluar').sort(sortByCreatedAtDesc)[0];",
"      const formatKasDateTime = (item: any) => {",
"        if (!item) return null;",
"        const dateText = new Date(`${item.tanggal_transaksi}T00:00:00+08:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' });",
"        const timeText = item.created_at ? new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' }) : '00.00';",
"        return { dateText, timeText };",
"      };",
"      const incomingDateTime = formatKasDateTime(latestIncoming);",
"      const outgoingDateTime = formatKasDateTime(latestOutgoing);",
"      const kasWhatsappMessage = [",
"        '📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*', '',",
"        '*Detail Transaksi Penerimaan Terbaru:*',",
"        latestIncoming ? [",
"          '• Status: ✅ BERHASIL', '• Jenis: 📥 Pemasukan',",
"          `• Tanggal & Waktu: *${incomingDateTime.dateText}, ${incomingDateTime.timeText} WITA*`,",
"          `• Nama/Keterangan: *${latestIncoming.nama_pembayar}*`,",
"          `• Kategori: ${latestIncoming.kategori}`,",
"          `• Jumlah: *Rp ${latestIncoming.jumlah_bayar.toLocaleString('id-ID')}*`,",
"          `• Catatan: ${latestIncoming.keterangan || '-'}`",
"        ].join('\\n') : '*Nihil*', '',",
"        '*Detail Transaksi Pengeluaran Terbaru:*',",
"        latestOutgoing ? [",
"          '• Status: ✅ BERHASIL', '• Jenis: 📤 Pengeluaran',",
"          `• Tanggal & Waktu: *${outgoingDateTime.dateText}, ${outgoingDateTime.timeText} WITA*`,",
"          `• Nama/Keterangan: *${latestOutgoing.nama_pembayar || '-'}*`,",
"          `• Kategori: ${latestOutgoing.kategori}`,",
"          `• Jumlah: *Rp ${latestOutgoing.jumlah_bayar.toLocaleString('id-ID')}*`,",
"          `• Catatan: ${latestOutgoing.keterangan || '-'}`",
"        ].join('\\n') : '*Nihil*', '',",
"        `*Status Keuangan Klub (Filter ${startDate} s/d ${endDate}):*`,",
"        `• Saldo Sebelumnya: Rp ${saldoSebelumnya.toLocaleString('id-ID')}`,",
"        `• Total Pemasukan Periode: Rp ${stats.masuk.toLocaleString('id-ID')}`,",
"        `• Total Pengeluaran Periode: Rp ${stats.keluar.toLocaleString('id-ID')}`,",
"        `• Detail Pemasukan Terakhir: ${latestIncoming ? latestIncoming.nama_pembayar + ' — Rp ' + latestIncoming.jumlah_bayar.toLocaleString('id-ID') : 'Nihil'}`,",
"        `• Detail Pengeluaran Terakhir: ${latestOutgoing ? (latestOutgoing.nama_pembayar || '-') + ' — Rp ' + latestOutgoing.jumlah_bayar.toLocaleString('id-ID') : 'Nihil'}`,",
"        `• *Sisa Saldo Akhir: Rp ${saldoAkhirPeriode.toLocaleString('id-ID')}*`,",
"        '  - Modal Tetap (Pengelola Bola): Rp 600.000',",
"        `  - Kas Bendahara: Rp ${saldoBendahara.toLocaleString('id-ID')}`, '',",
"        `🔗 *Akses Kas Klub:* ${window.location.origin}/kas`, '',",
"        '*Admin PB Bilibili 162*'",
"      ].join('\\n');",
"",
"      const defaultMessage = memberOnlyName\n"
];
const newBlock=lines.join('\n');
const oldMarker="      const defaultMessage = memberOnlyName\n";
if(!source.includes(oldMarker)) throw new Error('defaultMessage marker not found');
source=source.replace(oldMarker,newBlock);
const oldPublicMessage = `        : \`*LAPORAN PERTANGGUNGJAWABAN KAS - PB BILIBILI 162*\\n\\n\` +\n          \`Periode: *\${startDate} s/d \${endDate}*\\n\\n\` +\n          \`• Saldo Sebelumnya: Rp \${saldoSebelumnya.toLocaleString()}\\n\` +\n          \`• Total Pemasukan: Rp \${stats.masuk.toLocaleString()}\\n\` +\n          \`• Total Pengeluaran: Rp \${stats.keluar.toLocaleString()}\\n\` +\n          \`• *Saldo Akhir Kas: Rp \${saldoAkhirPeriode.toLocaleString()}*\\n\` +\n          \`  - Modal Tetap (Pengelola Bola): Rp \${modalTetap.toLocaleString()}\\n\` +\n          \`  - Saldo Kas Bendahara: Rp \${saldoBendahara.toLocaleString()}\\n\\n\` +\n          \`Laporan keuangan lengkap terlampir dalam file PDF.\\n\\n\` +\n          \`🔗 *Akses Kas Klub:* \${window.location.origin}/kas\\n\\n\` +\n          \`*Admin PB Bilibili 162*\`;`;
if(!source.includes(oldPublicMessage)) throw new Error('public default message block not found');
source=source.replace(oldPublicMessage,'        : kasWhatsappMessage;');
fs.writeFileSync(path,source);
console.log('real-time WhatsApp cash report updated');
