/**
 * Central Local Database for PB Bilibili 162
 * Provides rich, realistic, authentic local data for all frontend components
 * when Supabase is offline or to ensure instant data availability.
 */

export interface LocalBerita {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  kategori: string;
  gambar_url: string;
  tanggal: string;
  penulis: string;
  views: number;
  likes: number;
  comments_count: number;
}

export interface LocalKomentar {
  id: string;
  berita_id: string;
  nama_user: string;
  isi_komentar: string;
  tanggal: string;
}

export interface LocalPendaftaran {
  id: string;
  nama: string;
  email: string;
  whatsapp: string;
  kategori_atlet: string;
  kategori: string;
  jenis_kelamin: string;
  alamat: string;
  pengalaman: string;
  status: string;
  foto_url?: string;
  created_at: string;
}

export interface LocalRanking {
  id: string;
  pendaftaran_id?: string;
  player_name: string;
  photo_url?: string;
  poin: number;
  bonus: number;
  total_points: number;
  seed: string;
  category: string;
  updated_at: string;
}

export interface LocalKas {
  id: string;
  tanggal_transaksi: string;
  nama_pembayar: string;
  kategori: string;
  jenis_transaksi: 'Masuk' | 'Keluar';
  jumlah_bayar: number;
  keterangan: string;
  created_at?: string;
}

export interface LocalGalleryItem {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  url: string;
  video_url?: string;
  thumbnail_url?: string;
  category: string;
  created_at: string;
  likes_count?: number;
  views_count?: number;
}

export interface LocalPrestasi {
  id: string;
  judul_prestasi: string;
  kejuaraan: string;
  tahun: string;
  kategori: string;
  nama_atlet: string;
  peringkat: string;
  medali?: 'Emas' | 'Perak' | 'Perunggu';
  foto_url: string;
  deskripsi: string;
}

export interface LocalProgram {
  id: string;
  nama_program: string;
  kategori_usia: string;
  jadwal: string;
  durasi: string;
  pelatih: string;
  biaya: string;
  deskripsi: string;
  target: string;
  materi: string[];
}

export interface LocalFAQ {
  id: string;
  kategori: string;
  pertanyaan: string;
  jawaban: string;
}

export interface LocalInventaris {
  id: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  satuan: string;
  kondisi: 'Baik' | 'Perlu Perbaikan' | 'Rusak';
  lokasi: string;
  tanggal_pengadaan: string;
  keterangan: string;
}

export interface LocalDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_type: string;
  file_size: string;
  created_at: string;
}

export interface LocalStructureMember {
  id: string;
  name: string;
  role: string;
  category: string;
  level: number;
  sort_order: number;
  photo_url: string;
  bio?: string;
}

// 1. DATA BERITA LOKAL
export const DEFAULT_BERITA: LocalBerita[] = [
  {
    id: 'news-1',
    judul: 'Gelar Juara Umum Kejurkot Parepare 2026 Sukses Diraih Atlet PB Bilibili 162',
    ringkasan: 'Skuad PB Bilibili 162 berhasil mendominasi podium di seluruh nomor tunggal dan ganda putra dengan perolehan 4 medali emas dan 2 perak.',
    konten: `Prestasi membanggakan kembali diukir oleh keluarga besar PB Bilibili 162. Dalam turnamen resmi Kejurkot Parepare 2026 yang berlangsung di GOR SMAN 4 Parepare pada akhir pekan lalu, atlet-atlet binaan klub berhasil keluar sebagai Juara Umum.\n\nKetua Umum PB Bilibili 162, H. Wawan, menyampaikan apresiasi setinggi-tingginya kepada para atlet, tim pelatih, serta para orang tua yang senantiasa memberikan dukungan penuh.\n\n"Ini adalah buah dari kerja keras, kedisiplinan latihan setiap Rabu, Jumat, dan Ahad, serta program evaluasi fisik yang kita jalankan secara terukur," ungkap beliau saat sambutan perayaan kemenangan.\n\nKemenangan ini sekaligus memastikan langkah atlet PB Bilibili 162 menuju seleksi Kejurda Sulawesi Selatan mendatang.`,
    kategori: 'PRESTASI',
    gambar_url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200',
    tanggal: '2026-08-10T08:30:00Z',
    penulis: 'Humas PB Bilibili 162',
    views: 342,
    likes: 58,
    comments_count: 5
  },
  {
    id: 'news-2',
    judul: 'Pelatihan Intensif Footwork & Agility Bersama Pelatih Nasional PB Bilibili 162',
    ringkasan: 'Program peningkatan kelincahan gerak kaki dan daya tahan fisik atlet muda resmi dimulai di GOR A4 Soreang dengan metode sport science terkini.',
    konten: `Memasuki paruh kedua tahun 2026, PB Bilibili 162 menggelar training camp khusus bertajuk "Elite Footwork & Tactical Agility".\n\nPelatihan ini difokuskan pada penguatan pergerakan 8 penjuru lapangan (footwork), kecepatan reaksi pengembalian bola drive pendek, serta penempatan bola smash tajam menyilang.\n\nPelatih Kepala menegaskan bahwa penguasaan teknik dasar yang solid dan stamina prima adalah kunci utama untuk menembus persaingan bulutangkis modern.`,
    kategori: 'PELATIHAN',
    gambar_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200',
    tanggal: '2026-08-04T10:00:00Z',
    penulis: 'Tim Kepelatihan',
    views: 285,
    likes: 42,
    comments_count: 3
  },
  {
    id: 'news-3',
    judul: 'Mabar Akbar & Silaturahmi Antar-Klub Se-Sulawesi Selatan Sukses Digelar',
    ringkasan: 'Ratusan pebulutangkis dari berbagai daerah berkumpul dalam agenda silaturahmi olahraga dan uji tanding persahabatan di markas PB Bilibili 162.',
    konten: `Semangat kekeluargaan dan sportivitas terpancar dalam acara Main Bareng (Mabar) Akbar PB Bilibili 162 yang diikuti oleh perwakilan klub dari Sidrap, Pinrang, Barru, dan Makassar.\n\nSelain ajang sparring uji coba mental tanding, kegiatan ini juga menjadi momen mempererat tali silaturahmi sesama pecinta olahraga bulutangkis. Acara ditutup dengan santap malam bersama dan pembagian doorprize menarik dari para sponsor.`,
    kategori: 'KEGIATAN',
    gambar_url: 'https://images.unsplash.com/photo-1613918431201-49638531a8cb?q=80&w=1200',
    tanggal: '2026-07-28T14:15:00Z',
    penulis: 'Humas PB Bilibili 162',
    views: 410,
    likes: 76,
    comments_count: 8
  },
  {
    id: 'news-4',
    judul: 'Penerimaan Anggota Baru & Seleksi Beasiswa Pembinaan Usia Dini PB Bilibili 162',
    ringkasan: 'Pendaftaran gelombang kedua untuk kategori Usia Dini, Anak-anak, dan Pemula telah resmi dibuka secara online melalui website resmi klub.',
    konten: `PB Bilibili 162 kembali membuka kesempatan bagi putra-putri berbakat di Kota Parepare dan sekitarnya untuk bergabung dalam program pembinaan atlet muda.\n\nPendaftaran dapat dilakukan secara langsung di menu Registrasi pada aplikasi ini atau mengunjungi sekretariat lapangan pada hari Rabu, Jumat, dan Ahad. Klub juga menyediakan fasilitas beasiswa perlengkapan bagi atlet berprestasi yang lolos tahap seleksi tim pelatih.`,
    kategori: 'INFORMASI',
    gambar_url: 'https://images.unsplash.com/photo-1560079007-a5327045b403?q=80&w=1200',
    tanggal: '2026-07-15T09:00:00Z',
    penulis: 'Sekretariat Pendaftaran',
    views: 520,
    likes: 64,
    comments_count: 6
  }
];

