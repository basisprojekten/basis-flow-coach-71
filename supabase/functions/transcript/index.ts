// Supabase Edge Function: transcript
// Handles transcript analysis and review functionality

// deno-lint-ignore-file no-explicit-any

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

// Mock agent feedback for transcript analysis
function generateTranscriptAnalysis(transcript: string) {
  const wordCount = transcript.split(/\s+/).length;
  const estimatedDuration = Math.ceil(wordCount / 150) * 60; // Assuming 150 words per minute

  return {
    analysis: {
      analyst: {
        rubric: {
          empathy: Math.floor(Math.random() * 3) + 3, // 3-5
          clarity: Math.floor(Math.random() * 3) + 3,
          boundaries: Math.floor(Math.random() * 3) + 3,
          engagement: Math.floor(Math.random() * 3) + 3
        },
        feedback: "The conversation demonstrates good listening skills and appropriate responses. Consider incorporating more open-ended questions to encourage deeper discussion.",
        suggestions: [
          "Use more reflective listening techniques",
          "Ask follow-up questions to clarify parent concerns",
          "Provide specific examples when discussing strategies"
        ]
      },
      navigator: {
        guidance: "The conversation flow shows good progression. The professional maintained appropriate boundaries while showing empathy.",
        nextSteps: [
          "Schedule follow-up meeting",
          "Prepare specific resource recommendations",
          "Document key concerns raised"
        ]
      },
      reviewer: {
        overallScore: Math.floor(Math.random() * 21) + 70, // 70-90
        strengths: [
          "Active listening demonstrated",
          "Professional tone maintained",
          "Clear communication"
        ],
        improvements: [
          "Could expand on available resources",
          "More specific action items needed"
        ],
        recommendations: [
          "Practice using open-ended questions",
          "Develop resource reference sheet",
          "Role-play challenging scenarios"
        ]
      }
    },
    metadata: {
      wordCount,
      estimatedDuration,
      analysisTimestamp: new Date()
    }
  };
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
        const result = generateTranscriptAnalysis(transcript);

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