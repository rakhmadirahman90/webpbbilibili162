const fs = require('fs');

// 1. Update AdminAbsensi.tsx
let absensi = fs.readFileSync('src/components/AdminAbsensi.tsx', 'utf-8');
absensi = absensi.replace(
`  const fetchAbsensi = async () => {
    const localAbsensi = JSON.parse(localStorage.getItem('absensi_local') || '[]');
    setAbsensi(localAbsensi.filter((a: any) => a.tanggal === selectedDate));
  };`,
`  const fetchAbsensi = async () => {
    let localAbsensi = JSON.parse(localStorage.getItem('absensi_local') || '[]');
    if (localAbsensi.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const dummyAbsensi = [
        { id: 'abs_1', user_id: 'admin_1', tanggal: today, status: 'hadir', created_at: new Date().toISOString() },
        { id: 'abs_2', user_id: 'member_1', tanggal: today, status: 'hadir', created_at: new Date().toISOString() },
        { id: 'abs_3', user_id: 'member_2', tanggal: today, status: 'izin', created_at: new Date().toISOString() },
        { id: 'abs_4', user_id: 'member_3', tanggal: today, status: 'alfa', created_at: new Date().toISOString() },
      ];
      localStorage.setItem('absensi_local', JSON.stringify(dummyAbsensi));
      localAbsensi = dummyAbsensi;
    }
    setAbsensi(localAbsensi.filter((a: any) => a.tanggal === selectedDate));
  };`
);
fs.writeFileSync('src/components/AdminAbsensi.tsx', absensi);

// 2. Update AdminInventaris.tsx
let inventaris = fs.readFileSync('src/components/AdminInventaris.tsx', 'utf-8');
inventaris = inventaris.replace(
`          const defaultItems = [
            { id: 'inv_1', nama: 'Samsak Tinju', kategori: 'Peralatan', jumlah_total: 5, jumlah_baik: 4, jumlah_rusak: 1, keterangan: 'Beli tahun 2023' },
            { id: 'inv_2', nama: 'Body Protector', kategori: 'Perlengkapan Latihan', jumlah_total: 20, jumlah_baik: 18, jumlah_rusak: 2, keterangan: 'Warna Biru Merah' },
            { id: 'inv_3', nama: 'Matras (Puzle)', kategori: 'Fasilitas', jumlah_total: 100, jumlah_baik: 95, jumlah_rusak: 5, keterangan: 'Ukuran 1x1m' }
          ];`,
`          const defaultItems = [
            { id: 'inv_1', nama: 'Samsak Tinju (Heavy Bag)', kategori: 'Peralatan', jumlah_total: 6, jumlah_baik: 5, jumlah_rusak: 1, keterangan: 'Beli tahun 2023, 1 butuh perbaikan rantai' },
            { id: 'inv_2', nama: 'Body Protector', kategori: 'Perlengkapan Latihan', jumlah_total: 25, jumlah_baik: 22, jumlah_rusak: 3, keterangan: 'Merek lokal, Warna Biru/Merah' },
            { id: 'inv_3', nama: 'Matras (Puzzle) 1x1m', kategori: 'Fasilitas', jumlah_total: 120, jumlah_baik: 110, jumlah_rusak: 10, keterangan: 'Ketebalan 3cm, Beli 2022' },
            { id: 'inv_4', nama: 'Head Guard', kategori: 'Perlengkapan Latihan', jumlah_total: 15, jumlah_baik: 15, jumlah_rusak: 0, keterangan: 'Untuk kelas atlet dan sparring' },
            { id: 'inv_5', nama: 'Sarung Tinju (Gloves) 10oz', kategori: 'Perlengkapan Latihan', jumlah_total: 10, jumlah_baik: 8, jumlah_rusak: 2, keterangan: 'Merk Venum' },
            { id: 'inv_6', nama: 'Punching Pad / Target', kategori: 'Peralatan', jumlah_total: 8, jumlah_baik: 6, jumlah_rusak: 2, keterangan: 'Sering dipakai latihan reguler' },
            { id: 'inv_7', nama: 'Tali Skipping', kategori: 'Peralatan', jumlah_total: 20, jumlah_baik: 18, jumlah_rusak: 2, keterangan: 'Tali skipping speed rope' },
            { id: 'inv_8', nama: 'Stopwatch', kategori: 'Fasilitas', jumlah_total: 3, jumlah_baik: 3, jumlah_rusak: 0, keterangan: 'Merk Casio, baterai aman' },
            { id: 'inv_9', nama: 'P3K Set (Lengkap)', kategori: 'Lainnya', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Isi lengkap dengan ethyl chloride' },
            { id: 'inv_10', nama: 'Speaker Bluetooth Portable', kategori: 'Fasilitas', jumlah_total: 1, jumlah_baik: 1, jumlah_rusak: 0, keterangan: 'Untuk musik pengiring latihan (senam dasar)' },
          ];`
);
fs.writeFileSync('src/components/AdminInventaris.tsx', inventaris);