// 2. DATA KOMENTAR LOKAL
export const DEFAULT_KOMENTAR: LocalKomentar[] = [
  {
    id: 'c-1',
    berita_id: 'news-1',
    nama_user: 'Rahmat Hidayat',
    isi_komentar: 'Selamat untuk adik-adik atlet PB Bilibili 162! Terus pertahankan mental juara dan rendah hati.',
    tanggal: '2026-08-10T11:20:00Z'
  },
  {
    id: 'c-2',
    berita_id: 'news-1',
    nama_user: 'Budi Santoso',
    isi_komentar: 'Luar biasa perjuangan tim di partai final ganda putra kemarin! Smash dan defence-nya sangat solid.',
    tanggal: '2026-08-10T12:05:00Z'
  },
  {
    id: 'c-3',
    berita_id: 'news-2',
    nama_user: 'Coach Hendra',
    isi_komentar: 'Footwork adalah pondasi utama. Semangat anak-anak berlatih di sesi latihan berikutnya!',
    tanggal: '2026-08-04T15:30:00Z'
  }
];

// 3. DATA PENDAFTARAN & ATLET LOKAL
export const DEFAULT_PENDAFTARAN: LocalPendaftaran[] = [
  {
    id: 'p-101',
    nama: 'H. WAWAN',
    email: 'wawan.pb162@gmail.com',
    whatsapp: '081234567801',
    kategori_atlet: 'Veteran',
    kategori: 'Veteran',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Jl. Jenderal Sudirman No. 12, Parepare',
    pengalaman: 'Ketua Umum & Atlet Senior PB Bilibili 162',
    status: 'Active',
    foto_url: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png',
    created_at: '2026-01-05T08:00:00Z'
  },
  {
    id: 'p-102',
    nama: 'H. BARHAMAN MUIN S.AG',
    email: 'barhaman.muin@gmail.com',
    whatsapp: '081234567802',
    kategori_atlet: 'Veteran',
    kategori: 'Veteran',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Jl. Pemuda No. 45, Parepare',
    pengalaman: 'Sekretaris Jenderal & Koordinator Pertandingan',
    status: 'Active',
    foto_url: 'https://ui-avatars.com/api/?name=Barhaman+Muin&background=0284c7&color=fff&size=200',
    created_at: '2026-01-08T08:00:00Z'
  },
  {
    id: 'p-103',
    nama: 'H. UDE',
    email: 'h.ude.coach@gmail.com',
    whatsapp: '081234567803',
    kategori_atlet: 'Senior',
    kategori: 'Senior',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Soreang, Parepare',
    pengalaman: 'Kepala Pelatih & Manajer Tim PB Bilibili 162',
    status: 'Active',
    foto_url: 'https://ui-avatars.com/api/?name=H+Ude&background=10b981&color=fff&size=200',
    created_at: '2026-01-10T08:00:00Z'
  },
  {
    id: 'p-104',
    nama: 'MAS AHMAD',
    email: 'mas.ahmad.smash@gmail.com',
    whatsapp: '081234567804',
    kategori_atlet: 'Senior',
    kategori: 'Senior',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Ujung Bulu, Parepare',
    pengalaman: 'Pemain Ganda Utama & Finalis Kejurda',
    status: 'Active',
    foto_url: 'https://ui-avatars.com/api/?name=Mas+Ahmad&background=f59e0b&color=fff&size=200',
    created_at: '2026-01-12T08:00:00Z'
  },
  {
    id: 'p-105',
    nama: 'ALI',
    email: 'ali.badminton162@gmail.com',
    whatsapp: '081234567805',
    kategori_atlet: 'Senior',
    kategori: 'Senior',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Jl. Veteran No. 88, Parepare',
    pengalaman: 'Juara 1 Ganda Putra Kejurkot 2026',
    status: 'Active',
    foto_url: 'https://ui-avatars.com/api/?name=Ali+Badminton&background=8b5cf6&color=fff&size=200',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'p-106',
    nama: 'ABD. MAJID',
    email: 'abd.majid.pb@gmail.com',
    whatsapp: '081234567806',
    kategori_atlet: 'Senior',
    kategori: 'Senior',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Bacukiki Barat, Parepare',
    pengalaman: 'Spesialis Defence & Playmaker Ganda',
    status: 'Active',
    foto_url: 'https://ui-avatars.com/api/?name=Abd+Majid&background=ec4899&color=fff&size=200',
    created_at: '2026-01-20T08:00:00Z'
  },
  {
    id: 'p-107',
    nama: 'OWAN',
    email: 'owan.smash@gmail.com',
    whatsapp: '081234567807',
    kategori_atlet: 'Taruna',
    kategori: 'Taruna',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Lumpue, Parepare',
    pengalaman: 'Atlet Muda Berbakat PB Bilibili 162',
    status: 'Active',
    foto_url: 'https://ui-avatars.com/api/?name=Owan+PB&background=14b8a6&color=fff&size=200',
    created_at: '2026-02-01T08:00:00Z'
  },
  {
    id: 'p-108',
    nama: 'FAHRI RAMADHAN',
    email: 'fahri.r@gmail.com',
    whatsapp: '081234567808',
    kategori_atlet: 'Remaja',
    kategori: 'Remaja',
    jenis_kelamin: 'Laki-Laki',
    alamat: 'Jl. Bau Massepe, Parepare',
    pengalaman: 'Juara Tunggal Putra Remaja Kota Parepare',
    status: 'Active',
    foto_url: 'https://ui-avatars.com/api/?name=Fahri+Ramadhan&background=6366f1&color=fff&size=200',
    created_at: '2026-02-10T08:00:00Z'
  }
];

