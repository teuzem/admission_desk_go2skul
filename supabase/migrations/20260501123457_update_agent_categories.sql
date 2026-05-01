-- ============================================================================
-- UPDATE EXISTING AGENT CATEGORIES TO NEW ENUM VALUES
-- ============================================================================

-- Update existing records that might have been mistakenly set to 'student_travel_agency' 
-- or 'university_institution' to match the new frontend types
UPDATE agent_categories 
SET category = 'travel_agency' 
WHERE category = 'student_travel_agency';

UPDATE agent_categories 
SET category = 'university_institute' 
WHERE category = 'university_institution';
