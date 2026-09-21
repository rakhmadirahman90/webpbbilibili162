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
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPoster('');
    setPosterFailed(false);
    setVideoFailed(false);

    const direct = thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '');
    if (direct) {
      const probe = new Image();
      probe.onload = () => {
        if (!cancelled) setPoster(direct);
      };
      probe.onerror = () => {
        if (!cancelled) setPosterFailed(true);
      };
      probe.referrerPolicy = 'no-referrer';
      probe.src = direct;
      return () => { cancelled = true; probe.onload = null; probe.onerror = null; };
    }

    if (!src || youtubeId) return () => { cancelled = true; };

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const run = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          const ready = () => resolve();
          const fail = () => reject(new Error('video-load'));
          video.addEventListener('loadeddata', ready, { once: true });
          video.addEventListener('error', fail, { once: true });
          video.src = src;
          video.load();
        });

        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
        const candidates = [0.12, 0.28, 0.45, 0.62, 0.80].map(p =>
          Math.max(0, Math.min(duration - 0.05, duration * p))
        );
        const frames: { data: string; score: number }[] = [];
        for (const time of candidates) {
          const frame = await captureFrame(video, time);
          if (frame) frames.push(frame);
        }

        if (!cancelled && frames.length) {
          const best = frames.reduce((winner, current) => current.score > winner.score ? current : winner);
          setPoster(best.data);
        }
      } catch {
        // The visible video element below is the guaranteed fallback.
      } finally {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };

    run();
    return () => {
      cancelled = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
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
        onError={() => {
          setPoster('');
          setPosterFailed(true);
        }}
      />
    );
  }

  if (youtubeId) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt={alt}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
    );
  }

  if (!src || videoFailed) {
    return <div className={`grid h-full w-full place-items-center bg-zinc-900 text-zinc-500 ${className}`} aria-label={alt}>Video tidak dapat dimuat</div>;
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
      onLoadedData={(event) => {
        event.currentTarget.play().catch(() => {});
      }}
    />
  );
}
