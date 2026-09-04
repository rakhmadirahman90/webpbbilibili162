import fs from 'node:fs';

const componentPath = 'src/components/AdminPendaftaranTurnamenModern.tsx';
const cssPath = 'src/tournament-admin-modern.css';

let component = fs.readFileSync(componentPath, 'utf8');

const iconImport = "import { Search, RefreshCw, Eye, Pencil, Trash2, CheckCircle2, XCircle, Clock3, Trophy, Users, CreditCard, Filter, X, Save, ExternalLink, FileText, Image as ImageIcon, ShieldCheck, MessageCircle } from 'lucide-react';";
component = component.replace(/import \{ Search,[^\n]+ from 'lucide-react';/, iconImport);

const directImport = "import { openAdminTournamentWhatsApp } from '../utils/adminTournamentWhatsAppDirect.ts';";
if (!component.includes(directImport)) {
  component = component.replace("import Swal from 'sweetalert2';\n", "import Swal from 'sweetalert2';\n" + directImport + "\n");
}

const oldActionsStart = "function Actions({row,onDetail,onEdit,onPayment,onAccept,onReject,onDelete,full=false}:{row:Registration,onDetail:(r:Registration)=>void,onEdit:()=>void,onPayment:(r:Registration)=>void,onAccept:()=>void,onReject:()=>void,onDelete:(r:Registration)=>void,full?:boolean}){const rs=statusReg(row.status_pendaftaran),ps=statusPay(row.status_pembayaran);return <div className={`flex ${full?'mobile-actions w-full':'justify-end'} flex-wrap gap-1.5`}>";
const newActionsStart = "function Actions({row,onDetail,onEdit,onPayment,onAccept,onReject,onDelete,full=false}:{row:Registration,onDetail:(r:Registration)=>void,onEdit:()=>void,onPayment:(r:Registration)=>void,onAccept:()=>void,onReject:()=>void,onDelete:(r:Registration)=>void,full?:boolean}){const rs=statusReg(row.status_pendaftaran),ps=statusPay(row.status_pembayaran);const accepted=rs==='diterima';return <div className={`flex ${full?'mobile-actions w-full':'justify-end'} flex-wrap gap-1.5`}>";
if (component.includes(oldActionsStart) && !component.includes("const accepted=rs==='diterima';")) {
  component = component.replace(oldActionsStart, newActionsStart);
}

const oldDelete = "<button title=\"Hapus\" onClick={()=>void onDelete(row)} className=\"inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-black text-rose-700 hover:bg-rose-100\"><Trash2 size={14}/> Hapus</button>";
const newDelete = "{accepted&&<button type=\"button\" data-wa-verification-button=\"1\" title=\"Kirim notifikasi hasil verifikasi via WhatsApp\" aria-label=\"Kirim notifikasi verifikasi via WhatsApp\" onClick={()=>openAdminTournamentWhatsApp(row)} className=\"admin-wa-verification-button inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100\"><MessageCircle size={14}/> WA</button>}" + oldDelete;
if (component.includes(oldDelete) && !component.includes('onClick={()=>openAdminTournamentWhatsApp(row)')) {
  component = component.replace(oldDelete, newDelete);
}

// Safety hardening: the WA visibility condition must never depend on a
// leaked/undefined identifier. Keep the condition local to each action row.
component = component.replace(/\{accepted\s*&&/g, "{statusReg(row.status_pendaftaran)==='diterima'&&");

fs.writeFileSync(componentPath, component);

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Mobile action controls v2: compact icon-only grid with no clipped actions. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width:767px){\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article{overflow:visible!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;max-height:none!important;overflow:visible!important;align-items:stretch!important;gap:6px!important;margin-top:10px!important;position:relative!important;z-index:5!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button{width:100%!important;min-width:0!important;max-width:none!important;height:40px!important;min-height:40px!important;max-height:none!important;padding:0!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:0!important;font-size:0!important;line-height:1!important;white-space:nowrap!important;overflow:visible!important;border-radius:10px!important;touch-action:manipulation!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button svg{display:block!important;width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;margin:0!important;flex:0 0 auto!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions .admin-wa-verification-button{display:flex!important;visibility:visible!important;opacity:1!important;color:#047857!important;background:#ecfdf5!important;border-color:#a7f3d0!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions .admin-wa-verification-button svg{display:block!important;visibility:visible!important;opacity:1!important;stroke-width:2.2!important;}\n}\n@media (max-width:380px){\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button{height:38px!important;min-height:38px!important;border-radius:9px!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button svg{width:17px!important;height:17px!important;min-width:17px!important;min-height:17px!important;}\n}\n`;
} else {
  const directMarker = '/* Direct React WhatsApp mobile action hardening. */';
  if (!css.includes(directMarker)) {
    css += `\n\n${directMarker}\n@media (max-width:767px){.tournament-admin-page .mobile-actions .admin-wa-verification-button{display:flex!important;visibility:visible!important;opacity:1!important;color:#047857!important;background:#ecfdf5!important;border-color:#a7f3d0!important;}.tournament-admin-page .mobile-actions .admin-wa-verification-button svg{display:block!important;visibility:visible!important;opacity:1!important;}}\n`;
  }
}
fs.writeFileSync(cssPath, css);

console.log('Tournament admin mobile actions and direct WhatsApp action patched safely.');
