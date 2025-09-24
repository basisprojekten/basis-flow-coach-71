-- Allow 'instruction_document' in documents.document_type
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_document_type_check;

ALTER TABLE public.documents
ADD CONSTRAINT documents_document_type_check
CHECK (document_type IN ('case', 'protocol', 'instruction_document'));

-- Optional: ensure existing data still valid (no-op if only case/protocol exist)
