-- =====================================================================
-- BRI Branch Office Pringsewu — Skema database lengkap (PostgreSQL/Supabase)
-- IDEMPOTEN: aman dijalankan ulang berulang kali di SQL Editor Supabase.
-- Sudah termasuk: enum role, tabel, GRANT, RLS policy, fungsi keamanan,
-- trigger audit log, dan data awal (seed).
-- =====================================================================

-- ROLES (enum)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superadmin','it_admin','event_admin','employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  nama text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_it_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('it_admin','superadmin'));
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_event_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('event_admin','superadmin'));
$$;

DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
DROP POLICY IF EXISTS "profiles insert self" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_superadmin());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_superadmin());
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "roles read own" ON public.user_roles;
CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_superadmin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nama, username)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nama', NEW.email), split_part(NEW.email,'@',1))
  ON CONFLICT (id) DO NOTHING;
  -- User pertama yang registrasi otomatis menjadi superadmin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'superadmin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- UKERS
CREATE TABLE IF NOT EXISTS public.ukers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_uker text NOT NULL UNIQUE,
  nama_uker text NOT NULL,
  tipe text,
  alamat text,
  latitude numeric,
  longitude numeric,
  ip_address text,
  pic_it text,
  status_aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id,kode_uker,nama_uker,tipe,alamat,latitude,longitude,pic_it,status_aktif,created_at,updated_at) ON public.ukers TO anon;
GRANT SELECT (id,kode_uker,nama_uker,tipe,alamat,latitude,longitude,pic_it,status_aktif,created_at,updated_at) ON public.ukers TO authenticated;
GRANT ALL ON public.ukers TO service_role;
ALTER TABLE public.ukers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ukers public read" ON public.ukers;
DROP POLICY IF EXISTS "ukers admin write" ON public.ukers;
CREATE POLICY "ukers public read" ON public.ukers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ukers admin write" ON public.ukers FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS ukers_updated ON public.ukers;
CREATE TRIGGER ukers_updated BEFORE UPDATE ON public.ukers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT, UPDATE, DELETE ON public.ukers TO authenticated;

CREATE OR REPLACE FUNCTION public.get_uker_ips()
RETURNS TABLE (id uuid, kode_uker text, nama_uker text, ip_address text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_it_admin() THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  RETURN QUERY SELECT u.id, u.kode_uker, u.nama_uker, u.ip_address FROM public.ukers u ORDER BY u.kode_uker;
END; $$;
REVOKE ALL ON FUNCTION public.get_uker_ips() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_uker_ips() TO authenticated;

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nip text NOT NULL UNIQUE,
  nama text NOT NULL,
  jabatan text,
  uker_id uuid REFERENCES public.ukers(id) ON DELETE SET NULL,
  email text,
  no_hp text,
  foto_url text,
  status_aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id,nip,nama,jabatan,uker_id,status_aktif,foto_url,created_at,updated_at) ON public.employees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees read" ON public.employees;
DROP POLICY IF EXISTS "employees admin write" ON public.employees;
CREATE POLICY "employees read" ON public.employees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "employees admin write" ON public.employees FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS employees_updated ON public.employees;
CREATE TRIGGER employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ATM
CREATE TABLE IF NOT EXISTS public.atm_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_atm text NOT NULL UNIQUE,
  uker_id uuid REFERENCES public.ukers(id) ON DELETE SET NULL,
  lokasi text,
  status text NOT NULL DEFAULT 'aktif',
  tanggal_pasang date,
  tanggal_maintenance_terakhir date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.atm_machines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atm_machines TO authenticated;
GRANT ALL ON public.atm_machines TO service_role;
ALTER TABLE public.atm_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "atm read" ON public.atm_machines;
DROP POLICY IF EXISTS "atm admin write" ON public.atm_machines;
CREATE POLICY "atm read" ON public.atm_machines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "atm admin write" ON public.atm_machines FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS atm_updated ON public.atm_machines;
CREATE TRIGGER atm_updated BEFORE UPDATE ON public.atm_machines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EDC
CREATE TABLE IF NOT EXISTS public.edc_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_edc text NOT NULL UNIQUE,
  uker_id uuid REFERENCES public.ukers(id) ON DELETE SET NULL,
  merchant text,
  lokasi text,
  status text NOT NULL DEFAULT 'aktif',
  tanggal_pasang date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.edc_machines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edc_machines TO authenticated;
