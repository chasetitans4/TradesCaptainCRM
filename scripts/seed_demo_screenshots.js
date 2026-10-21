/**
 * seed_demo_screenshots.js
 *
 * Populates the demo account with curated, photogenic data for marketing screenshots.
 * Idempotent — safe to re-run. Deletes existing demo data then inserts fresh.
 *
 * Usage: node scripts/seed_demo_screenshots.js
 */

const { createClient } = require('@supabase/supabase-js');

// ─── Config (matches existing seed scripts) ─────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';
const USER_EMAIL = process.env.DEMO_EMAIL;
const USER_PASSWORD = process.env.DEMO_PASSWORD;
const TECH_EMAIL = 'jake@reliableplumbing.com';

if (!SUPABASE_URL || !SUPABASE_KEY || !USER_EMAIL || !USER_PASSWORD) throw new Error('Set Supabase and demo credentials in the environment for an isolated demo project.');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Deterministic UUIDs ─────────────────────────────────────────────────────
const CUSTOMER_IDS = {
  sarah:    '22222222-2222-2222-2222-222222222201',
  chen:     '22222222-2222-2222-2222-222222222202',
  loneStar: '22222222-2222-2222-2222-222222222203',
  patricia: '22222222-2222-2222-2222-222222222204',
  robert:   '22222222-2222-2222-2222-222222222205',
  coffee:   '22222222-2222-2222-2222-222222222206',
  patel:    '22222222-2222-2222-2222-222222222207',
};

const JOB_IDS = {
  drain:      '33333333-3333-3333-3333-333333333301',
  leak:       '33333333-3333-3333-3333-333333333302',
  waterHeat:  '33333333-3333-3333-3333-333333333303',
  faucet:     '33333333-3333-3333-3333-333333333304',
  pipeInsp:   '33333333-3333-3333-3333-333333333305',
};

const INVOICE_IDS = {
  inv1: '44444444-4444-4444-4444-444444444401',
  inv2: '44444444-4444-4444-4444-444444444402',
  inv3: '44444444-4444-4444-4444-444444444403',
  inv4: '44444444-4444-4444-4444-444444444404',
};

const QUOTE_IDS = {
  q1: '55555555-5555-5555-5555-555555555501',
  q2: '55555555-5555-5555-5555-555555555502',
  q3: '55555555-5555-5555-5555-555555555503',
};

const LEAD_IDS = {
  l1: '66666666-6666-6666-6666-666666666601',
  l2: '66666666-6666-6666-6666-666666666602',
  l3: '66666666-6666-6666-6666-666666666603',
  l4: '66666666-6666-6666-6666-666666666604',
  l5: '66666666-6666-6666-6666-666666666605',
  l6: '66666666-6666-6666-6666-666666666606',
  l7: '66666666-6666-6666-6666-666666666607',
};

const CONVO_IDS = {
  c1: '77777777-7777-7777-7777-777777777701',
  c2: '77777777-7777-7777-7777-777777777702',
  c3: '77777777-7777-7777-7777-777777777703',
};

const TECH_USER_ID = '88888888-8888-8888-8888-888888888801';

const VOICE_CALL_IDS = {
  vc1: '99999999-9999-9999-9999-999999999901',
  vc2: '99999999-9999-9999-9999-999999999902',
  vc3: '99999999-9999-9999-9999-999999999903',
  vc4: '99999999-9999-9999-9999-999999999904',
  vc5: '99999999-9999-9999-9999-999999999905',
  vc6: '99999999-9999-9999-9999-999999999906',
  vc7: '99999999-9999-9999-9999-999999999907',
  vc8: '99999999-9999-9999-9999-999999999908',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

function minutesAgo(n) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - n);
  return d.toISOString();
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────
async function cleanup() {
  // Clean voice data first (voice_call_events FK → sms_conversations, customers)
  console.log('  Cleaning voice data...');
  await supabase.from('voice_call_events').delete().eq('business_id', BUSINESS_ID);
  await supabase.from('voice_usage').delete().eq('business_id', BUSINESS_ID);
  await supabase.from('voice_receptionist_settings').delete().eq('business_id', BUSINESS_ID);

  // Clean route/dispatch data
  console.log('  Cleaning route/dispatch data...');
  await supabase.from('daily_route_summaries').delete().eq('business_id', BUSINESS_ID);
  await supabase.from('mileage_logs').delete().eq('business_id', BUSINESS_ID);
  await supabase.from('arrival_pings').delete().eq('business_id', BUSINESS_ID);

  // Technician locations (no business_id — delete by user_id)
  const { data: bizUsers } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', BUSINESS_ID);
  if (bizUsers && bizUsers.length > 0) {
    const userIds = bizUsers.map(u => u.id);
    await supabase.from('technician_locations').delete().in('user_id', userIds);
  }

  console.log('  Cleaning SMS messages...');
  const { data: convos } = await supabase
    .from('sms_conversations')
    .select('id')
    .eq('business_id', BUSINESS_ID);

  if (convos && convos.length > 0) {
    const convoIds = convos.map(c => c.id);
    await supabase.from('sms_messages').delete().in('conversation_id', convoIds);
  }

  console.log('  Cleaning SMS conversations...');
  await supabase.from('sms_conversations').delete().eq('business_id', BUSINESS_ID);

  console.log('  Cleaning invoice items...');
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('business_id', BUSINESS_ID);

  if (invoices && invoices.length > 0) {
    const invoiceIds = invoices.map(i => i.id);
    await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds);
  }

  console.log('  Cleaning invoices...');
  await supabase.from('invoices').delete().eq('business_id', BUSINESS_ID);

  console.log('  Cleaning quote items...');
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id')
    .eq('business_id', BUSINESS_ID);

  if (quotes && quotes.length > 0) {
    const quoteIds = quotes.map(q => q.id);
    await supabase.from('quote_items').delete().in('quote_id', quoteIds);
  }

  console.log('  Cleaning quotes...');
  await supabase.from('quotes').delete().eq('business_id', BUSINESS_ID);

  console.log('  Cleaning jobs...');
  await supabase.from('jobs').delete().eq('business_id', BUSINESS_ID);

  console.log('  Cleaning leads...');
  await supabase.from('leads').delete().eq('business_id', BUSINESS_ID);

  console.log('  Cleaning customers...');
  await supabase.from('customers').delete().eq('business_id', BUSINESS_ID);
}

// ─── Business ────────────────────────────────────────────────────────────────
async function seedBusiness() {
  const { error } = await supabase.from('businesses').upsert({
    id: BUSINESS_ID,
    name: 'Reliable Plumbing Co.',
    owner_name: 'Mike Reynolds',
    email: 'mike@reliableplumbing.com',
    phone: '+15125550100',
    owner_phone: '+15125550101',
    plan_tier: 'pro',
    timezone: 'America/Chicago',
    trade_type: 'plumbing',
    tax_rate: 8.25,
    onboarding_completed: true,
    walkthrough_completed: true,
    primary_color: '#1D4ED8',
    is_active: true,
  });

  if (error) console.error('Business upsert error:', error.message);
  else console.log('  Business: Reliable Plumbing Co.');
}

