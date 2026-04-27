-- Media Gallery for Knowledge Base
CREATE TABLE IF NOT EXISTS kb_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE kb_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technical team can manage media" ON kb_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR is_technical_team = true OR role = 'technical_team')
        )
    );

CREATE POLICY "Public read media metadata" ON kb_media
    FOR SELECT USING (true);
