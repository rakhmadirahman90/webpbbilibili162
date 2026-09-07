import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
if (!fs.existsSync(path)) process.exit(0);

let src = fs.readFileSync(path, 'utf8');

if (!src.includes("import * as XLSX from 'xlsx';")) {
  src = src.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport * as XLSX from 'xlsx';");
}

const helper = `
function exportRegistrationsExcel(rows: Registration[]) {
  const normalize = (v: unknown) => clean(v).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  const accepted = rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima');
  const local = accepted.filter(r => normalize(r.kategori).includes('lokal'));
  const ajat = accepted.filter(r => normalize(r.kategori).includes('ajatappareng'));

  const makeRows = (items: Registration[], ket: string) => {
    const out: any[][] = [['NO', 'NAME', 'CLUB', 'GENDER', 'KET', 'SEED']];
    items.forEach((r, idx) => {
      const p1 = clean(r.nama_pemain_1) || '-';
      const p2 = clean(r.nama_pemain_2) || '-';
      const club = clean(r.asal_pb) || '-';
      const seed = clean(r.seed_pemain_1 || r.seed_pemain_2 || r.seed || '');
      out.push([idx + 1, p1, club, 'MALE', ket, seed]);
      out.push(['', p2, club, 'MALE', ket, '']);
    });
    return out;
  };

  const wb = XLSX.utils.book_new();
  const wsLocal = XLSX.utils.aoa_to_sheet(makeRows(local, 'GDAC'));
  const wsAjat = XLSX.utils.aoa_to_sheet(makeRows(ajat, 'GDAB'));
  const wsSortir = XLSX.utils.aoa_to_sheet([
    ['NO', 'NAME', 'CLUB', 'GENDER', 'KET'],
    ...accepted.map((r, i) => [i + 1, clean(r.nama_pemain_1), clean(r.asal_pb), 'MALE', normalize(r.kategori).includes('ajatappareng') ? 'GDAB' : 'GDAC'])
  ]);

  const styleSheet = (ws: XLSX.WorkSheet, widths: number[], colCount: number) => {
    ws['!cols'] = widths.map(w => ({ wch: w }));
    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { e: { r: 0 } };
    ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + colCount)}${range.e.r + 1}` };
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  };
  styleSheet(wsLocal, [7, 30, 30, 12, 10, 10], 6);
  styleSheet(wsAjat, [7, 30, 30, 12, 10, 10], 6);
  styleSheet(wsSortir, [7, 30, 30, 12, 10], 5);

  XLSX.utils.book_append_sheet(wb, wsLocal, 'GDAC');
  XLSX.utils.book_append_sheet(wb, wsAjat, 'GDAB');
  XLSX.utils.book_append_sheet(wb, wsSortir, 'SORTIR');

  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  XLSX.writeFile(wb, `DAFTAR NAMA PESERTA BILIBILI 162 CUP I ${stamp}.xlsx`);
}
`;

if (!src.includes('function exportRegistrationsExcel(')) {
  const marker = 'export default function AdminPendaftaranTurnamenModernV2() {';
  if (src.includes(marker)) src = src.replace(marker, helper + '\n' + marker);
}

const buttonNeedle = '<button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-black uppercase tracking-wide transition hover:bg-white/15"><RefreshCw size={15}/> Muat Ulang</button>';
const exportButton = ' <button onClick={() => exportRegistrationsExcel(rows)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-600"><FileText size={15}/> Export Excel</button>';
if (!src.includes('Export Excel')) {
  src = src.replace(buttonNeedle, buttonNeedle + exportButton);
}

fs.writeFileSync(path, src, 'utf8');
