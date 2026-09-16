import fs from 'node:fs';

const mediaPath = 'src/utils/mediaCompression.ts';

if (!fs.existsSync(mediaPath)) {
  console.warn('[patch-gallery-video-upload-v3] mediaCompression.ts not found; skipped.');
  process.exit(0);
}

let s = fs.readFileSync(mediaPath, 'utf8');

// mediaCompression.ts is now canonical. Do not overwrite the mobile-safe
// implementation during every Vercel build.
const canonicalMarker = 'PB_MEDIA_COMPRESSION_V2';
const start = s.indexOf('async function recordVideo(');
const end = s.indexOf('\nexport async function compressVideo', start);

if (!s.includes(canonicalMarker) && start >= 0 && end > start) {
  const replacement = `async function recordVideo(file: File, videoBitsPerSecond: number): Promise<File> {
  const mime = pickVideoMime();
  if (!mime) throw new Error('Browser tidak mendukung kompresi video otomatis. Gunakan Chrome/Edge/Firefox terbaru.');

  const video = document.createElement('video');
  const sourceUrl = URL.createObjectURL(file);
  video.src = sourceUrl;
  video.preload = 'auto';
  video.muted = false;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const onMeta = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Video tidak dapat dibaca oleh browser.')); };
      const cleanup = () => { video.removeEventListener('loadedmetadata', onMeta); video.removeEventListener('error', onError); };
      video.addEventListener('loadedmetadata', onMeta, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.load();
    });

    if (!video.videoWidth || !video.videoHeight) throw new Error('Dimensi video tidak tersedia.');
    const width = video.videoWidth;
    const height = video.videoHeight;
    const scale = Math.min(1, MEDIA_POLICY.video.maxWidth / width, MEDIA_POLICY.video.maxHeight / height);
    let outWidth = Math.max(2, Math.round(width * scale));
    let outHeight = Math.max(2, Math.round(height * scale));
    if (outWidth % 2) outWidth -= 1;
    if (outHeight % 2) outHeight -= 1;

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx || typeof canvas.captureStream !== 'function') throw new Error('Browser tidak mendukung canvas video untuk kompresi otomatis.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const canvasStream = canvas.captureStream(MEDIA_POLICY.video.fps);
    const sourceStream = typeof (video as any).captureStream === 'function' ? (video as any).captureStream() : null;
    if (sourceStream) sourceStream.getAudioTracks().forEach((track: MediaStreamTrack) => canvasStream.addTrack(track));

    const recorder = new MediaRecorder(canvasStream, { mimeType: mime, videoBitsPerSecond, audioBitsPerSecond: MEDIA_POLICY.video.audioBitsPerSecond });
    const chunks: Blob[] = [];
    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = event => { if (event.data && event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => reject(new Error('Kompresi video gagal.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    });

    await video.play();
    ctx.drawImage(video, 0, 0, outWidth, outHeight);
    recorder.start(500);
    let raf = 0;
    const draw = () => {
      if (video.ended) return;
      try { ctx.drawImage(video, 0, 0, outWidth, outHeight); } catch {}
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    await new Promise<void>((resolve, reject) => {
      const onEnded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Video berhenti saat proses kompresi.')); };
      const cleanup = () => { video.removeEventListener('ended', onEnded); video.removeEventListener('error', onError); };
      video.addEventListener('ended', onEnded, { once: true });
      video.addEventListener('error', onError, { once: true });
    });

    cancelAnimationFrame(raf);
    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await finished;
    if (!blob.size) throw new Error('Browser menghasilkan video kosong. Video asli tidak dihapus.');

    const extension = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    const base = file.name.replace(/\\.[^/.]+$/, '') || 'video';
    return new File([blob], \`\${base}-compressed.\${extension}\`, { type: blob.type, lastModified: Date.now() });
  } finally {
    try { video.pause(); } catch {}
    URL.revokeObjectURL(sourceUrl);
    video.removeAttribute('src');
    try { video.load(); } catch {}
  }
}
`;
  s = s.slice(0, start) + replacement + s.slice(end);
}

const guard = "    if (input.dataset.mediaLocalHandler === 'true') return;";
if (!s.includes(guard)) {
  s = s.replace("    if ((input as any).__pbMediaRedispatch) return;", "    if ((input as any).__pbMediaRedispatch) return;\n" + guard);
}

fs.writeFileSync(mediaPath, s);
console.log('[patch-gallery-video-upload-v3] reliable MediaRecorder pipeline preserved safely.');