// ─── Auth User ───────────────────────────────────────────────────────────────
async function seedAuthUser() {
  // Find or create auth user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  let existingUser = users.find(u => u.email === USER_EMAIL);
  let authUserId;

  if (existingUser) {
    authUserId = existingUser.id;
    console.log('  Auth user exists:', authUserId);
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: USER_EMAIL,
      password: USER_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Mike Reynolds' },
    });
    if (error) {
      console.error('Auth user creation error:', error.message);
      process.exit(1);
    }
    authUserId = newUser.user.id;
    console.log('  Auth user created:', authUserId);
  }

  // Upsert owner profile
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (existingProfile) {
    await supabase.from('users').update({
      auth_user_id: authUserId,
      business_id: BUSINESS_ID,
      name: 'Mike Reynolds',
      role: 'owner',
      status: 'active',
      phone: '+15125550101',
    }).eq('id', existingProfile.id);
    console.log('  Owner profile updated:', existingProfile.id);
    return existingProfile.id;
  } else {
    const { data: newProfile, error } = await supabase.from('users').insert({
      auth_user_id: authUserId,
      business_id: BUSINESS_ID,
      email: USER_EMAIL,
      name: 'Mike Reynolds',
      role: 'owner',
      status: 'active',
      phone: '+15125550101',
    }).select('id').single();

    if (error) console.error('Owner profile error:', error.message);
    else console.log('  Owner profile created:', newProfile.id);
    return newProfile?.id;
  }
}

async function seedTechUser(ownerUserId) {
  // Check if tech user exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', TECH_EMAIL)
    .single();

  if (existing) {
    await supabase.from('users').update({
      business_id: BUSINESS_ID,
      name: 'Jake Martinez',
      role: 'technician',
      status: 'active',
    }).eq('id', existing.id);
    console.log('  Tech profile updated:', existing.id);
    return existing.id;
  }

  const { data: newTech, error } = await supabase.from('users').insert({
    id: TECH_USER_ID,
    business_id: BUSINESS_ID,
    email: TECH_EMAIL,
    name: 'Jake Martinez',
    role: 'technician',
    status: 'active',
    phone: '+15125550102',
  }).select('id').single();

  if (error) console.error('Tech profile error:', error.message);
  else console.log('  Tech profile created:', newTech.id);
  return newTech?.id || TECH_USER_ID;
}

// ─── Customers ───────────────────────────────────────────────────────────────
async function seedCustomers() {
  const customers = [
    {
      id: CUSTOMER_IDS.sarah,
      business_id: BUSINESS_ID,
      name: 'Sarah Johnson',
      phone: '+15125551001',
      email: 'sarah.johnson@email.com',
      address_line1: '4218 Willow Creek Dr',
      city: 'Austin',
      state: 'TX',
      zip: '78745',
      tags: ['residential', 'repeat'],
      source: 'referral',
      total_jobs: 3,
      total_revenue: 1800,
      notes: 'Preferred morning appointments. Referred by Patricia Williams.',
      gate_code: '#4521',
      has_dog: true,
      dog_info: 'Buddy — friendly yellow lab, stays in backyard',
      access_notes: 'Use side gate on left. Ring doorbell, she works from home.',
      parking_notes: 'Park on street, driveway reserved.',
    },
    {
      id: CUSTOMER_IDS.chen,
      business_id: BUSINESS_ID,
      name: 'David & Maria Chen',
      phone: '+15125551002',
      email: 'dchen@email.com',
      address_line1: '901 E 6th St, Unit B',
      city: 'Austin',
      state: 'TX',
      zip: '78702',
      tags: ['residential', 'new'],
      source: 'google',
      total_jobs: 0,
      total_revenue: 0,
      notes: 'New construction home, first service call.',
      access_notes: 'Use back gate — combination lock 7734. Ring twice.',
    },
    {
      id: CUSTOMER_IDS.loneStar,
      business_id: BUSINESS_ID,
      name: 'Lone Star Brewing',
      phone: '+15125551003',
      email: 'ops@lonestarbrewing.com',
      address_line1: '1045 S Congress Ave',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      tags: ['commercial', 'vip'],
      source: 'website',
      total_jobs: 8,
      total_revenue: 6400,
      notes: 'Monthly maintenance contract. Contact floor manager Alex.',
      parking_notes: 'Use loading dock entrance on south side. Visitor parking in rear.',
    },
    {
      id: CUSTOMER_IDS.patricia,
      business_id: BUSINESS_ID,
      name: 'Patricia Williams',
      phone: '+15125551004',
      email: 'pwilliams@email.com',
      address_line1: '7520 Manchaca Rd',
      city: 'Austin',
      state: 'TX',
      zip: '78745',
      tags: ['residential', 'repeat'],
      source: 'referral',
      total_jobs: 5,
      total_revenue: 3200,
      notes: 'Long-time customer since 2021. Always pays promptly.',
    },
    {
      id: CUSTOMER_IDS.robert,
      business_id: BUSINESS_ID,
      name: 'Robert Greenfield',
      phone: '+15125551005',
      email: 'rgreenfield@email.com',
      address_line1: '3305 Red River St',
      city: 'Austin',
      state: 'TX',
      zip: '78705',
      tags: ['residential'],
      source: 'nextdoor',
      total_jobs: 1,
      total_revenue: 250,
      has_dog: true,
      dog_info: 'Bruno — large German shepherd, keep front gate closed',
    },
    {
      id: CUSTOMER_IDS.coffee,
      business_id: BUSINESS_ID,
      name: 'The Coffee Spot',
      phone: '+15125551006',
      email: 'manager@thecoffeespot.com',
      address_line1: '2200 S Lamar Blvd',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      tags: ['commercial'],
      source: 'google',
      total_jobs: 2,
      total_revenue: 950,
      notes: 'Service calls before 7 AM or after 3 PM only — busy during peak hours.',
      access_notes: 'Enter through back alley door. Ask for manager Rosa.',
    },
    {
      id: CUSTOMER_IDS.patel,
      business_id: BUSINESS_ID,
      name: 'James & Lisa Patel',
      phone: '+15125551007',
      email: 'jpatel@email.com',
      address_line1: '11200 Harris Branch Pkwy',
      city: 'Austin',
      state: 'TX',
      zip: '78754',
      tags: ['residential', 'new'],
      source: 'facebook',
      total_jobs: 0,
      total_revenue: 0,
      notes: 'Recently moved in. Interested in whole-house repipe.',
    },
  ];

  const { error } = await supabase.from('customers').insert(customers);
  if (error) console.error('Customers error:', error.message);
  else console.log(`  Customers: ${customers.length} created`);
}

