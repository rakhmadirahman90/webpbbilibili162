insert into public.site_settings (key, value, updated_at)
values (
  'sambutan_ketua_umum',
  jsonb_build_object(
    'nama', 'H. Wawan',
    'jabatan', 'Ketua Umum PB Bilibili 162',
    'foto_url', 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/identitas/1775222807673-ccq2ee.jpg',
    'paragraf_1', 'Selamat datang di PB Bilibili 162. Kami menyambut hangat seluruh atlet bulutangkis dan para pecinta olahraga bulutangkis di Kota Parepare. Kehadiran Anda adalah semangat bagi kami untuk terus berkontribusi bagi kemajuan bulutangkis di daerah kita tercinta.',
    'paragraf_2', 'Bagi rekan-rekan atlet, kami berkomitmen menyediakan wadah pelatihan yang terstruktur, disiplin, dan berintegritas untuk mengasah potensi maksimal Anda. Sementara bagi seluruh pecinta bulutangkis di Parepare, mari kita jadikan klub ini sebagai rumah bersama dalam memupuk sportivitas dan kegemaran terhadap olahraga ini.',
    'paragraf_3', 'Mari kita terus bersinergi, meraih prestasi gemilang, dan mempererat tali persaudaraan di dalam maupun di luar lapangan. Terima kasih atas dukungan dan kepercayaan yang Anda berikan kepada PB Bilibili 162.'
  ),
  now()
)
on conflict (key) do nothing;
