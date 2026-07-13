import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sstiexjgfdyxsybooldf.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGlleGpnZmR5eHN5Ym9vbGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjE0MjQsImV4cCI6MjA5Njk5NzQyNH0.UDhVUZ38UwWF_11pnQphO9ySIuVwewVw8Z9OE6RFFMA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
