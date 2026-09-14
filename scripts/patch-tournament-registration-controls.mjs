import fs from 'node:fs';

const update = (path, mutator) => {
  const before = fs.readFileSync(path, 'utf8');
  const after = mutator(before);
  if (after !== before) fs.writeFileSync(path, after, 'utf8');
};

// Registration capacity controls are maintained in the current source. This
// build-prep patch must remain idempotent and must never fail a production
// build just because an older string anchor no longer exists.
update('src/components/PendaftaranTurnamen.tsx', (source) => {
  let next = source;
  const settingsImport = "import { getCategoryAvailability } from '../utils/tournamentRegistrationSettings';";
  const importAnchor = "import { useNavigate } from 'react-router-dom';";
  if (!next.includes(settingsImport) && next.includes(importAnchor)) {
    next = next.replace(importAnchor, `${importAnchor}\n${settingsImport}`);
  }

  if (!next.includes('const [capacityStatus')) {
    const stateAnchor = "  const [pairStatus,setPairStatus]=useState<PairStatus>({eligible:false,checking:false,reason:''});";
    if (next.includes(stateAnchor)) {
      next = next.replace(stateAnchor, `${stateAnchor}\n  const [capacityStatus,setCapacityStatus]=useState<{loading:boolean;closed:boolean;count:number;target:number;remaining:number;reason:string}>({loading:true,closed:false,count:0,target:0,remaining:0,reason:''});`);
    }
  }

  if (!next.includes('const refreshCapacity') && next.includes(settingsImport)) {
    const scanAnchor = '  const scanKTP=async(idx:0|1,file:File)=>{';
    if (next.includes(scanAnchor)) {
      const block = `  const refreshCapacity=async()=>{\n    try{setCapacityStatus(p=>({...p,loading:true}));const result=await getCategoryAvailability(form.kategori);setCapacityStatus({loading:false,closed:result.closed,count:result.count,target:result.target,remaining:result.remaining,reason:result.reason});}\n    catch(err){console.error('Gagal memeriksa kuota pendaftaran:',err);setCapacityStatus(p=>({...p,loading:false,reason:'Kuota sedang diperiksa. Silakan coba lagi.'}));}\n  };\n  useEffect(()=>{void refreshCapacity();const onChange=()=>void refreshCapacity();window.addEventListener('app_data_changed',onChange);window.addEventListener('table_updated_pendaftaran_turnamen',onChange);const timer=window.setInterval(()=>void refreshCapacity(),30000);return()=>{window.removeEventListener('app_data_changed',onChange);window.removeEventListener('table_updated_pendaftaran_turnamen',onChange);window.clearInterval(timer);};},[form.kategori]);\n  const capacityNotice=capacityStatus.closed?(capacityStatus.reason||'Pendaftaran untuk kategori ini sudah ditutup.'):capacityStatus.target>0?\`Sisa kuota: \${capacityStatus.remaining} pasangan dari \${capacityStatus.target}.\`:'';\n\n`;
      next = next.replace(scanAnchor, block + scanAnchor);
    }
  }

  if (!next.includes('const __capacityCheckBeforeNext') && next.includes(settingsImport)) {
    const nextAnchor = '  const next=async()=>{';
    if (next.includes(nextAnchor)) {
      next = next.replace(nextAnchor, `  const __capacityCheckBeforeNext=async()=>{const availability=await getCategoryAvailability(form.kategori);if(availability.closed){await Swal.fire({icon:'warning',title:'Pendaftaran Kategori Ditutup',text:availability.reason||'Kuota kategori sudah penuh atau tanggal pendaftaran telah berakhir.',confirmButtonColor:'#2563eb'});return false;}return true;};\n\n  const next=async()=>{if(!(await __capacityCheckBeforeNext()))return;`);
    }
  }

  if (!next.includes("getCategoryAvailability(form.kategori);\n    if(availability.closed") && next.includes(settingsImport)) {
    const submitAnchor = '  const submit=async()=>{';
    if (next.includes(submitAnchor)) {
      next = next.replace(submitAnchor, `  const submit=async()=>{\n    const availability=await getCategoryAvailability(form.kategori);\n    if(availability.closed){return Swal.fire({icon:'warning',title:'Pendaftaran Tidak Dapat Dilanjutkan',text:availability.reason||'Kategori penuh atau pendaftaran sudah ditutup.',confirmButtonColor:'#2563eb'});}`);
    }
  }

  if (!next.includes('data-capacity-notice') && next.includes('capacityStatus')) {
    const renderAnchor = '  if(success)return <div className="min-h-screen bg-[#0b0e14]">';
    if (next.includes(renderAnchor)) {
      const notice = `  const __capacityNotice=capacityStatus.loading?null:(<div data-capacity-notice className={\`mx-auto mb-5 max-w-4xl rounded-2xl border p-4 text-sm font-bold \${capacityStatus.closed?'border-red-400/40 bg-red-500/10 text-red-200':'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}\`}><div className="flex items-start gap-3"><span className="mt-0.5 text-lg">{capacityStatus.closed?'⚠️':'✓'}</span><div><div>{capacityStatus.closed?'PENDAFTARAN KATEGORI DITUTUP':'STATUS KUOTA KATEGORI'}</div><div className="mt-1 text-xs font-medium opacity-90">{capacityNotice}</div>{capacityStatus.closed&&<div className="mt-1 text-xs font-medium opacity-90">Silakan pilih kategori lain yang masih tersedia.</div>}</div></div></div>);\n\n`;
      next = next.replace(renderAnchor, notice + renderAnchor);
    }
  }

  if (!next.includes('{__capacityNotice}') && next.includes('data-capacity-notice')) {
    const navbarRegex = /(return\s*<div[^>]*>\s*<Navbar[^>]*\/>)/;
    if (navbarRegex.test(next)) next = next.replace(navbarRegex, '$1{__capacityNotice}');
  }
  return next;
});

