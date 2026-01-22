const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Checking tables...');

  // 1. Check client_onboarding
  const { data: onboarding, error: onboardingError } = await supabase
    .from('client_onboarding')
    .select('*')
    .limit(1);
    
  if (onboardingError) {
    console.error('Error accessing client_onboarding:', onboardingError.message);
  } else {
    console.log('client_onboarding exists. Count:', onboarding.length);
  }

  // 2. Check crm_accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('crm_accounts')
    .select('*')
    .limit(1);

  if (accountsError) {
    console.error('Error accessing crm_accounts:', accountsError.message);
  } else {
    console.log('crm_accounts exists. Count:', accounts.length);
  }
  
  // 3. Check relationship
  if (!onboardingError && !accountsError) {
    console.log('Checking relationship...');
    const { data: rel, error: relError } = await supabase
        .from('client_onboarding')
        .select(`
        *,
        client:crm_accounts!client_id(id, business_name, plan_type)
        `)
        .limit(1);
        
    if (relError) {
        console.error('Relationship error:', relError.message);
    } else {
        console.log('Relationship query success.');
    }
  }
}

run();
