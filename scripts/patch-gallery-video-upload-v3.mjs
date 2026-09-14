import fs from 'node:fs';

const galleryPath = 'src/components/AdminGallery.tsx';
const mediaPath = 'src/utils/mediaCompression.ts';

if (fs.existsSync(galleryPath)) {
  let s = fs.readFileSync(galleryPath, 'utf8');
  if (!s.includes("import { compressMediaFile, MEDIA_POLICY } from '../utils/mediaCompression';")) {
    s = s.replace(
      "import imageCompression from 'browser-image-compression';",
      "import imageCompression from 'browser-image-compression';\nimport { compressMediaFile, MEDIA_POLICY } from '../utils/mediaCompression';"
    );
  }
  s = s.replace("const VIDEO_MAX_SIZE = 15 * 1024 * 1024;", "const VIDEO_MAX_SOURCE_SIZE = MEDIA_POLICY.video.maxSourceBytes;\nconst VIDEO_MAX_RESULT_SIZE = MEDIA_POLICY.video.maxBytes;");
  s = s.replace(/\n\s*\} else if \(file\.size > VIDEO_MAX_SIZE\) \{\n\s*failed\.push\(`\$\{file\.name\}: melebihi 15MB`\);\n\s*continue;\n\s*\}/, `\n        } else {\n          if (file.size > VIDEO_MAX_SOURCE_SIZE) { failed.push(\`\\${file.name}: melebihi 250MB\`); continue; }\n          try { uploadFile = await compressMediaFile(file); }\n          catch (error: any) { console.error('Gallery video compression error', error); failed.push(\`\\${file.name}: kompresi video gagal — \\${error?.message || 'format tidak didukung'}\`); continue; }\n          if (uploadFile.size > VIDEO_MAX_RESULT_SIZE) { failed.push(\`\\${file.name}: hasil kompresi masih >25MB\`); continue; }\n        }`);
  s = s.replace('<input ref={fileInputRef}', '<input data-media-local-handler="true" ref={fileInputRef}');
  s = s.replace('showToast(\'Video berhasil diunggah\');', 'showToast(`Video berhasil diproses & diunggah (${(uploadFileSizeLabel(uploaded[0]))})`);');
  if (!s.includes('function uploadFileSizeLabel')) {
    s = s.replace("export default function AdminGallery", "const uploadFileSizeLabel = (_url: string) => 'video terkompresi';\n\nexport default function AdminGallery");
  }
  fs.writeFileSync(galleryPath, s);
  console.log('[patch-gallery-video-upload-v3] AdminGallery now compresses video before upload.');
}

if (fs.existsSync(mediaPath)) {
  let s = fs.readFileSync(mediaPath, 'utf8');
  const start = s.indexOf('async function recordVideo(');
  const end = s.indexOf('\nexport async function compressVideo', start);
  if (start >= 0 && end > start) {
    const replacement = String.raw`async function recordVideo(file: File, videoBitsPerSecond: number): Promise<File> {
  const mime = pickVideoMime();
  if (!mime) throw new Error('Perangkat/browser ini belum mendukung kompresi video otomatis. Gunakan Chrome/Edge/Firefox terbaru.');

  const video = document.createElement('video');
  const sourceUrl = URL.createObjectURL(file);
  video.src = sourceUrl;
  video.preload = 'auto';
  video.muted = false;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Format video tidak dapat dibaca oleh browser.'));
      video.load();
    });

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const scale = Math.min(1, MEDIA_POLICY.video.maxWidth / width, MEDIA_POLICY.video.maxHeight / height);
    let outWidth = Math.max(2, Math.floor(width * scale));
    let outHeight = Math.max(2, Math.floor(height * scale));
    if (outWidth % 2) outWidth -= 1;
    if (outHeight % 2) outHeight -= 1;

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas video tidak tersedia pada browser.');

    const canvasStream = canvas.captureStream(MEDIA_POLICY.video.fps);
    const sourceStream = typeof video.captureStream === 'function' ? video.captureStream() : null;
    if (sourceStream) {
      for (const track of sourceStream.getAudioTracks()) canvasStream.addTrack(track);
    }

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: mime,
      videoBitsPerSecond,
      audioBitsPerSecond: MEDIA_POLICY.video.audioBitsPerSecond,
    });

    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onerror = () => reject(new Error('MediaRecorder gagal memproses video.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    });

    let raf = 0;
    const draw = () => {
      if (video.ended) return;
      ctx.drawImage(video, 0, 0, outWidth, outHeight);
      raf = requestAnimationFrame(draw);
    };

    await video.play();
    ctx.drawImage(video, 0, 0, outWidth, outHeight);
    recorder.start(1000);
    raf = requestAnimationFrame(draw);
    await new Promise<void>(resolve => { video.onended = () => resolve(); });
    cancelAnimationFrame(raf);
    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await finished;
    if (!blob.size) throw new Error('Video hasil kompresi kosong.');

    const extension = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    const base = file.name.replace(/\.[^/.]+$/, '') || 'video';
    return new File([blob], `${base}-compressed.${extension}`, { type: blob.type, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
    video.pause();
    video.removeAttribute('src');
    video.load();
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
  console.log('[patch-gallery-video-upload-v3] MediaRecorder pipeline hardened.');
}
