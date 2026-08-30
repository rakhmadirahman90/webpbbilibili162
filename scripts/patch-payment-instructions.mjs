import fs from 'node:fs';

const file = 'src/components/PendaftaranTurnamen.tsx';
let source = fs.readFileSync(file, 'utf8');

if (source.includes('<PaymentInstructions/>')) {
  console.log('[patch-payment-instructions] PaymentInstructions already mounted; nothing to do');
  process.exit(0);
}

if (!source.includes("from './PaymentInstructions'")) {
  source = source.replace(
    "import Navbar from './Navbar';",
    "import Navbar from './Navbar';\nimport PaymentInstructions from './PaymentInstructions';"
  );
}

const pattern = /\{step===3&&<section className="mt-7 space-y-5">[\s\S]*?<\/section>\}/;
const replacement = `{step===3&&<section className="mt-7 space-y-5"><PaymentInstructions/><label className="block"><span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Bukti Pembayaran</span><span className="mt-2 flex min-h-36 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/5 p-5 text-center"><input type="file" accept="image/*,.pdf" className="hidden" onChange={e=>selectProof(e.target.files?.[0])}/>{proofPreview?<img src={proofPreview} className="h-24 w-24 rounded-xl object-cover border border-white/10"/>:<div><FileUp className="mx-auto text-blue-400" size={30}/><p className="mt-2 text-xs font-bold text-white">Pilih bukti transfer</p><p className="mt-1 text-[10px] text-slate-500">JPG/PNG/PDF • maksimal 5 MB</p></div>}</span></label></section>}`;

if (!pattern.test(source)) {
  throw new Error('Step 3 payment section not found; patch aborted to avoid corrupting the registration page.');
}

source = source.replace(pattern, replacement);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-payment-instructions] PaymentInstructions mounted in Step 3');
