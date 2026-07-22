import React, { useState, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  KeyRound, 
  ShieldCheck, 
  Award, 
  Trophy, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit3, 
  Save, 
  CheckCircle2, 
  Lock, 
  QrCode, 
  Camera, 
  Star, 
  Activity, 
  Loader2, 
  AlertCircle,
  Copy,
  Check,
  RefreshCcw,
  Sparkles,
  Printer,
  LogOut,
  Upload,
  Trash2,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Crop as CropIcon,
  Maximize2,
  Scan,
  RefreshCw,
  Sliders,
  Move
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<{ blob: Blob; dataUrl: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context error');
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d');

  if (!cropCtx) {
    throw new Error('Crop Canvas context error');
  }

  const targetSize = 500;
  cropCanvas.width = targetSize;
  cropCanvas.height = targetSize;

  cropCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  );

  return new Promise((resolve, reject) => {
    cropCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas blank error'));
          return;
        }
        const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);
        resolve({ blob, dataUrl });
      },
      'image/jpeg',
      0.92
    );
  });
}

interface ProfilAnggotaProps {
  session?: any;
}

export default function ProfilAnggota({ session: propSession }: ProfilAnggotaProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKtaModal, setShowKtaModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = async () => {
    try {
      const result = await Swal.fire({
        title: 'Keluar Sistem?',
        text: "Anda yakin ingin keluar dari akun Anda?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#374151',
        confirmButtonText: 'Ya, Keluar!',
        cancelButtonText: 'Batal',
        background: '#0F172A',
        color: '#fff',
        customClass: {
          container: 'z-[99999]'
        }
      });

      if (result.isConfirmed) {
        localStorage.removeItem('local_admin_session');
        window.dispatchEvent(new Event('local-session-changed'));
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error('SignOut error:', e);
        }
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('local_admin_session');
      window.dispatchEvent(new Event('local-session-changed'));
      navigate('/login', { replace: true });
    }
  };

  // Data Member State
  const [memberData, setMemberData] = useState<{
    id?: string;
    nama: string;
    email: string;
    whatsapp: string;
    domisili: string;
    kategori: string;
    jenis_kelamin: string;
    pengalaman: string;
    foto_url: string;
    tanggal_lahir?: string;
    sektor_bermain?: string;
    ukuran_jersey?: string;
    role: string;
    created_at?: string;
  }>({
    nama: '',
    email: '',
    whatsapp: '',
    domisili: '',
    kategori: 'Senior',
    jenis_kelamin: 'Putra',
    pengalaman: '2 Tahun',
    foto_url: '',
    tanggal_lahir: '',
    sektor_bermain: 'Tunggal & Ganda',
    ukuran_jersey: 'L',
    role: 'anggota'
  });

  // Stats State
  const [stats, setStats] = useState({
    points: 0,
    totalPoints: 0,
    rank: '-',
    seed: 0
  });

  // PIN Change State
  const [pinForm, setPinForm] = useState({
    oldPin: '',
    newPin: '',
    confirmPin: ''
  });

  // Photo Upload & Cropper State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Crop Modal States
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [cropShape, setCropShape] = useState<'round' | 'rect'>('round');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Format File Tidak Didukung',
        text: 'Harap pilih file gambar (JPG, PNG, WEBP).',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAutoFocusFace = () => {
    setZoom(1.35);
    setCrop({ x: 0, y: -15 });
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'Auto Fokus Wajah Diaktifkan!',
      text: 'Area wajah disesuaikan. Silakan geser atau zoom untuk presisi akhir.',
      showConfirmButton: false,
      timer: 2000,
      background: '#0F172A',
      color: '#fff'
    });
  };

  const handleApplyCrop = async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;

    setUploadingPhoto(true);
    try {
      const { blob, dataUrl } = await getCroppedImg(rawImageSrc, croppedAreaPixels, rotation);

      const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `identitas/${fileName}`;
      let publicUrl = '';

      const fileToUpload = new File([blob], fileName, { type: 'image/jpeg' });

      // 1. Try uploading to 'identitas-atlet' bucket
      const { error: uploadError } = await supabase.storage
        .from('identitas-atlet')
        .upload(filePath, fileToUpload, { contentType: 'image/jpeg', upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('identitas-atlet').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      } else {
        // 2. Fallback to 'images' bucket
        const { error: imgError } = await supabase.storage
          .from('images')
          .upload(`profiles/${fileName}`, fileToUpload, { contentType: 'image/jpeg', upsert: true });

        if (!imgError) {
          const { data } = supabase.storage.from('images').getPublicUrl(`profiles/${fileName}`);
          publicUrl = data.publicUrl;
        } else {
          // 3. Fallback to Base64 Data URL if storage bucket fails
          publicUrl = dataUrl;
        }
      }

      if (publicUrl) {
        setMemberData((prev) => ({ ...prev, foto_url: publicUrl }));
        setShowCropModal(false);
        setRawImageSrc(null);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Foto Profil Berhasil Dipotong & Disimpan!',
          showConfirmButton: false,
          timer: 2500,
          background: '#0F172A',
          color: '#fff'
        });
      }
    } catch (err: any) {
      console.error('Error cropping photo:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memotong Foto',
        text: err.message || 'Terjadi kesalahan saat memproses pemotongan gambar.',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    loadUserData();

    const handleSessionChanged = () => {
      loadUserData();
    };

    window.addEventListener('local-session-changed', handleSessionChanged);

    const channel = supabase
      .channel('profil_anggota_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pendaftaran' },
        () => loadUserData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rankings' },
        () => loadUserData()
      )
      .subscribe();

    return () => {
      window.removeEventListener('local-session-changed', handleSessionChanged);
      supabase.removeChannel(channel);
    };
  }, [propSession]);

  const loadUserData = async () => {
    setLoading(true);
    let activeSession = propSession;

    if (!activeSession) {
      const raw = localStorage.getItem('local_admin_session');
      if (raw) {
        try {
          activeSession = JSON.parse(raw);
        } catch (e) {
          console.error('Error parsing session:', e);
        }
      }
    }

    setSession(activeSession);

    if (activeSession?.user) {
      const userMeta = activeSession.user.user_metadata || {};
      const userEmail = activeSession.user.email || '';
      const fullName = userMeta.nama || userMeta.full_name || userEmail.split('@')[0] || 'Anggota PB Bilibili 162';
      const userRole = userMeta.role || 'anggota';

      // Load matching member from pendaftaran table with prioritized cascade
      let dbMember: any = null;
      try {
        const { data: pendaftaranList } = await supabase.from('pendaftaran').select('*');
        if (pendaftaranList && pendaftaranList.length > 0) {
          const metaId = userMeta.id || activeSession.user.id;
          const userLower = fullName.trim().toLowerCase();
          const emailLower = userEmail.trim().toLowerCase();
          const metaWa = (userMeta.whatsapp || '').replace(/[^0-9]/g, '');

          // Priority 1: Exact ID match
          dbMember = pendaftaranList.find((m: any) => 
            m.id && metaId && (m.id === metaId || `member-${m.id}` === metaId || metaId === `member-${m.id}`)
          );

          // Priority 2: Exact Name match
          if (!dbMember && userLower) {
            dbMember = pendaftaranList.find((m: any) => {
              const mNama = (m.nama || '').trim().toLowerCase();
              return mNama === userLower;
            });
          }

          // Priority 3: Exact Email match
          if (!dbMember && emailLower && !emailLower.endsWith('@pbbilibili162.com')) {
            dbMember = pendaftaranList.find((m: any) => 
              m.email && m.email.toLowerCase() === emailLower
            );
          }

          // Priority 4: WhatsApp match ONLY if clean length >= 6
          if (!dbMember && metaWa && metaWa.length >= 6) {
            dbMember = pendaftaranList.find((m: any) => {
              const cleanWa = (m.whatsapp || '').replace(/[^0-9]/g, '');
              return cleanWa && cleanWa.length >= 6 && cleanWa === metaWa;
            });
          }

          // Priority 5: Partial Name match (ONLY if userLower length >= 3)
          if (!dbMember && userLower && userLower.length >= 3) {
            dbMember = pendaftaranList.find((m: any) => {
              const mNama = (m.nama || '').trim().toLowerCase();
              return mNama && (mNama.includes(userLower) || userLower.includes(mNama));
            });
          }
        }
      } catch (err) {
        console.error('Error fetching member profile:', err);
      }

      // Read local persistent extended profile as fallback for non-table fields
      const searchId = dbMember?.id || userMeta.id || activeSession.user.id;
      const searchName = (dbMember?.nama || userMeta.nama || fullName || '').trim().toLowerCase();
      let extProfile: any = {};
      try {
        if (searchId && localStorage.getItem(`member_ext_${searchId}`)) {
          extProfile = JSON.parse(localStorage.getItem(`member_ext_${searchId}`) || '{}');
        } else if (searchName && localStorage.getItem(`member_ext_${searchName}`)) {
          extProfile = JSON.parse(localStorage.getItem(`member_ext_${searchName}`) || '{}');
        }
      } catch (e) {
        console.error(e);
      }

      const initialMember = {
        id: dbMember?.id || extProfile.id || userMeta.id || activeSession.user.id,
        nama: dbMember?.nama || extProfile.nama || userMeta.nama || fullName,
        email: dbMember?.email || extProfile.email || userEmail,
        whatsapp: dbMember?.whatsapp || extProfile.whatsapp || userMeta.whatsapp || '-',
        domisili: dbMember?.domisili || extProfile.domisili || userMeta.domisili || 'PAREPARE',
        kategori: dbMember?.kategori || dbMember?.kategori_atlet || extProfile.kategori || userMeta.kategori || 'Dewasa / Umum',
        jenis_kelamin: dbMember?.jenis_kelamin || extProfile.jenis_kelamin || userMeta.jenis_kelamin || 'Putra',
        pengalaman: dbMember?.pengalaman || extProfile.pengalaman || userMeta.pengalaman || '',
        foto_url: dbMember?.foto_url || extProfile.foto_url || userMeta.foto_url || userMeta.avatar_url || '',
        tanggal_lahir: dbMember?.tanggal_lahir || extProfile.tanggal_lahir || userMeta.tanggal_lahir || '',
        sektor_bermain: dbMember?.sektor_bermain || extProfile.sektor_bermain || userMeta.sektor_bermain || 'Tunggal & Ganda',
        ukuran_jersey: dbMember?.ukuran_jersey || extProfile.ukuran_jersey || userMeta.ukuran_jersey || 'L',
        role: userRole,
        created_at: dbMember?.created_at || extProfile.created_at || userMeta.created_at || activeSession.user.created_at || new Date().toISOString()
      };

      setMemberData(initialMember);

      // Sync session in localStorage using complete initialMember data
      if (activeSession) {
        const syncedSession = {
          ...activeSession,
          user: {
            ...activeSession.user,
            id: initialMember.id,
            user_metadata: {
              ...activeSession.user?.user_metadata,
              id: initialMember.id,
              full_name: initialMember.nama,
              nama: initialMember.nama,
              whatsapp: initialMember.whatsapp,
              kategori: initialMember.kategori,
              jenis_kelamin: initialMember.jenis_kelamin,
              domisili: initialMember.domisili,
              pengalaman: initialMember.pengalaman,
              foto_url: initialMember.foto_url,
              avatar_url: initialMember.foto_url,
              tanggal_lahir: initialMember.tanggal_lahir,
              sektor_bermain: initialMember.sektor_bermain,
              ukuran_jersey: initialMember.ukuran_jersey,
            }
          }
        };
        localStorage.setItem('local_admin_session', JSON.stringify(syncedSession));
      }

      // Fetch stats from rankings / atlet_stats
      const targetId = dbMember?.id || initialMember.id;
      const targetName = dbMember?.nama || initialMember.nama;

      try {
        let statData: any = null;

        if (targetId) {
          const { data: rankById } = await supabase
            .from('rankings')
            .select('*')
            .eq('pendaftaran_id', targetId)
            .maybeSingle();

          if (rankById) statData = rankById;
        }

        if (!statData && targetName) {
          const { data: rankByName } = await supabase
            .from('rankings')
            .select('*')
            .ilike('player_name', targetName.trim())
            .maybeSingle();

          if (rankByName) statData = rankByName;
        }

        if (!statData && targetId) {
          const { data: atletStat } = await supabase
            .from('atlet_stats')
            .select('*')
            .eq('pendaftaran_id', targetId)
            .maybeSingle();

          if (atletStat) statData = atletStat;
        }

        if (statData) {
          setStats({
            points: statData.poin || statData.points || 0,
            totalPoints: statData.total_points || ((statData.poin || 0) + (statData.bonus || 0)),
            rank: statData.seed ? `${statData.seed}` : 'Provisio',
            seed: statData.seed || 0
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    setLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanName = memberData.nama.trim();
      const cleanPendaftaranPayload = {
        nama: cleanName,
        whatsapp: memberData.whatsapp || '',
        domisili: memberData.domisili || 'PAREPARE',
        kategori: memberData.kategori || 'Dewasa / Umum',
        kategori_atlet: memberData.kategori || 'SENIOR',
        jenis_kelamin: memberData.jenis_kelamin || 'Putra',
        pengalaman: memberData.pengalaman || '',
        foto_url: memberData.foto_url || ''
      };

      let resolvedId = memberData.id ? memberData.id.replace(/^member-/, '') : null;

      if (resolvedId && resolvedId.length > 20) {
        // Update pendaftaran by ID
        const { error: errUpdate } = await supabase
          .from('pendaftaran')
          .update(cleanPendaftaranPayload)
          .eq('id', resolvedId);

        if (errUpdate) {
          console.error('Error updating pendaftaran by ID:', errUpdate);
        }
      } else if (cleanName) {
        // Fallback search or insert by name
        const { data: existing } = await supabase
          .from('pendaftaran')
          .select('id')
          .ilike('nama', cleanName)
          .maybeSingle();

        if (existing) {
          resolvedId = existing.id;
          await supabase.from('pendaftaran').update(cleanPendaftaranPayload).eq('id', resolvedId);
        } else {
          const { data: inserted } = await supabase
            .from('pendaftaran')
            .insert([{ ...cleanPendaftaranPayload, status: 'verified' }])
            .select('id')
            .maybeSingle();

          if (inserted) resolvedId = inserted.id;
        }
      }

      // Sync Rankings and Atlet Stats in Supabase
      if (cleanName) {
        const upperName = cleanName.toUpperCase();

        if (resolvedId) {
          await supabase
            .from('rankings')
            .update({
              player_name: upperName,
              photo_url: memberData.foto_url,
              category: memberData.kategori,
              bio: memberData.pengalaman,
              updated_at: new Date().toISOString()
            })
            .eq('pendaftaran_id', resolvedId);

          await supabase
            .from('atlet_stats')
            .update({
              player_name: upperName,
              bio: memberData.pengalaman
            })
            .eq('pendaftaran_id', resolvedId);
        }

        // Also update by name in rankings and atlet_stats to ensure consistency
        await supabase
          .from('rankings')
          .update({
            player_name: upperName,
            photo_url: memberData.foto_url,
            category: memberData.kategori,
            bio: memberData.pengalaman,
            updated_at: new Date().toISOString()
          })
          .ilike('player_name', cleanName);

        await supabase
          .from('atlet_stats')
          .update({
            player_name: upperName,
            bio: memberData.pengalaman
          })
          .ilike('player_name', cleanName);
      }

      // Save persistent extended profile locally so dates and custom selections never get lost
      const extProfilePayload = {
        id: resolvedId || memberData.id,
        nama: cleanName,
        whatsapp: memberData.whatsapp || '',
        domisili: memberData.domisili || 'PAREPARE',
        kategori: memberData.kategori || 'Dewasa / Umum',
        jenis_kelamin: memberData.jenis_kelamin || 'Putra',
        pengalaman: memberData.pengalaman || '',
        foto_url: memberData.foto_url || '',
        tanggal_lahir: memberData.tanggal_lahir || '',
        sektor_bermain: memberData.sektor_bermain || 'Tunggal & Ganda',
        ukuran_jersey: memberData.ukuran_jersey || 'L',
        updated_at: new Date().toISOString()
      };

      if (resolvedId) {
        localStorage.setItem(`member_ext_${resolvedId}`, JSON.stringify(extProfilePayload));
      }
      if (cleanName) {
        localStorage.setItem(`member_ext_${cleanName.toLowerCase()}`, JSON.stringify(extProfilePayload));
      }

      const updatedMemberData = {
        ...memberData,
        id: resolvedId || memberData.id
      };

      setMemberData(updatedMemberData);

      // Sync active session in localStorage
      const activeSession = session || JSON.parse(localStorage.getItem('local_admin_session') || '{}');
      if (activeSession?.user) {
        const updatedSession = {
          ...activeSession,
          user: {
            ...activeSession.user,
            id: resolvedId || activeSession.user.id,
            user_metadata: {
              ...activeSession.user?.user_metadata,
              id: resolvedId || activeSession.user.id,
              full_name: cleanName,
              nama: cleanName,
              kategori: memberData.kategori,
              whatsapp: memberData.whatsapp,
              domisili: memberData.domisili,
              jenis_kelamin: memberData.jenis_kelamin,
              avatar_url: memberData.foto_url,
              foto_url: memberData.foto_url,
              pengalaman: memberData.pengalaman,
              tanggal_lahir: memberData.tanggal_lahir,
              sektor_bermain: memberData.sektor_bermain,
              ukuran_jersey: memberData.ukuran_jersey
            }
          }
        };
        localStorage.setItem('local_admin_session', JSON.stringify(updatedSession));
        window.dispatchEvent(new Event('local-session-changed'));
      }

      setIsEditing(false);
      Swal.fire({
        icon: 'success',
        title: 'Profil Diperbarui!',
        text: 'Data profil Anda telah berhasil disimpan dan tersinkronisasi di database real-time.',
        background: '#0F172A',
        color: '#fff',
        confirmButtonColor: '#2563EB'
      });
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan profil.',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 6 || !/^\d+$/.test(pinForm.newPin)) {
      Swal.fire({
        icon: 'warning',
        title: 'PIN Tidak Valid',
        text: 'PIN harus terdiri dari tepat 6 angka.',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      Swal.fire({
        icon: 'warning',
        title: 'Konfirmasi Salah',
        text: 'Konfirmasi PIN baru tidak sesuai.',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    try {
      const userKey = memberData.nama.toLowerCase().trim();
      const raw = localStorage.getItem('pb162_user_pins');
      const dict = raw ? JSON.parse(raw) : {};
      dict[userKey] = {
        pin: pinForm.newPin,
        hasChosenPin: true,
        method: 'pin'
      };
      localStorage.setItem('pb162_user_pins', JSON.stringify(dict));

      setShowPinModal(false);
      setPinForm({ oldPin: '', newPin: '', confirmPin: '' });

      Swal.fire({
        icon: 'success',
        title: 'PIN Berhasil Diperbarui!',
        text: 'Gunakan 6-digit PIN baru ini untuk login berikutnya.',
        background: '#0F172A',
        color: '#fff',
        confirmButtonColor: '#2563EB'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const copyMemberId = () => {
    const id = `PB162-${memberData.id?.slice(0, 8).toUpperCase() || 'MEMBER'}`;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="animate-spin text-blue-500 mb-3" size={36} />
        <p className="text-xs font-bold uppercase tracking-widest">Memuat Profil Anggota...</p>
      </div>
    );
  }

  const memberIdCode = `PB162-${(memberData.id || '000000').slice(0, 8).toUpperCase()}`;

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 font-sans text-white overflow-hidden sm:overflow-visible">
      {/* Hidden File Input for Photo Cropping & Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*"
        className="hidden"
      />

      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest mb-1">
            <UserCheck size={16} className="shrink-0" />
            <span className="truncate">Sistem Informasi Anggota PB Bilibili 162</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight italic uppercase text-white">
            Profil Anggota
          </h1>
          <p className="text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Kelola informasi pribadi, statistik atlet, dan keamanan akses akun Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowKtaModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
          >
            <QrCode size={16} className="shrink-0" />
            <span>Kartu Anggota (KTA)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
          >
            <KeyRound size={16} className="text-blue-400 shrink-0" />
            <span>Atur PIN Akses</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-600 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-md w-full sm:w-auto"
          >
            <LogOut size={16} className="shrink-0" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left Column: Avatar Card & Stats */}
        <div className="lg:col-span-1 space-y-5 sm:space-y-6">
          {/* Profile Card */}
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-2xl rounded-full pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-blue-500/40 p-1 bg-slate-900 shadow-[0_0_25px_rgba(59,130,246,0.25)] flex items-center justify-center relative">
                  {memberData.foto_url ? (
                    <img 
                      src={memberData.foto_url} 
                      alt={memberData.nama} 
                      className="w-full h-full object-cover rounded-2xl"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 font-black text-2xl sm:text-3xl">
                      {memberData.nama.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center text-blue-400 z-10">
                      <Loader2 className="animate-spin" size={24} />
                    </div>
                  )}
                </div>

                <label 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full border-2 border-[#0b1224] shadow-md cursor-pointer active:scale-95 transition-all" 
                  title="Upload / Ubah Foto Profil"
                >
                  <Camera size={14} />
                </label>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase italic break-words max-w-full">
                {memberData.nama}
              </h2>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  memberData.role === 'admin' 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {memberData.role === 'admin' ? 'Master Admin' : 'Anggota Resmi PB Bilibili 162'}
                </span>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-300 bg-slate-800 border border-white/5 uppercase">
                  {memberData.kategori}
                </span>
              </div>

              {/* ID Badge */}
              <div className="mt-4 sm:mt-5 w-full bg-[#070d1a] border border-white/5 rounded-2xl p-3 flex flex-wrap sm:flex-nowrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
                <span className="text-[10px] uppercase font-sans font-bold text-slate-500 shrink-0">ID Anggota:</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white font-bold truncate text-[11px] sm:text-xs">{memberIdCode}</span>
                  <button onClick={copyMemberId} className="text-slate-500 hover:text-blue-400 transition-colors p-1 shrink-0" title="Salin ID">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Performance Stats */}
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Activity size={15} className="text-blue-400 shrink-0" />
              <span>Statistik Atlet PB Bilibili 162</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="bg-[#070d1a] border border-white/5 p-3 sm:p-4 rounded-2xl text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Peringkat Klub</p>
                <p className="text-lg sm:text-xl font-black italic text-amber-400 mt-1 truncate">{stats.rank}</p>
              </div>

              <div className="bg-[#070d1a] border border-white/5 p-3 sm:p-4 rounded-2xl text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Poin</p>
                <p className="text-lg sm:text-xl font-black italic text-blue-400 mt-1 truncate">{stats.totalPoints} PTS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info Form & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5 sm:mb-6 gap-2">
              <div className="flex items-center gap-2 text-white font-black text-xs sm:text-sm uppercase tracking-wider italic">
                <Star size={18} className="text-blue-400 shrink-0" />
                <span>Detail Data Pribadi Anggota</span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold text-xs transition-all cursor-pointer shrink-0"
              >
                <Edit3 size={14} />
                <span>{isEditing ? 'Batal' : 'Edit Data'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={memberData.nama}
                    onChange={(e) => setMemberData({ ...memberData, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Email Terdaftar
                  </label>
                  <input
                    type="email"
                    disabled
                    value={memberData.email}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/5 text-slate-400 font-semibold text-sm outline-none cursor-not-allowed truncate"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Phone size={12} className="text-emerald-400 shrink-0" />
                    <span>No. WhatsApp / HP</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={memberData.whatsapp}
                    onChange={(e) => setMemberData({ ...memberData, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="0812xxxxxxxx"
                  />
                </div>

                {/* Domisili / Alamat */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-red-400 shrink-0" />
                    <span>Domisili / Kota</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={memberData.domisili}
                    onChange={(e) => setMemberData({ ...memberData, domisili: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="Makassar"
                  />
                </div>

                {/* Kategori Umur / Kelompok */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Kategori Kelompok Usia
                  </label>
                  <select
                    disabled={!isEditing}
                    value={memberData.kategori}
                    onChange={(e) => setMemberData({ ...memberData, kategori: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Pra Dini (U-9)">Pra Dini (U-9)</option>
                    <option value="Dini (U-11)">Dini (U-11)</option>
                    <option value="Anak-Anak (U-13)">Anak-Anak (U-13)</option>
                    <option value="Pemula (U-15)">Pemula (U-15)</option>
                    <option value="Remaja (U-17)">Remaja (U-17)</option>
                    <option value="Taruna (U-19)">Taruna (U-19)</option>
                    <option value="Dewasa">Dewasa</option>
                    <option value="Senior">Senior</option>
                    <option value="Veteran">Veteran</option>
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Jenis Kelamin
                  </label>
                  <select
                    disabled={!isEditing}
                    value={memberData.jenis_kelamin}
                    onChange={(e) => setMemberData({ ...memberData, jenis_kelamin: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Putra">Putra</option>
                    <option value="Putri">Putri</option>
                  </select>
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={memberData.tanggal_lahir || ''}
                    onChange={(e) => setMemberData({ ...memberData, tanggal_lahir: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Sektor Bermain */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Spesialisasi Sektor
                  </label>
                  <select
                    disabled={!isEditing}
                    value={memberData.sektor_bermain || 'Tunggal & Ganda'}
                    onChange={(e) => setMemberData({ ...memberData, sektor_bermain: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Tunggal">Tunggal</option>
                    <option value="Ganda Putra / Putri">Ganda Putra / Putri</option>
                    <option value="Ganda Campuran">Ganda Campuran</option>
                    <option value="Tunggal & Ganda">Tunggal & Ganda (All Round)</option>
                  </select>
                </div>

                {/* Ukuran Jersey */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Ukuran Jersey Resmi
                  </label>
                  <select
                    disabled={!isEditing}
                    value={memberData.ukuran_jersey || 'L'}
                    onChange={(e) => setMemberData({ ...memberData, ukuran_jersey: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="3XL">3XL</option>
                  </select>
                </div>
              </div>

              {/* Direct Photo File Upload */}
              {isEditing && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between flex-wrap gap-1">
                    <span className="flex items-center gap-2 text-blue-400">
                      <Camera size={14} className="shrink-0" />
                      Upload Foto Profil (File Dari Laptop / HP)
                    </span>
                    {uploadingPhoto && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                        <Loader2 size={12} className="animate-spin" /> Mengunggah foto...
                      </span>
                    )}
                  </label>

                  <div className="p-3 sm:p-4 rounded-2xl bg-[#070d1a] border border-white/10 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    {/* Preview Thumbnail */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20 bg-slate-900 shrink-0 relative group shadow-inner">
                      {memberData.foto_url ? (
                        <img src={memberData.foto_url} alt="Preview Foto" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-bold text-[9px] uppercase">
                          <ImageIcon size={18} className="mb-0.5 opacity-50" />
                          No Photo
                        </div>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <Loader2 className="animate-spin text-blue-400" size={18} />
                        </div>
                      )}
                    </div>

                    {/* File Upload Trigger & Controls */}
                    <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                        >
                          <Upload size={14} />
                          <span>{memberData.foto_url ? 'Pilih / Ganti File Foto' : 'Pilih File Foto Profil'}</span>
                        </button>

                        {memberData.foto_url && (
                          <button
                            type="button"
                            onClick={() => setMemberData({ ...memberData, foto_url: '' })}
                            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Hapus Foto</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Pilih berkas foto dari galeri HP atau komputer Anda (Format: JPG, PNG, WEBP, GIF max 5MB). Foto akan tersimpan secara otomatis di database real-time.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Save Button */}
              {isEditing && (
                <div className="pt-3 sm:pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    <span>Simpan Perubahan Profil</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* MODAL KTA (Kartu Tanda Anggota Digital) */}
      <AnimatePresence>
        {showKtaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[#0b1224] border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-black text-xs sm:text-sm uppercase tracking-wider italic">
                  <QrCode size={18} className="text-blue-400 shrink-0" />
                  <span>Kartu Tanda Anggota (KTA) PB Bilibili 162</span>
                </div>

                <button
                  onClick={() => setShowKtaModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 shrink-0 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Visual Card */}
              <div className="w-full min-h-[220px] sm:min-h-0 sm:aspect-[1.6/1] rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0284C7] p-4 sm:p-6 text-white border-2 border-white/20 shadow-2xl relative overflow-hidden flex flex-col justify-between gap-4">
                {/* Card Background Pattern */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-start justify-between relative z-10 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <img
                      src="/logo_pb_bilibili_162.svg"
                      alt="Logo PB Bilibili 162"
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=100&auto=format&fit=crop&q=80";
                      }}
                    />
                    <div>
                      <p className="font-black italic text-xs sm:text-sm tracking-tight leading-tight">PB BILIBILI 162</p>
                      <p className="text-[7px] sm:text-[8px] font-bold text-blue-200 tracking-widest uppercase">Persatuan Bulutangkis</p>
                    </div>
                  </div>

                  <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/10 border border-white/20 text-[7px] sm:text-[8px] font-black uppercase tracking-widest shrink-0">
                    MEMBER CARD
                  </span>
                </div>

                {/* Card Body */}
                <div className="flex items-center gap-3 sm:gap-4 relative z-10 my-1">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/30 bg-slate-900 shrink-0">
                    {memberData.foto_url ? (
                      <img src={memberData.foto_url} alt={memberData.nama} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-lg sm:text-xl text-blue-300">
                        {memberData.nama.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden min-w-0">
                    <h3 className="font-black text-sm sm:text-base uppercase tracking-tight italic truncate text-white">
                      {memberData.nama}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] font-mono text-blue-200 font-bold tracking-wider truncate">
                      {memberIdCode}
                    </p>
                    <p className="text-[8px] sm:text-[9px] font-semibold text-slate-300 uppercase mt-0.5 truncate">
                      Kategori: <span className="text-white font-bold">{memberData.kategori}</span>
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-end justify-between border-t border-white/10 pt-2 relative z-10 gap-2">
                  <div>
                    <p className="text-[7px] font-bold uppercase tracking-widest text-slate-300">Status Keanggotaan</p>
                    <p className="text-[8px] sm:text-[9px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={10} className="shrink-0" /> AKTIF / VERIFIED
                    </p>
                  </div>

                  <div className="bg-white p-1 sm:p-1.5 rounded-lg shadow-md shrink-0">
                    <QrCode size={22} className="sm:w-7 sm:h-7 text-slate-900" />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
                >
                  <Printer size={16} />
                  <span>Cetak / Simpan KTA</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL GANTI PIN */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0b1224] border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-black text-xs sm:text-sm uppercase tracking-wider italic">
                  <KeyRound size={18} className="text-blue-400 shrink-0" />
                  <span>Pengaturan PIN Access 6-Digit</span>
                </div>

                <button
                  onClick={() => setShowPinModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 shrink-0 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Buat atau ganti 6-digit PIN rahasia Anda untuk akses cepat tanpa perlu memasukkan kata sandi panjang.
              </p>

              <form onSubmit={handleSavePin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    PIN Baru (6 Angka)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinForm.newPin}
                    onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-mono text-center tracking-[0.4em] text-lg outline-none focus:border-blue-500"
                    placeholder="123456"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Konfirmasi PIN Baru
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinForm.confirmPin}
                    onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-mono text-center tracking-[0.4em] text-lg outline-none focus:border-blue-500"
                    placeholder="123456"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    Simpan PIN Rahasia Baru
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CROP & AUTO FOKUS FOTO PROFIL */}
      <AnimatePresence>
        {showCropModal && rawImageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xl bg-[#0b1224] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[95vh] flex flex-col justify-between overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-black text-xs sm:text-sm uppercase tracking-wider italic">
                  <CropIcon size={18} className="text-blue-400 shrink-0" />
                  <span>Potong & Auto Fokus Foto Profil</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCropModal(false);
                    setRawImageSrc(null);
                  }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 shrink-0 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Cropper Viewport */}
              <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner">
                <Cropper
                  image={rawImageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape={cropShape}
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                />

                {/* Floating Guide */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-300 flex items-center gap-1.5 pointer-events-none z-10 shadow">
                  <Move size={12} className="text-blue-400" />
                  <span>Geser / Pinch foto untuk menyesuaikan wajah</span>
                </div>
              </div>

              {/* Control Panel */}
              <div className="space-y-3.5 bg-[#070d1a] p-3.5 sm:p-4 rounded-2xl border border-white/5">
                {/* Auto Face Focus & Shape Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFocusFace}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow active:scale-95 transition-all cursor-pointer"
                  >
                    <Scan size={14} className="text-amber-300" />
                    <span>Auto Fokus Wajah</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setCropShape('round')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        cropShape === 'round'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Lingkaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropShape('rect')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        cropShape === 'rect'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Persegi
                    </button>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <ZoomIn size={13} />
                      <span>Perpembesaran / Zoom ({Math.round(zoom * 100)}%)</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setZoom(1)}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[9px] font-bold"
                      >
                        1x
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(1.5)}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[9px] font-bold"
                      >
                        1.5x
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(2)}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[9px] font-bold"
                      >
                        2x
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.max(1, prev - 0.1))}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>

                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.02}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>

                {/* Rotation & Reset Row */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rotasi:</span>
                    <button
                      type="button"
                      onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                      title="Putar Berlawanan Jarum Jam"
                    >
                      <RotateCcw size={13} />
                      <span>-90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                      title="Putar Searah Jarum Jam"
                    >
                      <RotateCw size={13} />
                      <span>+90°</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      setRotation(0);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCropModal(false);
                    setRawImageSrc(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={handleApplyCrop}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Memproses Foto...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Terapkan & Simpan Foto</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