// ─── Leads ───────────────────────────────────────────────────────────────────
async function seedLeads(ownerUserId) {
  const leads = [
    {
      id: LEAD_IDS.l1,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patel,
      name: 'James Patel',
      phone: '+15125551007',
      email: 'jpatel@email.com',
      service_needed: 'Whole-house repipe',
      description: 'Home built in 1985, galvanized pipes showing corrosion. Wants full copper repipe.',
      status: 'new',
      source: 'facebook',
      urgency: 'high',
      assigned_to: ownerUserId,
      estimated_value: 12000,
    },
    {
      id: LEAD_IDS.l2,
      business_id: BUSINESS_ID,
      name: 'Tom Baker',
      phone: '+15125551008',
      email: 'tombaker@email.com',
      service_needed: 'Tankless water heater install',
      description: 'Replacing 15-year-old tank unit. Wants Rinnai or Navien.',
      status: 'new',
      source: 'google',
      urgency: 'normal',
      assigned_to: ownerUserId,
      estimated_value: 4500,
    },
    {
      id: LEAD_IDS.l3,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.robert,
      name: 'Robert Greenfield',
      phone: '+15125551005',
      email: 'rgreenfield@email.com',
      service_needed: 'Slab leak repair',
      description: 'Water bill spiked 3x. Suspects slab leak under kitchen.',
      status: 'contacted',
      source: 'nextdoor',
      urgency: 'emergency',
      assigned_to: ownerUserId,
      estimated_value: 8000,
    },
    {
      id: LEAD_IDS.l4,
      business_id: BUSINESS_ID,
      name: 'Karen Mitchell',
      phone: '+15125551009',
      email: 'kmitchell@email.com',
      service_needed: 'Bathroom renovation plumbing',
      description: 'Master bath remodel — new shower, dual vanity, relocate toilet.',
      status: 'qualified',
      source: 'referral',
      urgency: 'normal',
      assigned_to: ownerUserId,
      estimated_value: 6500,
    },
    {
      id: LEAD_IDS.l5,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.coffee,
      name: 'The Coffee Spot',
      phone: '+15125551006',
      email: 'manager@thecoffeespot.com',
      service_needed: 'Grease trap installation',
      description: 'Health dept requires grease trap upgrade for commercial kitchen.',
      status: 'quoted',
      source: 'google',
      urgency: 'normal',
      assigned_to: ownerUserId,
      estimated_value: 3200,
    },
    {
      id: LEAD_IDS.l6,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patricia,
      name: 'Patricia Williams',
      phone: '+15125551004',
      email: 'pwilliams@email.com',
      service_needed: 'Kitchen faucet + garbage disposal',
      description: 'Replace kitchen faucet and install new InSinkErator disposal.',
      status: 'won',
      source: 'referral',
      urgency: 'low',
      assigned_to: ownerUserId,
      estimated_value: 850,
    },
    {
      id: LEAD_IDS.l7,
      business_id: BUSINESS_ID,
      name: 'Mark Davis',
      phone: '+15125551010',
      email: 'mdavis@email.com',
      service_needed: 'Sewer line replacement',
      description: 'Main sewer line collapsed. Went with competitor due to price.',
      status: 'lost',
      source: 'google',
      urgency: 'normal',
      assigned_to: ownerUserId,
      estimated_value: 15000,
      lost_reason: 'Chose lower-priced competitor',
    },
  ];

  const { error } = await supabase.from('leads').insert(leads);
  if (error) console.error('Leads error:', error.message);
  else console.log(`  Leads: ${leads.length} created`);
}

// ─── Jobs ────────────────────────────────────────────────────────────────────
async function seedJobs(ownerUserId) {
  const jobs = [
    {
      id: JOB_IDS.drain,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patricia,
      title: 'Drain Cleaning',
      service_type: 'Drain Cleaning',
      description: 'Kitchen drain slow — likely grease buildup. Standard auger service.',
      scheduled_date: TODAY,
      scheduled_time_start: '07:00',
      scheduled_time_end: '07:45',
      status: 'completed',
      assigned_user_id: ownerUserId,
      tech_notes: 'Cleared grease blockage about 15ft in. Recommended enzyme treatment monthly.',
      completion_notes: 'Job completed ahead of schedule. Customer happy with results.',
      completed_at: new Date(new Date().setHours(7, 42, 0)).toISOString(),
      job_address_line1: '7520 Manchaca Rd',
      job_address_city: 'Austin',
      job_address_state: 'TX',
      job_address_zip: '78745',
      customer_reminders_enabled: true,
      customer_confirmed: true,
      customer_confirmed_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    },
    {
      id: JOB_IDS.leak,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.sarah,
      title: 'Emergency Leak Repair',
      service_type: 'Leak Repair',
      description: 'Active leak under kitchen sink. Water dripping from P-trap connection.',
      scheduled_date: TODAY,
      scheduled_time_start: '08:00',
      scheduled_time_end: '09:30',
      status: 'in_progress',
      assigned_user_id: ownerUserId,
      tech_notes: 'P-trap gasket deteriorated. Replacing full trap assembly.',
      job_address_line1: '4218 Willow Creek Dr',
      job_address_city: 'Austin',
      job_address_state: 'TX',
      job_address_zip: '78745',
      customer_reminders_enabled: true,
      customer_confirmed: true,
      customer_confirmed_at: hoursAgo(2),
    },
    {
      id: JOB_IDS.waterHeat,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.chen,
      title: 'Water Heater Replacement',
      service_type: 'Water Heater',
      description: '50-gal tank replacement. Customer upgrading to Rheem Performance Plus.',
      scheduled_date: TODAY,
      scheduled_time_start: '10:00',
      scheduled_time_end: '12:00',
      status: 'scheduled',
      assigned_user_id: ownerUserId,
      job_address_line1: '901 E 6th St, Unit B',
      job_address_city: 'Austin',
      job_address_state: 'TX',
      job_address_zip: '78702',
      customer_reminders_enabled: true,
      customer_confirmed: false,
    },
    {
      id: JOB_IDS.faucet,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patricia,
      title: 'Kitchen Faucet Install',
      service_type: 'Faucet Installation',
      description: 'Install new Moen pull-down faucet. Customer providing fixture.',
      scheduled_date: TODAY,
      scheduled_time_start: '13:00',
      scheduled_time_end: '14:00',
      status: 'scheduled',
      assigned_user_id: ownerUserId,
      job_address_line1: '7520 Manchaca Rd',
      job_address_city: 'Austin',
      job_address_state: 'TX',
      job_address_zip: '78745',
      customer_reminders_enabled: true,
      customer_confirmed: true,
      customer_confirmed_at: daysAgo(1) + 'T14:30:00.000Z',
    },
    {
      id: JOB_IDS.pipeInsp,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.loneStar,
      title: 'Commercial Pipe Inspection',
      service_type: 'Inspection',
      description: 'Monthly pipe inspection for brewery floor drains and glycol lines.',
      scheduled_date: TODAY,
      scheduled_time_start: '15:00',
      scheduled_time_end: '16:30',
      status: 'scheduled',
      assigned_user_id: ownerUserId,
      job_address_line1: '1045 S Congress Ave',
      job_address_city: 'Austin',
      job_address_state: 'TX',
      job_address_zip: '78704',
      customer_reminders_enabled: true,
      customer_confirmed: true,
      customer_confirmed_at: daysAgo(2) + 'T09:00:00.000Z',
    },
  ];

  const { error } = await supabase.from('jobs').insert(jobs);
  if (error) console.error('Jobs error:', error.message);
  else console.log(`  Jobs: ${jobs.length} created`);
}