// 4. DATA RANKINGS & ATLET STATS LOKAL
export const DEFAULT_RANKINGS: LocalRanking[] = [
  {
    id: 'rank-1',
    pendaftaran_id: 'p-105',
    player_name: 'ALI',
    photo_url: 'https://ui-avatars.com/api/?name=Ali+Badminton&background=8b5cf6&color=fff&size=200',
    poin: 1850,
    bonus: 250,
    total_points: 2100,
    seed: 'Seed 1',
    category: 'SENIOR',
    updated_at: '2026-08-12T10:00:00Z'
  },
  {
    id: 'rank-2',
    pendaftaran_id: 'p-104',
    player_name: 'MAS AHMAD',
    photo_url: 'https://ui-avatars.com/api/?name=Mas+Ahmad&background=f59e0b&color=fff&size=200',
    poin: 1720,
    bonus: 200,
    total_points: 1920,
    seed: 'Seed 2',
    category: 'SENIOR',
    updated_at: '2026-08-12T10:00:00Z'
  },
  {
    id: 'rank-3',
    pendaftaran_id: 'p-106',
    player_name: 'ABD. MAJID',
    photo_url: 'https://ui-avatars.com/api/?name=Abd+Majid&background=ec4899&color=fff&size=200',
    poin: 1600,
    bonus: 180,
    total_points: 1780,
    seed: 'Seed 3',
    category: 'SENIOR',
    updated_at: '2026-08-12T10:00:00Z'
  },
  {
    id: 'rank-4',
    pendaftaran_id: 'p-107',
    player_name: 'OWAN',
    photo_url: 'https://ui-avatars.com/api/?name=Owan+PB&background=14b8a6&color=fff&size=200',
    poin: 1480,
    bonus: 150,
    total_points: 1630,
    seed: 'Seed 4',
    category: 'TARUNA',
    updated_at: '2026-08-12T10:00:00Z'
  },
  {
    id: 'rank-5',
    pendaftaran_id: 'p-103',
    player_name: 'H. UDE',
    photo_url: 'https://ui-avatars.com/api/?name=H+Ude&background=10b981&color=fff&size=200',
    poin: 1400,
    bonus: 120,
    total_points: 1520,
    seed: 'Seed 5',
    category: 'SENIOR',
    updated_at: '2026-08-12T10:00:00Z'
  },
  {
    id: 'rank-6',
    pendaftaran_id: 'p-101',
    player_name: 'H. WAWAN',
    photo_url: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png',
    poin: 1350,
    bonus: 100,
    total_points: 1450,
    seed: 'Seed 6',
    category: 'VETERAN',
    updated_at: '2026-08-12T10:00:00Z'
  },
  {
    id: 'rank-7',
    pendaftaran_id: 'p-108',
    player_name: 'FAHRI RAMADHAN',
    photo_url: 'https://ui-avatars.com/api/?name=Fahri+Ramadhan&background=6366f1&color=fff&size=200',
    poin: 1250,
    bonus: 100,
    total_points: 1350,
    seed: 'Non-Seed',
    category: 'REMAJA',
    updated_at: '2026-08-12T10:00:00Z'
  },
  {
    id: 'rank-8',
    pendaftaran_id: 'p-102',
    player_name: 'H. BARHAMAN MUIN S.AG',
    photo_url: 'https://ui-avatars.com/api/?name=Barhaman+Muin&background=0284c7&color=fff&size=200',
    poin: 1200,
    bonus: 80,
    total_points: 1280,
    seed: 'Non-Seed',
    category: 'VETERAN',
    updated_at: '2026-08-12T10:00:00Z'
  }
];

