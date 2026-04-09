-- ============================================================================
-- Admission Manager Analytics & Permissions Migration
-- Version: 2026.04.08
-- Description: Adds tables for advanced analytics, agent categories, team
-- management, and granular permissions for admission managers
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Agent Category Types
CREATE TYPE agent_category AS ENUM (
  'student_travel_agency',
  'university_institution',
  'secondary_high_school',
  'language_center',
  'pending_classification'
);

-- Permission Types
CREATE TYPE permission_scope AS ENUM (
  'read',
  'write',
  'manage'
);

-- Team Member Permission Types
CREATE TYPE team_permission_type AS ENUM (
  'applications_view',
  'applications_review',
  'applications_manage',
  'documents_view',
  'documents_manage',
  'messages_view',
  'messages_send',
  'analytics_view',
  'team_manage'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Agent Categories (for classifying agents)
CREATE TABLE agent_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category agent_category NOT NULL DEFAULT 'pending_classification',
  sub_category TEXT,
  classification_notes TEXT,
  classified_by UUID REFERENCES profiles(id),
  classified_at TIMESTAMPTZ DEFAULT NOW(),
  verification_status VARCHAR(20) DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id)
);

-- Regions for geographic analytics
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  country VARCHAR(100) NOT NULL,
  continent VARCHAR(50),
  timezone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Countries with region mapping
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(3) NOT NULL,
  region_id UUID REFERENCES regions(id),
  continent VARCHAR(50),
  timezone VARCHAR(50),
  population BIGINT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admission Manager Team Members
CREATE TABLE admission_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'admission_staff',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admission_manager_id, user_id),
  UNIQUE(admission_manager_id, email)
);

-- Team Member Permissions
CREATE TABLE admission_team_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES admission_team_members(id) ON DELETE CASCADE,
  permission_type team_permission_type NOT NULL,
  scope permission_scope DEFAULT 'read',
  is_granted BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, permission_type)
);

-- Geographic scope for team members (which countries/regions they can manage)
CREATE TABLE admission_team_geographic_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES admission_team_members(id) ON DELETE CASCADE,
  scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('country', 'region')),
  scope_id VARCHAR(100) NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_review BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, scope_type, scope_id)
);

-- Agent category scope for team members
CREATE TABLE admission_team_category_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES admission_team_members(id) ON DELETE CASCADE,
  category agent_category NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_review BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, category)
);

-- Application Assignments to team members
CREATE TABLE application_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  assignment_type VARCHAR(30) DEFAULT 'review' CHECK (assignment_type IN ('review', 'processing', 'escalation', 'consultation')),
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'reassigned', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events for tracking
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  event_category VARCHAR(50),
  application_id UUID REFERENCES applications(id),
  agent_id UUID REFERENCES profiles(id),
  university_id UUID REFERENCES universities(id),
  program_id UUID REFERENCES programs(id),
  country_code VARCHAR(3),
  region_code VARCHAR(10),
  agent_category agent_category,
  user_id UUID REFERENCES profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application Analytics Snapshot (daily aggregated data)
CREATE TABLE application_analytics_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  total_applications INTEGER DEFAULT 0,
  applications_by_status JSONB,
  applications_by_country JSONB,
  applications_by_region JSONB,
  applications_by_university JSONB,
  applications_by_agent_category JSONB,
  applications_by_agent JSONB,
  average_processing_days NUMERIC(5,2),
  conversion_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- Agent Performance Analytics
CREATE TABLE agent_performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_applications INTEGER DEFAULT 0,
  submitted_applications INTEGER DEFAULT 0,
  under_review_applications INTEGER DEFAULT 0,
  offers_given INTEGER DEFAULT 0,
  acceptances INTEGER DEFAULT 0,
  rejections INTEGER DEFAULT 0,
  enrollments INTEGER DEFAULT 0,
  average_processing_days NUMERIC(5,2),
  success_rate NUMERIC(5,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, period_start, period_end)
);

-- University Analytics
CREATE TABLE university_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_applications INTEGER DEFAULT 0,
  pending_applications INTEGER DEFAULT 0,
  under_review_applications INTEGER DEFAULT 0,
  offers_given INTEGER DEFAULT 0,
  acceptances INTEGER DEFAULT 0,
  rejections INTEGER DEFAULT 0,
  enrollments INTEGER DEFAULT 0,
  average_processing_days NUMERIC(5,2),
  conversion_rate NUMERIC(5,2),
  top_countries JSONB,
  top_agents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(university_id, snapshot_date)
);

