import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes("from 'browser-image-compression'")) {
  src = src.replace("import { motion } from 'framer-motion';", "import { motion } from 'framer-motion';\nimport imageCompression from 'browser-image-compression';");
}

if (!src.includes('async function compressTournamentImage')) {
  const marker = "function generateCode(){";
  const helper = `async function compressTournamentImage(file: File, kind: 'foto'|'ktp'|'bukti') {\n  if (!file.type.startsWith('image/')) return file;\n  const options = {\n    maxSizeMB: kind === 'ktp' ? 2.5 : 2,\n    maxWidthOrHeight: kind === 'ktp' ? 2600 : 2400,\n    initialQuality: 0.95,\n    useWebWorker: true,\n    preserveExif: true,\n    fileType: 'image/jpeg',\n  };\n  const compressed = await imageCompression(file, options);\n  return new File([compressed], file.name.replace(/\\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });\n}\n\n`;
  src = src.replace(marker, helper + marker);
}

// Allow high-resolution camera/gallery originals up to 12 MB; compression happens automatically afterward.
src = src.replace(/file\.size>5\*1024\*1024\)return Swal\.fire\(\{icon:'error',title:'KTP terlalu besar'[^;]+;\}/, "file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal 12 MB sebelum kompresi otomatis.'});");
src = src.replace(/file\.size>5\*1024\*1024\)return Swal\.fire\(\{icon:'error',title:'KTP terlalu besar'[^}]+\}\);/, "file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal 12 MB sebelum kompresi otomatis.'});");

const oldSelectFoto = "const selectFoto=(idx:0|1,file:File|undefined)=>{if(!file)return;if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'Foto tidak valid',text:'Foto pemain harus berupa file gambar.'});if(file.size>5*1024*1024)return Swal.fire({icon:'error',title:'Foto terlalu besar',text:'Ukuran maksimal foto pemain 5 MB.'});updatePlayer(idx,{foto:file,fotoPreview:URL.createObjectURL(file)});};";
const newSelectFoto = "const selectFoto=async(idx:0|1,file:File|undefined)=>{if(!file)return;if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'Foto tidak valid',text:'Foto pemain harus berupa file gambar.'});if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'Foto terlalu besar',text:'Ukuran foto maksimal 12 MB sebelum kompresi otomatis.'});try{const compressed=await compressTournamentImage(file,'foto');updatePlayer(idx,{foto:compressed,fotoPreview:URL.createObjectURL(compressed)});}catch(error:any){Swal.fire({icon:'error',title:'Kompresi foto gagal',text:error?.message||'Foto tidak dapat diproses. Silakan pilih foto lain.'});}};";
if (src.includes(oldSelectFoto)) src = src.replace(oldSelectFoto, newSelectFoto);

const oldScan = "updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),ocrStatus:'Membaca NIK...'});setOcrLoading";
const newScan = "const compressed=await compressTournamentImage(file,'ktp');updatePlayer(idx,{ktp:compressed,ktpPreview:URL.createObjectURL(compressed),ocrStatus:'Membaca NIK...'});file=compressed;setOcrLoading";
if (src.includes(oldScan)) src = src.replace(oldScan, newScan);

const oldProof = "const selectProof=(file:File|undefined)=>{if(!file)return;if(file.size>5*1024*1024)return Swal.fire({icon:'error',title:'Bukti pembayaran terlalu besar',text:'Ukuran maksimal 5 MB.'});setProof(file);setProofPreview(file.type.startsWith('image/')?URL.createObjectURL(file):'');};";
const newProof = "const selectProof=async(file:File|undefined)=>{if(!file)return;if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'Bukti pembayaran terlalu besar',text:'Ukuran maksimal 12 MB sebelum kompresi otomatis.'});try{const processed=file.type.startsWith('image/')?await compressTournamentImage(file,'bukti'):file;setProof(processed);setProofPreview(processed.type.startsWith('image/')?URL.createObjectURL(processed):'');}catch(error:any){Swal.fire({icon:'error',title:'Kompresi bukti gagal',text:error?.message||'File tidak dapat diproses.'});}};";
if (src.includes(oldProof)) src = src.replace(oldProof, newProof);

const oldUpload = "const uploadDoc=async(file:File,name:string)=>{const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path=`pendaftaran/${code}/${name}.${ext}`;const{error}=await supabase.storage.from('turnamen-dokumen').upload(path,file,{upsert:false,contentType:file.type});if(error)throw new Error(`Upload ${name} gagal: ${error.message}`);return path;};";
const newUpload = "const uploadDoc=async(file:File,name:string)=>{const processed=await compressTournamentImage(file,name.startsWith('ktp')?'ktp':'foto');const path=`pendaftaran/${code}/${name}.jpg`;const{error}=await supabase.storage.from('turnamen-dokumen').upload(path,processed,{upsert:false,contentType:'image/jpeg',cacheControl:'31536000'});if(error)throw new Error(`Upload ${name} gagal: ${error.message}`);return path;};";
if (src.includes(oldUpload)) src = src.replace(oldUpload, newUpload);

const oldProofUpload = "const ext=proof.name.split('.').pop()?.toLowerCase()||'jpg';const proofPath=`turnamen-bilibili-162/${code}.${ext}`;const{error:proofError}=await supabase.storage.from('uploads').upload(proofPath,proof,{upsert:false,contentType:proof.type});";
const newProofUpload = "const processedProof=proof.type.startsWith('image/')?await compressTournamentImage(proof,'bukti'):proof;const proofExt=processedProof.type==='image/jpeg'?'jpg':(processedProof.name.split('.').pop()?.toLowerCase()||'bin');const proofPath=`turnamen-bilibili-162/${code}.${proofExt}`;const{error:proofError}=await supabase.storage.from('uploads').upload(proofPath,processedProof,{upsert:false,contentType:processedProof.type,cacheControl:'31536000'});";
if (src.includes(oldProofUpload)) src = src.replace(oldProofUpload, newProofUpload);

fs.writeFileSync(path, src);
console.log('Tournament image compression patch applied.');