// ─── Invoices + Items ────────────────────────────────────────────────────────
async function seedInvoices() {
  const invoices = [
    {
      id: INVOICE_IDS.inv1,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patricia,
      invoice_number: 'INV-2024-001',
      status: 'paid',
      subtotal: 449.00,
      tax_rate: 8.25,
      tax_amount: 37.04,
      total: 486.04,
      due_date: daysAgo(7),
      paid_at: daysAgo(5) + 'T10:30:00.000Z',
      payment_method: 'check',
      notes: 'Bathroom faucet replacement + supply line repair',
    },
    {
      id: INVOICE_IDS.inv2,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.loneStar,
      invoice_number: 'INV-2024-002',
      status: 'overdue',
      subtotal: 798.00,
      tax_rate: 8.25,
      tax_amount: 65.84,
      total: 863.84,
      due_date: daysAgo(3),
      notes: 'Quarterly grease trap service + emergency drain clearing',
    },
    {
      id: INVOICE_IDS.inv3,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.sarah,
      invoice_number: 'INV-2024-003',
      status: 'sent',
      subtotal: 649.00,
      tax_rate: 8.25,
      tax_amount: 53.54,
      total: 702.54,
      due_date: daysAhead(5),
      notes: 'Water heater flush + anode rod replacement',
    },
    {
      id: INVOICE_IDS.inv4,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.sarah,
      invoice_number: 'INV-2024-004',
      status: 'paid',
      subtotal: 175.00,
      tax_rate: 8.25,
      tax_amount: 14.44,
      total: 189.44,
      due_date: daysAgo(14),
      paid_at: daysAgo(12) + 'T15:00:00.000Z',
      payment_method: 'stripe',
      notes: 'Garbage disposal repair',
    },
  ];

  const { error: invError } = await supabase.from('invoices').insert(invoices);
  if (invError) console.error('Invoices error:', invError.message);
  else console.log(`  Invoices: ${invoices.length} created`);

  // Invoice items
  const items = [
    // INV-2024-001
    { invoice_id: INVOICE_IDS.inv1, description: 'Bathroom faucet replacement — labor', quantity: 1, unit_price: 185.00, total: 185.00, sort_order: 0 },
    { invoice_id: INVOICE_IDS.inv1, description: 'Moen Align single-hole faucet', quantity: 1, unit_price: 189.00, total: 189.00, sort_order: 1 },
    { invoice_id: INVOICE_IDS.inv1, description: 'Supply lines + fittings', quantity: 1, unit_price: 75.00, total: 75.00, sort_order: 2 },
    // INV-2024-002
    { invoice_id: INVOICE_IDS.inv2, description: 'Grease trap pump & clean (quarterly)', quantity: 1, unit_price: 450.00, total: 450.00, sort_order: 0 },
    { invoice_id: INVOICE_IDS.inv2, description: 'Emergency drain clearing — floor drain #3', quantity: 1, unit_price: 225.00, total: 225.00, sort_order: 1 },
    { invoice_id: INVOICE_IDS.inv2, description: 'Replacement drain cover', quantity: 1, unit_price: 123.00, total: 123.00, sort_order: 2 },
    // INV-2024-003
    { invoice_id: INVOICE_IDS.inv3, description: 'Water heater flush service — labor', quantity: 1, unit_price: 175.00, total: 175.00, sort_order: 0 },
    { invoice_id: INVOICE_IDS.inv3, description: 'Anode rod replacement (magnesium)', quantity: 1, unit_price: 89.00, total: 89.00, sort_order: 1 },
    { invoice_id: INVOICE_IDS.inv3, description: 'Pressure relief valve test + replacement', quantity: 1, unit_price: 385.00, total: 385.00, sort_order: 2 },
    // INV-2024-004
    { invoice_id: INVOICE_IDS.inv4, description: 'Garbage disposal repair — labor', quantity: 1, unit_price: 125.00, total: 125.00, sort_order: 0 },
    { invoice_id: INVOICE_IDS.inv4, description: 'Replacement impeller assembly', quantity: 1, unit_price: 50.00, total: 50.00, sort_order: 1 },
  ];

  const { error: itemsError } = await supabase.from('invoice_items').insert(items);
  if (itemsError) console.error('Invoice items error:', itemsError.message);
  else console.log(`  Invoice items: ${items.length} created`);
}

// ─── Quotes + Items ──────────────────────────────────────────────────────────
async function seedQuotes() {
  const quotes = [
    {
      id: QUOTE_IDS.q1,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patel,
      quote_number: 'Q-2024-001',
      status: 'sent',
      subtotal: 11970.00,
      tax_rate: 8.25,
      tax_amount: 987.53,
      total: 12957.53,
      valid_until: daysAhead(14),
      notes: 'Includes full copper repipe for 3-bedroom home. Price includes all permits.',
      terms: 'Net 30. 50% deposit required to begin work.',
    },
    {
      id: QUOTE_IDS.q2,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.coffee,
      quote_number: 'Q-2024-002',
      status: 'accepted',
      subtotal: 3200.00,
      tax_rate: 8.25,
      tax_amount: 264.00,
      total: 3464.00,
      valid_until: daysAhead(7),
      notes: 'Commercial grease trap upgrade to meet health department requirements.',
    },
    {
      id: QUOTE_IDS.q3,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.robert,
      quote_number: 'Q-2024-003',
      status: 'draft',
      subtotal: 8000.00,
      tax_rate: 8.25,
      tax_amount: 660.00,
      total: 8660.00,
      valid_until: daysAhead(30),
      notes: 'Slab leak detection and repair. Includes concrete cutting, repair, and restoration.',
    },
  ];

  const { error: qError } = await supabase.from('quotes').insert(quotes);
  if (qError) console.error('Quotes error:', qError.message);
  else console.log(`  Quotes: ${quotes.length} created`);

  const items = [
    // Q-2024-001
    { quote_id: QUOTE_IDS.q1, description: 'Copper repipe — labor (3BR/2BA, ~1800 sqft)', quantity: 1, unit_price: 7500.00, total: 7500.00, sort_order: 0 },
    { quote_id: QUOTE_IDS.q1, description: 'Type L copper pipe + fittings', quantity: 1, unit_price: 3200.00, total: 3200.00, sort_order: 1 },
    { quote_id: QUOTE_IDS.q1, description: 'Drywall patch & paint (access points)', quantity: 1, unit_price: 850.00, total: 850.00, sort_order: 2 },
    { quote_id: QUOTE_IDS.q1, description: 'City permit fees', quantity: 1, unit_price: 420.00, total: 420.00, sort_order: 3 },
    // Q-2024-002
    { quote_id: QUOTE_IDS.q2, description: 'Grease interceptor unit (50 GPM)', quantity: 1, unit_price: 1800.00, total: 1800.00, sort_order: 0 },
    { quote_id: QUOTE_IDS.q2, description: 'Installation labor', quantity: 1, unit_price: 950.00, total: 950.00, sort_order: 1 },
    { quote_id: QUOTE_IDS.q2, description: 'Plumbing modifications + fittings', quantity: 1, unit_price: 450.00, total: 450.00, sort_order: 2 },
    // Q-2024-003
    { quote_id: QUOTE_IDS.q3, description: 'Slab leak detection (electronic + pressure)', quantity: 1, unit_price: 800.00, total: 800.00, sort_order: 0 },
    { quote_id: QUOTE_IDS.q3, description: 'Concrete cutting & access', quantity: 1, unit_price: 2200.00, total: 2200.00, sort_order: 1 },
    { quote_id: QUOTE_IDS.q3, description: 'Pipe repair (epoxy or reroute)', quantity: 1, unit_price: 3500.00, total: 3500.00, sort_order: 2 },
    { quote_id: QUOTE_IDS.q3, description: 'Concrete restoration + cleanup', quantity: 1, unit_price: 1500.00, total: 1500.00, sort_order: 3 },
  ];

  const { error: itemsError } = await supabase.from('quote_items').insert(items);
  if (itemsError) console.error('Quote items error:', itemsError.message);
  else console.log(`  Quote items: ${items.length} created`);
}

