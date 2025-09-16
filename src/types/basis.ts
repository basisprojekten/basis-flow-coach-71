// BASIS Training Platform - Core Type Definitions
// Defines the data models and interfaces for the training system

export interface Protocol {
  id: string;
  name: string;
  version: string;
  fields: RubricField[];
}

export interface RubricField {
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
  criteria: string[];
}

export interface Case {
  id: string;
  role: string;
  background: string;
  goals: string;
  context?: Record<string, any>;
}

export interface ExerciseToggles {
  feedforward: boolean;
  iterative: boolean;
  mode: 'voice' | 'text' | 'transcript';
  skipRoleplayForGlobalFeedback?: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  protocolStack: string[]; // Protocol IDs with optional weights
  caseId: string;
  toggles: ExerciseToggles;
  focusHint: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  exerciseOrder: string[]; // Exercise IDs in sequence
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionState {
  currentExerciseIndex: number;
  conversationHistory: ConversationMessage[];
  agentResponses: AgentResponseSet;
  rubricScores: Record<string, number>;
  startedAt: Date;
  lastActivityAt: Date;
}

export interface Session {
  id: string;
  lessonId?: string;
  exerciseId?: string;
  studentId?: string;
  mode: 'exercise' | 'lesson' | 'transcript';
  state: SessionState;
  metadata: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Agent Response Schemas - Enforced via JSON Schema validation

export interface NavigatorResponse {
  type: 'feedforward';
  next_focus?: string;
  micro_objective?: string;
  guardrails?: string[];
  user_prompt?: string;
  guidance?: string;
  nextSteps?: string[];
}

export interface AnalystResponse {
  type: 'iterative_feedback';
  segment_id?: string;
  rubric?: RubricScore[] | Record<string, number>;
  evidence_quotes?: string[];
  past_only_feedback?: string;
  feedback?: string;
  suggestions?: string[];
}

export interface ReviewerResponse {
  type: 'holistic_feedback';
  rubric_summary: RubricScore[];
  strengths: string[];
  growth_areas: string[];
  exemplar_quotes: string[];
  summary: string;
}

export interface RubricScore {
  field: string;
  score: number;
  maxScore?: number;
}

export interface AgentResponseSet {
  navigator?: NavigatorResponse;
  analyst?: AnalystResponse;
  reviewer?: ReviewerResponse;
}

// API Request/Response Types

export interface CreateExerciseRequest {
  title: string;
  protocolStack: string[];
  case: Omit<Case, 'id'>;
  toggles: ExerciseToggles;
  focusHint: string;
}

export interface CreateLessonRequest {
  title: string;
  objectives: string[];
  exerciseOrder: string[];
}

export interface StartSessionRequest {
  lessonCode?: string;
  exerciseCode?: string;
  mode?: 'exercise' | 'lesson' | 'transcript';
}

export interface SessionInputRequest {
  content: string;
  timestamp?: Date;
}

export interface TranscriptReviewRequest {
  transcript: string;
  protocolIds?: string[];
  exerciseConfig?: {
    focusHint: string;
    caseRole: string;
    caseBackground: string;
  };
}

// Error Types

export interface BasisError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface GuardrailViolation extends BasisError {
  agentType: 'navigator' | 'analyst' | 'reviewer';
  violationType: 'temporal_direction' | 'schema_compliance' | 'protocol_adherence';
  originalResponse?: string;
}

// Configuration Types

export interface AgentConfig {
  model: string;
  temperature: number;
  maxRetries: number;
  timeoutMs: number;
  systemPrompt: string;
  guardrails: GuardrailConfig[];
}

export interface GuardrailConfig {
  type: 'regex' | 'semantic' | 'schema';
  rule: string | RegExp;
  errorMessage: string;
  severity: 'error' | 'warning';
}

// Utility Types

export type AgentType = 'navigator' | 'analyst' | 'reviewer';
export type SessionMode = 'exercise' | 'lesson' | 'transcript';
export type ConversationRole = 'system' | 'user' | 'assistant';

// Default Configurations

export const DEFAULT_BASIS_PROTOCOL: Protocol = {
  id: 'basis-v1',
  name: 'BASIS Communication Protocol',
  version: '1.0',
  fields: [
    {
      name: 'Active Listening',
      description: 'Demonstrates attentive listening and understanding',
      minScore: 0,
      maxScore: 4,
      criteria: [
        'Uses verbal and non-verbal acknowledgments',
        'Reflects back what was heard',
        'Asks clarifying questions',
        'Avoids interrupting'
      ]
    },
    {
      name: 'Empathy',
      description: 'Shows understanding and validation of emotions',
      minScore: 0,
      maxScore: 4,
      criteria: [
        'Acknowledges emotional states',
        'Validates feelings without judgment',
        'Uses appropriate emotional language',
        'Demonstrates genuine concern'
      ]
    },
    {
      name: 'Professionalism',
      description: 'Maintains appropriate boundaries and conduct',
      minScore: 0,
      maxScore: 4,
      criteria: [
        'Uses professional language',
        'Maintains appropriate boundaries',
        'Respects confidentiality',
        'Demonstrates competence'
      ]
    },
    {
      name: 'Problem Resolution',
      description: 'Works towards constructive outcomes',
      minScore: 0,
      maxScore: 4,
      criteria: [
        'Identifies core issues',
        'Explores potential solutions',
        'Facilitates decision-making',
        'Plans next steps'
      ]
    }
  ]
};

export const AGENT_CONFIGS: Record<AgentType, Partial<AgentConfig>> = {
  navigator: {
    temperature: 0.7,
    maxRetries: 3,
    timeoutMs: 10000,
  },
  analyst: {
    temperature: 0.3,
    maxRetries: 2,
    timeoutMs: 8000,
  },
  reviewer: {
    temperature: 0.4,
    maxRetries: 2,
    timeoutMs: 15000,
  }
};