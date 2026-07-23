const fs = require('fs');

// Update AdminInventaris.tsx to have badminton data
let inventaris = fs.readFileSync('src/components/AdminInventaris.tsx', 'utf-8');
inventaris = inventaris.replace(
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
          ];`,
`          const defaultItems = [
            { id: 'inv_1', nama: 'Shuttlecock Yonex', kategori: 'Perlengkapan Latihan', jumlah_total: 50, jumlah_baik: 40, jumlah_rusak: 10, keterangan: 'Slop baru dan bekas latihan' },
            { id: 'inv_2', nama: 'Net Bulutangkis', kategori: 'Fasilitas', jumlah_total: 4, jumlah_baik: 3, jumlah_rusak: 1, keterangan: 'Net standar turnamen' },
            { id: 'inv_3', nama: 'Tiang Net Portabel', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Besi kokoh, roda masih bagus' },
            { id: 'inv_4', nama: 'Raket Latihan', kategori: 'Peralatan', jumlah_total: 10, jumlah_baik: 8, jumlah_rusak: 2, keterangan: 'Raket cadangan untuk anggota yang senar putus' },
            { id: 'inv_5', nama: 'Cone / Marka Lapangan', kategori: 'Peralatan', jumlah_total: 40, jumlah_baik: 38, jumlah_rusak: 2, keterangan: 'Untuk latihan agility' },
            { id: 'inv_6', nama: 'Tali Skipping', kategori: 'Peralatan', jumlah_total: 15, jumlah_baik: 12, jumlah_rusak: 3, keterangan: 'Untuk pemanasan' },
            { id: 'inv_7', nama: 'Papan Skor Manual', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Papan skor lipat' },
            { id: 'inv_8', nama: 'Kotak P3K', kategori: 'Lainnya', jumlah_total: 1, jumlah_baik: 1, jumlah_rusak: 0, keterangan: 'Lengkap dengan spray pereda nyeri' },
            { id: 'inv_9', nama: 'Keranjang Shuttlecock', kategori: 'Peralatan', jumlah_total: 3, jumlah_baik: 3, jumlah_rusak: 0, keterangan: 'Untuk menyimpan kock latihan' },
            { id: 'inv_10', nama: 'Karpet Lapangan (Vinyl)', kategori: 'Fasilitas', jumlah_total: 2, jumlah_baik: 2, jumlah_rusak: 0, keterangan: 'Karpet lapangan standar PBSI' }
          ];`
);
fs.writeFileSync('src/components/AdminInventaris.tsx', inventaris);

