// BASIS Training Platform - API Client
// Handles all communication with the backend services

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  Exercise,
  Lesson,
  Session,
  CreateExerciseRequest,
  CreateLessonRequest,
  StartSessionRequest,
  SessionInputRequest,
  TranscriptReviewRequest,
  AgentResponseSet,
  BasisError
} from '@/types/basis';

const SUPABASE_FUNCTIONS_URL = "https://ammawhrjbwqmwhsbdjoa.supabase.co/functions/v1";

function getApiBaseUrl() {
  try {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      return isLocal ? 'http://localhost:3001/api' : SUPABASE_FUNCTIONS_URL;
    }
  } catch {}
  // Fallback to Supabase Edge Functions in non-browser/unknown envs
  return SUPABASE_FUNCTIONS_URL;
}

const API_BASE_URL = getApiBaseUrl();

// Check if we're using Supabase Edge Functions
const isUsingSupabaseFunctions = API_BASE_URL.includes('supabase.co/functions');

// Error handling utility
class BasisApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BasisApiError';
  }
}

// Generic API request handler for Supabase Edge Functions
async function supabaseApiRequest<T>(
  functionName: string,
  body: any = {}
): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body
    });
    
    if (error) {
      throw new BasisApiError(
        error.status || 500,
        error.message || 'SUPABASE_FUNCTION_ERROR',
        error.message || 'Supabase function error',
        error
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof BasisApiError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new BasisApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Unknown network error'
    );
  }
}

// Legacy API request handler for local development
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData: BasisError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`
      }));
      
      throw new BasisApiError(
        response.status,
        errorData.code,
        errorData.message,
        errorData.details
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof BasisApiError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new BasisApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Unknown network error'
    );
  }
}

// Exercise API
export const exerciseApi = {
  // Create a new exercise
  async create(exercise: CreateExerciseRequest): Promise<{
    id: string;
    code: string;
    exercise: Database['public']['Tables']['exercises']['Row'];
    accessCode?: Database['public']['Tables']['codes']['Row'];
  }> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('exercises', {
        action: 'create',
        ...exercise
      });
    } else {
      return apiRequest('/exercises', {
        method: 'POST',
        body: JSON.stringify(exercise),
      });
    }
  },

  // Get exercise by ID or code
  async get(idOrCode: string): Promise<Exercise> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('exercises', {
        action: 'get',
        exerciseId: idOrCode
      });
    } else {
      return apiRequest(`/exercises/${idOrCode}`);
    }
  },

  // List all exercises (for admin/teacher)
  async list(): Promise<Exercise[]> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('exercises', {
        action: 'list'
      });
    } else {
      return apiRequest('/exercises');
    }
  },

  // Update exercise
  async update(id: string, updates: Partial<CreateExerciseRequest>): Promise<Exercise> {
    return apiRequest(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete exercise
  async delete(id: string): Promise<void> {
    return apiRequest(`/exercises/${id}`, {
      method: 'DELETE',
    });
  },
};

// Lesson API
export const lessonApi = {
  // Create a new lesson
  async create(lesson: CreateLessonRequest): Promise<{
    id: string;
    code: string;
    lesson: Database['public']['Tables']['lessons']['Row'];
    accessCode?: Database['public']['Tables']['codes']['Row'];
  }> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('lessons', {
        action: 'create',
        ...lesson
      });
    } else {
      return apiRequest('/lessons', {
        method: 'POST',
        body: JSON.stringify(lesson),
      });
    }
  },

  // Get lesson by ID or code
  async get(idOrCode: string): Promise<Lesson> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('lessons', {
        action: 'get',
        lessonId: idOrCode
      });
    } else {
      return apiRequest(`/lessons/${idOrCode}`);
    }
  },

  // List all lessons
  async list(): Promise<Lesson[]> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('lessons', {
        action: 'list'
      });
    } else {
      return apiRequest('/lessons');
    }
  },

  // Update lesson
  async update(id: string, updates: Partial<CreateLessonRequest>): Promise<Lesson> {
    return apiRequest(`/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete lesson
  async delete(id: string): Promise<void> {
    return apiRequest(`/lessons/${id}`, {
      method: 'DELETE',
    });
  },
};

