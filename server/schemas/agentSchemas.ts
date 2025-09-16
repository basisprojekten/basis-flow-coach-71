/**
 * JSON Schemas for Agent Responses - Enforced via OpenAI Structured Outputs
 */

export const NAVIGATOR_SCHEMA = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "feedforward"
    },
    next_focus: {
      type: "string",
      description: "What the student should focus on next",
      minLength: 10,
      maxLength: 200
    },
    micro_objective: {
      type: "string", 
      description: "Specific short-term goal for next interaction",
      minLength: 10,
      maxLength: 150
    },
    guardrails: {
      type: "array",
      items: {
        type: "string",
        minLength: 5,
        maxLength: 100
      },
      minItems: 1,
      maxItems: 5,
      description: "Key principles to remember"
    },
    user_prompt: {
      type: "string",
      description: "Direct guidance message to student",
      minLength: 20,
      maxLength: 300
    }
  },
  required: ["type", "next_focus", "micro_objective", "guardrails", "user_prompt"],
  additionalProperties: false
} as const;

export const ANALYST_SCHEMA = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "iterative_feedback"
    },
    segment_id: {
      type: "string",
      description: "Unique identifier for this interaction segment",
      pattern: "^seg_[a-zA-Z0-9_-]+$"
    },
    rubric: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: {
            type: "string",
            description: "Rubric field name from active protocol"
          },
          score: {
            type: "integer",
            minimum: 0,
            maximum: 4,
            description: "Score for this rubric field (0-4)"
          }
        },
        required: ["field", "score"],
        additionalProperties: false
      },
      minItems: 1,
      maxItems: 8
    },
    evidence_quotes: {
      type: "array",
      items: {
        type: "string",
        minLength: 5,
        maxLength: 200
      },
      minItems: 1,
      maxItems: 5,
      description: "Direct quotes from student response as evidence"
    },
    past_only_feedback: {
      type: "string",
      description: "Retrospective feedback focusing only on what just happened",
      minLength: 20,
      maxLength: 400
    }
  },
  required: ["type", "segment_id", "rubric", "evidence_quotes", "past_only_feedback"],
  additionalProperties: false
} as const;

export const REVIEWER_SCHEMA = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "holistic_feedback"
    },
    rubric_summary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: {
            type: "string",
            description: "Rubric field name from active protocol"
          },
          score: {
            type: "integer", 
            minimum: 0,
            maximum: 4,
            description: "Overall score for this field across entire conversation"
          }
        },
        required: ["field", "score"],
        additionalProperties: false
      },
      minItems: 1,
      maxItems: 8
    },
    strengths: {
      type: "array",
      items: {
        type: "string",
        minLength: 10,
        maxLength: 150
      },
      minItems: 1,
      maxItems: 6,
      description: "Key strengths demonstrated throughout conversation"
    },
    growth_areas: {
      type: "array",
      items: {
        type: "string",
        minLength: 10,
        maxLength: 150  
      },
      minItems: 1,
      maxItems: 6,
      description: "Areas for development identified across conversation"
    },
    exemplar_quotes: {
      type: "array",
      items: {
        type: "string",
        minLength: 10,
        maxLength: 200
      },
      minItems: 0,
      maxItems: 5,
      description: "Standout quotes that demonstrate strong skills"
    },
    summary: {
      type: "string",
      description: "Overall assessment and development recommendations",
      minLength: 50,
      maxLength: 500
    }
  },
  required: ["type", "rubric_summary", "strengths", "growth_areas", "exemplar_quotes", "summary"],
  additionalProperties: false
} as const;

// Schema registry for validation
export const AGENT_SCHEMAS = {
  navigator: NAVIGATOR_SCHEMA,
  analyst: ANALYST_SCHEMA, 
  reviewer: REVIEWER_SCHEMA
} as const;

// TypeScript types derived from schemas
export type NavigatorResponse = {
  type: "feedforward";
  next_focus: string;
  micro_objective: string;
  guardrails: string[];
  user_prompt: string;
};

export type AnalystResponse = {
  type: "iterative_feedback";
  segment_id: string;
  rubric: Array<{
    field: string;
    score: number;
  }>;
  evidence_quotes: string[];
  past_only_feedback: string;
};

export type ReviewerResponse = {
  type: "holistic_feedback";
  rubric_summary: Array<{
    field: string;
    score: number;
  }>;
  strengths: string[];
  growth_areas: string[];
  exemplar_quotes: string[];
  summary: string;
};

export type AgentResponse = NavigatorResponse | AnalystResponse | ReviewerResponse;