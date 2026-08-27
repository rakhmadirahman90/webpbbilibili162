import fs from 'node:fs';

const path = 'src/components/ManajemenTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

const marker = "    const phone=normalizeTournamentWhatsApp(item.whatsapp);";
const start = src.indexOf(marker);
const endMarker = "    const statusLabel=nextStatus==='Diterima'?'DITERIMA & DIVERIFIKASI':'DITOLAK';";
const end = src.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  console.log('[patch-tournament-wa-popup] target block not found; no-op');
  process.exit(0);
}

const replacement = `    const phone=normalizeTournamentWhatsApp(item.whatsapp);\n    const message=buildTournamentStatusMessage({...item,status_pendaftaran:nextStatus,catatan_admin:note},nextStatus,note);\n    const waUrl=phone?\`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`:'';\n\n    // Reserve the WhatsApp tab immediately after the confirmation click so mobile browsers\n    // do not block the later navigation after the asynchronous Supabase update.\n    const waWindow=phone?window.open('about:blank','_blank'):null;\n\n    const result=await onUpdateStatusAndNotify(item,nextStatus,note);\n    if(!result){\n      if(waWindow&&!waWindow.closed)waWindow.close();\n      return;\n    }\n\n    if(phone&&waWindow&&!waWindow.closed)waWindow.location.href=waUrl;\n\n`;

src = src.slice(0, start) + replacement + src.slice(end);

// Remove the old second-step WA button because the WhatsApp tab is now opened immediately and safely.
src = src.replace(/    const r=await Swal\.fire\(\{\n      icon,\n      title:nextStatus==='Diterima'\?'Pendaftaran Berhasil Diterima':'Pendaftaran Ditolak',[\s\S]*?if\(r\.isConfirmed&&phone\)window\.open\(waUrl,'_blank','noopener,noreferrer'\);\n  \};/, `    await Swal.fire({\n      icon:nextStatus==='Diterima'?'success':'warning',\n      title:nextStatus==='Diterima'?'Pendaftaran Berhasil Diterima':'Pendaftaran Ditolak',\n      html:'Status sudah tersimpan. ' + (phone ? 'WhatsApp Penanggung Jawab telah dibuka dengan pesan konfirmasi lengkap.' : 'Nomor WhatsApp Penanggung Jawab tidak tersedia/valid.'),\n      confirmButtonText:'Selesai',\n      confirmButtonColor:nextStatus==='Diterima'?'#10b981':'#ef4444'\n    });\n  };`);

fs.writeFileSync(path, src);
console.log('[patch-tournament-wa-popup] WhatsApp opens immediately after verification and is navigated after save.');
