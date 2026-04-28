-- ═══════════════════════════════════════════════════════════════════════════
-- Contract Management Module — Database Schema
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add contract_manager to profile roles (extend existing check constraint)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('agent', 'admin', 'editor', 'admission_manager', 'program_manager', 'technical_team', 'contract_manager'));

-- 2. Agent contract statuses (managed by contract managers)
CREATE TABLE IF NOT EXISTS agent_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'under_verification', 'information_requested', 
    'approved', 'suspended', 'revoked', 'blocked', 'rejected'
  )),
  category TEXT CHECK (category IN (
    'student_recruitment_agency', 'travel_agency', 'university_institute', 
    'secondary_high_school', 'vocational_training_center', 'language_center',
    'pending_classification'
  )) DEFAULT 'pending_classification',
  -- Verification fields
  verification_notes TEXT,
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant', 'under_investigation')),
  compliance_notes TEXT,
  -- Policy violation tracking
  has_policy_violation BOOLEAN DEFAULT false,
  violation_type TEXT,
  violation_description TEXT,
  violation_reported_at TIMESTAMPTZ,
  violation_reported_by UUID REFERENCES profiles(id),
  -- Action tracking
  action_reason TEXT,
  action_taken_by UUID REFERENCES profiles(id),
  action_taken_at TIMESTAMPTZ,
  -- Review tracking
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  -- Document request tracking
  documents_requested JSONB DEFAULT '[]'::jsonb,
  documents_received JSONB DEFAULT '[]'::jsonb,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id)
);

-- 3. Agent contract activity log (audit trail)
CREATE TABLE IF NOT EXISTS agent_contract_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES agent_contracts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Contract document requests
CREATE TABLE IF NOT EXISTS contract_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES agent_contracts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  document_type TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  is_fulfilled BOOLEAN DEFAULT false,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_doc_url TEXT,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Contract team notes (internal communication)
CREATE TABLE IF NOT EXISTS contract_team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES agent_contracts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id),
  author_id UUID NOT NULL REFERENCES profiles(id),
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'verification', 'compliance', 'investigation', 'escalation')),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_contracts_agent ON agent_contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_contracts_status ON agent_contracts(status);
CREATE INDEX IF NOT EXISTS idx_agent_contracts_category ON agent_contracts(category);
CREATE INDEX IF NOT EXISTS idx_agent_contract_activity_contract ON agent_contract_activity(contract_id);
CREATE INDEX IF NOT EXISTS idx_agent_contract_activity_agent ON agent_contract_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_contract_doc_requests_contract ON contract_document_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_team_notes_contract ON contract_team_notes(contract_id);

-- RLS Policies
ALTER TABLE agent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_contract_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_team_notes ENABLE ROW LEVEL SECURITY;

-- Contract managers + admins can read/write all contract data
CREATE POLICY "contract_managers_full_access" ON agent_contracts 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'contract_manager'))
  );

CREATE POLICY "contract_activity_full_access" ON agent_contract_activity 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'contract_manager'))
  );

CREATE POLICY "contract_docs_full_access" ON contract_document_requests 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'contract_manager'))
  );

CREATE POLICY "contract_notes_full_access" ON contract_team_notes 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'contract_manager'))
  );

-- Agents can view their own contract status (read-only)
CREATE POLICY "agents_view_own_contract" ON agent_contracts 
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "agents_view_own_doc_requests" ON contract_document_requests 
  FOR SELECT USING (agent_id = auth.uid());
