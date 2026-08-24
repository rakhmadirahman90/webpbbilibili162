import React, { useMemo, useState } from 'react';
import { supabase } from '../supabase';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
};

const BUCKET = 'uploads';

/**
 * Inventory images can come from three generations of data:
 * 1. Supabase public Storage URLs
 * 2. Storage object paths such as `inventaris/file.jpg`
 * 3. Legacy data/blob URLs already stored in the database.
 *
 * Do not fetch data/blob URLs and convert them to Blob URLs here. Mobile
 * browsers/CSP can reject that extra fetch even though a normal <img> can
 * render the original resource. Keep the rendering path as a plain <img>.
 */
export default function InventoryImage({ src, alt, className = '', onError }: Props) {
  const raw = (src || '').trim();
  const [failed, setFailed] = useState(false);

  const imageUrl = useMemo(() => {
    if (!raw) return '';
    if (/^(https?:|data:|blob:|//)/i.test(raw)) return raw;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(raw.replace(/^\/+/, ''));
    return data?.publicUrl || raw;
  }, [raw]);

  if (!imageUrl || failed) return null;

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="eager"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
      className={className}
    />
  );
}
