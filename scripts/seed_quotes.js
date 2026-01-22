
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedQuotes() {
  console.log('Seeding quotes...');

  // 1. Get the customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, business_id')
    .eq('email', 'customer@example.com')
    .single();

  if (customerError) {
    console.error('Error finding customer:', customerError);
    return;
  }

  if (!customer) {
    console.error('Customer not found');
    return;
  }

  console.log(`Found customer: ${customer.id}`);

  // 2. Check for existing quotes
  const { data: existingQuotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id')
    .eq('customer_id', customer.id);

  if (existingQuotes && existingQuotes.length > 0) {
    console.log(`Customer already has ${existingQuotes.length} quotes.`);
    return;
  }

  // 3. Create a job (required for quote)
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      business_id: customer.business_id,
      customer_id: customer.id,
      service_type: 'Bathroom Renovation',
      scheduled_date: new Date().toISOString().split('T')[0],
      status: 'scheduled'
    })
    .select()
    .single();

  if (jobError) {
      // If job creation fails, maybe one exists?
      console.log('Could not create job, trying to find one...', jobError.message);
  }

  const jobId = job ? job.id : null;

  // 4. Create a quote
  const { data: quote, error: createError } = await supabase
    .from('quotes')
    .insert({
      business_id: customer.business_id,
      customer_id: customer.id,
      job_id: jobId,
      quote_number: 'Q-1001',
      status: 'sent',
      subtotal: 5000.00,
      tax_amount: 400.00,
      total: 5400.00,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      notes: 'Estimate for master bathroom renovation.'
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating quote:', createError);
    return;
  }

  console.log(`Created quote: ${quote.id}`);

  // 5. Create quote items
  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert([
      {
        quote_id: quote.id,
        description: 'Demolition and Removal',
        quantity: 1,
        unit_price: 1000.00,
        total: 1000.00,
        sort_order: 1
      },
      {
        quote_id: quote.id,
        description: 'Installation of new fixtures',
        quantity: 1,
        unit_price: 4000.00,
        total: 4000.00,
        sort_order: 2
      }
    ]);

  if (itemsError) {
    console.error('Error creating quote items:', itemsError);
  } else {
    console.log('Created quote items.');
  }
}

seedQuotes();
