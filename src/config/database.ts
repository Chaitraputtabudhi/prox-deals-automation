// Database configuration - Supabase client setup
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

// Validate credentials exist
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  console.error('Please check your .env file has:');
  console.error('  - SUPABASE_URL');
  console.error('  - SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase client initialized');