-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);

-- Create RLS policies for document storage
CREATE POLICY "Allow service role to manage documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to read documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');