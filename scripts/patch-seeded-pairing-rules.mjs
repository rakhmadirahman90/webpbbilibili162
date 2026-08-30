import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('SEEDED_PAIRING_RULES_V1')) process.exit(0);

const marker = '// SEEDED_PAIRING_RULES_V1';
const helper = `\n\n${marker}\nconst seededLevel = (value:unknown) => {\n  const raw = String(value || '').toUpperCase().trim();\n  const m = raw.match(/\\b(C\\+|C-|A|B|C|D)\\b/);\n  return m ? m[1] : '';\n};\nconst pairRuleText = (category:string) => category===CATEGORIES[0]\n  ? 'Ajatappareng: A + D, B + C-, atau C+ + C.'\n  : 'Lokal CC: C + C-, C + D, C + C, C- + C-, C- + D, atau D + D.';\nconst isValidSeededPair = (category:string, a:string, b:string) => {\n  const x=seededLevel(a), y=seededLevel(b);\n  if(!x || !y) return false;\n  const key=[x,y].sort().join('|');\n  if(category===CATEGORIES[0]) return ['A|D','B|C-','C|C+'].includes(key);\n  return ['C|C','C|C-','C|D','C-|C-','C-|D','D|D'].includes(key);\n};\nconst pairValidationMessage = (category:string, p1:any, p2:any) => {\n  const l1=seededLevel(p1?.seeded_quality), l2=seededLevel(p2?.seeded_quality);\n  if(!l1 || !l2) return 'Level seeded Pemain 1 dan Pemain 2 belum lengkap.';\n  return \\`Kombinasi level \\${l1} + \\${l2} tidak diperbolehkan untuk kategori ini. \\${pairRuleText(category)}\\`;\n};\n`;

const identityMarker = 'type Identity=typeof emptyIdentity;';
if (!s.includes(marker)) {
  if (!s.includes(identityMarker)) throw new Error('[pairing] identity marker not found');
  s = s.replace(identityMarker, identityMarker + helper);
}

// Add pair state after seeded eligibility state created by the previous patch.
const stateMarker = "const [eligibility,setEligibility]=useState<[SeededEligibility|null,SeededEligibility|null]>([null,null]);const [eligibilityLoading,setEligibilityLoading]=useState<[boolean,boolean]>([false,false]);";
const stateNew = stateMarker + "\n  const pairReady=!!eligibility[0]?.eligible && !!eligibility[1]?.eligible && !eligibilityLoading[0] && !eligibilityLoading[1];\n  const pairValid=pairReady && isValidSeededPair(form.kategori,eligibility[0]?.seeded_quality||'',eligibility[1]?.seeded_quality||'');";
if (!s.includes('const pairReady=')) {
  if (!s.includes(stateMarker)) throw new Error('[pairing] eligibility state marker not found');
  s = s.replace(stateMarker, stateNew);
}

// Replace the step-1 validation with seeded-pair validation before advancing.
const nextNeedle = "const next=()=>{\n    if(step===1&&(!form.nama_pemain_1.trim()||!form.nama_pemain_2.trim()||!form.whatsapp.trim()))";
const nextReplacement = "const next=()=>{\n    if(step===1&&(!form.nama_pemain_1.trim()||!form.nama_pemain_2.trim()||!form.whatsapp.trim()))";
if (!s.includes(nextNeedle)) throw new Error('[pairing] next marker not found');

const nextValidationNeedle = "if(step===1&&(!form.nama_pemain_1.trim()||!form.nama_pemain_2.trim()||!form.whatsapp.trim()))return Swal.fire({icon:'warning',title:'Data pasangan belum lengkap',text:'Nama kedua pemain dan WhatsApp wajib diisi.'});";
const nextValidationReplacement = nextValidationNeedle + "\n    if(step===1){if(eligibilityLoading[0]||eligibilityLoading[1])return Swal.fire({icon:'info',title:'Sedang mengecek seeded',text:'Tunggu sampai status seeded kedua pemain selesai diperiksa.'});if(!eligibility[0]?.eligible||!eligibility[1]?.eligible)return Swal.fire({icon:'error',title:'Pemain belum eligible',text:'Kedua pemain harus ditemukan pada database seeded resmi sesuai kategori turnamen.'});if(!pairValid)return Swal.fire({icon:'error',title:'Kombinasi Pasangan Tidak Valid',text:pairValidationMessage(form.kategori,eligibility[0],eligibility[1])});}";
if (!s.includes(nextValidationNeedle)) throw new Error('[pairing] step-1 validation marker not found');
s = s.replace(nextValidationNeedle, nextValidationReplacement);

// Re-check pair validity immediately before database insertion as a final client-side guard.
const submitNeedle = "const submit=async()=>{\n    if(!proof)";
const submitReplacement = "const submit=async()=>{\n    if(!pairReady||!pairValid)return Swal.fire({icon:'error',title:'Pasangan Tidak Memenuhi Aturan Seeded',text:pairValidationMessage(form.kategori,eligibility[0],eligibility[1])});\n    if(!proof)";
if (!s.includes(submitNeedle)) throw new Error('[pairing] submit marker not found');
s = s.replace(submitNeedle, submitReplacement);

// Add a clear live pairing-rule panel directly below the two seeded name fields.
const fields = "<SeededNameField index={0} label=\"Nama Pemain 1\" value={form.nama_pemain_1} onChange={v=>updatePlayerName(0,v)} result={eligibility[0]} loading={eligibilityLoading[0]}/><SeededNameField index={1} label=\"Nama Pemain 2\" value={form.nama_pemain_2} onChange={v=>updatePlayerName(1,v)} result={eligibility[1]} loading={eligibilityLoading[1]}/>";
const panel = fields + "<div className=\"sm:col-span-2 rounded-2xl border border-blue-400/20 bg-blue-500/[.06] p-4\"><div className=\"flex flex-wrap items-center justify-between gap-2\"><p className=\"text-[10px] font-black uppercase tracking-[.16em] text-blue-300\">Aturan Pasangan Seeded</p>{pairReady&&<span className={pairValid?\"rounded-full bg-emerald-500/15 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-300\":\"rounded-full bg-red-500/15 px-2.5 py-1 text-[9px] font-black uppercase text-red-300\"}>{pairValid?'✓ PASANGAN VALID':'✕ PASANGAN TIDAK VALID'}</span>}</div><p className=\"mt-2 text-[11px] leading-relaxed text-slate-300\">{pairRuleText(form.kategori)}</p>{pairReady&&<p className=\"mt-2 text-[10px] font-bold text-slate-400\">Level terdeteksi: <span className=\"text-white\">{seededLevel(eligibility[0]?.seeded_quality)} + {seededLevel(eligibility[1]?.seeded_quality)}</span></p>}</div>";
if (s.includes(fields) && !s.includes('Aturan Pasangan Seeded')) s = s.replace(fields, panel);

// Keep the public category label explicit and consistent with the requested rules.
s = s.replace("const CATEGORIES = ['Ganda Putra AD/BC-/C+C Ajatappareng', 'Ganda Putra CC Lokal Parepare'];", "const CATEGORIES = ['Ganda Putra AD/BC-/C+C Ajatappareng', 'Ganda Putra CC Lokal Parepare'];");

fs.writeFileSync(path, s);
console.log('[pairing] seeded pairing rules applied');
