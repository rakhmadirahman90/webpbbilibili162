# Seeded Bilibili 162 Cup I 2026

Sumber canonical: `seeded_bilibili_162_complete_import.sql` dan `seeded_bilibili_162_complete.json` yang diberikan pada workflow import.

## Dataset

- Total source rows: **1,103 pemain**
- PBSI - Seeded Utama & Sulsel: 52
- Seeded Putra (B-, C+, C-): 552
- PBSI - Arsip Utama B & C: 329
- Seeded Putri (Database PBSI): 170

## Struktur production

- `public.seeded_tournaments`
- `public.seeded_players`
- `public.seeded_mapping_rules`
- `public.seeded_pair_evaluations`
- `public.seeded_draw_assignments`

`seeded_players.raw_data` mempertahankan kolom sumber Excel agar audit dan rekonsiliasi tetap memungkinkan.

## Catatan import

Import harus dilakukan secara transaksional dan diverifikasi dengan `count(*) = 1103` pada `public.seeded_players`. Jangan menghapus data pendaftaran, anggota, ranking, inventaris, atau dokumen existing hanya untuk memasukkan seeded.
