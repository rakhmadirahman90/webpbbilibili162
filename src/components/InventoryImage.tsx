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
 * Inventory images can come from Supabase public URLs, Storage object paths,
 * or legacy data/blob URLs. Keep rendering as a normal <img>; mobile browsers
 * can reject an unnecessary fetch/blob conversion even when the original URL
 * is directly renderable.
 */
export default function InventoryImage({ src, alt, className = '', onError }: Props) {
  const raw = (src || '').trim();
  const [failed, setFailed] = useState(false);

  const imageUrl = useMemo(() => {
    if (!raw) return '';
    if (/^(https?:|data:|blob:|\/\/)/i.test(raw)) return raw;
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
