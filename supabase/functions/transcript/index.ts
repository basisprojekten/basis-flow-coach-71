// Supabase Edge Function: transcript
// Handles transcript analysis and review functionality

// deno-lint-ignore-file no-explicit-any

import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status,
  });
}

// Real OpenAI-powered transcript analysis
async function generateTranscriptAnalysis(transcript: string) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  const wordCount = transcript.split(/\s+/).length;
  const estimatedDuration = Math.ceil(wordCount / 150) * 60; // Assuming 150 words per minute

  console.log('Generating transcript analysis with OpenAI', {
    transcriptLength: transcript.length,
    wordCount,
    estimatedDuration
  });

  try {
    // Generate holistic analysis using Reviewer agent approach
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Reviewer Agent analyzing a complete conversation transcript. Provide a holistic assessment of the entire interaction. Return analysis as JSON with this structure:
{
  "analyst": {
    "rubric": {
      "empathy": 1-5,
      "clarity": 1-5, 
      "boundaries": 1-5,
      "engagement": 1-5
    },
    "feedback": "overall retrospective feedback on the conversation",
    "suggestions": ["improvement suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "navigator": {
    "guidance": "overall guidance about the conversation quality",
    "nextSteps": ["next step 1", "next step 2", "next step 3"]
  },
  "reviewer": {
    "overallScore": 70-100,
    "strengths": ["strength 1", "strength 2"],
    "areasForImprovement": ["area 1", "area 2"],
    "keyInsights": ["insight 1", "insight 2"]
  }
}`
          },
          {
            role: 'user',
            content: `Analyze this complete conversation transcript:\n\n${transcript}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let analysis;

    try {
      analysis = JSON.parse(data.choices[0].message.content);
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        analyst: {
          rubric: { empathy: 3, clarity: 3, boundaries: 3, engagement: 3 },
          feedback: data.choices[0].message.content,
          suggestions: ["Continue developing communication skills", "Practice active listening", "Maintain professional boundaries"]
        },
        navigator: {
          guidance: "Focus on building stronger rapport in future interactions",
          nextSteps: ["Prepare for follow-up", "Document key points", "Plan next steps"]
        },
        reviewer: {
          overallScore: 75,
          strengths: ["Professional demeanor", "Appropriate responses"],
          areasForImprovement: ["Could improve specific areas"],
          keyInsights: ["Conversation shows good engagement"]
        }
      };
    }

    console.log('Transcript analysis generated successfully');
    return {
      analysis,
      metadata: {
        wordCount,
        estimatedDuration,
        analysisTimestamp: new Date()
      }
    };
  } catch (error) {
    console.error('Error generating transcript analysis:', error);
    // Return fallback analysis on error
    return {
      analysis: {
        analyst: {
          rubric: { empathy: 3, clarity: 3, boundaries: 3, engagement: 3 },
          feedback: "Unable to analyze transcript due to technical error",
          suggestions: ["Continue developing communication skills", "Practice active listening"]
        },
        navigator: {
          guidance: "Focus on building stronger rapport in future interactions",
          nextSteps: ["Prepare for follow-up", "Document key points"]
        },
        reviewer: {
          overallScore: 75,
          strengths: ["Professional demeanor"],
          areasForImprovement: ["Technical analysis unavailable"],
          keyInsights: ["Conversation analysis incomplete"]
        }
      },
      metadata: {
        wordCount,
        estimatedDuration,
        analysisTimestamp: new Date(),
        error: true
      }
    };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // All requests should be POST with action in body
    if (req.method !== "POST") {
      return jsonResponse({
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST method is supported. Use action field in request body.",
      }, 405);
    }

    const body = await req.json().catch(() => ({} as any));
    const { action } = body ?? {};

    if (!action) {
      return jsonResponse({
        error: "MISSING_ACTION",
        message: "action field is required in request body",
      }, 400);
    }

    console.log('Transcript function called', { action, hasBody: !!body });

    // Handle different actions
    switch (action) {
      case "review": {
        const { transcript, protocols, sessionId } = body;

        if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
          return jsonResponse({
            error: "INVALID_TRANSCRIPT",
            message: "transcript is required and must be a non-empty string",
          }, 400);
        }

        console.log('Analyzing transcript', {
          transcriptLength: transcript.length,
          protocols: protocols || ['basis-v1'],
          sessionId: sessionId || 'standalone'
        });

        // Generate analysis
        const result = await generateTranscriptAnalysis(transcript);

        return jsonResponse(result);
      }

      default:
        return jsonResponse({
          error: "INVALID_ACTION",
          message: `Unknown action: ${action}. Supported actions: review`,
        }, 400);
    }

  } catch (error: any) {
    console.error('Transcript function error:', error);
    
    return jsonResponse({
      error: "INTERNAL_ERROR",
      message: error?.message ?? "An unexpected error occurred",
    }, 500);
  }
});