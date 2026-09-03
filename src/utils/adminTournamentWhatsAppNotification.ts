import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type TournamentRegistration = {
  kode_pendaftaran?: string | null;
  nama_pemain_1?: string | null;
  nama_pemain_2?: string | null;
  whatsapp?: string | null;
  kategori?: string | null;
  asal_pb?: string | null;
  domisili?: string | null;
  status_pembayaran?: string | null;
  status_pendaftaran?: string | null;
  catatan_admin?: string | null;
};

const PARTICIPANT_GROUP_URL = 'https://chat.whatsapp.com/Bs7TWJMPB2v78GTcTl30vO';
const clean = (value: unknown) => String(value ?? '').trim();
const isAccepted = (value?: string | null) => ['diterima','accepted','approved','terverifikasi','lolos'].includes(clean(value).toLowerCase());
const normalizeWhatsApp = (value?: string | null) => {
  let number = clean(value).replace(/[^\d+]/g, '');
  if (!number) return '';
  if (number.startsWith('+')) number = number.slice(1);
  if (number.startsWith('0')) number = `62${number.slice(1)}`;
  if (number.startsWith('8')) number = `62${number}`;
  return number;
};

const buildMessage = (row: TournamentRegistration) => [
  'PENDAFTARAN BERHASIL DIVERIFIKASI',
  'PB BILIBILI 162 CUP I TAHUN 2026', '',
  'Halo Penanggung Jawab,',
  'Pendaftaran pasangan Anda telah DITERIMA & DIVERIFIKASI oleh Admin.', '',
  `* Kode: ${clean(row.kode_pendaftaran) || '-'}`,
  `* Kategori: ${clean(row.kategori) || '-'}`,
  `* Pemain 1: ${clean(row.nama_pemain_1) || '-'}`,
  `* Pemain 2: ${clean(row.nama_pemain_2) || '-'}`,
  `* PB/Klub: ${clean(row.asal_pb) || '-'}`,
  `* Domisili: ${clean(row.domisili) || '-'}`,
  `* Pembayaran: ${clean(row.status_pembayaran) || '-'}`,
  `* Status: ${clean(row.status_pendaftaran) || 'DITERIMA & DIVERIFIKASI'}`,
  `* Catatan Admin: ${clean(row.catatan_admin) || '-'}`, '',
  'Selamat, pasangan Anda resmi terdaftar sebagai peserta pada kategori tersebut.', '',
  '08–12 September 2026 • GOR Titik Kumpul Soreang Parepare',
  'Panitia PB BILIBILI 162', '',
  '📲 INFORMASI GRUP WA PESERTA',
  'Silakan bergabung ke Grup WhatsApp Peserta untuk mendapatkan informasi dan pembaruan turnamen:',
  PARTICIPANT_GROUP_URL
].join('\n');

const sendNotification = async (row: TournamentRegistration, button: HTMLButtonElement) => {
  const phone = normalizeWhatsApp(row.whatsapp);
  if (!phone) {
    await Swal.fire({ icon:'error', title:'WhatsApp belum tersedia', text:'Nomor WhatsApp penanggung jawab belum diisi pada data pendaftaran.' });
    return;
  }
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(row))}`;
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span aria-hidden="true">↗</span><span class="wa-verification-label">Membuka WA…</span>';
  try { window.open(href, '_blank', 'noopener,noreferrer'); }
  finally { window.setTimeout(() => { button.disabled=false; button.innerHTML=original; }, 900); }
};

const createButton = (row: TournamentRegistration) => {
  const button = document.createElement('button');
  button.type='button';
  button.dataset.waVerificationButton='1';
  button.setAttribute('aria-label','Kirim notifikasi verifikasi via WhatsApp');
  button.title='Kirim notifikasi hasil verifikasi via WhatsApp';
  button.className='admin-wa-verification-button inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60';
  button.innerHTML='<span class="wa-verification-icon" aria-hidden="true">↗</span><span class="wa-verification-label">WA Verifikasi</span>';
  button.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();void sendNotification(row,button);});
  return button;
};

const enhance = (rows: TournamentRegistration[]) => {
  const accepted=rows.filter(row=>isAccepted(row.status_pendaftaran));
  if(!accepted.length)return;
  const containers=Array.from(document.querySelectorAll('tr, article, [role="row"]'));
  for(const row of accepted){
    const code=clean(row.kode_pendaftaran); if(!code)continue;
    const container=containers.find(el=>clean(el.textContent).includes(code));
    if(!container||container.querySelector('[data-wa-verification-button="1"]'))continue;
    const actionHost=container.querySelector('.mobile-actions') || Array.from(container.querySelectorAll('button')).find(button=>{const text=clean(button.textContent).toLowerCase();return text.includes('edit')||text.includes('detail')||text.includes('hapus');})?.parentElement;
    if(!actionHost)continue;
    actionHost.appendChild(createButton(row));
  }
};

let installed=false; let timer:number|null=null;
export function installAdminTournamentWhatsAppNotification(){
  if(installed||typeof window==='undefined')return; installed=true;
  const run=async()=>{
    if(!/^\/admin\/pendaftaran-turnamen(?:\/|$)/i.test(window.location.pathname))return;
    const {data,error}=await supabase.from('pendaftaran_turnamen').select('kode_pendaftaran,nama_pemain_1,nama_pemain_2,whatsapp,kategori,asal_pb,domisili,status_pembayaran,status_pendaftaran,catatan_admin').order('created_at',{ascending:false});
    if(error||!data)return; enhance(data as TournamentRegistration[]);
  };
  const schedule=()=>{if(timer!==null)window.clearTimeout(timer);timer=window.setTimeout(()=>{void run();},250);};
  const observer=new MutationObserver(schedule); observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('app_data_changed',schedule); window.addEventListener('table_updated_pendaftaran_turnamen',schedule); window.addEventListener('popstate',schedule); schedule();
}
