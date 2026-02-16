
const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials from diagnose_tables.js for verification
const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSystem() {
  console.log('--- Checking Platform Settings Table ---');
  const { data: settings, error: settingsError } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(1);

  if (settingsError) {
    console.error('❌ Error accessing platform_settings:', settingsError.message);
  } else {
    console.log('✅ platform_settings table exists.');
  }

  console.log('\n--- Checking Storage Buckets ---');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError.message);
  } else {
    const platformAssets = buckets.find(b => b.name === 'platform-assets');
    if (platformAssets) {
      console.log('✅ platform-assets bucket exists.');
      console.log('   Public:', platformAssets.public);
    } else {
      console.error('❌ platform-assets bucket NOT found.');
      console.log('   Available buckets:', buckets.map(b => b.name).join(', '));
    }
  }
}

checkSystem().catch(console.error);
