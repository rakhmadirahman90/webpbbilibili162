import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');
const marker = 'SEEDED_ELIGIBILITY_REGISTRATION_V2';
if (s.includes(marker)) process.exit(0);

// V2.1: current PendaftaranTurnamen uses updatePlayer as the insertion boundary.
const start = s.indexOf('  const checkSeededEligibility=async(');
const end = s.indexOf('  const updatePlayer=', start);
if (start < 0 || end < 0) throw new Error('[seeded-v2] checkSeededEligibility boundary not found');

const replacement = `  const checkSeededEligibility=async(idx:0|1,name:string,category=form.kategori)=>{
    const clean=normalizePlayerName(name);
    setEligibility(p=>p.map((x,i)=>i===idx?null:x) as [SeededEligibility|null,SeededEligibility|null]);
    if(clean.length<3){setEligibilityLoading(p=>p.map((v,i)=>i===idx?false:v) as [boolean,boolean]);return;}
    setEligibilityLoading(p=>p.map((v,i)=>i===idx) as [boolean,boolean]);
    try{
      const allowedLevels = category===CATEGORIES[0] ? ['A','B','C+','C-','C','D'] : ['C','C-','D'];
      let {data,error}=await supabase
        .from('seeded_players')
        .select('id,player_name,club_name,seeded_quality,division_level,eligible_category,tournament_qualification,validity_status,normalized_name')
        .eq('normalized_name',clean)
        .eq('validity_status','VALID')
        .limit(20);
      if(error)throw error;
      if(!data?.length){
        const fallback=await supabase
          .from('seeded_players')
          .select('id,player_name,club_name,seeded_quality,division_level,eligible_category,tournament_qualification,validity_status,normalized_name')
          .ilike('player_name',name.trim())
          .eq('validity_status','VALID')
          .limit(20);
        if(fallback.error)throw fallback.error;
        data=fallback.data||[];
      }
      const match=(data||[]).find((p:any)=>{
        const level=seededLevel(p.seeded_quality||p.division_level);
        return allowedLevels.includes(level);
      });
      if(match){
        const level=seededLevel(match.seeded_quality||match.division_level);
        setEligibility(p=>p.map((x,i)=>i===idx?{
          eligible:true,
          id:match.id,
          player_name:match.player_name,
          club_name:match.club_name,
          seeded_quality:match.seeded_quality||match.division_level||'',
          eligible_category:match.eligible_category||'',
          tournament_qualification:match.tournament_qualification||'',
          message:'ELIGIBLE — DATA SEEDED RESMI COCOK — LEVEL '+level
        }:x) as [SeededEligibility|null,SeededEligibility|null]);
      }else{
        const found=(data||[])[0] as any;
        const foundLevel=found?seededLevel(found.seeded_quality||found.division_level):'';
        setEligibility(p=>p.map((x,i)=>i===idx?{
          eligible:false,
          id:found?.id,
          player_name:found?.player_name,
          club_name:found?.club_name,
          seeded_quality:found?.seeded_quality||found?.division_level||'',
          message:foundLevel
            ? 'Nama ditemukan, tetapi level '+foundLevel+' tidak tersedia untuk kategori '+category+'.'
            : 'Nama ditemukan, tetapi level seeded tidak lengkap.'
        }:x) as [SeededEligibility|null,SeededEligibility|null]);
      }
    }catch(err:any){
      setEligibility(p=>p.map((x,i)=>i===idx?{eligible:false,message:'Pengecekan seeded gagal: '+(err?.message||'database tidak dapat diakses')}:x) as [SeededEligibility|null,SeededEligibility|null]);
    }finally{
      setEligibilityLoading(p=>p.map((v,i)=>i===idx?false:v) as [boolean,boolean]);
    }
  };
  // SEEDED_ELIGIBILITY_REGISTRATION_V2
`;

s = s.slice(0,start) + replacement + s.slice(end);

s = s.replace(
  "const pairValidationMessage = (category:string, p1:any, p2:any) => {\n  const l1=seededLevel(p1?.seeded_quality), l2=seededLevel(p2?.seeded_quality);",
  "const pairValidationMessage = (category:string, p1:any, p2:any) => {\n  const l1=seededLevel(p1?.seeded_quality||p1?.division_level), l2=seededLevel(p2?.seeded_quality||p2?.division_level);"
);

const helperStart = s.indexOf('const seededEligibleForCategory =');
if(helperStart>=0){
  const helperEnd=s.indexOf('};',helperStart)+2;
  if(helperEnd>helperStart){
    s=s.slice(0,helperStart)+"const seededEligibleForCategory = (p:any, category:string) => { const allowed=category===CATEGORIES[0]?['A','B','C+','C-','C','D']:['C','C-','D']; return allowed.includes(seededLevel(p?.seeded_quality||p?.division_level)); };"+s.slice(helperEnd);
  }
}

fs.writeFileSync(path,s);
console.log('[seeded-v2] automatic seeded lookup and category rules fixed');
