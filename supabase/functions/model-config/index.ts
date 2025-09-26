import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      console.log('📋 Fetching model configurations...');

      const { data, error } = await supabase
        .from('model_configurations')
        .select('*')
        .order('tier');

      if (error) {
        throw error;
      }

      console.log(`✅ Found ${data.length} model configurations`);

      return new Response(JSON.stringify({ configurations: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (req.method === 'POST') {
      const { tier, model_name } = await req.json();

      if (!tier || !model_name) {
        return new Response(
          JSON.stringify({ error: 'Missing tier or model_name' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`🔄 Updating model configuration: ${tier} -> ${model_name}`);

      const { data, error } = await supabase
        .from('model_configurations')
        .update({ model_name })
        .eq('tier', tier)
        .select();

      if (error) {
        throw error;
      }

      console.log('✅ Model configuration updated successfully');

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

  } catch (error) {
    console.error('❌ Error handling model config:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});