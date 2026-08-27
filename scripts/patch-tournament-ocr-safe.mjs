import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes('async function createKtpOcrImage')) {
  const marker = 'function generateCode(){';
  const helper = `async function createKtpOcrImage(file: File) {\n  const url = URL.createObjectURL(file);\n  try {\n    const img = new Image(); img.decoding = 'async'; img.src = url;\n    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Gambar KTP tidak dapat diproses.')); });\n    const scale = Math.min(1.5, 3200 / Math.max(img.naturalWidth, img.naturalHeight));\n    const w = Math.max(1, Math.round(img.naturalWidth * scale));\n    const h = Math.max(1, Math.round(img.naturalHeight * scale));\n    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;\n    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return file;\n    ctx.drawImage(img, 0, 0, w, h);\n    const data = ctx.getImageData(0, 0, w, h);\n    for (let i = 0; i < data.data.length; i += 4) {\n      const y = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];\n      const v = Math.max(0, Math.min(255, (y - 128) * 1.32 + 128));\n      data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v;\n    }\n    ctx.putImageData(data, 0, 0);\n    return await new Promise<File>((resolve) => canvas.toBlob((blob) => resolve(blob ? new File([blob], 'ktp-ocr.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.98));\n  } finally { URL.revokeObjectURL(url); }\n}\n\n`;
  src = src.replace(marker, helper + marker);
}

const scanStart = src.indexOf('const scanKTP=async(idx:0|1,file:File)=>{');
const selectFotoStart = src.indexOf('const selectFoto=', scanStart);
if (scanStart !== -1 && selectFotoStart !== -1) {
  const scanFn = `const scanKTP=async(idx:0|1,file:File)=>{\n    if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'KTP harus berupa foto',text:'Unggah KTP dalam format JPG, PNG, atau WEBP agar sistem dapat membaca NIK secara otomatis.'});\n    if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal KTP 12 MB sebelum kompresi otomatis.'});\n    updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),ocrStatus:'Membaca NIK...'});setOcrLoading(p=>p.map((v,i)=>i===idx) as [boolean,boolean]);\n    let worker:any=null;\n    try{\n      worker=await createWorker('eng');\n      const texts:string[]=[];\n      try{const first=await worker.recognize(file);texts.push(first.data.text||'');}catch{}\n      try{const enhanced=await createKtpOcrImage(file);const second=await worker.recognize(enhanced);texts.push(second.data.text||'');}catch{}\n      const nik=texts.map(findNIK).find(Boolean)||'';\n      const check=validateNIK(nik);\n      if(!nik){updatePlayer(idx,{nik:'',wilayah:'',ocrStatus:'NIK tidak terbaca — unggah ulang KTP yang jelas'});throw new Error('NIK 16 digit tidak terbaca. Pastikan seluruh KTP terlihat, tidak blur, tidak terpotong, dan pencahayaan cukup.');}\n      if(!check.valid){updatePlayer(idx,{nik,wilayah:'',ocrStatus:'DITOLAK — wilayah tidak sesuai'});throw new Error(check.message);}\n      updatePlayer(idx,{nik,wilayah:check.region||'',ocrStatus:'VALID — wilayah diizinkan'});\n      Swal.fire({icon:'success',title:'KTP berhasil diverifikasi',html:\`NIK terbaca: <b>\${nik}</b><br><span>\${check.region}</span>\`,confirmButtonColor:'#2563eb'});\n    }catch(err:any){Swal.fire({icon:'error',title:'Verifikasi KTP gagal',text:err?.message||'NIK tidak dapat diverifikasi. Silakan foto ulang KTP dengan lebih jelas.',confirmButtonColor:'#ef4444'});}finally{if(worker)try{await worker.terminate();}catch{}setOcrLoading(p=>p.map((v,i)=>i===idx?false:v) as [boolean,boolean]);}\n  };\n  `;
  src = src.slice(0, scanStart) + scanFn + src.slice(selectFotoStart);
}

// OCR always sees the original selected file. Compression remains in the upload path only.
src = src.replace(/const oldScan[\s\S]*?const newScan[\s\S]*?if \(src\.includes\(oldScan\)\) src = src\.replace\(oldScan, newScan\);\n?/g, '');

fs.writeFileSync(path, src);
console.log('[patch-tournament-ocr-safe] OCR now preserves original KTP and uses a second enhanced pass.');
