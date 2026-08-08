import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from "../supabase";
import { saveSiteSetting, getSiteSetting } from "../utils/siteSettingsHelper";
import Swal from 'sweetalert2';
import { 
  Plus, Trash2, MoveUp, MoveDown, 
  Image as ImageIcon, RefreshCcw, 
  CheckCircle2, AlertCircle, Clock, Zap,
  Layers, Settings2, Edit3, X, ZoomIn, ZoomOut,
  RotateCw, Crop, Maximize2, Sparkles, Monitor,
  Gauge, HardDrive, Film, Video as VideoIcon, Play, Eye
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { isVideoUrl } from './Hero';

/**
 * Compresses a video file client-side using HTML5 Video, Canvas, and MediaRecorder API.
 * High-compression level (1-10) controls target bitrate and resolution scale.
 */
async function compressVideoFile(
  file: File,
  qualityLevel: number = 8,
  onProgress?: (progressText: string) => void
): Promise<{ videoBlob: Blob; posterBlob: Blob; fileExt: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        if (onProgress) onProgress('Mempersiapkan kompresi video...');
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
        await new Promise((res) => {
          const handler = () => { video.removeEventListener('seeked', handler); res(null); };
          video.addEventListener('seeked', handler);
          setTimeout(res, 500);
        });

        // 1. Generate Poster Thumbnail Frame
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const origW = video.videoWidth || 1280;
        const origH = video.videoHeight || 720;

        const targetW = Math.min(origW, 1920);
        const targetH = Math.round(targetW * (origH / origW));

        canvas.width = targetW;
        canvas.height = targetH;
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);
        }

        const posterBlob: Blob = await new Promise((res) =>
          canvas.toBlob((b) => res(b || new Blob()), 'image/webp', 0.85)
        );

        // Check MediaRecorder support
        const supportedType = typeof MediaRecorder !== 'undefined'
          ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
              ? 'video/webm;codecs=vp9'
              : MediaRecorder.isTypeSupported('video/webm')
              ? 'video/webm'
              : MediaRecorder.isTypeSupported('video/mp4')
              ? 'video/mp4'
              : '')
          : '';

        if (!supportedType) {
          URL.revokeObjectURL(videoUrl);
          return resolve({
            videoBlob: file,
            posterBlob,
            fileExt: file.name.split('.').pop() || 'mp4',
            mimeType: file.type || 'video/mp4',
          });
        }

        // Bitrate calculation based on qualityLevel (1-10)
        const targetBitrate = Math.round(500000 + (qualityLevel / 10) * 2500000);

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, {
          mimeType: supportedType,
          videoBitsPerSecond: targetBitrate,
        });

        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: supportedType.split(';')[0] });
          URL.revokeObjectURL(videoUrl);
          const ext = supportedType.includes('mp4') ? 'mp4' : 'webm';
          resolve({
            videoBlob: compressedBlob.size > 0 ? compressedBlob : file,
            posterBlob,
            fileExt: ext,
            mimeType: supportedType.split(';')[0],
          });
        };

        recorder.start(100);
        video.currentTime = 0;
        await video.play().catch(() => {});

        const duration = Math.min(video.duration || 10, 20); // Limit max 20s for hero slider
        const startTime = Date.now();

        const drawFrame = () => {
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed >= duration || video.ended || video.paused) {
            video.pause();
            if (recorder.state !== 'inactive') recorder.stop();
            return;
          }

          if (ctx) {
            ctx.drawImage(video, 0, 0, targetW, targetH);
          }

          if (onProgress) {
            const pct = Math.min(99, Math.round((elapsed / duration) * 100));
            onProgress(`Mengompresi video (${targetW}x${targetH} @ ~${Math.round(targetBitrate/1000)}kbps)... ${pct}%`);
          }

          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      } catch (err) {
        console.warn("MediaRecorder encoding fallback:", err);
        URL.revokeObjectURL(videoUrl);
        resolve({
          videoBlob: file,
          posterBlob: file,
          fileExt: file.name.split('.').pop() || 'mp4',
          mimeType: file.type || 'video/mp4',
        });
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error("Format file video tidak dapat dibaca oleh browser"));
    };
  });
}

