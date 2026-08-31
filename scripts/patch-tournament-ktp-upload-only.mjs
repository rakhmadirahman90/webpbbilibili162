import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// Tournament registration now treats KTP as an uploaded document only.
// NIK/OCR/region checks are intentionally bypassed; admin can inspect the
// uploaded KTP later. Keep legacy fields in the DB payload for compatibility.
src = src.replace("import { createWorker } from 'tesseract.js';\n", '');

const scanStart = src.indexOf('  const scanKTP=async(idx:0|1,file:File)=>{');
const selectFotoStart = src.indexOf('  const selectFoto=', scanStart);
if (scanStart !== -1 && selectFotoStart !== -1) {
  const uploadFn = `  const scanKTP=async(idx:0|1,file:File)=>{\n    if(!file)return;\n    if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'KTP harus berupa foto',text:'Unggah KTP dalam format JPG, PNG, atau WEBP.'});\n    if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal KTP adalah 12 MB.'});\n    updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),nik:'',wilayah:'',ocrStatus:'KTP berhasil diunggah'});\n    Swal.fire({icon:'success',title:'KTP berhasil diunggah',text:'KTP tersimpan dan akan diperiksa oleh admin. Verifikasi NIK otomatis dinonaktifkan.',confirmButtonColor:'#2563eb'});\n  };\n`;
  src = src.slice(0, scanStart) + uploadFn + src.slice(selectFotoStart);
}

// Step 2: require only a player photo and KTP upload for each player.
src = src.replace(
  "if(step===2){const missing=players.findIndex(p=>!p.foto||!p.ktp||!p.nik||!validateNIK(p.nik).valid);if(missing!==-1)return Swal.fire({icon:'error',title:`Dokumen Pemain ${missing+1} belum memenuhi syarat`,text:'Foto terbaru dan KTP wajib. NIK harus terbaca otomatis dan kode wilayah harus termasuk Ajatappareng/Parepare.'});}",
  "if(step===2){const missing=players.findIndex(p=>!p.foto||!p.ktp);if(missing!==-1)return Swal.fire({icon:'error',title:`Dokumen Pemain ${missing+1} belum lengkap`,text:'Foto terbaru dan KTP wajib diunggah.'});}"
);

// Final submit: never require OCR/NIK validation.
src = src.replace(
  "const checks=players.map(p=>validateNIK(p.nik));if(players.some(p=>!p.foto||!p.ktp)||checks.some(c=>!c.valid))return Swal.fire({icon:'error',title:'Pendaftaran ditolak sistem',text:'Setiap pemain wajib memiliki foto terbaru + KTP yang terbaca dan NIK dari wilayah Ajatappareng/Parepare.'});",
  "if(players.some(p=>!p.foto||!p.ktp))return Swal.fire({icon:'error',title:'Pendaftaran belum lengkap',text:'Setiap pemain wajib memiliki foto terbaru dan KTP yang sudah diunggah.'});"
);

// Preserve DB compatibility while explicitly recording that KTP is pending admin review.
src = src.replace(
  "wilayah_nik_pemain_1:players[0].wilayah,wilayah_nik_pemain_2:players[1].wilayah,verifikasi_nik_status:'Valid',verifikasi_nik_detail:`P1: ${players[0].wilayah}; P2: ${players[1].wilayah}`",
  "wilayah_nik_pemain_1:null,wilayah_nik_pemain_2:null,verifikasi_nik_status:'Belum Diverifikasi',verifikasi_nik_detail:'KTP diunggah; verifikasi NIK otomatis dinonaktifkan dan pemeriksaan dilakukan oleh admin.'"
);

src = src.replace(
  'KTP kedua pemain telah melewati pemeriksaan kode wilayah. Simpan kode pendaftaran untuk konfirmasi admin.',
  'KTP kedua pemain telah diunggah. Simpan kode pendaftaran untuk konfirmasi admin.'
);

// Remove OCR-specific status copy if it appears elsewhere in the rendered UI.
src = src.replace(/Membaca NIK\.\.\./g, 'Mengunggah KTP...');
src = src.replace(/NIK harus terbaca otomatis dan kode wilayah harus termasuk Ajatappareng\/Parepare\./g, 'KTP wajib diunggah dan akan diperiksa admin.');
src = src.replace(/KTP wajib\. NIK harus terbaca otomatis[^']*/g, 'KTP wajib diunggah.');

fs.writeFileSync(path, src);
console.log('[patch-tournament-ktp-upload-only] KTP is upload-only; OCR/NIK/region validation disabled for tournament registration.');
