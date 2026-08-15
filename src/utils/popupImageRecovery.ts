const CURRENT_PROJECT = 'missjyvqfehamtpyodjr';
const LEGACY_PROJECTS = ['jyyywgvaqbsltlxrisug'];
const STORAGE_RE = /https?:\/\/([^/]+)\/storage\/v1\/object\/public\/(.+)$/i;

function withCacheBust(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('popup_img_v', '2');
    return u.toString();
  } catch {
    return url;
  }
}

export function getPopupImageCandidates(url: string): string[] {
  const value = String(url || '').trim();
  if (!value) return [];
  const candidates: string[] = [value];
  const match = value.match(STORAGE_RE);
  if (match) {
    const path = match[2];
    candidates.push(`https://${CURRENT_PROJECT}.supabase.co/storage/v1/object/public/${path}`);
    for (const project of LEGACY_PROJECTS) {
      candidates.push(`https://${project}.supabase.co/storage/v1/object/public/${path}`);
    }
  }
  return [...new Set(candidates.map(withCacheBust))];
}

const PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
  <rect width="900" height="560" fill="#0f172a"/>
  <rect x="28" y="28" width="844" height="504" rx="24" fill="#111827" stroke="#334155"/>
  <text x="450" y="260" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="30" font-weight="700">GAMBAR POP-UP TIDAK TERSEDIA</text>
  <text x="450" y="305" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="20">Silakan edit dan unggah ulang poster.</text>
</svg>`)} `;

export function installPopupImageRecovery() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if ((window as any).__pb162PopupImageRecoveryInstalled) return;
  (window as any).__pb162PopupImageRecoveryInstalled = true;

  const recover = (img: HTMLImageElement) => {
    const original = img.getAttribute('data-popup-original-src') || img.currentSrc || img.src;
    if (!original || !/\/storage\/v1\/object\/public\//i.test(original)) return;

    const candidates = getPopupImageCandidates(original);
    const index = Number(img.getAttribute('data-popup-image-candidate') || '0');
    const next = index + 1;
    if (next < candidates.length) {
      img.setAttribute('data-popup-original-src', original);
      img.setAttribute('data-popup-image-candidate', String(next));
      img.src = candidates[next];
      return;
    }

    img.setAttribute('data-popup-image-failed', 'true');
    img.src = PLACEHOLDER;
  };

  const bind = (img: HTMLImageElement) => {
    if (img.dataset.popupRecoveryBound === 'true') return;
    img.dataset.popupRecoveryBound = 'true';
    const src = img.getAttribute('src');
    if (src && /\/storage\/v1\/object\/public\//i.test(src)) {
      img.setAttribute('data-popup-original-src', src);
      img.setAttribute('data-popup-image-candidate', '0');
      img.addEventListener('error', () => recover(img));
    }
  };

  const scan = () => document.querySelectorAll<HTMLImageElement>('img').forEach(bind);
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