// ─── SMS Conversations + Messages ────────────────────────────────────────────
async function seedSmsConversations() {
  const conversations = [
    {
      id: CONVO_IDS.c1,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.sarah,
      phone: '+15125551001',
      status: 'active',
      last_customer_message_at: minutesAgo(3),
      is_customer_initiated: true,
    },
    {
      id: CONVO_IDS.c2,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.chen,
      phone: '+15125551002',
      status: 'active',
      last_customer_message_at: hoursAgo(1),
      is_customer_initiated: false,
    },
    {
      id: CONVO_IDS.c3,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patricia,
      phone: '+15125551004',
      status: 'active',
      last_customer_message_at: hoursAgo(3),
      is_customer_initiated: true,
    },
  ];

  const { error: cError } = await supabase.from('sms_conversations').insert(conversations);
  if (cError) console.error('Conversations error:', cError.message);
  else console.log(`  SMS conversations: ${conversations.length} created`);

  const messages = [
    // ── Conversation 1: Sarah Johnson — EMERGENCY, AI handles + escalates ──
    // This is the showcase conversation for the screenshots.
    { conversation_id: CONVO_IDS.c1, direction: 'inbound', sender: 'customer', body: 'Hi this is Sarah Johnson at 4218 Willow Creek. I have water POURING out from under my kitchen sink. Its going everywhere please help!!', status: 'delivered', created_at: minutesAgo(12), metadata: JSON.stringify({ urgency: 'emergency', issue: 'Active water leak under kitchen sink', name: 'Sarah Johnson', address: '4218 Willow Creek Dr' }) },

    { conversation_id: CONVO_IDS.c1, direction: 'outbound', sender: 'ai', is_ai_response: true, body: 'Hi Sarah, I\'m so sorry you\'re dealing with this. Let\'s get this under control right away.\n\nFirst — please turn off the water supply valve under the sink (turn it clockwise). If you can\'t find it, turn off your main water shut-off valve.\n\nI\'m flagging this as urgent and alerting Mike right now.', status: 'delivered', created_at: minutesAgo(11) },

    { conversation_id: CONVO_IDS.c1, direction: 'inbound', sender: 'customer', body: 'Ok I found the valve and turned it. The water is slowing down. Thank god. How soon can someone come??', status: 'delivered', created_at: minutesAgo(9) },

    { conversation_id: CONVO_IDS.c1, direction: 'outbound', sender: 'ai', is_ai_response: true, body: 'Great job shutting that off, Sarah. That was the right move.\n\nI\'ve sent an emergency alert to Mike Reynolds. He\'s reviewing your request now and will reach out within the next few minutes with an ETA.\n\nIn the meantime, if you have towels handy, try to contain any standing water to prevent damage to your flooring.', status: 'delivered', created_at: minutesAgo(8) },

    { conversation_id: CONVO_IDS.c1, direction: 'inbound', sender: 'customer', body: 'Ok putting towels down now. It looks like its coming from the pipe connection under the disposal. Please hurry', status: 'delivered', created_at: minutesAgo(6) },

    { conversation_id: CONVO_IDS.c1, direction: 'outbound', sender: 'staff', body: 'Sarah, this is Mike. I just got the alert. I\'m wrapping up a job nearby and can be at your place in about 20 minutes. Hang tight — we\'ll get this fixed for you.', status: 'delivered', created_at: minutesAgo(4) },

    { conversation_id: CONVO_IDS.c1, direction: 'inbound', sender: 'customer', body: 'Oh thank you so much Mike!! The water is stopped now with the valve off. I\'ll leave the side gate unlocked for you. Buddy is inside.', status: 'delivered', created_at: minutesAgo(3) },

    // ── Conversation 2: David Chen — AI appointment prep ──
    { conversation_id: CONVO_IDS.c2, direction: 'outbound', sender: 'ai', is_ai_response: true, body: 'Hi David! This is Reliable Plumbing. Just a reminder about your water heater replacement scheduled for today at 10:00 AM.', status: 'delivered', created_at: hoursAgo(6) },
    { conversation_id: CONVO_IDS.c2, direction: 'inbound', sender: 'customer', body: 'Got it, thanks. Is there anything I need to do to prepare?', status: 'delivered', created_at: hoursAgo(5) },
    { conversation_id: CONVO_IDS.c2, direction: 'outbound', sender: 'ai', is_ai_response: true, body: 'Great question! Please make sure the area around your current water heater is clear and accessible. Our technician will handle everything else. See you at 10!', status: 'delivered', created_at: hoursAgo(5) },
    { conversation_id: CONVO_IDS.c2, direction: 'inbound', sender: 'customer', body: 'Will do. The heater is in the garage, I\'ll make sure it\'s clear.', status: 'delivered', created_at: hoursAgo(4) },
    { conversation_id: CONVO_IDS.c2, direction: 'outbound', sender: 'ai', is_ai_response: true, body: 'Perfect! Your technician is scheduled for 10:00 AM today. We\'ll send you a heads up when they\'re on the way.', status: 'delivered', created_at: hoursAgo(1) },

    // ── Conversation 3: Patricia Williams — post-service review request ──
    { conversation_id: CONVO_IDS.c3, direction: 'outbound', sender: 'ai', is_ai_response: true, body: 'Hi Patricia! Mike just wrapped up the drain cleaning at your place. Everything go okay?', status: 'delivered', created_at: hoursAgo(4) },
    { conversation_id: CONVO_IDS.c3, direction: 'inbound', sender: 'customer', body: 'Yes! He was great as always. The kitchen drain is flowing perfectly now.', status: 'delivered', created_at: hoursAgo(3.5) },
    { conversation_id: CONVO_IDS.c3, direction: 'outbound', sender: 'staff', body: 'Glad to hear it! Your invoice is on the way. See you for the faucet install this afternoon!', status: 'delivered', created_at: hoursAgo(3.2) },
    { conversation_id: CONVO_IDS.c3, direction: 'inbound', sender: 'customer', body: 'Thank you! The faucet works great. You guys are the best — I\'ll be leaving a review!', status: 'delivered', created_at: hoursAgo(3) },
  ];

  const { error: mError } = await supabase.from('sms_messages').insert(messages);
  if (mError) console.error('Messages error:', mError.message);
  else console.log(`  SMS messages: ${messages.length} created`);
}

