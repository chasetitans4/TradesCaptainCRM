// =====================================================
// GUIDED TRAINING SYSTEM - BUNDLED CONTENT
//
// Training content is compiled into the app, not fetched at runtime.
// This ensures:
// - Zero API calls to load content
// - Instant availability
// - Type-safe with TypeScript
// - Works offline
// - Updates deploy with features
//
// ENHANCED: Now with navigation between pages, rich content,
// bullet points, pro tips, and more comprehensive coverage.
// =====================================================

import type { TrainingCourse } from '@/types/training';

// =====================================================
// COURSE 1: GETTING STARTED (COMPREHENSIVE)
// Full onboarding experience with page navigation
// =====================================================

const gettingStarted: TrainingCourse = {
  id: 'getting-started',
  title: 'Getting Started',
  description: 'Complete introduction to Trades Captain - navigate your dashboard, manage customers, and understand your daily workflow',
  icon: 'layout-dashboard',
  estimatedMinutes: 12,
  roles: ['owner', 'admin', 'technician', 'office_manager'],
  modules: [
    {
      id: 'welcome-tour',
      title: 'Welcome & Navigation',
      steps: [
        {
          id: 'welcome',
          type: 'MODAL',
          navigateTo: '/dashboard',
          content: {
            title: 'Welcome to Trades Captain!',
            body: "Congratulations on taking the first step to streamline your business! This training will walk you through everything you need to know to hit the ground running.",
            bullets: [
              'Navigate your dashboard and find key information',
              'Manage customers and their service history',
              'Create and track jobs from start to finish',
              'Send quotes and collect payments',
            ],
            tip: 'You can exit this training anytime and resume later from where you left off.',
            voice: "Welcome to Trades Captain! Let's get you set up for success.",
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'dashboard-overview',
          type: 'SPOTLIGHT',
          target: 'dashboard-main',
          waitForElement: 'dashboard-main',
          content: {
            title: 'Your Daily Command Center',
            body: "This is your dashboard - your home base for running your business. Everything you need to start your day is right here.",
            bullets: [
              "Today's jobs and appointments at a glance",
              'New leads that need attention',
              'Messages waiting for your reply',
              'Revenue and performance metrics',
            ],
            voice: 'This dashboard shows everything you need to start your day.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'sidebar-nav',
          type: 'SPOTLIGHT',
          target: 'sidebar',
          content: {
            title: 'Main Navigation',
            body: "The sidebar is your navigation hub. Every major feature is organized here, accessible with a single click.",
            bullets: [
              'Dashboard - Your daily overview',
              'Customers - Your client database',
              'Jobs - Active and scheduled work',
              'Invoices - Billing and payments',
              'Messages - Customer communications',
            ],
            tip: 'On mobile, tap the menu icon to reveal the sidebar.',
            voice: 'The sidebar gives you quick access to every feature.',
          },
          display: { position: 'right' },
        },
        {
          id: 'quick-search',
          type: 'SPOTLIGHT',
          target: 'header-search',
          content: {
            title: 'Find Anything Fast',
            body: "Need to find a customer, job, or invoice quickly? The search bar lets you find anything in seconds.",
            bullets: [
              'Search by customer name, phone, or address',
              'Find jobs by title or status',
              'Look up invoices by number or amount',
            ],
            tip: 'Press Cmd+K (Mac) or Ctrl+K (Windows) to open search from anywhere!',
            voice: 'Use search to find anything in your system instantly.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'quick-add',
          type: 'SPOTLIGHT',
          target: 'header-add-button',
          content: {
            title: 'Quick Add Menu',
            body: "Need to add something new? The quick add button gives you instant access to create customers, jobs, quotes, and more from anywhere in the app.",
            tip: 'Use this when a new customer calls - you can add them in seconds without losing your place.',
            voice: 'The quick add button lets you create new items from anywhere.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'profile-menu',
          type: 'SPOTLIGHT',
          target: 'header-profile',
          content: {
            title: 'Your Account',
            body: "Access your profile settings, notification preferences, and sign out from here.",
            bullets: [
              'Update your contact information',
              'Change notification settings',
              'Switch between businesses (if applicable)',
              'Access help and support',
            ],
            voice: 'Your profile menu gives you access to settings and account options.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'nav-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Navigation Basics Complete!',
            body: "Excellent! You now know how to navigate Trades Captain. Next, let's explore your customer database.",
          },
        },
      ],
    },
    {
      id: 'customers-intro',
      title: 'Customer Database',
      steps: [
        {
          id: 'go-to-customers',
          type: 'NAVIGATE',
          destination: '/customers',
          content: {
            title: 'Exploring Customers',
            body: "Let's visit your customer database to see how customer management works.",
            voice: 'Taking you to the customers page.',
          },
        },
        {
          id: 'customer-list',
          type: 'SPOTLIGHT',
          target: 'customer-list',
          waitForElement: 'customer-list',
          content: {
            title: 'Your Customer List',
            body: "Here's everyone you've done business with. Each row shows key information at a glance - name, phone, last service, and total spent.",
            bullets: [
              'Click any customer to see their full profile',
              'Sort by name, date added, or total revenue',
              'Color-coded status shows customer health',
            ],
            tip: 'VIP customers (high spenders) are highlighted so you never miss treating them special.',
            voice: 'Your customer list shows all your clients at a glance.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'customer-segments',
          type: 'SPOTLIGHT',
          target: 'customer-segments',
          content: {
            title: 'Smart Customer Segments',
            body: "Customers are automatically organized into segments based on their activity. This helps you prioritize outreach and identify who needs attention.",
            bullets: [
              'VIP - Your highest-value customers',
              'Active - Recently had service',
              'At-Risk - Haven\'t booked in a while',
              'New - Recently added, no history yet',
            ],
            tip: 'Check the "At-Risk" segment weekly to reach out before customers churn.',
            voice: 'Segments help you prioritize which customers need attention.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'customer-add-btn',
          type: 'SPOTLIGHT',
          target: 'customer-add',
          content: {
            title: 'Adding New Customers',
            body: "When a new customer calls, click here to add them to your system. You can capture their details quickly and even schedule a job right away.",
            tip: 'You only need a name and phone number to start - add more details later!',
            voice: 'Click the add button to create new customer records.',
          },
          display: { position: 'left' },
        },
        {
          id: 'customer-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Customer Basics Complete!',
            body: "You now understand how to find and manage customers. Let's look at how jobs work.",
          },
        },
      ],
    },
    {
      id: 'jobs-intro',
      title: 'Jobs Overview',
      steps: [
        {
          id: 'go-to-jobs',
          type: 'NAVIGATE',
          destination: '/jobs',
          content: {
            title: 'Understanding Jobs',
            body: "Now let's see how to manage your work - from scheduling to completion.",
            voice: 'Taking you to the jobs page.',
          },
        },
        {
          id: 'job-list',
          type: 'SPOTLIGHT',
          target: 'job-list',
          waitForElement: 'job-list',
          content: {
            title: 'Your Job Board',
            body: "All your scheduled and active work appears here. Each job shows the customer, service type, scheduled time, and current status.",
            bullets: [
              'Scheduled - Confirmed and on the calendar',
              'In Progress - Technician is on site',
              'Completed - Work is done',
              'Cancelled - Job was called off',
            ],
            voice: 'Your job board shows all work in progress.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'job-filters',
          type: 'SPOTLIGHT',
          target: 'job-filters',
          content: {
            title: 'Filter & Find Jobs',
            body: "Use filters to quickly find specific jobs. Filter by status, date range, assigned technician, or service type.",
            tip: 'Save frequent filter combinations for quick access.',
            voice: 'Filters help you find exactly what you need.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Getting Started Complete!',
            body: "Congratulations! You've completed the Getting Started training. You now know how to navigate Trades Captain, find customers, and view jobs.\n\nReady to dive deeper? Check out the other training courses in the Training Center.",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 2: CUSTOMER MANAGEMENT (COMPREHENSIVE)
// Deep dive into customer lifecycle management
// =====================================================

const customerManagement: TrainingCourse = {
  id: 'customer-management',
  title: 'Customer Management',
  description: 'Master your customer database - from adding new customers to tracking service history and maximizing lifetime value',
  icon: 'users',
  estimatedMinutes: 15,
  roles: ['owner', 'admin', 'office_manager'],
  modules: [
    {
      id: 'customer-database',
      title: 'Customer Database Deep Dive',
      steps: [
        {
          id: 'intro',
          type: 'MODAL',
          navigateTo: '/customers',
          content: {
            title: 'Mastering Customer Management',
            body: "Your customer database is the heart of your business. In this training, you'll learn to leverage every feature to build stronger relationships and grow revenue.",
            bullets: [
              'Organize and segment your customer base',
              'Track complete service history',
              'Use tags for smart organization',
              'Identify high-value and at-risk customers',
            ],
            voice: 'Let\'s master your customer database together.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'segments-detail',
          type: 'SPOTLIGHT',
          target: 'customer-segments',
          waitForElement: 'customer-segments',
          content: {
            title: 'Understanding Customer Segments',
            body: "Segments automatically categorize customers based on their behavior. This intelligence helps you take the right action at the right time.",
            bullets: [
              'VIP: Top 20% by revenue - prioritize their requests',
              'Active: Had service in last 90 days - healthy relationship',
              'At-Risk: No service in 90-180 days - reach out soon',
              'Inactive: No service in 180+ days - win-back campaign',
              'New: Added recently - nurture the relationship',
            ],
            tip: 'Set a weekly reminder to review your At-Risk segment.',
            voice: 'Segments help you treat each customer appropriately.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'search-customers',
          type: 'SPOTLIGHT',
          target: 'customer-search',
          content: {
            title: 'Finding Customers Fast',
            body: "When a customer calls, you need their info instantly. Search by name, phone number, address, or even email.",
            bullets: [
              'Partial matches work - type "John" to find all Johns',
              'Phone search strips formatting - 555-1234 finds (555) 123-4000',
              'Address search finds customers on the same street',
            ],
            tip: 'When a call comes in, paste the caller ID directly into search!',
            voice: 'Quick search helps you pull up customer info while on the phone.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'filters-deep',
          type: 'SPOTLIGHT',
          target: 'customer-filters',
          content: {
            title: 'Advanced Filtering',
            body: "Combine multiple filters to create powerful customer lists. Great for targeted outreach and marketing.",
            bullets: [
              'Filter by segment (VIP, Active, At-Risk)',
              'Filter by service type (HVAC, Plumbing, etc.)',
              'Filter by custom tags you create',
              'Filter by date range (last service, added date)',
            ],
            tip: 'Use filters to build a list for seasonal service reminders.',
            voice: 'Advanced filters help you build targeted customer lists.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'segment-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Database Navigation Complete!',
            body: "You can now efficiently navigate and filter your customer database. Next, let's learn about customer profiles.",
          },
        },
      ],
    },
    {
      id: 'customer-profiles',
      title: 'Customer Profiles',
      steps: [
        {
          id: 'profile-intro',
          type: 'MODAL',
          content: {
            title: 'Customer Profile Power',
            body: "Each customer has a detailed profile containing everything you need to deliver amazing service. Let's explore what's available.",
            voice: 'Customer profiles contain all the details you need.',
          },
        },
        {
          id: 'profile-header',
          type: 'SPOTLIGHT',
          target: 'customer-profile-header',
          content: {
            title: 'Customer Overview',
            body: "The profile header shows key info at a glance - contact details, segment badge, and lifetime value.",
            bullets: [
              'Click phone/email to call or message directly',
              'Click address to open directions',
              'Lifetime value shows total revenue from this customer',
            ],
            tip: 'The segment badge helps you quickly understand customer importance.',
            voice: 'The header gives you all contact info at a glance.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'service-history',
          type: 'SPOTLIGHT',
          target: 'customer-service-history',
          content: {
            title: 'Complete Service History',
            body: "Every job, quote, and invoice for this customer is recorded here. This context helps you provide personalized service.",
            bullets: [
              'See all past jobs with dates and descriptions',
              'View what was quoted and what was actually done',
              'Track payment history and outstanding balances',
              'Note any recurring issues or preferences',
            ],
            tip: 'Review history before calling - customers love when you remember their details!',
            voice: 'Service history shows everything done for this customer.',
          },
          display: { position: 'right' },
        },
        {
          id: 'customer-notes',
          type: 'SPOTLIGHT',
          target: 'customer-notes',
          content: {
            title: 'Notes & Preferences',
            body: "Add notes about customer preferences, property details, or anything your team should know. These notes appear every time someone views this customer.",
            bullets: [
              'Gate codes and access instructions',
              'Pet information or household details',
              'Preferred contact methods or times',
              'Special instructions or preferences',
            ],
            tip: 'Add notes during or right after calls while details are fresh.',
            voice: 'Notes help your whole team deliver personalized service.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'customer-tags',
          type: 'SPOTLIGHT',
          target: 'customer-tags',
          content: {
            title: 'Custom Tags',
            body: "Tags let you organize customers your way. Create tags for service types, neighborhoods, referral sources, or anything else.",
            bullets: [
              'Create unlimited custom tags',
              'Filter the customer list by tag',
              'Use tags for marketing segments',
              'Track referral sources with tags',
            ],
            tip: 'Create a "Referral-Worthy" tag for customers likely to recommend you.',
            voice: 'Tags give you flexible organization beyond segments.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'profile-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Customer Profiles Complete!',
            body: "Excellent! You now know how to leverage customer profiles for better service. Finally, let's cover adding new customers.",
          },
        },
      ],
    },
    {
      id: 'adding-customers',
      title: 'Adding & Importing Customers',
      steps: [
        {
          id: 'add-options',
          type: 'MODAL',
          content: {
            title: 'Growing Your Database',
            body: "There are several ways to add customers to your database. Choose the method that fits your situation.",
            bullets: [
              'Quick Add: One customer at a time (from a call)',
              'Detailed Add: Full profile with all information',
              'Bulk Import: Upload from spreadsheet or old system',
              'Automatic: Created when leads convert to customers',
            ],
            voice: 'Let\'s learn the best way to add new customers.',
          },
        },
        {
          id: 'add-button',
          type: 'SPOTLIGHT',
          target: 'customer-add',
          content: {
            title: 'Adding a Single Customer',
            body: "Click here to add a new customer. You'll be prompted for their basic information.",
            bullets: [
              'Name and phone are the only required fields',
              'Add email for quotes and invoices',
              'Add address to schedule on-site jobs',
              'Everything else can be added later',
            ],
            tip: 'While on the phone, just capture name and phone - fill in details after!',
            voice: 'The add button starts the new customer form.',
          },
          display: { position: 'left' },
        },
        {
          id: 'import-option',
          type: 'SPOTLIGHT',
          target: 'customer-import',
          content: {
            title: 'Bulk Import',
            body: "Have an existing customer list? Import from a CSV spreadsheet or connect with other systems.",
            bullets: [
              'Download our template for easy formatting',
              'Map your columns to our fields',
              'Review for duplicates before importing',
              'Import history is saved for reference',
            ],
            tip: 'Clean your data before importing - remove duplicates and fix formatting.',
            voice: 'Bulk import lets you bring in your existing customer list.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Customer Management Complete!',
            body: "Congratulations! You're now a customer management pro. You can organize, search, and leverage your customer database to deliver outstanding service.\n\nNext recommended: Job Workflow training to learn how to manage work efficiently.",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 3: JOB WORKFLOW (COMPREHENSIVE)
// End-to-end job management
// =====================================================

const jobWorkflow: TrainingCourse = {
  id: 'job-workflow',
  title: 'Job Workflow',
  description: 'Master the complete job lifecycle - from scheduling to completion, including dispatching, status updates, and documentation',
  icon: 'briefcase',
  estimatedMinutes: 15,
  roles: ['owner', 'admin', 'technician', 'office_manager'],
  modules: [
    {
      id: 'job-lifecycle',
      title: 'Understanding the Job Lifecycle',
      steps: [
        {
          id: 'welcome',
          type: 'MODAL',
          navigateTo: '/jobs',
          content: {
            title: 'Mastering Job Management',
            body: "Jobs are the core of your business. This training covers everything from scheduling a new job to marking it complete and getting paid.",
            bullets: [
              'Create and schedule jobs efficiently',
              'Assign and dispatch to technicians',
              'Track job status in real-time',
              'Document work and collect signatures',
            ],
            voice: 'Let\'s learn how to manage jobs from start to finish.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'job-board',
          type: 'SPOTLIGHT',
          target: 'job-list',
          waitForElement: 'job-list',
          content: {
            title: 'Your Job Board',
            body: "All jobs across your business appear here. Color-coded status makes it easy to see what's happening at a glance.",
            bullets: [
              'Blue - Scheduled: Confirmed, waiting for service date',
              'Yellow - In Progress: Technician is working',
              'Green - Completed: Work is done',
              'Gray - Cancelled: Job was called off',
            ],
            tip: 'Click any job to view full details and take action.',
            voice: 'The job board shows all your work in one place.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'job-statuses',
          type: 'SPOTLIGHT',
          target: 'job-status-filters',
          content: {
            title: 'Filtering by Status',
            body: "Focus on what matters by filtering to specific statuses. Most users keep \"Today's Jobs\" as their default view.",
            bullets: [
              'Today - What needs to happen now',
              'Scheduled - Upcoming confirmed work',
              'In Progress - Active jobs',
              'Needs Attention - Problems or delays',
            ],
            tip: 'Create a bookmark to your most-used filter view.',
            voice: 'Status filters help you focus on what matters.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'lifecycle-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Job Lifecycle Basics Complete!',
            body: "You understand how jobs flow through the system. Next, let's create a job.",
          },
        },
      ],
    },
    {
      id: 'creating-jobs',
      title: 'Creating & Scheduling Jobs',
      steps: [
        {
          id: 'new-job-intro',
          type: 'MODAL',
          content: {
            title: 'Creating Jobs',
            body: "Jobs can be created from multiple places - when a customer calls, when a quote is accepted, or when scheduling maintenance.",
            bullets: [
              'From customer profile (best when customer is calling)',
              'From the Jobs page (when you have details ready)',
              'From an accepted quote (auto-fills job details)',
              'From the calendar (when picking a time slot)',
            ],
            voice: 'There are several ways to create jobs based on your workflow.',
          },
        },
        {
          id: 'job-create-btn',
          type: 'SPOTLIGHT',
          target: 'job-create',
          content: {
            title: 'New Job Button',
            body: "Click here to start a new job. You'll select the customer, service type, and schedule.",
            tip: 'If you know the customer, search for them first - their address auto-fills!',
            voice: 'The new job button starts the scheduling process.',
          },
          display: { position: 'left' },
        },
        {
          id: 'job-details',
          type: 'SPOTLIGHT',
          target: 'job-form-details',
          content: {
            title: 'Job Details',
            body: "Fill in what the job is about. Be specific - this helps technicians prepare and customers understand the scope.",
            bullets: [
              'Title - Brief description (e.g., "AC Repair")',
              'Description - Full details of the work needed',
              'Service Type - Category for reporting',
              'Estimated Duration - Helps with scheduling',
            ],
            tip: 'Copy common job descriptions and save as templates.',
            voice: 'Good job details help everyone understand the work.',
          },
          display: { position: 'right' },
        },
        {
          id: 'job-schedule',
          type: 'SPOTLIGHT',
          target: 'job-form-schedule',
          content: {
            title: 'Scheduling',
            body: "Pick a date and time that works for the customer. The system shows technician availability to avoid conflicts.",
            bullets: [
              'See available time slots at a glance',
              'Assign to specific technicians',
              'Set arrival windows (e.g., 9am-12pm)',
              'Add drive time between jobs',
            ],
            tip: 'Build in buffer time between jobs for unexpected delays.',
            voice: 'Pick the best time considering technician availability.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'create-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Job Creation Complete!',
            body: "You can now create and schedule jobs efficiently. Let's learn about managing jobs in progress.",
          },
        },
      ],
    },
    {
      id: 'managing-jobs',
      title: 'Managing Active Jobs',
      steps: [
        {
          id: 'job-detail-view',
          type: 'SPOTLIGHT',
          target: 'job-detail-header',
          content: {
            title: 'Job Detail View',
            body: "Click any job to see its full details. From here you can update status, add notes, and manage the work.",
            bullets: [
              'Customer info with click-to-call',
              'Full job description and scope',
              'Assigned technician and schedule',
              'Activity timeline and notes',
            ],
            voice: 'The job detail view shows everything about the job.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'status-updates',
          type: 'SPOTLIGHT',
          target: 'job-status-update',
          content: {
            title: 'Updating Job Status',
            body: "As work progresses, update the status. This keeps everyone informed and triggers automated notifications.",
            bullets: [
              'En Route - Technician is traveling',
              'Arrived - On site, work starting',
              'In Progress - Actively working',
              'Complete - Work is finished',
            ],
            tip: 'Status updates automatically notify the customer via SMS if enabled.',
            voice: 'Status updates keep customers and your team informed.',
          },
          display: { position: 'right' },
        },
        {
          id: 'job-notes',
          type: 'SPOTLIGHT',
          target: 'job-notes-section',
          content: {
            title: 'Job Notes & Documentation',
            body: "Document everything about the job. Notes are time-stamped and visible to your whole team.",
            bullets: [
              'Add findings and observations',
              'Document parts used or needed',
              'Note any follow-up required',
              'Attach photos of the work',
            ],
            tip: 'Take before/after photos - customers love seeing the transformation!',
            voice: 'Good documentation protects you and builds trust.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Job Workflow Complete!',
            body: "Excellent work! You now understand the complete job lifecycle - from creating jobs to managing them through completion.\n\nRecommended next: Quotes & Invoices training to learn how to get paid efficiently.",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 4: QUOTES & INVOICES (COMPREHENSIVE)
// =====================================================

const quotesInvoices: TrainingCourse = {
  id: 'quotes-invoices',
  title: 'Quotes & Invoices',
  description: 'Master the billing cycle - create professional quotes, convert to invoices, and track payments to completion',
  icon: 'file-text',
  estimatedMinutes: 12,
  roles: ['owner', 'admin', 'office_manager'],
  modules: [
    {
      id: 'quotes-overview',
      title: 'Creating Quotes',
      steps: [
        {
          id: 'intro',
          type: 'MODAL',
          navigateTo: '/quotes',
          content: {
            title: 'Getting Paid Starts Here',
            body: "Professional quotes win jobs and protect your business. Learn to create compelling proposals that convert and set clear expectations.",
            bullets: [
              'Build professional, itemized quotes',
              'Send quotes directly to customers',
              'Track quote status and follow-up',
              'Convert accepted quotes to invoices instantly',
            ],
            voice: 'Let\'s learn how to create quotes that win jobs.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'quote-list',
          type: 'SPOTLIGHT',
          target: 'quote-list',
          waitForElement: 'quote-list',
          content: {
            title: 'Your Quotes',
            body: "All your proposals in one place. Color-coded status shows where each quote stands.",
            bullets: [
              'Draft - Still working on it',
              'Sent - Waiting for customer response',
              'Accepted - Ready to schedule/invoice',
              'Declined - Customer said no',
              'Expired - Past validity date',
            ],
            tip: 'Follow up on \"Sent\" quotes within 2-3 days for best conversion.',
            voice: 'Track all your quotes and their status here.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'create-quote',
          type: 'SPOTLIGHT',
          target: 'quote-create',
          content: {
            title: 'Creating a Quote',
            body: "Start a new quote by selecting the customer. You can build from scratch or use a saved template.",
            tip: 'Save quotes for common jobs as templates to speed up future quoting.',
            voice: 'Create new quotes or use templates for common jobs.',
          },
          display: { position: 'left' },
        },
        {
          id: 'line-items',
          type: 'SPOTLIGHT',
          target: 'quote-line-items',
          content: {
            title: 'Adding Line Items',
            body: "Break down your quote into clear line items. Customers appreciate transparency about what they're paying for.",
            bullets: [
              'Add labor as separate line items',
              'List parts and materials with prices',
              'Include permit fees or other costs',
              'Add optional items customers can choose',
            ],
            tip: 'Offering a \"Good-Better-Best\" option increases average job value.',
            voice: 'Detailed line items build trust and clarity.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'quote-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Quotes Basics Complete!',
            body: "You can now create professional quotes. Let's learn about invoicing and getting paid.",
          },
        },
      ],
    },
    {
      id: 'invoices-payments',
      title: 'Invoices & Payments',
      steps: [
        {
          id: 'go-to-invoices',
          type: 'NAVIGATE',
          destination: '/invoices',
          content: {
            title: 'Managing Invoices',
            body: "Now let's look at invoices and payment collection.",
            voice: 'Taking you to the invoices page.',
          },
        },
        {
          id: 'invoice-list',
          type: 'SPOTLIGHT',
          target: 'invoice-list',
          waitForElement: 'invoice-list',
          content: {
            title: 'Your Invoices',
            body: "Track every invoice from creation to payment. The dashboard highlights what needs attention.",
            bullets: [
              'Draft - Ready to finalize and send',
              'Sent - Awaiting payment',
              'Partial - Some payment received',
              'Paid - Complete, nothing owed',
              'Overdue - Past due date, needs follow-up',
            ],
            voice: 'Your invoice list shows payment status at a glance.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'convert-quote',
          type: 'SPOTLIGHT',
          target: 'quote-convert-invoice',
          content: {
            title: 'Quote to Invoice',
            body: "When a quote is accepted, convert it to an invoice with one click. All details transfer automatically.",
            tip: 'You can modify the invoice if the actual work differed from the quote.',
            voice: 'Convert accepted quotes to invoices instantly.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'payment-options',
          type: 'SPOTLIGHT',
          target: 'invoice-payment-options',
          content: {
            title: 'Payment Collection',
            body: "Make it easy for customers to pay with multiple options available directly from the invoice.",
            bullets: [
              'Send invoice by email or SMS',
              'Accept credit cards online',
              'Record cash or check payments',
              'Set up payment plans for large jobs',
            ],
            tip: 'Invoices with online payment links get paid 2x faster on average.',
            voice: 'Multiple payment options get you paid faster.',
          },
          display: { position: 'right' },
        },
        {
          id: 'aging-report',
          type: 'SPOTLIGHT',
          target: 'aging-report',
          content: {
            title: 'Aging Report',
            body: "Monitor overdue invoices with the aging report. It breaks down outstanding balances by how long they've been unpaid.",
            bullets: [
              'Current - Not yet due',
              '1-30 days overdue',
              '31-60 days overdue',
              '60+ days overdue - priority follow-up',
            ],
            tip: 'Review the aging report weekly and follow up on anything over 30 days.',
            voice: 'The aging report highlights invoices needing follow-up.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Quotes & Invoices Complete!',
            body: "You're now equipped to manage the complete billing cycle - from proposal to payment collection.\n\nNext recommended: Messaging training to learn how to communicate effectively with customers.",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 5: MESSAGING (COMPREHENSIVE)
// =====================================================

const messaging: TrainingCourse = {
  id: 'messaging',
  title: 'Messaging',
  description: 'Communicate effectively with customers via SMS and email - from quick updates to automated notifications',
  icon: 'message-square',
  estimatedMinutes: 10,
  roles: ['owner', 'admin', 'office_manager'],
  modules: [
    {
      id: 'unified-inbox',
      title: 'Your Message Center',
      steps: [
        {
          id: 'intro',
          type: 'MODAL',
          navigateTo: '/messages',
          content: {
            title: 'Customer Communications',
            body: "Great communication builds trust and retention. Your message center keeps all customer conversations organized in one place.",
            bullets: [
              'All SMS and email in one inbox',
              'Two-way texting with customers',
              'Message templates for consistency',
              'Automated appointment reminders',
            ],
            voice: 'Let\'s master customer communication.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'inbox',
          type: 'SPOTLIGHT',
          target: 'message-inbox',
          waitForElement: 'message-inbox',
          content: {
            title: 'Unified Inbox',
            body: "Every customer conversation appears here. Unread messages are highlighted so nothing gets missed.",
            bullets: [
              'Click any thread to view full conversation',
              'Reply directly via SMS or email',
              'See customer name and context instantly',
              'Search past conversations',
            ],
            tip: 'Check your inbox first thing each morning for overnight messages.',
            voice: 'Your inbox keeps all conversations organized.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'compose',
          type: 'SPOTLIGHT',
          target: 'message-compose',
          content: {
            title: 'Sending Messages',
            body: "Start a new conversation or send a quick update to any customer.",
            bullets: [
              'Search for customer by name or phone',
              'Choose SMS or email delivery',
              'Use templates for common messages',
              'Schedule messages for later',
            ],
            tip: 'SMS has 95%+ open rates vs 20% for email - use it for urgent updates.',
            voice: 'Send messages via SMS or email with one click.',
          },
          display: { position: 'left' },
        },
        {
          id: 'templates',
          type: 'SPOTLIGHT',
          target: 'message-templates',
          content: {
            title: 'Message Templates',
            body: "Save time with templates for messages you send often. Personalization tags auto-fill customer details.",
            bullets: [
              'Appointment reminders',
              'Quote follow-ups',
              'Payment reminders',
              'Review requests',
              'Seasonal service reminders',
            ],
            tip: 'Use {first_name} and {appointment_time} tags for personalization.',
            voice: 'Templates ensure consistent, professional communication.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Messaging Complete!',
            body: "You're ready to communicate professionally with customers via SMS and email.\n\nYour communication will build trust and keep customers coming back!",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 6: LEADS CAPTAIN (COMPREHENSIVE)
// =====================================================

const leadsCaptain: TrainingCourse = {
  id: 'leads-captain',
  title: 'Leads Captain',
  description: 'Turn leads into customers - manage your sales pipeline, automate follow-ups, and close more deals',
  icon: 'target',
  estimatedMinutes: 12,
  roles: ['owner', 'admin'],
  modules: [
    {
      id: 'lead-pipeline',
      title: 'Your Sales Pipeline',
      steps: [
        {
          id: 'intro',
          type: 'MODAL',
          navigateTo: '/leads',
          content: {
            title: 'Never Miss a Lead Again',
            body: "Leads are your business's lifeblood. Leads Captain ensures every inquiry gets the attention it deserves with automated tracking and follow-ups.",
            bullets: [
              'Capture leads from all sources',
              'Track every lead through your pipeline',
              'Automate follow-up reminders',
              'Measure conversion rates',
            ],
            voice: 'Let\'s make sure you close more leads.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'pipeline-view',
          type: 'SPOTLIGHT',
          target: 'leads-dashboard',
          waitForElement: 'leads-dashboard',
          content: {
            title: 'Pipeline Overview',
            body: "See all your leads organized by stage. Drag leads between columns as they progress through your sales process.",
            bullets: [
              'New - Just came in, needs first contact',
              'Contacted - You\'ve reached out',
              'Qualified - Confirmed real opportunity',
              'Quote Sent - Waiting for decision',
              'Won - Converted to customer!',
            ],
            voice: 'Your pipeline shows where every lead stands.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'lead-sources',
          type: 'SPOTLIGHT',
          target: 'leads-sources',
          content: {
            title: 'Track Lead Sources',
            body: "Know where your best leads come from. Source tracking helps you invest in what works.",
            bullets: [
              'Website form submissions',
              'Phone calls',
              'Referrals from existing customers',
              'Advertising (Google, Facebook, etc.)',
            ],
            tip: 'Your referral leads likely close at the highest rate - track and nurture referral sources!',
            voice: 'Understanding lead sources helps you market smarter.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'automation',
          type: 'SPOTLIGHT',
          target: 'leads-automation',
          content: {
            title: 'Automated Follow-ups',
            body: "Set up automatic reminders so leads never go cold. The system prompts you when it's time to reach out.",
            bullets: [
              'Auto-reminder if no contact in 24 hours',
              'Follow-up sequence after sending quotes',
              'Re-engagement for stale leads',
              'Escalation if leads aren\'t progressing',
            ],
            tip: 'Responding within 5 minutes increases conversion by 9x!',
            voice: 'Automation ensures timely follow-up on every lead.',
          },
          display: { position: 'right' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Leads Captain Complete!',
            body: "You're ready to manage leads like a pro! With proper pipeline management and automated follow-ups, you'll close more deals.\n\nRemember: Speed to lead matters - respond fast!",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 7: AI VOICE & SMS
// Feature-flagged
// =====================================================

const aiVoiceSms: TrainingCourse = {
  id: 'ai-voice-sms',
  title: 'AI Voice & SMS Setup',
  description: 'Configure AI to answer calls when you can\'t, capture lead information, and follow up automatically',
  icon: 'phone',
  estimatedMinutes: 15,
  roles: ['owner', 'admin'],
  featureFlag: 'ai_voice_enabled',
  modules: [
    {
      id: 'ai-overview',
      title: 'Understanding AI Voice',
      steps: [
        {
          id: 'welcome',
          type: 'MODAL',
          navigateTo: '/settings/voice',
          content: {
            title: 'AI That Works While You Sleep',
            body: "AI Voice answers your business calls when you can't - after hours, during jobs, or when you're just too busy. It captures caller information and follows up automatically.",
            bullets: [
              'Natural conversation with callers',
              'Captures name, phone, and service needed',
              'Identifies emergencies for immediate escalation',
              'Sends SMS follow-up automatically',
            ],
            tip: 'Most businesses miss 40% of calls - AI Voice catches them all.',
            voice: 'AI Voice answers calls when you can\'t.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'availability',
          type: 'SPOTLIGHT',
          target: 'availability-section',
          waitForElement: 'availability-section',
          content: {
            title: 'When AI Answers',
            body: "Configure when AI should pick up. Most businesses use AI outside business hours, but you can customize based on your needs.",
            bullets: [
              'After hours only (most common)',
              'When you don\'t answer after X rings',
              'Always on specific days',
              'Manual toggle for busy periods',
            ],
            voice: 'Set when AI should answer your calls.',
          },
          display: { position: 'right' },
        },
        {
          id: 'emergency-toggle',
          type: 'SPOTLIGHT',
          target: 'emergency-toggle',
          content: {
            title: 'Emergency Detection',
            body: "AI can recognize emergency situations and immediately notify your on-call technician. Never miss an urgent call again.",
            bullets: [
              'Detects keywords like "flooding" or "no heat"',
              'Immediate SMS to on-call tech',
              'Caller gets reassurance help is coming',
              'Full transcript sent to your team',
            ],
            tip: 'Test your emergency detection by calling and saying "I have a water leak".',
            voice: 'Emergency detection ensures urgent calls get through.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'AI Voice Setup Complete!',
            body: "Your AI assistant is ready to answer calls! Test it by calling your business number after hours.\n\nYou'll receive a lead notification every time AI captures a caller's information.",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 8: PROOF OF WORK
// Feature-flagged
// =====================================================

const proofOfWork: TrainingCourse = {
  id: 'proof-of-work',
  title: 'Proof of Work',
  description: 'Build trust with verified job records - documentation that protects you and impresses customers',
  icon: 'badge-check',
  estimatedMinutes: 8,
  roles: ['owner', 'admin', 'technician'],
  featureFlag: 'pow_enabled',
  modules: [
    {
      id: 'pow-overview',
      title: 'What is Proof of Work?',
      steps: [
        {
          id: 'intro',
          type: 'MODAL',
          navigateTo: '/settings/proof-of-work',
          content: {
            title: 'Documentation That Builds Trust',
            body: "Proof of Work creates a professional, verified record of every job. It protects you from disputes and gives customers confidence in your work.",
            bullets: [
              'Before/after photos documented',
              'Work performed clearly listed',
              'Technician info and timestamps',
              'Digital signatures captured',
            ],
            tip: 'Customers who receive Proof of Work leave 3x more reviews.',
            voice: 'Proof of Work builds trust with every job.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'pow-preview',
          type: 'SPOTLIGHT',
          target: 'pow-preview',
          waitForElement: 'pow-preview',
          content: {
            title: 'What Customers See',
            body: "This is the professional record your customers receive. It's mobile-friendly and can be saved or shared.",
            bullets: [
              'Your company branding',
              'Complete work summary',
              'Photo documentation',
              'Shareable link for referrals',
            ],
            voice: 'Customers get a professional record they can share.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'auto-send',
          type: 'SPOTLIGHT',
          target: 'pow-auto-send-toggle',
          content: {
            title: 'Automatic Delivery',
            body: "When enabled, customers automatically receive their Proof of Work via SMS right after job completion.",
            tip: 'Immediate delivery while the experience is fresh increases review rates.',
            voice: 'Auto-send delivers records right after job completion.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Proof of Work Complete!',
            body: "You're set up to create trust-building documentation for every job. Technicians can add photos from the mobile app during jobs.\n\nWatch your review count grow!",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 9: CALENDAR & DISPATCH
// =====================================================

const calendarDispatch: TrainingCourse = {
  id: 'calendar-dispatch',
  title: 'Calendar & Dispatch',
  description: 'Visual scheduling and efficient dispatching - see availability at a glance and assign the right tech to every job',
  icon: 'calendar',
  estimatedMinutes: 12,
  roles: ['owner', 'admin', 'office_manager'],
  modules: [
    {
      id: 'visual-scheduling',
      title: 'Visual Scheduling',
      steps: [
        {
          id: 'intro',
          type: 'MODAL',
          navigateTo: '/calendar',
          content: {
            title: 'Your Visual Schedule',
            body: "The calendar gives you a bird's eye view of your entire operation. See who's doing what, spot gaps, and prevent overbooking.",
            bullets: [
              'Day, week, and month views',
              'Color-coded by technician or job type',
              'Drag and drop to reschedule',
              'Click to view job details',
            ],
            voice: 'The calendar shows your whole schedule at a glance.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'calendar-view',
          type: 'SPOTLIGHT',
          target: 'job-calendar',
          waitForElement: 'job-calendar',
          content: {
            title: 'Calendar Navigation',
            body: "Navigate through your schedule with ease. Each block represents a job, sized by duration.",
            bullets: [
              'Click date to jump to that day',
              'Click job block to view details',
              'Drag job to reschedule',
              'Double-click empty slot to create job',
            ],
            tip: 'Use week view for scheduling, day view for dispatching.',
            voice: 'Click and drag to navigate and manage jobs.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'technician-filter',
          type: 'SPOTLIGHT',
          target: 'calendar-tech-filter',
          content: {
            title: 'Filter by Technician',
            body: "View one technician's schedule or compare multiple. Great for balancing workloads.",
            bullets: [
              'Show all or specific technicians',
              'Compare availability side-by-side',
              'Spot who\'s overbooked or underutilized',
            ],
            voice: 'Filter to see individual or team schedules.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'dispatch-assign',
          type: 'SPOTLIGHT',
          target: 'technician-assign',
          content: {
            title: 'Assigning Jobs',
            body: "Match the right technician to each job based on skills, location, and availability.",
            bullets: [
              'See tech skills and certifications',
              'Consider travel time between jobs',
              'Balance workloads fairly',
              'Handle last-minute changes easily',
            ],
            tip: 'Assign geographically - group jobs in the same area.',
            voice: 'Assign jobs based on skills and location.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Calendar & Dispatch Complete!',
            body: "You're ready to manage your schedule like a pro! Use the calendar daily to stay on top of operations.\n\nEfficient scheduling = happier techs and customers.",
          },
        },
      ],
    },
  ],
};

// =====================================================
// COURSE 10: REPUTATION MANAGER
// Feature-flagged
// =====================================================

const reputationManager: TrainingCourse = {
  id: 'reputation',
  title: 'Reputation Manager',
  description: 'Turn happy customers into 5-star reviews - automate feedback collection and manage your online reputation',
  icon: 'star',
  estimatedMinutes: 10,
  roles: ['owner', 'admin'],
  featureFlag: 'reputation_enabled',
  modules: [
    {
      id: 'reputation-overview',
      title: 'Growing Your Reviews',
      steps: [
        {
          id: 'intro',
          type: 'MODAL',
          navigateTo: '/settings/reputation',
          content: {
            title: 'Your Reputation = Your Revenue',
            body: "93% of customers read reviews before choosing a service provider. Reputation Manager helps you collect more 5-star reviews while privately handling any negative feedback.",
            bullets: [
              'Automated review requests after jobs',
              'Happy customers directed to Google/Facebook',
              'Unhappy customers get private resolution',
              'Track your reputation score over time',
            ],
            tip: 'Businesses with 50+ reviews get 266% more leads from search.',
            voice: 'Let\'s grow your online reviews.',
          },
          display: { overlay: 0.7 },
        },
        {
          id: 'review-flow',
          type: 'SPOTLIGHT',
          target: 'reputation-settings',
          waitForElement: 'reputation-settings',
          content: {
            title: 'How It Works',
            body: "After a job is completed, customers receive a simple survey. Their response determines what happens next.",
            bullets: [
              '4-5 stars → Directed to leave public review',
              '1-3 stars → Routed to private feedback',
              'You get notified of all responses',
              'Follow up on negative feedback privately',
            ],
            voice: 'Happy customers become public advocates.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'platforms',
          type: 'SPOTLIGHT',
          target: 'review-platforms',
          content: {
            title: 'Review Platforms',
            body: "Connect the platforms where you want reviews. Customers get one-click access to leave feedback.",
            bullets: [
              'Google Business Profile (most important)',
              'Facebook Page',
              'Yelp (if relevant to your industry)',
              'Industry-specific sites (HomeAdvisor, etc.)',
            ],
            tip: 'Focus on Google first - it has the biggest impact on search visibility.',
            voice: 'Connect your review platforms for easy customer access.',
          },
          display: { position: 'bottom' },
        },
        {
          id: 'recovery',
          type: 'SPOTLIGHT',
          target: 'recovery-workflow',
          content: {
            title: 'Negative Feedback Recovery',
            body: "When a customer is unhappy, they're routed to private feedback instead of public reviews. This gives you a chance to make it right.",
            bullets: [
              'Immediate notification to you',
              'Customer vents privately, not publicly',
              'Opportunity to recover the relationship',
              'Often converts to loyal customer',
            ],
            tip: 'Respond to negative feedback within 24 hours - recovery rate drops after that.',
            voice: 'Private recovery prevents public damage.',
          },
          display: { position: 'right' },
        },
        {
          id: 'final-checkpoint',
          type: 'CHECKPOINT',
          content: {
            title: 'Reputation Manager Complete!',
            body: "You're set to grow your online reviews and protect your reputation!\n\nRemember: Every completed job is an opportunity for a 5-star review.",
          },
        },
      ],
    },
  ],
};

// =====================================================
// TRAINING CONTENT REGISTRY
// =====================================================

/**
 * All available training courses (10 total)
 * Content is bundled with the app (no runtime fetching)
 */
export const TRAINING_CONTENT: Record<string, TrainingCourse> = {
  'getting-started': gettingStarted,
  'customer-management': customerManagement,
  'job-workflow': jobWorkflow,
  'quotes-invoices': quotesInvoices,
  'messaging': messaging,
  'leads-captain': leadsCaptain,
  'ai-voice-sms': aiVoiceSms,
  'proof-of-work': proofOfWork,
  'calendar-dispatch': calendarDispatch,
  'reputation': reputationManager,
};

/**
 * Get a course by ID
 */
export function getCourse(courseId: string): TrainingCourse | undefined {
  return TRAINING_CONTENT[courseId];
}

/**
 * Get all courses available for a role
 */
export function getCoursesForRole(role: string): TrainingCourse[] {
  return Object.values(TRAINING_CONTENT).filter((course) =>
    course.roles.includes(role)
  );
}

/**
 * Get courses that require a specific feature flag
 */
export function getCoursesWithFeature(featureFlag: string): TrainingCourse[] {
  return Object.values(TRAINING_CONTENT).filter(
    (course) => course.featureFlag === featureFlag
  );
}

/**
 * Get all course IDs
 */
export function getAllCourseIds(): string[] {
  return Object.keys(TRAINING_CONTENT);
}

/**
 * Get courses that don't require feature flags (always available)
 */
export function getAlwaysAvailableCourses(): TrainingCourse[] {
  return Object.values(TRAINING_CONTENT).filter(
    (course) => !course.featureFlag
  );
}

/**
 * Check if a course is available for a user
 */
export function isCourseAvailable(
  courseId: string,
  userRole: string,
  enabledFeatures: string[] = []
): boolean {
  const course = TRAINING_CONTENT[courseId];
  if (!course) return false;

  // Check role
  if (!course.roles.includes(userRole)) return false;

  // Check feature flag
  if (course.featureFlag && !enabledFeatures.includes(course.featureFlag)) {
    return false;
  }

  return true;
}
