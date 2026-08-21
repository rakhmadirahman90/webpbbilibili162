import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/components/AdminGallery.tsx');
let source = fs.readFileSync(filePath, 'utf8');

const fetchReplacement = `  const fetchGallery = async () => {
    setLoading(true);
    try {
      // Supabase is the single source of truth for the admin gallery.
      // Do not prefer gallery_list/localStorage because those may contain
      // stale legacy/demo records that are not in the gallery table.
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      setItems(rows);
      localStorage.setItem('gallery_local', JSON.stringify(rows));
    } catch (error) {
      console.error('Failed to load gallery from Supabase', error);
      try {
        const cached = JSON.parse(localStorage.getItem('gallery_local') || '[]');
        setItems(Array.isArray(cached) ? cached : []);
      } catch {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };
`;

const saveReplacement = `  const saveItems = async (next: GalleryItem[], action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
    // Supabase is the persistent source of truth. Never insert the temporary
    // client-side ID (gal_...) because gallery.id is PostgreSQL UUID.
    let persistedItems = next;

    if (action === 'INSERT') {
      const { data, error } = await supabase
        .from('gallery')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Data galeri tidak dikembalikan oleh Supabase.');
      persistedItems = [data as GalleryItem, ...next.slice(1)];
    } else if (action === 'UPDATE') {
      const { id, ...changes } = payload;
      const { error } = await supabase.from('gallery').update(changes).eq('id', id);
      if (error) throw error;
    } else if (action === 'DELETE') {
      const id = payload?.id;
      if (!id) throw new Error('ID galeri tidak ditemukan untuk dihapus.');
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) throw error;
    }

    setItems(persistedItems);
    localStorage.setItem('gallery_local', JSON.stringify(persistedItems));
    broadcastDataChange('gallery', action, action === 'INSERT' ? persistedItems[0] : payload);
  };
`;

const fetchPattern = /  const fetchGallery = async \(\) => \{[\s\S]*?\n  \};\n\n  useEffect\(\(\) => \{/;
if (!fetchPattern.test(source)) throw new Error('patch-gallery-supabase-source: fetchGallery block not found');
source = source.replace(fetchPattern, `${fetchReplacement}\n  useEffect(() => {`);

const savePattern = /  const saveItems = async \(next: GalleryItem\[\], action: 'INSERT' \| 'UPDATE' \| 'DELETE', payload: any\) => \{[\s\S]*?\n  \};\n\n  const handleSubmit/;
if (!savePattern.test(source)) throw new Error('patch-gallery-supabase-source: saveItems block not found');
source = source.replace(savePattern, `${saveReplacement}\n  const handleSubmit`);

fs.writeFileSync(filePath, source);
console.log('Patched AdminGallery: Supabase source of truth + UUID-safe inserts.');
