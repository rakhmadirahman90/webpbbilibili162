import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { supabase } from '../supabase';
import { broadcastDataChange } from '../utils/realtimeHelper';
import { checkSeededPairEligibility } from '../utils/seededPairEligibility';
import Swal from 'sweetalert2';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, FileUp, Loader2, MapPin, ScanLine, Trophy, Users, Home, AlertCircle } from 'lucide-react';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Ganda Putra AD/BC-/C+C Ajatappareng', 'Ganda Putra CC Lokal Parepare'] as const;
const FEE = 150000;
const ADMIN_WA = '6289641676342';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const NIK_REGIONS: Record<string, string> = {
  '7311': 'Kabupaten Barru — Wilayah Ajatappareng',
  '7314': 'Kabupaten Sidenreng Rappang (Sidrap) — Wilayah Ajatappareng',
  '7315': 'Kabupaten Pinrang — Wilayah Ajatappareng',
  '7316': 'Kabupaten Enrekang — Wilayah Ajatappareng',
  '7372': 'Kota Parepare — Wilayah Parepare',
};

const emptyForm = {
  kategori: CATEGORIES[0],
  nama_pemain_1: '',
  nama_pemain_2: '',
  whatsapp: '',
  email: '',
  asal_pb: '',
  domisili: '',
};

const emptyIdentity = {
  nik: '',
  foto: null as File | null,
  ktp: null as File | null,
  fotoPreview: '',
  ktpPreview: '',
  ocrStatus: 'Belum dipindai',
  wilayah: '',
};

type Identity = typeof emptyIdentity;
type PairResult = Awaited<ReturnType<typeof checkSeededPairEligibility>>;
type PairStatus = PairResult & { key: string };
type SuccessState = { code: string; whatsapp: string };

const normalizeNameKey = (value: string) => value.toLocaleLowerCase('id-ID').trim().replace(/\s+/g, ' ');
const makePairKey = (category: string, player1: string, player2: string) =>
  `${normalizeNameKey(category)}::${[normalizeNameKey(player1), normalizeNameKey(player2)].sort().join('::')}`;

