-- Script untuk membuat akun login bagi anggota yang sudah ada di tabel pendaftaran
-- Jalankan script ini di SQL Editor pada dashboard Supabase Anda.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    rec RECORD;
    clean_name TEXT;
    generated_email TEXT;
    new_user_id UUID;
BEGIN
    FOR rec IN SELECT * FROM public.pendaftaran LOOP
        -- Bersihkan nama (hanya huruf dan angka, lowercase)
        clean_name := regexp_replace(lower(rec.nama), '[^a-z0-9]', '', 'g');
        
        -- Buat email dengan domain pb162.com
        IF clean_name = '' THEN
            generated_email := 'user_' || left(rec.id::text, 8) || '@pb162.com';
        ELSE
            generated_email := clean_name || '@pb162.com';
        END IF;

        -- Jika belum ada di auth.users, buat akun baru
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = generated_email) THEN
            new_user_id := gen_random_uuid();
            
            -- 1. Insert ke auth.users
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, 
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000',
                new_user_id,
                'authenticated',
                'authenticated',
                generated_email,
                crypt('pbilibili162', gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}',
                jsonb_build_object('role', 'anggota', 'full_name', rec.nama, 'pendaftaran_id', rec.id),
                now(),
                now()
            );
            
            -- 2. Insert ke auth.identities
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
            )
            VALUES (
                new_user_id,
                new_user_id,
                jsonb_build_object('sub', new_user_id, 'email', generated_email),
                'email',
                now(),
                now(),
                now(),
                new_user_id
            );
        END IF;
    END LOOP;
END;
$$;
