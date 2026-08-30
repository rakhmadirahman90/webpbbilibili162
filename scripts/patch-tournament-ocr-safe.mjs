import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

const marker = 'function generateCode(){';
const helper = `async function createKtpOcrVariants(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Gambar KTP tidak dapat diproses.')); });
    const scale = Math.min(2, 3600 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const make = (mode: 'normal'|'contrast'|'threshold') => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < data.data.length; i += 4) {
        const y = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
        let v = y;
        if (mode === 'contrast') v = Math.max(0, Math.min(255, (y - 128) * 1.55 + 128));
        if (mode === 'threshold') v = y > 150 ? 255 : y < 90 ? 0 : (y - 90) * 3.33;
        data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v;
      }
      ctx.putImageData(data, 0, 0);
      return canvas;
    };
    return ['normal','contrast','threshold'].map(m => make(m as 'normal'|'contrast'|'threshold')).filter(Boolean) as HTMLCanvasElement[];
  } finally { URL.revokeObjectURL(url); }
}

`;
if (!src.includes('async function createKtpOcrVariants')) {
  if (!src.includes(marker)) throw new Error('Pendaftaran generateCode marker not found.');
  src = src.replace(marker, helper + marker);
}

const scanStart = src.indexOf('const scanKTP=async(idx:0|1,file:File)=>{');
const selectFotoStart = src.indexOf('const selectFoto=', scanStart);
if (scanStart === -1 || selectFotoStart === -1) throw new Error('KTP scan/selectFoto markers not found.');

const scanFn = `const scanKTP=async(idx:0|1,file:File)=>{
    if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'KTP harus berupa foto',text:'Unggah KTP dalam format JPG, PNG, atau WEBP.'});
    if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal KTP 12 MB.'});
    updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),ocrStatus:'Membaca NIK...'});setOcrLoading(p=>p.map((v,i)=>i===idx) as [boolean,boolean]);
    let worker:any=null;
    try{
      worker=await createWorker('eng');
      try{await worker.setParameters({tessedit_char_whitelist:'0123456789',preserve_interword_spaces:'1'});}catch{}
      const texts:string[]=[];
      try{const first=await worker.recognize(file,{rectangle:{left:0,top:0,width:0,height:0}} as any);texts.push(first.data.text||'');}catch{}
      try{
        const variants=await createKtpOcrVariants(file);
        for(const canvas of variants){
          try{const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.98));if(blob){const result=await worker.recognize(blob);texts.push(result.data.text||'');}}catch{}
        }
      }catch{}
      const nik=texts.map(findNIK).find(Boolean)||'';
      const check=validateNIK(nik);
      if(!nik){updatePlayer(idx,{nik:'',wilayah:'',ocrStatus:'NIK belum terbaca'});throw new Error('NIK 16 digit belum terbaca. Foto tetap dapat digunakan; silakan coba pindai ulang dengan seluruh KTP terlihat dan tulisan NIK fokus.');}
      if(!check.valid){updatePlayer(idx,{nik,wilayah:'',ocrStatus:'NIK terbaca — wilayah tidak sesuai'});throw new Error(check.message);}
      updatePlayer(idx,{nik,wilayah:check.region||'',ocrStatus:'VALID — NIK terbaca dan wilayah diizinkan'});
      Swal.fire({icon:'success',title:'KTP berhasil diverifikasi',html:\`NIK terbaca: <b>\${nik}</b><br><span>\${check.region}</span>\`,confirmButtonColor:'#2563eb'});
    }catch(err:any){Swal.fire({icon:'error',title:'Verifikasi KTP gagal',text:err?.message||'NIK tidak dapat diverifikasi. Silakan coba pindai ulang KTP.',confirmButtonColor:'#ef4444'});}finally{if(worker)try{await worker.terminate();}catch{}setOcrLoading(p=>p.map((v,i)=>i===idx?false:v) as [boolean,boolean]);}
  };
  `;
src = src.slice(0, scanStart) + scanFn + src.slice(selectFotoStart);

fs.writeFileSync(path, src);
console.log('[patch-tournament-ocr-safe] KTP OCR upgraded: original + contrast + threshold passes, digit whitelist, larger preprocessing scale.');