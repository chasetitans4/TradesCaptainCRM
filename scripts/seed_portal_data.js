const SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98';

const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';
const CUSTOMER_EMAIL = 'test@customer.com';
const CUSTOMER_PHONE = '+15555555555';

async function seed() {
  console.log('Starting seed...');
  
  // 1. Ensure Business
  try {
    const businessRes = await fetch(`${SUPABASE_URL}/rest/v1/businesses`, {
        method: 'POST',
        headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates'
        },
        body: JSON.stringify({
        id: BUSINESS_ID,
        name: 'Test Business For Portal',
        owner_name: 'Test Owner',
        email: 'test@tradescaptain.com',
        phone: '+15550001111',
        plan_tier: 'starter'
        })
    });
    
    if (!businessRes.ok) {
        console.error('Failed to seed business:', await businessRes.text());
    } else {
        console.log('Business ensured.');
    }
  } catch (e) {
      console.error("Error ensuring business:", e);
  }

  // 2. Create/Get Customer
  let customerId;
  try {
    const custCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${CUSTOMER_EMAIL}&business_id=eq.${BUSINESS_ID}&select=id`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const custCheckData = await custCheckRes.json();
    
    if (custCheckData.length > 0) {
        customerId = custCheckData[0].id;
    } else {
        const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                business_id: BUSINESS_ID,
                name: 'Test Customer',
                email: CUSTOMER_EMAIL,
                phone: CUSTOMER_PHONE,
                address_line1: '123 Test St',
                city: 'Testville',
                state: 'TX',
                zip: '75000'
            })
        });
        if (!custRes.ok) {
            console.error('Failed to create customer:', await custRes.text());
            return;
        }
        const custData = await custRes.json();
        customerId = custData[0].id;
    }
    console.log('Customer ID:', customerId);
  } catch (e) {
      console.error("Error ensuring customer:", e);
      return;
  }

  // 3. Ensure Portal Access
  try {
    const accessRes = await fetch(`${SUPABASE_URL}/rest/v1/customer_portal_access`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
            customer_id: customerId,
            business_id: BUSINESS_ID,
            email: CUSTOMER_EMAIL,
            is_active: true
        })
    });
    if (!accessRes.ok) {
        // likely conflict, ignore
    }
    console.log('Portal access ensured.');
  } catch (e) {
      console.error("Error ensuring portal access:", e);
  }

  // 4. Create "En Route" Job
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            business_id: BUSINESS_ID,
            customer_id: customerId,
            title: 'Emergency Leak Repair',
            description: 'Fixing leak in kitchen sink',
            status: 'in_progress',
            service_type: 'Plumbing',
            scheduled_date: new Date().toISOString().split('T')[0],
            metadata: { eta: '15 mins', technician_status: 'en_route' }
        })
    });
    console.log('Job created.');
  } catch (e) {
      console.error("Error creating job:", e);
  }

  // 5. Create "Sent" Quote
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/quotes`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            business_id: BUSINESS_ID,
            customer_id: customerId,
            quote_number: 'Q-1001',
            status: 'sent',
            total: 450.00,
            created_at: new Date().toISOString()
        })
    });
    console.log('Quote created.');
  } catch (e) {
      console.error("Error creating quote:", e);
  }

  // 6. Create "Sent" Invoice
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            business_id: BUSINESS_ID,
            customer_id: customerId,
            invoice_number: 'INV-2001',
            status: 'sent',
            total: 120.00,
            due_date: new Date().toISOString().split('T')[0]
        })
    });
    console.log('Invoice created.');
  } catch (e) {
      console.error("Error creating invoice:", e);
  }

  console.log('Seed complete.');
}

seed();