-- Agent Category Review Queue (for super admin and contract manager)
CREATE TABLE agent_category_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_category agent_category,
  submitted_documents JSONB,
  review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'under_review', 'approved', 'rejected', 'needs_more_info')),
  reviewed_by UUID REFERENCES profiles(id),
  review_notes TEXT,
  investigator_notes TEXT,
  external_verification_status VARCHAR(30),
  external_verification_url TEXT,
  decision_made_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, review_status)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_agent_categories_agent_id ON agent_categories(agent_id);
CREATE INDEX idx_agent_categories_category ON agent_categories(category);
CREATE INDEX idx_admission_team_members_manager ON admission_team_members(admission_manager_id);
CREATE INDEX idx_admission_team_members_user ON admission_team_members(user_id);
CREATE INDEX idx_admission_team_members_status ON admission_team_members(status);
CREATE INDEX idx_admission_team_permissions_member ON admission_team_permissions(team_member_id);
CREATE INDEX idx_admission_team_geographic_scope_member ON admission_team_geographic_scope(team_member_id);
CREATE INDEX idx_admission_team_category_scope_member ON admission_team_category_scope(team_member_id);
CREATE INDEX idx_application_assignments_application ON application_assignments(application_id);
CREATE INDEX idx_application_assignments_assigned_to ON application_assignments(assigned_to);
CREATE INDEX idx_application_assignments_status ON application_assignments(status);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_agent_id ON analytics_events(agent_id);
CREATE INDEX idx_analytics_events_application_id ON analytics_events(application_id);
CREATE INDEX idx_analytics_events_country ON analytics_events(country_code);
CREATE INDEX idx_application_analytics_date ON application_analytics_snapshot(snapshot_date);
CREATE INDEX idx_agent_performance_agent ON agent_performance_analytics(agent_id);
CREATE INDEX idx_agent_performance_period ON agent_performance_analytics(period_start, period_end);
CREATE INDEX idx_university_analytics_university ON university_analytics(university_id);
CREATE INDEX idx_university_analytics_date ON university_analytics(snapshot_date);
CREATE INDEX idx_category_review_queue_status ON agent_category_review_queue(review_status);
CREATE INDEX idx_category_review_queue_agent ON agent_category_review_queue(agent_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_agent_categories_updated_at
  BEFORE UPDATE ON agent_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admission_team_members_updated_at
  BEFORE UPDATE ON admission_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_assignments_updated_at
  BEFORE UPDATE ON application_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_category_review_queue_updated_at
  BEFORE UPDATE ON agent_category_review_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log analytics events
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_event_type VARCHAR,
  p_event_category VARCHAR,
  p_application_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    event_type, event_category, application_id, agent_id, metadata
  ) VALUES (
    p_event_type, p_event_category, p_application_id, p_agent_id, p_metadata
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get admissions by country
CREATE OR REPLACE FUNCTION get_admissions_by_country(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  country VARCHAR,
  country_code VARCHAR,
  total_count BIGINT,
  accepted_count BIGINT,
  rejected_count BIGINT,
  enrollment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.home_country, p.office_country, 'Unknown')::VARCHAR as country,
    c.code::VARCHAR as country_code,
    COUNT(DISTINCT a.id)::BIGINT as total_count,
    COUNT(DISTINCT CASE WHEN a.status IN ('accepted', 'enrolled') THEN a.id END)::BIGINT as accepted_count,
    COUNT(DISTINCT CASE WHEN a.status = 'rejected' THEN a.id END)::BIGINT as rejected_count,
    COUNT(DISTINCT CASE WHEN a.status = 'enrolled' THEN a.id END)::BIGINT as enrollment_count
  FROM applications a
  LEFT JOIN students s ON a.student_id = s.id
  LEFT JOIN profiles p ON a.agent_id = p.id
  LEFT JOIN countries c ON LOWER(c.name) = LOWER(COALESCE(s.home_country, p.office_country, 'Unknown'))
  WHERE a.created_at::DATE BETWEEN p_start_date AND p_end_date
  GROUP BY COALESCE(s.home_country, p.office_country, 'Unknown'), c.code
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get admissions by region
CREATE OR REPLACE FUNCTION get_admissions_by_region(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  region_name VARCHAR,
  region_code VARCHAR,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(r.name, 'Unknown')::VARCHAR as region_name,
    COALESCE(r.code, 'UNK')::VARCHAR as region_code,
    COUNT(DISTINCT a.id)::BIGINT as total_count
  FROM applications a
  LEFT JOIN students s ON a.student_id = s.id
  LEFT JOIN profiles p ON a.agent_id = p.id
  LEFT JOIN countries c ON LOWER(c.name) = LOWER(COALESCE(s.home_country, p.office_country))
  LEFT JOIN regions r ON c.region_id = r.id
  WHERE a.created_at::DATE BETWEEN p_start_date AND p_end_date
  GROUP BY COALESCE(r.name, 'Unknown'), COALESCE(r.code, 'UNK')
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get admissions by agent category
CREATE OR REPLACE FUNCTION get_admissions_by_agent_category(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  category VARCHAR,
  total_count BIGINT,
  accepted_count BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ac.category::TEXT, 'Uncategorized')::VARCHAR as category,
    COUNT(DISTINCT a.id)::BIGINT as total_count,
    COUNT(DISTINCT CASE WHEN a.status IN ('accepted', 'enrolled') THEN a.id END)::BIGINT as accepted_count,
    CASE
      WHEN COUNT(DISTINCT a.id) > 0
      THEN (COUNT(DISTINCT CASE WHEN a.status IN ('accepted', 'enrolled') THEN a.id END)::NUMERIC /
            COUNT(DISTINCT a.id)::NUMERIC * 100)::NUMERIC(5,2)
      ELSE 0
    END as success_rate
  FROM applications a
  LEFT JOIN agent_categories ac ON a.agent_id = ac.agent_id
  WHERE a.created_at::DATE BETWEEN p_start_date AND p_end_date
  GROUP BY COALESCE(ac.category::TEXT, 'Uncategorized')
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get team member permissions
CREATE OR REPLACE FUNCTION get_team_member_permissions(p_user_id UUID)
RETURNS TABLE(
  permission_type team_permission_type,
  scope permission_scope,
  scope_type VARCHAR,
  scope_id VARCHAR,
  category agent_category
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.permission_type,
    tp.scope,
    NULL::VARCHAR,
    NULL::VARCHAR,
    NULL::agent_category
  FROM admission_team_members ttm
  JOIN admission_team_permissions tp ON ttm.id = tp.team_member_id
  WHERE ttm.user_id = p_user_id
    AND tp.is_granted = true
    AND (tp.expires_at IS NULL OR tp.expires_at > NOW())

  UNION ALL

  SELECT
    NULL::team_permission_type,
    NULL::permission_scope,
    tgs.scope_type,
    tgs.scope_id,
    NULL::agent_category
  FROM admission_team_members ttm
  JOIN admission_team_geographic_scope tgs ON ttm.id = tgs.team_member_id
  WHERE ttm.user_id = p_user_id

  UNION ALL

  SELECT
    NULL::team_permission_type,
    NULL::permission_scope,
    NULL::VARCHAR,
    NULL::VARCHAR,
    tcs.category
  FROM admission_team_members ttm
  JOIN admission_team_category_scope tcs ON ttm.id = tcs.team_member_id
  WHERE ttm.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Applications with full analytics context
CREATE OR REPLACE VIEW v_applications_analytics AS
SELECT
  a.id,
  a.agent_id,
  a.university_id,
  a.program_id,
  a.status,
  a.created_at,
  a.updated_at,
  a.submitted_at,
  s.home_country as student_country,
  p.office_country as agent_country,
  p.agency_name,
  ac.category as agent_category,
  r.name as region_name,
  c.name as country_name,
  CASE
    WHEN a.updated_at IS NOT NULL AND a.created_at IS NOT NULL
    THEN EXTRACT(DAY FROM (a.updated_at - a.created_at))
    ELSE NULL
  END as processing_days,
  CASE
    WHEN a.status IN ('accepted', 'enrolled') THEN true
    ELSE false
  END as is_successful
FROM applications a
LEFT JOIN students s ON a.student_id = s.id
LEFT JOIN profiles p ON a.agent_id = p.id
LEFT JOIN agent_categories ac ON a.agent_id = ac.agent_id
LEFT JOIN countries c ON LOWER(c.name) = LOWER(COALESCE(s.home_country, p.office_country))
LEFT JOIN regions r ON c.region_id = r.id;

-- View: Agent performance summary
CREATE OR REPLACE VIEW v_agent_performance_summary AS
SELECT
  p.id as agent_id,
  p.agency_name,
  p.first_name,
  p.last_name,
  p.email,
  ac.category as agent_category,
  COUNT(DISTINCT a.id) as total_applications,
  COUNT(DISTINCT CASE WHEN a.status = 'submitted' THEN a.id END) as submitted,
  COUNT(DISTINCT CASE WHEN a.status = 'under_review' THEN a.id END) as under_review,
  COUNT(DISTINCT CASE WHEN a.status = 'offer' THEN a.id END) as offers,
  COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as acceptances,
  COUNT(DISTINCT CASE WHEN a.status = 'rejected' THEN a.id END) as rejections,
  COUNT(DISTINCT CASE WHEN a.status = 'enrolled' THEN a.id END) as enrollments,
  CASE
    WHEN COUNT(DISTINCT a.id) > 0
    THEN (COUNT(DISTINCT CASE WHEN a.status IN ('accepted', 'enrolled') THEN a.id END)::NUMERIC /
          COUNT(DISTINCT a.id)::NUMERIC * 100)
    ELSE 0
  END as success_rate
FROM profiles p
LEFT JOIN applications a ON p.id = a.agent_id
LEFT JOIN agent_categories ac ON p.id = ac.agent_id
WHERE p.role = 'agent'
GROUP BY p.id, p.agency_name, p.first_name, p.last_name, p.email, ac.category;

-- View: Admission manager team overview
CREATE OR REPLACE VIEW v_admission_team_overview AS
SELECT
  ttm.admission_manager_id,
  pm.agency_name as manager_name,
  pm.first_name as manager_first_name,
  pm.last_name as manager_last_name,
  ttm.id as team_member_id,
  ttm.user_id,
  ttm.email,
  ttm.first_name as member_first_name,
  ttm.last_name as member_last_name,
  ttm.role as member_role,
  ttm.status as member_status,
  ttm.invited_at,
  ttm.last_active_at,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'permission_type', tp.permission_type,
      'scope', tp.scope
    ))
    FROM admission_team_permissions tp
    WHERE tp.team_member_id = ttm.id AND tp.is_granted = true
  ), '[]'::jsonb) as permissions