// 5. DATA KAS LOKAL
export const DEFAULT_KAS: LocalKas[] = [
  {
    id: 'kas-1',
    tanggal_transaksi: '2026-08-01',
    nama_pembayar: 'Kas Masuk Awal Bulan',
    kategori: 'Saldo Awal',
    jenis_transaksi: 'Masuk',
    jumlah_bayar: 5500000,
    keterangan: 'Sisa saldo kas pembukuan bulan Juli 2026'
  },
  {
    id: 'kas-2',
    tanggal_transaksi: '2026-08-03',
    nama_pembayar: 'H. WAWAN',
    kategori: 'Iuran Bulanan',
    jenis_transaksi: 'Masuk',
    jumlah_bayar: 150000,
    keterangan: 'Iuran wajib anggota bulan Agustus 2026'
  },
  {
    id: 'kas-3',
    tanggal_transaksi: '2026-08-03',
    nama_pembayar: 'MAS AHMAD',
    kategori: 'Iuran Bulanan',
    jenis_transaksi: 'Masuk',
    jumlah_bayar: 150000,
    keterangan: 'Iuran wajib anggota bulan Agustus 2026'
  },
  {
    id: 'kas-4',
    tanggal_transaksi: '2026-08-04',
    nama_pembayar: 'ALI',
    kategori: 'Iuran Bulanan',
    jenis_transaksi: 'Masuk',
    jumlah_bayar: 150000,
    keterangan: 'Iuran wajib anggota bulan Agustus 2026'
  },
  {
    id: 'kas-5',
    tanggal_transaksi: '2026-08-05',
    nama_pembayar: 'Toko Olahraga Jaya Parepare',
    kategori: 'Pembelian Shuttlecock',
    jenis_transaksi: 'Keluar',
    jumlah_bayar: 850000,
    keterangan: 'Pembelian 3 slop Shuttlecock Yonex Aerosensa 30'
  },
  {
    id: 'kas-6',
    tanggal_transaksi: '2026-08-07',
    nama_pembayar: 'Pengelola GOR SMAN 4',
    kategori: 'Sewa Lapangan',
    jenis_transaksi: 'Keluar',
    jumlah_bayar: 600000,
    keterangan: 'Sewa lapangan 4 sesi latihan mingguan'
  },
  {
    id: 'kas-7',
    tanggal_transaksi: '2026-08-09',
    nama_pembayar: 'Sponsorship Mabar Arsy',
    kategori: 'Sponsorship / Donasi',
    jenis_transaksi: 'Masuk',
    jumlah_bayar: 2000000,
    keterangan: 'Dana sponsorship turnamen dan pembinaan atlet'
  },
  {
    id: 'kas-8',
    tanggal_transaksi: '2026-08-11',
    nama_pembayar: 'Konsumsi Latihan & Sparring',
    kategori: 'Konsumsi & Logistik',
    jenis_transaksi: 'Keluar',
    jumlah_bayar: 350000,
    keterangan: 'Air mineral, buah pisang, dan snack nutrisi atlet'
  },
  {
    id: 'kas-9',
    tanggal_transaksi: '2026-08-12',
    nama_pembayar: 'ABD. MAJID',
    kategori: 'Iuran Bulanan',
    jenis_transaksi: 'Masuk',
    jumlah_bayar: 150000,
    keterangan: 'Iuran wajib anggota bulan Agustus 2026'
  },
  {
    id: 'kas-10',
    tanggal_transaksi: '2026-08-13',
    nama_pembayar: 'OWAN',
    kategori: 'Iuran Bulanan',
    jenis_transaksi: 'Masuk',
    jumlah_bayar: 150000,
    keterangan: 'Iuran wajib anggota bulan Agustus 2026'
  }
];

