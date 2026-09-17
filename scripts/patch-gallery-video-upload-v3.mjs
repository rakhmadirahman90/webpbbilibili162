import fs from 'node:fs';

const mediaPath = 'src/utils/mediaCompression.ts';
const galleryPath = 'src/components/AdminGallery.tsx';

if (!fs.existsSync(mediaPath)) {
  console.warn('[patch-gallery-video-upload-v3] mediaCompression.ts not found; media patch skipped.');
} else {
  let s = fs.readFileSync(mediaPath, 'utf8');
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
    return new File([blob], \`${base}-compressed.${extension}\`, { type: blob.type, lastModified: Date.now() });
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

  s = s.replace(/maxBytes:\s*15\s*\*\s*1024\s*\*\s*1024/g, 'maxBytes: 30 * 1024 * 1024');
  s = s.replace(/video lebih dari 15 MB/g, 'video lebih dari 30 MB');
  s = s.replace(/di bawah 15 MB/g, 'di bawah 30 MB');

  fs.writeFileSync(mediaPath, s);
  console.log('[patch-gallery-video-upload-v3] video media policy normalized to 30 MB.');
}

if (fs.existsSync(galleryPath)) {
  let s = fs.readFileSync(galleryPath, 'utf8');
  s = s.replace(/const VIDEO_MAX_SIZE = 15 \* 1024 \* 1024;/g, 'const VIDEO_MAX_SIZE = 30 * 1024 * 1024;');
  s = s.replace(/melebihi 15MB/g, 'melebihi 30MB');
  s = s.replace(/Maksimal 15MB/g, 'Maksimal 30MB');

  const marker = 'PB_GALLERY_VIDEO_THUMBNAIL_V1';
  if (!s.includes(marker)) {
    s = s.replace(
      "const joinMediaUrls = (urls: string[]) => urls.filter(Boolean).join(', ');",
      `const joinMediaUrls = (urls: string[]) => urls.filter(Boolean).join(', ');\n\n// ${marker}: create a real first-frame poster for uploaded videos so WhatsApp/social\n// previews use the video image instead of the club logo fallback.\nconst createVideoThumbnail = async (source: File | string): Promise<Blob | null> => {\n  const video = document.createElement('video');\n  const objectUrl = source instanceof File ? URL.createObjectURL(source) : '';\n  video.src = objectUrl || String(source);\n  video.preload = 'metadata';\n  video.muted = true;\n  video.playsInline = true;\n  video.crossOrigin = 'anonymous';\n  try {\n    await new Promise<void>((resolve, reject) => {\n      const done = () => { cleanup(); resolve(); };\n      const fail = () => { cleanup(); reject(new Error('Video tidak dapat dibaca untuk membuat preview.')); };\n      const cleanup = () => { video.removeEventListener('loadedmetadata', done); video.removeEventListener('error', fail); };\n      video.addEventListener('loadedmetadata', done, { once: true });\n      video.addEventListener('error', fail, { once: true });\n      video.load();\n    });\n    if (!video.videoWidth || !video.videoHeight) return null;\n    const duration = Number.isFinite(video.duration) ? video.duration : 0;\n    const target = duration > 0.2 ? Math.min(0.2, duration / 10) : 0;\n    if (target > 0) {\n      await new Promise<void>((resolve) => {\n        const onSeek = () => { video.removeEventListener('seeked', onSeek); resolve(); };\n        video.addEventListener('seeked', onSeek, { once: true });\n        video.currentTime = target;\n      });\n    }\n    const maxWidth = 1280;\n    const scale = Math.min(1, maxWidth / video.videoWidth);\n    const canvas = document.createElement('canvas');\n    canvas.width = Math.max(2, Math.round(video.videoWidth * scale));\n    canvas.height = Math.max(2, Math.round(video.videoHeight * scale));\n    const ctx = canvas.getContext('2d', { alpha: false });\n    if (!ctx) return null;\n    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);\n    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));\n  } catch (error) {\n    console.warn('[gallery-thumbnail] failed', error);\n    return null;\n  } finally {\n    try { video.pause(); } catch {}\n    if (objectUrl) URL.revokeObjectURL(objectUrl);\n    video.removeAttribute('src');\n    try { video.load(); } catch {}\n  }\n};\n\nconst uploadVideoThumbnail = async (blob: Blob, baseId: string) => {\n  const path = \`uploads/\${baseId}-thumb.jpg\`;\n  const file = new File([blob], \`\${baseId}-thumb.jpg\`, { type: 'image/jpeg', lastModified: Date.now() });\n  const result = await uploadGalleryFile(file, path);\n  if (result.error) return '';\n  return supabase.storage.from('gallery').getPublicUrl(path).data?.publicUrl || '';\n};`
    );

    s = s.replace(
      "  is_local?: boolean;\n}",
      "  is_local?: boolean;\n  thumbnail_url?: string;\n}"
    );

    s = s.replace(
      "  const [videoInputMethod, setVideoInputMethod] = useState<'link' | 'file'>('file');",
      "  const [videoInputMethod, setVideoInputMethod] = useState<'link' | 'file'>('file');\n  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('');"
    );

    s = s.replace(
      "    setPreviewIndex(0);\n    setEditingId(null);",
      "    setPreviewIndex(0);\n    setVideoThumbnailUrl('');\n    setEditingId(null);"
    );

    s = s.replace(
      "      is_local: item.is_local ?? true\n    });",
      "      is_local: item.is_local ?? true\n    });\n    setVideoThumbnailUrl(item.thumbnail_url || '');"
    );

    s = s.replace(
      "      const uploaded: string[] = [];\n      const failed: string[] = [];",
      "      const uploaded: string[] = [];\n      const uploadedThumbnails: string[] = [];\n      const failed: string[] = [];"
    );

    s = s.replace(
      "        const { data } = supabase.storage.from('gallery').getPublicUrl(path);\n        if (data?.publicUrl) uploaded.push(data.publicUrl);",
      `        const { data } = supabase.storage.from('gallery').getPublicUrl(path);\n        if (data?.publicUrl) {\n          uploaded.push(data.publicUrl);\n          if (!expectedImage) {\n            try {\n              const thumbBlob = await createVideoThumbnail(uploadFile);\n              if (thumbBlob) {\n                const thumbUrl = await uploadVideoThumbnail(thumbBlob, id);\n                if (thumbUrl) uploadedThumbnails.push(thumbUrl);\n              }\n            } catch (thumbError) {\n              console.warn('[gallery-thumbnail] upload failed', thumbError);\n            }\n          }\n        }`
    );

    s = s.replace(
      "          setFormData(prev => ({ ...prev, url: uploaded[0], is_local: true }));\n          showToast('Video berhasil diunggah');",
      "          setVideoThumbnailUrl(uploadedThumbnails[0] || '');\n          setFormData(prev => ({ ...prev, url: uploaded[0], is_local: true }));\n          showToast(uploadedThumbnails[0] ? 'Video & preview berhasil diunggah' : 'Video berhasil diunggah');"
    );

    s = s.replace(
      "    const payload = {\n      title: formData.title.trim(),",
      "    let finalThumbnailUrl = videoThumbnailUrl;\n    if (formData.type === 'video' && videoInputMethod === 'file' && !finalThumbnailUrl && finalUrl) {\n      try {\n        const thumbBlob = await createVideoThumbnail(finalUrl);\n        if (thumbBlob) finalThumbnailUrl = await uploadVideoThumbnail(thumbBlob, editingId || (crypto.randomUUID?.() || `gallery-${Date.now()}`));\n        if (finalThumbnailUrl) setVideoThumbnailUrl(finalThumbnailUrl);\n      } catch (thumbError) {\n        console.warn('[gallery-thumbnail] existing video poster generation failed', thumbError);\n      }\n    }\n\n    const payload = {\n      title: formData.title.trim(),"
    );

    s = s.replace(
      "      description: formData.description.trim(),\n      is_local: formData.type === 'image' ? true : videoInputMethod === 'file'\n    };",
      "      description: formData.description.trim(),\n      is_local: formData.type === 'image' ? true : videoInputMethod === 'file',\n      thumbnail_url: formData.type === 'video' ? (finalThumbnailUrl || null) : null\n    };"
    );

    s = s.replace(
      "        : [{ ...payload, id: `gal_${Date.now()}`, created_at: new Date().toISOString() } as GalleryItem, ...items];",
      "        : [{ ...payload, id: `gal_${Date.now()}`, created_at: new Date().toISOString() } as GalleryItem, ...items];"
    );

    fs.writeFileSync(galleryPath, s);
    console.log('[patch-gallery-video-upload-v3] real video first-frame thumbnail support enabled.');
  }
} else {
  console.warn('[patch-gallery-video-upload-v3] AdminGallery.tsx not found; gallery validation patch skipped.');
}
