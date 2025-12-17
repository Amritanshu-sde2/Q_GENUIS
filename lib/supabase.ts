import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

// Safe access to process.env
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// 1. Try Environment Variables
const envUrl = getEnv('REACT_APP_SUPABASE_URL');
const envKey = getEnv('REACT_APP_SUPABASE_ANON_KEY');

// 2. Try Local Storage (User entered)
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('sb_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('sb_key') : null;

// 3. Check Demo Mode
export const isDemoMode = typeof window !== 'undefined' && localStorage.getItem('demo_mode') === 'true';

const supabaseUrl = envUrl || storedUrl;
const supabaseKey = envKey || storedKey;

// Validation: Check if we have valid credentials
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseKey && 
  supabaseUrl !== 'https://xyz.supabase.co' &&
  !supabaseUrl.includes('placeholder');

// Initialize Client
// We pass a placeholder if missing to satisfy the constructor type
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

export const enableDemoMode = () => {
    localStorage.setItem('demo_mode', 'true');
    window.location.reload();
};

// Helper to save credentials from UI
export const saveSupabaseConfig = (url: string, key: string) => {
  // Simple validation to ensure protocol
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://${formattedUrl}`;
  }
  
  localStorage.setItem('sb_url', formattedUrl);
  localStorage.setItem('sb_key', key.trim());
  localStorage.removeItem('demo_mode'); // Disable demo mode if real creds are saved
  
  // Reload to re-initialize the client with new keys
  window.location.reload();
};

export const clearSupabaseConfig = () => {
    localStorage.removeItem('sb_url');
    localStorage.removeItem('sb_key');
    localStorage.removeItem('demo_mode');
    window.location.reload();
}

export const MOCK_USERS: User[] = [
  { id: '1', email: 'admin@qgenius.com', name: 'Admin User', role: 'ADMIN' },
  { id: '2', email: 'faculty@qgenius.com', name: 'Dr. Smith', role: 'FACULTY' },
  { id: '3', email: 'super@qgenius.com', name: 'Super Admin', role: 'SUPER_ADMIN' },
];