// 6. DATA GALERI LOKAL
export const DEFAULT_GALLERY: LocalGalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Selebrasi Juara Umum Kejurkot Parepare 2026',
    description: 'Momen kebanggaan seluruh skuad atlet, manajer, dan pelatih PB Bilibili 162 mengangkat piala juara umum.',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200',
    category: 'Prestasi',
    created_at: '2026-08-10T09:00:00Z',
    likes_count: 88,
    views_count: 512
  },
  {
    id: 'gal-2',
    title: 'Sesi Latihan Fisik & Footwork Intensif',
    description: 'Para atlet muda berlatih drill footwork di GOR SMAN 4 Parepare didampingi pelatih kepala.',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200',
    category: 'Latihan',
    created_at: '2026-08-05T10:00:00Z',
    likes_count: 64,
    views_count: 390
  },
  {
    id: 'gal-3',
    title: 'Partai Final Ganda Putra Dewasa',
    description: 'Aksi smash tajam pasangan Mas Ahmad & Ali pada pertandingan perebutan medali emas.',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1613918431201-49638531a8cb?q=80&w=1200',
    category: 'Pertandingan',
    created_at: '2026-07-30T15:00:00Z',
    likes_count: 95,
    views_count: 620
  },
  {
    id: 'gal-4',
    title: 'Keluarga Besar PB Bilibili 162 Parepare',
    description: 'Foto bersama dewan penasihat, ketua umum, pengurus inti, serta seluruh atlet dan orang tua.',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1560079007-a5327045b403?q=80&w=1200',
    category: 'Kegiatan',
    created_at: '2026-07-20T17:00:00Z',
    likes_count: 110,
    views_count: 750
  },
  {
    id: 'gal-5',
    title: 'Highlight Video Drill Smash & Defense PB Bilibili 162',
    description: 'Cuplikan video aksi latihan teknik pukulan smash menyilang dan pertahanan ganda.',
    type: 'video',
    url: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
    video_url: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-video-1786206060056.webm',
    thumbnail_url: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/hero-sliders/hero-poster-1786206060056.webp',
    category: 'Video',
    created_at: '2026-08-01T12:00:00Z',
    likes_count: 140,
    views_count: 980
  }
];

// 7. DATA PRESTASI LOKAL
export const DEFAULT_PRESTASI: LocalPrestasi[] = [
  {
    id: 'pres-1',
    judul_prestasi: 'Juara Umum Kejurkot Parepare 2026',
    kejuaraan: 'Kejuaraan Kota Bulutangkis Parepare',
    tahun: '2026',
    kategori: 'Beregu & Perorangan',
    nama_atlet: 'Skuad Atlet PB Bilibili 162',
    peringkat: 'Juara Umum',
    medali: 'Emas',
    foto_url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800',
    deskripsi: 'Meraih 4 Medali Emas dan 2 Perak pada nomor Tunggal Putra, Ganda Putra, dan Ganda Campuran.'
  },
  {
    id: 'pres-2',
    judul_prestasi: 'Juara 1 Ganda Putra Dewasa Open',
    kejuaraan: 'Turnamen Terbuka Se-Sulselbar',
    tahun: '2026',
    kategori: 'Ganda Putra Dewasa',
    nama_atlet: 'Ali & Mas Ahmad',
    peringkat: 'Juara 1',
    medali: 'Emas',
    foto_url: 'https://images.unsplash.com/photo-1613918431201-49638531a8cb?q=80&w=800',
    deskripsi: 'Menumbangkan pasangan unggulan pertama di babak final dengan skor ketat rubber game.'
  },
  {
    id: 'pres-3',
    judul_prestasi: 'Medali Emas Tunggal Remaja Putra',
    kejuaraan: 'Piala Walikota Parepare 2025',
    tahun: '2025',
    kategori: 'Tunggal Remaja Putra',
    nama_atlet: 'Fahri Ramadhan',
    peringkat: 'Juara 1',
    medali: 'Emas',
    foto_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=800',
    deskripsi: 'Tampil dominan tanpa kehilangan satu game pun sepanjang babak penyisihan hingga podium puncak.'
  },
  {
    id: 'pres-4',
    judul_prestasi: 'Runner-Up Ganda Veteran 90+',
    kejuaraan: 'Invitasi Bulutangkis Veteran Sulsel',
    tahun: '2025',
    kategori: 'Ganda Veteran',
    nama_atlet: 'H. Wawan & H. Barhaman Muin',
    peringkat: 'Juara 2',
    medali: 'Perak',
    foto_url: 'https://images.unsplash.com/photo-1560079007-a5327045b403?q=80&w=800',
    deskripsi: 'Performa impresif pasangan senior PB Bilibili 162 berhasil menembus final kejuaraan bergengsi veteran.'
  }
];

// 8. DATA PROGRAM LATIHAN LOKAL
export const DEFAULT_PROGRAM: LocalProgram[] = [
  {
    id: 'prog-1',
    nama_program: 'Program Pembinaan Atlet Usia Dini & Remaja',
    kategori_usia: '6 - 15 Tahun',
    jadwal: 'Rabu & Jumat (08.00 - 10.30 WITA)',
    durasi: '2.5 Jam per Sesi',
    pelatih: 'Head Coach & Tim Pelatih PB Bilibili',
    biaya: 'Rp 200.000 / Bulan',
    deskripsi: 'Program terstruktur untuk menanamkan fundamental footwork, grip raket, teknik pukulan dasar, serta kedisiplinan dan mental bertanding sejak dini.',
    target: 'Mempersiapkan atlet muda untuk kompetisi tingkat kota dan daerah (Kejurkot & Sirnas Regional).',
    materi: [
      'Grip Teknik (Forehand & Backhand Grip Switching)',
      'Basic 6-Point Footwork & Agility Ladder',
      'Drill Clear Lob, Drop Shot, dan Netting Halus',
      'Fisik, Koordinasi Gerak, dan Fleksibilitas'
    ]
  },
  {
    id: 'prog-2',
    nama_program: 'Program Reguler Dewasa & Prestasi Member',
    kategori_usia: '16 Tahun ke Atas / Dewasa',
    jadwal: 'Rabu, Jumat, Ahad (08.00 - 12.00 WITA)',
    durasi: '4 Jam per Sesi',
    pelatih: 'H. Ude & Pelatih Senior',
    biaya: 'Rp 150.000 / Bulan',
    deskripsi: 'Latihan intensif kombinasi drill teknik pukulan drive, smash power, rotasi ganda modern, dan game simulasi kompetitif.',
    target: 'Meningkatkan performa permainan, penguasaan lapangan, dan peringkat internal atlet.',
    materi: [
      'Drill Pertahanan & Counter-Attack Cepat',
      'Rotasi Serangan & Penempatan Posisi Ganda',
      'Drill Smash Power & Jump Smash Timing',
      'Simulasi Pertandingan Sistem Poin Resmi BWF'
    ]
  },
  {
    id: 'prog-3',
    nama_program: 'Program Sparring & Mabar Internal',
    kategori_usia: 'Semua Usia / Terbuka Anggota',
    jadwal: 'Ahad Pagi (08.00 - 12.00 WITA)',
    durasi: '4 Jam',
    pelatih: 'Koordinator Pertandingan',
    biaya: 'Termasuk Iuran Bulanan',
    deskripsi: 'Ajang uji tanding berkala, evaluasi taktik bertanding, dan silaturahmi seluruh anggota keluarga besar klub.',
    target: 'Mengasah mental kompetitif dan kekompakan tim.',
    materi: [
      'Pemanasan Dinamis & Stretching Mandiri',
      'Game Ganda Sistem Kategori & Seedings',
      'Evaluasi Taktik oleh Pelatih',
      'Pembaruan Data Poin & Ranking'
    ]
  }
];