// Session API
export const sessionApi = {
  // Start a new training session
  async start(request: StartSessionRequest): Promise<{ session: Session; initialGuidance?: AgentResponseSet }> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('session', {
        action: 'start',
        ...request
      });
    } else {
      return apiRequest('/session', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    }
  },

  // Send user input to session
  async sendInput(sessionId: string, input: SessionInputRequest): Promise<{
    session: Session;
    aiResponse?: string;
    agentFeedback: AgentResponseSet;
  }> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('session', {
        action: 'sendInput',
        sessionId,
        ...input
      });
    } else {
      return apiRequest(`/session/${sessionId}/input`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    }
  },

  // Get session state
  async get(sessionId: string): Promise<Session> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('session', {
        action: 'get',
        sessionId
      });
    } else {
      return apiRequest(`/session/${sessionId}`);
    }
  },

  // Get session summary/results
  async getSummary(sessionId: string): Promise<{
    session: Session;
    overallRubric: Record<string, number>;
    completedExercises: number;
    totalTime: number;
    keyInsights: string[];
  }> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('session', {
        action: 'getSummary',
        sessionId
      });
    } else {
      return apiRequest(`/session/${sessionId}/summary`);
    }
  },

  // End session
  async end(sessionId: string): Promise<void> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('session', {
        action: 'end',
        sessionId
      });
    } else {
      return apiRequest(`/session/${sessionId}`, {
        method: 'DELETE',
      });
    }
  },
};

// Transcript Analysis API
export const transcriptApi = {
  // Analyze a conversation transcript
  async review(request: TranscriptReviewRequest): Promise<{
    analysis: AgentResponseSet;
    metadata: {
      wordCount: number;
      estimatedDuration: number;
      analysisTimestamp: Date;
    };
  }> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('transcript', {
        action: 'review',
        ...request
      });
    } else {
      return apiRequest('/transcript/review', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    }
  },
};

// Protocol API (for managing rubrics and evaluation criteria)
export const protocolApi = {
  // Get all available protocols
  async list(): Promise<Array<{ id: string; name: string; version: string }>> {
    return apiRequest('/protocols');
  },

  // Get specific protocol details
  async get(protocolId: string): Promise<any> {
    return apiRequest(`/protocols/${protocolId}`);
  },
};

// Health check and diagnostics
export const systemApi = {
  // Check API health
  async health(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    version: string;
    timestamp: Date;
    services: Record<string, 'ok' | 'error'>;
  }> {
    if (isUsingSupabaseFunctions) {
      return supabaseApiRequest('health', {});
    } else {
      return apiRequest('/health');
    }
  },

  // Get system configuration (non-sensitive)
  async config(): Promise<{
    availableModels: string[];
    maxSessionDuration: number;
    supportedModes: string[];
  }> {
    return apiRequest('/config');
  },
};

// Add other API endpoints as needed
export const codeApi = {
  list: async () => {
    try {
      return await supabaseApiRequest<any[]>('codes', { action: 'list' });
    } catch (error) {
      console.error('Failed to fetch codes:', error);
      throw error;
    }
  }
};

// WebSocket connection for real-time features (future implementation)
export class BasisWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private handlers: Map<string, Function> = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = API_BASE_URL.replace('http', 'ws') + `/ws/session/${this.sessionId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handler = this.handlers.get(data.type);
          if (handler) {
            handler(data.payload);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
    });
  }

  on(eventType: string, handler: Function): void {
    this.handlers.set(eventType, handler);
  }

  send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export error class for error handling
export { BasisApiError };

// Utility function to check if we're running in demo mode
export const isDemoMode = (): boolean => {
  return process.env.NODE_ENV === 'development' || !API_BASE_URL.includes('api');
};

// Demo data generators for development/testing
export const demoApi = {
  // Generate mock exercise code
  generateExerciseCode: (): string => {
    return `EX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  },

  // Generate mock lesson code
  generateLessonCode: (): string => {
    return `LS-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  },

  // Simulate API delay
  delay: (ms: number = 500): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
