-- Memberi izin kelola event (buat / ubah / hapus) ke akun companion app.
-- Penyebab error 42501 "new row violates row-level security policy for table events":
-- policy "events admin write" hanya mengizinkan user dengan role event_admin / superadmin.
--
-- Cara pakai: buka Supabase Dashboard > SQL Editor, ganti email di bawah dengan
-- email akun yang dipakai login di companion app, lalu Run.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'event_admin'::public.app_role
FROM auth.users u
WHERE u.email = 'ganti-dengan-email-anda@contoh.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Cek hasilnya:
SELECT u.email, r.role
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id
ORDER BY u.email;

-- Catatan: setelah role ditambahkan, logout lalu "Hubungkan" ulang di companion app
-- supaya token JWT baru terbaca oleh policy.
