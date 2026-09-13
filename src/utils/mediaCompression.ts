import imageCompression from 'browser-image-compression';

/**
 * PB Bilibili 162 media-storage policy.
 * Images are normalized to WebP and videos are re-encoded with MediaRecorder
 * before any upload handler receives the File. This keeps the stored original
 * small while retaining practical web/mobile quality.
 */
export const MEDIA_POLICY = {
  image: { maxSourceBytes: 60 * 1024 * 1024, maxBytes: 2 * 1024 * 1024, maxDimension: 2400, quality: 0.84 },
  video: { maxSourceBytes: 250 * 1024 * 1024, maxBytes: 25 * 1024 * 1024, maxWidth: 1280, maxHeight: 720, videoBitsPerSecond: 1_400_000, lowVideoBitsPerSecond: 900_000, audioBitsPerSecond: 64_000, fps: 30 },
} as const;

const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

export function isImageFile(file: File) {
  return file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif';
}

export function isVideoFile(file: File) {
  return file.type.startsWith('video/');
}

async function compressImage(file: File): Promise<File> {
  if (!isImageFile(file)) return file;
  if (file.size > MEDIA_POLICY.image.maxSourceBytes) throw new Error(`${file.name}: ukuran foto sumber melebihi 60 MB.`);

  let result = await imageCompression(file, {
    maxSizeMB: MEDIA_POLICY.image.maxBytes / (1024 * 1024),
    maxWidthOrHeight: MEDIA_POLICY.image.maxDimension,
    initialQuality: MEDIA_POLICY.image.quality,
    fileType: 'image/webp',
    useWebWorker: false,
    preserveExif: false,
  });

  if (result.size > MEDIA_POLICY.image.maxBytes) {
    result = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2048,
      initialQuality: 0.76,
      fileType: 'image/webp',
      useWebWorker: false,
      preserveExif: false,
    });
  }

  if (result.size > MEDIA_POLICY.image.maxBytes) {
    result = await imageCompression(file, {
      maxSizeMB: 1.0,
      maxWidthOrHeight: 1800,
      initialQuality: 0.68,
      fileType: 'image/webp',
      useWebWorker: false,
      preserveExif: false,
    });
  }

  const base = file.name.replace(/\.[^/.]+$/, '') || 'foto';
  return new File([result], `${base}.webp`, { type: 'image/webp', lastModified: Date.now() });
}

function pickVideoMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

async function recordVideo(file: File, videoBitsPerSecond: number): Promise<File> {
  const mime = pickVideoMime();
  if (!mime) throw new Error('Browser tidak mendukung kompresi video otomatis. Gunakan Chrome/Edge/Firefox terbaru.');

  const video = document.createElement('video');
  const sourceUrl = URL.createObjectURL(file);
  video.src = sourceUrl;
  video.preload = 'metadata';
  video.muted = false;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Video tidak dapat dibaca oleh browser.'));
      video.load();
    });

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const scale = Math.min(1, MEDIA_POLICY.video.maxWidth / width, MEDIA_POLICY.video.maxHeight / height);
    let outWidth = Math.max(2, Math.round(width * scale));
    let outHeight = Math.max(2, Math.round(height * scale));
    if (outWidth % 2) outWidth -= 1;
    if (outHeight % 2) outHeight -= 1;

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas video tidak tersedia.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const canvasStream = canvas.captureStream(MEDIA_POLICY.video.fps);
    const sourceStream = typeof video.captureStream === 'function' ? video.captureStream() : null;
    if (sourceStream) {
      sourceStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
    }

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: mime,
      videoBitsPerSecond,
      audioBitsPerSecond: MEDIA_POLICY.video.audioBitsPerSecond,
    });

    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => reject(new Error('Kompresi video gagal.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    });

    const draw = () => {
      if (video.ended || video.paused && video.currentTime > 0) return;
      ctx.drawImage(video, 0, 0, outWidth, outHeight);
      requestAnimationFrame(draw);
    };

    recorder.start(1000);
    draw();
    await video.play();
    await new Promise<void>(resolve => {
      video.onended = () => resolve();
    });
    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await finished;

    const extension = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    const base = file.name.replace(/\.[^/.]+$/, '') || 'video';
    return new File([blob], `${base}-compressed.${extension}`, { type: blob.type, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
    video.removeAttribute('src');
    video.load();
  }
}

export async function compressVideo(file: File): Promise<File> {
  if (!isVideoFile(file)) return file;
  if (file.size > MEDIA_POLICY.video.maxSourceBytes) throw new Error(`${file.name}: ukuran video sumber melebihi 250 MB.`);

  const first = await recordVideo(file, MEDIA_POLICY.video.videoBitsPerSecond);
  if (first.size <= MEDIA_POLICY.video.maxBytes) return first;

  const second = await recordVideo(file, MEDIA_POLICY.video.lowVideoBitsPerSecond);
  if (second.size <= MEDIA_POLICY.video.maxBytes) return second;

  throw new Error(`${file.name}: hasil kompresi masih lebih dari 25 MB. Pilih video yang lebih singkat.`);
}

export async function compressMediaFile(file: File): Promise<File> {
  if (isImageFile(file)) return compressImage(file);
  if (isVideoFile(file)) return compressVideo(file);
  return file;
}

export async function compressMediaFiles(files: File[]): Promise<File[]> {
  const output: File[] = [];
  for (const file of files) {
    output.push(await compressMediaFile(file));
    await sleep(0);
  }
  return output;
}

/**
 * Global upload guard: intercepts native file-input change events, compresses
 * photos/videos, then redispatches the event with the compressed FileList.
 * Non-media files (PDF/DOC/etc.) pass through untouched.
 */
export function installGlobalMediaCompression() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if ((window as any).__pbMediaCompressionInstalled) return;
  (window as any).__pbMediaCompressionInstalled = true;

  const handleChange = (event: Event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if ((input as any).__pbMediaRedispatch) return;

    const files = Array.from(input.files || []);
    if (!files.some(file => isImageFile(file) || isVideoFile(file))) return;

    event.preventDefault();
    event.stopPropagation();
    try { (event as any).stopImmediatePropagation?.(); } catch {}
    input.dataset.mediaCompressing = 'true';

    void compressMediaFiles(files).then(compressed => {
      try {
        const transfer = new DataTransfer();
        compressed.forEach(file => transfer.items.add(file));
        input.files = transfer.files;
        (input as any).__pbMediaRedispatch = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        delete (input as any).__pbMediaRedispatch;
      } catch (error) {
        console.error('[media-compression] failed to replace FileList', error);
        window.alert('File foto/video tidak dapat diproses otomatis. Silakan pilih file kembali.');
      } finally {
        delete input.dataset.mediaCompressing;
      }
    }).catch(error => {
      console.error('[media-compression] upload blocked because compression failed', error);
      delete input.dataset.mediaCompressing;
      window.alert(error instanceof Error ? error.message : 'Kompresi foto/video gagal.');
    });
  };

  document.addEventListener('change', handleChange, true);
}
