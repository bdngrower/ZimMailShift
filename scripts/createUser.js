import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tnxjyyqwohkebmtfwijg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRueGp5eXF3b2hrZWJtdGZ3aWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjAxOTUsImV4cCI6MjA5MzAzNjE5NX0.kn3pWh_JVWq-vFc0aOVIh40IvLsw5apMnLhy_WKvYOg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'criszimn@gmail.com',
    password: 'Cr1$Z_8812',
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user?.id);
    console.log('Note: If email confirmation is enabled in Supabase, you will need to click the link sent to your email.');
  }
}

createUser();
