import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes("from 'browser-image-compression'")) {
  src = src.replace("import { motion } from 'framer-motion';", "import { motion } from 'framer-motion';\nimport imageCompression from 'browser-image-compression';");
}

if (!src.includes('async function compressTournamentImage')) {
  const marker = "function generateCode(){";
  const helper = `async function compressTournamentImage(file: File, kind: 'foto'|'ktp'|'bukti') {\n  if (!file.type.startsWith('image/')) return file;\n  const options = { maxSizeMB: kind === 'ktp' ? 2.5 : 2, maxWidthOrHeight: kind === 'ktp' ? 2600 : 2400, initialQuality: 0.95, useWebWorker: true, preserveExif: true, fileType: 'image/jpeg' };\n  const compressed = await imageCompression(file, options);\n  return new File([compressed], file.name.replace(/\\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });\n}\n\n`;
  src = src.replace(marker, helper + marker);
}

// KTP is allowed to be a high-resolution camera original. Compression is ONLY for storage.
src = src.replace(/file\.size>5\*1024\*1024\)return Swal\.fire\(\{icon:'error',title:'KTP terlalu besar'[^;]+;\}/, "file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal KTP 12 MB sebelum kompresi otomatis.'});");
src = src.replace(/file\.size>5\*1024\*1024\)return Swal\.fire\(\{icon:'error',title:'KTP terlalu besar'[^}]+\}\);/, "file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal KTP 12 MB sebelum kompresi otomatis.'});");

const oldSelectFoto = "const selectFoto=(idx:0|1,file:File|undefined)=>{if(!file)return;if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'Foto tidak valid',text:'Foto pemain harus berupa file gambar.'});if(file.size>5*1024*1024)return Swal.fire({icon:'error',title:'Foto terlalu besar',text:'Ukuran maksimal foto pemain 5 MB.'});updatePlayer(idx,{foto:file,fotoPreview:URL.createObjectURL(file)});};";
const newSelectFoto = "const selectFoto=async(idx:0|1,file:File|undefined)=>{if(!file)return;if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'Foto tidak valid',text:'Foto pemain harus berupa file gambar.'});if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'Foto terlalu besar',text:'Ukuran foto maksimal 12 MB sebelum kompresi otomatis.'});try{const compressed=await compressTournamentImage(file,'foto');updatePlayer(idx,{foto:compressed,fotoPreview:URL.createObjectURL(compressed)});}catch(error){Swal.fire({icon:'error',title:'Kompresi foto gagal',text:error?.message||'Foto tidak dapat diproses. Silakan pilih foto lain.'});}};";
if (src.includes(oldSelectFoto)) src = src.replace(oldSelectFoto, newSelectFoto);

// IMPORTANT: never replace the KTP with a compressed image before OCR.
const badScan = "const compressed=await compressTournamentImage(file,'ktp');updatePlayer(idx,{ktp:compressed,ktpPreview:URL.createObjectURL(compressed),ocrStatus:'Membaca NIK...'});file=compressed;setOcrLoading";
const goodScan = "updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),ocrStatus:'Membaca NIK...'});setOcrLoading";
if (src.includes(badScan)) src = src.replace(badScan, goodScan);

if (!src.includes('const createKtpOcrImage')) {
  const marker = "function generateCode(){";
  const helper = `async function createKtpOcrImage(file: File) {\n  const url = URL.createObjectURL(file);\n  try {\n    const img = new Image(); img.decoding = 'async'; img.src = url;\n    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Gambar KTP tidak dapat diproses.')); });\n    const scale = Math.min(1.5, 3000 / Math.max(img.naturalWidth, img.naturalHeight));\n    const w = Math.max(1, Math.round(img.naturalWidth * scale)); const h = Math.max(1, Math.round(img.naturalHeight * scale));\n    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;\n    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return file;\n    ctx.drawImage(img, 0, 0, w, h); const data = ctx.getImageData(0, 0, w, h);\n    for (let i = 0; i < data.data.length; i += 4) { const y = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2]; const v = Math.max(0, Math.min(255, (y - 128) * 1.28 + 128)); data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; }\n    ctx.putImageData(data, 0, 0);\n    return await new Promise<File>((resolve) => canvas.toBlob((blob) => resolve(blob ? new File([blob], 'ktp-ocr.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.98));\n  } finally { URL.revokeObjectURL(url); }\n}\n\n`;
  src = src.replace(marker, helper + marker);
}

