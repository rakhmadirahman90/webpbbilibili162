import fs from 'node:fs';

const path = 'src/components/News.tsx';
let source = fs.readFileSync(path, 'utf8');

// News must never use the local-first proxy: its cache can contain stale/partial
// rows and was the reason article detail showed blank title/image/content.
source = source.replace(
  /import \{ supabase \} from ["']\.\.\/supabase["'];/,
  "import { remoteSupabase } from '../supabase';"
);
source = source.replace(/\bsupabase\b/g, 'remoteSupabase');

// Restore the intended module import after the global identifier replacement.
source = source.replace(
  /import \{ remoteSupabase \} from ["']\.\.\/supabase["'];/,
  "import { remoteSupabase } from '../supabase';"
);

// Make image parsing tolerate plain URLs, comma/space separated URLs, and JSON arrays.
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

// Open the card immediately. A failed views update must never prevent the article
// from rendering. The direct remote row is authoritative for title/content/image.
const oldOpen = /  \/\/ Always open the canonical article row from Supabase, then persist the new view count\.[\s\S]*?\n  \};\n\n  const handleSubmitComment/;
const newOpen = `  // Open the article immediately, then refresh its canonical remote row.
  // Views are best-effort and can never block the article detail UI.
  const handleOpenNews = async (news: Berita) => {
    setSelectedNews(news);
    setActiveImgIndex(0);
    void fetchComments(news.id);

    try {
      const { data: freshNews, error: readError } = await remoteSupabase
        .from('berita')
        .select('id, judul, ringkasan, konten, kategori, gambar_url, tanggal, created_at, likes, views')
        .eq('id', news.id)
        .single();

      if (readError || !freshNews) {
        console.warn('Remote detail read failed; keeping card data:', readError);
        return;
      }

      const canonical = {
        ...freshNews,
        ringkasan: freshNews.ringkasan ?? news.ringkasan ?? '',
        konten: freshNews.konten ?? news.konten ?? '',
        kategori: freshNews.kategori ?? news.kategori ?? '',
        gambar_url: freshNews.gambar_url ?? news.gambar_url ?? '',
        likes: Number(freshNews.likes) || 0,
        views: Number(freshNews.views) || 0,
      } as Berita;

      setSelectedNews(canonical);
      setBeritaList(prev => prev.map(item => item.id === canonical.id ? { ...item, ...canonical } : item));
      void fetchComments(canonical.id);

      // Persist views separately. RLS/network failures are intentionally ignored.
      void remoteSupabase
        .from('berita')
        .update({ views: canonical.views + 1 })
        .eq('id', canonical.id)
        .then(({ error }) => {
          if (error) console.warn('Views update skipped:', error.message);
        });

      setSelectedNews(prev => prev?.id === canonical.id ? { ...prev, views: canonical.views + 1 } : prev);
    } catch (err) {
      console.warn('Gagal refresh detail berita; card data tetap digunakan:', err);
    }
  };

  const handleSubmitComment`;
if (oldOpen.test(source)) source = source.replace(oldOpen, newOpen);

fs.writeFileSync(path, source);
console.log('News now uses remote Supabase as source of truth.');