GRANT ALL ON public.edc_machines TO service_role;
ALTER TABLE public.edc_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "edc read" ON public.edc_machines;
DROP POLICY IF EXISTS "edc admin write" ON public.edc_machines;
CREATE POLICY "edc read" ON public.edc_machines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "edc admin write" ON public.edc_machines FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS edc_updated ON public.edc_machines;
CREATE TRIGGER edc_updated BEFORE UPDATE ON public.edc_machines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_event text NOT NULL,
  deskripsi text,
  tanggal_mulai timestamptz,
  tanggal_selesai timestamptz,
  qr_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events public read active" ON public.events;
DROP POLICY IF EXISTS "events auth read" ON public.events;
DROP POLICY IF EXISTS "events admin write" ON public.events;
CREATE POLICY "events public read active" ON public.events FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "events auth read" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events admin write" ON public.events FOR ALL TO authenticated USING (public.is_event_admin()) WITH CHECK (public.is_event_admin());
DROP TRIGGER IF EXISTS events_updated ON public.events;
CREATE TRIGGER events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ATTENDANCES
CREATE TABLE IF NOT EXISTS public.attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  nama_manual text,
  uker_manual text,
  waktu_hadir timestamptz NOT NULL DEFAULT now(),
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.attendances TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendances TO authenticated;
GRANT ALL ON public.attendances TO service_role;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance public insert" ON public.attendances;
DROP POLICY IF EXISTS "attendance auth read" ON public.attendances;
DROP POLICY IF EXISTS "attendance admin write" ON public.attendances;
CREATE POLICY "attendance public insert" ON public.attendances FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "attendance auth read" ON public.attendances FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance admin write" ON public.attendances FOR ALL TO authenticated USING (public.is_event_admin()) WITH CHECK (public.is_event_admin());

-- IT AREA
CREATE TABLE IF NOT EXISTS public.it_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_tool text NOT NULL,
  kategori text,
  link_download text,
  versi text,
  catatan text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.it_tools TO authenticated;
GRANT ALL ON public.it_tools TO service_role;
ALTER TABLE public.it_tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "it_tools restricted" ON public.it_tools;
CREATE POLICY "it_tools restricted" ON public.it_tools FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS it_tools_updated ON public.it_tools;
CREATE TRIGGER it_tools_updated BEFORE UPDATE ON public.it_tools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  kategori text,
  konten text,
  file_url text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorials TO authenticated;
GRANT ALL ON public.tutorials TO service_role;
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tutorials restricted" ON public.tutorials;
CREATE POLICY "tutorials restricted" ON public.tutorials FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS tutorials_updated ON public.tutorials;
CREATE TRIGGER tutorials_updated BEFORE UPDATE ON public.tutorials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  file_url text,
  kategori text,
  uker_id uuid REFERENCES public.ukers(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photos restricted" ON public.photos;
CREATE POLICY "photos restricted" ON public.photos FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS photos_updated ON public.photos;
CREATE TRIGGER photos_updated BEFORE UPDATE ON public.photos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TICKETS
CREATE TABLE IF NOT EXISTS public.it_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  deskripsi text,
  uker_id uuid REFERENCES public.ukers(id) ON DELETE SET NULL,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.it_tickets TO authenticated;
GRANT ALL ON public.it_tickets TO service_role;
ALTER TABLE public.it_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets read own or it" ON public.it_tickets;
DROP POLICY IF EXISTS "tickets insert" ON public.it_tickets;
DROP POLICY IF EXISTS "tickets it manage" ON public.it_tickets;
DROP POLICY IF EXISTS "tickets it delete" ON public.it_tickets;
CREATE POLICY "tickets read own or it" ON public.it_tickets FOR SELECT TO authenticated USING (reported_by = auth.uid() OR public.is_it_admin());
CREATE POLICY "tickets insert" ON public.it_tickets FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());
CREATE POLICY "tickets it manage" ON public.it_tickets FOR UPDATE TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
CREATE POLICY "tickets it delete" ON public.it_tickets FOR DELETE TO authenticated USING (public.is_it_admin());
DROP TRIGGER IF EXISTS tickets_updated ON public.it_tickets;
CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.it_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ASSETS
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_aset text NOT NULL,
  kategori text,
  uker_id uuid REFERENCES public.ukers(id) ON DELETE SET NULL,
  serial_number text,
  tanggal_beli date,
  status text NOT NULL DEFAULT 'baik',
  catatan_perbaikan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets restricted" ON public.assets;