const ASPECT_RATIO_PRESETS = [
  { label: 'Hero Banner (2.5 : 1)', value: 2.5 / 1, desc: 'Sesuai Hero Slider Published' },
  { label: 'Widescreen (16 : 9)', value: 16 / 9, desc: 'Standar Layar' },
  { label: 'Ultra-Wide (21 : 9)', value: 21 / 9, desc: 'Banner Sinematik' },
  { label: 'Standard Photo (4 : 3)', value: 4 / 3, desc: 'Foto Proporsional' },
];

const KelolaHero: React.FC = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [sliderSettings, setSliderSettings] = useState({
    duration: 6,
    effect: 'fade'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop & Zoom & Quality State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>(2.5 / 1); // Match landing page Hero
  const [qualityLevel, setQualityLevel] = useState<number>(8); // 1-10 Optimize Level
  const [estimatedSizeKb, setEstimatedSizeKb] = useState<number | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  useEffect(() => {
    fetchHeroData();

    const channel = supabase
      .channel('kelola_hero_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (!payload.new || payload.new.key === 'hero_config' || payload.old?.key === 'hero_config') {
          fetchHeroData();
        }
      })
      .subscribe();

    const handleCustomEvent = (e: any) => {
      if (e.detail?.key === 'hero_config') {
        if (e.detail.value && typeof e.detail.value === 'object' && Array.isArray(e.detail.value.slides)) {
          setSlides(e.detail.value.slides);
          if (e.detail.value.settings) setSliderSettings(e.detail.value.settings);
        } else {
          fetchHeroData();
        }
      }
    };
    const handleFocus = () => fetchHeroData();

    window.addEventListener('site_setting_updated', handleCustomEvent);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const fetchHeroData = async () => {
    setIsLoading(true);
    try {
      const val = await getSiteSetting('hero_config');
      if (val) {
        let config = val;
        if (typeof config === 'string') {
          try { config = JSON.parse(config); } catch (e) {}
        }
        setSlides(config.slides || []);
        setSliderSettings(config.settings || { duration: 6, effect: 'fade' });
      }
    } catch (err: any) {
      console.error("Error fetching hero data:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onCropComplete = useCallback((_ : any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  useEffect(() => {
    if (!showCropModal || !imageToCrop) return;

    const timer = setTimeout(async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageToCrop;
        await new Promise((res) => { img.onload = res; img.onerror = res; });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sourceWidth = croppedAreaPixels?.width || img.width;
        const sourceHeight = croppedAreaPixels?.height || img.height;

        const targetWidth = Math.min(Math.max(sourceWidth, 1600), 2400);
        const targetHeight = Math.round(targetWidth * (sourceHeight / sourceWidth)) || 900;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (ctx) {
          ctx.fillStyle = "#070d1a";
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(
            img,
            croppedAreaPixels?.x || 0, croppedAreaPixels?.y || 0,
            sourceWidth, sourceHeight,
            0, 0, targetWidth, targetHeight
          );
        }

        const qualityRatio = qualityLevel / 10;
        canvas.toBlob((b) => {
          if (b) {
            setEstimatedSizeKb(Math.round(b.size / 1024));
          }
        }, 'image/webp', qualityRatio);
      } catch (e) {
        console.warn("Size preview estimation error:", e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [showCropModal, imageToCrop, croppedAreaPixels, qualityLevel, rotation]);

  const processAndCompressVideo = async (file: File) => {
    setIsUploading(true);
    try {
      Swal.fire({
        title: 'Mengompresi Video Hero',
        html: '<div class="text-xs font-bold text-amber-400 mt-2">Sedang mengompresi & mengoptimasi video untuk tayang cepat di web...</div>',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        background: '#0F172A',
        color: '#fff'
      });

      const { videoBlob, posterBlob, fileExt, mimeType } = await compressVideoFile(
        file,
        qualityLevel,
        (statusText) => {
          Swal.update({
            html: `<div class="text-xs font-bold text-amber-400 mt-2">${statusText}</div>`
          });
        }
      );

      const timestamp = Date.now();
      const videoFileName = `hero-video-${timestamp}.${fileExt}`;
      const videoPath = `hero-sliders/${videoFileName}`;

      const posterFileName = `hero-poster-${timestamp}.webp`;
      const posterPath = `hero-sliders/${posterFileName}`;

      let publicVideoUrl = '';
      try {
        const { error: videoUploadError } = await supabase.storage
          .from('assets')
          .upload(videoPath, videoBlob, { contentType: mimeType, upsert: true });

        if (videoUploadError) throw videoUploadError;

        const { data: videoUrlData } = supabase.storage.from('assets').getPublicUrl(videoPath);
        publicVideoUrl = videoUrlData.publicUrl;
      } catch (storageErr) {
        console.warn("Storage upload failed, using Data URL fallback:", storageErr);
        // Fallback: convert videoBlob to Data URL so media is never lost
        publicVideoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(videoBlob);
        });
      }

      // Upload Poster image frame
      let publicPosterUrl = '';
      if (posterBlob && posterBlob.size > 0) {
        try {
          const { error: posterUploadError } = await supabase.storage
            .from('assets')
            .upload(posterPath, posterBlob, { contentType: 'image/webp', upsert: true });

          if (!posterUploadError) {
            const { data: posterUrlData } = supabase.storage.from('assets').getPublicUrl(posterPath);
            publicPosterUrl = posterUrlData.publicUrl;
          }
        } catch (e) {}
      }

      setImageUrl(publicVideoUrl);
      if (publicPosterUrl) {
        setPosterUrl(publicPosterUrl);
      }

      const sizeKb = Math.round(videoBlob.size / 1024);
      const sizeMb = (sizeKb / 1024).toFixed(2);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Video Hero Dioptimasi! (${fileExt.toUpperCase()} ~${sizeMb} MB)`,
        showConfirmButton: false,
        timer: 3000
      });

    } catch (err: any) {
      console.error("Video processing error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memproses Video',
        text: err.message || 'Terjadi kesalahan saat mengompresi & mengunggah video.',
        confirmButtonColor: '#EF4444',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file selection re-triggers change event
    e.target.value = '';

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

    if (isVideo) {
      await processAndCompressVideo(file);
    } else {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        setRotation(0);
        setQualityLevel(8);
        setShowCropModal(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const openCropperForUrl = async (url: string) => {
    if (!url) return;
    setIsLoading(true);
    try {
      // Load via CORS-safe blob or direct data URL
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        setRotation(0);
        setQualityLevel(8);
        setShowCropModal(true);
        setIsLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn("Direct fetch failed, fallback to url direct", err);
      setImageToCrop(url);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setRotation(0);
      setQualityLevel(8);
      setShowCropModal(true);
      setIsLoading(false);
    }
  };

  const processAndUploadImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploading(true);
    setShowCropModal(false);

    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageToCrop;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const sourceWidth = croppedAreaPixels.width;
      const sourceHeight = croppedAreaPixels.height;

      // Keep crisp resolution up to 2400px width matching cropped aspect ratio
      const targetWidth = Math.min(Math.max(sourceWidth, 1600), 2400);
      const targetHeight = Math.round(targetWidth * (sourceHeight / sourceWidth));

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = "#070d1a";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        if (rotation !== 0) {
          ctx.save();
          ctx.translate(targetWidth / 2, targetHeight / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-targetWidth / 2, -targetHeight / 2);
        }

        ctx.drawImage(
          image,
          croppedAreaPixels.x, croppedAreaPixels.y,
          sourceWidth, sourceHeight,
          0, 0,
          targetWidth, targetHeight
        );

        if (rotation !== 0) {
          ctx.restore();
        }
      }

      // Convert canvas to compressed format using user-selected qualityLevel (1-10)
      const qualityRatio = qualityLevel / 10;
      let blob: Blob | null = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), 'image/webp', qualityRatio)
      );

      let mimeType = 'image/webp';
      let fileExt = 'webp';

      if (!blob || blob.type !== 'image/webp') {
        blob = await new Promise<Blob | null>((resolve) => 
          canvas.toBlob((b) => resolve(b), 'image/jpeg', qualityRatio)
        );
        mimeType = 'image/jpeg';
        fileExt = 'jpg';
      }

      if (!blob) throw new Error("Gagal memproses & mengompresi gambar.");

      const fileSizeKb = Math.round(blob.size / 1024);
      const fileName = `hero-${Date.now()}.${fileExt}`;
      const filePath = `hero-sliders/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, blob, { contentType: mimeType, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Hero Image Dioptimasi! Lvl ${qualityLevel} (${fileExt.toUpperCase()} ~${fileSizeKb} KB)`,
        showConfirmButton: false,
        timer: 2800
      });

    } catch (err: any) {
      console.error("Crop & upload error:", err);
      setFormError(err.message || "Gagal mengolah gambar.");
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveToDatabase = async (updatedSlides: any[], updatedSettings = sliderSettings) => {
    setSlides(updatedSlides);
    setSliderSettings(updatedSettings);

    const payload = {
      slides: updatedSlides,
      settings: updatedSettings,
      updated_at: new Date().toISOString()
    };

    const { error } = await saveSiteSetting('hero_config', payload, 'Pengaturan Hero Slider');

    if (!error) {
      triggerSuccess();
    } else {
      console.error("Database Save Error:", error.message);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: 'Gagal menyimpan ke database: ' + error.message,
        confirmButtonColor: '#EF4444',
        background: '#0F172A',
        color: '#fff'
      });
    }
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setFormError("Media (Gambar atau Video) wajib dipilih atau diunggah");
      return;
    }

    const currentSlide = editingId ? slides.find(s => s.id === editingId) : null;
    const isVideo = isVideoUrl(imageUrl) || isVideoUrl(currentSlide?.videoUrl) || currentSlide?.type === 'video';
    const finalTitle = title.trim() || (isVideo ? "PB Bilibili Video Hero" : "PB Bilibili 162");
    const activePoster = posterUrl || currentSlide?.poster;

    let updatedSlides;
    if (editingId) {
      updatedSlides = slides.map(s => 
        s.id === editingId ? { 
          ...s, 
          title: finalTitle, 
          subtitle: subtitle.trim(), 
          image: imageUrl, 
          videoUrl: isVideo ? imageUrl : undefined, 
          poster: activePoster || undefined,
          type: isVideo ? 'video' : 'image',
          active: true
        } : s
      );
    } else {
      const newSlide = {
        id: Date.now(),
        title: finalTitle,
        subtitle: subtitle.trim(),
        image: imageUrl,
        videoUrl: isVideo ? imageUrl : undefined,
        poster: activePoster || undefined,
        type: isVideo ? 'video' : 'image',
        active: true,
      };
      updatedSlides = [...slides, newSlide];
    }

    await saveToDatabase(updatedSlides);
    resetForm();
  };

  const toggleSlideActive = async (id: number) => {
    const updatedSlides = slides.map(s => {
      if (s.id === id) {
        const currentActive = s.active !== false;
        return { ...s, active: !currentActive };
      }
      return s;
    });
    setSlides(updatedSlides);
    await saveToDatabase(updatedSlides);
  };

  const deleteSlide = async (id: number) => {
    const target = slides.find(s => s.id === id);
    if (!target) return;

    const result = await Swal.fire({
      title: 'Hapus Slide?',
      text: "Apakah Anda yakin ingin menghapus slide hero ini secara permanen?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      const updatedSlides = slides.filter(s => s.id !== id);
      if (editingId === id) resetForm();
      await saveToDatabase(updatedSlides);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Slide berhasil dihapus',
        showConfirmButton: false,
        timer: 2000
      });
    }
  };

  const startEdit = (slide: any) => {
    setEditingId(slide.id);
    setTitle(slide.title || '');
    setSubtitle(slide.subtitle || '');
    setImageUrl(slide.videoUrl || slide.image || '');
    setPosterUrl(slide.poster || '');
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setPosterUrl('');
    setFormError(null);
  };

  const moveSlide = async (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;
    [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
    setSlides(newSlides);
    await saveToDatabase(newSlides);
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#070d1a] text-white flex flex-col overflow-x-hidden p-4 md:p-8 font-sans selection:bg-blue-500/30">
      
      {/* MODAL CROPPER & ZOOM ADJUSTMENT */}
      {showCropModal && imageToCrop && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex flex-col items-center justify-center p-3 sm:p-6 md:p-10 backdrop-blur-2xl overflow-y-auto">
          <div className="w-full max-w-4xl bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col my-auto">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <Crop size={18} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Penyesuaian Crop & Zoom Hero
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-400">Atur posisi & zoom agar pas di slider landing page</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCropModal(false)} 
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aspect Ratio Selector Presets */}
            <div className="px-4 py-3 bg-zinc-950 border-b border-white/5 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
              <span className="text-[10px] font-black uppercase text-zinc-400 shrink-0 flex items-center gap-1.5 mr-1">
                <Monitor size={12} className="text-blue-500" /> Rasio Layar:
              </span>
              <div className="flex gap-1.5 shrink-0">
                {ASPECT_RATIO_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setAspectRatio(preset.value)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                      aspectRatio === preset.value
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/50'
                        : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'
                    }`}
                  >
                    {preset.value === 2.5/1 && <Sparkles size={12} className="text-amber-300 animate-pulse" />}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cropper Container */}
            <div className="relative h-[42vh] sm:h-[50vh] w-full bg-black/90">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
              />
              {/* Overlay Guide Badge */}
              <div className="absolute top-3 left-3 z-10 pointer-events-none bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-2">
                <Maximize2 size={12} /> Fit Landing Page Hero Slider
              </div>
            </div>

            {/* Interactive Controls Bar */}
            <div className="p-5 sm:p-7 space-y-5 bg-zinc-900 border-t border-white/5">
              
              {/* Zoom & Rotation Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-2xl border border-white/5">
                
                {/* Zoom Controls */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn size={14} className="text-blue-400" /> Perbesaran (Zoom): {zoom.toFixed(1)}x
                    </span>
                    <button 
                      onClick={() => setZoom(1)} 
                      className="text-blue-400 hover:underline text-[9px] lowercase font-semibold"
                    >
                      reset zoom
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors active:scale-95"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.05}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-grow h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <button 
                      type="button"
                      onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors active:scale-95"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>

                {/* Rotation Controls */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <RotateCw size={14} className="text-blue-400" /> Rotasi Gambar: {rotation}°
                    </span>
                    <button 
                      onClick={() => setRotation(0)} 
                      className="text-blue-400 hover:underline text-[9px] lowercase font-semibold"
                    >
                      reset rotasi
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCw size={14} /> Putar 90°
                    </button>
                  </div>
                </div>

              </div>

              {/* Quality & Optimize Level Selector (1-10) */}
              <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Gauge size={16} className="text-amber-400" />
                    <span className="text-[10px] font-black uppercase text-zinc-300 tracking-wider">
                      Level Optimasi Kualitas (1 - 10):
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                      Level {qualityLevel} ({qualityLevel * 10}%)
                    </span>
                  </div>

                  {estimatedSizeKb !== null && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                      <HardDrive size={13} />
                      <span>Estimasi Ukuran: ~{estimatedSizeKb} KB (WebP)</span>
                    </div>
                  )}
                </div>

                {/* Slider 1 to 10 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase text-zinc-500 shrink-0">Lvl 1 (Kompres)</span>
                    <input
                      type="range"
                      value={qualityLevel}
                      min={1}
                      max={10}
                      step={1}
                      onChange={(e) => setQualityLevel(Number(e.target.value))}
                      className="flex-grow h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-[9px] font-black uppercase text-zinc-500 shrink-0">Lvl 10 (Asli)</span>
                  </div>

                  {/* Quick Presets for Quality Level */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      { level: 3, label: 'Lvl 3 - High Compress', desc: 'Sangat Ringan' },
                      { level: 5, label: 'Lvl 5 - Balanced', desc: 'Load Cepat' },
                      { level: 8, label: 'Lvl 8 - Recommended', desc: 'Jernih & Tajam' },
                      { level: 10, label: 'Lvl 10 - Lossless / Max', desc: 'Resolusi Asli' },
                    ].map((preset) => (
                      <button
                        key={preset.level}
                        type="button"
                        onClick={() => setQualityLevel(preset.level)}
                        className={`p-2 rounded-xl text-center transition-all border ${
                          qualityLevel === preset.level
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-black shadow-lg shadow-amber-500/10'
                            : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-white/5'
                        }`}
                      >
                        <div className="text-[9px] font-black uppercase">{preset.label}</div>
                        <div className="text-[8px] opacity-70 font-medium mt-0.5">{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="flex-1 py-3.5 sm:py-4 bg-zinc-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-700 transition-all text-zinc-300"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={processAndUploadImage}
                  className="flex-[2] py-3.5 sm:py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 text-white"
                >
                  <Crop size={16} /> Terapkan Crop & Simpan
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-white leading-none">
              HERO <span className="text-blue-500">ENGINE</span>
            </h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
              Manajemen Banner Slider & Visual PB Bilibili 162
            </p>
          </div>
          <button 
            onClick={fetchHeroData}
            disabled={isLoading}
            className="flex items-center gap-3 px-6 py-3 bg-zinc-900 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all active:scale-95 shadow-2xl disabled:opacity-50"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin text-blue-500' : 'text-zinc-400'} />
            <span className="text-[10px] font-black uppercase tracking-widest">Resync Data</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden grid lg:grid-cols-12 gap-6 pr-1 custom-scrollbar pb-10">
          
          {/* SISI KIRI: CONFIG & FORM */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Slider Duration Box */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 sm:p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] relative overflow-hidden group">
               <Settings2 className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-white/90">
                 <Zap size={16} /> Slider Behavior
               </h3>
               <div className="space-y-4 relative z-10">
                 <div>
                   <label className="text-[9px] font-black uppercase text-blue-100 flex items-center gap-2 mb-2">
                     <Clock size={12} /> Auto-Slide Duration
                   </label>
                   <input 
                     type="range" min="3" max="15" step="1"
                     value={sliderSettings.duration}
                     onChange={(e) => setSliderSettings({...sliderSettings, duration: parseInt(e.target.value)})}
                     onMouseUp={() => saveToDatabase(slides, sliderSettings)}
                     className="w-full h-1.5 bg-blue-400/50 rounded-lg appearance-none cursor-pointer accent-white"
                   />
                   <div className="flex justify-between mt-2 text-[10px] font-black text-white">
                     <span>3s</span>
                     <span className="bg-white text-blue-600 px-3 py-0.5 rounded-full shadow-md">{sliderSettings.duration} DETIK</span>
                     <span>15s</span>
                   </div>
                 </div>
               </div>
            </div>

            {/* Upload & Edit Form */}
            <div className={`bg-zinc-900/60 border ${editingId ? 'border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.15)]' : 'border-white/10'} p-6 sm:p-8 rounded-[2.5rem] backdrop-blur-xl transition-all`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-blue-400">
                  {editingId ? <Edit3 size={16} /> : <Plus size={16} />} 
                  {editingId ? 'Edit Slide Hero' : 'Tambah Slide Hero Baru'}
                </h3>
                {editingId && (
                  <button 
                    onClick={resetForm} 
                    className="text-[9px] font-bold uppercase text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
              
              <form onSubmit={handleAddSlide} className="space-y-5">
                
                {/* File Upload / Preview Box */}
                <div className="space-y-2">
                  <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`group relative w-full h-44 bg-black border-2 border-dashed ${isUploading ? 'border-blue-500' : 'border-zinc-800'} rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden`}
                  >
                    {imageUrl ? (
                      <div className="relative w-full h-full">
                        {isVideoUrl(imageUrl) ? (
                          <video 
                            src={imageUrl} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                          />
                        ) : (
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        )}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 z-10">
                          {isVideoUrl(imageUrl) ? (
                            <>
                              <Film size={12} className="text-amber-400 animate-pulse" />
                              <span>Video Hero</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon size={12} className="text-blue-400" />
                              <span>Foto WebP</span>
                            </>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="px-3 py-1.5 bg-blue-600/90 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                            {isVideoUrl(imageUrl) ? <VideoIcon size={12} /> : <Crop size={12} />} 
                            Ganti Media / Upload Ulang
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <div className="flex justify-center gap-2 text-zinc-600 mb-2 group-hover:text-blue-400 transition-colors">
                          <ImageIcon size={28} />
                          <Film size={28} className="text-amber-500/70" />
                        </div>
                        <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Pilih Gambar / Video Banner</p>
                        <p className="text-[8px] font-semibold text-zinc-500 mt-1">Dukungan Foto (WebP) & Video Singkat (MP4/WebM) Terkompresi</p>
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
                        <RefreshCcw className="animate-spin text-blue-500" size={24} />
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-300">Mengolah & Mengompresi Media...</span>
                      </div>
                    )}
                  </div>

                  {/* Manual Crop Trigger for existing image */}
                  {imageUrl && !isVideoUrl(imageUrl) && (
                    <button
                      type="button"
                      onClick={() => openCropperForUrl(imageUrl)}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 hover:text-blue-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border border-white/5"
                    >
                      <Crop size={14} /> Adjust Crop & Zoom Gambar Ini
                    </button>
                  )}
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400">Judul Banner</label>
                  <input 
                    type="text" placeholder="Contoh: PB BILIBILI 162 ACADEMY" 
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none transition-colors text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400">Deskripsi / Subtitle</label>
                  <textarea 
                    placeholder="Deskripsi singkat slider hero..." 
                    value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none h-24 resize-none transition-colors text-white placeholder:text-zinc-600"
                  />
                </div>

                {/* Live Preview Section Before Save */}
                {imageUrl && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-blue-400">
                      <span className="flex items-center gap-1.5">
                        <Eye size={13} className="text-amber-400 animate-pulse" /> Pratinjau Live Media (Sebelum Disimpan)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[8px] font-extrabold border border-blue-500/20">
                        {isVideoUrl(imageUrl) ? 'Video Preview' : 'Foto WebP'}
                      </span>
                    </div>
                    <div className="relative h-44 w-full bg-black rounded-[1.8rem] overflow-hidden border border-blue-500/30 shadow-2xl flex items-end p-5 group">
                      {isVideoUrl(imageUrl) ? (
                        <video 
                          src={imageUrl} 
                          poster={posterUrl || undefined}
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                        <img 
                          src={imageUrl} 
                          alt="Live Hero Preview" 
                          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" 
                        />
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-0" />
                      
                      <div className="relative z-10 space-y-1.5 w-full">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600/90 backdrop-blur-md text-[8px] font-black uppercase text-white tracking-wider border border-white/20 shadow-md">
                          {isVideoUrl(imageUrl) ? (
                            <>
                              <Film size={10} className="text-amber-300 animate-pulse" />
                              <span>Video Banner Active</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon size={10} className="text-blue-200" />
                              <span>Image Banner Active</span>
                            </>
                          )}
                        </div>
                        <h4 className="text-sm font-black italic tracking-tight text-white line-clamp-1 drop-shadow-md uppercase">
                          {title.trim() || (isVideoUrl(imageUrl) ? 'PB BILIBILI VIDEO HERO' : 'PB BILIBILI 162')}
                        </h4>
                        <p className="text-[10px] text-zinc-300 font-medium line-clamp-2 drop-shadow leading-relaxed">
                          {subtitle.trim() || 'Deskripsi slider hero akan ditampilkan di atas media banner ini.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {formError && (
                  <p className="text-red-400 text-[9px] font-black uppercase tracking-tighter flex items-center gap-2 bg-red-950/40 p-2.5 rounded-xl border border-red-500/20">
                    <AlertCircle size={14}/> {formError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <button type="button" onClick={resetForm} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                      Batal
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className={`flex-[2] ${editingId ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'} py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl disabled:opacity-50 text-white flex items-center justify-center gap-2`}
                  >
                    {editingId ? 'Simpan Perubahan' : 'Terbitkan ke Hero Slider'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SISI KANAN: LIST SLIDES */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Layers size={14} className="text-blue-500" /> Daftar Slide Terpasang ({slides.length})
              </h3>
            </div>

            {slides.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-zinc-800 rounded-[2.5rem] opacity-40">
                <Layers size={48} className="mx-auto mb-4 text-zinc-500" />
                <p className="font-black uppercase text-[10px] tracking-[0.3em] text-zinc-400">Belum Ada Slide Hero</p>
              </div>
            ) : (
              slides.map((slide, index) => {
                const isVideo = isVideoUrl(slide.image || slide.videoUrl, slide.type);
                return (
                  <div 
                    key={slide.id} 
                    className={`group flex flex-col md:flex-row items-center gap-5 bg-zinc-900/80 border ${editingId === slide.id ? 'border-blue-500' : 'border-white/5'} p-5 rounded-[2rem] hover:border-blue-500/30 transition-all relative overflow-hidden`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full md:w-52 h-32 rounded-[1.2rem] overflow-hidden flex-shrink-0 shadow-xl bg-black">
                      {isVideo ? (
                        <video 
                          src={slide.image || slide.videoUrl} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${slide.active === false ? 'opacity-30 grayscale' : ''}`} 
                        />
                      ) : (
                        <img 
                          src={slide.image} 
                          alt={slide.title} 
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${slide.active === false ? 'opacity-30 grayscale' : ''}`} 
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shadow-md">
                        {index + 1}
                      </div>
                      
                      {/* Media Format Badge */}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[8px] font-black uppercase text-white tracking-widest flex items-center gap-1 border border-white/20">
                        {isVideo ? (
                          <>
                            <Film size={10} className="text-amber-400" />
                            <span>Video</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={10} className="text-blue-400" />
                            <span>Foto</span>
                          </>
                        )}
                      </div>

                      {slide.active === false && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-[8px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full shadow-lg">Nonaktif</span>
                        </div>
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="flex-grow w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h4 className={`font-black uppercase italic text-base tracking-tighter truncate ${slide.active === false ? 'text-zinc-500' : 'text-white'}`}>
                          {slide.title}
                        </h4>
                        {slide.active !== false ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                            Aktif
                          </span>
                        ) : (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                            Sembunyi
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] font-medium leading-snug line-clamp-2 ${slide.active === false ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {slide.subtitle || 'Tidak ada deskripsi'}
                      </p>
                      
                      {/* Toggle Switch */}
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Tampilkan di Landing:</span>
                        <button
                          type="button"
                          onClick={() => toggleSlideActive(slide.id)}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                            slide.active !== false ? 'bg-blue-600' : 'bg-zinc-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
                              slide.active !== false ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto justify-end">
                      <div className="flex bg-black/60 p-1 rounded-xl border border-white/5 justify-center">
                        <button 
                          onClick={() => moveSlide(index, 'up')} 
                          disabled={index === 0}
                          className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                          title="Geser Ke Atas"
                        >
                          <MoveUp size={16}/>
                        </button>
                        <button 
                          onClick={() => moveSlide(index, 'down')} 
                          disabled={index === slides.length - 1}
                          className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                          title="Geser Ke Bawah"
                        >
                          <MoveDown size={16}/>
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        {!isVideo && (
                          <button 
                            onClick={() => {
                              startEdit(slide);
                              openCropperForUrl(slide.image);
                            }} 
                            className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                            title="Crop & Edit Gambar"
                          >
                            <Crop size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => startEdit(slide)} 
                          className="p-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-xl transition-all"
                          title="Edit Slide"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteSlide(slide.id)} 
                          className="p-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                          title="Hapus Slide"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Success Toast Notification */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 z-[100] ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="bg-blue-600 px-8 py-3.5 rounded-full flex items-center gap-3 shadow-2xl border border-white/20">
          <div className="bg-white/20 p-1.5 rounded-full text-white"><CheckCircle2 size={16} /></div>
          <span className="font-black uppercase text-[10px] tracking-widest text-white">Hero Slider Berhasil Diperbarui</span>
        </div>
      </div>
    </div>
  );
};

export default KelolaHero;