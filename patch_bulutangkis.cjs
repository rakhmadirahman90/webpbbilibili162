const fs = require('fs');

// 1. AdminFAQ.tsx & PublicFAQ.tsx
const faqBulutangkis = `const defaultData = [
            { id: 'f1', pertanyaan: 'Apakah pemula yang tidak punya pengalaman bermain bulutangkis boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program reguler khusus untuk pemula. Pelatih kami akan membimbing mulai dari cara memegang raket (grip), langkah kaki (footwork), hingga teknik pukulan dasar.', urutan: 1 },
            { id: 'f2', pertanyaan: 'Berapa biaya pendaftaran dan iuran bulanan?', jawaban: 'Biaya pendaftaran awal adalah Rp 150.000 (sudah termasuk administrasi dan kaos latihan). Untuk iuran bulanan sebesar Rp 100.000 untuk kelas reguler, dan Rp 250.000 untuk kelas prestasi (intensif).', urutan: 2 },
            { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan saat latihan?', jawaban: 'Anggota wajib membawa raket sendiri, sepatu khusus bulutangkis (non-marking shoes), pakaian olahraga, dan air minum. Shuttlecock sudah disediakan oleh klub selama sesi latihan.', urutan: 3 },
            { id: 'f4', pertanyaan: 'Kapan jadwal latihannya?', jawaban: 'Jadwal latihan reguler kami adalah hari Rabu (08.00 - 12.00 WITA), Jumat (08.00 - 12.00 WITA), dan Ahad (08.00 - 12.00 WITA). Jadwal bisa menyesuaikan jika ada turnamen.', urutan: 4 },
            { id: 'f5', pertanyaan: 'Apakah ada batasan usia untuk bergabung?', jawaban: 'Kami menerima anggota mulai dari usia dini (pembinaan 7-12 tahun), remaja, hingga dewasa/umum tanpa batasan usia maksimal, asalkan dalam kondisi sehat.', urutan: 5 },
            { id: 'f6', pertanyaan: 'Apakah PB Bilibili 162 rutin mengikuti turnamen?', jawaban: 'Ya, klub kami rutin mengirimkan atlet untuk mengikuti kejuaraan tingkat kota, provinsi (Kejurprov), hingga nasional (Sirnas) sesuai kategori usia dan kemampuan.', urutan: 6 }
          ];`;
          
const setFaqsBulutangkis = `setFaqs([
              { id: 'f1', pertanyaan: 'Apakah pemula yang tidak punya pengalaman bermain bulutangkis boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program reguler khusus untuk pemula. Pelatih kami akan membimbing mulai dari cara memegang raket (grip), langkah kaki (footwork), hingga teknik pukulan dasar.', urutan: 1 },
              { id: 'f2', pertanyaan: 'Berapa biaya pendaftaran dan iuran bulanan?', jawaban: 'Biaya pendaftaran awal adalah Rp 150.000 (sudah termasuk administrasi dan kaos latihan). Untuk iuran bulanan sebesar Rp 100.000 untuk kelas reguler, dan Rp 250.000 untuk kelas prestasi (intensif).', urutan: 2 },
              { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan saat latihan?', jawaban: 'Anggota wajib membawa raket sendiri, sepatu khusus bulutangkis (non-marking shoes), pakaian olahraga, dan air minum. Shuttlecock sudah disediakan oleh klub.', urutan: 3 },
              { id: 'f4', pertanyaan: 'Kapan jadwal latihannya?', jawaban: 'Jadwal latihan reguler kami adalah hari Rabu (08.00-12.00), Jumat (08.00-12.00), dan Ahad (08.00-12.00 WITA).', urutan: 4 },
              { id: 'f5', pertanyaan: 'Apakah ada batasan usia untuk bergabung?', jawaban: 'Kami menerima anggota mulai dari usia dini (7 tahun) hingga dewasa tanpa batasan usia maksimal, asalkan sehat jasmani.', urutan: 5 },
              { id: 'f6', pertanyaan: 'Apakah PB Bilibili 162 rutin mengikuti turnamen?', jawaban: 'Ya, klub kami rutin mengirimkan atlet untuk mengikuti kejuaraan tingkat kota, provinsi, hingga nasional.', urutan: 6 }
            ]);`;

let adminFaq = fs.readFileSync('src/components/AdminFAQ.tsx', 'utf-8');
adminFaq = adminFaq.replace(/const defaultData = \[[^]*?\];/, faqBulutangkis);
fs.writeFileSync('src/components/AdminFAQ.tsx', adminFaq);

