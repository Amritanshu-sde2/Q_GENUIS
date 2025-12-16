import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

// Safe access to process.env for browser environments where it might not be defined
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL') || 'https://xyz.supabase.co';
const supabaseKey = getEnv('REACT_APP_SUPABASE_ANON_KEY') || 'public-anon-key';

// Flag to check if we have real credentials or are using the placeholder
export const isSupabaseConfigured = supabaseUrl !== 'https://xyz.supabase.co';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Mock Data Store for Demo purposes
export const MOCK_USERS: User[] = [
  { id: '1', email: 'admin@qgenius.com', name: 'Admin User', role: 'ADMIN' },
  { id: '2', email: 'faculty@qgenius.com', name: 'Dr. Smith', role: 'FACULTY' },
  { id: '3', email: 'super@qgenius.com', name: 'Super Admin', role: 'SUPER_ADMIN' },
];