import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModern.tsx';
let src = fs.readFileSync(path, 'utf8');

src = src.replace(
  "import React, { useCallback, useEffect, useMemo, useState } from 'react';",
  "import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';"
);

if (!src.includes('loadInFlight')) {
  src = src.replace(
    '  const [saving, setSaving] = useState(false);',
    "  const [saving, setSaving] = useState(false);\n  const loadInFlight = useRef<Promise<void> | null>(null);\n  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);\n  const mounted = useRef(true);"
  );
}

const loadStart = src.indexOf('  const load = useCallback(async () => {');
const loadEnd = src.indexOf('  }, []);', loadStart);
if (loadStart >= 0 && loadEnd > loadStart) {
  const replacement = `  const load = useCallback(async () => {
    if (loadInFlight.current) return loadInFlight.current;
    const run = (async () => {
      setLoading(true);
      let lastError: any = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          if (mounted.current) setRows((data || []) as Registration[]);
          lastError = null;
          break;
        } catch (e: any) {
          lastError = e;
          const message = String(e?.message || e || '');
          const aborted = e?.name === 'AbortError' || /aborted|aborterror|signal is aborted/i.test(message);
          if (aborted && attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 350));
            continue;
          }
          break;
        }
      }
      if (lastError && mounted.current) {
        const message = String(lastError?.message || lastError || '');
        const aborted = lastError?.name === 'AbortError' || /aborted|aborterror|signal is aborted/i.test(message);
        console.error('[admin-pendaftaran] load failed', lastError);
        await Swal.fire({ icon: 'error', title: 'Data pendaftaran tidak dapat dimuat', text: aborted ? 'Koneksi data terputus sementara. Silakan tekan Muat Ulang untuk mencoba kembali.' : (message || 'Periksa koneksi database dan hak akses admin.'), confirmButtonColor: '#2563eb' });
      }
      if (mounted.current) setLoading(false);
    })();
    loadInFlight.current = run;
    try { await run; } finally { loadInFlight.current = null; }
  }, []);`;
  src = src.slice(0, loadStart) + replacement + src.slice(loadEnd + '  }, []);'.length);
}

const oldEffect = `  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener('app_data_changed', onChange);
    window.addEventListener('table_updated_pendaftaran_turnamen', onChange);
    const channel = supabase.channel('admin_pendaftaran_turnamen_modern_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, () => void load()).subscribe();
    return () => {
      window.removeEventListener('app_data_changed', onChange);
      window.removeEventListener('table_updated_pendaftaran_turnamen', onChange);
      supabase.removeChannel(channel);
    };
  }, [load]);`;
const newEffect = `  useEffect(() => {
    mounted.current = true;
    void load();
    const scheduleLoad = () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
      loadTimer.current = setTimeout(() => { loadTimer.current = null; void load(); }, 250);
    };
    window.addEventListener('app_data_changed', scheduleLoad);
    window.addEventListener('table_updated_pendaftaran_turnamen', scheduleLoad);
    const channel = supabase.channel('admin_pendaftaran_turnamen_modern_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, scheduleLoad).subscribe();
    return () => {
      mounted.current = false;
      if (loadTimer.current) { clearTimeout(loadTimer.current); loadTimer.current = null; }
      window.removeEventListener('app_data_changed', scheduleLoad);
      window.removeEventListener('table_updated_pendaftaran_turnamen', scheduleLoad);
      supabase.removeChannel(channel);
    };
  }, [load]);`;
if (src.includes(oldEffect)) src = src.replace(oldEffect, newEffect);

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-admin-participant-load-resilience] AbortError retry + in-flight dedupe + realtime debounce applied');
