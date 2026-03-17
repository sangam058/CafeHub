import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://otgopumbastbjnkhikjd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90Z29wdW1iYXN0Ympua2hpa2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Njg0OTEsImV4cCI6MjA4NjI0NDQ5MX0.r5caijAVxQ_2_k_zrcIB-LoW6b1joQn0YKu8BsTxJwY';

export const supabase = createClient(supabaseUrl, supabaseKey);