// 9. DATA FAQ LOKAL
export const DEFAULT_FAQ: LocalFAQ[] = [
  {
    id: 'faq-1',
    kategori: 'Pendaftaran',
    pertanyaan: 'Bagaimana cara mendaftar menjadi anggota PB Bilibili 162?',
    jawaban: 'Anda dapat mendaftar secara online melalui menu "Pendaftaran" pada aplikasi ini atau datang langsung ke GOR SMAN 4 Parepare pada jadwal latihan rutin (Rabu, Jumat, atau Ahad pukul 08.00 WITA).'
  },
  {
    id: 'faq-2',
    kategori: 'Biaya & Iuran',
    pertanyaan: 'Berapa biaya iuran bulanan dan pendaftaran anggota baru?',
    jawaban: 'Iuran bulanan anggota adalah Rp 150.000 (sudah termasuk sewa lapangan, shuttlecock berkualitas untuk latihan, dan fasilitas klub). Untuk pendaftaran awal anggota baru sebesar Rp 200.000 (mendapatkan kartu anggota resmi dan merchandise klub).'
  },
  {
    id: 'faq-3',
    kategori: 'Jadwal & Lokasi',
    pertanyaan: 'Kapan jadwal latihan rutin dan di mana lokasi lapangan PB Bilibili 162?',
    jawaban: 'Jadwal latihan rutin kami berlangsung setiap Rabu (08.00-12.00 WITA di GOR SMAN 4 Parepare), Jumat (08.00-12.00 WITA di GOR SMAN 4 Parepare), dan Ahad (08.00-12.00 WITA di GOR A4 Soreang Parepare).'
  },
  {
    id: 'faq-4',
    kategori: 'Pelatihan',
    pertanyaan: 'Apakah ada kelas khusus untuk anak-anak dan pemula yang baru belajar?',
    jawaban: 'Ya, kami memiliki Program Pembinaan Usia Dini yang dibimbing langsung oleh pelatih berlisensi. Program ini dirancang khusus dari teknik dasar memegang raket, langkah kaki (footwork), hingga pembentukan pukulan.'
  },
  {
    id: 'faq-5',
    kategori: 'Sistem Poin & Ranking',
    pertanyaan: 'Bagaimana sistem penilaian poin dan klasemen peringkat atlet dihitung?',
    jawaban: 'Poin dihitung berdasarkan hasil pertandingan internal, keikutsertaan turnamen resmi, tingkat kehadiran latihan rutin, serta bonus kemenangan pada turnamen eksternal. Klasemen diperbarui secara berkala dan dapat dipantau langsung pada menu Klasemen / Rankings.'
  }
];

// 10. DATA INVENTARIS LOKAL
export const DEFAULT_INVENTARIS: LocalInventaris[] = [
  {
    id: 'inv-1',
    nama_barang: 'Shuttlecock Yonex Aerosensa 30 (Slop)',
    kategori: 'Perlengkapan Pertandingan',
    jumlah: 15,
    satuan: 'Slop',
    kondisi: 'Baik',
    lokasi: 'Lemari Penyimpanan GOR SMAN 4',
    tanggal_pengadaan: '2026-08-01',
    keterangan: 'Stok shuttlecock resmi untuk latihan dan sparring'
  },
  {
    id: 'inv-2',
    nama_barang: 'Net Bulutangkis Standar BWF Yonex Pro',
    kategori: 'Fasilitas Lapangan',
    jumlah: 4,
    satuan: 'Unit',
    kondisi: 'Baik',
    lokasi: 'Lapangan 1 - 4 GOR SMAN 4',
    tanggal_pengadaan: '2026-01-15',
    keterangan: 'Kondisi jaring kencang dan terpasang rapi'
  },
  {
    id: 'inv-3',
    nama_barang: 'Papan Skor Digital Elektronik & Remote',
    kategori: 'Elektronik & Scoring',
    jumlah: 2,
    satuan: 'Set',
    kondisi: 'Baik',
    lokasi: 'Meja Wasit Utama GOR',
    tanggal_pengadaan: '2026-03-10',
    keterangan: 'Digunakan untuk turnamen dan simulasi game'
  },
  {
    id: 'inv-4',
    nama_barang: 'Agility Ladder & Cone Training Kit',
    kategori: 'Alat Latihan Fisik',
    jumlah: 6,
    satuan: 'Set',
    kondisi: 'Baik',
    lokasi: 'Gudang Perlengkapan Tim',
    tanggal_pengadaan: '2026-02-20',
    keterangan: 'Perlengkapan drill footwork dan kecepatan reaksi'
  },
  {
    id: 'inv-5',
    nama_barang: 'Kotak P3K Medis & Ice Spray Kompres',
    kategori: 'Kesehatan & Medis',
    jumlah: 2,
    satuan: 'Kotak',
    kondisi: 'Baik',
    lokasi: 'Area Istirahat Atlet',
    tanggal_pengadaan: '2026-07-01',
    keterangan: 'Lengkap dengan perban elastis, analgesik spray, dan obat antiseptik'
  }
];

