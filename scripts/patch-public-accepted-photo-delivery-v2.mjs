import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __PUBLIC_ACCEPTED_PHOTO_DELIVERY_V2__ */';
if (src.includes(marker)) {
  console.log('[patch-public-accepted-photo-delivery-v2] already applied');
  process.exit(0);
}

// The source currently has a V1 photo resolver injected during prebuild.
// Replace that resolver with a batched createSignedUrls request so all
// accepted participants across every pagination page receive URLs together.
const startNeedle = "  useEffect(() => {\n    let cancelled = false;\n    const readPhotoCache =";
const start = src.indexOf(startNeedle);
if (start < 0) throw new Error('[patch-public-accepted-photo-delivery-v2] V1 photo resolver not found');
const endNeedle = "  }, [rows, pageSize]);";
const end = src.indexOf(endNeedle, start);
if (end < 0) throw new Error('[patch-public-accepted-photo-delivery-v2] V1 photo resolver end not found');

const replacement = `  useEffect(() => {
    let cancelled = false;
    const CACHE_KEY = 'pb_accepted_photo_cache_v2';
    const CACHE_TTL = 23 * 60 * 60 * 1000;
    const readCache = (): Record<string, { foto1: string; foto2: string }> => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed?.expiresAt > Date.now() && parsed.items ? parsed.items : {};
      } catch { return {}; }
    };
    const writeCache = (items: Record<string, { foto1: string; foto2: string }>) => {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ expiresAt: Date.now() + CACHE_TTL, items })); } catch {}
    };
    const resolvePhotos = async () => {
      const cache = readCache();
      const next: Record<string, { foto1: string; foto2: string }> = { ...cache };
      const pathToTargets = new Map<string, Array<{ id: string; key: 'foto1' | 'foto2' }>>();

      for (const row of rows) {
        const id = String(row.id);
        const result = {
          foto1: directUrl(row.foto_pemain_1_url) || cache[id]?.foto1 || '',
          foto2: directUrl(row.foto_pemain_2_url) || cache[id]?.foto2 || ''
        };
        next[id] = result;
        const fields: Array<[keyof Registration, 'foto1' | 'foto2']> = [
          ['foto_pemain_1_url', 'foto1'],
          ['foto_pemain_2_url', 'foto2']
        ];
        for (const [field, key] of fields) {
          if (result[key]) continue;
          const raw = clean(row[field]);
          if (!raw || !/^pendaftaran\\//i.test(raw)) continue;
          const targets = pathToTargets.get(raw) || [];
          targets.push({ id, key });
          pathToTargets.set(raw, targets);
        }
      }

      const paths = Array.from(pathToTargets.keys());
      const applySigned = (items: any[] | null | undefined) => {
        for (const item of items || []) {
          const signedUrl = item?.signedUrl || item?.signedURL;
          const rawPath = item?.path || item?.name;
          if (!signedUrl || !rawPath) continue;
          for (const target of pathToTargets.get(rawPath) || []) next[target.id][target.key] = signedUrl;
        }
      };

      // Supabase supports batch signing; chunk defensively for larger tournaments.
      for (let i = 0; i < paths.length; i += 100) {
        if (cancelled) return;
        const chunk = paths.slice(i, i + 100);
        try {
          const { data, error: batchError } = await supabase.storage
            .from('turnamen-dokumen')
            .createSignedUrls(chunk, 23 * 60 * 60);
          if (!batchError && data) applySigned(data);
          else {
            // Fallback keeps individual files working if a batch contains a bad object.
            const fallback = await Promise.all(chunk.map(async raw => {
              try {
                const { data: one, error: oneError } = await supabase.storage
                  .from('turnamen-dokumen').createSignedUrl(raw, 23 * 60 * 60);
                return oneError ? null : { path: raw, signedUrl: one?.signedUrl };
              } catch { return null; }
            }));
            applySigned(fallback);
          }
        } catch {}
      }

      if (cancelled) return;
      writeCache(next);
      setPhotoUrls(next);
    };
    void resolvePhotos();
    return () => { cancelled = true; };
  }, [rows]);`;

src = src.slice(0, start) + replacement + src.slice(end + endNeedle.length);

// Make the five-column desktop layout match the reference and keep compact cards.
src = src.replace(
  'grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
  'grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5'
);

// Force the visible participant photos to load immediately and preserve the full portrait.
src = src.replace(/loading=\"lazy\"/g, 'loading=\"eager\"');
src = src.replace(/className=\"h-full w-full object-cover object-center transition duration-300 group-hover:scale-\[1\.02\]\"/g,
  'className=\"h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.01]\"');

// IMPORTANT: emit real newlines into the TSX source. Do not write the literal characters \\n.
src += `\n\n${marker}\n`;
fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-accepted-photo-delivery-v2] all participant photo URLs batched, cached and eagerly rendered across every page');
