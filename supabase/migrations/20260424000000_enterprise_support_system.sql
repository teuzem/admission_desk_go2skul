-- =====================================================================
-- ADMISSION DESK — ENTERPRISE SUPPORT SYSTEM MIGRATION
-- Version: 2.0 — Production-Grade Implementation
-- =====================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
        CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'awaiting_response', 'resolved', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_priority') THEN
        CREATE TYPE support_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent', 'critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kb_article_status') THEN
        CREATE TYPE kb_article_status AS ENUM ('draft', 'published', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_category') THEN
        CREATE TYPE support_ticket_category AS ENUM (
            'login_authentication',
            'account_access',
            'application_submission',
            'document_upload',
            'payment_billing',
            'university_programs',
            'profile_settings',
            'notification_email',
            'performance_speed',
            'mobile_responsive',
            'data_export',
            'api_integration',
            'security_privacy',
            'browser_compatibility',
            'feature_request',
            'bug_report',
            'other'
        );
    END IF;
END $$;

-- 2. ENHANCE PROFILES — Add is_technical_team flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_technical_team BOOLEAN DEFAULT FALSE;

-- 3. KNOWLEDGE BASE CATEGORIES
CREATE TABLE IF NOT EXISTS kb_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT 'Book',
    description TEXT,
    display_order INT DEFAULT 0,
    article_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. KNOWLEDGE BASE ARTICLES
CREATE TABLE IF NOT EXISTS kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image_url TEXT,
    author_id UUID REFERENCES profiles(id),
    status kb_article_status DEFAULT 'draft',
    tags TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    view_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPORT TICKETS — Enhanced
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    priority support_ticket_priority DEFAULT 'medium',
    status support_ticket_status DEFAULT 'open',
    description TEXT NOT NULL,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    error_message TEXT,
    page_url TEXT,
    attachments JSONB DEFAULT '[]',
    session_info JSONB DEFAULT '{}',
    agent_info JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    assigned_to UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    satisfaction_rating INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TICKET MESSAGES (THREAD)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUTO-GENERATE TICKET NUMBER
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_num INT;
BEGIN
    SELECT COUNT(*) + 1 INTO seq_num FROM support_tickets;
    NEW.ticket_number := 'AD-' || LPAD(seq_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_number ON support_tickets;
CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL)
    EXECUTE FUNCTION generate_ticket_number();

-- 8. UPDATE ARTICLE COUNT ON KB CATEGORY
CREATE OR REPLACE FUNCTION update_kb_category_article_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.category_id IS NOT NULL THEN
        UPDATE kb_categories SET article_count = article_count + 1 WHERE id = NEW.category_id;
    ELSIF TG_OP = 'DELETE' AND OLD.category_id IS NOT NULL THEN
        UPDATE kb_categories SET article_count = article_count - 1 WHERE id = OLD.category_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        IF OLD.category_id IS NOT NULL THEN
            UPDATE kb_categories SET article_count = article_count - 1 WHERE id = OLD.category_id;
        END IF;
        IF NEW.category_id IS NOT NULL THEN
            UPDATE kb_categories SET article_count = article_count + 1 WHERE id = NEW.category_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_kb_article_count ON kb_articles;
CREATE TRIGGER sync_kb_article_count
    AFTER INSERT OR UPDATE OR DELETE ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_category_article_count();

-- 9. ENABLE REALTIME
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_ticket_messages;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE kb_articles;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 10. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('kb-media', 'kb-media', true)
ON CONFLICT (id) DO NOTHING;

-- 11. STORAGE POLICIES
DROP POLICY IF EXISTS "Anyone can view support attachments" ON storage.objects;
CREATE POLICY "Anyone can view support attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'support-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload support attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload support attachments" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can view kb media" ON storage.objects;
CREATE POLICY "Anyone can view kb media" ON storage.objects
    FOR SELECT USING (bucket_id = 'kb-media');

DROP POLICY IF EXISTS "Technical team can upload kb media" ON storage.objects;
CREATE POLICY "Technical team can upload kb media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'kb-media' AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

-- 12. ROW LEVEL SECURITY (RLS)
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- KB Category Policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON kb_categories;
CREATE POLICY "Categories are viewable by everyone" ON kb_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Technical team can manage categories" ON kb_categories;
CREATE POLICY "Technical team can manage categories" ON kb_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

-- KB Article Policies
DROP POLICY IF EXISTS "Published articles are viewable by authenticated users" ON kb_articles;
CREATE POLICY "Published articles are viewable by authenticated users" ON kb_articles
    FOR SELECT USING (status = 'published' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

DROP POLICY IF EXISTS "Technical team can manage articles" ON kb_articles;
CREATE POLICY "Technical team can manage articles" ON kb_articles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

-- Ticket Policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets" ON support_tickets
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own tickets" ON support_tickets;
CREATE POLICY "Users can create their own tickets" ON support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own tickets" ON support_tickets;
CREATE POLICY "Users can update their own tickets" ON support_tickets
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Technical team can view all tickets" ON support_tickets;
CREATE POLICY "Technical team can view all tickets" ON support_tickets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

DROP POLICY IF EXISTS "Technical team can update all tickets" ON support_tickets;
CREATE POLICY "Technical team can update all tickets" ON support_tickets
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

DROP POLICY IF EXISTS "Technical team can delete tickets" ON support_tickets;
CREATE POLICY "Technical team can delete tickets" ON support_tickets
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

-- Message Policies
DROP POLICY IF EXISTS "Users can view messages for their own tickets" ON support_ticket_messages;
CREATE POLICY "Users can view messages for their own tickets" ON support_ticket_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
        AND is_internal = false
    );

DROP POLICY IF EXISTS "Users can insert messages to their own tickets" ON support_ticket_messages;
CREATE POLICY "Users can insert messages to their own tickets" ON support_ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Technical team can view all messages" ON support_ticket_messages;
CREATE POLICY "Technical team can view all messages" ON support_ticket_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

DROP POLICY IF EXISTS "Technical team can insert messages" ON support_ticket_messages;
CREATE POLICY "Technical team can insert messages" ON support_ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

DROP POLICY IF EXISTS "Technical team can update messages" ON support_ticket_messages;
CREATE POLICY "Technical team can update messages" ON support_ticket_messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_technical_team = true))
    );

