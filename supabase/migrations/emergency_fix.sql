-- ============================================================================
-- EMERGENCY DATABASE FIX - RUN IN SUPABASE SQL EDITOR
-- Project: xfbswxuoauroagbvcrxk
-- Description: Fixes profiles table, triggers, and RLS for Admin/Agent access.
-- ============================================================================

-- 1. Fix the restrictive role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('agent', 'admin', 'editor', 'admission_manager', 'program_manager', 'technical_team', 'contract_manager'));

-- 2. Ensure the handle_new_user trigger function is robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active, preferred_language)
  VALUES (new.id, new.email, 'agent', true, 'English')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_active = true
  WHERE profiles.id = EXCLUDED.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill ANY missing profiles from auth.users
INSERT INTO public.profiles (id, email, role, is_active, preferred_language)
SELECT id, email, 'agent', true, 'English'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 5. Fix RLS Policies for Profiles (Aggressive wipe of old recursive policies)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a helper function to bypass RLS when checking roles
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- Dynamically drop ALL existing policies on the profiles table to kill ANY rogue recursive policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', pol.policyname);
    END LOOP;
END $$;

-- Now safely recreate the non-recursive policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.get_auth_user_role() IN ('admin', 'admission_manager', 'program_manager', 'contract_manager')
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    public.get_auth_user_role() = 'admin'
  );

-- 6. Fix RLS Policies for Applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view own applications" ON public.applications;
CREATE POLICY "Agents can view own applications" ON public.applications
  FOR SELECT USING (agent_id = auth.uid() OR public.get_auth_user_role() IN ('admin', 'admission_manager', 'program_manager'));

-- 7. Fix RLS Policies for admin_user_invites
ALTER TABLE public.admin_user_invites ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'admin_user_invites'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_user_invites;', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Admins can view and manage invites" ON public.admin_user_invites
  FOR ALL USING (
    public.get_auth_user_role() = 'admin'
  );

CREATE POLICY "Users can view their own invites" ON public.admin_user_invites
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- 8. Explicitly promote the main admin if needed
UPDATE public.profiles 
SET role = 'admin', is_active = true, is_super_admin = true 
WHERE email = 'digitalproservicesofficiel@gmail.com';

UPDATE public.profiles 
SET role = 'contract_manager', is_active = true 
WHERE email = 'partners@admissiondesk.online';

-- Verify counts
SELECT 'Profiles Count' as label, count(*) from public.profiles;
