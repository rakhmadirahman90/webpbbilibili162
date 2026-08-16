from pathlib import Path
import re

path = Path("src/components/News.tsx")
s = path.read_text(encoding="utf-8")

s = s.replace("import { DEFAULT_BERITA, DEFAULT_KOMENTAR } from '../data/localDatabase';", "import { DEFAULT_KOMENTAR } from '../data/localDatabase';")

image_pattern = re.compile(
    r"  // Helper untuk mendapatkan semua gambar dari berita\n  const getNewsImages = \(news: Berita\): string\[\] => \{.*?\n  \};\n",
    re.S,
)
image_replacement = """  // public.berita.gambar_url is the only source for article images.
  const getNewsImages = (news: Berita): string[] => {
    if (!news.gambar_url) return [];
    return news.gambar_url
      .split(/[\\s,]+/)
      .map(u => u.trim())
      .filter(Boolean);
  };

"""
s, n = image_pattern.subn(lambda _m: image_replacement, s, count=1)
if n != 1:
    raise SystemExit("getNewsImages block not found")

fetch_pattern = re.compile(
    r"  const fetchNews = async \(\) => \{.*?\n  \};\n\n  const fetchComments = async",
    re.S,
)
fetch_replacement = """  const fetchNews = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('berita')
        .select('id, judul, ringkasan, konten, kategori, gambar_url, tanggal, created_at, likes, views')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        ringkasan: item.ringkasan ?? '',
        konten: item.konten ?? '',
        kategori: item.kategori ?? '',
        gambar_url: item.gambar_url ?? '',
        likes: Number(item.likes) || 0,
        views: Number(item.views) || 0,
        comments_count: 0,
      }));

      const articleIds = formattedData.map(item => item.id);
      if (articleIds.length > 0) {
        const { data: commentRows } = await supabase
          .from('komentar')
          .select('berita_id');

        const counts = new Map<string, number>();
        (commentRows || []).forEach(row => {
          if (row.berita_id) counts.set(row.berita_id, (counts.get(row.berita_id) || 0) + 1);
        });
        formattedData.forEach(item => {
          item.comments_count = counts.get(item.id) || 0;
        });
      }

      setBeritaList(formattedData as Berita[]);
      setSelectedNews(prev => {
        if (!prev) return prev;
        const fresh = formattedData.find(item => item.id === prev.id);
        return fresh ? (fresh as Berita) : null;
      });
    } catch (err) {
      console.error('Gagal memuat berita langsung dari Supabase public.berita:', err);
      setBeritaList([]);
      setSelectedNews(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async"""
s, n = fetch_pattern.subn(lambda _m: fetch_replacement, s, count=1)
if n != 1:
    raise SystemExit("fetchNews block not found")

open_pattern = re.compile(
    r"  // PERBAIKAN UTAMA: Fungsi Open News & Update View Permanen ke Database\n  const handleOpenNews = async \(news: Berita\) => \{.*?\n  \};\n\n  const handleSubmitComment",
    re.S,
)
open_replacement = """  // Always open the canonical article row from Supabase, then persist the new view count.
  const handleOpenNews = async (news: Berita) => {
    try {
      const { data: freshNews, error: readError } = await supabase
        .from('berita')
        .select('id, judul, ringkasan, konten, kategori, gambar_url, tanggal, created_at, likes, views')
        .eq('id', news.id)
        .single();

      if (readError || !freshNews) throw readError || new Error('Berita tidak ditemukan di public.berita');

      const currentViews = Number(freshNews.views) || 0;
      const { data: updatedNews, error: updateError } = await supabase
        .from('berita')
        .update({ views: currentViews + 1 })
        .eq('id', freshNews.id)
        .select('id, judul, ringkasan, konten, kategori, gambar_url, tanggal, created_at, likes, views')
        .single();

      if (updateError || !updatedNews) throw updateError || new Error('Gagal memperbarui views berita');

      const canonical = {
        ...updatedNews,
        ringkasan: updatedNews.ringkasan ?? '',
        konten: updatedNews.konten ?? '',
        kategori: updatedNews.kategori ?? '',
        gambar_url: updatedNews.gambar_url ?? '',
        likes: Number(updatedNews.likes) || 0,
        views: Number(updatedNews.views) || 0,
      } as Berita;

      setSelectedNews(canonical);
      setActiveImgIndex(0);
      fetchComments(canonical.id);
      setBeritaList(prev => prev.map(item => item.id === canonical.id ? { ...item, ...canonical } : item));
    } catch (err) {
      console.error('Gagal membuka berita dari Supabase:', err);
      await fetchNews();
    }
  };

  const handleSubmitComment"""
s, n = open_pattern.subn(lambda _m: open_replacement, s, count=1)
if n != 1:
    raise SystemExit("handleOpenNews block not found")

like_pattern = re.compile(
    r"    const newsItem = beritaList\.find\(n => n\.id === newsId\);\n    const currentLikes = Number\(newsItem\?\.likes\) \|\| 0;\n    let finalLikeCount = currentLikes;",
)
like_replacement = """    const { data: canonicalNews, error: canonicalReadError } = await supabase
      .from('berita')
      .select('likes')
      .eq('id', newsId)
      .single();

    if (canonicalReadError || !canonicalNews) {
      console.error('Gagal membaca likes canonical dari public.berita:', canonicalReadError);
      await fetchNews();
      return;
    }

    const currentLikes = Number(canonicalNews.likes) || 0;
    let finalLikeCount = currentLikes;"""
s, n = like_pattern.subn(lambda _m: like_replacement, s, count=1)
if n != 1:
    raise SystemExit("likes source block not found")

path.write_text(s, encoding="utf-8")
print("News.tsx patched successfully")