// ─── Voice Receptionist Data ────────────────────────────────────────────────
async function seedVoiceData() {
  const businessPhone = '+15125550100';

  // 1. Voice receptionist settings
  const { error: settingsErr } = await supabase.from('voice_receptionist_settings').insert({
    business_id: BUSINESS_ID,
    answer_certainty_mode: 'RING_TIMEOUT_OR_FORWARD',
    ring_timeout_seconds: 20,
    enable_daytime_ai_voice: true,
    voicemail_escape_enabled: true,
    greeting_text: 'Thanks for calling Reliable Plumbing! How can we help you today?',
    after_hours_greeting: "You've reached Reliable Plumbing after hours. For emergencies, stay on the line. Otherwise, leave a message and we'll call you back first thing.",
    emergency_voice_escalation_enabled: true,
    max_voice_escalation_attempts: 2,
    confidence_threshold_high: 0.85,
    confidence_threshold_medium: 0.60,
    overage_mode: 'hard_stop',
    training_opt_out: true,
  });

  if (settingsErr) console.error('Voice settings error:', settingsErr.message);
  else console.log('  Voice receptionist settings configured');

  // 2. Voice call events (8 calls over last 4 days)
  const voiceCalls = [
    {
      id: VOICE_CALL_IDS.vc1,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.sarah,
      conversation_id: CONVO_IDS.c1,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA1a2b3c4d5e6f7a8b9c0d1e2f3a4b01',
      call_sid: 'CA1a2b3c4d5e6f7a8b9c0d1e2f3a4b01',
      phone_from: '+15125551001',
      phone_to: businessPhone,
      call_start_time: hoursAgo(2),
      call_end_time: new Date(Date.now() - 2 * 3600000 + 245000).toISOString(),
      call_duration_seconds: 245,
      availability_state: 'LIVE_ANSWER',
      answer_certainty_signal: 'TIMEOUT',
      was_ai_answered: true,
      was_missed: false,
      is_emergency: false,
      ai_confidence: 0.92,
      ai_summary: 'Customer called about active leak under kitchen sink. AI gathered details, provided shut-off valve instructions, and scheduled emergency repair for today at 8 AM.',
      ai_extracted_data: { issue: 'kitchen sink leak', urgency: 'high', location: 'under sink P-trap' },
      routing_action_taken: 'Scheduled emergency appointment, notified owner via SMS',
    },
    {
      id: VOICE_CALL_IDS.vc2,
      business_id: BUSINESS_ID,
      customer_id: null,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA2b3c4d5e6f7a8b9c0d1e2f3a4b5c02',
      call_sid: 'CA2b3c4d5e6f7a8b9c0d1e2f3a4b5c02',
      phone_from: '+15125559901',
      phone_to: businessPhone,
      call_start_time: hoursAgo(5),
      call_end_time: new Date(Date.now() - 5 * 3600000 + 180000).toISOString(),
      call_duration_seconds: 180,
      availability_state: 'MESSAGE_ONLY',
      answer_certainty_signal: 'TIMEOUT',
      was_ai_answered: true,
      was_missed: false,
      is_emergency: true,
      emergency_source: 'CALLER_CONFIRMATION',
      ai_confidence: 0.97,
      ai_summary: 'Emergency — caller reported burst pipe in basement with active flooding. AI confirmed emergency, provided main shut-off instructions, and immediately escalated to owner.',
      ai_extracted_data: { issue: 'burst pipe', location: 'basement', severity: 'active flooding' },
      routing_action_taken: 'Emergency escalation: SMS + push notification to owner',
    },
    {
      id: VOICE_CALL_IDS.vc3,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.patricia,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA3c4d5e6f7a8b9c0d1e2f3a4b5c6d03',
      call_sid: 'CA3c4d5e6f7a8b9c0d1e2f3a4b5c6d03',
      phone_from: '+15125551004',
      phone_to: businessPhone,
      call_start_time: hoursAgo(26),
      call_end_time: new Date(Date.now() - 26 * 3600000 + 95000).toISOString(),
      call_duration_seconds: 95,
      availability_state: 'LIVE_ANSWER',
      answer_certainty_signal: 'TIMEOUT',
      was_ai_answered: true,
      was_missed: false,
      is_emergency: false,
      ai_confidence: 0.89,
      ai_summary: 'Customer called to confirm afternoon faucet installation appointment. AI verified schedule and confirmed 1:00 PM time slot.',
      ai_extracted_data: { purpose: 'appointment confirmation', confirmed_time: '1:00 PM' },
      routing_action_taken: 'Appointment confirmed, no changes needed',
    },
    {
      id: VOICE_CALL_IDS.vc4,
      business_id: BUSINESS_ID,
      customer_id: null,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA4d5e6f7a8b9c0d1e2f3a4b5c6d7e04',
      call_sid: 'CA4d5e6f7a8b9c0d1e2f3a4b5c6d7e04',
      phone_from: '+15125559902',
      phone_to: businessPhone,
      call_start_time: hoursAgo(28),
      call_end_time: hoursAgo(28),
      call_duration_seconds: 0,
      availability_state: 'ON_CALL',
      answer_certainty_signal: 'TIMEOUT',
      was_ai_answered: false,
      was_missed: true,
      voicemail_requested: false,
      is_emergency: false,
      ai_summary: null,
      routing_action_taken: 'Call missed — no voicemail left',
    },
    {
      id: VOICE_CALL_IDS.vc5,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.loneStar,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA5e6f7a8b9c0d1e2f3a4b5c6d7e8f05',
      call_sid: 'CA5e6f7a8b9c0d1e2f3a4b5c6d7e8f05',
      phone_from: '+15125551003',
      phone_to: businessPhone,
      call_start_time: hoursAgo(50),
      call_end_time: new Date(Date.now() - 50 * 3600000 + 320000).toISOString(),
      call_duration_seconds: 320,
      availability_state: 'LIVE_ANSWER',
      answer_certainty_signal: 'TIMEOUT',
      was_ai_answered: true,
      was_missed: false,
      is_emergency: false,
      ai_confidence: 0.88,
      ai_summary: 'Commercial client called about scheduling quarterly pipe inspection. AI confirmed monthly maintenance contract details and scheduled inspection for next available slot.',
      ai_extracted_data: { purpose: 'inspection scheduling', contract: 'monthly maintenance' },
      routing_action_taken: 'Inspection scheduled, confirmation SMS sent to client',
    },
    {
      id: VOICE_CALL_IDS.vc6,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.chen,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA6f7a8b9c0d1e2f3a4b5c6d7e8f9a06',
      call_sid: 'CA6f7a8b9c0d1e2f3a4b5c6d7e8f9a06',
      phone_from: '+15125551002',
      phone_to: businessPhone,
      call_start_time: hoursAgo(52),
      call_end_time: new Date(Date.now() - 52 * 3600000 + 155000).toISOString(),
      call_duration_seconds: 155,
      availability_state: 'ON_CALL',
      answer_certainty_signal: 'FORWARD',
      was_ai_answered: true,
      was_missed: false,
      is_emergency: false,
      ai_confidence: 0.82,
      ai_summary: 'New customer inquired about water heater replacement options and pricing. AI provided estimate range ($800–$1,500) and availability. Customer interested in scheduling.',
      ai_extracted_data: { purpose: 'pricing inquiry', service: 'water heater replacement' },
      routing_action_taken: 'Lead created, follow-up scheduled for next day',
    },
    {
      id: VOICE_CALL_IDS.vc7,
      business_id: BUSINESS_ID,
      customer_id: null,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA7a8b9c0d1e2f3a4b5c6d7e8f9a0b07',
      call_sid: 'CA7a8b9c0d1e2f3a4b5c6d7e8f9a0b07',
      phone_from: '+15125559903',
      phone_to: businessPhone,
      call_start_time: hoursAgo(75),
      call_end_time: hoursAgo(75),
      call_duration_seconds: 0,
      availability_state: 'MESSAGE_ONLY',
      answer_certainty_signal: 'TIMEOUT',
      was_ai_answered: false,
      was_missed: true,
      voicemail_requested: true,
      is_emergency: false,
      ai_summary: null,
      routing_action_taken: 'Call missed — voicemail left, transcription pending',
    },
    {
      id: VOICE_CALL_IDS.vc8,
      business_id: BUSINESS_ID,
      customer_id: CUSTOMER_IDS.robert,
      initiation_source: 'CALL',
      initiation_evidence_id: 'CA8b9c0d1e2f3a4b5c6d7e8f9a0b1c08',
      call_sid: 'CA8b9c0d1e2f3a4b5c6d7e8f9a0b1c08',
      phone_from: '+15125551005',
      phone_to: businessPhone,
      call_start_time: hoursAgo(96),
      call_end_time: new Date(Date.now() - 96 * 3600000 + 420000).toISOString(),
      call_duration_seconds: 420,
      availability_state: 'LIVE_ANSWER',
      answer_certainty_signal: 'TIMEOUT',
      was_ai_answered: true,
      was_missed: false,
      is_emergency: true,
      emergency_source: 'PHRASE_REQUIRED',
      ai_confidence: 0.95,
      ai_summary: 'Emergency — customer reported major water leak suspected from slab. Water bill tripled last month. AI provided emergency shut-off instructions and escalated immediately to owner.',
      ai_extracted_data: { issue: 'slab leak', evidence: 'water bill 3x increase', severity: 'major' },
      routing_action_taken: 'Emergency escalation: SMS + push + voicemail to owner',
    },
  ];

  const { error: callsErr } = await supabase.from('voice_call_events').insert(voiceCalls);
  if (callsErr) console.error('Voice calls error:', callsErr.message);
  else console.log(`  Voice calls: ${voiceCalls.length} created (6 AI-handled, 2 emergencies, 2 missed)`);

  // 3. Voice usage (current billing period — 71% used, yellow zone)
  const now = new Date();
  const billingStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const billingEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { error: usageErr } = await supabase.from('voice_usage').insert({
    business_id: BUSINESS_ID,
    billing_period_start: billingStart,
    billing_period_end: billingEnd,
    included_minutes: 200,
    used_minutes: 142.50,
    overage_minutes: 0,
    overage_approved: false,
    hard_cap_active: false,
  });

  if (usageErr) console.error('Voice usage error:', usageErr.message);
  else console.log('  Voice usage: 142.5 / 200 minutes (71%)');
}

