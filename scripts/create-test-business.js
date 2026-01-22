const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abafispmjdpryjkevath.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestBusiness() {
  const testId = '11111111-1111-1111-1111-111111111111';
  
  console.log('V4 Debugging...');

  console.log('Creating test business...');
  const payload = {
      id: testId,
      name: 'Test Business For Portal',
      phone: '+15550001111',
      email: 'test@tradescaptain.com',
      owner_name: 'Test Owner',
      contact_name: 'Test Owner', // Try providing this as well
      // ownerName: 'Test Owner', // Removed
  };
  console.log('Payload:', payload);

  const { data, error } = await supabase
    .from('businesses')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating business:', error);
  } else {
    console.log('Created test business:', data.id);
  }
}

createTestBusiness();
