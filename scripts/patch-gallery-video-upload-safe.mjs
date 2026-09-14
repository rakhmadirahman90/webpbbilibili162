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

  s = s.replace(
    /const VIDEO_MAX_SIZE\s*=\s*15\s*\*\s*1024\s*\*\s*1024\s*;/,
    "const VIDEO_MAX_SOURCE_SIZE = MEDIA_POLICY.video.maxSourceBytes;\nconst VIDEO_MAX_RESULT_SIZE = MEDIA_POLICY.video.maxBytes;"
  );

  const legacyVideoGuard = /\}\s*else if\s*\(file\.size\s*>\s*VIDEO_MAX_SIZE\)\s*\{\s*failed\.push\(`\$\{file\.name\}:\s*melebihi\s*15MB`\);\s*continue;\s*\}/m;
  if (legacyVideoGuard.test(s)) {
    s = s.replace(
      legacyVideoGuard,
      `} else {
          if (file.size > VIDEO_MAX_SOURCE_SIZE) { failed.push(\`${'${file.name}'}: melebihi 250MB\`); continue; }
          try {
            uploadFile = await compressMediaFile(file);
          } catch (compressionError: any) {
            failed.push(\`${'${file.name}'}: kompresi video gagal\`);
            console.error('Gallery video compression error', compressionError);
            continue;
          }
          if (uploadFile.size > VIDEO_MAX_RESULT_SIZE) {
            failed.push(\`${'${file.name}'}: hasil kompresi masih >25MB\`);
            continue;
          }
        }`
    );
  }

  // Safety net: never leave a runtime reference to the removed legacy constant.
  s = s.replace(/VIDEO_MAX_SIZE/g, 'VIDEO_MAX_RESULT_SIZE');

  if (!s.includes('data-media-local-handler="true"')) {
    s = s.replace(
      '<input ref={fileInputRef}',
      '<input data-media-local-handler="true" ref={fileInputRef}'
    );
  }

  fs.writeFileSync(galleryPath, s);
  console.log('[patch-gallery-video-upload-safe] AdminGallery video compression + legacy VIDEO_MAX_SIZE guard fixed.');
} else {
  console.warn('[patch-gallery-video-upload-safe] AdminGallery.tsx not found; skipped.');
}

if (fs.existsSync(mediaPath)) {
  let s = fs.readFileSync(mediaPath, 'utf8');
  s = s.replace(
    "    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;\n    if ((input as any).__pbMediaRedispatch) return;",
    "    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;\n    if ((input as any).__pbMediaRedispatch) return;\n    if (input.dataset.mediaLocalHandler === 'true') return;"
  );
  s = s.replace(
    "      recorder.start(1000);\n    draw();\n    await video.play();\n    await new Promise<void>(resolve => {\n      video.onended = () => resolve();\n    });",
    "      const ended = new Promise<void>(resolve => {\n        video.onended = () => resolve();\n      });\n      recorder.start(1000);\n      await video.play();\n      const drawWhilePlaying = () => {\n        if (video.ended) return;\n        ctx.drawImage(video, 0, 0, outWidth, outHeight);\n        requestAnimationFrame(drawWhilePlaying);\n      };\n      drawWhilePlaying();\n      await ended;"
  );
  fs.writeFileSync(mediaPath, s);
  console.log('[patch-gallery-video-upload-safe] MediaRecorder video frame loop fixed.');
} else {
  console.warn('[patch-gallery-video-upload-safe] mediaCompression.ts not found; skipped.');
}
