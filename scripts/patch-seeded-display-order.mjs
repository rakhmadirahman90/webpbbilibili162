import fs from 'node:fs';

const QUALITY_RANK = { A: 1, B: 2, 'C+': 3, C: 4, 'C-': 5, D: 6 };
const scriptPath = new URL('../src/components/PublicSeededPeserta.tsx', import.meta.url);
const adminPath = new URL('../src/components/SeededTurnamen.tsx', import.meta.url);

const sortCode = `\n    const seededRank = (value) => QUALITY_RANK[String(value ?? '').trim().toUpperCase()] ?? 99;\n`;

function publicPatch() {
  let s = fs.readFileSync(scriptPath, 'utf8');
  if (!s.includes('const QUALITY_RANK = {')) {
    s = s.replace("const DEFAULT_PAGE_SIZE=20;", "const DEFAULT_PAGE_SIZE=20;\nconst QUALITY_RANK={A:1,B:2,'C+':3,C:4,'C-':5,D:6};\nconst compareSeeded=(a,b)=>{const clubCmp=text(a.club_name).localeCompare(text(b.club_name),'id-ID',{sensitivity:'base'});if(clubCmp)return clubCmp;const qa=QUALITY_RANK[text(a.seeded_quality).toUpperCase()]??99;const qb=QUALITY_RANK[text(b.seeded_quality).toUpperCase()]??99;if(qa!==qb)return qa-qb;return text(a.player_name).localeCompare(text(b.player_name),'id-ID',{sensitivity:'base'});};");
  }
  const old = "    const batch=(data||[]) as Player[]; all.push(...batch); if(batch.length<1000)break;";
  const next = "    const batch=(data||[]) as Player[]; all.push(...batch); if(batch.length<1000)break;";
  if (!s.includes(old)) throw new Error('PublicSeededPeserta load marker not found');
  const marker = "    if(!mountedRef.current)return;\n    playersRef.current=all;";
  if (!s.includes(marker)) throw new Error('PublicSeededPeserta sort marker not found');
  s = s.replace(marker, "    if(!mountedRef.current)return;\n    all.sort(compareSeeded);\n    playersRef.current=all;");
  fs.writeFileSync(scriptPath, s);
}

function adminPatch() {
  let s = fs.readFileSync(adminPath, 'utf8');
  if (!s.includes('const QUALITY_RANK=')) {
    s = s.replace("const norm = (v: string) => v.toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');", "const norm = (v: string) => v.toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');\nconst QUALITY_RANK={A:1,B:2,'C+':3,C:4,'C-':5,D:6};\nconst compareSeeded=(a:Player,b:Player)=>{const clubCmp=text(a.club_name).localeCompare(text(b.club_name),'id-ID',{sensitivity:'base'});if(clubCmp)return clubCmp;const qa=QUALITY_RANK[text(a.seeded_quality).toUpperCase()]??99;const qb=QUALITY_RANK[text(b.seeded_quality).toUpperCase()]??99;if(qa!==qb)return qa-qb;return text(a.player_name).localeCompare(text(b.player_name),'id-ID',{sensitivity:'base'});};");
  }
  const old="      setPlayers((data||[]) as Player[]);";
  if (!s.includes(old)) throw new Error('SeededTurnamen setPlayers marker not found');
  s=s.replace(old,"      setPlayers(([...(data||[]) ] as Player[]).sort(compareSeeded));");
  fs.writeFileSync(adminPath,s);
}

publicPatch();
adminPatch();
console.log('Seeded display ordering applied: club A-Z, quality A-B-C+-C-C--D, player name A-Z.');
