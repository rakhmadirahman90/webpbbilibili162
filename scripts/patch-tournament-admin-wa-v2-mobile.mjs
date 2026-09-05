import fs from 'node:fs';

const componentPath = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
const cssPath = 'src/admin-mobile-precision.css';
let source = fs.readFileSync(componentPath, 'utf8');

// Always provide the direct client import used by the build-time admin list patch.
if (!source.includes("import { supabaseDirect } from '../supabaseDirect';")) {
  source = source.replace("import { supabase } from '../supabase';", "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';");
}

if (!source.includes('data-wa-verification-button="v2"')) {
  source = source.replace(
    "import { Search, RefreshCw, Eye, Pencil, Trash2, CheckCircle2, XCircle, Clock3, Trophy, Users, CreditCard, Filter, X, Save, ExternalLink, FileText, Image as ImageIcon, Upload, Loader2, ShieldCheck } from 'lucide-react';",
    "import { Search, RefreshCw, Eye, Pencil, Trash2, CheckCircle2, XCircle, Clock3, Trophy, Users, CreditCard, Filter, X, Save, ExternalLink, FileText, Image as ImageIcon, Upload, Loader2, ShieldCheck, MessageCircle } from 'lucide-react';"
  );
  source = source.replace(
    "import Swal from 'sweetalert2';",
    "import Swal from 'sweetalert2';\nimport { openAdminTournamentWhatsApp } from '../utils/adminTournamentWhatsAppDirect';"
  );

  const start = source.indexOf('function Actions({');
  const end = source.indexOf('\nfunction DetailModal({', start);
  if (start < 0 || end < 0) throw new Error('V2 Actions function boundaries not found.');

  const actions = `function Actions({row,onDetail,onEdit,onPayment,onAccept,onReject,onDelete,paymentVerified,registrationPending,full=false}:{row:Registration,onDetail:()=>void,onEdit:()=>void,onPayment:()=>void,onAccept:()=>void,onReject:()=>void,onDelete:()=>void,paymentVerified:boolean,registrationPending:boolean,full?:boolean}){return <div className={\`flex \${full?'w-full':'justify-end'} flex-wrap gap-1.5 mobile-tournament-actions\`}><button title="Lihat detail & dokumen" aria-label="Lihat detail dan dokumen" onClick={onDetail} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-black text-blue-700 hover:bg-blue-100"><Eye size={14}/> Detail</button><button title="Edit data + foto + KTP + bukti pembayaran" aria-label="Edit data peserta" onClick={onEdit} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[10px] font-black text-indigo-700 hover:bg-indigo-100"><Pencil size={14}/> Edit</button>{!paymentVerified&&<button title="Verifikasi pembayaran" aria-label="Verifikasi pembayaran" onClick={onPayment} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"><CreditCard size={14}/> Bayar</button>}{!registrationPending&&<button type="button" data-wa-verification-button="v2" title="Kirim konfirmasi hasil verifikasi via WhatsApp" aria-label="Kirim konfirmasi hasil verifikasi via WhatsApp" onClick={()=>openAdminTournamentWhatsApp(row)} className="admin-wa-verification-button inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"><MessageCircle size={14}/> WA</button>}{registrationPending&&<><button title="Terima" aria-label="Terima pendaftaran" onClick={onAccept} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[10px] font-black text-white hover:bg-emerald-700"><CheckCircle2 size={14}/> Terima</button><button title="Tolak" aria-label="Tolak pendaftaran" onClick={onReject} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700"><XCircle size={14}/> Tolak</button></>}<button title="Hapus" aria-label="Hapus pendaftaran" onClick={onDelete} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-black text-rose-700 hover:bg-rose-100"><Trash2 size={14}/> Hapus</button></div>;}`;

  source = source.slice(0, start) + actions + source.slice(end);
  source = source.replaceAll('<Actions onDetail={onDetail}', '<Actions row={row} onDetail={onDetail}');
}

fs.writeFileSync(componentPath, source, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* V2 tournament admin WhatsApp action: mobile-visible after verification. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width:767px){\n  .tournament-admin-page .mobile-tournament-actions{width:100%!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;align-items:stretch!important;overflow:visible!important;position:relative!important;z-index:20!important;}\n  .tournament-admin-page .mobile-tournament-actions>button{width:100%!important;min-width:0!important;min-height:40px!important;height:40px!important;margin:0!important;padding:0 5px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;white-space:nowrap!important;overflow:visible!important;touch-action:manipulation!important;}\n  .tournament-admin-page .mobile-tournament-actions .admin-wa-verification-button{display:inline-flex!important;visibility:visible!important;opacity:1!important;color:#047857!important;background:#ecfdf5!important;border-color:#a7f3d0!important;}\n  .tournament-admin-page .mobile-tournament-actions .admin-wa-verification-button svg{display:block!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;}\n}\n@media (max-width:380px){.tournament-admin-page .mobile-tournament-actions{gap:4px!important;}.tournament-admin-page .mobile-tournament-actions>button{min-height:38px!important;height:38px!important;font-size:9px!important;padding:0 3px!important;gap:3px!important;}.tournament-admin-page .mobile-tournament-actions>button svg{width:16px!important;height:16px!important;}}\n`;
}
fs.writeFileSync(cssPath, css, 'utf8');
console.log('[patch-tournament-admin-wa-v2-mobile] applied.');
