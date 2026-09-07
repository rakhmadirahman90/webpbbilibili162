import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
if (!fs.existsSync(path)) process.exit(0);

let src = fs.readFileSync(path, 'utf8');

if (!src.includes("import * as XLSX from 'xlsx';")) {
  src = src.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport * as XLSX from 'xlsx';");
}

const marker = 'export default function AdminPendaftaranTurnamenModernV2() {';
const fn = `
function exportTournamentExcelThreeSheets(rows: Registration[]) {
  const normalize = (v: unknown) => clean(v).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  const accepted = rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima');

  const isLocal = (r: Registration) => normalize(r.kategori).includes('lokal');
  const isAjat = (r: Registration) => normalize(r.kategori).includes('ajatappareng');
  const local = accepted.filter(isLocal);
  const ajat = accepted.filter(isAjat);

  const pairRows = (items: Registration[], ket: 'GDAC' | 'GDAB') => {
    const data: any[][] = [['NO', 'NAME', 'CLUB', 'GENDER', 'KET', 'SEED']];
    items.forEach((r, index) => {
      const p1 = clean(r.nama_pemain_1);
      const p2 = clean(r.nama_pemain_2);
      const club = clean(r.asal_pb);
      const seed = clean(r.seed_pemain_1 || r.seed_pemain_2 || r.seed);
      data.push([index + 1, p1, club, 'MALE', ket, seed]);
      data.push(['', p2, club, 'MALE', ket, '']);
    });
    return data;
  };

  const sortirRows = () => {
    const data: any[][] = [['NO', 'NAME', 'CLUB', 'GENDER', 'KET', 'SEED']];
    accepted.forEach((r, index) => {
      const ket = isAjat(r) ? 'GDAB' : 'GDAC';
      const p1 = clean(r.nama_pemain_1);
      const p2 = clean(r.nama_pemain_2);
      const club = clean(r.asal_pb);
      const seed = clean(r.seed_pemain_1 || r.seed_pemain_2 || r.seed);
      data.push([index + 1, p1, club, 'MALE', ket, seed]);
      data.push(['', p2, club, 'MALE', ket, '']);
    });
    return data;
  };

  const formatSheet = (ws: XLSX.WorkSheet) => {
    ws['!cols'] = [7, 32, 30, 12, 10, 10].map(w => ({ wch: w }));
    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { e: { r: 0, c: 5 } };
    ws['!autofilter'] = { ref: 'A1:F' + (range.e.r + 1) };
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!rows'] = Array.from({ length: range.e.r + 1 }, (_, i) => ({ hpt: i === 0 ? 24 : 20 }));
    ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };
    ws['!margins'] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  };

  const wb = XLSX.utils.book_new();
  const gdac = XLSX.utils.aoa_to_sheet(pairRows(local, 'GDAC'));
  const gdab = XLSX.utils.aoa_to_sheet(pairRows(ajat, 'GDAB'));
  const sortir = XLSX.utils.aoa_to_sheet(sortirRows());

  formatSheet(gdac);
  formatSheet(gdab);
  formatSheet(sortir);

  XLSX.utils.book_append_sheet(wb, gdac, 'GDAC');
  XLSX.utils.book_append_sheet(wb, gdab, 'GDAB');
  XLSX.utils.book_append_sheet(wb, sortir, 'SORTIR');

  // Pastikan workbook selalu mempunyai tepat tiga sheet meskipun salah satu kategori kosong.
  wb.SheetNames = ['GDAC', 'GDAB', 'SORTIR'];

  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  XLSX.writeFile(wb, 'DAFTAR NAMA PESERTA BILIBILI 162 CUP I ' + stamp + '.xlsx', { bookType: 'xlsx' });
}
`;

if (!src.includes('function exportTournamentExcelThreeSheets(') && src.includes(marker)) {
  src = src.replace(marker, fn + '\n' + marker);
}

// Paksa tombol export yang sudah ada memakai implementasi tiga-sheet terbaru.
src = src.replaceAll('exportRegistrationsExcel(rows)', 'exportTournamentExcelThreeSheets(rows)');

// Jika tombol belum ada, tambahkan tepat setelah tombol Muat Ulang.
if (!src.includes('Export Excel')) {
  const needle = '</button></div></div></div><div className="grid grid-cols-2';
  const button = '</button><button onClick={() => exportTournamentExcelThreeSheets(rows)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-600"><FileText size={15}/> Export Excel</button></div></div></div><div className="grid grid-cols-2';
  if (src.includes(needle)) src = src.replace(needle, button);
}

fs.writeFileSync(path, src, 'utf8');