// 3. Update AdminPrestasi.tsx
let prestasi = fs.readFileSync('src/components/AdminPrestasi.tsx', 'utf-8');
prestasi = prestasi.replace(
`          const defaultData = [
            { id: 'p1', nama_kejuaraan: 'Kejurnas Tarung Derajat', tingkat: 'Nasional', tahun: 2023, medali_emas: 2, medali_perak: 1, medali_perunggu: 3, atlet_berprestasi: 'Ahmad, Budi, Citra' },
            { id: 'p2', nama_kejuaraan: 'Porda Jabar', tingkat: 'Provinsi', tahun: 2022, medali_emas: 1, medali_perak: 2, medali_perunggu: 1, atlet_berprestasi: 'Deni, Eka' }
          ];`,
`          const defaultData = [
            { id: 'p1', nama_kejuaraan: 'PON XXI Aceh-Sumut', tingkat: 'Nasional', tahun: 2024, medali_emas: 1, medali_perak: 1, medali_perunggu: 1, atlet_berprestasi: 'Deni Pratama (Emas), Siti Nuraida (Perak)' },
            { id: 'p2', nama_kejuaraan: 'Kejurnas Tarung Derajat (Piala Presiden)', tingkat: 'Nasional', tahun: 2023, medali_emas: 2, medali_perak: 1, medali_perunggu: 3, atlet_berprestasi: 'Ahmad, Budi, Citra' },
            { id: 'p3', nama_kejuaraan: 'PORPROV Jabar XIV', tingkat: 'Provinsi', tahun: 2022, medali_emas: 3, medali_perak: 2, medali_perunggu: 2, atlet_berprestasi: 'Eka, Fajar, Gilang (Emas)' },
            { id: 'p4', nama_kejuaraan: 'Kejuaraan Antar Pelajar se-Jawa Barat', tingkat: 'Provinsi', tahun: 2023, medali_emas: 4, medali_perak: 3, medali_perunggu: 5, atlet_berprestasi: 'Hadi, Indah, Jaka, Kemal (Emas)' },
            { id: 'p5', nama_kejuaraan: 'Bupati Cup Tarung Derajat', tingkat: 'Kabupaten/Kota', tahun: 2024, medali_emas: 5, medali_perak: 4, medali_perunggu: 2, atlet_berprestasi: 'Tim Junior & Senior Satlat Kota' },
            { id: 'p6', nama_kejuaraan: 'Pekan Olahraga Pelajar Daerah (POPDA)', tingkat: 'Provinsi', tahun: 2021, medali_emas: 1, medali_perak: 2, medali_perunggu: 3, atlet_berprestasi: 'Bagus (Emas), Rini, Surya (Perak)' }
          ];`
);
fs.writeFileSync('src/components/AdminPrestasi.tsx', prestasi);

