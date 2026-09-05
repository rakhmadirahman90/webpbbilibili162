import fs from 'node:fs';

const componentPath = 'src/components/AdminPendaftaranTurnamenModern.tsx';
const cssPath = 'src/tournament-admin-modern.css';

let component = fs.readFileSync(componentPath, 'utf8');

// Ensure the WhatsApp icon is available without depending on the exact import list.
if (!component.includes('MessageCircle')) {
  component = component.replace(
    /import \{([^\n]+)\} from 'lucide-react';/,
    (_match, names) => `import {${names.trimEnd()}, MessageCircle} from 'lucide-react';`
  );
}

// Ensure the direct WhatsApp helper is available.
const directImport = "import { openAdminTournamentWhatsApp } from '../utils/adminTournamentWhatsAppDirect.ts';";
if (!component.includes(directImport)) {
  component = component.replace(
    "import Swal from 'sweetalert2';\n",
    "import Swal from 'sweetalert2';\n" + directImport + "\n"
  );
}

// The previous patch depended on an exact minified Actions function string.
// The component has evolved, so inject the action by anchoring on the stable Hapus button instead.
if (!component.includes('data-wa-verification-button="1"')) {
  const waButton = `{statusReg(row.status_pendaftaran)==='diterima'&&<button type="button" data-wa-verification-button="1" title="Kirim notifikasi hasil verifikasi via WhatsApp" aria-label="Kirim notifikasi verifikasi via WhatsApp" onClick={()=>openAdminTournamentWhatsApp(row)} className="admin-wa-verification-button inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"><MessageCircle size={14}/> WA</button>}`;
  const deleteOpening = /<button\b[^>]*\btitle=["']Hapus["'][^>]*>/;
  if (deleteOpening.test(component)) {
    component = component.replace(deleteOpening, `${waButton}$&`);
  } else {
    console.warn('Tournament WA patch: Hapus button anchor not found; source left unchanged.');
  }
}

// Make sure the mobile action wrapper exists even if an earlier version used a plain flex wrapper.
component = component.replace(
  /<div className=\{`flex \$\{full\?'mobile-actions w-full':'justify-end'\} flex-wrap gap-1\.5`\}>/,
  "<div className={`flex ${full?'mobile-actions w-full':'justify-end'} flex-wrap gap-1.5`}>"
);

fs.writeFileSync(componentPath, component);

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Tournament admin WhatsApp action forced visible v3. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width:767px){\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article{overflow:visible!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;max-height:none!important;overflow:visible!important;align-items:stretch!important;gap:6px!important;margin-top:10px!important;position:relative!important;z-index:20!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button{width:100%!important;min-width:0!important;max-width:none!important;height:40px!important;min-height:40px!important;max-height:none!important;padding:0!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:0!important;font-size:0!important;line-height:1!important;white-space:nowrap!important;overflow:visible!important;border-radius:10px!important;touch-action:manipulation!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button svg{display:block!important;width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;margin:0!important;flex:0 0 auto!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions .admin-wa-verification-button{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:30!important;color:#047857!important;background:#ecfdf5!important;border:1px solid #a7f3d0!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions .admin-wa-verification-button svg{display:block!important;visibility:visible!important;opacity:1!important;stroke-width:2.2!important;}\n}\n@media (max-width:380px){\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button{height:38px!important;min-height:38px!important;border-radius:9px!important;}\n  .tournament-admin-page section:nth-of-type(2)>div.divide-y>article .mobile-actions button svg{width:17px!important;height:17px!important;min-width:17px!important;min-height:17px!important;}\n}\n`;\n} else {\n  const directMarker = '/* Direct React WhatsApp mobile action hardening v3. */';\n  if (!css.includes(directMarker)) {\n    css += `\\n\\n${directMarker}\\n@media (max-width:767px){.tournament-admin-page .mobile-actions .admin-wa-verification-button{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:30!important;color:#047857!important;background:#ecfdf5!important;border:1px solid #a7f3d0!important;}.tournament-admin-page .mobile-actions .admin-wa-verification-button svg{display:block!important;visibility:visible!important;opacity:1!important;}}\\n`;\n  }\n}\nfs.writeFileSync(cssPath, css);\n\nconsole.log('Tournament admin WhatsApp action forced into participant cards.');\n