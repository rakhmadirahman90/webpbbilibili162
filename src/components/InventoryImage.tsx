import React, { useMemo, useState } from 'react';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
};

function decodeSvgDataUri(value: string): string | null {
  const raw = value.trim();
  if (!raw.toLowerCase().startsWith('data:image/svg+xml')) return null;
  const comma = raw.indexOf(',');
  if (comma < 0) return null;
  const header = raw.slice(0, comma).toLowerCase();
  const body = raw.slice(comma + 1);
  try {
    if (header.includes(';base64')) {
      return atob(body);
    }
    return decodeURIComponent(body);
  } catch (error) {
    console.error('Gagal membaca SVG inventaris dari Supabase:', error);
    return null;
  }
}

function sanitizeSvg(svgText: string): string {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg') return '';

    doc.querySelectorAll('script,foreignObject').forEach(node => node.remove());
    doc.querySelectorAll('*').forEach(node => {
      Array.from(node.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim().toLowerCase();
        if (name.startsWith('on') || value.startsWith('javascript:')) {
          node.removeAttribute(attr.name);
        }
      });
    });

    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    return new XMLSerializer().serializeToString(svg);
  } catch (error) {
    console.error('Gagal membersihkan SVG inventaris:', error);
    return '';
  }
}

export default function InventoryImage({ src, alt, className = '', onError }: Props) {
  const raw = (src || '').trim();
  const inlineSvg = useMemo(() => {
    const decoded = decodeSvgDataUri(raw);
    return decoded ? sanitizeSvg(decoded) : '';
  }, [raw]);
  const [failed, setFailed] = useState(false);

  if (!raw || failed) return null;

  // Supabase currently stores inventory artwork as data:image/svg+xml.
  // Render it inline instead of through <img src="data:..."> so Android
  // WebView/CSP restrictions cannot hide an otherwise valid SVG.
  if (inlineSvg) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        dangerouslySetInnerHTML={{ __html: inlineSvg }}
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      />
    );
  }

  return (
    <img
      src={raw}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
      className={className}
    />
  );
}