let publicFaq = fs.readFileSync('src/components/PublicFAQ.tsx', 'utf-8');
publicFaq = publicFaq.replace(/setFaqs\(\[[^]*?\]\);/, setFaqsBulutangkis);
fs.writeFileSync('src/components/PublicFAQ.tsx', publicFaq);

// 2. AdminProgram.tsx & PublicProgram.tsx
const programBulutangkis = `const defaultData = [
            { id: 'prog_1', nama_program: 'Kelas Reguler (Hobi & Pemula)', deskripsi: 'Program untuk pemula dan umum yang ingin berolahraga bulutangkis. Fokus pada kebugaran, pengenalan teknik dasar, dan sparring santai.', hari_latihan: 'Rabu & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
            { id: 'prog_2', nama_program: 'Kelas Prestasi (Pemusatan Atlet)', deskripsi: 'Latihan intensif bagi atlet yang dipersiapkan untuk turnamen/kejuaraan. Fokus pada drill teknik, ketahanan fisik, agility, dan strategi pertandingan.', hari_latihan: 'Jumat & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
            { id: 'prog_3', nama_program: 'Kelas Pembinaan Usia Dini', deskripsi: 'Program khusus pembinaan anak-anak (7-12 tahun). Melatih koordinasi motorik, teknik dasar bulutangkis yang benar, dan kedisiplinan sejak dini.', hari_latihan: 'Rabu & Jumat', jam_latihan: '08:00 - 10:00 WITA' },
            { id: 'prog_4', nama_program: 'Private Training (1 on 1)', deskripsi: 'Latihan eksklusif dengan pelatih untuk fokus memperbaiki teknik spesifik dan mempercepat progres secara individual.', hari_latihan: 'Sesuai Kesepakatan', jam_latihan: 'Fleksibel' },
            { id: 'prog_5', nama_program: 'Mabar Klub (Sparring Day)', deskripsi: 'Sesi pertandingan internal atau mengundang klub lain untuk mengasah mental bertanding seluruh anggota dalam suasana kompetitif namun bersahabat.', hari_latihan: 'Ahad (Akhir Bulan)', jam_latihan: '08:00 - 14:00 WITA' }
          ];`;
          
const setProgramsBulutangkis = `setPrograms([
              { id: 'prog_1', nama_program: 'Kelas Reguler (Hobi & Pemula)', deskripsi: 'Program untuk pemula dan umum yang ingin berolahraga bulutangkis. Fokus pada kebugaran, pengenalan teknik dasar, dan sparring santai.', hari_latihan: 'Rabu & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
              { id: 'prog_2', nama_program: 'Kelas Prestasi (Pemusatan Atlet)', deskripsi: 'Latihan intensif bagi atlet yang dipersiapkan untuk turnamen/kejuaraan. Fokus pada drill teknik, ketahanan fisik, agility, dan strategi pertandingan.', hari_latihan: 'Jumat & Ahad', jam_latihan: '08:00 - 12:00 WITA' },
              { id: 'prog_3', nama_program: 'Kelas Pembinaan Usia Dini', deskripsi: 'Program khusus pembinaan anak-anak (7-12 tahun). Melatih koordinasi motorik, teknik dasar bulutangkis yang benar, dan kedisiplinan sejak dini.', hari_latihan: 'Rabu & Jumat', jam_latihan: '08:00 - 10:00 WITA' },
              { id: 'prog_4', nama_program: 'Private Training (1 on 1)', deskripsi: 'Latihan eksklusif dengan pelatih untuk fokus memperbaiki teknik spesifik dan mempercepat progres secara individual.', hari_latihan: 'Sesuai Kesepakatan', jam_latihan: 'Fleksibel' },
              { id: 'prog_5', nama_program: 'Mabar Klub (Sparring Day)', deskripsi: 'Sesi pertandingan internal atau mengundang klub lain untuk mengasah mental bertanding seluruh anggota dalam suasana kompetitif namun bersahabat.', hari_latihan: 'Ahad (Akhir Bulan)', jam_latihan: '08:00 - 14:00 WITA' }
            ]);`;

let adminProgram = fs.readFileSync('src/components/AdminProgram.tsx', 'utf-8');
adminProgram = adminProgram.replace(/const defaultData = \[[^]*?\];/, programBulutangkis);
fs.writeFileSync('src/components/AdminProgram.tsx', adminProgram);