// 4. Update PublicPrestasi.tsx
let publicPrestasi = fs.readFileSync('src/components/PublicPrestasi.tsx', 'utf-8');
publicPrestasi = publicPrestasi.replace(
`            setPrestasi([
              { id: 'p1', nama_kejuaraan: 'Kejurnas Tarung Derajat', tingkat: 'Nasional', tahun: 2023, medali_emas: 2, medali_perak: 1, medali_perunggu: 3, atlet_berprestasi: 'Ahmad, Budi, Citra' },
              { id: 'p2', nama_kejuaraan: 'Porda Jabar', tingkat: 'Provinsi', tahun: 2022, medali_emas: 1, medali_perak: 2, medali_perunggu: 1, atlet_berprestasi: 'Deni, Eka' }
            ]);`,
`            setPrestasi([
              { id: 'p1', nama_kejuaraan: 'PON XXI Aceh-Sumut', tingkat: 'Nasional', tahun: 2024, medali_emas: 1, medali_perak: 1, medali_perunggu: 1, atlet_berprestasi: 'Deni Pratama (Emas), Siti Nuraida (Perak)' },
              { id: 'p2', nama_kejuaraan: 'Kejurnas Tarung Derajat', tingkat: 'Nasional', tahun: 2023, medali_emas: 2, medali_perak: 1, medali_perunggu: 3, atlet_berprestasi: 'Ahmad, Budi, Citra' },
              { id: 'p3', nama_kejuaraan: 'PORPROV Jabar XIV', tingkat: 'Provinsi', tahun: 2022, medali_emas: 3, medali_perak: 2, medali_perunggu: 2, atlet_berprestasi: 'Eka, Fajar, Gilang (Emas)' },
              { id: 'p4', nama_kejuaraan: 'Kejuaraan Pelajar se-Jabar', tingkat: 'Provinsi', tahun: 2023, medali_emas: 4, medali_perak: 3, medali_perunggu: 5, atlet_berprestasi: 'Hadi, Indah, Jaka, Kemal (Emas)' },
              { id: 'p5', nama_kejuaraan: 'Bupati Cup Tarung Derajat', tingkat: 'Kabupaten/Kota', tahun: 2024, medali_emas: 5, medali_perak: 4, medali_perunggu: 2, atlet_berprestasi: 'Tim Junior & Senior Satlat Kota' },
              { id: 'p6', nama_kejuaraan: 'POPDA Jabar', tingkat: 'Provinsi', tahun: 2021, medali_emas: 1, medali_perak: 2, medali_perunggu: 3, atlet_berprestasi: 'Bagus (Emas), Rini, Surya (Perak)' }
            ]);`
);
fs.writeFileSync('src/components/PublicPrestasi.tsx', publicPrestasi);

// 5. Update AdminFAQ.tsx
let faq = fs.readFileSync('src/components/AdminFAQ.tsx', 'utf-8');
faq = faq.replace(
`          const defaultData = [
            { id: 'f1', pertanyaan: 'Apakah pemula boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program khusus untuk pemula yang baru belajar dari nol.', urutan: 1 },
            { id: 'f2', pertanyaan: 'Berapa biaya pendaftarannya?', jawaban: 'Biaya pendaftaran adalah Rp 150.000 (sudah termasuk formulir). Biaya iuran bulanan berbeda setiap program.', urutan: 2 }
          ];`,
`          const defaultData = [
            { id: 'f1', pertanyaan: 'Apakah pemula yang tidak punya pengalaman beladiri boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program reguler khusus untuk pemula yang baru belajar dari nol. Pelatih kami akan membimbing secara bertahap mulai dari fisik dasar hingga teknik dasar.', urutan: 1 },
            { id: 'f2', pertanyaan: 'Berapa biaya pendaftaran dan iuran bulanan?', jawaban: 'Biaya pendaftaran awal adalah Rp 150.000 (sudah termasuk administrasi dan formulir). Sedangkan untuk iuran bulanan sebesar Rp 50.000 untuk kelas reguler pelajar, dan Rp 75.000 untuk umum.', urutan: 2 },
            { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan saat latihan pertama?', jawaban: 'Untuk pertemuan pertama, cukup gunakan pakaian olahraga yang bebas dan nyaman (training dan kaos) serta membawa air minum. Setelah resmi terdaftar, anggota diwajibkan memiliki seragam resmi (sakral) Tarung Derajat.', urutan: 3 },
            { id: 'f4', pertanyaan: 'Kapan jadwal latihannya?', jawaban: 'Jadwal latihan reguler kami adalah hari Selasa dan Jumat sore (15:30 - 17:30 WIB), serta Minggu pagi (07:00 - 09:30 WIB). Untuk jadwal khusus atlet menyesuaikan agenda kejuaraan.', urutan: 4 },
            { id: 'f5', pertanyaan: 'Apakah ada batasan usia untuk bergabung?', jawaban: 'Kami menerima anggota mulai dari usia dini (7 tahun) hingga dewasa tanpa batasan usia maksimal, asalkan dalam kondisi sehat jasmani. Kami memiliki pembagian kelas sesuai kelompok usia.', urutan: 5 },
            { id: 'f6', pertanyaan: 'Apakah Tarung Derajat ini resmi dan diakui?', jawaban: 'Ya, Tarung Derajat adalah seni beladiri asli Indonesia yang bernaung di bawah KODRAT (Keluarga Olahraga Tarung Derajat) dan merupakan anggota resmi KONI (Komite Olahraga Nasional Indonesia).', urutan: 6 }
          ];`
);
fs.writeFileSync('src/components/AdminFAQ.tsx', faq);


