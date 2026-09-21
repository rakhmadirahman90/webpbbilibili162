import React, { useEffect, useState } from 'react';

interface VideoThumbnailProps {
  src: string;
  alt?: string;
  thumbnailUrl?: string;
  className?: string;
  objectPosition?: string;
}

const getYouTubeId = (url: string) => {
  const match = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^#&?\s]+)/i);
  return match?.[1]?.length === 11 ? match[1] : null;
};

const captureFrame = (video: HTMLVideoElement, time: number, width = 720) => {
  return new Promise<{ data: string; score: number } | null>((resolve) => {
    const canvas = document.createElement('canvas');
    const ratio = video.videoWidth && video.videoHeight ? video.videoHeight / video.videoWidth : 9 / 16;
    canvas.width = width;
    canvas.height = Math.max(1, Math.round(width * ratio));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return resolve(null);

    const finish = () => {
      video.removeEventListener('seeked', finish);
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const sample = ctx.getImageData(0, 0, Math.min(canvas.width, 180), Math.min(canvas.height, 100)).data;
        let sum = 0;
        let count = 0;
        for (let i = 0; i < sample.length; i += 16) {
          const r = sample[i] || 0;
          const g = sample[i + 1] || 0;
          const b = sample[i + 2] || 0;
          sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          count++;
        }
        resolve({ data: canvas.toDataURL('image/jpeg', 0.86), score: count ? sum / count : 0 });
      } catch {
        resolve(null);
      }
    };

    video.addEventListener('seeked', finish, { once: true });
    try {
      video.currentTime = Math.max(0, Math.min(time, Math.max(0, (video.duration || 1) - 0.05)));
    } catch {
      video.removeEventListener('seeked', finish);
      resolve(null);
    }
  });
};

export default function VideoThumbnail({
  src,
  alt = 'Video PB BILIBILI 162',
  thumbnailUrl = '',
  className = '',
  objectPosition = 'center',
}: VideoThumbnailProps) {
  const youtubeId = getYouTubeId(src);
  const [poster, setPoster] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPoster('');
    setVideoFailed(false);

    if (youtubeId) {
      const url = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
      const probe = new Image();
      probe.onload = () => { if (!cancelled) setPoster(url); };
      probe.onerror = () => {};
      probe.referrerPolicy = 'no-referrer';
      probe.src = url;
      return () => { cancelled = true; probe.onload = null; probe.onerror = null; };
    }

    // Jangan gunakan thumbnail_url lama yang bisa menunjuk ke file yang sudah
    // tidak ada. Untuk MP4 Supabase, gunakan frame video secara langsung agar
    // preview selalu menampilkan isi video.
    if (thumbnailUrl && /^https?:\\/\\//i.test(thumbnailUrl)) {
      const probe = new Image();
      probe.onload = () => { if (!cancelled) setPoster(thumbnailUrl); };
      probe.onerror = () => {};
      probe.referrerPolicy = 'no-referrer';
      probe.src = thumbnailUrl;
    }

    return () => { cancelled = true; };
  }, [src, thumbnailUrl, youtubeId]);

  if (poster) {
    return (
      <img
        src={poster}
        alt={alt}
        className={className}
        style={{ objectPosition }}
        loading="eager"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          setPoster('');
        }}
      />
    );
  }

  if (!src || videoFailed) {
    return (
      <div className={`grid h-full w-full place-items-center bg-zinc-900 text-zinc-500 ${className}`} aria-label={alt}>
        Video tidak dapat dimuat
      </div>
    );
  }

  return (
    <video
      src={src}
      muted
      autoPlay
      loop
      playsInline
      preload="auto"
      className={className}
      style={{ objectPosition }}
      aria-label={alt}
      onError={() => setVideoFailed(true)}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        try {
          const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
          video.currentTime = Math.min(Math.max(duration * 0.12, 0.4), Math.max(duration - 0.05, 0.4));
        } catch {}
        video.play().catch(() => {});
      }}
    />
  );
}