update('src/components/AdminRouteView.tsx', (source) => {
  let next = source;
  const importStatement = "import AdminTurnamenPendaftaranSettings from './AdminTurnamenPendaftaranSettings';";
  if (!next.includes(importStatement)) {
    const importAnchor = "import AdminPendaftaranTurnamenModernV2 from './AdminPendaftaranTurnamenModernV2';";
    if (next.includes(importAnchor)) next = next.replace(importAnchor, `${importAnchor}\n${importStatement}`);
  }
  if (!/case\s*['"]pengaturan-pendaftaran-turnamen['"]\s*:/.test(next)) {
    const routePattern = /(case\s*['"](?:pendaftaran-turnamen|peserta-turnamen)['"]\s*:\s*\n?\s*case\s*['"]peserta-diterima['"]\s*:\s*\n?\s*return\s+adminOnly\(AdminPendaftaranTurnamenModernV2\);)/;
    if (routePattern.test(next)) {
      next = next.replace(routePattern, `$1\n    case 'pengaturan-pendaftaran-turnamen': return adminOnly(AdminTurnamenPendaftaranSettings);`);
    } else {
      console.warn('[tournament-registration-controls] current AdminRouteView has no matching registration route; route patch skipped safely');
    }
  }
  return next;
});

update('src/components/Sidebar.tsx', (source) => {
  let next = source;
  next = next.replace(/\s*\{\s*name:\s*['"](?:Pengaturan Pendaftaran Turnamen|Kontrol Pendaftaran Turnamen)['"]\s*,\s*path:\s*['"]pengaturan-pendaftaran-turnamen['"][^}]*\},?/g, '');
  const sectionRegex = /(section:\s*['"]Administrasi\s*&\s*Keuangan['"][\s\S]*?items:\s*\[[\s\S]*?\{\s*name:\s*['"]Kelola Kas['"]\s*,\s*path:\s*['"]kas['"][^}]*\},?)/;
  if (sectionRegex.test(next)) {
    next = next.replace(sectionRegex, `$1\n        { name: 'Pengaturan Pendaftaran Turnamen', path: 'pengaturan-pendaftaran-turnamen', icon: Calendar, adminOnly: true },`);
  }
  return next;
});

console.log('[tournament-registration-controls] completed safely');
