import React, { useMemo, useState } from 'react';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
};

function normalizeImageSource(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (!raw.toLowerCase().startsWith('data:image/')) return raw;
  const comma = raw.indexOf(',');
  if (comma < 0) return raw;
  const header = raw.slice(0, comma);
  const body = raw.slice(comma + 1);
  if (/;base64/i.test(header)) return raw;
  const mime = header.match(/^data:([^;,]+)/i)?.[1]?.toLowerCase() || '';
  if (mime !== 'image/svg+xml') return raw;
  try {
    const decoded = decodeURIComponent(body);
    let encoded = '';
    try {
      encoded = btoa(decoded);
    } catch {
      encoded = btoa(unescape(encodeURIComponent(decoded)));
    }
    return `data:image/svg+xml;base64,${encoded}`;
  } catch (error) {
    console.error('Gagal menormalisasi gambar SVG inventaris:', error);
    return raw;
  }
}

export default function InventoryImage({ src, alt, className = '', onError }: Props) {
  const raw = (src || '').trim();
  const normalized = useMemo(() => normalizeImageSource(raw), [raw]);
  const [failed, setFailed] = useState(false);
  if (!normalized || failed) return null;
  return (
    <img
      src={normalized}
      alt={alt}
      loading="eager"
      decoding="sync"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
      className={className}
    />
  );
}