CREATE POLICY "assets restricted" ON public.assets FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS assets_updated ON public.assets;
CREATE TRIGGER assets_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit superadmin read" ON public.audit_logs;
CREATE POLICY "audit superadmin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_superadmin());

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN rid := OLD.id; ELSE rid := NEW.id; END IF;
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, rid,
          CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
          CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS audit_ukers ON public.ukers;
DROP TRIGGER IF EXISTS audit_employees ON public.employees;
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_ukers AFTER INSERT OR UPDATE OR DELETE ON public.ukers FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- SEED DATA (idempoten — ON CONFLICT DO NOTHING)
INSERT INTO public.ukers (kode_uker, nama_uker, tipe, alamat, latitude, longitude, ip_address, pic_it) VALUES
('0123','BRI KC Pringsewu','Kantor Cabang','Jl. Jend. Ahmad Yani No. 12, Pringsewu', -5.3583, 104.9750, '10.12.3.1','Rizky Ananda'),
('0124','BRI KCP Gadingrejo','Kantor Cabang Pembantu','Jl. Raya Gadingrejo, Pringsewu', -5.3411, 105.0512, '10.12.3.2','Rizky Ananda'),
('0125','BRI KCP Sukoharjo','Kantor Cabang Pembantu','Jl. Pasar Sukoharjo, Pringsewu', -5.3820, 104.9020, '10.12.3.3','Dwi Saputra'),
('0126','BRI Unit Pardasuka','Unit','Jl. Raya Pardasuka, Pringsewu', -5.4402, 105.0021, '10.12.3.4','Dwi Saputra'),
('0127','BRI Unit Ambarawa','Unit','Jl. Raya Ambarawa, Pringsewu', -5.3705, 104.9310, '10.12.3.5','Rizky Ananda'),
('0128','BRI Unit Banyumas','Unit','Jl. Raya Banyumas, Pringsewu', -5.3120, 104.8402, '10.12.3.6','Dwi Saputra')
ON CONFLICT (kode_uker) DO NOTHING;

INSERT INTO public.employees (nip, nama, jabatan, uker_id, email, no_hp)
SELECT v.nip, v.nama, v.jabatan, u.id, v.email, v.hp FROM (VALUES
('00123456','Ahmad Fauzi','Pemimpin Cabang','0123','ahmad.fauzi@bri.co.id','081234567801'),
('00123457','Siti Rahmawati','Supervisor Layanan','0123','siti.r@bri.co.id','081234567802'),
('00123458','Rizky Ananda','IT Support','0123','rizky.a@bri.co.id','081234567803'),
('00123459','Dwi Saputra','IT Support','0124','dwi.s@bri.co.id','081234567804'),
('00123460','Nurul Hidayah','Teller','0124','nurul.h@bri.co.id','081234567805'),
('00123461','Budi Santoso','Kepala Unit','0126','budi.s@bri.co.id','081234567806'),
('00123462','Eka Pratiwi','Customer Service','0125','eka.p@bri.co.id','081234567807'),
('00123463','Yusuf Maulana','Mantri','0127','yusuf.m@bri.co.id','081234567808')
) AS v(nip,nama,jabatan,kode,email,hp) JOIN public.ukers u ON u.kode_uker = v.kode
ON CONFLICT (nip) DO NOTHING;

