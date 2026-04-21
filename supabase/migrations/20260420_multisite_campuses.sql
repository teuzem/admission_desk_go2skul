-- ============================================================================
-- Multisite University Campuses & Program Campus Assignments
-- Version: 2026.04.20
-- Description: Ensures university_campuses and program_campus_assignments
-- tables exist, adds is_multisite column to universities if missing,
-- and sets up proper RLS policies.
-- ============================================================================

-- Add is_multisite column to universities if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'universities'
      AND column_name = 'is_multisite'
  ) THEN
    ALTER TABLE universities ADD COLUMN is_multisite BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add is_all_campuses column to programs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'is_all_campuses'
  ) THEN
    ALTER TABLE programs ADD COLUMN is_all_campuses BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ─── University Campuses Table ───
CREATE TABLE IF NOT EXISTS university_campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  campus_name VARCHAR(255),
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  region VARCHAR(100),
  address TEXT,
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  website_url TEXT,
  student_count INTEGER,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Program ↔ Campus Assignment Junction Table ───
CREATE TABLE IF NOT EXISTS program_campus_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  campus_id UUID NOT NULL REFERENCES university_campuses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, campus_id)
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_university_campuses_university_id
  ON university_campuses(university_id);
CREATE INDEX IF NOT EXISTS idx_university_campuses_country
  ON university_campuses(country);
CREATE INDEX IF NOT EXISTS idx_university_campuses_is_main
  ON university_campuses(is_main);
CREATE INDEX IF NOT EXISTS idx_program_campus_assignments_program_id
  ON program_campus_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_program_campus_assignments_campus_id
  ON program_campus_assignments(campus_id);

-- ─── Row Level Security ───
ALTER TABLE university_campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_campus_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read campuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'university_campuses' AND policyname = 'Anyone can view university campuses'
  ) THEN
    CREATE POLICY "Anyone can view university campuses"
      ON university_campuses FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Allow admins to manage campuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'university_campuses' AND policyname = 'Admins can manage university campuses'
  ) THEN
    CREATE POLICY "Admins can manage university campuses"
      ON university_campuses FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'admission_manager')
        )
      );
  END IF;
END $$;

-- Allow authenticated users to read program campus assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'program_campus_assignments' AND policyname = 'Anyone can view program campus assignments'
  ) THEN
    CREATE POLICY "Anyone can view program campus assignments"
      ON program_campus_assignments FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Allow admins to manage program campus assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'program_campus_assignments' AND policyname = 'Admins can manage program campus assignments'
  ) THEN
    CREATE POLICY "Admins can manage program campus assignments"
      ON program_campus_assignments FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'admission_manager')
        )
      );
  END IF;
END $$;

-- Enable realtime for campuses
ALTER PUBLICATION supabase_realtime ADD TABLE university_campuses;
ALTER PUBLICATION supabase_realtime ADD TABLE program_campus_assignments;

-- ─── Grant Permissions ───
GRANT ALL ON university_campuses TO anon, authenticated;
GRANT ALL ON program_campus_assignments TO anon, authenticated;
