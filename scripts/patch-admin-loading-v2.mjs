import fs from 'node:fs';

const adminPath = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
const supabasePath = 'src/supabase.ts';

if (fs.existsSync(adminPath)) {
  let src = fs.readFileSync(adminPath, 'utf8');

  if (!src.includes('loadInFlightV2')) {
    src = src.replace(
      "import React, { useCallback, useEffect, useMemo, useState } from 'react';",
      "import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';"
    );
    src = src.replace(
      '  const [saving, setSaving] = useState(false);',
      "  const [saving, setSaving] = useState(false);\n  const loadInFlightV2 = useRef<Promise<void> | null>(null);\n  const loadTimerV2 = useRef<ReturnType<typeof setTimeout> | null>(null);\n  const mountedV2 = useRef(true);"
    );
  }

  const loadStart = src.indexOf('  const load = useCallback(async () => {');
  const loadEndMarker = '  }, []);';
  const loadEnd = src.indexOf(loadEndMarker, loadStart);
  if (loadStart >= 0 && loadEnd > loadStart && !src.includes('[admin-pendaftaran-v2] load failed')) {
    const replacement = `  const load = useCallback(async () => {
    if (loadInFlightV2.current) return loadInFlightV2.current;
    const run = (async () => {
      setLoading(true);
      let lastError: any = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          if (mountedV2.current) setRows((data || []) as Registration[]);
          lastError = null;
          break;
        } catch (e: any) {
          lastError = e;
          const message = String(e?.message || e || '');
          const aborted = e?.name === 'AbortError' || /aborted|aborterror|signal is aborted|timed out/i.test(message);
          if (aborted && attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 400));
            continue;
          }
          break;
        }
      }
      if (lastError && mountedV2.current) {
        const message = String(lastError?.message || lastError || '');
        const aborted = lastError?.name === 'AbortError' || /aborted|aborterror|signal is aborted|timed out/i.test(message);
        console.error('[admin-pendaftaran-v2] load failed', lastError);
        await Swal.fire({
          icon: 'error',
          title: 'Data pendaftaran tidak dapat dimuat',
          text: aborted ? 'Koneksi data terputus sementara. Silakan tekan Muat Ulang untuk mencoba kembali.' : (message || 'Periksa koneksi database dan hak akses admin.'),
          confirmButtonColor: '#2563eb'
        });
      }
      if (mountedV2.current) setLoading(false);
    })();
    loadInFlightV2.current = run;
    try { await run; } finally { loadInFlightV2.current = null; }
  }, []);`;
    src = src.slice(0, loadStart) + replacement + src.slice(loadEnd + loadEndMarker.length);
  }

  const oldEffect = `  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener('app_data_changed', onChange);
    window.addEventListener('table_updated_pendaftaran_turnamen', onChange);
    const channel = supabase.channel('admin_pendaftaran_turnamen_v2_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, () => void load()).subscribe();
    return () => { window.removeEventListener('app_data_changed', onChange); window.removeEventListener('table_updated_pendaftaran_turnamen', onChange); supabase.removeChannel(channel); };
  }, [load]);`;
  const newEffect = `  useEffect(() => {
    mountedV2.current = true;
    void load();
    const scheduleLoad = () => {
      if (loadTimerV2.current) clearTimeout(loadTimerV2.current);
      loadTimerV2.current = setTimeout(() => { loadTimerV2.current = null; void load(); }, 300);
    };
    window.addEventListener('app_data_changed', scheduleLoad);
    window.addEventListener('table_updated_pendaftaran_turnamen', scheduleLoad);
    const channel = supabase.channel('admin_pendaftaran_turnamen_v2_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, scheduleLoad).subscribe();
    return () => {
      mountedV2.current = false;
      if (loadTimerV2.current) { clearTimeout(loadTimerV2.current); loadTimerV2.current = null; }
      window.removeEventListener('app_data_changed', scheduleLoad);
      window.removeEventListener('table_updated_pendaftaran_turnamen', scheduleLoad);
      supabase.removeChannel(channel);
    };
  }, [load]);`;
  if (src.includes(oldEffect)) src = src.replace(oldEffect, newEffect);

  fs.writeFileSync(adminPath, src, 'utf8');
  console.log('[patch-admin-loading-v2] in-flight dedupe + retry + realtime debounce applied');
}

if (fs.existsSync(supabasePath)) {
  let src = fs.readFileSync(supabasePath, 'utf8');
  if (!src.includes("largeAdminReadTables = new Set(['pendaftaran_turnamen', 'seeded_players'])")) {
    const original = `    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = typeof window !== 'undefined' ? window.setTimeout(() => controller?.abort(), 5_000) : setTimeout(() => controller?.abort(), 5_000);
    try {
      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller?.signal });`;
    const replacement = `    const largeAdminReadTables = new Set(['pendaftaran_turnamen', 'seeded_players']);
    const isLargeAdminRead = largeAdminReadTables.has(getTableFromRestUrl(targetUrl));
    const controller = (isLargeAdminRead || !init?.signal) && typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = 30_000;
    const timeout = controller
      ? (typeof window !== 'undefined' ? window.setTimeout(() => controller.abort(), timeoutMs) : setTimeout(() => controller.abort(), timeoutMs))
      : null;
    const effectiveSignal = isLargeAdminRead ? controller?.signal : (init?.signal || controller?.signal);
    try {
      const response = await nativeFetch(input, { ...init, signal: effectiveSignal });`;
    if (src.includes(original)) {
      src = src.replace(original, replacement);
      src = src.replace('      clearTimeout(timeout);', '      if (timeout) clearTimeout(timeout);');
      fs.writeFileSync(supabasePath, src, 'utf8');
      console.log('[patch-admin-loading-v2] Supabase admin-read timeout extended to 30s');
    } else {
      console.log('[patch-admin-loading-v2] Supabase timeout block already changed; no-op');
    }
  } else {
    console.log('[patch-admin-loading-v2] Supabase admin-read timeout already patched; no-op');
  }
}
