-- PB Bilibili 162 popup activation/order rules.
-- Multiple popups may be active simultaneously. Activation is independent per row.
-- New popups are inserted at display order 0 without changing existing is_active values.

DROP TRIGGER IF EXISTS trg_pb162_latest_popup_active ON public.konfigurasi_popup;
DROP FUNCTION IF EXISTS public.pb162_keep_latest_popup_active();

CREATE OR REPLACE FUNCTION public.pb162_popup_create(
  p_url_gambar text,
  p_judul text DEFAULT NULL,
  p_deskripsi text DEFAULT NULL,
  p_file_url text DEFAULT NULL
)
RETURNS public.konfigurasi_popup
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.konfigurasi_popup;
BEGIN
  UPDATE public.konfigurasi_popup
     SET urutan = COALESCE(urutan, 0) + 1;

  INSERT INTO public.konfigurasi_popup
    (url_gambar, judul, deskripsi, file_url, is_active, urutan)
  VALUES
    (p_url_gambar, p_judul, p_deskripsi, p_file_url, TRUE, 0)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.pb162_popup_move(
  p_id uuid,
  p_direction text
)
RETURNS public.konfigurasi_popup
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_current integer;
  v_target integer;
  v_swap_id uuid;
  v_row public.konfigurasi_popup;
BEGIN
  SELECT urutan INTO v_current
  FROM public.konfigurasi_popup
  WHERE id = p_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Pop-up tidak ditemukan';
  END IF;

  IF lower(p_direction) = 'up' THEN
    SELECT id, urutan INTO v_swap_id, v_target
    FROM public.konfigurasi_popup
    WHERE urutan < v_current
    ORDER BY urutan DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;
  ELSIF lower(p_direction) = 'down' THEN
    SELECT id, urutan INTO v_swap_id, v_target
    FROM public.konfigurasi_popup
    WHERE urutan > v_current
    ORDER BY urutan ASC, created_at ASC
    LIMIT 1
    FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Direction harus up atau down';
  END IF;

  IF v_swap_id IS NOT NULL THEN
    UPDATE public.konfigurasi_popup SET urutan = -1 WHERE id = p_id;
    UPDATE public.konfigurasi_popup SET urutan = v_current WHERE id = v_swap_id;
    UPDATE public.konfigurasi_popup SET urutan = v_target WHERE id = p_id;
  END IF;

  SELECT * INTO v_row FROM public.konfigurasi_popup WHERE id = p_id;
  RETURN v_row;
END;
$$;