FROM admission_team_members ttm
JOIN profiles pm ON ttm.admission_manager_id = pm.id;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE agent_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_team_geographic_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_team_category_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_analytics_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_category_review_queue ENABLE ROW LEVEL SECURITY;

-- Policies for agent_categories
CREATE POLICY "Admission managers can view agent categories"
  ON agent_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admission_manager', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Super admins and contract managers can manage agent categories"
  ON agent_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_super_admin = true
    )
  );

-- Policies for admission team management
CREATE POLICY "Admission managers can view their team members"
  ON admission_team_members FOR SELECT
  TO authenticated
  USING (admission_manager_id = auth.uid());

CREATE POLICY "Admission managers can manage their team members"
  ON admission_team_members FOR ALL
  TO authenticated
  USING (admission_manager_id = auth.uid());

-- Policies for application assignments
CREATE POLICY "Team members can view assigned applications"
  ON application_assignments FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admission_manager', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Admission managers can manage all assignments"
  ON application_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admission_team_members ttm
      JOIN profiles p ON ttm.admission_manager_id = p.id
      WHERE ttm.user_id = auth.uid()
      AND p.role = 'admission_manager'
    )
  );

-- Policies for agent category review queue
CREATE POLICY "Review queue visible to admins and admission managers"
  ON agent_category_review_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admission_manager', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Contract managers and super admins can manage review queue"
  ON agent_category_review_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample regions
