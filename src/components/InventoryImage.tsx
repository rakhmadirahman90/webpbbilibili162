import React, { useEffect, useState } from 'react';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
};

/**
 * Supabase inventory records may contain data:image/* URIs, including
 * URL-encoded SVG. Android Chrome/WebView can refuse to paint these directly
 * in an <img> in some CSP/cache situations. Convert data URIs to Blob URLs
 * before rendering so the browser treats them as normal image resources.
 */
export default function InventoryImage({ src, alt, className = '', onError }: Props) {
  const raw = (src || '').trim();
  const [imageUrl, setImageUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setFailed(false);
    setImageUrl('');

    if (!raw) return () => { cancelled = true; };

    const load = async () => {
      try {
        if (/^data:image\//i.test(raw)) {
          const response = await fetch(raw);
          if (!response.ok) throw new Error(`Data image HTTP ${response.status}`);
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setImageUrl(objectUrl);
          return;
        }

        if (!cancelled) setImageUrl(raw);
      } catch (error) {
        console.error('Gagal memuat gambar inventaris:', error);
        if (!cancelled) {
          // Last fallback: let the browser try the original URI directly.
          setImageUrl(raw);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [raw]);

  if (!raw || failed || !imageUrl) return null;

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="eager"
      decoding="async"
      draggable={false}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
      className={className}
    />
  );
}
