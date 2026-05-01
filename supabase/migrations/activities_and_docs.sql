-- 1. Add agent_note to contract_document_requests
ALTER TABLE public.contract_document_requests ADD COLUMN IF NOT EXISTS agent_note TEXT;

-- 2. Create Global Activities Table
CREATE TABLE IF NOT EXISTS public.agent_global_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'application_submitted', 'document_uploaded', 'team_added', etc.
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Global Activities
ALTER TABLE public.agent_global_activities ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'agent_global_activities'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.agent_global_activities;', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Agents can view own activities" ON public.agent_global_activities
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Admins can view all activities" ON public.agent_global_activities
  FOR SELECT USING (
    public.get_auth_user_role() IN ('admin', 'admission_manager', 'program_manager', 'contract_manager')
  );

CREATE POLICY "Agents can insert own activities" ON public.agent_global_activities
  FOR INSERT WITH CHECK (agent_id = auth.uid());

-- Add index
CREATE INDEX IF NOT EXISTS idx_agent_global_activities_agent ON public.agent_global_activities(agent_id);