let publicProgram = fs.readFileSync('src/components/PublicProgram.tsx', 'utf-8');
publicProgram = publicProgram.replace(/setPrograms\(\[[^]*?\]\);/, setProgramsBulutangkis);
fs.writeFileSync('src/components/PublicProgram.tsx', publicProgram);

// 3. AdminPrestasi.tsx & PublicPrestasi.tsx
const prestasiBulutangkis = `const defaultData = [
            { id: 'p1', nama_kejuaraan: 'Kejurkot Parepare (Tunggal Putra Dewasa)', tingkat: 'Kabupaten/Kota', tahun: 2023, medali_emas: 1, medali_perak: 0, medali_perunggu: 1, atlet_berprestasi: 'Andi (Emas), Budi (Perunggu)' },
            { id: 'p2', nama_kejuaraan: 'Kejuaraan Provinsi (Kejurprov) Sulsel', tingkat: 'Provinsi', tahun: 2023, medali_emas: 0, medali_perak: 1, medali_perunggu: 2, atlet_berprestasi: 'Ganda Putra: Candra/Deni (Perak)' },
            { id: 'p3', nama_kejuaraan: 'Sirkuit Nasional (Sirnas) B Sulawesi', tingkat: 'Nasional', tahun: 2022, medali_emas: 1, medali_perak: 1, medali_perunggu: 1, atlet_berprestasi: 'Eka (Emas - Tunggal Taruna Putri)' },
            { id: 'p4', nama_kejuaraan: 'Walikota Cup Makassar (Ganda Campuran)', tingkat: 'Provinsi', tahun: 2024, medali_emas: 1, medali_perak: 0, medali_perunggu: 0, atlet_berprestasi: 'Fajar/Gita (Emas)' },
            { id: 'p5', nama_kejuaraan: 'O2SN Tingkat SMA se-Sulsel', tingkat: 'Provinsi', tahun: 2023, medali_emas: 2, medali_perak: 1, medali_perunggu: 0, atlet_berprestasi: 'Hadi (Emas - Tunggal), Indah (Emas - Tunggal)' }
          ];`;

const setPrestasiBulutangkis = `setPrestasi([
              { id: 'p1', nama_kejuaraan: 'Kejurkot Parepare (Tunggal Putra Dewasa)', tingkat: 'Kabupaten/Kota', tahun: 2023, medali_emas: 1, medali_perak: 0, medali_perunggu: 1, atlet_berprestasi: 'Andi (Emas), Budi (Perunggu)' },
              { id: 'p2', nama_kejuaraan: 'Kejuaraan Provinsi (Kejurprov) Sulsel', tingkat: 'Provinsi', tahun: 2023, medali_emas: 0, medali_perak: 1, medali_perunggu: 2, atlet_berprestasi: 'Ganda Putra: Candra/Deni (Perak)' },
              { id: 'p3', nama_kejuaraan: 'Sirkuit Nasional (Sirnas) B Sulawesi', tingkat: 'Nasional', tahun: 2022, medali_emas: 1, medali_perak: 1, medali_perunggu: 1, atlet_berprestasi: 'Eka (Emas - Tunggal Taruna Putri)' },
              { id: 'p4', nama_kejuaraan: 'Walikota Cup Makassar (Ganda Campuran)', tingkat: 'Provinsi', tahun: 2024, medali_emas: 1, medali_perak: 0, medali_perunggu: 0, atlet_berprestasi: 'Fajar/Gita (Emas)' },
              { id: 'p5', nama_kejuaraan: 'O2SN Tingkat SMA se-Sulsel', tingkat: 'Provinsi', tahun: 2023, medali_emas: 2, medali_perak: 1, medali_perunggu: 0, atlet_berprestasi: 'Hadi (Emas), Indah (Emas)' }
            ]);`;

let adminPrestasi = fs.readFileSync('src/components/AdminPrestasi.tsx', 'utf-8');
adminPrestasi = adminPrestasi.replace(/const defaultData = \[[^]*?\];/, prestasiBulutangkis);
fs.writeFileSync('src/components/AdminPrestasi.tsx', adminPrestasi);

let publicPrestasi = fs.readFileSync('src/components/PublicPrestasi.tsx', 'utf-8');
publicPrestasi = publicPrestasi.replace(/setPrestasi\(\[[^]*?\]\);/, setPrestasiBulutangkis);
fs.writeFileSync('src/components/PublicPrestasi.tsx', publicPrestasi);

