import fs from 'node:fs';
const path='src/components/PendaftaranTurnamen.tsx';
let s=fs.readFileSync(path,'utf8');
if(!s.includes("PaymentInstructions")) s=s.replace("import { motion } from 'framer-motion';", "import { motion } from 'framer-motion';\nimport PaymentInstructions from './PaymentInstructions';");
const re=/\{step===3&&<section className="mt-7 space-y-5">[\s\S]*?<\/section>\}/;
if(re.test(s)) s=s.replace(re,'{step===3&&<section className="mt-7 space-y-5"><PaymentInstructions/><label className="block"><span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Bukti Pembayaran</span><span className="mt-2 flex min-h-36 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/5 p-5 text-center"><input type="file" accept="image/*,.pdf" className="hidden" onChange={e=>selectProof(e.target.files?.[0])}/>{proofPreview?<img src={proofPreview} className="h-24 w-24 rounded-xl object-cover border border-white/10"/>:<div><FileUp className="mx-auto text-blue-400" size={30}/><p className="mt-2 text-xs font-bold text-white">Unggah bukti transfer/QRIS</p><p className="mt-1 text-[10px] text-slate-500">JPG/PNG/PDF • maksimal 5 MB</p></div>}</span></label></section>}');
else throw new Error('Tournament payment section not found');
fs.writeFileSync(path,s);console.log('Tournament payment methods patch applied.');
