-- ============================================================================
-- FIX AGENT CATEGORY ENUM VALUES
-- Run this in your Supabase SQL Editor to fix the invalid input value errors
-- ============================================================================

-- PostgreSQL does not allow dropping values from an ENUM, but we can add new ones.
-- The frontend is sending values that don't exist in the database ENUM.
ALTER TYPE agent_category ADD VALUE IF NOT EXISTS 'student_recruitment_agency';
ALTER TYPE agent_category ADD VALUE IF NOT EXISTS 'travel_agency';
ALTER TYPE agent_category ADD VALUE IF NOT EXISTS 'university_institute';
ALTER TYPE agent_category ADD VALUE IF NOT EXISTS 'vocational_training_center';
ALTER TYPE agent_category ADD VALUE IF NOT EXISTS 'secondary_high_school';
ALTER TYPE agent_category ADD VALUE IF NOT EXISTS 'language_center';


