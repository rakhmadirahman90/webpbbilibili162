import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Loader2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  Filter,
  Plus,
  Trash2,
  Edit,
  ArrowRight,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAFTAR_PEMASUKAN = [
  'Iuran Bulanan Tetap (10k)',
  'Pembayaran Iuran Binaan',
  'Pembayaran Shuttlecock',
  'Pendaftaran Atlet Baru',
  'Sumbangan Sukarela'
];

const formatRupiah = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '';
  if (val === 0) return '0';
  const numberString = val.toString().replace(/[^0-9]/g, '');
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseRupiah = (str: string) => {
  const clean = str.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean) : 0;
};

const terbilang = (nominal: number): string => {
  if (!nominal || nominal <= 0) return '';
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  
  const hitung = (n: number): string => {
    if (n < 12) return angka[n];
    if (n < 20) return hitung(n - 10) + " Belas";
    if (n < 100) return hitung(Math.floor(n / 10)) + " Puluh " + hitung(n % 10);
    if (n < 200) return "Seratus " + hitung(n - 100);
    if (n < 1000) return hitung(Math.floor(n / 100)) + " Ratus " + hitung(n % 100);
    if (n < 2000) return "Seribu " + hitung(n - 1000);
    if (n < 1000000) return hitung(Math.floor(n / 1000)) + " Ribu " + hitung(n % 1000);
    if (n < 1000000000) return hitung(Math.floor(n / 1000000)) + " Juta " + hitung(n % 1000000);
    return "";
  };
  
  const hasil = hitung(nominal).replace(/\s+/g, ' ').trim();
  return hasil ? `Terbilang: ${hasil} Rupiah` : '';
};

interface Member {
  id: string;
  nama: string;
  whatsapp: string;
  kategori: string;
  kategori_atlet: string;
}

interface Transaction {
  id: string;
  tanggal_transaksi: string;
  nama_pembayar: string;
  kategori: string;
  jumlah_bayar: number;
  jenis_transaksi: 'Masuk' | 'Keluar';
}

interface MemberRecap {
  no: number;
  id: string;
  nama: string;
  whatsapp: string;
  kategoriUmur: string;
  kategoriAtlet: string;
  iuranBulanan: number;
  iuranBinaan: number;
  shuttlecock: number;
  pendaftaranBaru: number;
  sumbangan: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
}

interface AdminRekapKeuanganProps {
  isAdmin?: boolean;
  session?: any;
}

