const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function register() {
  console.log('Attempting to register user...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'samvoiceagent@gmail.com',
    password: 'Jojoboy@100',
    options: {
      data: {
        full_name: 'Sam Voice Agent',
        phone_number: '+2348012345678'
      }
    }
  });

  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }

  console.log('User registered successfully:', authData.user?.id);

  if (authData.user) {
    console.log('Attempting to insert profile...');
    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: authData.user.id,
        full_name: 'Sam Voice Agent',
        email: 'samvoiceagent@gmail.com',
        phone_number: '+2348012345678',
        status: 'approved',
      },
    ]);

    if (profileError) {
      console.error('Profile Error:', profileError.message);
    } else {
      console.log('Profile created successfully!');
    }
  }
}

register();
