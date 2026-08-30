import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');
const marker = 'SEEDED_PAIRING_RULES_V3';
if (s.includes(marker)) process.exit(0);

const old = "const update=(key:keyof typeof form,value:string)=>setForm(p=>({...p,[key]:value}));";
const replacement = `const update=(key:keyof typeof form,value:string)=>{
    setForm(p=>({...p,[key]:value}));
    if(key==='kategori'){
      setEligibility([null,null]);
      setEligibilityLoading([false,false]);
      setTimeout(()=>{
        if(form.nama_pemain_1.trim()) checkSeededEligibility(0,form.nama_pemain_1,value);
        if(form.nama_pemain_2.trim()) checkSeededEligibility(1,form.nama_pemain_2,value);
      },0);
    }
  };
  // ${marker}
`;

if (!s.includes(old)) throw new Error('[pairing-v3] category update marker not found');
s = s.replace(old, replacement);

// Make the pairing rules visible even before both players are resolved.
const rulesNeedle = "<p className=\\\"mt-2 text-[11px] leading-relaxed text-slate-300\\\">{pairRuleText(form.kategori)}</p>";
const rulesReplacement = "<p className=\\\"mt-2 text-[11px] leading-relaxed text-slate-300\\\">{pairRuleText(form.kategori)}</p><p className=\\\"mt-2 text-[10px] text-slate-500\\\">Pengecekan pemain mengikuti kategori yang sedang dipilih dan level seeded resmi dari database.</p>";
if (s.includes(rulesNeedle) && !s.includes('Pengecekan pemain mengikuti kategori')) s = s.replace(rulesNeedle, rulesReplacement);

fs.writeFileSync(path, s);
console.log('[pairing-v3] category changes now re-check both seeded players automatically');