// ─── Dispatch & Route Data ──────────────────────────────────────────────────
async function seedDispatchRouteData(ownerUserId) {
  // 1. Technician locations (so dispatch board shows live status)
  const mikeLocation = {
    user_id: ownerUserId,
    latitude: 30.2120,
    longitude: -97.7830,
    address: '4218 Willow Creek Dr, Austin, TX',
    city: 'Austin',
    status: 'on_job',
    current_job_id: JOB_IDS.leak,
  };

  const jakeLocation = {
    user_id: TECH_USER_ID,
    latitude: 30.2672,
    longitude: -97.7431,
    address: '100 Congress Ave, Austin, TX',
    city: 'Austin',
    status: 'available',
    current_job_id: null,
  };

  const { error: mikeLoc } = await supabase.from('technician_locations').upsert(mikeLocation, { onConflict: 'user_id' });
  if (mikeLoc) console.error('Tech location (Mike) error:', mikeLoc.message);

  const { error: jakeLoc } = await supabase.from('technician_locations').upsert(jakeLocation, { onConflict: 'user_id' });
  if (jakeLoc) console.error('Tech location (Jake) error:', jakeLoc.message);
  else console.log('  Technician locations: Mike (on_job) + Jake (available)');

  // 2. Dispatch history (assignment audit trail for today's jobs)
  const dispatchHistory = [
    {
      job_id: JOB_IDS.drain,
      action: 'assigned',
      to_user_id: ownerUserId,
      dispatched_by: ownerUserId,
      scheduled_date: TODAY,
      scheduled_time: '07:00',
      reason: 'Owner scheduled for morning drain cleaning',
      created_at: daysAgo(1) + 'T20:00:00.000Z',
    },
    {
      job_id: JOB_IDS.drain,
      action: 'completed',
      to_user_id: ownerUserId,
      scheduled_date: TODAY,
      created_at: TODAY + 'T13:42:00.000Z',
    },
    {
      job_id: JOB_IDS.leak,
      action: 'assigned',
      to_user_id: ownerUserId,
      dispatched_by: ownerUserId,
      scheduled_date: TODAY,
      scheduled_time: '08:00',
      reason: 'Emergency leak repair — prioritized',
      created_at: TODAY + 'T11:30:00.000Z',
    },
    {
      job_id: JOB_IDS.leak,
      action: 'started',
      to_user_id: ownerUserId,
      scheduled_date: TODAY,
      created_at: TODAY + 'T14:05:00.000Z',
    },
    {
      job_id: JOB_IDS.waterHeat,
      action: 'assigned',
      to_user_id: ownerUserId,
      dispatched_by: ownerUserId,
      scheduled_date: TODAY,
      scheduled_time: '10:00',
      reason: 'Water heater replacement — 2hr block',
      created_at: daysAgo(2) + 'T15:00:00.000Z',
    },
    {
      job_id: JOB_IDS.faucet,
      action: 'assigned',
      to_user_id: ownerUserId,
      dispatched_by: ownerUserId,
      scheduled_date: TODAY,
      scheduled_time: '13:00',
      reason: 'Afternoon faucet install for returning customer',
      created_at: daysAgo(1) + 'T20:15:00.000Z',
    },
    {
      job_id: JOB_IDS.pipeInsp,
      action: 'assigned',
      to_user_id: ownerUserId,
      dispatched_by: ownerUserId,
      scheduled_date: TODAY,
      scheduled_time: '15:00',
      reason: 'Monthly commercial inspection — Lone Star Brewing',
      created_at: daysAgo(3) + 'T14:00:00.000Z',
    },
  ];

  const { error: dispErr } = await supabase.from('dispatch_history').insert(dispatchHistory);
  if (dispErr) console.error('Dispatch history error:', dispErr.message);
  else console.log(`  Dispatch history: ${dispatchHistory.length} entries`);

  // 3. Daily route summary (inserted directly — arrival_pings trigger is broken due to
  //    jobs table column name mismatch in the trigger function)
  const routeSummary = {
    business_id: BUSINESS_ID,
    user_id: ownerUserId,
    summary_date: TODAY,
    total_miles: 12.2,
    total_drive_minutes: 28,
    jobs_completed: 1,
    arrival_pings_count: 2,
    stops_visited: [
      { address: '7520 Manchaca Rd, Austin, TX 78745', job_id: JOB_IDS.drain, arrived_at: TODAY + 'T13:00:00.000Z' },
      { address: '4218 Willow Creek Dr, Austin, TX 78745', job_id: JOB_IDS.leak, arrived_at: TODAY + 'T14:05:00.000Z' },
    ],
    first_stop_time: TODAY + 'T13:00:00.000Z',
    last_stop_time: TODAY + 'T14:05:00.000Z',
    first_stop_address: '7520 Manchaca Rd, Austin, TX 78745',
    last_stop_address: '4218 Willow Creek Dr, Austin, TX 78745',
    status: 'in_progress',
  };

  const { error: summaryErr } = await supabase.from('daily_route_summaries').insert(routeSummary);
  if (summaryErr) console.error('Route summary error:', summaryErr.message);
  else console.log('  Daily route summary: 12.2 mi, 28 min drive, 2 stops, 1 job done');

  // 4. Mileage logs (for export functionality)
  const mileageLogs = [
    {
      business_id: BUSINESS_ID,
      user_id: ownerUserId,
      log_date: TODAY,
      to_job_id: JOB_IDS.drain,
      from_address: '100 Congress Ave, Austin, TX',
      from_latitude: 30.2672,
      from_longitude: -97.7431,
      to_address: '7520 Manchaca Rd, Austin, TX 78745',
      to_latitude: 30.1980,
      to_longitude: -97.7950,
      distance_miles: 8.4,
      duration_minutes: 18,
      purpose: 'start_of_day',
      calculation_source: 'mapbox',
    },
    {
      business_id: BUSINESS_ID,
      user_id: ownerUserId,
      log_date: TODAY,
      from_job_id: JOB_IDS.drain,
      to_job_id: JOB_IDS.leak,
      from_address: '7520 Manchaca Rd, Austin, TX 78745',
      from_latitude: 30.1980,
      from_longitude: -97.7950,
      to_address: '4218 Willow Creek Dr, Austin, TX 78745',
      to_latitude: 30.2120,
      to_longitude: -97.7830,
      distance_miles: 3.8,
      duration_minutes: 10,
      purpose: 'between_jobs',
      calculation_source: 'mapbox',
    },
  ];

  const { error: mileErr } = await supabase.from('mileage_logs').insert(mileageLogs);
  if (mileErr) console.error('Mileage logs error:', mileErr.message);
  else console.log(`  Mileage logs: ${mileageLogs.length} trips (12.2 mi total)`);
}