// 11. DATA DOKUMEN PENTING LOKAL
export const DEFAULT_DOCUMENTS: LocalDocument[] = [
  {
    id: 'doc-1',
    title: 'Anggaran Dasar & Anggaran Rumah Tangga (AD/ART) PB Bilibili 162',
    description: 'Dokumen landasan hukum, visi misi, tata kelola, dan struktur organisasi resmi klub.',
    category: 'Legalitas & AD/ART',
    file_url: '/dokumen/AD_ART_PB_BILIBILI_162.pdf',
    file_type: 'PDF',
    file_size: '2.4 MB',
    created_at: '2026-01-10T08:00:00Z'
  },
  {
    id: 'doc-2',
    title: 'Standar Operasional Prosedur (SOP) Latihan & Kejuaraan',
    description: 'Panduan tata tertib latihan, kedisiplinan, keselamatan atlet, dan ketentuan penggunaan lapangan.',
    category: 'Pedoman & SOP',
    file_url: '/dokumen/SOP_LATIHAN_PB_BILIBILI_162.pdf',
    file_type: 'PDF',
    file_size: '1.8 MB',
    created_at: '2026-01-15T08:00:00Z'
  },
  {
    id: 'doc-3',
    title: 'Formulir Pendaftaran Resmi Atlet & Anggota Baru 2026',
    description: 'Formulir biodata lengkap, surat izin orang tua, dan surat pernyataan komitmen anggota.',
    category: 'Formulir',
    file_url: '/dokumen/FORMULIR_PENDAFTARAN_2026.pdf',
    file_type: 'PDF',
    file_size: '950 KB',
    created_at: '2026-02-01T08:00:00Z'
  },
  {
    id: 'doc-4',
    title: 'Kalender Kejuaraan & Program Turnamen PB Bilibili 162',
    description: 'Jadwal agenda seleksi internal, uji tanding, Kejurkot, dan kejuaraan regional sepanjang tahun 2026.',
    category: 'Kalender Turnamen',
    file_url: '/dokumen/KALENDER_KEJUARAAN_2026.pdf',
    file_type: 'PDF',
    file_size: '1.2 MB',
    created_at: '2026-02-15T08:00:00Z'
  }
];

// 12. DATA STRUKTUR ORGANISASI LOKAL
export const DEFAULT_STRUKTUR: LocalStructureMember[] = [
  {
    id: 'st-1',
    name: 'Dewan Pembina PB Bilibili 162',
    role: 'Pelindung & Penasihat Kehormatan',
    category: 'Penasihat',
    level: 1,
    sort_order: 1,
    photo_url: 'https://ui-avatars.com/api/?name=Dewan+Pembina&background=0b1224&color=fff&size=200',
    bio: 'Memberikan arahan strategis dan dukungan penuh bagi kemajuan bulutangkis Parepare.'
  },
  {
    id: 'st-2',
    name: 'H. WAWAN',
    role: 'Ketua Umum',
    category: 'Pengurus Inti',
    level: 2,
    sort_order: 2,
    photo_url: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/logos/ketua.png',
    bio: 'Memimpin visi klub menuju pembinaan atlet berstandar nasional dan berintegritas.'
  },
  {
    id: 'st-3',
    name: 'H. BARHAMAN MUIN S.AG',
    role: 'Sekretaris Jenderal',
    category: 'Pengurus Inti',
    level: 3,
    sort_order: 3,
    photo_url: 'https://ui-avatars.com/api/?name=Barhaman+Muin&background=0284c7&color=fff&size=200',
    bio: 'Bertanggung jawab atas administrasi kelembagaan, persuratan, dan relasi PBSI.'
  },
  {
    id: 'st-4',
    name: 'MAS AHMAD',
    role: 'Bendahara Umum',
    category: 'Pengurus Inti',
    level: 4,
    sort_order: 4,
    photo_url: 'https://ui-avatars.com/api/?name=Mas+Ahmad&background=f59e0b&color=fff&size=200',
    bio: 'Mengelola transparansi arus kas keuangan klub dan alokasi dana pembinaan atlet.'
  },
  {
    id: 'st-5',
    name: 'H. UDE',
    role: 'Kepala Pelatih (Head Coach)',
    category: 'Kepelatihan',
    level: 5,
    sort_order: 5,
    photo_url: 'https://ui-avatars.com/api/?name=H+Ude&background=10b981&color=fff&size=200',
    bio: 'Menyusun kurikulum pelatihan teknik modern, pembentukan stamina, dan strategi pertandingan.'
  },
  {
    id: 'st-6',
    name: 'ALI',
    role: 'Koord. Pembinaan Prestasi (Binpres)',
    category: 'Bidang-Bidang',
    level: 6,
    sort_order: 6,
    photo_url: 'https://ui-avatars.com/api/?name=Ali+Badminton&background=8b5cf6&color=fff&size=200',
    bio: 'Memantau perkembangan atlet, statistik poin, dan persiapan keikutsertaan turnamen.'
  },
  {
    id: 'st-7',
    name: 'ABD. MAJID',
    role: 'Koord. Sarana & Prasarana Lapangan',
    category: 'Bidang-Bidang',
    level: 6,
    sort_order: 7,
    photo_url: 'https://ui-avatars.com/api/?name=Abd+Majid&background=ec4899&color=fff&size=200',
    bio: 'Memastikan kesiapan fasilitas lapangan, shuttlecock, dan perlengkapan latihan.'
  }
];

