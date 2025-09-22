-- Add content column to documents table to store extracted text
ALTER TABLE public.documents 
ADD COLUMN content text;