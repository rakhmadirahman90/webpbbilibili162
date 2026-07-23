import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Download, 
  Trash2, 
  Sliders, 
  Plus, 
  User, 
  Phone, 
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';
import Swal from 'sweetalert2';

interface Booking {
  id: string;
  nama: string;
  whatsapp: string;
  tanggal: string;
  court: string;
  slot: string;
  createdAt: string;
  isCheckIn: boolean;
}

const COURTS = ['Lap. A (Utama)', 'Lap. B (Standar)', 'Lap. C (Latihan)'];
const SLOTS = [
  { id: 'S1', time: '08:00 - 10:00', label: 'Sesi Pagi I' },
  { id: 'S2', time: '10:00 - 12:00', label: 'Sesi Pagi II' },
  { id: 'S3', time: '14:00 - 16:00', label: 'Sesi Siang' },
  { id: 'S4', time: '16:00 - 18:00', label: 'Sesi Sore' },
  { id: 'S5', time: '18:00 - 20:00', label: 'Sesi Malam I' },
  { id: 'S6', time: '20:00 - 22:00', label: 'Sesi Malam II' },
];

const SLOT_MAX_CAPACITY = 6; // Max 6 players per court session

export default function BookingLatihan({ session, isAdmin }: { session: any; isAdmin: boolean }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCourt, setSelectedCourt] = useState<string>(COURTS[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>('S1');
  const [nama, setNama] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [viewMode, setViewMode] = useState<'book' | 'my-bookings' | 'admin-view'>('book');
  const [activeTicket, setActiveTicket] = useState<Booking | null>(null);

  // Load from local storage with DB fallback support
  useEffect(() => {
    const saved = localStorage.getItem('pb_bilibili_bookings');
    if (saved) {
      setBookings(JSON.parse(saved));
    } else {
      // Seed some initial data for visual perfection
      const initial: Booking[] = [
        {
          id: 'B001',
          nama: 'Reza Pahlevi',
          whatsapp: '08123456781',
          tanggal: new Date().toISOString().split('T')[0],
          court: COURTS[0],
          slot: 'S5',
          createdAt: new Date().toISOString(),
          isCheckIn: true
        },
        {
          id: 'B002',
          nama: 'Muhammad Alamsyah',
          whatsapp: '08123456782',
          tanggal: new Date().toISOString().split('T')[0],
          court: COURTS[0],
          slot: 'S5',
          createdAt: new Date().toISOString(),
          isCheckIn: false
        },
        {
          id: 'B003',
          nama: 'Budi Santoso',
          whatsapp: '08123456783',
          tanggal: new Date().toISOString().split('T')[0],
          court: COURTS[1],
          slot: 'S4',
          createdAt: new Date().toISOString(),
          isCheckIn: false
        }
      ];
      setBookings(initial);
      localStorage.setItem('pb_bilibili_bookings', JSON.stringify(initial));
    }

    // Auto-fill form from user profile/session
    if (session?.user) {
      const email = session.user.email || '';
      try {
        const rawSess = localStorage.getItem('local_admin_session');
        if (rawSess) {
          const parsed = JSON.parse(rawSess);
          const meta = parsed?.user?.user_metadata || {};
          if (meta.full_name || meta.nama) setNama(meta.full_name || meta.nama);
          if (meta.whatsapp || meta.phone) setWhatsapp(meta.whatsapp || meta.phone);
        }
      } catch (err) {
        console.error('Error parsing session metadata', err);
      }
    }
  }, [session]);

  const saveBookings = (updated: Booking[]) => {
    setBookings(updated);
    localStorage.setItem('pb_bilibili_bookings', JSON.stringify(updated));
  };

  // Get current slot bookings
  const getSlotBookingsCount = (date: string, court: string, slotId: string) => {
    return bookings.filter(b => b.tanggal === date && b.court === court && b.slot === slotId).length;
  };

  // Handle New Booking
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !whatsapp.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Formulir Tidak Lengkap',
        text: 'Harap isi nama lengkap dan nomor WhatsApp aktif Anda.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    // Check capacity
    const currentCount = getSlotBookingsCount(selectedDate, selectedCourt, selectedSlot);
    if (currentCount >= SLOT_MAX_CAPACITY) {
      Swal.fire({
        icon: 'error',
        title: 'Sesi Penuh',
        text: 'Maaf, slot latihan pada lapangan dan jam tersebut sudah terisi penuh oleh atlet lain.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    // Check duplicate booking on same date & slot by same whatsapp
    const isDuplicate = bookings.some(
      b => b.tanggal === selectedDate && b.slot === selectedSlot && b.whatsapp === whatsapp
    );

    if (isDuplicate) {
      Swal.fire({
        icon: 'warning',
        title: 'Duplikasi Booking',
        text: 'Anda sudah memesan slot latihan pada sesi ini.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    const newBooking: Booking = {
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      nama: nama.trim(),
      whatsapp: whatsapp.trim(),
      tanggal: selectedDate,
      court: selectedCourt,
      slot: selectedSlot,
      createdAt: new Date().toISOString(),
      isCheckIn: false
    };

    const updated = [newBooking, ...bookings];
    saveBookings(updated);
    setActiveTicket(newBooking);

    Swal.fire({
      icon: 'success',
      title: 'Booking Berhasil!',
      text: `Tiket latihan #${newBooking.id} berhasil diterbitkan. Tunjukkan tiket ini saat tiba di lapangan.`,
      background: '#0F172A',
      color: '#FFF'
    });
  };

  // Handle Delete / Cancel Booking
  const handleCancelBooking = (id: string) => {
    Swal.fire({
      title: 'Batalkan Reservasi?',
      text: "Apakah Anda yakin ingin membatalkan pesanan slot latihan ini?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Ya, Batalkan!',
      cancelButtonText: 'Kembali',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = bookings.filter(b => b.id !== id);
        saveBookings(updated);
        Swal.fire({
          title: 'Reservasi Dibatalkan',
          text: 'Reservasi Anda telah sukses dihapus dari jadwal.',
          icon: 'success',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  // Handle Check-In (Admin Only)
  const toggleCheckIn = (id: string) => {
    const updated = bookings.map(b => b.id === id ? { ...b, isCheckIn: !b.isCheckIn } : b);
    saveBookings(updated);
  };

  // Filter Bookings
  const myBookings = bookings.filter(b => b.whatsapp === whatsapp || b.nama.toLowerCase() === nama.toLowerCase());
  const selectedSlotData = SLOTS.find(s => s.id === selectedSlot);

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-6 md:p-8 border border-blue-500/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                Fitur Unggulan v2.0
              </span>
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                <Sparkles size={12} className="animate-pulse" /> Live Availability
              </span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Reservasi & <span className="text-blue-400">Slot Latihan</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
              Hindari antrean panjang dan pastikan lapangan siap untuk sparring Anda. Lakukan booking slot latihan harian secara online dengan mudah, aman, dan instan.
            </p>
          </div>

          <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 shrink-0 select-none">
            <button
              onClick={() => setViewMode('book')}
              className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                viewMode === 'book' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Booking Slot
            </button>
            <button
              onClick={() => setViewMode('my-bookings')}
              className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all relative ${
                viewMode === 'my-bookings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Ticket
              {myBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {myBookings.length}
                </span>
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => setViewMode('admin-view')}
                className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  viewMode === 'admin-view' ? 'bg-red-600 text-white shadow-lg shadow-red-950/50' : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin Panel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* VIEW 1: BOOKING FORM & COURT LAYOUT SELECTOR */}
        {viewMode === 'book' && (
          <>
            {/* Visual Court Selector - Left Col (8 spans) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Step 1: Court & Date Selection */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <CalendarIcon size={14} className="text-blue-500" /> 1. Atur Tanggal & Lokasi Lapangan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Picker */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Pilih Tanggal Latihan</label>
                    <input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Court Selector */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Pilih Lapangan (Court)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {COURTS.map((court) => (
                        <button
                          key={court}
                          onClick={() => setSelectedCourt(court)}
                          className={`p-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-center border ${
                            selectedCourt === court 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          {court.split(' ')[0]} <span className="block text-[8px] font-medium text-slate-500">{court.split(' ')[1] || ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulated Court Visual Map */}
                <div className="mt-6 border border-slate-800 rounded-2xl bg-slate-950 p-4 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500">
                    <MapPin size={10} className="text-red-500" /> Peta Visual GOR PB Bili Bili 162
                  </div>

                  {/* Tennis/Badminton Court SVG Wireframe */}
                  <div className="w-full max-w-[400px] border-4 border-emerald-500 bg-emerald-950/20 aspect-[2/1] rounded-lg relative my-6 shadow-inner flex items-center justify-center">
                    {/* Court lines */}
                    <div className="absolute inset-y-0 left-0 w-1/2 border-r-2 border-emerald-500/60" />
                    <div className="absolute inset-x-0 top-0 h-1/2 border-b-2 border-emerald-500/60" />
                    <div className="absolute inset-y-2 left-2 right-2 border-2 border-emerald-500/40 pointer-events-none" />
                    {/* Net */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-slate-400 shadow flex flex-col justify-between items-center py-1">
                      <div className="w-3 h-3 rounded-full bg-slate-600 border border-slate-400" />
                      <div className="w-3 h-3 rounded-full bg-slate-600 border border-slate-400" />
                    </div>
                    {/* Selected Badge */}
                    <div className="absolute bg-blue-600/90 border border-blue-400 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-300" />
                      {selectedCourt} Terpilih
                    </div>
                  </div>

                  <p className="text-[10px] font-semibold text-slate-500 text-center flex items-center gap-1 justify-center">
                    <Info size={12} className="text-blue-500 shrink-0" /> Lokasi GOR: Jl. Jend. Sudirman No. 162 Parepare (WITA)
                  </p>
                </div>
              </div>

              {/* Step 2: Time Slots Choice */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-blue-500" /> 2. Pilih Jam / Sesi Latihan
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SLOTS.map((slot) => {
                    const bookedCount = getSlotBookingsCount(selectedDate, selectedCourt, slot.id);
                    const isFull = bookedCount >= SLOT_MAX_CAPACITY;
                    const isSelected = selectedSlot === slot.id;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => !isFull && setSelectedSlot(slot.id)}
                        disabled={isFull}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                          isFull 
                            ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-40' 
                            : isSelected
                              ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg' 
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            isFull 
                              ? 'bg-red-950/60 text-red-400' 
                              : isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {slot.label}
                          </span>
                          <div className="text-xs font-black mt-2 tracking-tight">
                            {slot.time}
                          </div>
                        </div>

                        {/* Capacity Status */}
                        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-bold">
                          <span className="text-slate-500">Kuota Terisi:</span>
                          <span className={`flex items-center gap-1 ${
                            isFull ? 'text-red-500' : bookedCount >= 4 ? 'text-amber-500' : 'text-emerald-400'
                          }`}>
                            <Users size={10} /> {bookedCount}/{SLOT_MAX_CAPACITY}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Col: Booking Form (4 spans) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Form Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <User size={14} className="text-blue-500" /> Konfirmasi Data Pemesan
                </h3>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Nama Lengkap Atlet</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input 
                        type="text"
                        required
                        placeholder="Contoh: Andi Wijaya"
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-3 text-xs text-white font-bold outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">No. WhatsApp Aktif</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input 
                        type="tel"
                        required
                        placeholder="Contoh: 08123456789"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-3 text-xs text-white font-bold outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <span className="text-[8px] text-slate-500 mt-1 block">No WhatsApp digunakan untuk verifikasi tiket & integrasi grup latihan.</span>
                  </div>

                  {/* Recap details */}
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/60 space-y-2.5">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest pb-1.5 border-b border-slate-800">
                      Rincian Reservasi
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-500">Tanggal:</span>
                      <span className="text-white">{new Date(selectedDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-500">Lapangan:</span>
                      <span className="text-blue-400">{selectedCourt}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-500">Sesi Jam:</span>
                      <span className="text-amber-400 font-black">{selectedSlotData?.time} ({selectedSlotData?.label})</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <CheckCircle2 size={14} /> Terbitkan Tiket Reservasi
                  </button>
                </form>

                {/* Ticket Popup Trigger if active */}
                {activeTicket && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setActiveTicket(null)}
                      className="w-full py-3 bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                    >
                      <QrCode size={12} className="text-blue-400" /> Lihat Tiket Terakhir Anda
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* VIEW 2: MY TICKETS VIEW */}
        {viewMode === 'my-bookings' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl mx-auto">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <QrCode size={16} className="text-blue-500" /> Daftar Tiket Booking Saya
              </h3>

              {myBookings.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
                  <QrCode size={40} className="text-slate-600 mx-auto mb-3" />
                  <div className="text-slate-300 font-bold text-xs uppercase">Belum Ada Tiket Booking Aktif</div>
                  <p className="text-[10px] text-slate-500 mt-1">Coba isi nama / WhatsApp Anda di panel Booking untuk melacak tiket Anda.</p>
                  <button
                    onClick={() => setViewMode('book')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest rounded-lg"
                  >
                    Booking Sekarang
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myBookings.map((ticket) => {
                    const slotInfo = SLOTS.find(s => s.id === ticket.slot);
                    return (
                      <div 
                        key={ticket.id}
                        className="bg-slate-950 border border-slate-800 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between"
                      >
                        {/* Decorative ticket cutouts */}
                        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-900 rounded-full border border-slate-800" />
                        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-900 rounded-full border border-slate-800" />

                        <div>
                          <div className="flex justify-between items-start pb-4 border-b border-dashed border-slate-800">
                            <div>
                              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase rounded-lg">
                                {ticket.id}
                              </span>
                              <div className="font-black text-slate-300 uppercase text-xs mt-1.5">{ticket.nama}</div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                                ticket.isCheckIn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {ticket.isCheckIn ? 'Checked-In' : 'Active'}
                              </span>
                            </div>
                          </div>

                          <div className="py-4 space-y-2 text-[10px] font-bold">
                            <div className="flex justify-between">
                              <span className="text-slate-500">LAPANGAN:</span>
                              <span className="text-white">{ticket.court}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">TANGGAL:</span>
                              <span className="text-white">{new Date(ticket.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">SESI / JAM:</span>
                              <span className="text-amber-400 font-black">{slotInfo?.time} ({slotInfo?.label})</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Footer */}
                        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(ticket.id)}
                            className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Batal Booking
                          </button>

                          <div className="bg-white p-1 rounded">
                            <QrCode size={36} className="text-slate-900" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: ADMIN PANEL FOR RESERVATIONS */}
        {viewMode === 'admin-view' && isAdmin && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Sliders size={16} className="text-red-500" /> Panel Manajemen Reservasi Admin
                </h3>

                <div className="text-[10px] font-bold text-slate-400">
                  Total Terdaftar: <span className="text-white font-black">{bookings.length} Reservasi</span>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
                  <Sliders size={40} className="text-slate-600 mx-auto mb-3" />
                  <div className="text-slate-300 font-bold text-xs">Belum Ada Data Booking</div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse bg-slate-950">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        <th className="p-4">Kode / ID</th>
                        <th className="p-4">Nama Lengkap</th>
                        <th className="p-4">No. WhatsApp</th>
                        <th className="p-4">Lapangan</th>
                        <th className="p-4">Sesi (Tanggal & Jam)</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-[11px] font-semibold text-slate-300">
                      {bookings.map((booking) => {
                        const slotDetail = SLOTS.find(s => s.id === booking.slot);
                        return (
                          <tr key={booking.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-4 font-black text-blue-400">{booking.id}</td>
                            <td className="p-4 font-bold text-white uppercase">{booking.nama}</td>
                            <td className="p-4 font-medium text-slate-400">{booking.whatsapp}</td>
                            <td className="p-4">{booking.court}</td>
                            <td className="p-4">
                              <span className="text-white block font-black">
                                {new Date(booking.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className="text-[9px] text-slate-500 block">
                                {slotDetail?.time} ({slotDetail?.label})
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => toggleCheckIn(booking.id)}
                                className={`px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider border ${
                                  booking.isCheckIn 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                }`}
                              >
                                {booking.isCheckIn ? 'Checked-In' : 'Pending Check-in'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/10 shadow-sm"
                                title="Batalkan Reservasi"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