-- 13. TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_kb_categories_updated_at ON kb_categories;
CREATE TRIGGER update_kb_categories_updated_at BEFORE UPDATE ON kb_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_articles_updated_at ON kb_articles;
CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 14. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(slug);

-- 15. SEED DEFAULT KB CATEGORIES
INSERT INTO kb_categories (name, slug, icon, description, display_order)
VALUES 
    ('Getting Started', 'getting-started', 'Rocket', 'Essential guides to help you get up and running with Admission Desk', 1),
    ('Account & Profile', 'account-profile', 'User', 'Managing your account settings, profile information, and security', 2),
    ('Applications', 'applications', 'FileText', 'Step-by-step guides for creating, submitting, and tracking applications', 3),
    ('Document Management', 'document-management', 'FolderOpen', 'Uploading, organizing, and managing required documents', 4),
    ('University & Programs', 'university-programs', 'GraduationCap', 'Browsing universities, comparing programs, and understanding requirements', 5),
    ('Payments & Billing', 'payments-billing', 'CreditCard', 'Payment methods, invoices, refunds, and billing inquiries', 6),
    ('Team Management', 'team-management', 'Users', 'Adding team members, roles, permissions, and collaboration', 7),
    ('Security & Privacy', 'security-privacy', 'Shield', 'Two-factor authentication, password policies, and data protection', 8),
    ('Troubleshooting', 'troubleshooting', 'Wrench', 'Common issues, error resolution, and technical debugging guides', 9),
    ('API & Integrations', 'api-integrations', 'Puzzle', 'REST API documentation, webhooks, and third-party integrations', 10)
ON CONFLICT (slug) DO NOTHING;
