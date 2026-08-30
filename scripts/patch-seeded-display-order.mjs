import fs from 'node:fs';

const QUALITY_RANK = { A: 1, B: 2, 'C+': 3, C: 4, 'C-': 5, D: 6 };
const publicPath = new URL('../src/components/PublicSeededPeserta.tsx', import.meta.url);
const adminPath = new URL('../src/components/SeededTurnamen.tsx', import.meta.url);

const comparator = `const QUALITY_RANK={A:1,B:2,'C+':3,C:4,'C-':5,D:6};\nconst compareSeeded=(a,b)=>{const qa=QUALITY_RANK[String(a.seeded_quality??'').trim().toUpperCase()]??99;const qb=QUALITY_RANK[String(b.seeded_quality??'').trim().toUpperCase()]??99;if(qa!==qb)return qa-qb;const ca=String(a.club_name??'').trim();const cb=String(b.club_name??'').trim();const clubCmp=ca.localeCompare(cb,'id-ID',{sensitivity:'base'});if(clubCmp)return clubCmp;return String(a.player_name??'').trim().localeCompare(String(b.player_name??'').trim(),'id-ID',{sensitivity:'base'});};`;

function patchPublic() {
  let s = fs.readFileSync(publicPath, 'utf8');
  if (!s.includes('const QUALITY_RANK = {') && !s.includes('const QUALITY_RANK={')) {
    const marker = 'const DEFAULT_PAGE_SIZE=20;';
    if (!s.includes(marker)) throw new Error('PublicSeededPeserta constants marker not found');
    s = s.replace(marker, `${marker}\n${comparator}`);
  }
  const sortMarker = '    playersRef.current=all;';
  if (s.includes(sortMarker) && !s.includes('all.sort(compareSeeded);')) {
    s = s.replace(sortMarker, '    all.sort(compareSeeded);\n    playersRef.current=all;');
  }
  fs.writeFileSync(publicPath, s);
}

function patchAdmin() {
  let s = fs.readFileSync(adminPath, 'utf8');
  if (!s.includes('const QUALITY_RANK=')) {
    const marker = "const norm = (v: string) => v.toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');";
    if (!s.includes(marker)) throw new Error('SeededTurnamen constants marker not found');
    s = s.replace(marker, `${marker}\n${comparator}`);
  }
  if (!s.includes('__displayNo')) {
    s = s.replace('  id: number;\n', '  id: number;\n  __displayNo?: number;\n');
  }
  const loadMarker = '      setPlayers((data||[]) as Player[]);';
  if (s.includes(loadMarker)) {
    s = s.replace(loadMarker, '      const sortedPlayers=([...(data||[])] as Player[]).sort(compareSeeded);\n      setPlayers(sortedPlayers.map((p,index)=>({...p,__displayNo:index+1})));');
  } else if (s.includes('setPlayers(([...(data||[]) ] as Player[]).sort(compareSeeded));')) {
    s = s.replace('setPlayers(([...(data||[]) ] as Player[]).sort(compareSeeded));', 'const sortedPlayers=([...(data||[])] as Player[]).sort(compareSeeded); setPlayers(sortedPlayers.map((p,index)=>({...p,__displayNo:index+1})));');
  }
  if (!s.includes('seeded-admin-page')) {
    s = s.replace('return <div className="min-h-full overflow-x-hidden bg-[#050b17]', 'return <div className="seeded-admin-page min-h-full overflow-x-hidden bg-[#050b17]');
  }
  const cellPattern = /(<td[^>]*>)(\{[^}]*p\.source_no[^}]*\})(<\/td>)/;
  if (cellPattern.test(s)) {
    s = s.replace(cellPattern, '$1{p.__displayNo ?? p.source_no}$3');
  }
  fs.writeFileSync(adminPath, s);
}

patchPublic();
patchAdmin();
console.log('Seeded ordering: A > B > C+ > C > C- > D, then club A-Z, then player name A-Z. Display No. is regenerated without changing player IDs.');