// 6. Update PublicFAQ.tsx
let publicFaq = fs.readFileSync('src/components/PublicFAQ.tsx', 'utf-8');
publicFaq = publicFaq.replace(
`            setFaqs([
              { id: 'f1', pertanyaan: 'Apakah pemula boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program khusus untuk pemula yang baru belajar dari nol. Pelatih kami akan membimbing secara bertahap.', urutan: 1 },
              { id: 'f2', pertanyaan: 'Berapa biaya pendaftarannya?', jawaban: 'Biaya pendaftaran bervariasi tergantung program. Silahkan hubungi admin via WhatsApp untuk detail biaya dan promo yang sedang berjalan.', urutan: 2 },
              { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan?', jawaban: 'Untuk pertemuan pertama, cukup gunakan pakaian olahraga yang nyaman. Jika sudah resmi bergabung, diwajibkan membeli seragam resmi (sakral).', urutan: 3 }
            ]);`,
`            setFaqs([
              { id: 'f1', pertanyaan: 'Apakah pemula yang tidak punya pengalaman beladiri boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program reguler khusus untuk pemula yang baru belajar dari nol. Pelatih kami akan membimbing secara bertahap mulai dari fisik dasar hingga teknik dasar.', urutan: 1 },
              { id: 'f2', pertanyaan: 'Berapa biaya pendaftaran dan iuran bulanan?', jawaban: 'Biaya pendaftaran awal adalah Rp 150.000 (sudah termasuk administrasi dan formulir). Sedangkan untuk iuran bulanan sebesar Rp 50.000 untuk kelas reguler pelajar, dan Rp 75.000 untuk umum.', urutan: 2 },
              { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan saat latihan pertama?', jawaban: 'Untuk pertemuan pertama, cukup gunakan pakaian olahraga yang bebas dan nyaman (training dan kaos) serta membawa air minum. Setelah resmi terdaftar, anggota diwajibkan memiliki seragam resmi (sakral) Tarung Derajat.', urutan: 3 },
              { id: 'f4', pertanyaan: 'Kapan jadwal latihannya?', jawaban: 'Jadwal latihan reguler kami adalah hari Selasa dan Jumat sore (15:30 - 17:30 WIB), serta Minggu pagi (07:00 - 09:30 WIB). Untuk jadwal khusus atlet menyesuaikan agenda kejuaraan.', urutan: 4 },
              { id: 'f5', pertanyaan: 'Apakah ada batasan usia untuk bergabung?', jawaban: 'Kami menerima anggota mulai dari usia dini (7 tahun) hingga dewasa tanpa batasan usia maksimal, asalkan dalam kondisi sehat jasmani. Kami memiliki pembagian kelas sesuai kelompok usia.', urutan: 5 },
              { id: 'f6', pertanyaan: 'Apakah Tarung Derajat ini resmi dan diakui?', jawaban: 'Ya, Tarung Derajat adalah seni beladiri asli Indonesia yang bernaung di bawah KODRAT (Keluarga Olahraga Tarung Derajat) dan merupakan anggota resmi KONI (Komite Olahraga Nasional Indonesia).', urutan: 6 }
            ]);`
);
fs.writeFileSync('src/components/PublicFAQ.tsx', publicFaq);

