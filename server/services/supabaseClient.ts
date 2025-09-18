/**
 * Supabase Client for Server-Side Operations
 * Uses service role key for backend database operations
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

// Create Supabase client with service role for backend operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Backward-compatible export name used throughout routes
export const supabaseClient = supabase;

// Health check function
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('cases').select('id').limit(1);
    return !error;
  } catch (error) {
    logger.error('Supabase connection check failed', { error });
    return false;
  }
}