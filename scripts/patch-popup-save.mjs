import fs from 'node:fs';
const path='src/components/AdminPopup.tsx';
let s=fs.readFileSync(path,'utf8');
const rt=/  useEffect\(\(\) => \{\s*fetchPopups\(false\);\s*const syncInterval = setInterval\(\(\) => fetchPopups\(true\), 3000\);.*?\n  \}, \[\]\);/s;
const rtNew=`  useEffect(() => {
    fetchPopups(false);
    // Realtime is centralized globally; no component-level polling/channel.
    const handleCustomEvent = (e: any) => { if (!e.detail?.key || e.detail.key === 'popup_config') fetchPopups(true); };
    const handleLocalDb = (e: any) => { if (!e.detail?.table || e.detail.table === 'konfigurasi_popup' || e.detail.table === 'site_settings') fetchPopups(true); };
    window.addEventListener('site_setting_updated', handleCustomEvent);
    window.addEventListener('local-db-updated', handleLocalDb);
    return () => {
      window.removeEventListener('site_setting_updated', handleCustomEvent);
      window.removeEventListener('local-db-updated', handleLocalDb);
    };
  }, []);`;
if(!rt.test(s)) throw new Error('realtime block not found');
s=s.replace(rt,rtNew);
const pp=/  const persistPopups = async \(updatedList: PopupConfig\[\]\) => \{.*?\n  \};\n\n  const loadJadwalLatihanTemplate/s;
const ppNew=`  const persistPopups = (updatedList: PopupConfig[]) => {
    const standardizedList=updatedList.map((item,idx)=>({...item,urutan:idx}));
    setPopups(standardizedList);
    void (async()=>{
      try{await saveSiteSetting('popup_config',standardizedList,'Konfigurasi Popup Promo');}catch(e){console.warn('[AdminPopup] site setting sync',e);}
      try{const dbUpdates=standardizedList.map(({id,urutan,judul,deskripsi,url_gambar,is_active,file_url})=>({id,urutan:urutan??0,judul:judul||'',deskripsi:deskripsi||'',url_gambar:url_gambar||'',is_active:is_active??true,file_url:file_url||null}));if(dbUpdates.length)await supabase.from('konfigurasi_popup').upsert(dbUpdates,{onConflict:'id'});}catch(e){console.warn('[AdminPopup] db sync',e);}
      try{broadcastDataChange('popup_config','UPDATE',standardizedList);broadcastDataChange('konfigurasi_popup','UPDATE',standardizedList);window.dispatchEvent(new CustomEvent('site_setting_updated',{detail:{key:'popup_config',value:standardizedList}}));window.dispatchEvent(new CustomEvent('table_updated_popup_config'));window.dispatchEvent(new CustomEvent('table_updated_konfigurasi_popup'));}catch{}
    })();
  };

  const loadJadwalLatihanTemplate`;
if(!pp.test(s)) throw new Error('persist block not found');
s=s.replace(pp,ppNew);
s=s.replace('    await persistPopups(updatedList);\n\n    Swal.fire({','    persistPopups(updatedList);\n\n    Swal.fire({',1);
s=s.replace('    await persistPopups(updatedList);','    persistPopups(updatedList);');
fs.writeFileSync(path,s);
console.log('popup patch applied');