// ─── Platform Branding ───────────────────────────────────────────────────────
async function fixPlatformLogo() {
  const { error } = await supabase
    .from('platform_settings')
    .update({ value: { logo_url: '/trades-captain-logo.png', name: 'Trades Captain' } })
    .eq('key', 'platform_branding');

  if (error) console.error('Platform logo error:', error.message);
  else console.log('  Platform branding: logo_url → /trades-captain-logo.png');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  DEMO SCREENSHOT DATA — SEED SCRIPT  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  console.log('1. Cleanup existing demo data...');
  await cleanup();

  console.log('2. Seed business...');
  await seedBusiness();

  console.log('3. Seed auth user + profiles...');
  const ownerUserId = await seedAuthUser();
  await seedTechUser(ownerUserId);

  console.log('4. Seed customers...');
  await seedCustomers();

  console.log('5. Seed leads...');
  await seedLeads(ownerUserId);

  console.log('6. Seed jobs...');
  await seedJobs(ownerUserId);

  console.log('7. Seed invoices...');
  await seedInvoices();

  console.log('8. Seed quotes...');
  await seedQuotes();

  console.log('9. Seed SMS conversations...');
  await seedSmsConversations();

  console.log('10. Fix platform branding logo...');
  await fixPlatformLogo();

  console.log('11. Seed voice receptionist data...');
  await seedVoiceData();

  console.log('12. Seed dispatch & route data...');
  await seedDispatchRouteData(ownerUserId);

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('Done! Data seeded for "Reliable Plumbing Co."');
  console.log('');
  console.log('Login: admin@tradescaptain.com');
  console.log('Password supplied through DEMO_PASSWORD');
  console.log('');
  console.log('Entities:');
  console.log('  • 7 customers');
  console.log('  • 7 leads (across all Kanban stages)');
  console.log('  • 5 jobs (1 completed, 1 in-progress, 3 scheduled)');
  console.log('  • 4 invoices + 11 line items');
  console.log('  • 3 quotes + 11 line items');
  console.log('  • 3 SMS conversations + 16 messages (inc. AI emergency thread)');
  console.log('  • 8 voice calls (6 AI-handled, 2 emergencies, 2 missed)');
  console.log('  • Voice usage: 142.5 / 200 min (71%)');
  console.log('  • 2 technician locations (dispatch board)');
  console.log('  • 7 dispatch history entries');
  console.log('  • Daily route summary (12.2 mi, 2 stops) + 2 mileage logs');
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