// 13. DATA FASILITAS LOKAL
export const DEFAULT_FASILITAS = [
  {
    id: 'fas-1',
    nama: 'Lapangan Standar BWF Vinyl Mats',
    deskripsi: '4 Lapangan berkarpet vinyl anti-slip standar Badminton World Federation untuk meminimalisir risiko cedera lutut dan engkel.',
    gambar_url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800'
  },
  {
    id: 'fas-2',
    nama: 'Pencahayaan LED Anti-Silau 1000 Lux',
    deskripsi: 'Sistem tata lampu modern dengan distribusi cahaya merata tanpa bayangan silau yang mengganggu pandangan shuttlecock.',
    gambar_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=800'
  },
  {
    id: 'fas-3',
    nama: 'Tribun Penonton & Rest Area Representatif',
    deskripsi: 'Kapasitas tribun penonton nyaman, area istirahat ber-AC, serta loker penyimpanan tas dan raket atlet.',
    gambar_url: 'https://images.unsplash.com/photo-1613918431201-49638531a8cb?q=80&w=800'
  },
  {
    id: 'fas-4',
    nama: 'Mesin Digital Stringing & Raket Service',
    deskripsi: 'Layanan pemasangan dan penarikan senar raket dengan akurasi tensi digital tinggi.',
    gambar_url: 'https://images.unsplash.com/photo-1560079007-a5327045b403?q=80&w=800'
  }
];

// 14. INITIALIZE ALL LOCAL STORAGE & LOCAL DATABASE TABLES
export function initializeLocalDatabase() {
  if (typeof window === 'undefined') return;

  const ensureKey = (key: string, data: any) => {
    try {
      const existing = localStorage.getItem(key);
      if (!existing || existing === '[]' || existing === '{}' || existing === 'null') {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {}
  };

  // Seed essential tables
  ensureKey('berita_local_v3', DEFAULT_BERITA);
  ensureKey('cached_berita_list', DEFAULT_BERITA);
  ensureKey('komentar_local_v3', DEFAULT_KOMENTAR);
  
  ensureKey('pendaftaran_local_v3', DEFAULT_PENDAFTARAN);
  ensureKey('cached_pendaftaran', DEFAULT_PENDAFTARAN);
  
  ensureKey('rankings_local_v3', DEFAULT_RANKINGS);
  ensureKey('cached_rankings', DEFAULT_RANKINGS);
  
  ensureKey('kas_local_v3', DEFAULT_KAS);
  ensureKey('cached_kas_pb', DEFAULT_KAS);
  
  ensureKey('gallery_local_v3', DEFAULT_GALLERY);
  ensureKey('cached_gallery', DEFAULT_GALLERY);
  
  ensureKey('prestasi_local_v3', DEFAULT_PRESTASI);
  ensureKey('cached_prestasi', DEFAULT_PRESTASI);
  
  ensureKey('program_local_v3', DEFAULT_PROGRAM);
  ensureKey('cached_program', DEFAULT_PROGRAM);
  
  ensureKey('faq_local_v3', DEFAULT_FAQ);
  ensureKey('cached_faq', DEFAULT_FAQ);
  
  ensureKey('inventaris_local_v3', DEFAULT_INVENTARIS);
  ensureKey('cached_inventaris', DEFAULT_INVENTARIS);
  
  ensureKey('documents_local_v3', DEFAULT_DOCUMENTS);
  ensureKey('cached_documents', DEFAULT_DOCUMENTS);
  
  ensureKey('org_local_v3', DEFAULT_STRUKTUR);
  ensureKey('cached_structure', DEFAULT_STRUKTUR);
  
  ensureKey('fasilitas_local_v3', DEFAULT_FASILITAS);

  // Seed site_settings local caches
  ensureKey('site_setting_gallery_list', DEFAULT_GALLERY);
  ensureKey('site_setting_galeri_list', DEFAULT_GALLERY);
  ensureKey('site_setting_prestasi_list', DEFAULT_PRESTASI);
  ensureKey('site_setting_program_list', DEFAULT_PROGRAM);
  ensureKey('site_setting_faq_list', DEFAULT_FAQ);
  ensureKey('site_setting_inventaris_list', DEFAULT_INVENTARIS);
  ensureKey('site_setting_documents_list', DEFAULT_DOCUMENTS);
}

// Auto-run initialization immediately on module load
if (typeof window !== 'undefined') {
  initializeLocalDatabase();
}