export default function AdminRekapKeuangan({ isAdmin = true, session }: AdminRekapKeuanganProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loggedInMemberName, setLoggedInMemberName] = useState<string | null>(null);

  // Filter Dates
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfYear);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    const getLoggedInUser = async () => {
      let activeSession = session;
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

      if (activeSession?.user) {
        const userMeta = activeSession.user.user_metadata || {};
        const userEmail = activeSession.user.email || '';
        const fullName = userMeta.nama || userMeta.full_name || userEmail.split('@')[0] || '';
        
        try {
          const { data: pendaftaranList } = await supabase.from('pendaftaran').select('id, nama, email, whatsapp');
          if (pendaftaranList && pendaftaranList.length > 0) {
            const metaId = userMeta.id || activeSession.user.id;
            const userLower = fullName.trim().toLowerCase();
            const emailLower = userEmail.trim().toLowerCase();
            const metaWa = (userMeta.whatsapp || '').replace(/[^0-9]/g, '');

            let dbMember = pendaftaranList.find((m: any) => 
              m.id && metaId && (m.id === metaId || `member-${m.id}` === metaId || metaId === `member-${m.id}`)
            );

            if (!dbMember && userLower) {
              dbMember = pendaftaranList.find((m: any) => 
                (m.nama || '').trim().toLowerCase() === userLower
              );
            }

            if (!dbMember && emailLower && !emailLower.endsWith('@pbbilibili162.com')) {
              dbMember = pendaftaranList.find((m: any) => 
                m.email && m.email.toLowerCase() === emailLower
              );
            }

            if (!dbMember && metaWa && metaWa.length >= 6) {
              dbMember = pendaftaranList.find((m: any) => {
                const cleanWa = (m.whatsapp || '').replace(/[^0-9]/g, '');
                return cleanWa && cleanWa.length >= 6 && cleanWa === metaWa;
              });
            }

            if (!dbMember && userLower && userLower.length >= 3) {
              dbMember = pendaftaranList.find((m: any) => {
                const mNama = (m.nama || '').trim().toLowerCase();
                return mNama && (mNama.includes(userLower) || userLower.includes(mNama));
              });
            }

            if (dbMember) {
              setLoggedInMemberName(dbMember.nama);
            } else if (fullName) {
              setLoggedInMemberName(fullName);
            }
          } else if (fullName) {
            setLoggedInMemberName(fullName);
          }
        } catch (e) {
          console.error('Error loading user mapping in Rekap Keuangan:', e);
          if (fullName) setLoggedInMemberName(fullName);
        }
      }
    };

    getLoggedInUser();
  }, [session]);

  // Manage Member Transactions Modal States
  const [selectedMember, setSelectedMember] = useState<MemberRecap | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [savingTx, setSavingTx] = useState(false);

  // Form State for transaction
  const initialTxForm = {
    tanggal_transaksi: today,
    kategori: 'Iuran Bulanan Tetap (10k)',
    jumlah_bayar: 10000,
    jumlah_bola: 0,
    tipe_anggota: 'Anggota Tetap',
    jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar',
    keterangan: ''
  };
  const [txForm, setTxForm] = useState(initialTxForm);

  const MONTHS_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const [selectedFormMonths, setSelectedFormMonths] = useState<string[]>([]);

  // Automatically update amount based on selected months
  useEffect(() => {
    if (txForm.kategori === 'Iuran Bulanan Tetap (10k)') {
      const rate = 10000;
      setTxForm(prev => ({ ...prev, jumlah_bayar: selectedFormMonths.length * rate }));
    } else if (txForm.kategori === 'Pembayaran Iuran Binaan') {
      const rate = 250000;
      setTxForm(prev => ({ ...prev, jumlah_bayar: selectedFormMonths.length * rate }));
    }
  }, [selectedFormMonths, txForm.kategori]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, transactionsRes] = await Promise.all([
        supabase.from('pendaftaran').select('id, nama, whatsapp, kategori, kategori_atlet').order('nama', { ascending: true }),
        supabase.from('kas_pb').select('id, tanggal_transaksi, nama_pembayar, kategori, jumlah_bayar, jenis_transaksi, keterangan')
      ]);

      if (membersRes.error) throw membersRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setMembers(membersRes.data || []);
      setTransactions(transactionsRes.data || []);
    } catch (err: any) {
      console.error('Error fetching recap data:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Data',
        text: err.message,
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenManageModal = (member: MemberRecap) => {
    setSelectedMember(member);
    setShowManageModal(true);
    setShowTxForm(false);
    setIsEditingTx(false);
    setEditingTxId(null);
    setTxForm({
      ...initialTxForm,
      tanggal_transaksi: today,
      tipe_anggota: member.kategoriAtlet.includes('Binaan') ? 'Anggota Luar Biasa' : 'Anggota Tetap'
    });
  };

  const handleOpenAddTx = () => {
    setIsEditingTx(false);
    setEditingTxId(null);
    setTxForm({
      ...initialTxForm,
      tanggal_transaksi: today,
      tipe_anggota: selectedMember?.kategoriAtlet.includes('Binaan') ? 'Anggota Luar Biasa' : 'Anggota Tetap'
    });
    
    const currentMonthIdx = new Date().getMonth();
    setSelectedFormMonths([MONTHS_ID[currentMonthIdx]]);
    setShowTxForm(true);
  };

  const handleOpenEditTx = (tx: any) => {
    setIsEditingTx(true);
    setEditingTxId(tx.id);
    setTxForm({
      tanggal_transaksi: tx.tanggal_transaksi || today,
      kategori: tx.kategori || 'Iuran Bulanan Tetap (10k)',
      jumlah_bayar: tx.jumlah_bayar || 0,
      jumlah_bola: tx.jumlah_bola || 0,
      tipe_anggota: tx.tipe_anggota || 'Anggota Tetap',
      jenis_transaksi: tx.jenis_transaksi || 'Masuk',
      keterangan: tx.keterangan || ''
    });
    
    const ket = tx.keterangan || '';
    const match = ket.match(/\[Bulan:\s*([^\]]+)\]/);
    if (match) {
      const parsedMonths = match[1].split(',').map((m: string) => m.trim());
      setSelectedFormMonths(parsedMonths);
    } else {
      if (tx.tanggal_transaksi) {
        const monthIdx = new Date(tx.tanggal_transaksi).getMonth();
        setSelectedFormMonths([MONTHS_ID[monthIdx]]);
      } else {
        setSelectedFormMonths([]);
      }
    }
    
    setShowTxForm(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSavingTx(true);

    const isIuranCat = txForm.kategori === 'Iuran Bulanan Tetap (10k)' || txForm.kategori === 'Pembayaran Iuran Binaan';
    const cleanUserKet = txForm.keterangan.replace(/\[Bulan:\s*[^\]]+\]\s*/g, '').trim();
    const monthsTag = (isIuranCat && selectedFormMonths.length > 0) ? `[Bulan: ${selectedFormMonths.join(', ')}]` : '';
    const finalKeterangan = monthsTag ? `${monthsTag} ${cleanUserKet}`.trim() : cleanUserKet;

    const finalTxData = {
      nama_pembayar: selectedMember.nama,
      tanggal_transaksi: txForm.tanggal_transaksi,
      kategori: txForm.kategori,
      jumlah_bayar: txForm.jumlah_bayar,
      jumlah_bola: txForm.jumlah_bola,
      tipe_anggota: txForm.tipe_anggota,
      jenis_transaksi: DAFTAR_PEMASUKAN.includes(txForm.kategori) ? 'Masuk' : txForm.jenis_transaksi,
      keterangan: finalKeterangan
    };

    try {
      if (isEditingTx && editingTxId) {
        const { error } = await supabase
          .from('kas_pb')
          .update(finalTxData)
          .eq('id', editingTxId);
        if (error) throw error;
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Transaksi Berhasil Diperbarui',
          showConfirmButton: false,
          timer: 1500
        });
      } else {
        const { error } = await supabase
          .from('kas_pb')
          .insert([finalTxData]);
        if (error) throw error;

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Kontribusi Kas Berhasil Ditambahkan',
          showConfirmButton: false,
          timer: 1500
        });
      }

      // Reset Form State
      setShowTxForm(false);
      setIsEditingTx(false);
      setEditingTxId(null);
      setTxForm(initialTxForm);

      // Re-fetch everything to update lists and recaps
      await fetchData();
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const result = await Swal.fire({
      title: 'Hapus Transaksi?',
      text: 'Catatan kas kontribusi ini akan dihapus permanen dari kas klub.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#3B82F6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('kas_pb')
          .delete()
          .eq('id', txId);
        if (error) throw error;

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Transaksi Berhasil Dihapus',
          showConfirmButton: false,
          timer: 1500
        });

        // Re-fetch everything
        await fetchData();
      } catch (err: any) {
        console.error('Error deleting transaction:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menghapus',
          text: err.message,
          confirmButtonColor: '#3B82F6',
          background: '#0F172A',
          color: '#fff'
        });
      }
    }
  };

  const handleKategoriChange = (cat: string) => {
    let nextForm = { ...txForm, kategori: cat };
    
    if (cat === 'Pembayaran Shuttlecock') {
      const hargaPerBola = txForm.tipe_anggota === 'Anggota Tetap' ? 4000 : 5000;
      nextForm.jumlah_bola = txForm.jumlah_bola === 0 ? 1 : txForm.jumlah_bola;
      nextForm.jumlah_bayar = nextForm.jumlah_bola * hargaPerBola;
      nextForm.jenis_transaksi = 'Masuk';
    } else if (DAFTAR_PEMASUKAN.includes(cat)) {
      nextForm.jenis_transaksi = 'Masuk';
      if (cat === 'Iuran Bulanan Tetap (10k)') {
        nextForm.jumlah_bayar = 10000;
        const monthIdx = new Date(txForm.tanggal_transaksi).getMonth();
        setSelectedFormMonths([MONTHS_ID[monthIdx]]);
      } else if (cat === 'Pembayaran Iuran Binaan') {
        nextForm.jumlah_bayar = 250000;
        const monthIdx = new Date(txForm.tanggal_transaksi).getMonth();
        setSelectedFormMonths([MONTHS_ID[monthIdx]]);
      } else if (cat === 'Pendaftaran Atlet Baru') {
        nextForm.jumlah_bayar = 150000;
        setSelectedFormMonths([]);
      } else {
        setSelectedFormMonths([]);
      }
    } else {
      nextForm.jenis_transaksi = 'Keluar';
      setSelectedFormMonths([]);
    }
    
    setTxForm(nextForm);
  };

  const handleJumlahBolaChange = (bola: number) => {
    let nextForm = { ...txForm, jumlah_bola: bola };
    if (txForm.kategori === 'Pembayaran Shuttlecock') {
      const hargaPerBola = txForm.tipe_anggota === 'Anggota Tetap' ? 4000 : 5000;
      nextForm.jumlah_bayar = bola * hargaPerBola;
    }
    setTxForm(nextForm);
  };

  const handleTipeAnggotaChange = (tipe: string) => {
    let nextForm = { ...txForm, tipe_anggota: tipe };
    if (txForm.kategori === 'Pembayaran Shuttlecock') {
      const hargaPerBola = tipe === 'Anggota Tetap' ? 4000 : 5000;
      nextForm.jumlah_bayar = txForm.jumlah_bola * hargaPerBola;
    }
    setTxForm(nextForm);
  };

  // Filter transactions based on date range
  const filteredTransactions = transactions.filter(t => {
    return t.tanggal_transaksi >= startDate && t.tanggal_transaksi <= endDate;
  });

  // Map and compile recap data per member
  const memberRecaps: MemberRecap[] = members.map((member, idx) => {
    const memberNameClean = (member.nama || '').trim().toLowerCase();
    
    // Filter transactions associated with this member name
    const memberTransactions = filteredTransactions.filter(t => {
      const payerNameClean = (t.nama_pembayar || '').trim().toLowerCase();
      return payerNameClean === memberNameClean;
    });

    let iuranBulanan = 0;
    let iuranBinaan = 0;
    let shuttlecock = 0;
    let pendaftaranBaru = 0;
    let sumbangan = 0;
    let totalPengeluaran = 0;

    memberTransactions.forEach(t => {
      // Normalize jenis_transaksi based on kategori
      const isMasuk = DAFTAR_PEMASUKAN.includes(t.kategori) || t.jenis_transaksi === 'Masuk';
      
      if (isMasuk) {
        if (t.kategori === 'Iuran Bulanan Tetap (10k)') {
          iuranBulanan += t.jumlah_bayar;
        } else if (t.kategori === 'Pembayaran Iuran Binaan') {
          iuranBinaan += t.jumlah_bayar;
        } else if (t.kategori === 'Pembayaran Shuttlecock') {
          shuttlecock += t.jumlah_bayar;
        } else if (t.kategori === 'Pendaftaran Atlet Baru') {
          pendaftaranBaru += t.jumlah_bayar;
        } else if (t.kategori === 'Sumbangan Sukarela') {
          sumbangan += t.jumlah_bayar;
        } else {
          // Fallback if there is any other incoming
          sumbangan += t.jumlah_bayar;
        }
      } else {
        totalPengeluaran += t.jumlah_bayar;
      }
    });

    const totalPemasukan = iuranBulanan + iuranBinaan + shuttlecock + pendaftaranBaru + sumbangan;
    const saldo = totalPemasukan - totalPengeluaran;

    return {
      no: idx + 1,
      id: member.id,
      nama: member.nama || 'Tanpa Nama',
      whatsapp: member.whatsapp || '-',
      kategoriUmur: member.kategori || '-',
      kategoriAtlet: member.kategori_atlet || '-',
      iuranBulanan,
      iuranBinaan,
      shuttlecock,
      pendaftaranBaru,
      sumbangan,
      totalPemasukan,
      totalPengeluaran,
      saldo
    };
  });

  // Calculate totals for summary charts/cards
  const totalPemasukanSemua = memberRecaps.reduce((acc, curr) => acc + curr.totalPemasukan, 0);
  const totalPengeluaranSemua = memberRecaps.reduce((acc, curr) => acc + curr.totalPengeluaran, 0);
  
  // Find logged-in member's own recap
  const myRecap = memberRecaps.find(m => (m.nama || '').trim().toLowerCase() === (loggedInMemberName || '').trim().toLowerCase());
  
  // Also calculate general expenses from transactions that do not match any member's name
  const memberNamesList = members.map(m => (m.nama || '').trim().toLowerCase());
  const generalExpensesTransactions = filteredTransactions.filter(t => {
    const isKeluar = !DAFTAR_PEMASUKAN.includes(t.kategori) && t.jenis_transaksi === 'Keluar';
    if (!isKeluar) return false;
    const payerNameClean = (t.nama_pembayar || '').trim().toLowerCase();
    return !memberNamesList.includes(payerNameClean);
  });
  
  const totalGeneralExpenses = generalExpensesTransactions.reduce((acc, curr) => acc + curr.jumlah_bayar, 0);
  const totalPengeluaranGabungan = totalPengeluaranSemua + totalGeneralExpenses;
  const totalSaldoKlub = totalPemasukanSemua - totalPengeluaranGabungan;

  // Category totals
  const totalBulanan = memberRecaps.reduce((acc, curr) => acc + curr.iuranBulanan, 0);
  const totalBinaan = memberRecaps.reduce((acc, curr) => acc + curr.iuranBinaan, 0);
  const totalShuttlecock = memberRecaps.reduce((acc, curr) => acc + curr.shuttlecock, 0);
  const totalPendaftaran = memberRecaps.reduce((acc, curr) => acc + curr.pendaftaranBaru, 0);
  const totalSumbangan = memberRecaps.reduce((acc, curr) => acc + curr.sumbangan, 0);

  // Search filter and Role-based filter
  const filteredRecaps = memberRecaps.filter(m => {
    const matchesSearch = (m.nama || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (isAdmin) {
      return matchesSearch;
    } else {
      const memberNameLower = (m.nama || '').trim().toLowerCase();
      const loggedInNameLower = (loggedInMemberName || '').trim().toLowerCase();
      return matchesSearch && memberNameLower === loggedInNameLower;
    }
  });

  // Active recap object for selected member inside the modal, ensuring recalculation on updates
  const activeRecap = selectedMember
    ? memberRecaps.find(m => m.id === selectedMember.id) || selectedMember
    : null;

  // Active transactions associated with selected member inside the modal
  const activeTransactions = selectedMember
    ? transactions.filter(t => {
        const payerNameClean = (t.nama_pembayar || '').trim().toLowerCase();
        const selectedNameClean = (selectedMember.nama || '').trim().toLowerCase();
        return payerNameClean === selectedNameClean;
      })
    : [];

  // Sort transactions with newest transaction date first
  const sortedActiveTransactions = [...activeTransactions].sort((a, b) => {
    return new Date(b.tanggal_transaksi).getTime() - new Date(a.tanggal_transaksi).getTime();
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecaps.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecaps.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const exportExcel = () => {
    if (filteredRecaps.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Kosong',
        text: 'Tidak ada data untuk diekspor ke Excel.',
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    const dataToExport = filteredRecaps.map((item, index) => ({
      'No': index + 1,
      'Nama Anggota': item.nama.toUpperCase(),
      'WhatsApp': item.whatsapp,
      'Kat. Umur': item.kategoriUmur,
      'Kat. Atlet': item.kategoriAtlet,
      'Iuran Bulanan (10k)': item.iuranBulanan,
      'Iuran Binaan': item.iuranBinaan,
      'Beli Shuttlecock': item.shuttlecock,
      'Pendaftaran Baru': item.pendaftaranBaru,
      'Sumbangan': item.sumbangan,
      'Total Pemasukan': item.totalPemasukan,
      'Pengeluaran': item.totalPengeluaran,
      'Saldo': item.saldo
    }));

    // Add extra rows for category summary at the end
    dataToExport.push({
      'No': null as any,
      'Nama Anggota': 'TOTAL REKAPITULASI',
      'WhatsApp': '',
      'Kat. Umur': '',
      'Kat. Atlet': '',
      'Iuran Bulanan (10k)': totalBulanan,
      'Iuran Binaan': totalBinaan,
      'Beli Shuttlecock': totalShuttlecock,
      'Pendaftaran Baru': totalPendaftaran,
      'Sumbangan': totalSumbangan,
      'Total Pemasukan': totalPemasukanSemua,
      'Pengeluaran': totalPengeluaranSemua,
      'Saldo': totalPemasukanSemua - totalPengeluaranSemua
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Keuangan Anggota');
    XLSX.writeFile(workbook, `Rekap_Keuangan_Anggota_PB162_${startDate}_TO_${endDate}.xlsx`);
  };

  const exportPDF = () => {
    if (filteredRecaps.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Kosong',
        text: 'Tidak ada data untuk diekspor ke PDF.',
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4', compress: true });
      const fullDateStr = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const locationDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      // Title & Header Info
      doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(30, 64, 175);
      doc.text('PB. BILI BILI 162 PAREPARE', 15, 18);
      
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100);
      doc.text('Sekretariat: Jl. Andi Makkasau No.171, Parepare | Email: pbbilibili162@gmail.com', 15, 24);
      doc.setDrawColor(30, 64, 175).setLineWidth(0.6).line(15, 28, 282, 28);

      doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(40);
      doc.text('REKAPITULASI IURAN & KAS SELURUH ANGGOTA', 148, 38, { align: 'center' });
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
      doc.text(`Periode Laporan: ${startDate} s/d ${endDate}`, 148, 43, { align: 'center' });

      // Table columns & rows
      const tableHeaders = [
        ['No', 'Nama Anggota', 'Bulanan', 'Binaan', 'Cock', 'Daftar Baru', 'Sumbangan', 'Pemasukan', 'Pengeluaran', 'Saldo']
      ];

      const tableRows = filteredRecaps.map((item, index) => [
        index + 1,
        item.nama.toUpperCase(),
        `Rp ${item.iuranBulanan.toLocaleString()}`,
        `Rp ${item.iuranBinaan.toLocaleString()}`,
        `Rp ${item.shuttlecock.toLocaleString()}`,
        `Rp ${item.pendaftaranBaru.toLocaleString()}`,
        `Rp ${item.sumbangan.toLocaleString()}`,
        `Rp ${item.totalPemasukan.toLocaleString()}`,
        `Rp ${item.totalPengeluaran.toLocaleString()}`,
        `Rp ${item.saldo.toLocaleString()}`
      ]);

      // Total Row
      tableRows.push([
        '#',
        'TOTAL REKAPITULASI',
        `Rp ${totalBulanan.toLocaleString()}`,
        `Rp ${totalBinaan.toLocaleString()}`,
        `Rp ${totalShuttlecock.toLocaleString()}`,
        `Rp ${totalPendaftaran.toLocaleString()}`,
        `Rp ${totalSumbangan.toLocaleString()}`,
        `Rp ${totalPemasukanSemua.toLocaleString()}`,
        `Rp ${totalPengeluaranSemua.toLocaleString()}`,
        `Rp ${(totalPemasukanSemua - totalPengeluaranSemua).toLocaleString()}`
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 50,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 7.5, textColor: 50 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', fontStyle: 'bold', cellWidth: 55 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold', fillColor: [240, 247, 255] },
          8: { halign: 'right' },
          9: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244] }
        },
        didParseCell: (data) => {
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [219, 234, 254];
            data.cell.styles.textColor = [30, 58, 138];
          }
        },
        margin: { bottom: 35 }
      });

      // Signature & Date
      let finalY = (doc as any).lastAutoTable.finalY + 12;
      const pageHeight = doc.internal.pageSize.height;
      if (finalY > pageHeight - 40) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(60);
      doc.text(`Parepare, ${locationDate}`, 220, finalY);
      doc.setFont('helvetica', 'bold').text('Bendahara Umum,', 220, finalY + 6);
      doc.text('MUH. NUR', 220, finalY + 24);
      doc.setDrawColor(80).setLineWidth(0.3).line(220, finalY + 25, 265, finalY + 25);

      doc.setFontSize(7).setFont('helvetica', 'italic').setTextColor(180);
      doc.text(`* Dokumen ini digenerate secara otomatis melalui Treasury Master System pada ${fullDateStr}`, 15, pageHeight - 10);

      doc.save(`Rekap_Keuangan_Anggota_PB162_${startDate}_TO_${endDate}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat mengekspor PDF.');
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-4 md:space-y-6 overflow-y-auto select-none pb-28 md:pb-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0b1224] to-slate-900 p-4 sm:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1.5 sm:mb-2">
            <Wallet size={12} />
            <span>Treasury Financial Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter truncate leading-tight">
            Rekap Kas <span className="text-blue-500">Anggota</span>
          </h1>
          <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm font-medium mt-1 truncate">
            Rekapitulasi kontribusi pemasukan & pengeluaran dari seluruh anggota PB Bilibili 162
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">
          <button 
            onClick={exportExcel} 
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95 text-white cursor-pointer"
          >
            <FileSpreadsheet size={14} /> <span>Excel</span>
          </button>
          <button 
            onClick={exportPDF} 
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95 text-white cursor-pointer"
          >
            <FileText size={14} /> <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 shrink-0">
        <div className="bg-slate-900/60 border border-white/10 p-3 sm:p-5 rounded-2xl">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1 truncate">
            <Users size={12} className="text-slate-400" /> {isAdmin ? 'Total Anggota' : 'Kategori Anggota'}
          </p>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black italic text-slate-100 truncate">
            {isAdmin ? `${members.length} Orang` : (myRecap?.kategoriAtlet || '-')}
          </h2>
          <p className="text-[8px] sm:text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
            {isAdmin ? 'Terdaftar Aktif' : 'Sektor & Klasifikasi'}
          </p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 sm:p-5 rounded-2xl">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1 truncate">
            <ArrowUpCircle size={12} className="text-emerald-400" /> {isAdmin ? 'Pemasukan Anggota' : 'Iuran Bulanan Anda'}
          </p>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black italic text-emerald-300 truncate">
            Rp {isAdmin ? totalPemasukanSemua.toLocaleString() : (myRecap?.iuranBulanan || 0).toLocaleString()}
          </h2>
          <p className="text-[8px] sm:text-[9px] text-emerald-500/70 mt-1 uppercase tracking-wider font-bold">
            {isAdmin ? 'Total Iuran & Sumbangan' : 'Penyetoran Iuran Terdata'}
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-3 sm:p-5 rounded-2xl">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-red-400 mb-1 flex items-center gap-1 truncate">
            <ArrowDownCircle size={12} className="text-red-400" /> {isAdmin ? 'Pengeluaran Anggota' : 'Pembelian Shuttlecock'}
          </p>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black italic text-red-300 truncate">
            Rp {isAdmin ? totalPengeluaranGabungan.toLocaleString() : (myRecap?.shuttlecock || 0).toLocaleString()}
          </h2>
          <p className="text-[8px] sm:text-[9px] text-red-500/70 mt-1 uppercase tracking-wider font-bold">
            {isAdmin ? 'Individu + Operasional' : 'Total Transaksi Shuttlecock'}
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-3 sm:p-5 rounded-2xl">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1 truncate">
            <Wallet size={12} className="text-blue-400" /> {isAdmin ? 'Saldo Bersih Kas' : 'Total Kontribusi Anda'}
          </p>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black italic text-white truncate">
            Rp {isAdmin ? totalSaldoKlub.toLocaleString() : (myRecap?.totalPemasukan || 0).toLocaleString()}
          </h2>
          <p className="text-[8px] sm:text-[9px] text-blue-300 mt-1 uppercase tracking-wider font-bold">
            {isAdmin ? 'Net Balance Kas' : 'Akumulasi Semua Setoran'}
          </p>
        </div>
      </div>

      {/* Categories Recap Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-5 gap-2.5 shrink-0">
        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate">Iuran Bulanan (10k)</p>
          <p className="text-xs sm:text-sm font-extrabold text-blue-400 mt-0.5">
            Rp {isAdmin ? totalBulanan.toLocaleString() : (myRecap?.iuranBulanan || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate">Iuran Binaan</p>
          <p className="text-xs sm:text-sm font-extrabold text-indigo-400 mt-0.5">
            Rp {isAdmin ? totalBinaan.toLocaleString() : (myRecap?.iuranBinaan || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate">Beli Shuttlecock</p>
          <p className="text-xs sm:text-sm font-extrabold text-emerald-400 mt-0.5">
            Rp {isAdmin ? totalShuttlecock.toLocaleString() : (myRecap?.shuttlecock || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate">Pendaftaran Atlet</p>
          <p className="text-xs sm:text-sm font-extrabold text-amber-400 mt-0.5">
            Rp {isAdmin ? totalPendaftaran.toLocaleString() : (myRecap?.pendaftaranBaru || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate">Sumbangan Sukarela</p>
          <p className="text-xs sm:text-sm font-extrabold text-teal-400 mt-0.5">
            Rp {isAdmin ? totalSumbangan.toLocaleString() : (myRecap?.sumbangan || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters (Date range and search) */}
      <div className="bg-slate-900/90 border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 shadow-lg">
        
        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-blue-400 mr-2">
            <Filter size={14} />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-300">Filter Sesi:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-xl flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Dari:</span>
            <input 
              type="date" 
              className="bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none cursor-pointer"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-xl flex-1 sm:flex-initial">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Sampai:</span>
            <input 
              type="date" 
              className="bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none cursor-pointer"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            type="button" 
            onClick={() => {
              setStartDate(firstDayOfYear);
              setEndDate(today);
            }}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto"
          >
            Tahun Ini
          </button>
        </div>

        {/* Search Input */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-2 rounded-xl focus-within:border-blue-500/50 transition-all w-full md:w-64 shrink-0">
            <Search size={14} className="text-blue-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Cari nama anggota..." 
              className="bg-transparent text-[10px] sm:text-xs font-bold outline-none text-white w-full placeholder:text-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <X size={12} className="text-zinc-500 cursor-pointer hover:text-white" onClick={() => setSearchTerm('')} />}
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-[#0b1224]/90 border border-white/10 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-[400px] shadow-xl">
        <div className="p-3 sm:p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
          <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400">Ledger_Member_Compilations.rec</h3>
          <div className="flex items-center gap-2">
             <span className="text-[9px] sm:text-[10px] text-blue-400 font-bold uppercase italic">Page {currentPage} of {totalPages || 1}</span>
          </div>
        </div>

        <div className="overflow-x-auto flex-grow custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center flex flex-col items-center justify-center h-64 gap-2">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Menyusun Data Rekapan...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center h-64 gap-3">
              <Search size={36} className="text-zinc-700" />
              <p className="text-slate-500 text-xs uppercase tracking-widest font-black">
                {searchTerm ? `Anggota "${searchTerm}" Tidak Ditemukan` : 'Belum Ada Data Anggota'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-950/60 border-b border-white/5">
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center w-12">No</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Anggota</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Bulanan (10k)</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Iuran Binaan</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Shuttlecock</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Daftar Baru</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Sumbangan</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300 text-right bg-blue-950/20">Total Masuk</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Pengeluaran</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300 text-right bg-emerald-950/20">Saldo Kas</th>
                  <th className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {currentItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 text-xs text-slate-500 text-center font-bold">{indexOfFirstItem + index + 1}</td>
                    <td className="p-3.5">
                      <div>
                        <p className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-tight">{item.nama}</p>
                        <div className="flex gap-1.5 items-center mt-1">
                          <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">{item.kategoriUmur}</span>
                          <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 font-bold uppercase">{item.kategoriAtlet}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-300 text-right">
                      {item.iuranBulanan > 0 ? `Rp ${item.iuranBulanan.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-300 text-right">
                      {item.iuranBinaan > 0 ? `Rp ${item.iuranBinaan.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-300 text-right">
                      {item.shuttlecock > 0 ? `Rp ${item.shuttlecock.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-300 text-right">
                      {item.pendaftaranBaru > 0 ? `Rp ${item.pendaftaranBaru.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-300 text-right">
                      {item.sumbangan > 0 ? `Rp ${item.sumbangan.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5 text-xs font-black text-right text-blue-400 bg-blue-950/10">
                      Rp {item.totalPemasukan.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-red-400/80 text-right">
                      {item.totalPengeluaran > 0 ? `Rp ${item.totalPengeluaran.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3.5 text-xs font-black text-right text-emerald-400 bg-emerald-950/10">
                      Rp {item.saldo.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenManageModal(item)}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95"
                      >
                        {isAdmin ? 'Kelola' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                {!searchTerm && (
                  <tr className="bg-slate-900 border-t border-white/10 font-black text-white">
                    <td className="p-4 text-center text-xs text-blue-400">#</td>
                    <td className="p-4 text-xs uppercase tracking-wider text-blue-400">TOTAL REKAPITULASI</td>
                    <td className="p-4 text-xs text-right text-blue-300">Rp {totalBulanan.toLocaleString()}</td>
                    <td className="p-4 text-xs text-right text-blue-300">Rp {totalBinaan.toLocaleString()}</td>
                    <td className="p-4 text-xs text-right text-blue-300">Rp {totalShuttlecock.toLocaleString()}</td>
                    <td className="p-4 text-xs text-right text-blue-300">Rp {totalPendaftaran.toLocaleString()}</td>
                    <td className="p-4 text-xs text-right text-blue-300">Rp {totalSumbangan.toLocaleString()}</td>
                    <td className="p-4 text-xs text-right text-blue-400 bg-blue-950/30">Rp {totalPemasukanSemua.toLocaleString()}</td>
                    <td className="p-4 text-xs text-right text-red-400">Rp {totalPengeluaranSemua.toLocaleString()}</td>
                    <td className="p-4 text-xs text-right text-emerald-400 bg-emerald-950/30">Rp {(totalPemasukanSemua - totalPengeluaranSemua).toLocaleString()}</td>
                    <td className="p-4"></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-white/5 flex items-center justify-between bg-black/30 shrink-0">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-white/10 transition-all cursor-pointer text-white"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-none no-scrollbar">
               {Array.from({ length: totalPages }, (_, i) => (
                 <button 
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`min-w-[28px] h-7 sm:h-8 rounded-lg text-[9px] sm:text-[10px] font-black transition-all cursor-pointer flex items-center justify-center ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                 >
                   {i + 1}
                 </button>
               ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-white/10 transition-all cursor-pointer text-white"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* --- START OF TRANSACTION LEDGER MODAL --- */}
      {showManageModal && activeRecap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0b1224] border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/5 shrink-0 flex items-center justify-between bg-black/20">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                  <Wallet className="text-blue-400" size={18} /> {isAdmin ? 'Kelola Kontribusi Kas Anggota' : 'Detail Kontribusi Kas Anggota'}
                </h3>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">
                  {isAdmin ? 'Ledger Kas Mandiri:' : 'Detail Riwayat Kas:'} <span className="font-extrabold text-white uppercase">{activeRecap.nama}</span> ({activeRecap.kategoriAtlet})
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedMember(null);
                }} 
                className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-grow space-y-5">
              
              {/* Member Ledger Quick Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl">
                  <p className="text-[7.5px] font-black uppercase tracking-wider text-blue-400">Total Pemasukan</p>
                  <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">Rp {activeRecap.totalPemasukan.toLocaleString()}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                  <p className="text-[7.5px] font-black uppercase tracking-wider text-red-400">Total Pengeluaran</p>
                  <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">Rp {activeRecap.totalPengeluaran.toLocaleString()}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${activeRecap.saldo >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <p className={`text-[7.5px] font-black uppercase tracking-wider ${activeRecap.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Saldo Kas Anggota</p>
                  <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">Rp {activeRecap.saldo.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/60 border border-white/5 p-2.5 rounded-xl flex flex-col justify-center">
                  <p className="text-[7.5px] font-black uppercase tracking-wider text-slate-400">Nomor WhatsApp</p>
                  <p className="text-[10px] font-extrabold text-slate-300 mt-0.5 truncate">{activeRecap.whatsapp}</p>
                </div>
              </div>

              {/* 12-Month Payment Status Board */}
              {(() => {
                const currentMonthIdx = new Date().getMonth(); // 0-11
                const rate = activeRecap.kategoriAtlet.includes('Binaan') ? 250000 : 10000;
                
                // Get all paid months for this member for the year 2026
                const paidMonths = sortedActiveTransactions
                  .filter(t => t.kategori === 'Iuran Bulanan Tetap (10k)' || t.kategori === 'Pembayaran Iuran Binaan')
                  .reduce((acc: string[], t) => {
                    const ket = t.keterangan || '';
                    const match = ket.match(/\[Bulan:\s*([^\]]+)\]/);
                    if (match) {
                      const months = match[1].split(',').map((m: string) => m.trim());
                      months.forEach((m: string) => {
                        if (!acc.includes(m)) acc.push(m);
                      });
                    } else if (t.tanggal_transaksi) {
                      const mIdx = new Date(t.tanggal_transaksi).getMonth();
                      const mName = MONTHS_ID[mIdx];
                      if (!acc.includes(mName)) acc.push(mName);
                    }
                    return acc;
                  }, []);

                const unpaidMonthsUpToNow = MONTHS_ID.slice(0, currentMonthIdx + 1).filter(m => !paidMonths.includes(m));
                const totalUnpaidSetahun = MONTHS_ID.filter(m => !paidMonths.includes(m));
                const sisaTunggakanUpToNow = unpaidMonthsUpToNow.length * rate;
                const sisaTunggakanSetahun = totalUnpaidSetahun.length * rate;

                return (
                  <div className="bg-[#070d1a] border border-white/10 rounded-2xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                          <Calendar size={16} className="text-blue-400" /> Status Setoran Iuran 12 Bulan (Tahun 2026)
                        </h4>
                        <p className="text-slate-500 text-[10px] sm:text-xs font-semibold mt-0.5">
                          Tipe iuran: <span className="text-slate-300 font-extrabold">{activeRecap.kategoriAtlet.includes('Binaan') ? 'Iuran Binaan (250k/bln)' : 'Iuran Reguler (10k/bln)'}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 text-right">
                        <div className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-left">
                          <span className="text-[7.5px] font-black uppercase text-red-400 tracking-wider">Tunggakan s.d. Bulan Ini</span>
                          <p className="text-xs font-black text-white mt-0.5">Rp {sisaTunggakanUpToNow.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-xl text-left">
                          <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Sisa Belum Bayar Setahun</span>
                          <p className="text-xs font-black text-white mt-0.5">Rp {sisaTunggakanSetahun.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                      {MONTHS_ID.map((month, idx) => {
                        const isPaid = paidMonths.includes(month);
                        const isUpcoming = idx > currentMonthIdx;
                        
                        let statusColor = 'bg-slate-900/40 text-slate-500 border-white/5';
                        let statusLabel = 'Mendatang';
                        
                        if (isPaid) {
                          statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                          statusLabel = 'Lunas';
                        } else if (!isUpcoming) {
                          statusColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                          statusLabel = 'Belum Lunas';
                        }

                        return (
                          <div key={month} className={`border p-2 rounded-xl flex flex-col justify-between text-center transition-all ${statusColor}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">{month}</span>
                            <div className="mt-1">
                              <span className="text-[8px] font-black uppercase tracking-widest">{statusLabel}</span>
                              {isPaid && (
                                <p className="text-[7.5px] font-semibold mt-0.5 opacity-85">Rp {rate.toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Grid 2 Columns for Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                
                {/* Left Side: Ledger Breakdown */}
                <div className="md:col-span-4 space-y-3.5 bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1.5 flex items-center gap-1">
                    <Info size={11} className="text-blue-400" /> Rincian Kontribusi
                  </h4>
                  
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Iuran Bulanan (10k):</span>
                      <span className="font-bold text-slate-300">Rp {activeRecap.iuranBulanan.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Iuran Binaan:</span>
                      <span className="font-bold text-slate-300">Rp {activeRecap.iuranBinaan.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Beli Shuttlecock:</span>
                      <span className="font-bold text-slate-300">Rp {activeRecap.shuttlecock.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Pendaftaran Atlet:</span>
                      <span className="font-bold text-slate-300">Rp {activeRecap.pendaftaranBaru.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sumbangan Sukarela:</span>
                      <span className="font-bold text-slate-300">Rp {activeRecap.sumbangan.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                    <p className="text-[8px] text-slate-500 leading-normal">
                      {isAdmin 
                        ? '* Semua perubahan data kontribusi kas di sini akan langsung memperbarui kalkulasi laporan keuangan rekapitulasi utama dan saldo kas bendahara.'
                        : '* Rincian riwayat kontribusi kas Anda yang tercatat secara resmi di database klub PB Bilibili 162.'}
                    </p>
                    
                    {!showTxForm && isAdmin && (
                      <button 
                        type="button" 
                        onClick={handleOpenAddTx}
                        className="w-full mt-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-600/20"
                      >
                        <Plus size={12} /> Tambah Kontribusi
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Side: Tx History or Add/Edit Tx Form */}
                <div className="md:col-span-8 space-y-4">
                  
                  {/* Embedded Form */}
                  {showTxForm && (
                    <form onSubmit={handleSaveTransaction} className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                          {isEditingTx ? 'Edit Catatan Kontribusi' : 'Tambah Kontribusi Baru'}
                        </h4>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowTxForm(false);
                            setIsEditingTx(false);
                            setEditingTxId(null);
                            setTxForm(initialTxForm);
                          }}
                          className="text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-white/5 rounded-lg hover:bg-white/10"
                        >
                          Tutup Form
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Tanggal Transaksi</label>
                          <input 
                            required 
                            type="date" 
                            value={txForm.tanggal_transaksi} 
                            onChange={e => setTxForm({ ...txForm, tanggal_transaksi: e.target.value })} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 text-xs font-semibold" 
                          />
                        </div>
                        
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Kategori Kontribusi</label>
                          <select 
                            value={txForm.kategori} 
                            onChange={e => handleKategoriChange(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer text-slate-100"
                          >
                            <optgroup label="Pemasukan (Income)">
                              {DAFTAR_PEMASUKAN.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Pengeluaran / Lainnya">
                              <option value="Pembelian Shuttlecock">Pembelian Shuttlecock</option>
                              <option value="Penyewaan Lapangan">Penyewaan Lapangan</option>
                              <option value="Biaya Konsumsi">Biaya Konsumsi</option>
                              <option value="Biaya Turnamen / Event">Biaya Turnamen / Event</option>
                              <option value="Alat Tulis & Administrasi">Alat Tulis & Administrasi</option>
                              <option value="Lain-lain">Lain-lain</option>
                            </optgroup>
                          </select>
                        </div>

                        {(txForm.kategori === 'Iuran Bulanan Tetap (10k)' || txForm.kategori === 'Pembayaran Iuran Binaan') && (
                          <div className="sm:col-span-2 space-y-2 bg-[#070d1a] border border-white/5 p-3 rounded-xl">
                            <label className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Pilih Bulan Pembayaran</label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                              {MONTHS_ID.map(month => {
                                const isSelected = selectedFormMonths.includes(month);
                                return (
                                  <button
                                    key={month}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedFormMonths(selectedFormMonths.filter(m => m !== month));
                                      } else {
                                        setSelectedFormMonths([...selectedFormMonths, month]);
                                      }
                                    }}
                                    className={`py-1 rounded-lg text-[9px] font-bold transition-all border text-center ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                        : 'bg-black/30 text-slate-400 border-white/10 hover:border-slate-500'
                                    }`}
                                  >
                                    {month.substring(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[8px] text-slate-500 italic">
                              * Terpilih {selectedFormMonths.length} bulan. Total: Rp {(txForm.jumlah_bayar).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {txForm.kategori === 'Pembayaran Shuttlecock' && (
                          <>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Tipe Anggota</label>
                              <select 
                                value={txForm.tipe_anggota} 
                                onChange={e => handleTipeAnggotaChange(e.target.value)} 
                                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer text-slate-100"
                              >
                                <option value="Anggota Tetap">Anggota Tetap (Rp 4.000 / Cock)</option>
                                <option value="Anggota Luar Biasa">Anggota Luar Biasa (Rp 5.000 / Cock)</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Jumlah Shuttlecock (Bola)</label>
                              <input 
                                required 
                                type="number" 
                                min="1" 
                                value={txForm.jumlah_bola} 
                                onChange={e => handleJumlahBolaChange(parseInt(e.target.value) || 0)} 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 text-xs font-semibold" 
                              />
                            </div>
                          </>
                        )}

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Nominal Pembayaran (Rp)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                            <input 
                              required 
                              type="text" 
                              inputMode="numeric"
                              disabled={txForm.kategori === 'Pembayaran Shuttlecock'} // Auto-calculated!
                              value={formatRupiah(txForm.jumlah_bayar)} 
                              onChange={e => setTxForm({ ...txForm, jumlah_bayar: parseRupiah(e.target.value) })} 
                              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white outline-none focus:border-blue-500 text-xs font-semibold disabled:opacity-50" 
                            />
                          </div>
                          {txForm.kategori === 'Pembayaran Shuttlecock' ? (
                            <span className="text-[8px] text-slate-500 italic mt-0.5 block font-medium">Nominal dihitung otomatis dari jumlah bola</span>
                          ) : (
                            txForm.jumlah_bayar > 0 && (
                              <div className="mt-1.5 text-[8px] text-blue-400 font-bold bg-blue-950/20 border border-blue-900/20 px-2.5 py-1 rounded italic leading-tight">
                                {terbilang(txForm.jumlah_bayar)}
                              </div>
                            )
                          )}
                          {txForm.kategori !== 'Pembayaran Shuttlecock' && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <button 
                                type="button"
                                onClick={() => setTxForm({ ...txForm, jumlah_bayar: 10000 })}
                                className="px-2 py-0.5 bg-white/5 hover:bg-blue-600/20 text-[8px] font-black uppercase tracking-wider text-slate-300 hover:text-blue-400 rounded border border-white/5 transition-all"
                              >
                                Set 10k
                              </button>
                              <button 
                                type="button"
                                onClick={() => setTxForm({ ...txForm, jumlah_bayar: (txForm.jumlah_bayar || 0) + 10000 })}
                                className="px-2 py-0.5 bg-white/5 hover:bg-emerald-600/20 text-[8px] font-black uppercase tracking-wider text-slate-300 hover:text-emerald-400 rounded border border-white/5 transition-all"
                              >
                                +10k
                              </button>
                              <button 
                                type="button"
                                onClick={() => setTxForm({ ...txForm, jumlah_bayar: (txForm.jumlah_bayar || 0) + 50000 })}
                                className="px-2 py-0.5 bg-white/5 hover:bg-emerald-600/20 text-[8px] font-black uppercase tracking-wider text-slate-300 hover:text-emerald-400 rounded border border-white/5 transition-all"
                              >
                                +50k
                              </button>
                              <button 
                                type="button"
                                onClick={() => setTxForm({ ...txForm, jumlah_bayar: (txForm.jumlah_bayar || 0) + 100000 })}
                                className="px-2 py-0.5 bg-white/5 hover:bg-emerald-600/20 text-[8px] font-black uppercase tracking-wider text-slate-300 hover:text-emerald-400 rounded border border-white/5 transition-all"
                              >
                                +100k
                              </button>
                              {txForm.jumlah_bayar > 0 && (
                                <button 
                                  type="button"
                                  onClick={() => setTxForm({ ...txForm, jumlah_bayar: 0 })}
                                  className="px-2 py-0.5 bg-red-950/40 hover:bg-red-900/60 text-[8px] font-black uppercase tracking-wider text-red-400 rounded border border-red-900/40 transition-all ml-auto"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Jenis Transaksi</label>
                          <select 
                            value={txForm.jenis_transaksi} 
                            disabled={DAFTAR_PEMASUKAN.includes(txForm.kategori)} // Auto-determined
                            onChange={e => setTxForm({ ...txForm, jenis_transaksi: e.target.value as 'Masuk' | 'Keluar' })} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 text-xs font-semibold disabled:opacity-50 text-slate-100"
                          >
                            <option value="Masuk">Masuk (Penerimaan Kas)</option>
                            <option value="Keluar">Keluar (Pengeluaran Kas)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Keterangan Tambahan (Opsional)</label>
                        <input 
                          type="text" 
                          placeholder="Contoh: Pembayaran Kas bulan Juli 2026"
                          value={txForm.keterangan} 
                          onChange={e => setTxForm({ ...txForm, keterangan: e.target.value })} 
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500 text-xs font-medium placeholder:text-zinc-600" 
                        />
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowTxForm(false);
                            setIsEditingTx(false);
                            setEditingTxId(null);
                            setTxForm(initialTxForm);
                          }} 
                          className="flex-1 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit" 
                          disabled={savingTx}
                          className="flex-1 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                        >
                          {savingTx ? (
                            <>
                              <Loader2 className="animate-spin" size={10} /> Menyimpan...
                            </>
                          ) : (
                            'Simpan Kontribusi'
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Transaction History Log Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <ArrowRight size={11} className="text-blue-400" /> Riwayat Transaksi Kontribusi
                    </h4>
                    <span className="text-[9px] text-slate-500 font-extrabold">{sortedActiveTransactions.length} Log Transaksi</span>
                  </div>

                  {/* Transaction List */}
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                    {sortedActiveTransactions.length === 0 ? (
                      <div className="p-8 text-center border border-white/5 bg-black/10 rounded-xl">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Belum Ada Riwayat Kontribusi Kas</p>
                        <p className="text-slate-600 text-[10px] mt-1 font-medium">Silakan tambahkan kontribusi perdana untuk anggota ini.</p>
                      </div>
                    ) : (
                      sortedActiveTransactions.map(tx => (
                        <div key={tx.id} className="bg-slate-950/40 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-white/10 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                tx.jenis_transaksi === 'Masuk' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {tx.jenis_transaksi === 'Masuk' ? 'Pemasukan' : 'Pengeluaran'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-300">{tx.kategori}</span>
                              {tx.jumlah_bola > 0 && (
                                <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                                  {tx.jumlah_bola} Bola
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-semibold">
                              <Calendar size={10} />
                              <span>{new Date(tx.tanggal_transaksi).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              {tx.keterangan && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-slate-400 italic truncate max-w-[200px]">{tx.keterangan}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
                            <span className={`text-xs font-black tracking-tight ${
                              tx.jenis_transaksi === 'Masuk' ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {tx.jenis_transaksi === 'Masuk' ? '+' : '-'} Rp {tx.jumlah_bayar.toLocaleString()}
                            </span>
                            
                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  type="button"
                                  onClick={() => handleOpenEditTx(tx)}
                                  className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Edit Transaksi"
                                >
                                  <Edit size={12} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-white/5 bg-black/20 shrink-0 flex items-center justify-end">
              <button 
                type="button" 
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedMember(null);
                }} 
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