// 7. Update AdminProgram.tsx
let program = fs.readFileSync('src/components/AdminProgram.tsx', 'utf-8');
program = program.replace(
`          const defaultData = [
            { id: 'prog_1', nama_program: 'Kelas Reguler (Pemula)', deskripsi: 'Pengenalan teknik dasar, fisik dasar, dan mental petarung.', hari_latihan: 'Selasa & Kamis', jam_latihan: '16:00 - 17:30 WIB' },
            { id: 'prog_2', nama_program: 'Kelas Prestasi (Atlet)', deskripsi: 'Pemusatan latihan intensif untuk persiapan kejuaraan dan turnamen.', hari_latihan: 'Senin, Rabu, Jumat', jam_latihan: '16:00 - 18:00 WIB' }
          ];`,
`          const defaultData = [
            { id: 'prog_1', nama_program: 'Kelas Reguler (Pemula & Umum)', deskripsi: 'Program latihan dasar bela diri untuk segala usia. Fokus pada kebugaran fisik, pengenalan teknik dasar, dan pembentukan mental disiplin.', hari_latihan: 'Selasa & Jumat', jam_latihan: '15:30 - 17:30 WIB' },
            { id: 'prog_2', nama_program: 'Kelas Prestasi (Pemusatan Atlet)', deskripsi: 'Latihan intensif bagi anggota yang dipersiapkan untuk mengikuti kejuaraan tingkat daerah maupun nasional. Materi difokuskan pada teknik tarung dan strategi.', hari_latihan: 'Senin, Rabu, Jumat', jam_latihan: '16:00 - 18:30 WIB' },
            { id: 'prog_3', nama_program: 'Kelas Usia Dini (Anak-anak)', deskripsi: 'Program khusus untuk anak usia 7-12 tahun. Menggabungkan unsur permainan dan bela diri untuk melatih motorik, fokus, dan kedisiplinan sejak dini.', hari_latihan: 'Minggu', jam_latihan: '07:00 - 09:00 WIB' },
            { id: 'prog_4', nama_program: 'Self Defense (Khusus Wanita)', deskripsi: 'Latihan praktis teknik bela diri untuk pertahanan diri sehari-hari (women self-defense). Fokus pada meloloskan diri dari kuncian dan serangan mendadak.', hari_latihan: 'Sabtu', jam_latihan: '08:00 - 10:00 WIB' },
            { id: 'prog_5', nama_program: 'Kelas Privat / Instansi', deskripsi: 'Latihan eksklusif untuk individu atau kelompok instansi/perusahaan dengan jadwal yang fleksibel sesuai kesepakatan.', hari_latihan: 'Sesuai Kesepakatan', jam_latihan: 'Fleksibel' }
          ];`
);
fs.writeFileSync('src/components/AdminProgram.tsx', program);

// 8. Update PublicProgram.tsx
let publicProgram = fs.readFileSync('src/components/PublicProgram.tsx', 'utf-8');
publicProgram = publicProgram.replace(
`            setPrograms([
              { id: 'prog_1', nama_program: 'Kelas Reguler (Pemula)', deskripsi: 'Pengenalan teknik dasar, fisik dasar, dan mental petarung untuk segala usia.', hari_latihan: 'Selasa & Kamis', jam_latihan: '16:00 - 17:30 WIB' },
              { id: 'prog_2', nama_program: 'Kelas Prestasi (Atlet)', deskripsi: 'Pemusatan latihan intensif untuk persiapan kejuaraan tingkat daerah dan nasional.', hari_latihan: 'Senin, Rabu, Jumat', jam_latihan: '16:00 - 18:00 WIB' }
            ]);`,
`            setPrograms([
              { id: 'prog_1', nama_program: 'Kelas Reguler (Pemula & Umum)', deskripsi: 'Program latihan dasar bela diri untuk segala usia. Fokus pada kebugaran fisik, pengenalan teknik dasar, dan pembentukan mental disiplin.', hari_latihan: 'Selasa & Jumat', jam_latihan: '15:30 - 17:30 WIB' },
              { id: 'prog_2', nama_program: 'Kelas Prestasi (Pemusatan Atlet)', deskripsi: 'Latihan intensif bagi anggota yang dipersiapkan untuk mengikuti kejuaraan tingkat daerah maupun nasional. Materi difokuskan pada teknik tarung dan strategi.', hari_latihan: 'Senin, Rabu, Jumat', jam_latihan: '16:00 - 18:30 WIB' },
              { id: 'prog_3', nama_program: 'Kelas Usia Dini (Anak-anak)', deskripsi: 'Program khusus untuk anak usia 7-12 tahun. Menggabungkan unsur permainan dan bela diri untuk melatih motorik, fokus, dan kedisiplinan sejak dini.', hari_latihan: 'Minggu', jam_latihan: '07:00 - 09:00 WIB' },
              { id: 'prog_4', nama_program: 'Self Defense (Khusus Wanita)', deskripsi: 'Latihan praktis teknik bela diri untuk pertahanan diri sehari-hari (women self-defense). Fokus pada meloloskan diri dari kuncian dan serangan mendadak.', hari_latihan: 'Sabtu', jam_latihan: '08:00 - 10:00 WIB' },
              { id: 'prog_5', nama_program: 'Kelas Privat / Instansi', deskripsi: 'Latihan eksklusif untuk individu atau kelompok instansi/perusahaan dengan jadwal yang fleksibel sesuai kesepakatan.', hari_latihan: 'Sesuai Kesepakatan', jam_latihan: 'Fleksibel' }
            ]);`
);
fs.writeFileSync('src/components/PublicProgram.tsx', publicProgram);

