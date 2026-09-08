import fs from 'node:fs';

const path = 'src/components/AdminHonorLinesman.tsx';
let source = fs.readFileSync(path, 'utf8');

const start = source.indexOf('  const load = useCallback(async () => {');
const end = source.indexOf('\n  }, []);', start);
if (start < 0 || end < 0) throw new Error('[linesman-roster-final] load function not found');

const replacement = `  const load = useCallback(async () => {
    setLoading(true);
    try {
      const paymentsPromise = supabase.from('honor_linesman_payments').select('*').order('tanggal_pertandingan', { ascending: false }).order('nama_linesman', { ascending: true });
      const rosterPromise = supabase.from('linesman').select('id,nama,ukuran_baju,aktif').eq('aktif', true).order('nama', { ascending: true });
      const [paymentsResult, rosterResult] = await Promise.all([paymentsPromise, rosterPromise]);
      if (paymentsResult.error) throw paymentsResult.error;
      const payments = (paymentsResult.data || []) as HonorRow[];
      const roster = rosterResult.error ? [] : ((rosterResult.data || []) as Linesman[]);
      setLinesmen(roster);

      // Merge the active roster with payment records by name. This guarantees that every
      // active linesman is visible even when no honor has been entered for that person yet.
      const paymentNames = new Set(payments.map(r => String(r.nama_linesman || '').trim().toUpperCase()).filter(Boolean));
      const placeholders: HonorRow[] = roster.filter(p => !paymentNames.has(String(p.nama || '').trim().toUpperCase())).map((p, i) => ({
        id: 'roster-' + p.id,
        tanggal_pertandingan: today(),
        nama_linesman: String(p.nama || '').trim().toUpperCase(),
        pertandingan: 'BELUM DITENTUKAN',
        lapangan: null,
        nominal_honor: 0,
        status_pembayaran: 'Belum Dibayar',
        tanggal_pembayaran: null,
        metode_pembayaran: 'Tunai',
        keterangan: 'LINESMAN AKTIF; PEMBAYARAN HONOR BELUM DIISI.',
        created_at: new Date(Date.now() + i).toISOString()
      }));
      setRows([...payments, ...placeholders]);
    } catch (e) {
      setRows([]);
      Swal.fire({ icon: 'error', title: 'Gagal memuat data linesman', text: e?.message || 'Periksa koneksi database.', background: '#0F172A', color: '#fff' });
    } finally { setLoading(false); }
  }, []);`;

source = source.slice(0, start) + replacement + source.slice(end + '\n  }, []);'.length);
fs.writeFileSync(path, source);
console.log('[linesman-roster-final] complete: active roster is always merged into honor payments');
