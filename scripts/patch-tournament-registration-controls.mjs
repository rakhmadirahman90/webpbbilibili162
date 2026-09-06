import fs from 'node:fs';

const fail = (message) => { throw new Error(`[tournament-registration-controls] ${message}`); };
const update = (path, mutator) => {
  const before = fs.readFileSync(path, 'utf8');
  const after = mutator(before);
  if (after !== before) fs.writeFileSync(path, after, 'utf8');
};

update('src/components/PendaftaranTurnamen.tsx', (source) => {
  let next = source;
  const importAnchor = "import { useNavigate } from 'react-router-dom';";
  const settingsImport = "import { getCategoryAvailability } from '../utils/tournamentRegistrationSettings';";
  if (!next.includes(settingsImport)) {
    if (!next.includes(importAnchor)) fail('PendaftaranTurnamen import anchor not found');
    next = next.replace(importAnchor, `${importAnchor}\n${settingsImport}`);
  }

  if (!next.includes('const [capacityStatus')) {
    const stateAnchor = "  const [pairStatus,setPairStatus]=useState<PairStatus>({eligible:false,checking:false,reason:''});";
    if (!next.includes(stateAnchor)) fail('pairStatus state anchor not found');
    next = next.replace(stateAnchor, `${stateAnchor}\n  const [capacityStatus,setCapacityStatus]=useState<{loading:boolean;closed:boolean;count:number;target:number;remaining:number;reason:string}>({loading:true,closed:false,count:0,target:0,remaining:0,reason:''});`);
  }

  if (!next.includes('const refreshCapacity')) {
    const scanAnchor = '  const scanKTP=async(idx:0|1,file:File)=>{';
    if (!next.includes(scanAnchor)) fail('scanKTP anchor not found');
    const block = `  const refreshCapacity=async()=>{\n    try{\n      setCapacityStatus(p=>({...p,loading:true}));\n      const result=await getCategoryAvailability(form.kategori);\n      setCapacityStatus({loading:false,closed:result.closed,count:result.count,target:result.target,remaining:result.remaining,reason:result.reason});\n    }catch(err){\n      console.error('Gagal memeriksa kuota pendaftaran:',err);\n      setCapacityStatus(p=>({...p,loading:false,reason:'Kuota sedang diperiksa. Silakan coba lagi.'}));\n    }\n  };\n\n  useEffect(()=>{\n    void refreshCapacity();\n    const onChange=()=>void refreshCapacity();\n    window.addEventListener('app_data_changed',onChange);\n    window.addEventListener('table_updated_pendaftaran_turnamen',onChange);\n    const timer=window.setInterval(()=>void refreshCapacity(),30000);\n    return()=>{window.removeEventListener('app_data_changed',onChange);window.removeEventListener('table_updated_pendaftaran_turnamen',onChange);window.clearInterval(timer);};\n  },[form.kategori]);\n\n  const capacityNotice=capacityStatus.closed\n    ? (capacityStatus.reason||'Pendaftaran untuk kategori ini sudah ditutup.')\n    : capacityStatus.target>0\n      ? \`Sisa kuota: \${capacityStatus.remaining} pasangan dari \${capacityStatus.target}.\`\n      : '';\n\n`;
    next = next.replace(scanAnchor, block + scanAnchor);
  }

  if (!next.includes('const __capacityCheckBeforeNext')) {
    const nextAnchor = '  const next=async()=>{';
    if (!next.includes(nextAnchor)) fail('next function anchor not found');
    next = next.replace(nextAnchor, `  const __capacityCheckBeforeNext=async()=>{\n    const availability=await getCategoryAvailability(form.kategori);\n    if(availability.closed){\n      await Swal.fire({icon:'warning',title:'Pendaftaran Kategori Ditutup',text:availability.reason||'Kuota kategori sudah penuh atau tanggal pendaftaran telah berakhir.',confirmButtonColor:'#2563eb'});\n      return false;\n    }\n    return true;\n  };\n\n  const next=async()=>{\n    if(!(await __capacityCheckBeforeNext()))return;`);
  }

  if (!next.includes('const availability=await getCategoryAvailability(form.kategori);if(availability.closed')) {
    const submitAnchor = '  const submit=async()=>{';
    if (!next.includes(submitAnchor)) fail('submit function anchor not found');
    next = next.replace(submitAnchor, `  const submit=async()=>{\n    const availability=await getCategoryAvailability(form.kategori);\n    if(availability.closed){\n      return Swal.fire({icon:'warning',title:'Pendaftaran Tidak Dapat Dilanjutkan',text:availability.reason||'Kategori penuh atau pendaftaran sudah ditutup.',confirmButtonColor:'#2563eb'});\n    }`);
  }

  if (!next.includes('data-capacity-notice')) {
    const renderAnchor = '  if(success)return <div className="min-h-screen bg-[#0b0e14]">';
    if (!next.includes(renderAnchor)) fail('success render anchor not found');
    const notice = `  const __capacityNotice=capacityStatus.loading?null:(<div data-capacity-notice className={\`mx-auto mb-5 max-w-4xl rounded-2xl border p-4 text-sm font-bold \${capacityStatus.closed?'border-red-400/40 bg-red-500/10 text-red-200':'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}\`}><div className="flex items-start gap-3"><span className="mt-0.5 text-lg">{capacityStatus.closed?'⚠️':'✓'}</span><div><div>{capacityStatus.closed?'PENDAFTARAN KATEGORI DITUTUP':'STATUS KUOTA KATEGORI'}</div><div className="mt-1 text-xs font-medium opacity-90">{capacityNotice}</div>{capacityStatus.closed&&<div className="mt-1 text-xs font-medium opacity-90">Silakan pilih kategori lain yang masih tersedia.</div>}</div></div></div>);\n\n`;
    next = next.replace(renderAnchor, notice + renderAnchor);
  }

  if (!next.includes('{__capacityNotice}')) {
    const navbarRegex = /(return\s*<div[^>]*>\s*<Navbar[^>]*\/>)/;
    if (navbarRegex.test(next)) next = next.replace(navbarRegex, '$1{__capacityNotice}');
    else console.warn('[tournament-registration-controls] Navbar render marker not found; notice will still be enforced on Next/Submit');
  }

  return next;
});

