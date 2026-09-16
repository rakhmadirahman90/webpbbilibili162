-- Fix public landing navigation: keep "Pendaftaran Peserta" and its
-- registration submenus, but remove the duplicate sponsorship child entry.
-- The canonical Navbar.tsx already provides the single top-level
-- "Daftar Sponsor" link.

DELETE FROM public.navbar_settings
WHERE lower(coalesce(path, '')) IN ('sponsorship', 'sponsor')
  AND parent_id IS NOT NULL;

-- Expected public registration structure after cleanup:
-- Pendaftaran Peserta (dropdown)
--   1. Form Pendaftaran Peserta
--   2. Daftar Seeded Peserta
--   3. Daftar Peserta Diterima
