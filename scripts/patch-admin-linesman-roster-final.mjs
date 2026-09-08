import fs from 'node:fs';

const path = 'src/components/AdminHonorLinesman.tsx';
let source = fs.readFileSync(path, 'utf8');

const fallbackBlock = `const FALLBACK_LINESMEN: Linesman[] = [
  { id: 'fallback-1', nama: 'MUHAMMAD RIFKY WAHAB', ukuran_baju: 'M', aktif: true },
  { id: 'fallback-2', nama: 'IMAM AJI MUHAMMAD', ukuran_baju: 'M', aktif: true },
  { id: 'fallback-3', nama: 'IMAMUL DAFFA AL MIGHDAD', ukuran_baju: 'L', aktif: true },
  { id: 'fallback-4', nama: 'ABY SOFWAN', ukuran_baju: 'M', aktif: true },
  { id: 'fallback-5', nama: 'BAYU ANGGORO', ukuran_baju: 'M', aktif: true },
  { id: 'fallback-6', nama: 'RIJAL', ukuran_baju: 'M', aktif: true },
  { id: 'fallback-7', nama: 'NAUFAL ALFIQRYANDA', ukuran_baju: 'M', aktif: true },
  { id: 'fallback-8', nama: 'FAREL', ukuran_baju: 'M', aktif: true }
];`;

if (!source.includes('const FALLBACK_LINESMEN: Linesman[]')) {
  const marker = 'const emptyForm = () =>';
  const at = source.indexOf(marker);
  if (at < 0) throw new Error('[linesman-roster-final] emptyForm marker not found');
  source = source.slice(0, at) + fallbackBlock + '\n\n' + source.slice(at);
}

const start = source.indexOf('  const load = useCallback(async () => {');
const endMarker = '\n  }, []);';
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('[linesman-roster-final] load function not found');

const replacement = `  const load = useCallback(async () => {
    setLoading(true);
    try {
      const paymentsPromise = supabase.from('honor_linesman_payments').select('*').order('tanggal_pertandingan', { ascending: false }).order('nama_linesman', { ascending: true });
      const rosterPromise = supabase.from('linesman').select('id,nama,ukuran_baju,aktif').eq('aktif', true).order('nama', { ascending: true });
      const [paymentsResult, rosterResult] = await Promise.all([paymentsPromise, rosterPromise]);
      if (paymentsResult.error) throw paymentsResult.error;
      const payments = (paymentsResult.data || []) as HonorRow[];
      const dbRoster = rosterResult.error ? [] : ((rosterResult.data || []) as Linesman[]);
      const roster = dbRoster.length ? dbRoster : FALLBACK_LINESMEN;
      setLinesmen(roster);

      const byName = new Map(payments.map(r => [String(r.nama_linesman || '').trim().toUpperCase(), r]));
      const merged: HonorRow[] = roster.map((p, i) => {
        const name = String(p.nama || '').trim().toUpperCase();
        return byName.get(name) || {
          id: 'roster-' + p.id,
          tanggal_pertandingan: today(),
          nama_linesman: name,
          pertandingan: 'Bilibili 162 Cup I',
          lapangan: null,
          nominal_honor: 50000,
          status_pembayaran: 'Belum Dibayar',
          tanggal_pembayaran: null,
          metode_pembayaran: 'Tunai',
          keterangan: 'HONOR DEFAULT RP50.000 PER HARI; PEMBAYARAN BELUM DIISI.',
          created_at: new Date(Date.now() + i).toISOString()
        };
      });
      const rosterNames = new Set(roster.map(p => String(p.nama || '').trim().toUpperCase()));
      const extraPayments = payments.filter(p => !rosterNames.has(String(p.nama_linesman || '').trim().toUpperCase()));
      setRows([...merged, ...extraPayments]);
    } catch (e) {
      setRows([]);
      Swal.fire({ icon: 'error', title: 'Gagal memuat data linesman', text: e?.message || 'Periksa koneksi database.', background: '#0F172A', color: '#fff' });
    } finally { setLoading(false); }
  }, []);`;

source = source.slice(0, start) + replacement + source.slice(end + endMarker.length);

source = source.replace(/nominal_honor: 0/g, 'nominal_honor: 50000');
source = source.replace(/Number\(r\.nominal_honor \|\| 0\)/g, 'Number(r.nominal_honor ?? 50000)');
source = source.replace(/BELUM DITENTUKAN/g, 'Bilibili 162 Cup I');

// Lapangan is a controlled choice: only Lapangan 1, 2, 3, or 4.
const courtSelect = '<select value={form.lapangan} onChange={e => setForm({ ...form, lapangan: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-3 text-xs text-white outline-none focus:border-blue-500"><option value="">Pilih Lapangan</option><option value="Lapangan 1">Lapangan 1</option><option value="Lapangan 2">Lapangan 2</option><option value="Lapangan 3">Lapangan 3</option><option value="Lapangan 4">Lapangan 4</option></select>';

// Replace any existing controlled Lapangan input, regardless of attribute order/placeholder text.
const courtInputRegex = /<input\b(?=[^>]*value=\{form\.lapangan\})(?=[^>]*onChange=\{e => setForm\(\{ \.\.\.form, lapangan: e\.target\.value \}\)\})[^>]*\/?>/s;
if (courtInputRegex.test(source)) {
  source = source.replace(courtInputRegex, courtSelect);
} else if (!source.includes('<option value="Lapangan 1">Lapangan 1</option>')) {
  // Fallback for variants where the controlled input does not expose the exact onChange formatting.
  const courtValueInput = /<input\b(?=[^>]*value=\{form\.lapangan\})[^>]*\/?>/s;
  source = source.replace(courtValueInput, courtSelect);
}

if (!source.includes('<option value="Lapangan 1">Lapangan 1</option>')) {
  throw new Error('[linesman-roster-final] Lapangan dropdown injection failed');
}

fs.writeFileSync(path, source);
console.log('[linesman-roster-final] complete: complete roster, Rp50.000 daily default, tournament name, court dropdown 1-4');