const oldOcrBody = "try{const worker=await createWorker('eng');const result=await worker.recognize(file);await worker.terminate();const nik=findNIK(result.data.text);const check=validateNIK(nik);";
const newOcrBody = "try{const worker=await createWorker('eng');let texts:string[]=[];try{const first=await worker.recognize(file);texts.push(first.data.text||'');}catch{}try{const enhanced=await createKtpOcrImage(file);const second=await worker.recognize(enhanced);texts.push(second.data.text||'');}catch{}await worker.terminate();const nik=texts.map(findNIK).find(Boolean)||'';const check=validateNIK(nik);";
if (src.includes(oldOcrBody)) src = src.replace(oldOcrBody, newOcrBody);

const oldProof = "const selectProof=(file:File|undefined)=>{if(!file)return;if(file.size>5*1024*1024)return Swal.fire({icon:'error',title:'Bukti pembayaran terlalu besar',text:'Ukuran maksimal 5 MB.'});setProof(file);setProofPreview(file.type.startsWith('image/')?URL.createObjectURL(file):'');};";
const newProof = "const selectProof=async(file:File|undefined)=>{if(!file)return;if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'Bukti pembayaran terlalu besar',text:'Ukuran maksimal 12 MB sebelum kompresi otomatis.'});try{const processed=file.type.startsWith('image/')?await compressTournamentImage(file,'bukti'):file;setProof(processed);setProofPreview(processed.type.startsWith('image/')?URL.createObjectURL(processed):'');}catch(error){Swal.fire({icon:'error',title:'Kompresi bukti gagal',text:error?.message||'File tidak dapat diproses.'});}};";
if (src.includes(oldProof)) src = src.replace(oldProof, newProof);

const oldUpload = "const uploadDoc=async(file:File,name:string)=>{const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path=`pendaftaran/${code}/${name}.${ext}`;const{error}=await supabase.storage.from('turnamen-dokumen').upload(path,file,{upsert:false,contentType:file.type});if(error)throw new Error(`Upload ${name} gagal: ${error.message}`);return path;};";
const newUpload = "const uploadDoc=async(file:File,name:string)=>{const isKtp=name.startsWith('ktp');const processed=await compressTournamentImage(file,isKtp?'ktp':'foto');const path=`pendaftaran/${code}/${name}.jpg`;const{error}=await supabase.storage.from('turnamen-dokumen').upload(path,processed,{upsert:false,contentType:'image/jpeg',cacheControl:'31536000'});if(error)throw new Error(`Upload ${name} gagal: ${error.message}`);return path;};";
if (src.includes(oldUpload)) src = src.replace(oldUpload, newUpload);

const oldProofUpload = "const ext=proof.name.split('.').pop()?.toLowerCase()||'jpg';const proofPath=`turnamen-bilibili-162/${code}.${ext}`;const{error:proofError}=await supabase.storage.from('uploads').upload(proofPath,proof,{upsert:false,contentType:proof.type});";
const newProofUpload = "const processedProof=proof.type.startsWith('image/')?await compressTournamentImage(proof,'bukti'):proof;const proofExt=processedProof.type==='image/jpeg'?'jpg':(processedProof.name.split('.').pop()?.toLowerCase()||'bin');const proofPath=`turnamen-bilibili-162/${code}.${proofExt}`;const{error:proofError}=await supabase.storage.from('uploads').upload(proofPath,processedProof,{upsert:false,contentType:processedProof.type,cacheControl:'31536000'});";
if (src.includes(oldProofUpload)) src = src.replace(oldProofUpload, newProofUpload);

fs.writeFileSync(path, src);
console.log('Tournament image compression/OCR-safe patch applied.');
