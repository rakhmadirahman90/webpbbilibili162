import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase';

type Row = Record<string, any>;
const clean = (v: unknown) => String(v ?? '').trim();
const norm = (v: unknown) => clean(v).toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const stamp = () => new Date().toISOString().slice(0,10).replace(/-/g,'');
const safe = (v: string) => v.replace(/[^a-z0-9_-]+/gi,'_');
const dateId = (v: unknown) => v ? new Date(String(v)).toLocaleDateString('id-ID') : '-';
const timeId = (v: unknown) => v ? new Date(String(v)).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '-';

function toast(message:string, ok=true){
  document.getElementById('admin-export-toast')?.remove();
  const el=document.createElement('div'); el.id='admin-export-toast'; el.textContent=message;
  el.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 24px);padding:11px 15px;border-radius:12px;background:${ok?'#0f172a':'#7f1d1d'};color:#fff;font:700 12px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 12px 35px rgba(0,0,0,.28);pointer-events:none`;
  document.body.appendChild(el); window.setTimeout(()=>el.remove(),3000);
}
function download(blob:Blob, filename:string){
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=filename; a.rel='noopener'; a.style.display='none';
  document.body.appendChild(a); a.click(); window.setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},1500);
}
function excel(rows:Row[], sheet:string, filename:string, widths:number[]){
  const ws=XLSX.utils.json_to_sheet(rows); ws['!cols']=widths.map(w=>({wch:w}));
  if(ws['!ref']) ws['!autofilter']={ref:ws['!ref']};
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,sheet.slice(0,31));
  const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  download(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename);
}
function pdfHeader(doc:jsPDF,title:string,subtitle:string){
  const w=doc.internal.pageSize.getWidth(); doc.setFillColor(7,21,45); doc.rect(0,0,w,28,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text(title,10,11);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text(subtitle,10,18); doc.text(`Dicetak ${new Date().toLocaleString('id-ID')}`,10,24);
}
function pdfFooter(doc:jsPDF){
  const h=doc.internal.pageSize.getHeight(), w=doc.internal.pageSize.getWidth();
  doc.setFontSize(7); doc.setTextColor(110,120,130); doc.text('PB Bilibili 162 • 2026',8,h-5); doc.text(`Halaman ${(doc as any).internal.getNumberOfPages()}`,w-30,h-5);
}
async function seededRows():Promise<Row[]>{
  const {data,error}=await supabase.from('seeded_players').select('id,source_sheet,source_no,player_name,club_name,seeded_quality,division_level,tournament_qualification,region_status,validity_status,archive_category,gender,eligible_category').limit(5000);
  if(error) throw error; const rank:Record<string,number>={A:1,B:2,'C+':3,C:4,'C-':5,D:6};
  return ((data||[]) as Row[]).sort((a,b)=>{const qa=rank[clean(a.seeded_quality).toUpperCase()]??99,qb=rank[clean(b.seeded_quality).toUpperCase()]??99;if(qa!==qb)return qa-qb;const c=clean(a.club_name).localeCompare(clean(b.club_name),'id-ID',{sensitivity:'base'});return c||clean(a.player_name).localeCompare(clean(b.player_name),'id-ID',{sensitivity:'base'})});
}
async function registrationRows():Promise<Row[]>{
  const {data,error}=await supabase.from('pendaftaran_turnamen').select('*').order('created_at',{ascending:false}).limit(5000);
  if(error) throw error; return (data||[]) as Row[];
}
function search(host:HTMLElement){return Array.from(host.querySelectorAll('input')).find(i=>norm(i.getAttribute('placeholder')).includes('cari')) as HTMLInputElement|undefined}
function filterSeeded(rows:Row[],host:HTMLElement){
  const s=Array.from(host.querySelectorAll('select')) as HTMLSelectElement[], q=norm(search(host)?.value);
  return rows.filter(p=>{const hay=norm([p.player_name,p.club_name,p.seeded_quality,p.source_sheet,p.region_status,p.eligible_category,p.archive_category,p.division_level,p.tournament_qualification,p.validity_status,p.gender,p.source_no].map(clean).join(' '));return(!q||hay.includes(q))&&(!s[0]||s[0].value==='Semua'||clean(p.gender)===s[0].value)&&(!s[1]||s[1].value==='Semua'||clean(p.seeded_quality)===s[1].value)&&(!s[2]||s[2].value==='Semua'||p.source_sheet===s[2].value)&&(!s[3]||s[3].value==='Semua'||clean(p.eligible_category)===s[3].value)&&(!s[4]||s[4].value==='Semua'||clean(p.club_name)===s[4].value)&&(!s[5]||s[5].value==='Semua'||clean(p.region_status)===s[5].value)});
}
function filterRegistration(rows:Row[],host:HTMLElement){
  const q=norm(search(host)?.value), s=Array.from(host.querySelectorAll('select')) as HTMLSelectElement[];
  const reg=(v:unknown)=>{const x=norm(v);return ['diterima','approved','terverifikasi','lolos'].includes(x)?'diterima':['ditolak','rejected'].includes(x)?'ditolak':'pending'};
  const pay=(v:unknown)=>{const x=norm(v);return x.includes('terver')||x.includes('lunas')||x.includes('diterima')?'terverifikasi':'menunggu'};
  return rows.filter(r=>{const hay=norm([r.kode_pendaftaran,r.nama_pemain_1,r.nama_pemain_2,r.whatsapp,r.email,r.asal_pb,r.domisili,r.kategori,r.status_pendaftaran,r.status_pembayaran].map(clean).join(' '));return(!q||hay.includes(q))&&(!s[0]||s[0].value==='Semua'||clean(r.kategori)===s[0].value)&&(!s[1]||s[1].value==='Semua'||reg(r.status_pendaftaran)===s[1].value)&&(!s[2]||s[2].value==='Semua'||pay(r.status_pembayaran)===s[2].value)});
}

async function exportSeeded(host:HTMLElement,format:'xlsx'|'pdf'){
  try{
    toast('Menyiapkan export seeded…');
    const rows=filterSeeded(await seededRows(),host);
    if(!rows.length)return toast('Tidak ada data seeded yang cocok.',false);

    // Export seeded sengaja dibatasi hanya 4 kolom sesuai kebutuhan:
    // No, Nama Pemain, Klub, Seeded.
    const mapped=rows.map((p,i)=>({
      No:i+1,
      Nama_Pemain:clean(p.player_name)||'-',
      Klub:clean(p.club_name)||'-',
      Seeded:clean(p.seeded_quality)||'-'
    }));

    const base=safe(`Seeded_Pemain_Bilibili_162_${stamp()}`);
    if(format==='xlsx'){
      excel(mapped,'Seeded Pemain',`${base}.xlsx`,[7,38,34,14]);
      toast(`Excel berhasil dibuat • ${rows.length} pemain`);
      return;
    }

    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    pdfHeader(doc,'SEEDED PEMAIN — PB BILIBILI 162',`${rows.length} pemain • No, Nama Pemain, Klub & Seeded`);
    autoTable(doc,{
      head:[['No','Nama Pemain','Klub','Seeded']],
      body:mapped.map(r=>[r.No,r.Nama_Pemain,r.Klub,r.Seeded]),
      startY:32,
      margin:{left:12,right:12,bottom:9},
      theme:'grid',
      styles:{fontSize:9,cellPadding:3,valign:'middle'},
      headStyles:{fillColor:[15,23,42],textColor:255,fontStyle:'bold',fontSize:9},
      alternateRowStyles:{fillColor:[245,247,250]},
      columnStyles:{0:{cellWidth:14},1:{cellWidth:82},2:{cellWidth:82},3:{cellWidth:35}},
      didDrawPage:()=>pdfFooter(doc)
    });
    doc.save(`${base}.pdf`);
    toast(`PDF berhasil dibuat • ${rows.length} pemain`);
  }catch(e:any){console.error(e);toast(`Export gagal: ${e?.message||'Periksa koneksi database.'}`,false)}
}

async function exportRegistration(host:HTMLElement,format:'xlsx'|'pdf'){
  try{toast('Menyiapkan export pendaftaran…');const rows=filterRegistration(await registrationRows(),host);if(!rows.length)return toast('Tidak ada data pendaftaran yang cocok.',false);
    const mapped=rows.map((r,i)=>({No:i+1,ID_Pendaftaran:r.id,Kode_Pendaftaran:clean(r.kode_pendaftaran)||'-',Nama_Pemain_1:clean(r.nama_pemain_1)||'-',Nama_Pemain_2:clean(r.nama_pemain_2)||'-',Kategori:clean(r.kategori)||'-',WhatsApp:clean(r.whatsapp)||'-',Email:clean(r.email)||'-',Asal_PB_Klub:clean(r.asal_pb)||'-',Domisili:clean(r.domisili)||'-',Biaya_Pendaftaran:Number(r.biaya_pendaftaran||0),Status_Pembayaran:clean(r.status_pembayaran)||'-',Status_Pendaftaran:clean(r.status_pendaftaran)||'Pending',Tanggal_Daftar:dateId(r.created_at),Waktu_Daftar:timeId(r.created_at)}));
    const base=safe(`Pendaftaran_Peserta_Bilibili_162_${stamp()}`);if(format==='xlsx'){excel(mapped,'Pendaftaran Peserta',`${base}.xlsx`,[7,24,22,28,28,22,20,30,24,28,18,20,20,16,14]);toast(`Excel berhasil dibuat • ${rows.length} pendaftaran`);return;}
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});pdfHeader(doc,'PENDAFTARAN PESERTA — PB BILIBILI 162',`${rows.length} pendaftaran • Data terbaru dari database turnamen`);
    autoTable(doc,{head:[['No','Kode','Pemain 1','Pemain 2','Kategori','WhatsApp','PB / Klub','Domisili','Bayar','Status','Tgl']],body:mapped.map(r=>[r.No,r.Kode_Pendaftaran,r.Nama_Pemain_1,r.Nama_Pemain_2,r.Kategori,r.WhatsApp,r.Asal_PB_Klub,r.Domisili,r.Status_Pembayaran,r.Status_Pendaftaran,r.Tanggal_Daftar]),startY:32,margin:{left:7,right:7,bottom:9},theme:'grid',styles:{fontSize:6.7,cellPadding:1.9,valign:'middle'},headStyles:{fillColor:[15,23,42],textColor:255,fontStyle:'bold',fontSize:6.7},alternateRowStyles:{fillColor:[245,247,250]},columnStyles:{0:{cellWidth:8},1:{cellWidth:22},2:{cellWidth:32},3:{cellWidth:32},4:{cellWidth:27},5:{cellWidth:27},6:{cellWidth:28},7:{cellWidth:28},8:{cellWidth:22},9:{cellWidth:22},10:{cellWidth:21}},didDrawPage:()=>pdfFooter(doc)});doc.save(`${base}.pdf`);toast(`PDF berhasil dibuat • ${rows.length} pendaftaran`);
  }catch(e:any){console.error(e);toast(`Export gagal: ${e?.message||'Periksa koneksi database.'}`,false)}
}
function makeButton(label:string,icon:string,action:()=>void){
  const b=document.createElement('button');b.type='button';b.innerHTML=`<span style="font-size:15px">${icon}</span><span>${label}</span>`;b.style.cssText='display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:0 14px;border-radius:11px;border:1px solid rgba(59,130,246,.3);background:#0b1220;color:#fff;font:800 10px/1 system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;pointer-events:auto;position:relative;z-index:50';
  const run=(e:Event)=>{e.preventDefault();e.stopPropagation();void action()};b.addEventListener('click',run);b.addEventListener('touchend',run,{passive:false});return b;
}
function injectToolbar(){
  if(document.getElementById('admin-export-toolbar'))return;const text=clean(document.body.innerText);const seeded=/Seeded Resmi Bilibili 162/i.test(text);const registration=!seeded&&/Pendaftaran Peserta Turnamen|Daftar Peserta/i.test(text);if(!seeded&&!registration)return;
  const host=document.querySelector('main')||document.getElementById('root');if(!(host instanceof HTMLElement))return;const bar=document.createElement('div');bar.id='admin-export-toolbar';bar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(59,130,246,.22);border-radius:15px;background:linear-gradient(135deg,rgba(9,22,43,.97),rgba(5,12,25,.97));box-shadow:0 10px 28px rgba(0,0,0,.12);position:relative;z-index:40;pointer-events:auto';
  const info=document.createElement('div');info.innerHTML='<div style="font:900 11px/1.2 system-ui;color:#fff;text-transform:uppercase;letter-spacing:.05em">Export Data</div><div style="margin-top:3px;font:500 10px/1.3 system-ui;color:#94a3b8">Excel & PDF • mengikuti pencarian dan filter aktif</div>';
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:7px;flex-wrap:wrap;pointer-events:auto';if(seeded){actions.append(makeButton('Excel','▣',()=>exportSeeded(host,'xlsx')),makeButton('PDF','▤',()=>exportSeeded(host,'pdf')))}else{actions.append(makeButton('Excel','▣',()=>exportRegistration(host,'xlsx')),makeButton('PDF','▤',()=>exportRegistration(host,'pdf')))}bar.append(info,actions);const first=host.querySelector('section');if(first?.parentElement)first.parentElement.insertBefore(bar,first);else host.prepend(bar);
}
export function installAdminExportEnhancer(){if(typeof window==='undefined')return;let timer=0;const schedule=()=>{window.clearTimeout(timer);timer=window.setTimeout(injectToolbar,120)};schedule();const obs=new MutationObserver(schedule);obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('popstate',schedule);window.addEventListener('hashchange',schedule)}