function generateCode() {
  return `B162-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function normalizeNIK(text: string) {
  return text.toUpperCase().replace(/[OQ]/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/G/g, '6').replace(/[^0-9]/g, '');
}

function findNIK(text: string) {
  const raw = text.toUpperCase().replace(/[OQ]/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/G/g, '6');
  const compact = raw.replace(/[^0-9]/g, '');
  if (compact.length === 16) return compact;
  for (const match of raw.match(/\d[\d\s.-]{14,22}\d/g) || []) {
    const nik = normalizeNIK(match);
    if (nik.length === 16) return nik;
  }
  return '';
}

function validateNIK(nik: string) {
  if (!/^\d{16}$/.test(nik)) return { valid: false, message: 'NIK harus terdiri dari tepat 16 digit.' };
  const region = NIK_REGIONS[nik.slice(0, 4)];
  if (!region) return { valid: false, message: `NIK ${nik} terdeteksi, tetapi kode wilayah ${nik.slice(0, 4)} bukan wilayah Ajatappareng/Parepare yang diizinkan.` };
  return { valid: true, region };
}

function normalizeWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

export default function PendaftaranTurnamen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [players, setPlayers] = useState<[Identity, Identity]>([{ ...emptyIdentity }, { ...emptyIdentity }]);
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<[boolean, boolean]>([false, false]);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [pairStatus, setPairStatus] = useState<PairStatus>({
    key: '', eligible: false, checking: false, reason: '', seeded: [], players: [], databaseError: false,
  });

  // Satu sumber kebenaran untuk validasi pasangan. Promise dan hasil disimpan di ref
  // agar tombol LANJUT tidak memicu query kedua yang bisa menghasilkan status berbeda
  // walaupun kartu UI sudah menampilkan PASANGAN ELIGIBLE.
  const pairValidationRef = useRef<{
    key: string;
    promise: Promise<PairResult> | null;
    result: PairResult | null;
  }>({ key: '', promise: null, result: null });

  const selectedLabel = useMemo(
    () => form.kategori === CATEGORIES[0] ? 'Ajatappareng' : 'Lokal Parepare',
    [form.kategori],
  );

  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const updatePlayer = (idx: 0 | 1, patch: Partial<Identity>) =>
    setPlayers((prev) => prev.map((item, index) => index === idx ? { ...item, ...patch } : item) as [Identity, Identity]);

  const currentPairKey = useMemo(
    () => makePairKey(form.kategori, form.nama_pemain_1, form.nama_pemain_2),
    [form.kategori, form.nama_pemain_1, form.nama_pemain_2],
  );

  const validatePairNow = useCallback(async (): Promise<PairResult> => {
    const player1 = form.nama_pemain_1.trim();
    const player2 = form.nama_pemain_2.trim();
    if (!player1 || !player2) return { eligible: false, reason: 'Nama kedua pemain wajib diisi.' };

    const key = makePairKey(form.kategori, player1, player2);
    const cached = pairValidationRef.current;
    if (cached.key === key && cached.result?.eligible) return cached.result;
    if (cached.key === key && cached.promise) return cached.promise;

    setPairStatus({ key, eligible: false, checking: true, reason: 'Memeriksa pasangan pada database seeded...', seeded: [], players: [] });

    const promise = checkSeededPairEligibility(form.kategori, player1, player2);
    pairValidationRef.current = { key, promise, result: null };

    try {
      const result = await promise;
      if (makePairKey(form.kategori, form.nama_pemain_1, form.nama_pemain_2) === key) {
        pairValidationRef.current = { key, promise: null, result };
        setPairStatus({ key, eligible: !!result.eligible, checking: false, reason: result.reason || '', seeded: result.seeded, players: result.players, databaseError: result.databaseError });
      }
      return result;
    } catch (error: any) {
      const result: PairResult = { eligible: false, reason: error?.message || 'Validasi pasangan gagal.', databaseError: true };
      pairValidationRef.current = { key, promise: null, result };
      setPairStatus({ key, eligible: false, checking: false, reason: result.reason, seeded: [], players: [], databaseError: true });
      return result;
    }
  }, [form.kategori, form.nama_pemain_1, form.nama_pemain_2]);

  useEffect(() => {
    pairValidationRef.current = { key: currentPairKey, promise: null, result: null };
    setPairStatus((prev) => ({ ...prev, key: currentPairKey, eligible: false, checking: false, reason: '', seeded: [], players: [], databaseError: false }));

    if (!form.nama_pemain_1.trim() || !form.nama_pemain_2.trim()) return;

    const timer = window.setTimeout(() => { void validatePairNow(); }, 250);
    return () => window.clearTimeout(timer);
  }, [currentPairKey, form.nama_pemain_1, form.nama_pemain_2, form.kategori, validatePairNow]);

  const scanKTP = async (idx: 0 | 1, file: File) => {
    if (!file.type.startsWith('image/')) {
      await Swal.fire({ icon: 'error', title: 'KTP harus berupa foto', text: 'Unggah KTP dalam format JPG, PNG, atau WEBP.' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      await Swal.fire({ icon: 'error', title: 'File KTP terlalu besar', text: 'Ukuran maksimal KTP adalah 5 MB.' });
      return;
    }

    updatePlayer(idx, { ktp: file, ktpPreview: URL.createObjectURL(file), ocrStatus: 'Membaca NIK...' });
    setOcrLoading((prev) => prev.map((value, index) => index === idx ? true : value) as [boolean, boolean]);

    try {
      const worker = await createWorker('eng');
      try {
        const result = await worker.recognize(file);
        const nik = findNIK(result.data.text);
        if (!nik) {
          updatePlayer(idx, { nik: '', wilayah: '', ocrStatus: 'NIK tidak terbaca — unggah ulang KTP yang jelas' });
          throw new Error('NIK 16 digit tidak terbaca. Pastikan seluruh KTP terlihat, tidak blur, tidak terpotong, dan pencahayaan cukup.');
        }
        const check = validateNIK(nik);
        if (!check.valid) {
          updatePlayer(idx, { nik, wilayah: '', ocrStatus: 'DITOLAK — wilayah tidak sesuai' });
          throw new Error(check.message);
        }
        updatePlayer(idx, { nik, wilayah: check.region || '', ocrStatus: 'VALID — wilayah diizinkan' });
        await Swal.fire({ icon: 'success', title: 'KTP berhasil diverifikasi', html: `NIK terbaca: <b>${nik}</b><br><span>${check.region}</span>`, confirmButtonColor: '#2563eb' });
      } finally {
        await worker.terminate();
      }
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Verifikasi KTP gagal', text: error?.message || 'NIK tidak dapat diverifikasi. Silakan foto ulang KTP dengan lebih jelas.', confirmButtonColor: '#ef4444' });
    } finally {
      setOcrLoading((prev) => prev.map((value, index) => index === idx ? false : value) as [boolean, boolean]);
    }
  };

  const selectFoto = (idx: 0 | 1, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return void Swal.fire({ icon: 'error', title: 'Foto tidak valid', text: 'Foto pemain harus berupa file gambar.' });
    if (file.size > MAX_FILE_SIZE) return void Swal.fire({ icon: 'error', title: 'Foto terlalu besar', text: 'Ukuran maksimal 5 MB.' });
    updatePlayer(idx, { foto: file, fotoPreview: URL.createObjectURL(file) });
  };

  const selectProof = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) return void Swal.fire({ icon: 'error', title: 'Bukti pembayaran terlalu besar', text: 'Ukuran maksimal 5 MB.' });
    setProof(file);
    setProofPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
  };

  const next = async () => {
    if (step === 1) {
      if (!form.nama_pemain_1.trim() || !form.nama_pemain_2.trim() || !form.whatsapp.trim()) {
        await Swal.fire({ icon: 'warning', title: 'Data pasangan belum lengkap', text: 'Nama kedua pemain dan WhatsApp wajib diisi.' });
        return;
      }

      // Penting: pakai hasil yang sama dengan kartu ELIGIBLE. Tidak ada validasi/query
      // kedua setelah UI menyatakan pasangan eligible.
      const check = await validatePairNow();
      if (!check.eligible) {
        await Swal.fire({
          icon: 'error',
          title: check.databaseError ? 'Database seeded tidak dapat diperiksa' : 'Pemain belum eligible',
          text: check.reason,
          confirmButtonColor: '#2563eb',
        });
        return;
      }
    }

    if (step === 2) {
      if (!form.asal_pb.trim() || !form.domisili.trim()) {
        await Swal.fire({ icon: 'warning', title: 'Data tim belum lengkap', text: 'Asal PB/Klub dan domisili wajib diisi.' });
        return;
      }
      const missing = players.findIndex((player) => !player.foto || !player.ktp || !player.nik || !validateNIK(player.nik).valid);
      if (missing !== -1) {
        await Swal.fire({ icon: 'error', title: `Dokumen Pemain ${missing + 1} belum memenuhi syarat`, text: 'Foto terbaru dan KTP wajib. NIK harus terbaca otomatis dan kode wilayah harus termasuk Ajatappareng/Parepare.' });
        return;
      }
    }

    setStep((value) => Math.min(4, value + 1));
  };

  const previous = () => setStep((value) => Math.max(1, value - 1));

  const submit = async () => {
    if (!proof) {
      await Swal.fire({ icon: 'warning', title: 'Bukti pembayaran belum dipilih', text: 'Unggah bukti pembayaran terlebih dahulu.' });
      return;
    }

    const pair = await validatePairNow();
    if (!pair.eligible) {
      await Swal.fire({ icon: 'error', title: 'Pendaftaran ditolak sistem', text: pair.reason, confirmButtonColor: '#2563eb' });
      return;
    }

    const checks = players.map((player) => validateNIK(player.nik));
    if (players.some((player) => !player.foto || !player.ktp) || checks.some((check) => !check.valid)) {
      await Swal.fire({ icon: 'error', title: 'Dokumen belum lengkap', text: 'Setiap pemain wajib memiliki foto terbaru, KTP yang terbaca, dan NIK dari wilayah yang diizinkan.' });
      return;
    }

    setLoading(true);
    const uploaded: Array<{ bucket: string; path: string }> = [];

    try {
      const code = generateCode();

      const uploadDocument = async (file: File, name: string) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `pendaftaran/${code}/${name}.${ext}`;
        const { error } = await supabase.storage.from('turnamen-dokumen').upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw new Error(`Upload ${name} gagal: ${error.message}`);
        uploaded.push({ bucket: 'turnamen-dokumen', path });
        return path;
      };

      const [foto1, ktp1, foto2, ktp2] = await Promise.all([
        uploadDocument(players[0].foto!, 'foto-pemain-1'),
        uploadDocument(players[0].ktp!, 'ktp-pemain-1'),
        uploadDocument(players[1].foto!, 'foto-pemain-2'),
        uploadDocument(players[1].ktp!, 'ktp-pemain-2'),
      ]);

      const proofExt = proof.name.split('.').pop()?.toLowerCase() || 'jpg';
      const proofPath = `turnamen-bilibili-162/${code}.${proofExt}`;
      const { error: proofError } = await supabase.storage.from('uploads').upload(proofPath, proof, { upsert: false, contentType: proof.type });
      if (proofError) throw new Error(`Upload bukti pembayaran gagal: ${proofError.message}`);
      uploaded.push({ bucket: 'uploads', path: proofPath });

      const proofUrl = supabase.storage.from('uploads').getPublicUrl(proofPath).data.publicUrl;
      const payload = {
        kode_pendaftaran: code,
        nama_pemain_1: form.nama_pemain_1.trim().toUpperCase(),
        nama_pemain_2: form.nama_pemain_2.trim().toUpperCase(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim().toLowerCase() || null,
        asal_pb: form.asal_pb.trim().toUpperCase(),
        domisili: form.domisili.trim().toUpperCase(),
        kategori: form.kategori,
        biaya_pendaftaran: FEE,
        status_pembayaran: 'Menunggu Verifikasi',
        bukti_pembayaran_url: proofUrl,
        status_pendaftaran: 'Pending',
        nik_pemain_1: players[0].nik,
        nik_pemain_2: players[1].nik,
        foto_pemain_1_url: foto1,
        foto_pemain_2_url: foto2,
        ktp_pemain_1_url: ktp1,
        ktp_pemain_2_url: ktp2,
        wilayah_nik_pemain_1: players[0].wilayah,
        wilayah_nik_pemain_2: players[1].wilayah,
        verifikasi_nik_status: 'Valid',
        verifikasi_nik_detail: `P1: ${players[0].wilayah}; P2: ${players[1].wilayah}`,
      };

      const { error } = await supabase.from('pendaftaran_turnamen').insert(payload);
      if (error) throw error;

      broadcastDataChange('pendaftaran_turnamen', 'INSERT', payload);
      setSuccess({ code, whatsapp: normalizeWhatsApp(form.whatsapp) || ADMIN_WA });
    } catch (error: any) {
      // Bersihkan upload parsial apabila insert database gagal.
      await Promise.allSettled(uploaded.map((item) => supabase.storage.from(item.bucket).remove([item.path])));
      const message = error?.message || 'Data tidak berhasil disimpan. Silakan periksa kembali dokumen dan koneksi.';
      await Swal.fire({ icon: 'error', title: 'Pendaftaran gagal', text: message, confirmButtonColor: '#ef4444' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(null);
    setForm({ ...emptyForm });
    setPlayers([{ ...emptyIdentity }, { ...emptyIdentity }]);
    setProof(null);
    setProofPreview('');
    setPairStatus({ key: '', eligible: false, checking: false, reason: '', seeded: [], players: [], databaseError: false });
    pairValidationRef.current = { key: '', promise: null, result: null };
    setStep(1);
  };

  const goHome = () => navigate('/');
  const onNavbarNavigate = (sectionId: string, subPath?: string) => {
    const target = String(subPath || sectionId || '').toLowerCase().trim();
    if (!target || target === 'home' || target === 'beranda') goHome();
    else navigate(`/${target}`);
  };

  const whatsappMessage = success
    ? encodeURIComponent(`*PENDAFTARAN BILIBILI 162 CUP I 2026*\n\nKode: *${success.code}*\nKategori: *${form.kategori}*\nPasangan: *${form.nama_pemain_1.toUpperCase()} & ${form.nama_pemain_2.toUpperCase()}*\nWilayah NIK P1: ${players[0].wilayah}\nWilayah NIK P2: ${players[1].wilayah}\nBiaya: *Rp150.000/pasang*\nStatus: *MENUNGGU VERIFIKASI ADMIN*\n\n09-12 September 2026\nGOR Titik Kumpul Soreang Parepare`)
    : '';

  if (success) {
    return (
      <div className="min-h-screen bg-[#0b0e14]">
        <Navbar onNavigate={onNavbarNavigate} />
        <main className="min-h-[calc(100dvh-5rem)] flex items-center justify-center px-4 py-8 pt-24">
          <div className="w-full max-w-xl rounded-3xl border border-emerald-400/25 bg-slate-950/95 p-7 text-center shadow-2xl sm:p-9">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 size={44} />
            </div>
            <p className="text-[11px] font-black tracking-[.25em] text-emerald-400 uppercase">Pendaftaran Berhasil</p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">BILIBILI 162 CUP I</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">Data pasangan, dokumen, NIK, dan bukti pembayaran sudah tersimpan di sistem. Simpan kode pendaftaran berikut.</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <p className="text-xs uppercase tracking-widest text-slate-400">Kode Pendaftaran</p>
              <p className="mt-1 text-2xl font-black tracking-wider text-amber-300">{success.code}</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a href={`https://wa.me/${success.whatsapp}?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wide text-white">Konfirmasi ke WhatsApp</a>
              <a href={`https://wa.me/${ADMIN_WA}?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-wide text-white">Kirim ke Admin</a>
            </div>
            <button onClick={resetForm} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wide text-slate-200">Daftar Pasangan Lain</button>
          </div>
        </main>
      </div>
    );
  }

  const canNext = step !== 1 || (!pairStatus.checking && pairStatus.eligible && pairStatus.key === currentPairKey);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0e14]">
      <Navbar onNavigate={onNavbarNavigate} />
      <main className="pt-16">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 lg:px-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button type="button" onClick={goHome} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3.5 text-[11px] font-black uppercase tracking-wider text-slate-300 shadow-lg transition hover:border-blue-400/30 hover:text-white"><Home size={14} /> Beranda</button>
            <span className="hidden text-[10px] font-bold uppercase tracking-[.18em] text-slate-500 sm:block">Pendaftaran Turnamen • Bilibili 162 Cup I 2026</span>
          </div>

          <section className="relative overflow-hidden rounded-[28px] border border-blue-400/20 bg-gradient-to-br from-[#071225] via-[#0b1730] to-[#050a14] shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, #2563eb 0, transparent 30%), radial-gradient(circle at 85% 20%, #f59e0b 0, transparent 28%)' }} />
            <div className="relative p-5 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-300"><Trophy size={13} /> Bilibili 162 Cup I • 2026</div>
                  <h1 className="mt-3 text-2xl font-black uppercase italic text-white sm:text-4xl">Pendaftaran Peserta</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Foto terbaru dan KTP <b className="text-white">wajib untuk Pemain 1 dan Pemain 2</b>. Sistem memeriksa pasangan seeded sesuai aturan kategori dan memvalidasi NIK secara otomatis.</p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3">
                  <InfoBox icon={<CalendarDays size={18} />} label="Pelaksanaan" value="09–12 Sep 2026" />
                  <InfoBox icon={<MapPin size={18} />} label="Lokasi" value="GOR Titik Kumpul Soreang Parepare" />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
                {([['1', 'Pasangan'], ['2', 'Identitas'], ['3', 'Pembayaran'], ['4', 'Konfirmasi']] as const).map(([number, label]) => (
                  <div key={number} className={`rounded-xl px-2 py-2 text-center ${step === Number(number) ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                    <span className="text-[10px] font-black">{number}</span>
                    <p className="text-[9px] font-bold uppercase tracking-wider sm:text-[10px]">{label}</p>
                  </div>
                ))}
              </div>

              {step === 1 && (
                <section className="mt-7 space-y-5">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-300">Kategori Pertandingan</label>
                    <select value={form.kategori} onChange={(event) => update('kategori', event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500">
                      <option value={CATEGORIES[0]}>{CATEGORIES[0]}</option>
                      <option value={CATEGORIES[1]}>{CATEGORIES[1]}</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">Kategori aktif: <span className="font-bold text-amber-300">{selectedLabel}</span></p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama Pemain 1" value={form.nama_pemain_1} onChange={(value) => update('nama_pemain_1', value)} />
                    <Field label="Nama Pemain 2" value={form.nama_pemain_2} onChange={(value) => update('nama_pemain_2', value)} />
                    <Field label="WhatsApp Ketua/Penanggung Jawab" value={form.whatsapp} onChange={(value) => update('whatsapp', value)} type="tel" />
                    <Field label="Email (opsional)" value={form.email} onChange={(value) => update('email', value)} type="email" />
                  </div>

                  {pairStatus.checking && (
                    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4 text-xs text-blue-200">
                      <div className="flex items-center gap-2 font-bold"><Loader2 size={15} className="animate-spin" /> Memeriksa pasangan pada database seeded...</div>
                    </div>
                  )}

                  {!pairStatus.checking && pairStatus.reason && pairStatus.key === currentPairKey && (
                    <div className={`rounded-2xl border p-4 text-xs ${pairStatus.eligible ? 'border-emerald-400/25 bg-emerald-500/5 text-emerald-200' : 'border-rose-400/25 bg-rose-500/5 text-rose-200'}`}>
                      <div className="flex items-center gap-2 font-black">{pairStatus.eligible ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {pairStatus.eligible ? 'PASANGAN ELIGIBLE' : 'PASANGAN BELUM ELIGIBLE'}</div>
                      <p className="mt-1 leading-relaxed">{pairStatus.reason}</p>
                      {!pairStatus.eligible && !pairStatus.databaseError && <p className="mt-2 text-[10px] opacity-80">Pastikan kedua nama dipilih/ditulis persis sesuai database seeded resmi.</p>}
                    </div>
                  )}
                </section>
              )}

              {step === 2 && (
                <section className="mt-7 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Asal PB / Klub" value={form.asal_pb} onChange={(value) => update('asal_pb', value)} />
                    <Field label="Kota / Domisili" value={form.domisili} onChange={(value) => update('domisili', value)} />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <PlayerIdentity index={0} identity={players[0]} ocrLoading={ocrLoading[0]} onPhoto={(file) => selectFoto(0, file)} onKtp={(file) => { if (file) void scanKTP(0, file); }} />
                    <PlayerIdentity index={1} identity={players[1]} ocrLoading={ocrLoading[1]} onPhoto={(file) => selectFoto(1, file)} onKtp={(file) => { if (file) void scanKTP(1, file); }} />
                  </div>

                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-slate-300">
                    <b className="text-amber-300">Wilayah NIK yang diterima:</b> Barru, Sidrap, Pinrang, Enrekang, dan Kota Parepare. Sistem memeriksa 4 digit kode kabupaten/kota pada NIK, bukan sekadar nama domisili.
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="mt-7 space-y-5">
                  <div className="rounded-2xl border border-blue-400/15 bg-blue-500/5 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Biaya Pendaftaran</p>
                    <p className="mt-1 text-3xl font-black text-amber-300">Rp150.000 <span className="text-xs text-slate-400">/ pasangan</span></p>
                  </div>

                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Bukti Pembayaran</span>
                    <span className="mt-2 flex min-h-36 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/5 p-5 text-center">
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => selectProof(event.target.files?.[0])} />
                      {proofPreview ? <img src={proofPreview} alt="Bukti pembayaran" className="h-24 w-24 rounded-xl border border-white/10 object-cover" /> : <div><FileUp className="mx-auto text-blue-400" size={30} /><p className="mt-2 text-xs font-bold text-white">Pilih bukti transfer</p><p className="mt-1 text-[10px] text-slate-500">JPG/PNG/PDF • maksimal 5 MB</p></div>}
                    </span>
                  </label>
                </section>
              )}

              {step === 4 && (
                <section className="mt-7 space-y-5">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5">
                    <div className="flex items-center gap-2 text-emerald-300"><FileCheck2 size={20} /><p className="text-xs font-black uppercase tracking-widest">Pemeriksaan Akhir</p></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Summary label="Kategori" value={form.kategori} />
                      <Summary label="Pasangan" value={`${form.nama_pemain_1.toUpperCase()} & ${form.nama_pemain_2.toUpperCase()}`} />
                      <Summary label="NIK Pemain 1" value={`${players[0].nik} — ${players[0].wilayah}`} />
                      <Summary label="NIK Pemain 2" value={`${players[1].nik} — ${players[1].wilayah}`} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs leading-relaxed text-slate-300">
                    <b className="text-white">Persetujuan:</b> Saya memastikan data dan dokumen kedua pemain benar. Sistem akan menolak pendaftaran secara otomatis apabila NIK tidak terbaca, bukan 16 digit, kode wilayah di luar wilayah yang diizinkan, atau kombinasi seeded tidak sesuai aturan kategori.
                  </div>
                </section>
              )}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
                <button onClick={previous} disabled={step === 1 || loading} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black text-slate-300 disabled:opacity-30"><ChevronLeft size={15} /> Kembali</button>
                {step < 4 ? (
                  <button onClick={() => void next()} disabled={!canNext || loading} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40">Lanjut <ChevronRight size={15} /></button>
                ) : (
                  <button onClick={() => void submit()} disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><Loader2 size={15} className="animate-spin" /> Memproses...</> : <>Kirim Pendaftaran <CheckCircle2 size={15} /></>}</button>
                )}
              </div>

              <p className="mt-4 text-center text-[10px] text-slate-500">KTP disimpan pada penyimpanan dokumen privat dan hanya dapat diakses admin terautentikasi.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function PlayerIdentity({ index, identity, ocrLoading, onPhoto, onKtp }: { index: number; identity: Identity; ocrLoading: boolean; onPhoto: (file: File | undefined) => void; onKtp: (file: File | undefined) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2"><Users size={18} className="text-blue-400" /><h3 className="text-sm font-black uppercase text-white">Pemain {index + 1}</h3></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[.03] p-4 text-center">
          <input type="file" accept="image/*" capture="user" className="hidden" onChange={(event) => onPhoto(event.target.files?.[0])} />
          {identity.fotoPreview ? <img src={identity.fotoPreview} alt={`Foto pemain ${index + 1}`} className="mx-auto h-28 w-24 rounded-xl object-cover" /> : <><ScanLine className="mx-auto text-blue-400" size={27} /><p className="mt-2 text-[10px] font-black uppercase text-white">Foto Terbaru *</p><p className="mt-1 text-[9px] text-slate-500">Bisa ambil langsung dari kamera</p></>}
        </label>
        <label className="cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[.03] p-4 text-center">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => onKtp(event.target.files?.[0])} />
          {identity.ktpPreview ? <img src={identity.ktpPreview} alt={`KTP pemain ${index + 1}`} className="mx-auto h-28 w-full rounded-xl object-cover" /> : <><FileUp className="mx-auto text-amber-400" size={27} /><p className="mt-2 text-[10px] font-black uppercase text-white">KTP *</p><p className="mt-1 text-[9px] text-slate-500">JPG/PNG/WEBP • maks. 5 MB</p></>}
        </label>
      </div>
      <div className="mt-3 rounded-xl border border-white/5 bg-white/[.02] p-3">
        <p className="text-[9px] uppercase tracking-widest text-slate-500">Hasil pembacaan NIK</p>
        {ocrLoading ? <p className="mt-1 text-xs font-bold text-blue-300">Sedang membaca KTP...</p> : identity.nik ? <><p className="mt-1 font-mono text-sm font-black tracking-wider text-white">{identity.nik}</p><p className={`mt-1 text-[10px] font-bold ${identity.wilayah ? 'text-emerald-300' : 'text-rose-300'}`}>{identity.ocrStatus}</p>{identity.wilayah && <p className="mt-1 text-[10px] text-slate-400">{identity.wilayah}</p>}</> : <p className="mt-1 text-[10px] text-slate-500">Belum ada KTP yang dipindai.</p>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="text-[11px] font-black uppercase tracking-widest text-slate-300">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500" /></label>;
}

function InfoBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-blue-400">{icon}</div><p className="mt-2 text-[9px] uppercase text-slate-400">{label}</p><p className="text-xs font-black text-white">{value}</p></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-xs font-bold leading-relaxed text-white">{value}</p></div>;
}
