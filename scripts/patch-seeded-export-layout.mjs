import fs from 'node:fs';

const file = 'src/components/SeededTurnamen.tsx';
if (!fs.existsSync(file)) process.exit(0);
let s = fs.readFileSync(file, 'utf8');

if (!s.includes("from 'xlsx'")) {
  s = s.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport * as XLSX from 'xlsx';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';");
}

if (!s.includes('SEEDED_EXPORT_LAYOUT_V1')) {
  const helper = String.raw`

/* SEEDED_EXPORT_LAYOUT_V1 — standardized print/export geometry */
const seededQualityRank = (v: string | null | undefined) => {
  const k = text(v).toUpperCase().replace(/\s+/g, '');
  const order = ['A','B','C+','C','C-','D'];
  const i = order.indexOf(k);
  return i < 0 ? 99 : i;
};
const sortSeededForExport = (rows: Player[]) => [...rows].sort((a,b) => {
  const q = seededQualityRank(a.seeded_quality) - seededQualityRank(b.seeded_quality);
  if (q) return q;
  const c = text(a.club_name).localeCompare(text(b.club_name), 'id', { sensitivity: 'base' });
  if (c) return c;
  return text(a.player_name).localeCompare(text(b.player_name), 'id', { sensitivity: 'base' });
});
const exportDate = () => new Intl.DateTimeFormat('id-ID', { day:'numeric', month:'long', year:'numeric' }).format(new Date());
const safeFileName = (v: string) => v.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g,'').slice(0,80);

`;
  s = s.replace("export default function SeededTurnamen()", helper + "export default function SeededTurnamen()");
}

if (!s.includes('const exportPDF = async')) {
  const exportsBlock = String.raw`
  const exportRows = useMemo(() => sortSeededForExport(filtered), [filtered]);
  const exportPDF = async () => {
    if (!exportRows.length) return void Swal.fire({icon:'info',title:'Tidak ada data',text:'Tidak ada data seeded untuk diekspor.',background:'#0b1324',color:'#fff'});
    const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'a4', compress:true});
    const pageW = doc.internal.pageSize.getWidth();
    doc.setProperties({title:'Seeded Pemain — PB BILIBILI 162',subject:'Daftar seeded pemain'});
    doc.setFillColor(8,21,48); doc.rect(0,0,pageW,30,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('SEEDED PEMAIN — PB BILIBILI 162', 15, 12);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text(`${exportRows.length} pemain • No, Nama Pemain, Klub & Seeded`, 15, 19);
    doc.setFontSize(7.5); doc.text(`Dicetak ${exportDate()}`, 15, 25);
    autoTable(doc, {
      startY: 35,
      margin: {left:15,right:15,top:35,bottom:13},
      tableWidth: pageW - 30,
      head: [['No','Nama Pemain','Klub','Seeded']],
      body: exportRows.map((p,i)=>[i+1,text(p.player_name)||'—',text(p.club_name)||'—',text(p.seeded_quality)||'—']),
      theme: 'grid',
      styles: {font:'helvetica',fontSize:8.5,textColor:[45,55,72],cellPadding:{top:2.8,right:3,bottom:2.8,left:3},valign:'middle',lineWidth:0.15,lineColor:[205,210,218]},
      headStyles: {fillColor:[15,23,42],textColor:[255,255,255],fontStyle:'bold',fontSize:8.5,halign:'left',cellPadding:{top:3.2,right:3,bottom:3.2,left:3}},
      alternateRowStyles: {fillColor:[247,249,252]},
      columnStyles: {0:{cellWidth:14,halign:'center'},1:{cellWidth:88},2:{cellWidth:145},3:{cellWidth:28,halign:'center',fontStyle:'bold'}},
      didDrawPage: (data:any) => {
        const h = doc.internal.pageSize.getHeight();
        doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(110,118,130);
        doc.text(`PB BILIBILI 162 • Halaman ${data.pageNumber}`, pageW/2, h-6, {align:'center'});
      }
    });
    doc.save(`Seeded_Pemain_PB_BILIBILI_162_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const exportExcel = () => {
    if (!exportRows.length) return void Swal.fire({icon:'info',title:'Tidak ada data',text:'Tidak ada data seeded untuk diekspor.',background:'#0b1324',color:'#fff'});
    const wb = XLSX.utils.book_new();
    const rows = [
      ['SEEDED PEMAIN — PB BILIBILI 162','','',''],
      [`${exportRows.length} pemain`,'','',''],
      [`Dicetak ${exportDate()}`,'','',''],
      [],
      ['No','Nama Pemain','Klub','Seeded'],
      ...exportRows.map((p,i)=>[i+1,text(p.player_name)||'—',text(p.club_name)||'—',text(p.seeded_quality)||'—'])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:7},{wch:31},{wch:42},{wch:12}];
    ws['!rows'] = [{hpt:24},{hpt:18},{hpt:18},{hpt:8},{hpt:24}];
    ws['!freeze'] = {xSplit:0,ySplit:5};
    ws['!autofilter'] = {ref:`A5:D${exportRows.length+5}`};
    ws['!pageSetup'] = {orientation:'landscape',paperSize:9,fitToWidth:1,fitToHeight:0,scale:100};
    ws['!pageMargins'] = {left:0.25,right:0.25,top:0.45,bottom:0.45,header:0.2,footer:0.2};
    ws['!printOptions'] = {gridLines:false};
    ws['!printTitles'] = {rows:'1:5'};
    ws['!ref'] = `A1:D${exportRows.length+5}`;
    const styleRange = (r:number, style:any) => { for(let c=0;c<4;c++){ const cell=ws[XLSX.utils.encode_cell({r,c})]; if(cell) cell.s=style; } };
    styleRange(0,{font:{name:'Arial',sz:16,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'081530'}},alignment:{vertical:'center'}});
    styleRange(1,{font:{name:'Arial',sz:10,color:{rgb:'334155'}},alignment:{vertical:'center'}});
    styleRange(2,{font:{name:'Arial',sz:9,color:{rgb:'64748B'}},alignment:{vertical:'center'}});
    styleRange(4,{font:{name:'Arial',sz:10,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'0F172A'}},alignment:{horizontal:'center',vertical:'center'}});
    for(let r=5;r<rows.length;r++) styleRange(r,{font:{name:'Arial',sz:10,color:{rgb:'334155'}},alignment:{vertical:'center'}});
    const safe = safeFileName(`Seeded_Pemain_PB_BILIBILI_162_${new Date().toISOString().slice(0,10)}`);
    XLSX.writeFile(wb, `${safe}.xlsx`, {bookType:'xlsx',compression:true});
  };

