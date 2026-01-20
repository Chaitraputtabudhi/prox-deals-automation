// Database configuration - Supabase client setup
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(){
  if(!supabaseClient){
    if(!supabaseUrl || !supabaseKey){
      console.error('Missing Supabase credentails!');
      console.error('Required environment variables:');
      console.error('  - SUPABASE_URL');
      console.error('  - SUPABASE_ANON_KEY');
      throw new Error('Missing Supabase credentials');
    }
    supabaseClient = createClient(supabaseUrl,supabaseKey);
    console.log('Supabase Client initialized')
  }
  return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target,prop){
    return getSupabase()[prop as keyof SupabaseClient]
  }
});
