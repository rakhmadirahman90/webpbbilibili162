import fs from 'node:fs';

const path = 'src/components/News.tsx';
let source = fs.readFileSync(path, 'utf8');

// News must use the authoritative remote Supabase client. The local-first
// proxy can return stale/partial rows and mask records that exist remotely.
source = source.replace(
  /import \{\s*supabase\s*\} from ["']\.\.\/supabase["'];/,
  "import { remoteSupabase } from '../supabase';"
);

// Replace only the client identifier followed by a member access. Never run a
// global word replacement because it would corrupt the import path ../supabase.
source = source.replace(/\bsupabase\s*\./g, 'remoteSupabase.');

// Make article image parsing support plain URLs, comma/space separated URLs,
// and JSON arrays stored in public.berita.gambar_url.
const oldImages = /  const getNewsImages = \(news: Berita\): string\[\] => \{[\s\S]*?\n  \};/;
const newImages = `  const getNewsImages = (news: Berita): string[] => {
    const raw = String(news.gambar_url || '').trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .flatMap(item => typeof item === 'string' ? [item] : [])
          .map(u => u.trim())
          .filter(Boolean);
      }
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
    } catch {}

    return raw
      .split(/\\s+|,/)
      .map(u => u.trim())
      .filter(Boolean);
  };`;
if (oldImages.test(source)) source = source.replace(oldImages, newImages);

fs.writeFileSync(path, source);
console.log('News patched to use remote Supabase as the source of truth.');
