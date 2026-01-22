
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDashboardData() {
  const customerId = '22222222-2222-2222-2222-222222222222';
  console.log(`Testing dashboard data for customer ${customerId}...`);

  // Simulate getCustomerDashboardSummary logic using admin client
  try {
    const results = await Promise.allSettled([
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .in('status', ['scheduled', 'in_progress']),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .in('status', ['sent', 'overdue']),
      supabase
        .from('invoices')
        .select('total')
        .eq('customer_id', customerId)
        .in('status', ['sent', 'overdue']),
      supabase
        .from('customer_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('status', 'active'),
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('status', 'pending'),
    ]);

    const upcomingAppointments = results[0].status === 'fulfilled' ? results[0].value.count || 0 : 'Error';
    const unpaidInvoices = results[1].status === 'fulfilled' ? results[1].value.count || 0 : 'Error';
    
    console.log('Dashboard Summary:');
    console.log('- Upcoming Appointments:', upcomingAppointments);
    console.log('- Unpaid Invoices:', unpaidInvoices);
    
    if (results[0].status === 'rejected') console.error('Jobs query failed:', results[0].reason);
    if (results[1].status === 'rejected') console.error('Invoices query failed:', results[1].reason);

  } catch (err) {
    console.error('Dashboard data fetch failed:', err);
  }
}

testDashboardData();
