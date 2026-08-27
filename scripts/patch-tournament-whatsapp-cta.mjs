import fs from 'node:fs';

const path = 'src/components/ManajemenTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// The status patch already builds the saved registration and waUrl. Replace the
// passive footer link with a real primary SweetAlert action, then launch WhatsApp
// directly from the user's tap. This avoids mobile popup blockers after async work.
src = src.replace(
  "      showConfirmButton:false,\n      showCloseButton:true,",
  "      showConfirmButton:!!phone,\n      confirmButtonText:phone?'📱 KIRIM KONFIRMASI KE WHATSAPP':'Tutup',\n      confirmButtonColor:'#16a34a',\n      showCloseButton:true,"
);

src = src.replace(
  "      footer:phone?\\`<a href=\"\\${waUrl}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"display:inline-flex;align-items:center;justify-content:center;background:#16a34a;color:#fff;text-decoration:none;font-weight:800;border-radius:10px;padding:12px 18px;font-size:14px;min-width:230px\">📱 KIRIM KONFIRMASI KE WHATSAPP</a>\\`:'<span style=\"color:#dc2626;font-weight:700\">Tambahkan nomor WhatsApp Penanggung Jawab pada data pendaftaran.</span>'",
  "      footer:phone?'<span style=\"color:#16a34a;font-weight:700\">Nomor WhatsApp siap digunakan.</span>':'<span style=\"color:#dc2626;font-weight:700\">Tambahkan nomor WhatsApp Penanggung Jawab pada data pendaftaran.</span>'"
);

const marker = "    return result;\n  };";
if (!src.includes('const whatsappNativeUrl=') && src.includes(marker)) {
  src = src.replace(marker, `    if(result.isConfirmed && phone && waUrl){\n      const whatsappNativeUrl=\`whatsapp://send?phone=\${phone}&text=\${encodeURIComponent(message)}\`;\n      // User activation is preserved by handling navigation immediately from the\n      // SweetAlert confirm action. Fall back to the HTTPS click-to-chat URL.\n      window.location.href=whatsappNativeUrl;\n      window.setTimeout(()=>{ window.location.href=waUrl; },1200);\n    }\n\n${marker}`);
}

fs.writeFileSync(path, src);
console.log('Tournament WhatsApp CTA patch applied.');
