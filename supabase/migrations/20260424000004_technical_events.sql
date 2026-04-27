-- Create ENUMs for technical events
DO $$ BEGIN
    CREATE TYPE technical_event_type AS ENUM ('incident', 'maintenance', 'update', 'alert');
    CREATE TYPE technical_event_severity AS ENUM ('low', 'medium', 'high', 'critical');
    CREATE TYPE technical_event_status AS ENUM ('active', 'resolved', 'scheduled', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create technical_events table
CREATE TABLE IF NOT EXISTS technical_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    type technical_event_type NOT NULL DEFAULT 'incident',
    severity technical_event_severity NOT NULL DEFAULT 'medium',
    status technical_event_status NOT NULL DEFAULT 'active',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    affected_services TEXT[] DEFAULT '{}',
    start_at TIMESTAMPTZ DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    media_urls TEXT[] DEFAULT '{}',
    is_global BOOLEAN DEFAULT true
);

-- Create technical_event_responses table
CREATE TABLE IF NOT EXISTS technical_event_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES technical_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    message TEXT,
    media_urls TEXT[] DEFAULT '{}',
    is_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE technical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_event_responses ENABLE ROW LEVEL SECURITY;

-- Policies for technical_events
CREATE POLICY "Anyone can read active/scheduled technical events"
    ON technical_events FOR SELECT
    USING (status IN ('active', 'scheduled', 'resolved'));

CREATE POLICY "Technical team can manage technical events"
    ON technical_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('admin', 'super_admin') OR is_technical_team = true)
        )
    );

-- Policies for technical_event_responses
CREATE POLICY "Users can read their own responses"
    ON technical_event_responses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own responses"
    ON technical_event_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Technical team can read all responses"
    ON technical_event_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role IN ('admin', 'super_admin') OR is_technical_team = true)
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tech_events_status ON technical_events(status);
CREATE INDEX IF NOT EXISTS idx_tech_events_created_at ON technical_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tech_responses_event ON technical_event_responses(event_id);