INSERT INTO regions (name, code, country, continent, timezone) VALUES
('Europe', 'EU', 'Multiple', 'Europe', 'CET'),
('North America', 'NA', 'Multiple', 'North America', 'EST'),
('Asia Pacific', 'APAC', 'Multiple', 'Asia', 'SGT'),
('Middle East', 'ME', 'Multiple', 'Asia', 'GST'),
('Africa', 'AF', 'Multiple', 'Africa', 'CAT'),
('Latin America', 'LATAM', 'Multiple', 'South America', 'BRT');

-- Insert sample countries
INSERT INTO countries (name, code, region_id, continent, timezone)
SELECT
  name, code, r.id, r.continent, r.timezone
FROM (VALUES
  ('Nigeria', 'NGA', 'Europe'::VARCHAR),
  ('Kenya', 'KEN', 'Europe'::VARCHAR),
  ('Ghana', 'GHA', 'Europe'::VARCHAR),
  ('United Kingdom', 'GBR', 'Europe'::VARCHAR),
  ('France', 'FRA', 'Europe'::VARCHAR),
  ('Germany', 'DEU', 'Europe'::VARCHAR),
  ('United States', 'USA', 'North America'::VARCHAR),
  ('Canada', 'CAN', 'North America'::VARCHAR),
  ('China', 'CHN', 'Asia Pacific'::VARCHAR),
  ('India', 'IND', 'Asia Pacific'::VARCHAR),
  ('Japan', 'JPN', 'Asia Pacific'::VARCHAR),
  ('Australia', 'AUS', 'Asia Pacific'::VARCHAR),
  ('United Arab Emirates', 'ARE', 'Middle East'::VARCHAR),
  ('Saudi Arabia', 'SAU', 'Middle East'::VARCHAR),
  ('South Africa', 'ZAF', 'Africa'::VARCHAR),
  ('Brazil', 'BRA', 'Latin America'::VARCHAR),
  ('Mexico', 'MEX', 'Latin America'::VARCHAR)
) AS t(name, code, continent)
JOIN regions r ON r.continent = t.continent;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE application_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE admission_team_members;
