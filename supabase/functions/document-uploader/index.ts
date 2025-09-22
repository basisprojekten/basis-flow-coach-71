import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import mammoth from 'https://esm.sh/mammoth@1.8.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const exercise_id = formData.get('exercise_id') as string;
    const document_type = formData.get('document_type') as string; // 'case' or 'protocol'

    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'VALIDATION_ERROR', 
        message: 'File is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!exercise_id) {
      return new Response(JSON.stringify({ 
        error: 'VALIDATION_ERROR', 
        message: 'Exercise ID is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!document_type || !['case', 'protocol'].includes(document_type)) {
      return new Response(JSON.stringify({ 
        error: 'VALIDATION_ERROR', 
        message: 'Document type must be either "case" or "protocol"' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return new Response(JSON.stringify({ 
        error: 'VALIDATION_ERROR', 
        message: 'Only .docx files are supported' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify exercise exists
    const { data: exerciseCheck, error: exerciseError } = await supabase
      .from('exercises')
      .select('id')
      .eq('id', exercise_id)
      .single();

    if (exerciseError || !exerciseCheck) {
      return new Response(JSON.stringify({ 
        error: 'VALIDATION_ERROR', 
        message: 'Invalid exercise ID' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing file upload: ${file.name} for exercise: ${exercise_id}`);

    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${exercise_id}/${fileName}`;

    // Convert File to Uint8Array for upload
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileArrayBuffer);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBytes, {
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ 
        error: 'STORAGE_ERROR', 
        message: uploadError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('File uploaded successfully to storage:', uploadData.path);

    // Extract text content from DOCX file
    let extractedContent = '';
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: fileArrayBuffer });
      extractedContent = result.value;
      console.log('Text extraction successful, length:', extractedContent.length);
    } catch (extractError) {
      console.error('Failed to extract text from DOCX:', extractError);
      // Continue without content rather than failing the upload
      extractedContent = 'Content extraction failed';
    }

    // Create document record with extracted content
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        file_name: file.name,
        storage_path: uploadData.path,
        document_type: document_type,
        content: extractedContent
      })
      .select()
      .single();

    if (documentError) {
      console.error('Database error creating document record:', documentError);
      
      // Try to clean up uploaded file
      await supabase.storage
        .from('documents')
        .remove([uploadData.path]);

      return new Response(JSON.stringify({ 
        error: 'DATABASE_ERROR', 
        message: documentError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Document record created:', documentData.id);

    // Link document to exercise
    const { data: linkData, error: linkError } = await supabase
      .from('exercise_documents')
      .insert({
        exercise_id: exercise_id,
        document_id: documentData.id
      })
      .select()
      .single();

    if (linkError) {
      console.error('Database error linking document to exercise:', linkError);
      
      // Try to clean up document record and file
      await supabase.from('documents').delete().eq('id', documentData.id);
      await supabase.storage
        .from('documents')
        .remove([uploadData.path]);

      return new Response(JSON.stringify({ 
        error: 'DATABASE_ERROR', 
        message: linkError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Document successfully linked to exercise:', linkData.id);

    return new Response(JSON.stringify({ 
      success: true,
      document: documentData,
      message: 'Document uploaded and linked successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in document-uploader function:', error);
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR', 
      message: error.message || 'Unexpected server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});