update('src/components/AdminRouteView.tsx', (source) => {
  let next = source;
  const importStatement = "import AdminTurnamenPendaftaranSettings from './AdminTurnamenPendaftaranSettings';";
  if (!next.includes(importStatement)) {
    const anchor = "import AdminPendaftaranTurnamenModernV2 from './AdminPendaftaranTurnamenModernV2';";
    if (!next.includes(anchor)) fail('AdminRouteView tournament import anchor not found');
    next = next.replace(anchor, `${anchor} ${importStatement}`);
  }
  if (!/case\s*['"]pengaturan-pendaftaran-turnamen['"]\s*:/.test(next)) {
    const anchor = "case'pendaftaran-turnamen':return adminOnly(AdminPendaftaranTurnamenModernV2);";
    if (!next.includes(anchor)) fail('AdminRouteView tournament route anchor not found');
    next = next.replace(anchor, `${anchor}case'pengaturan-pendaftaran-turnamen':return adminOnly(AdminTurnamenPendaftaranSettings);`);
  }
  return next;
});

update('src/components/Sidebar.tsx', (source) => {
  let next = source;
  next = next.replace(/\s*\{\s*name:\s*['"](?:Pengaturan Pendaftaran Turnamen|Kontrol Pendaftaran Turnamen)['"]\s*,\s*path:\s*['"]pengaturan-pendaftaran-turnamen['"][^}]*\},?/g, '');
  const sectionRegex = /(section:\s*['"]Administrasi\s*&\s*Keuangan['"][\s\S]*?items:\s*\[[\s\S]*?\{\s*name:\s*['"]Kelola Kas['"]\s*,\s*path:\s*['"]kas['"][^}]*\},?)/;
  if (sectionRegex.test(next)) {
    next = next.replace(sectionRegex, `$1\n        { name: 'Pengaturan Pendaftaran Turnamen', path: 'pengaturan-pendaftaran-turnamen', icon: Calendar, adminOnly: true },`);
  } else {
    console.warn('[tournament-registration-controls] Administrasi & Keuangan section not found; route remains available directly');
  }
  return next;
});

console.log('[tournament-registration-controls] completed');
