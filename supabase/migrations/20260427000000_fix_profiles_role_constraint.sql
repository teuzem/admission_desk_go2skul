-- ============================================================================
-- Fix profiles_role_check constraint
-- Version: 2026.04.27
-- Description: Drops the existing restrictive CHECK constraint on profiles.role
-- and replaces it with one that includes ALL valid roles:
--   agent, admin, editor, admission_manager, program_manager, technical_team
-- 
-- This fixes the error:
--   "new row for relation 'profiles' violates check constraint 'profiles_role_check'"
-- ============================================================================

-- Drop the existing constraint (safe: IF EXISTS handles missing constraint)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the updated constraint with ALL valid roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('agent', 'admin', 'editor', 'admission_manager', 'program_manager', 'technical_team'));
