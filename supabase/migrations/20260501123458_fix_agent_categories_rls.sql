-- Fix RLS policies for agent_categories and agent_category_review_queue
-- Allow admins, contract_managers, and admission_managers to insert/update

-- 1. agent_categories policies
DROP POLICY IF EXISTS "Enable read access for all users" ON agent_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON agent_categories;
DROP POLICY IF EXISTS "Enable update for admins" ON agent_categories;
DROP POLICY IF EXISTS "Enable insert for admins" ON agent_categories;
DROP POLICY IF EXISTS "Enable all actions for admins and managers" ON agent_categories;

CREATE POLICY "Enable read access for all authenticated users" 
ON agent_categories FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable all actions for admins and managers" 
ON agent_categories FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin', 'contract_manager', 'admission_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin', 'contract_manager', 'admission_manager')
  )
);

CREATE POLICY "Enable agents to view their own category" 
ON agent_categories FOR SELECT 
TO authenticated 
USING (agent_id = auth.uid());

-- 2. agent_category_review_queue policies
DROP POLICY IF EXISTS "Enable read access for all users" ON agent_category_review_queue;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON agent_category_review_queue;
DROP POLICY IF EXISTS "Enable update for admins" ON agent_category_review_queue;
DROP POLICY IF EXISTS "Enable insert for admins" ON agent_category_review_queue;
DROP POLICY IF EXISTS "Enable all actions for admins and managers" ON agent_category_review_queue;

CREATE POLICY "Enable read access for all authenticated users" 
ON agent_category_review_queue FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable all actions for admins and managers" 
ON agent_category_review_queue FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin', 'contract_manager', 'admission_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin', 'contract_manager', 'admission_manager')
  )
);

CREATE POLICY "Enable agents to insert into review queue" 
ON agent_category_review_queue FOR INSERT 
TO authenticated 
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Enable agents to view their own review queue" 
ON agent_category_review_queue FOR SELECT 
TO authenticated 
USING (agent_id = auth.uid());

-- 3. Check agent_contracts as well
DROP POLICY IF EXISTS "Enable all actions for admins and managers on contracts" ON agent_contracts;

CREATE POLICY "Enable all actions for admins and managers on contracts" 
ON agent_contracts FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin', 'contract_manager', 'admission_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin', 'contract_manager', 'admission_manager')
  )
);
