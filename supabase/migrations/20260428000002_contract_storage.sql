-- ═══════════════════════════════════════════════════════════════════════════
-- Contract Management — Storage Setup
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create a private bucket for agent business documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for agent-documents bucket

-- Admins and Contract Managers can do everything
CREATE POLICY "Admins and Contract Managers full access to agent-documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'agent-documents' AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'contract_manager')
    )
  )
)
WITH CHECK (
  bucket_id = 'agent-documents' AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'contract_manager')
    )
  )
);

-- Agents can view their own documents
CREATE POLICY "Agents can view their own documents in agent-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agent-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Agents can upload their own documents (insert only)
CREATE POLICY "Agents can upload their own documents to agent-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Agents can update their own documents
CREATE POLICY "Agents can update their own documents in agent-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agent-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
