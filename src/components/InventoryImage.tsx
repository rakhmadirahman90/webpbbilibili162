import React, { useEffect, useState } from 'react';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
};

function dataUriToBlobUrl(dataUri: string): string | null {
  try {
    const comma = dataUri.indexOf(',');
    if (comma < 0) return null;
    const header = dataUri.slice(0, comma);
    const body = dataUri.slice(comma + 1);
    const mime = header.match(/^data:([^;,]+)/i)?.[1] || 'application/octet-stream';
    const isBase64 = /;base64/i.test(header);
    const bytes = isBase64
      ? Uint8Array.from(atob(body), char => char.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(body));
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch (error) {
    console.error('Gagal mengubah data URI inventaris menjadi Blob URL:', error);
    return null;
  }
}

export default function InventoryImage({ src, alt, className = '', onError }: Props) {
  const raw = (src || '').trim();
  const [resolvedSrc, setResolvedSrc] = useState('');

  useEffect(() => {
    let objectUrl: string | null = null;
    if (!raw) {
      setResolvedSrc('');
      return;
    }

    if (raw.startsWith('data:image/')) {
      objectUrl = dataUriToBlobUrl(raw);
      setResolvedSrc(objectUrl || raw);
    } else {
      setResolvedSrc(raw);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [raw]);

  if (!resolvedSrc) return null;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      className={className}
    />
  );
}
