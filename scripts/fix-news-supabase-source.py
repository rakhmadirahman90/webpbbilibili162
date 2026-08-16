from pathlib import Path
import re

path = Path("src/components/News.tsx")
s = path.read_text(encoding="utf-8")

# Remove the local news dataset import. Supabase public.berita is the only news source.
s = s.replace("import { DEFAULT_BERITA, DEFAULT_KOMENTAR } from '../data/localDatabase';", "import { DEFAULT_KOMENTAR } from '../data/localDatabase';")

# Remove hard-coded/remote image fallbacks. Only gambar_url stored on public.berita is used.
image_pattern = re.compile(
    r"  // Helper untuk mendapatkan semua gambar dari berita\n  const getNewsImages = \(news: Berita\): string\[\] => \{.*?\n  \};\n",
    re.S,
)
image_replacement = """  // public.berita.gambar_url is the only source for article images.\n  const getNewsImages = (news: Berita): string[] => {\n    if (!news.gambar_url) return [];\n    return news.gambar_url\n      .split(/[\\s,]+/)\n      .map(u => u.trim())\n      .filter(Boolean);\n  };\n\n"""
s, n = image_pattern.subn(image_replacement, s, count=1)
if n != 1:
    raise SystemExit("getNewsImages block not found")

# Replace fetchNews so it never reads localStorage, DEFAULT_BERITA, or other fallback sources.
fetch_pattern = re.compile(
    r"  const fetchNews = async \(\) => \{.*?\n  \};\n\n  const fetchComments = async",
    re.S,
)
fetch_replacement = """  const fetchNews = async () => {\n    try {\n      setLoading(true);\n\n      const { data, error } = await supabase\n        .from('berita')\n        .select('id, judul, ringkasan, konten, kategori, gambar_url, tanggal, created_at, likes, views')\n        .order('tanggal', { ascending: false })\n        .order('created_at', { ascending: false });\n\n      if (error) throw error;\n\n      const formattedData = (data || []).map(item => ({\n        ...item,\n        ringkasan: item.ringkasan ?? '',\n        konten: item.konten ?? '',\n        kategori: item.kategori ?? '',\n        gambar_url: item.gambar_url ?? '',\n        likes: Number(item.likes) || 0,\n        views: Number(item.views) || 0,\n        comments_count: 0,\n      }));\n\n      // Reconcile comment counts separately; article content remains exclusively from public.berita.\n      const articleIds = formattedData.map(item => item.id);\n      if (articleIds.length > 0) {\n        const { data: commentRows } = await supabase\n          .from('komentar')\n          .select('berita_id');\n\n        const counts = new Map<string, number>();\n        (commentRows || []).forEach(row => {\n          if (row.berita_id) counts.set(row.berita_id, (counts.get(row.berita_id) || 0) + 1);\n        });\n        formattedData.forEach(item => {\n          item.comments_count = counts.get(item.id) || 0;\n        });\n      }\n\n      setBeritaList(formattedData as Berita[]);\n\n      // Keep the currently opened article synchronized with the fresh database snapshot.\n      setSelectedNews(prev => {\n        if (!prev) return prev;\n        const fresh = formattedData.find(item => item.id === prev.id);\n        return fresh ? (fresh as Berita) : null;\n      });\n    } catch (err) {\n      console.error('Gagal memuat berita langsung dari Supabase public.berita:', err);\n      setBeritaList([]);\n      setSelectedNews(null);\n    } finally {\n      setLoading(false);\n    }\n  };\n\n  const fetchComments = async"""
s, n = fetch_pattern.subn(fetch_replacement, s, count=1)
if n != 1:
    raise SystemExit("fetchNews block not found")

# Replace the article-open handler so the article is re-read from Supabase before display/view increment.
open_pattern = re.compile(
    r"  // PERBAIKAN UTAMA: Fungsi Open News & Update View Permanen ke Database\n  const handleOpenNews = async \(news: Berita\) => \{.*?\n  \};\n\n  const handleSubmitComment",
    re.S,
)
open_replacement = """  // Always open the canonical article row from Supabase, then persist the new view count.\n  const handleOpenNews = async (news: Berita) => {\n    try {\n      const { data: freshNews, error: readError } = await supabase\n        .from('berita')\n        .select('id, judul, ringkasan, konten, kategori, gambar_url, tanggal, created_at, likes, views')\n        .eq('id', news.id)\n        .single();\n\n      if (readError || !freshNews) throw readError || new Error('Berita tidak ditemukan di public.berita');\n\n      const currentViews = Number(freshNews.views) || 0;\n      const { data: updatedNews, error: updateError } = await supabase\n        .from('berita')\n        .update({ views: currentViews + 1 })\n        .eq('id', freshNews.id)\n        .select('id, judul, ringkasan, konten, kategori, gambar_url, tanggal, created_at, likes, views')\n        .single();\n\n      if (updateError || !updatedNews) throw updateError || new Error('Gagal memperbarui views berita');\n\n      const canonical = {\n        ...updatedNews,\n        ringkasan: updatedNews.ringkasan ?? '',\n        konten: updatedNews.konten ?? '',\n        kategori: updatedNews.kategori ?? '',\n        gambar_url: updatedNews.gambar_url ?? '',\n        likes: Number(updatedNews.likes) || 0,\n        views: Number(updatedNews.views) || 0,\n      } as Berita;\n\n      setSelectedNews(canonical);\n      setActiveImgIndex(0);\n      fetchComments(canonical.id);\n      setBeritaList(prev => prev.map(item => item.id === canonical.id ? { ...item, ...canonical } : item));\n    } catch (err) {\n      console.error('Gagal membuka berita dari Supabase:', err);\n      await fetchNews();\n    }\n  };\n\n  const handleSubmitComment"""
s, n = open_pattern.subn(open_replacement, s, count=1)
if n != 1:
    raise SystemExit("handleOpenNews block not found")

# Make likes read the canonical current value from Supabase before writing it back.
like_pattern = re.compile(
    r"    const newsItem = beritaList\.find\(n => n\.id === newsId\);\n    const currentLikes = Number\(newsItem\?\.likes\) \|\| 0;\n    let finalLikeCount = currentLikes;",
)
like_replacement = """    const { data: canonicalNews, error: canonicalReadError } = await supabase\n      .from('berita')\n      .select('likes')\n      .eq('id', newsId)\n      .single();\n\n    if (canonicalReadError || !canonicalNews) {\n      console.error('Gagal membaca likes canonical dari public.berita:', canonicalReadError);\n      await fetchNews();\n      return;\n    }\n\n    const currentLikes = Number(canonicalNews.likes) || 0;\n    let finalLikeCount = currentLikes;"""
s, n = like_pattern.subn(like_replacement, s, count=1)
if n != 1:
    raise SystemExit("likes source block not found")

path.write_text(s, encoding="utf-8")
print("News.tsx patched successfully")