`;
  if (!s.includes('const resetFilters=')) throw new Error('resetFilters anchor not found');
  s = s.replace("  const resetFilters=", exportsBlock + "  const resetFilters=");
}

const toolbarAnchor = '    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06]';
if (!s.includes('Export PDF') && s.includes(toolbarAnchor)) {
  const toolbar = String.raw`    <section className="rounded-2xl border border-blue-400/20 bg-slate-900/80 p-3.5 shadow-xl sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-blue-300">Export Data</div><div className="mt-1 text-[11px] text-slate-300">Format standar • A4 Landscape • tabel presisi • \${exportRows.length} data mengikuti filter aktif.</div></div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button type="button" onClick={exportPDF} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black uppercase text-white shadow-lg hover:bg-blue-700"><FileDown size={16}/> Export PDF</button>
          <button type="button" onClick={exportExcel} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[10px] font-black uppercase text-white shadow-lg hover:bg-emerald-700"><FileSpreadsheet size={16}/> Export Excel</button>
        </div>
      </div>
    </section>
`;
  s = s.replace(toolbarAnchor, toolbar + toolbarAnchor);
}

s = s.replace("Search, Trophy, ShieldCheck, Users, Filter, ChevronDown, Info, RefreshCw, Plus, Pencil, Trash2, X, Save, SlidersHorizontal", "Search, Trophy, ShieldCheck, Users, Filter, ChevronDown, Info, RefreshCw, Plus, Pencil, Trash2, X, Save, SlidersHorizontal, FileDown, FileSpreadsheet");
fs.writeFileSync(file, s, 'utf8');
console.log('[patch-seeded-export-layout] precise PDF/Excel export layout applied');
