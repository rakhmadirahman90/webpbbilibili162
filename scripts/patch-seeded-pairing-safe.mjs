import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');

const marker = 'SEEDED_PAIRING_SAFE_V1';
if (s.includes(marker)) process.exit(0);

if (
  s.includes('checkSeededPairEligibility') &&
  s.includes('const [pairStatus,setPairStatus]') &&
  !s.includes('const [eligibility,setEligibility]')
) {
  console.log('[pairing-safe] modern pair validator detected; skipping legacy eligibility injection');
  process.exit(0);
}

const typeCode = [
  'type SeededEligibility = {',
  '  eligible:boolean;',
  '  id?:number;',
  '  player_name?:string;',
  '  club_name?:string;',
  '  seeded_quality?:string;',
  '  division_level?:string;',
  'eligible_category?:string;',
  '  tournament_qualification?:string;',
  '  message?:string;',
  '};',
  ''
].join('\n');

if (!s.includes('type SeededEligibility =')) {
  const identityMarker = 'type Identity=typeof emptyIdentity;';
  if (!s.includes(identityMarker)) throw new Error('[pairing-safe] Identity marker not found');
  s = s.replace(identityMarker, identityMarker + '\n' + typeCode);
}

const helperCode = [
  '// SEEDED_PAIRING_SAFE_V1',
  'const seededLevel = (value:unknown) => {',
  "  const raw=String(value||'').toUpperCase().trim();",
  "  const m=raw.match(/\\b(C\\+|C-|A|B|C|D)\\b/);",
  "  return m ? m[1] : '';",
  '};',
  "const pairRuleText = (category:string) => category===CATEGORIES[0] ? 'Ajatappareng: A + D, B + C-, C+ + C, C + C, atau C + D.' : 'Lokal CC: C + C-, C + D, C + C, C- + C-, C- + D, atau D + D.';",
  'const isValidSeededPair = (category:string,a:string,b:string) => {',
  "  const x=seededLevel(a), y=seededLevel(b);",
  '  if(!x || !y) return false;',
  "  const key=[x,y].sort().join('|');",
  "  if(category===CATEGORIES[0]) return ['A|D','B|C-','C|C+','C|C','C|D'].includes(key);",
  "  return ['C|C','C|C-','C|D','C-|C-','C-|D','D|D'].includes(key);",
  '};',
  'const pairValidationMessage = (category:string,p1:any,p2:any) => {',
  "  const l1=seededLevel(p1?.seeded_quality||p1?.division_level);",
  "  const l2=seededLevel(p2?.seeded_quality||p2?.division_level);",
  "  if(!l1 || !l2) return 'Level seeded Pemain 1 dan Pemain 2 belum lengkap.';",
  "  return 'Kombinasi level '+l1+' + '+l2+' tidak diperbolehkan pada kategori ini. '+pairRuleText(category);",
  '};'
].join('\n') + '\n';

if (!s.includes('const seededLevel =')) {
  const identityMarker = 'type Identity=typeof emptyIdentity;';
  s = s.replace(identityMarker, identityMarker + '\n' + helperCode);
}

const stateMarker = "const [eligibility,setEligibility]=useState<[SeededEligibility|null,SeededEligibility|null]>([null,null]);const [eligibilityLoading,setEligibilityLoading]=useState<[boolean,boolean]>([false,false]);";
if (!s.includes('const [eligibility,setEligibility]')) {
  const loadingMarker = "const [proof,setProof]=useState<File|null>(null);";
  if (!s.includes(loadingMarker)) throw new Error('[pairing-safe] state insertion marker not found');
  s = s.replace(loadingMarker, loadingMarker + stateMarker + "\n  const pairReady=!!eligibility[0]?.eligible && !!eligibility[1]?.eligible && !eligibilityLoading[0] && !eligibilityLoading[1];\n  const pairValid=pairReady && isValidSeededPair(form.kategori,eligibility[0]?.seeded_quality||eligibility[0]?.division_level||'',eligibility[1]?.seeded_quality||eligibility[1]?.division_level||'');");
} else if (!s.includes('const pairReady=')) {
  s = s.replace(stateMarker, stateMarker + "\n  const pairReady=!!eligibility[0]?.eligible && !!eligibility[1]?.eligible && !eligibilityLoading[0] && !eligibilityLoading[1];\n  const pairValid=pairReady && isValidSeededPair(form.kategori,eligibility[0]?.seeded_quality||eligibility[0]?.division_level||'',eligibility[1]?.seeded_quality||eligibility[1]?.division_level||'');");
}

const updateOld = "const update=(key:keyof typeof form,value:string)=>setForm(p=>({...p,[key]:value}));";
if (s.includes(updateOld)) {
  const updateNew = [
    'const update=(key:keyof typeof form,value:string)=>{',
    '  setForm(p=>({...p,[key]:value}));',
    "  if(key==='kategori'){",
    '    setEligibility([null,null]);',
    '    setEligibilityLoading([false,false]);',
    '    setTimeout(()=>{',
    "      if(form.nama_pemain_1.trim()) checkSeededEligibility(0,form.nama_pemain_1,value);",
    "      if(form.nama_pemain_2.trim()) checkSeededEligibility(1,form.nama_pemain_2,value);",
    '    },0);',
    '  }',
    '};'
  ].join('\n');
  s = s.replace(updateOld, updateNew);
}

const nextNeedle = "if(step===1&&(!form.nama_pemain_1.trim()||!form.nama_pemain_2.trim()||!form.whatsapp.trim()))return Swal.fire({icon:'warning',title:'Data pasangan belum lengkap',text:'Nama kedua pemain dan WhatsApp wajib diisi.'});";
const nextGuard = nextNeedle + "\n    if(step===1){if(eligibilityLoading[0]||eligibilityLoading[1])return Swal.fire({icon:'info',title:'Sedang mengecek seeded',text:'Tunggu sampai status seeded kedua pemain selesai diperiksa.'});if(!eligibility[0]?.eligible||!eligibility[1]?.eligible)return Swal.fire({icon:'error',title:'Pemain belum eligible',text:'Kedua pemain harus ditemukan pada database seeded resmi sesuai kategori turnamen.'});if(!pairValid)return Swal.fire({icon:'error',title:'Kombinasi Pasangan Tidak Valid',text:pairValidationMessage(form.kategori,eligibility[0],eligibility[1])});}"
if (!s.includes('Kombinasi Pasangan Tidak Valid')) {
  if (!s.includes(nextNeedle)) throw new Error('[pairing-safe] next validation marker not found');
  s = s.replace(nextNeedle, nextGuard);
}

const submitNeedle = "const submit=async()=>{\n    if(!proof)";
if (!s.includes('if(!pairReady||!pairValid)')) {
  if (!s.includes(submitNeedle)) throw new Error('[pairing-safe] submit marker not found');
  s = s.replace(submitNeedle, "const submit=async()=>{\n    if(!pairReady||!pairValid)return Swal.fire({icon:'error',title:'Pasangan Tidak Memenuhi Aturan Seeded',text:pairValidationMessage(form.kategori,eligibility[0],eligibility[1])});\n    if(!proof)");
}

fs.writeFileSync(path,s);
console.log('[pairing-safe] seeded pairing validation installed without nested template literals');
