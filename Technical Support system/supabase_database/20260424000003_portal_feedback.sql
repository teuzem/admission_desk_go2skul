-- =====================================================================
-- ADMISSION DESK — PORTAL FEEDBACK SYSTEM
-- Version: 1.0 — Production Implementation
-- =====================================================================

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_type') THEN
        CREATE TYPE feedback_type AS ENUM ('suggestion', 'complaint', 'compliment', 'bug_report', 'other');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS portal_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type feedback_type DEFAULT 'suggestion',
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    page_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_implemented BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE REALTIME
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE portal_feedback;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE portal_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can create their own feedback" ON portal_feedback;
CREATE POLICY "Users can create their own feedback" ON portal_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own feedback" ON portal_feedback;
CREATE POLICY "Users can view their own feedback" ON portal_feedback
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Technical team can view all feedback" ON portal_feedback;
CREATE POLICY "Technical team can view all feedback" ON portal_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

DROP POLICY IF EXISTS "Technical team can update all feedback" ON portal_feedback;
CREATE POLICY "Technical team can update all feedback" ON portal_feedback
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_portal_feedback_updated_at ON portal_feedback;
CREATE TRIGGER update_portal_feedback_updated_at BEFORE UPDATE ON portal_feedback FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portal_feedback_user_id ON portal_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_feedback_type ON portal_feedback(type);
CREATE INDEX IF NOT EXISTS idx_portal_feedback_read ON portal_feedback(is_read);
CREATE INDEX IF NOT EXISTS idx_portal_feedback_created ON portal_feedback(created_at DESC);