INSERT INTO public.atm_machines (kode_atm, uker_id, lokasi, status, tanggal_pasang, tanggal_maintenance_terakhir)
SELECT v.kode, u.id, v.lokasi, v.status, v.pasang::date, v.maint::date FROM (VALUES
('ATM-PRW-001','0123','Lobby KC Pringsewu','aktif','2021-03-10','2026-06-01'),
('ATM-PRW-002','0123','Halaman KC Pringsewu','aktif','2021-03-10','2026-05-12'),
('ATM-GDR-001','0124','KCP Gadingrejo','aktif','2022-07-19','2026-04-20'),
('ATM-SKH-001','0125','KCP Sukoharjo','gangguan','2022-09-02','2026-02-15'),
('ATM-PDS-001','0126','Unit Pardasuka','aktif','2023-01-25','2026-07-01'),
('ATM-AMB-001','0127','Unit Ambarawa','maintenance','2023-05-11','2026-03-08')
) AS v(kode,uker,lokasi,status,pasang,maint) JOIN public.ukers u ON u.kode_uker = v.uker
ON CONFLICT (kode_atm) DO NOTHING;

INSERT INTO public.edc_machines (kode_edc, uker_id, merchant, lokasi, status, tanggal_pasang)
SELECT v.kode, u.id, v.merchant, v.lokasi, v.status, v.pasang::date FROM (VALUES
('EDC-001','0123','Apotek Sehat Pringsewu','Jl. A. Yani','aktif','2023-02-14'),
('EDC-002','0123','RM Padang Sederhana','Jl. A. Yani','aktif','2023-02-14'),
('EDC-003','0124','Toko Bangunan Jaya','Gadingrejo','aktif','2023-08-01'),
('EDC-004','0125','Klinik Medika','Sukoharjo','nonaktif','2022-11-30'),
('EDC-005','0127','Swalayan Ambarawa','Ambarawa','aktif','2024-04-17')
) AS v(kode,uker,merchant,lokasi,status,pasang) JOIN public.ukers u ON u.kode_uker = v.uker
ON CONFLICT (kode_edc) DO NOTHING;

INSERT INTO public.events (nama_event, deskripsi, tanggal_mulai, tanggal_selesai, qr_token, is_active) VALUES
('Rapat Koordinasi Bulanan Agustus','Rapat koordinasi seluruh unit kerja BO Pringsewu','2026-08-20 08:00+07','2026-08-20 12:00+07','rakorbulanan082026', true),
('Sosialisasi Keamanan Siber','Sosialisasi keamanan informasi & phishing awareness','2026-08-25 13:00+07','2026-08-25 16:00+07','sosialisasicyber2026', true)
ON CONFLICT (qr_token) DO NOTHING;

-- ============================================================
-- Mesin ATM: penyesuaian kolom + Mesin CRM (jalankan di SQL Editor)
-- ============================================================
ALTER TABLE public.atm_machines
  ADD COLUMN IF NOT EXISTS tid text,
  ADD COLUMN IF NOT EXISTS titik_maps text,
  ADD COLUMN IF NOT EXISTS merk text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS tgl_live date;
ALTER TABLE public.atm_machines ALTER COLUMN kode_atm DROP NOT NULL;
UPDATE public.atm_machines SET tid = COALESCE(tid, regexp_replace(kode_atm, '\D', '', 'g'));

CREATE TABLE IF NOT EXISTS public.crm_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tid text,
  lokasi text,
  titik_maps text,
  merk text,
  ip_address text,
  tgl_live date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crm_machines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_machines TO authenticated;
GRANT ALL ON public.crm_machines TO service_role;
ALTER TABLE public.crm_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm read" ON public.crm_machines;
DROP POLICY IF EXISTS "crm admin write" ON public.crm_machines;
CREATE POLICY "crm read" ON public.crm_machines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "crm admin write" ON public.crm_machines FOR ALL TO authenticated USING (public.is_it_admin()) WITH CHECK (public.is_it_admin());
DROP TRIGGER IF EXISTS crm_updated ON public.crm_machines;
CREATE TRIGGER crm_updated BEFORE UPDATE ON public.crm_machines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
