// ===========================================
// KNOWLEDGE BASE ARTICLES
// Comprehensive help documentation for AI Assistant
// ===========================================

export interface Article {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  content: string;
  keywords: string[];
  relatedArticles?: string[];
  relatedRoutes?: string[];
  popular?: boolean;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

export const CATEGORIES: Category[] = [
  { id: 'getting-started', title: 'Getting Started', description: 'Learn the basics of TradesCaptain CRM', icon: 'Rocket', order: 1 },
  { id: 'leads', title: 'Managing Leads', description: 'Track and convert leads into customers', icon: 'UserPlus', order: 2 },
  { id: 'customers', title: 'Customer Management', description: 'Build lasting customer relationships', icon: 'Users', order: 3 },
  { id: 'jobs', title: 'Jobs & Scheduling', description: 'Manage your work schedule efficiently', icon: 'Briefcase', order: 4 },
  { id: 'calendar', title: 'Calendar & Availability', description: 'Control your schedule and bookings', icon: 'Calendar', order: 5 },
  { id: 'quotes', title: 'Quotes & Estimates', description: 'Create professional quotes', icon: 'FileText', order: 6 },
  { id: 'invoices', title: 'Invoices & Payments', description: 'Get paid faster', icon: 'DollarSign', order: 7 },
  { id: 'messaging', title: 'SMS & Communication', description: 'Stay connected with customers', icon: 'MessageSquare', order: 8 },
  { id: 'ai-features', title: 'AI Features', description: 'Automation and smart assistance', icon: 'Bot', order: 9 },
  { id: 'team', title: 'Team Management', description: 'Manage your crew effectively', icon: 'Users', order: 10 },
  { id: 'expenses', title: 'Expenses & Finance', description: 'Track business expenses', icon: 'Receipt', order: 11 },
  { id: 'reports', title: 'Reports & Analytics', description: 'Gain business insights', icon: 'BarChart', order: 12 },
  { id: 'integrations', title: 'Integrations', description: 'Connect your tools', icon: 'Plug', order: 13 },
  { id: 'settings', title: 'Settings & Configuration', description: 'Customize your experience', icon: 'Settings', order: 14 },
  { id: 'billing', title: 'Billing & Subscription', description: 'Manage your plan', icon: 'CreditCard', order: 15 },
  { id: 'mobile', title: 'Mobile App', description: 'Use TradesCaptain on the go', icon: 'Smartphone', order: 16 },
  { id: 'troubleshooting', title: 'Troubleshooting', description: 'Solve common issues', icon: 'HelpCircle', order: 17 },
];

export const ARTICLES: Article[] = [
  // =====================================================
  // GETTING STARTED (10 articles)
  // =====================================================
  {
    id: 'gs-001',
    categoryId: 'getting-started',
    title: 'Welcome to TradesCaptain CRM',
    summary: 'An introduction to TradesCaptain and what you can do with it.',
    content: `TradesCaptain CRM is an all-in-one business management platform designed specifically for trade professionals - plumbers, electricians, HVAC technicians, contractors, and more.

**What TradesCaptain helps you do:**
- Capture and manage leads from multiple sources
- Schedule and dispatch jobs efficiently
- Create professional quotes and invoices
- Communicate with customers via SMS
- Track expenses and mileage
- Manage your team and timesheets
- Get paid faster with online payments
- Automate follow-ups and reminders

**Key Features:**
1. **Lead Management** - Never lose a lead again. Track every inquiry from first contact to closed job.
2. **Smart Scheduling** - Calendar integration with drag-and-drop job scheduling.
3. **Professional Documents** - Send branded quotes and invoices in seconds.
4. **AI-Powered SMS** - Let AI handle routine customer messages while you focus on work.
5. **Team Management** - Assign jobs, track time, and manage permissions.
6. **Mobile-First** - Full functionality on any device.

**Getting Started Checklist:**
1. Complete your business profile
2. Add your services and pricing
3. Set up your calendar availability
4. Invite your team members
5. Create your first lead or customer`,
    keywords: ['welcome', 'introduction', 'overview', 'features', 'what is tradescaptain'],
    relatedArticles: ['gs-002', 'gs-003'],
    relatedRoutes: ['/dashboard', '/settings'],
    popular: true,
  },
  {
    id: 'gs-002',
    categoryId: 'getting-started',
    title: 'Setting Up Your Business Profile',
    summary: 'Configure your business information for professional branding.',
    content: `Your business profile appears on quotes, invoices, and customer communications. A complete profile builds trust with customers.

**To set up your business profile:**
1. Go to **Settings** from the main menu
2. Click on **Business Profile**
3. Fill in the following information:

**Required Information:**
- Business Name - Your company's official name
- Phone Number - Primary contact number
- Email Address - Business email for communications
- Address - Your business location

**Optional but Recommended:**
- Logo - Upload your company logo (recommended size: 400x400px)
- Website - Your business website URL
- License Number - Your trade license for credibility
- Business Hours - When you're available
- Service Area - Cities/regions you serve

**Tips for a Great Profile:**
- Use a professional logo with a transparent background
- Keep your business description concise (2-3 sentences)
- List your main services clearly
- Include your license number to build trust

Your profile information will automatically appear on:
- Quotes and estimates
- Invoices
- Email communications
- Customer portal
- Online booking page`,
    keywords: ['business profile', 'company info', 'logo', 'branding', 'setup', 'configure'],
    relatedArticles: ['gs-001', 'gs-004'],
    relatedRoutes: ['/settings'],
  },
  {
    id: 'gs-003',
    categoryId: 'getting-started',
    title: 'Understanding the Dashboard',
    summary: 'Learn what each section of your dashboard means.',
    content: `The dashboard is your command center - it shows everything happening in your business at a glance.

**Dashboard Sections:**

**1. Key Metrics (Top Cards)**
- **Revenue** - Total invoiced amount for the selected period
- **Jobs Completed** - Number of finished jobs
- **Leads** - New leads received
- **Conversion Rate** - Percentage of leads converted to jobs

**2. Recent Activity Feed**
Shows the latest actions in your account:
- New leads and customers
- Job status changes
- Payments received
- Messages sent/received

**3. Today's Schedule**
Your appointments and jobs for today with:
- Customer name and address
- Job type and time
- Quick access to job details

**4. Outstanding Items**
Things that need your attention:
- Unpaid invoices
- Follow-ups due
- Pending quotes

**Customizing Your Dashboard:**
- Click the date range selector to view different time periods
- Use the refresh button to update data in real-time
- Click any metric card for detailed breakdown

**Pro Tips:**
- Check your dashboard first thing each morning
- Address outstanding items before they become overdue
- Use the activity feed to stay informed about team actions`,
    keywords: ['dashboard', 'overview', 'metrics', 'stats', 'home', 'activity'],
    relatedArticles: ['gs-001', 'reports-001'],
    relatedRoutes: ['/dashboard'],
    popular: true,
  },
  {
    id: 'gs-004',
    categoryId: 'getting-started',
    title: 'Adding Your First Lead',
    summary: 'Learn how to add and track your first potential customer.',
    content: `Leads are potential customers who have shown interest in your services. Tracking leads helps you convert more inquiries into paying jobs.

**Ways to Add Leads:**

**1. Manual Entry**
1. Go to **Leads** from the main menu
2. Click **+ New Lead**
3. Enter the lead information:
   - Name (required)
   - Phone number
   - Email address
   - Service needed
   - How they found you (source)
   - Notes about their request

**2. From Incoming Calls**
When you receive a call through your TradesCaptain number, you can convert it to a lead with one click.

**3. From Online Booking**
Leads are automatically created when customers book through your online booking page.

**4. From Website Forms**
Connect your website forms to automatically create leads.

**Lead Statuses:**
- **New** - Just received, needs follow-up
- **Contacted** - You've made contact
- **Qualified** - Good fit for your services
- **Quote Sent** - Waiting for their decision
- **Won** - Converted to customer/job
- **Lost** - Decided not to proceed

**Best Practices:**
- Follow up with new leads within 1 hour
- Always log the outcome of each contact
- Set follow-up reminders for leads not ready to commit
- Track your lead sources to know where to invest in marketing`,
    keywords: ['add lead', 'new lead', 'create lead', 'first lead', 'prospect'],
    relatedArticles: ['leads-001', 'leads-002'],
    relatedRoutes: ['/leads', '/leads/new'],
    popular: true,
  },
  {
    id: 'gs-005',
    categoryId: 'getting-started',
    title: 'Scheduling Your First Job',
    summary: 'Create and schedule your first job appointment.',
    content: `Jobs are scheduled work appointments with customers. Here's how to create your first job.

**Creating a Job:**

**Method 1: From Scratch**
1. Go to **Jobs** > **+ New Job**
2. Select or create a customer
3. Fill in job details:
   - Job type (service, repair, installation, etc.)
   - Description of work
   - Scheduled date and time
   - Duration estimate
   - Assigned technician (if applicable)
4. Click **Create Job**

**Method 2: From a Lead**
1. Open the lead you want to convert
2. Click **Convert to Job**
3. Customer info auto-fills
4. Add scheduling details
5. Click **Create Job**

**Method 3: From Calendar**
1. Go to **Calendar**
2. Click on a time slot
3. Select **New Job**
4. Fill in details

**Job Statuses:**
- **Scheduled** - Upcoming job
- **In Progress** - Currently being worked on
- **Completed** - Work finished
- **Cancelled** - Job was cancelled

**Assigning Jobs:**
- Select a team member from the Assigned dropdown
- They'll receive a notification
- Job appears on their calendar

**Tips:**
- Include the full address for navigation
- Add notes about parking, gate codes, or special instructions
- Attach photos of previous work or customer requests
- Set accurate duration estimates for better scheduling`,
    keywords: ['schedule job', 'create job', 'new job', 'first job', 'appointment', 'book'],
    relatedArticles: ['jobs-001', 'calendar-001'],
    relatedRoutes: ['/jobs', '/jobs/new', '/calendar'],
  },
  {
    id: 'gs-006',
    categoryId: 'getting-started',
    title: 'Quick Start Checklist',
    summary: 'Complete these steps to get your account fully set up.',
    content: `Follow this checklist to ensure your TradesCaptain account is fully configured and ready for business.

**Essential Setup (Do First):**
☐ Complete your business profile with logo and contact info
☐ Add your services and pricing
☐ Set your working hours and availability
☐ Configure your business phone number
☐ Connect your payment processor (Stripe)

**Team Setup (If Applicable):**
☐ Invite team members
☐ Set up user roles and permissions
☐ Configure notification preferences for each user

**Customer Communication:**
☐ Customize your SMS templates
☐ Set up AI auto-response settings
☐ Configure appointment reminder timing
☐ Create your online booking page

**Financial Setup:**
☐ Add your payment terms to invoice settings
☐ Set up expense categories
☐ Configure tax rates if applicable
☐ Connect QuickBooks (optional)

**Advanced Setup:**
☐ Create service checklists for consistency
☐ Set up review request automation
☐ Configure referral program
☐ Create membership plans (if offering)

**Testing:**
☐ Create a test lead and convert to job
☐ Send yourself a test quote
☐ Send yourself a test invoice
☐ Test online booking as a customer

Each step typically takes 2-5 minutes. You can complete the entire setup in about an hour.`,
    keywords: ['checklist', 'setup', 'configure', 'onboarding', 'get started', 'quick start'],
    relatedArticles: ['gs-001', 'gs-002'],
    relatedRoutes: ['/settings', '/onboarding'],
  },
  {
    id: 'gs-007',
    categoryId: 'getting-started',
    title: 'Navigating the Mobile App',
    summary: 'Learn how to use TradesCaptain on your phone or tablet.',
    content: `TradesCaptain is fully responsive and works great on mobile devices. Here's how to navigate effectively.

**Accessing on Mobile:**
TradesCaptain is a Progressive Web App (PWA). For the best experience:

**Add to Home Screen (iPhone):**
1. Open Safari and go to your TradesCaptain URL
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Name it and tap Add

**Add to Home Screen (Android):**
1. Open Chrome and go to your TradesCaptain URL
2. Tap the menu (three dots)
3. Tap "Add to Home Screen"
4. Confirm the name and tap Add

**Mobile Navigation:**
- **Bottom Tab Bar** - Quick access to main sections
- **Hamburger Menu** - Additional options and settings
- **Pull Down** - Refresh content on most pages
- **Swipe Actions** - Swipe list items for quick actions

**Mobile-Optimized Features:**
- **Click-to-Call** - Tap phone numbers to dial
- **Click-to-Navigate** - Tap addresses for maps
- **Quick Job Updates** - Update status from the field
- **Photo Capture** - Take and attach photos directly
- **Signature Capture** - Get customer signatures on-site

**Offline Capabilities:**
- View recently accessed data
- Queue actions for sync when online
- Basic functionality without internet

**Tips for Field Use:**
- Enable notifications to stay updated
- Use quick actions for common tasks
- Take before/after photos for every job
- Update job status in real-time`,
    keywords: ['mobile', 'app', 'phone', 'tablet', 'ios', 'android', 'pwa'],
    relatedArticles: ['gs-001', 'mobile-001'],
    relatedRoutes: ['/dashboard'],
  },
  {
    id: 'gs-008',
    categoryId: 'getting-started',
    title: 'Understanding User Roles',
    summary: 'Learn about different permission levels in TradesCaptain.',
    content: `TradesCaptain has different user roles to control what each team member can access and do.

**Available Roles:**

**1. Owner**
- Full access to everything
- Can manage billing and subscription
- Can delete the account
- Can transfer ownership
- Only one owner per account

**2. Admin**
- Full access to all features
- Can invite and manage team members
- Can view all data and reports
- Cannot manage billing
- Cannot delete account

**3. Manager**
- Access to operations features
- Can manage customers, jobs, and invoices
- Can view team schedules
- Limited settings access
- Cannot manage other users

**4. Technician**
- Access to assigned jobs only
- Can update job status and notes
- Can capture photos and signatures
- Can clock in/out
- Cannot view financial data
- Cannot access settings

**Changing User Roles:**
1. Go to **Settings** > **Team**
2. Click on the team member
3. Select new role from dropdown
4. Click **Save Changes**

**Best Practices:**
- Give the minimum permissions needed
- Have at least two admins for backup
- Review permissions periodically
- Train users on their allowed actions`,
    keywords: ['roles', 'permissions', 'admin', 'technician', 'manager', 'access', 'users'],
    relatedArticles: ['team-001', 'team-002'],
    relatedRoutes: ['/settings/team'],
  },
  {
    id: 'gs-009',
    categoryId: 'getting-started',
    title: 'Setting Up Notifications',
    summary: 'Configure how and when you receive alerts.',
    content: `Stay informed about important events without being overwhelmed. Here's how to set up your notifications.

**Notification Types:**

**1. Push Notifications**
- Appear on your device instantly
- Best for urgent items
- Requires browser/device permission

**2. Email Notifications**
- Sent to your registered email
- Good for non-urgent updates
- Easy to reference later

**3. SMS Notifications**
- Sent to your phone number
- Use for critical alerts only
- May incur carrier charges

**What You Can Be Notified About:**
- New leads received
- New messages from customers
- Job status changes
- Payment received
- Quote accepted/declined
- Follow-up reminders due
- Team member actions

**Configuring Notifications:**
1. Go to **Settings**
2. Click on your profile
3. Select **Notifications**
4. Toggle each notification type on/off
5. Choose delivery method for each

**Tips:**
- Enable push for new leads to respond quickly
- Use email for daily summaries
- Turn off notifications during off-hours (or use Quiet Hours)
- Review notification settings monthly

**Quiet Hours:**
Set times when non-urgent notifications are silenced:
1. Go to **Settings** > **Notifications**
2. Enable **Quiet Hours**
3. Set start and end time
4. Emergency notifications still come through`,
    keywords: ['notifications', 'alerts', 'push', 'email', 'sms', 'quiet hours'],
    relatedArticles: ['settings-001'],
    relatedRoutes: ['/settings'],
  },
  {
    id: 'gs-010',
    categoryId: 'getting-started',
    title: 'Keyboard Shortcuts',
    summary: 'Speed up your workflow with keyboard shortcuts.',
    content: `Power users can navigate TradesCaptain faster using keyboard shortcuts.

**Global Shortcuts:**
- **Cmd/Ctrl + K** - Open command palette (quick search)
- **Cmd/Ctrl + /** - Open keyboard shortcuts help
- **Escape** - Close modals and dialogs

**Navigation Shortcuts:**
- **G then D** - Go to Dashboard
- **G then L** - Go to Leads
- **G then C** - Go to Customers
- **G then J** - Go to Jobs
- **G then Q** - Go to Quotes
- **G then I** - Go to Invoices
- **G then M** - Go to Messages
- **G then S** - Go to Settings
- **G then H** - Go to Help

**Action Shortcuts:**
- **N then L** - New Lead
- **N then C** - New Customer
- **N then J** - New Job
- **N then Q** - New Quote
- **N then I** - New Invoice
- **N then M** - New Message

**List Shortcuts:**
- **J** - Move down in list
- **K** - Move up in list
- **Enter** - Open selected item
- **E** - Edit selected item
- **Delete** - Delete selected item (with confirmation)

**Command Palette (Cmd/Ctrl + K):**
The command palette is the fastest way to navigate. Just type what you want to do:
- "New lead" - Create a new lead
- "John Smith" - Search for customer
- "Settings billing" - Go to billing settings
- "Today's jobs" - View today's schedule

Start using shortcuts gradually - even learning a few can significantly speed up your workflow.`,
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'command palette', 'quick', 'fast'],
    relatedArticles: ['gs-001'],
    relatedRoutes: ['/dashboard'],
  },

  // =====================================================
  // LEADS (12 articles)
  // =====================================================
  {
    id: 'leads-001',
    categoryId: 'leads',
    title: 'Understanding Lead Statuses',
    summary: 'Learn what each lead status means and when to use it.',
    content: `Lead statuses help you track where each potential customer is in your sales process.

**Lead Status Definitions:**

**New**
- Just received, hasn't been contacted yet
- Should be followed up within 1 hour for best results
- Appears in your "New Leads" count

**Contacted**
- You've made initial contact (call, text, email)
- Waiting for their response
- Set a follow-up reminder

**Qualified**
- Confirmed they need your services
- Budget and timeline discussed
- Ready for a quote

**Quote Sent**
- Estimate/quote has been delivered
- Awaiting their decision
- Good time to follow up after 2-3 days

**Negotiating**
- Discussing terms, pricing, or scope
- Close to making a decision
- May need revised quote

**Won**
- They've agreed to proceed
- Ready to convert to job
- Celebrate! 🎉

**Lost**
- They decided not to proceed
- Always log the reason (price, timing, competitor, etc.)
- Can revisit later

**On Hold**
- Interested but not ready now
- Set a future follow-up date
- Check back periodically

**Changing Lead Status:**
1. Open the lead
2. Click the status dropdown
3. Select new status
4. Add notes about the change

**Best Practices:**
- Update status immediately after each interaction
- Always add notes explaining status changes
- Review stale leads weekly
- Track why leads are lost to improve`,
    keywords: ['lead status', 'pipeline', 'stages', 'new', 'qualified', 'won', 'lost'],
    relatedArticles: ['leads-002', 'leads-003'],
    relatedRoutes: ['/leads'],
    popular: true,
  },
  {
    id: 'leads-002',
    categoryId: 'leads',
    title: 'Adding Leads Manually',
    summary: 'How to create a new lead from scratch.',
    content: `When you get a new inquiry by phone, in person, or any other channel, here's how to add it to TradesCaptain.

**Step-by-Step:**
1. Go to **Leads** from the menu
2. Click **+ New Lead** button
3. Fill in the lead form:

**Required Fields:**
- **Name** - Customer's name

**Recommended Fields:**
- **Phone** - Best contact number
- **Email** - For quotes and follow-ups
- **Service Type** - What they need
- **Source** - How they found you

**Optional Fields:**
- **Address** - Service location
- **Notes** - Details about their request
- **Preferred Contact Method** - Call, text, or email
- **Urgency** - How soon they need service

4. Click **Create Lead**

**Quick Add vs Full Form:**
- Quick Add: Name + Phone only (for fast entry)
- Full Form: All fields (for detailed leads)

**After Creating:**
- Lead status is set to "New"
- Follow-up reminder can be auto-created
- You'll see it on your dashboard

**Tips:**
- Always ask how they found you (marketing ROI)
- Note specific details about their problem
- Get the best time to call back
- If on a call, add lead while talking`,
    keywords: ['add lead', 'create lead', 'manual', 'new lead', 'enter lead'],
    relatedArticles: ['leads-001', 'gs-004'],
    relatedRoutes: ['/leads/new', '/leads'],
  },
  {
    id: 'leads-003',
    categoryId: 'leads',
    title: 'Lead Sources and Tracking',
    summary: 'Track where your leads come from for marketing insights.',
    content: `Knowing where your leads come from helps you invest in the right marketing channels.

**Default Lead Sources:**
- Website
- Google Search
- Google Ads
- Facebook
- Instagram
- Referral
- Repeat Customer
- Yard Sign
- Vehicle Wrap
- Home Show
- Direct Mail
- Yelp
- HomeAdvisor
- Angi
- Thumbtack
- Nextdoor
- Other

**Customizing Sources:**
1. Go to **Settings** > **Lead Sources**
2. Click **Add Source**
3. Enter source name
4. Save

**Viewing Source Performance:**
1. Go to **Reports** > **Lead Sources**
2. See metrics by source:
   - Total leads
   - Conversion rate
   - Revenue generated
   - Cost per lead (if tracking ad spend)

**Attribution Best Practices:**
- Always ask "How did you hear about us?"
- Be specific (don't just say "online")
- Track phone number by source
- Use different booking links for different ads

**Phone Number Tracking:**
You can assign different tracking numbers to different sources:
- Website form → (555) 123-0001
- Google Ads → (555) 123-0002
- Facebook → (555) 123-0003

This way leads are auto-tagged with the correct source.

**ROI Calculation:**
Track your marketing spend and compare to revenue from each source:
- Cost per lead = Ad Spend / Number of Leads
- ROI = (Revenue - Ad Spend) / Ad Spend × 100`,
    keywords: ['lead source', 'tracking', 'marketing', 'attribution', 'roi', 'where'],
    relatedArticles: ['leads-001', 'reports-002'],
    relatedRoutes: ['/leads', '/reports'],
  },
  {
    id: 'leads-004',
    categoryId: 'leads',
    title: 'Converting Leads to Jobs',
    summary: 'Turn qualified leads into scheduled work.',
    content: `When a lead is ready to book, convert them to a customer with a scheduled job.

**Converting a Lead:**
1. Open the lead you want to convert
2. Click **Convert to Job**
3. Customer profile is auto-created (or linked if existing)
4. Fill in job details:
   - Service type
   - Date and time
   - Duration estimate
   - Assigned technician
   - Notes
5. Click **Create Job**

**What Happens:**
- Lead status changes to "Won"
- New customer profile created (if new)
- Job appears on calendar
- Customer notified (optional)
- Team member notified (if assigned)

**Converting to Quote First:**
If they need a formal estimate:
1. Click **Create Quote** instead
2. Add line items and pricing
3. Send quote to customer
4. When approved, convert quote to job

**Tips:**
- Verify contact info before converting
- Confirm the service address
- Double-check availability before scheduling
- Add any access instructions (gate code, etc.)

**Batch Conversion:**
For multiple leads from the same marketing campaign:
1. Select multiple leads
2. Click **Bulk Actions**
3. Choose **Convert to Jobs**
4. Set common details
5. Confirm conversion`,
    keywords: ['convert lead', 'lead to job', 'schedule', 'book', 'won', 'customer'],
    relatedArticles: ['leads-001', 'jobs-001'],
    relatedRoutes: ['/leads', '/jobs/new'],
  },
  {
    id: 'leads-005',
    categoryId: 'leads',
    title: 'Lead Follow-up Best Practices',
    summary: 'Increase conversion with effective follow-up strategies.',
    content: `The speed and quality of your follow-up dramatically impacts conversion rates.

**The 5-Minute Rule:**
Leads contacted within 5 minutes are 21x more likely to convert. Set up instant notifications and prioritize new leads.

**Recommended Follow-up Cadence:**

**Day 1:**
- Call within 5 minutes of inquiry
- If no answer, leave voicemail
- Send follow-up text message
- Send follow-up email

**Day 2:**
- Morning call attempt
- Afternoon text if no response

**Day 3:**
- Final call attempt
- "Last chance" text message

**Day 5:**
- Email with helpful info
- Mark as cold lead if no response

**Week 2:**
- One more attempt via preferred channel
- Offer value (discount, free inspection)

**Auto Follow-up Setup:**
1. Go to **Settings** > **Follow-up Automation**
2. Enable automated sequences
3. Customize timing and messages
4. Exclude certain lead sources if needed

**Follow-up Message Templates:**

**Initial Text:**
"Hi [Name], thanks for contacting [Business]! I just tried calling about your [service] request. When's a good time to chat?"

**Day 2:**
"Hi [Name], just following up on your [service] inquiry. We'd love to help! Reply to this text or call us at [number]."

**Day 3:**
"[Name], I don't want to bother you, but want to make sure you got my messages about [service]. Let me know if you're still interested!"

**Tracking Follow-ups:**
- Log every contact attempt
- Note the outcome
- Set next follow-up reminder
- Update lead status appropriately`,
    keywords: ['follow-up', 'follow up', 'cadence', 'convert', 'contact', 'best practices'],
    relatedArticles: ['leads-001', 'ai-003'],
    relatedRoutes: ['/leads', '/follow-ups'],
  },
  {
    id: 'leads-006',
    categoryId: 'leads',
    title: 'Lead Scoring and Prioritization',
    summary: 'Focus on leads most likely to convert.',
    content: `Not all leads are equal. Lead scoring helps you prioritize your time on the best opportunities.

**How Lead Scoring Works:**
TradesCaptain automatically scores leads based on:

**Positive Signals (+points):**
- Complete contact info (+10)
- Responded to contact (+15)
- Opened your emails (+5 each)
- Visited your website (+5)
- High-value service type (+10)
- Urgency indicated (+20)
- Referral source (+15)
- Repeat customer (+25)

**Negative Signals (-points):**
- Incomplete info (-10)
- No response after 3 attempts (-15)
- Price shopping mentioned (-5)
- Far outside service area (-10)
- Very small job value (-5)

**Score Ranges:**
- 80-100: Hot Lead (prioritize)
- 60-79: Warm Lead (follow up consistently)
- 40-59: Cool Lead (nurture)
- Below 40: Cold Lead (lower priority)

**Using Scores:**
1. Go to **Leads**
2. Sort by Score (highest first)
3. Focus on hot leads first
4. Use filters to view by score range

**Manual Score Adjustment:**
You can manually adjust scores:
1. Open the lead
2. Click the score
3. Add/remove points
4. Add reason note

**Tips:**
- Review scoring criteria quarterly
- Don't ignore low scores completely
- Some cold leads can warm up later
- Track score-to-conversion correlation`,
    keywords: ['lead scoring', 'priority', 'hot lead', 'cold lead', 'qualify', 'rank'],
    relatedArticles: ['leads-001', 'leads-005'],
    relatedRoutes: ['/leads'],
  },
  {
    id: 'leads-007',
    categoryId: 'leads',
    title: 'Importing Leads in Bulk',
    summary: 'Upload multiple leads from a spreadsheet.',
    content: `Moving from another system or have a list of leads? Import them all at once.

**Supported File Formats:**
- CSV (Comma Separated Values)
- XLSX (Excel)

**Required Column:**
- Name (or First Name + Last Name)

**Recommended Columns:**
- Phone
- Email
- Address
- City
- State
- ZIP
- Service Type
- Source
- Notes

**Import Steps:**
1. Go to **Leads**
2. Click **Import**
3. Download the template (recommended)
4. Fill in your data
5. Upload your file
6. Map columns to fields
7. Preview the import
8. Click **Import Leads**

**Column Mapping:**
If your columns have different names, you can map them:
- Your "Mobile" → Our "Phone"
- Your "Enquiry Type" → Our "Service Type"

**Handling Duplicates:**
Choose how to handle matches:
- Skip duplicates (keep existing)
- Update existing (overwrite)
- Create new (allow duplicates)

**Import Limits:**
- Standard plan: 500 leads per import
- Pro plan: 2,000 leads per import
- Enterprise: Unlimited

**Best Practices:**
- Clean your data before importing
- Use consistent formatting
- Remove duplicate entries first
- Test with a small batch first`,
    keywords: ['import', 'upload', 'csv', 'excel', 'bulk', 'spreadsheet', 'migrate'],
    relatedArticles: ['leads-002', 'customers-005'],
    relatedRoutes: ['/leads'],
  },
  {
    id: 'leads-008',
    categoryId: 'leads',
    title: 'Lead Assignment and Routing',
    summary: 'Automatically assign leads to team members.',
    content: `Ensure leads get to the right person quickly with automatic assignment rules.

**Assignment Options:**

**1. Round Robin**
Distributes leads evenly across team members
- Lead 1 → Person A
- Lead 2 → Person B
- Lead 3 → Person C
- Lead 4 → Person A (cycle repeats)

**2. By Service Type**
Routes based on the service requested:
- Plumbing leads → Plumbing team
- Electrical leads → Electrical team
- HVAC leads → HVAC team

**3. By Location**
Routes based on service area:
- North region → Team North
- South region → Team South

**4. By Availability**
Routes to whoever is currently available:
- Checks calendar
- Assigns to first available

**Setting Up Assignment Rules:**
1. Go to **Settings** > **Lead Routing**
2. Click **Add Rule**
3. Set conditions (source, type, location)
4. Set assignment action
5. Set priority order
6. Save rule

**Manual Override:**
You can always manually reassign:
1. Open the lead
2. Click **Assigned To**
3. Select new assignee
4. Add reason (optional)

**Notifications:**
When assigned, team members receive:
- Push notification
- Email notification
- Lead appears on their dashboard

**Tips:**
- Test rules with sample leads
- Review assignments weekly
- Adjust for vacation/time off
- Monitor response times by assignee`,
    keywords: ['assign', 'routing', 'round robin', 'distribute', 'team', 'automatic'],
    relatedArticles: ['leads-001', 'team-002'],
    relatedRoutes: ['/leads', '/settings/team'],
  },

  // =====================================================
  // JOBS (10 articles)
  // =====================================================
  {
    id: 'jobs-001',
    categoryId: 'jobs',
    title: 'Creating and Scheduling Jobs',
    summary: 'Learn how to create jobs and add them to your schedule.',
    content: `Jobs represent scheduled work appointments. Here's everything you need to know about creating them.

**Creating a New Job:**

1. Go to **Jobs** > **+ New Job**
2. Select or create a customer
3. Fill in job details:

**Basic Information:**
- **Job Type** - Service call, repair, installation, maintenance, etc.
- **Title** - Brief description (e.g., "Water heater repair")
- **Description** - Detailed notes about the work

**Scheduling:**
- **Date** - When the job will happen
- **Start Time** - Appointment time
- **Duration** - Estimated length
- **End Time** - Auto-calculated

**Assignment:**
- **Assigned To** - Which technician
- **Equipment Needed** - Any special tools

**Location:**
- Uses customer's address by default
- Can specify different job site address

**Creating from Other Places:**
- From a lead: Click "Convert to Job"
- From calendar: Click on time slot
- From customer profile: Click "New Job"
- From quote: Click "Convert to Job"

**Job Templates:**
Save time with templates for common jobs:
1. Go to **Settings** > **Job Templates**
2. Create templates with pre-filled info
3. When creating a job, select template
4. Adjust as needed

**Tips:**
- Always confirm address with customer
- Include gate codes, parking info
- Set accurate time estimates
- Add customer's preferred contact method`,
    keywords: ['create job', 'schedule', 'new job', 'appointment', 'book', 'work order'],
    relatedArticles: ['jobs-002', 'calendar-001'],
    relatedRoutes: ['/jobs', '/jobs/new'],
    popular: true,
  },
  {
    id: 'jobs-002',
    categoryId: 'jobs',
    title: 'Job Statuses Explained',
    summary: 'Understand the lifecycle of a job from scheduled to completed.',
    content: `Job statuses track where each job is in your workflow. Understanding them helps you stay organized.

**Job Status Definitions:**

**Scheduled**
- Job is booked for a future date
- Appears on calendar
- Customer has been notified

**Confirmed**
- Customer confirmed the appointment
- Ready to go
- May have received reminder

**En Route**
- Technician is traveling to job site
- Customer can track arrival (optional)
- Drive time being tracked

**In Progress**
- Work has begun
- Technician is on-site
- Time tracking active

**On Hold**
- Work paused temporarily
- Waiting for parts, customer decision, etc.
- Requires follow-up

**Completed**
- Work is finished
- Ready for invoicing
- Customer signature obtained (optional)

**Cancelled**
- Job will not happen
- Track reason for reporting
- Can reschedule if needed

**Updating Status:**
1. Open the job
2. Click the status button/dropdown
3. Select new status
4. Add notes if needed

**Mobile Quick Actions:**
From the mobile view, swipe or tap to:
- Start job (In Progress)
- Complete job (Completed)
- View details

**Automatic Status Updates:**
Configure automatic transitions:
- Auto-confirm after customer response
- Auto-complete after signature
- Auto-send invoice after completion

**Tips:**
- Update status in real-time
- Add completion notes
- Take before/after photos
- Get customer signature on completion`,
    keywords: ['job status', 'scheduled', 'completed', 'in progress', 'workflow', 'lifecycle'],
    relatedArticles: ['jobs-001', 'jobs-003'],
    relatedRoutes: ['/jobs'],
    popular: true,
  },
  {
    id: 'jobs-003',
    categoryId: 'jobs',
    title: 'Adding Notes and Photos to Jobs',
    summary: 'Document your work with notes and photos.',
    content: `Good documentation protects you and improves customer satisfaction. Here's how to add notes and photos.

**Adding Job Notes:**

1. Open the job
2. Scroll to Notes section
3. Click **Add Note**
4. Type your note
5. Click Save

**Note Types:**
- **Internal Notes** - Only visible to your team
- **Customer Notes** - Shared with customer
- **System Notes** - Auto-generated (status changes, etc.)

**When to Add Notes:**
- Customer requests or preferences
- Work performed details
- Issues encountered
- Parts used
- Follow-up needed
- Important observations

**Adding Photos:**

1. Open the job
2. Go to Photos section
3. Click **Add Photo** (or camera icon)
4. Take photo or upload existing
5. Add caption (optional)
6. Save

**Photo Best Practices:**
- **Before photos** - Document initial condition
- **During photos** - Show work in progress
- **After photos** - Prove work completed
- **Problem photos** - Document issues found
- **Receipt photos** - Parts purchased

**Photo Organization:**
Photos are automatically tagged with:
- Date and time
- Technician name
- Job reference
- Location (if enabled)

**Using Voice Notes:**
On mobile, you can add voice-to-text notes:
1. Tap the microphone icon
2. Speak your note
3. Review the transcription
4. Save

**Tips:**
- Take photos before touching anything
- Get wide shots and close-ups
- Include part numbers in photos
- Date-stamp important documentation`,
    keywords: ['notes', 'photos', 'documentation', 'pictures', 'images', 'comments'],
    relatedArticles: ['jobs-001', 'jobs-002'],
    relatedRoutes: ['/jobs'],
  },
  {
    id: 'jobs-004',
    categoryId: 'jobs',
    title: 'Assigning Jobs to Team Members',
    summary: 'Assign and reassign jobs to your technicians.',
    content: `Proper job assignment ensures the right person handles each job. Here's how to manage assignments.

**Assigning When Creating:**
1. Create new job
2. Select from "Assigned To" dropdown
3. Choose team member
4. Save job

**Assigning Existing Jobs:**
1. Open the job
2. Click current assignee (or "Unassigned")
3. Select new team member
4. Confirm change

**Bulk Assignment:**
1. Go to Jobs list
2. Select multiple jobs (checkboxes)
3. Click **Bulk Actions** > **Assign**
4. Choose assignee
5. Confirm

**Assignment Considerations:**
- **Availability** - Check their calendar first
- **Skills** - Match job type to expertise
- **Location** - Minimize drive time
- **Workload** - Balance across team

**From Dispatch Board:**
1. Go to **Dispatch**
2. View all technicians and jobs
3. Drag jobs to technician columns
4. Assignments save automatically

**Notification to Assignee:**
When assigned, technician receives:
- Push notification (if enabled)
- Email notification (if enabled)
- Job appears on their dashboard
- Job appears on their calendar

**Self-Assignment:**
Technicians can claim unassigned jobs:
1. View available jobs
2. Click "Claim Job"
3. Job assigned to them

**Reassignment History:**
View who had the job previously:
1. Open job
2. View Activity Log
3. See all assignment changes

**Tips:**
- Consider drive time between jobs
- Leave buffer time for delays
- Check technician preferences
- Review workload balance weekly`,
    keywords: ['assign job', 'technician', 'team member', 'dispatch', 'allocate'],
    relatedArticles: ['jobs-001', 'team-002', 'dispatch-001'],
    relatedRoutes: ['/jobs', '/dispatch'],
  },
  {
    id: 'jobs-005',
    categoryId: 'jobs',
    title: 'Job Checklists',
    summary: 'Ensure consistent work with job checklists.',
    content: `Checklists help technicians complete every step consistently. Here's how to use them.

**Benefits of Checklists:**
- Ensure nothing is forgotten
- Maintain quality standards
- Document work performed
- Train new technicians
- Reduce callbacks

**Creating a Checklist Template:**
1. Go to **Settings** > **Checklists**
2. Click **+ New Checklist**
3. Add checklist name (e.g., "AC Maintenance")
4. Add items:
   - Check refrigerant levels
   - Clean condenser coils
   - Replace air filter
   - Test thermostat
   - Check electrical connections
5. Set item types:
   - Checkbox (done/not done)
   - Text input (notes)
   - Photo required
   - Measurement (with units)
6. Save template

**Attaching Checklist to Job:**
1. Create or open job
2. Click **Add Checklist**
3. Select template
4. Checklist added to job

**Auto-Attach by Job Type:**
Set up automatic attachment:
1. Go to **Settings** > **Job Types**
2. Select job type
3. Choose default checklist
4. All jobs of that type get the checklist

**Completing Checklists:**
1. Open job on mobile
2. Go to Checklist tab
3. Check off items as completed
4. Add notes/photos as required
5. Checklist saves automatically

**Checklist Reports:**
View completion rates:
- By technician
- By job type
- Items commonly missed

**Tips:**
- Keep checklists focused (10-20 items)
- Group related items together
- Include safety checks first
- Update based on callbacks`,
    keywords: ['checklist', 'tasks', 'steps', 'quality', 'consistency', 'items'],
    relatedArticles: ['jobs-001', 'jobs-002'],
    relatedRoutes: ['/jobs', '/settings'],
  },

  // =====================================================
  // INVOICES & PAYMENTS (8 articles)
  // =====================================================
  {
    id: 'invoices-001',
    categoryId: 'invoices',
    title: 'Creating Invoices',
    summary: 'Generate professional invoices for your customers.',
    content: `Get paid faster with professional, easy-to-create invoices.

**Creating an Invoice:**

1. Go to **Invoices** > **+ New Invoice**
2. Select customer (or create new)
3. Add line items:
   - Service/product name
   - Description
   - Quantity
   - Unit price
   - Tax (if applicable)
4. Review totals
5. Save or Send

**Creating from a Job:**
1. Open completed job
2. Click **Create Invoice**
3. Job details auto-populate
4. Adjust as needed
5. Send to customer

**Creating from a Quote:**
1. Open approved quote
2. Click **Convert to Invoice**
3. All line items transfer
4. Send to customer

**Invoice Fields:**

**Header:**
- Invoice number (auto-generated)
- Invoice date
- Due date
- Customer info
- Your business info

**Line Items:**
- Description
- Quantity
- Rate
- Amount
- Tax

**Footer:**
- Subtotal
- Tax total
- Discounts
- Grand total
- Payment terms
- Notes

**Customization:**
- Add your logo
- Customize colors
- Add terms and conditions
- Include payment instructions

**Tips:**
- Invoice immediately after job completion
- Include clear payment terms
- Add photos of work completed
- Offer multiple payment options`,
    keywords: ['create invoice', 'bill', 'billing', 'new invoice', 'charge'],
    relatedArticles: ['invoices-002', 'invoices-003'],
    relatedRoutes: ['/invoices', '/invoices/new'],
    popular: true,
  },
  {
    id: 'invoices-002',
    categoryId: 'invoices',
    title: 'Accepting Online Payments',
    summary: 'Set up payment processing to get paid online.',
    content: `Let customers pay instantly online with credit card, debit, or bank transfer.

**Setting Up Stripe:**
1. Go to **Settings** > **Billing** > **Payments**
2. Click **Connect Stripe**
3. Create or sign into Stripe account
4. Complete verification
5. You're ready to accept payments!

**Payment Options You Can Accept:**
- Credit cards (Visa, Mastercard, Amex, Discover)
- Debit cards
- ACH bank transfers
- Apple Pay
- Google Pay

**How Customers Pay:**
1. You send invoice
2. Customer clicks "Pay Now"
3. Enters payment info
4. Payment processed
5. You receive notification
6. Invoice marked paid
7. Funds deposited (1-2 days)

**Payment Fees:**
- Credit/Debit: ~2.9% + 30¢
- ACH: ~0.8% (capped at $5)
- Fees are deducted from payment

**Customizing Payment Settings:**
- Require deposit upfront
- Allow partial payments
- Set up payment plans
- Add late fees automatically

**Security:**
- PCI compliant
- Encrypted transactions
- Fraud detection
- No card data stored on your servers

**Tips:**
- Offer multiple payment methods
- Enable auto-receipts
- Set up payment reminders
- Consider offering ACH for larger amounts`,
    keywords: ['payments', 'stripe', 'credit card', 'pay online', 'accept payments'],
    relatedArticles: ['invoices-001', 'invoices-003'],
    relatedRoutes: ['/invoices', '/settings/billing'],
  },
  {
    id: 'invoices-003',
    categoryId: 'invoices',
    title: 'Sending Payment Reminders',
    summary: 'Automatically remind customers about outstanding invoices.',
    content: `Don't chase payments manually. Set up automatic reminders for unpaid invoices.

**Automatic Reminder Setup:**
1. Go to **Settings** > **Invoices** > **Reminders**
2. Enable automatic reminders
3. Configure schedule:
   - Days before due date
   - Day of due date
   - Days after due date
4. Customize message templates
5. Save settings

**Default Reminder Schedule:**
- 3 days before due: "Friendly reminder"
- Due date: "Payment due today"
- 3 days overdue: "Past due notice"
- 7 days overdue: "Second reminder"
- 14 days overdue: "Final notice"

**Customizing Reminder Messages:**

**3 Days Before:**
"Hi [Name], just a friendly reminder that invoice #[Number] for $[Amount] is due on [Date]. Pay online: [Link]"

**Due Date:**
"Hi [Name], your invoice #[Number] for $[Amount] is due today. Pay now: [Link]"

**Overdue:**
"Hi [Name], invoice #[Number] for $[Amount] is now [Days] days overdue. Please make payment at your earliest convenience: [Link]"

**Manual Reminders:**
Send one-off reminders:
1. Open the invoice
2. Click **Send Reminder**
3. Choose or customize message
4. Send via email or SMS

**Reminder Settings:**
- Pause reminders for specific invoices
- Exclude certain customers
- Set maximum reminders
- Include late fee warnings

**Tips:**
- Keep tone friendly but clear
- Include easy payment link
- Offer payment plan option for large amounts
- Follow up with call after 3 reminders`,
    keywords: ['reminder', 'payment reminder', 'overdue', 'past due', 'collect', 'follow up'],
    relatedArticles: ['invoices-001', 'invoices-002'],
    relatedRoutes: ['/invoices', '/settings'],
  },

  // =====================================================
  // AI FEATURES (8 articles)
  // =====================================================
  {
    id: 'ai-001',
    categoryId: 'ai-features',
    title: 'AI SMS Auto-Responses',
    summary: 'Let AI handle routine customer messages automatically.',
    content: `Our AI can respond to common customer messages while you focus on work.

**What AI Can Handle:**
- Appointment confirmations
- Basic questions (hours, location, services)
- Reschedule requests
- Quote inquiries
- Directions to your business
- Simple follow-ups

**What AI Escalates to You:**
- Emergency requests
- Complaints
- Complex questions
- Payment issues
- Anything uncertain

**Setting Up AI Responses:**
1. Go to **Settings** > **AI SMS**
2. Toggle **Enable AI Responses**
3. Configure settings:
   - Response delay (seems more human)
   - Business hours only or 24/7
   - Types of messages to handle
4. Train with your business info
5. Save settings

**Training Your AI:**
Provide information about:
- Your services and pricing
- Business hours
- Service areas
- Common questions and answers
- Your tone/personality

**AI Response Examples:**

**Customer:** "What time do you open?"
**AI:** "Hi! We're open Monday-Friday 8am-6pm and Saturday 9am-2pm. Would you like to schedule an appointment?"

**Customer:** "How much for a drain cleaning?"
**AI:** "Drain cleaning typically starts at $150, but the final price depends on the situation. Would you like to schedule a visit for an exact quote?"

**Monitoring AI:**
- Review AI conversations daily
- Flag any issues for retraining
- Adjust settings based on feedback

**Tips:**
- Start with conservative settings
- Review responses for first week
- Add common questions to training
- Keep responses warm and helpful`,
    keywords: ['ai', 'auto response', 'automated', 'sms', 'bot', 'chatbot'],
    relatedArticles: ['ai-002', 'messaging-001'],
    relatedRoutes: ['/settings/ai-sms', '/messages'],
    popular: true,
  },
  {
    id: 'ai-002',
    categoryId: 'ai-features',
    title: 'Training Your AI Assistant',
    summary: 'Customize AI responses with your business information.',
    content: `The better you train your AI, the better it represents your business.

**What to Train:**

**Business Basics:**
- Company name and description
- Years in business
- Service areas
- Business hours
- Emergency availability

**Services:**
- List of services offered
- General pricing ranges
- Service descriptions
- What you DON'T do

**Policies:**
- Cancellation policy
- Payment terms
- Warranty information
- Satisfaction guarantee

**FAQs:**
- Common questions customers ask
- Your preferred answers
- Special instructions

**Training Process:**
1. Go to **Settings** > **AI SMS** > **Training**
2. Fill in each section
3. Add custom Q&A pairs
4. Review AI sample responses
5. Adjust and save

**Custom Q&A Example:**

**Question patterns:**
- "Do you work on weekends?"
- "Are you open Saturday?"
- "Weekend availability?"

**Your answer:**
"Yes! We're available Saturday 9am-2pm for appointments. Sundays are reserved for emergencies only. Would you like to book a Saturday slot?"

**Testing Your Training:**
1. Use the Test feature
2. Enter sample messages
3. Review AI responses
4. Adjust training if needed

**Ongoing Improvement:**
- Review AI conversations weekly
- Note any incorrect responses
- Add new Q&A for gaps
- Update for seasonal changes

**Tips:**
- Be specific in answers
- Include your personality
- Update pricing regularly
- Test edge cases`,
    keywords: ['train ai', 'customize', 'teaching', 'faq', 'responses', 'knowledge'],
    relatedArticles: ['ai-001', 'ai-003'],
    relatedRoutes: ['/settings/ai-sms'],
  },
  {
    id: 'ai-003',
    categoryId: 'ai-features',
    title: 'AI Handoff to Human',
    summary: 'How AI knows when to bring you into the conversation.',
    content: `AI knows its limits. Here's how handoff to humans works.

**Automatic Handoff Triggers:**

**Sentiment Detection:**
- Customer sounds frustrated
- Complaint detected
- Urgency expressed
- Dissatisfaction mentioned

**Topic Detection:**
- Emergency situations
- Billing/payment issues
- Warranty claims
- Complex technical questions
- Legal matters

**Confidence Detection:**
- AI unsure of answer
- Question outside training
- Multiple interpretations possible

**Customer Request:**
- "Talk to a human"
- "Need to speak to someone"
- "Is anyone there?"

**What Happens at Handoff:**
1. AI responds: "Let me get someone who can help..."
2. You receive notification
3. Conversation flagged for attention
4. AI stops responding
5. You take over

**Notification Options:**
- Push notification
- SMS to your phone
- Email alert
- In-app badge

**Handoff Message Customization:**
Customize what AI says:
"I want to make sure you get the best help. Let me connect you with [Name] who will follow up shortly!"

**Taking Over:**
1. Open flagged conversation
2. Review AI messages
3. Continue conversation
4. Mark as handled

**Tips:**
- Set up multiple notification methods
- Respond to handoffs within 15 minutes
- Thank customer for patience
- Review handoff reasons for AI improvements`,
    keywords: ['handoff', 'escalate', 'human', 'take over', 'transfer', 'agent'],
    relatedArticles: ['ai-001', 'ai-002'],
    relatedRoutes: ['/messages', '/settings/ai-sms'],
  },

  // =====================================================
  // TEAM MANAGEMENT (6 articles)
  // =====================================================
  {
    id: 'team-001',
    categoryId: 'team',
    title: 'Inviting Team Members',
    summary: 'Add employees and technicians to your account.',
    content: `Add your team to TradesCaptain so they can access the features they need.

**Inviting a Team Member:**
1. Go to **Settings** > **Team**
2. Click **+ Invite Member**
3. Enter their email address
4. Select their role:
   - Admin
   - Manager
   - Technician
5. Click **Send Invitation**

**What Happens:**
- They receive an email invitation
- Link to create their account
- Invitation expires in 7 days
- You can resend if needed

**Role Selection Guide:**

**Admin** - For office managers, partners
- Full access to everything
- Can manage other users
- Cannot access billing

**Manager** - For supervisors, dispatchers
- Full operational access
- Can view all data
- Limited settings

**Technician** - For field workers
- Sees only assigned jobs
- Can update job status
- No financial access

**Pending Invitations:**
View and manage sent invitations:
1. Go to **Settings** > **Team**
2. See Pending tab
3. Resend or cancel invitations

**After They Accept:**
- Account created
- Can log in immediately
- Appears in team list
- Configure their notifications

**Tips:**
- Start with technician role
- Upgrade permissions as needed
- Review team list monthly
- Remove departed employees promptly`,
    keywords: ['invite', 'add user', 'team member', 'employee', 'technician', 'add'],
    relatedArticles: ['team-002', 'gs-008'],
    relatedRoutes: ['/settings/team', '/settings/team/invite'],
    popular: true,
  },
  {
    id: 'team-002',
    categoryId: 'team',
    title: 'Managing User Permissions',
    summary: 'Control what each team member can see and do.',
    content: `Fine-tune access for each team member beyond basic roles.

**Permission Categories:**

**Leads & Customers:**
- View leads
- Create leads
- Edit leads
- Delete leads
- View customers
- Edit customers
- View all vs assigned only

**Jobs & Scheduling:**
- View jobs
- Create jobs
- Edit jobs
- Delete jobs
- View calendar
- Modify calendar
- View all vs assigned only

**Quotes & Invoices:**
- View quotes
- Create quotes
- Edit quotes
- Send quotes
- View invoices
- Create invoices
- Void invoices
- Apply payments

**Financial:**
- View revenue
- View expenses
- Create expenses
- Approve expenses
- Export reports

**Team:**
- View team
- Manage team
- View timesheets
- Approve timesheets

**Modifying Permissions:**
1. Go to **Settings** > **Team**
2. Click on team member
3. Scroll to Permissions
4. Toggle individual permissions
5. Save changes

**Permission Templates:**
Create custom permission sets:
1. Go to **Settings** > **Roles**
2. Click **+ New Role**
3. Name the role
4. Set permissions
5. Save template
6. Apply to users

**Tips:**
- Start restrictive, add as needed
- Review permissions quarterly
- Document role requirements
- Test as user to verify`,
    keywords: ['permissions', 'access', 'roles', 'restrict', 'control', 'security'],
    relatedArticles: ['team-001', 'gs-008'],
    relatedRoutes: ['/settings/team'],
  },

  // =====================================================
  // SETTINGS (6 articles)
  // =====================================================
  {
    id: 'settings-001',
    categoryId: 'settings',
    title: 'Services and Pricing Setup',
    summary: 'Configure your service catalog for quotes and invoices.',
    content: `Set up your services once, then select them when creating quotes and invoices.

**Adding a Service:**
1. Go to **Settings** > **Services**
2. Click **+ Add Service**
3. Fill in details:
   - Service name
   - Description
   - Default price
   - Unit (hourly, flat, per item)
   - Tax settings
   - Category
4. Save

**Service Fields:**

**Name** - What appears on documents
Example: "Faucet Repair"

**Description** - Details for the customer
Example: "Labor and parts to repair or replace a leaking faucet"

**Price** - Default amount
Can be fixed or starting price

**Unit Type:**
- Flat rate (one price)
- Hourly (per hour)
- Per unit (per item/foot/etc.)

**Taxable** - Whether tax applies

**Category** - For organization
- Repairs
- Installations
- Maintenance
- Emergency

**Service Bundles:**
Create packages of multiple services:
1. Click **+ Create Bundle**
2. Name the bundle
3. Select services to include
4. Set bundle price
5. Save

**Using Services:**
When creating quote/invoice:
1. Click **Add Item**
2. Search or browse services
3. Select service
4. Adjust quantity/price if needed
5. Details auto-fill

**Tips:**
- Keep names clear and professional
- Include helpful descriptions
- Review pricing quarterly
- Create bundles for common jobs`,
    keywords: ['services', 'pricing', 'price list', 'catalog', 'rates', 'charges'],
    relatedArticles: ['invoices-001', 'quotes-001'],
    relatedRoutes: ['/settings/services'],
  },

  // =====================================================
  // TROUBLESHOOTING (6 articles)
  // =====================================================
  {
    id: 'trouble-001',
    categoryId: 'troubleshooting',
    title: 'Login Problems',
    summary: 'Can\'t log in? Try these solutions.',
    content: `Having trouble accessing your account? Here are common solutions.

**Forgot Password:**
1. Click "Forgot Password" on login page
2. Enter your email address
3. Check email for reset link
4. Click link and set new password
5. Log in with new password

**Email Not Recognized:**
- Check for typos
- Try alternate email addresses
- Contact support if still not working

**Password Not Working:**
- Check Caps Lock
- Clear browser cache
- Try password reset
- Check for extra spaces

**Account Locked:**
After 5 failed attempts:
- Wait 15 minutes
- Or reset password immediately

**Two-Factor Authentication Issues:**
- Make sure your phone time is correct
- Use backup codes if available
- Contact support for reset

**Browser Issues:**
Try these steps:
1. Clear browser cache and cookies
2. Try incognito/private mode
3. Try a different browser
4. Disable browser extensions

**Mobile App Issues:**
1. Force close and reopen app
2. Check for app updates
3. Clear app cache
4. Reinstall if needed

**Contact Support:**
If none of these work:
- Email: support@tradescaptain.com
- Include your email address
- Describe what you've tried`,
    keywords: ['login', 'password', 'cant access', 'locked out', 'forgot password', 'sign in'],
    relatedArticles: ['trouble-002', 'trouble-003'],
    relatedRoutes: ['/login', '/forgot-password'],
    popular: true,
  },
  {
    id: 'trouble-002',
    categoryId: 'troubleshooting',
    title: 'Payment Processing Issues',
    summary: 'Troubleshoot problems with accepting payments.',
    content: `If customers can't pay or payments aren't processing, try these solutions.

**Customer Can't Pay:**

**Invalid Card:**
- Ask customer to verify card details
- Try different card
- Check if card is expired
- Ensure sufficient funds

**Card Declined:**
Common reasons:
- Insufficient funds
- Card blocked for online purchases
- Bank security hold
- International transaction block

Solutions:
- Customer should contact their bank
- Try a different payment method
- Offer ACH/bank transfer

**Payment Link Not Working:**
- Resend the invoice
- Check link hasn't expired
- Try different browser
- Clear cache

**Your Stripe Connection:**

**Payments Not Appearing:**
1. Go to **Settings** > **Payments**
2. Check Stripe connection status
3. Reconnect if necessary
4. Check Stripe dashboard directly

**Verification Issues:**
Complete Stripe verification:
- Business information
- Bank account details
- Identity verification
- Address confirmation

**Payout Problems:**

**Not Receiving Payouts:**
Check:
- Bank account connected correctly
- Verification completed
- No holds on account
- Payout schedule settings

**Refund Issues:**
To process refund:
1. Open the invoice
2. Click **Refund**
3. Enter amount (partial or full)
4. Confirm refund
5. Takes 5-10 days to appear

**Contact Support:**
For urgent payment issues:
- Stripe support: support.stripe.com
- TradesCaptain: support@tradescaptain.com`,
    keywords: ['payment', 'stripe', 'credit card', 'declined', 'refund', 'payout'],
    relatedArticles: ['invoices-002', 'trouble-001'],
    relatedRoutes: ['/settings/billing', '/invoices'],
  },
  {
    id: 'trouble-003',
    categoryId: 'troubleshooting',
    title: 'Calendar Sync Issues',
    summary: 'Fix problems with calendar integration.',
    content: `If your calendar isn't syncing properly, try these solutions.

**Calendar Not Connecting:**

**Google Calendar:**
1. Go to **Settings** > **Calendar**
2. Click **Disconnect**
3. Wait 30 seconds
4. Click **Connect Google Calendar**
5. Sign in and grant permissions
6. Select calendars to sync

**Outlook/Microsoft:**
1. Same disconnect/reconnect process
2. Use work/school account if applicable
3. Check with IT if corporate account

**Events Not Appearing:**

**In TradesCaptain:**
- Check correct calendar selected
- Check date range
- Refresh the page
- Wait 5 minutes for sync

**In External Calendar:**
- Check sync is enabled
- Verify correct calendar selected
- Look in "Other Calendars"
- Check hidden calendars

**Duplicate Events:**
If seeing duplicates:
1. Check only one sync direction
2. Disable bidirectional sync
3. Delete duplicates manually
4. Re-enable sync

**Sync Delays:**
Sync typically takes 5-15 minutes
For immediate sync:
1. Open Settings > Calendar
2. Click "Sync Now"
3. Wait for confirmation

**Availability Issues:**

**Not Blocking Time:**
- Verify availability settings
- Check calendar sync direction
- Confirm events are not "Free"

**Showing Wrong Availability:**
- Check time zone settings
- Verify working hours
- Review calendar permissions

**Tips:**
- Use one primary calendar
- Set correct time zone
- Check sync status weekly
- Review permissions if issues persist`,
    keywords: ['calendar', 'sync', 'google calendar', 'outlook', 'not syncing', 'events'],
    relatedArticles: ['calendar-001', 'trouble-001'],
    relatedRoutes: ['/settings/calendar', '/calendar'],
  },

  // =====================================================
  // ADDITIONAL COMMON ARTICLES
  // =====================================================
  {
    id: 'quotes-001',
    categoryId: 'quotes',
    title: 'Creating Professional Quotes',
    summary: 'Send estimates that win jobs.',
    content: `Professional quotes help you win more jobs. Here's how to create winning estimates.

**Creating a Quote:**
1. Go to **Quotes** > **+ New Quote**
2. Select customer
3. Add line items:
   - Select from service catalog
   - Or add custom items
   - Include quantities and prices
4. Add optional elements:
   - Discount
   - Notes
   - Terms and conditions
   - Validity period
5. Preview and send

**Quote Components:**

**Header:**
- Your business info (auto-filled)
- Customer info
- Quote number
- Date and expiry

**Line Items:**
- Description
- Quantity
- Unit price
- Total

**Options:**
Offer multiple options:
- Good: Basic service
- Better: Standard service
- Best: Premium service

**Footer:**
- Subtotal
- Discounts
- Tax
- Grand total
- Terms
- Validity

**Sending Quotes:**
Options for delivery:
- Email (with PDF attachment)
- SMS (with link)
- Both

**Quote Tracking:**
See when customer:
- Opens the quote
- Views it multiple times
- Accepts or declines

**Following Up:**
If no response:
1. Open quote
2. Click **Send Reminder**
3. Customize message
4. Send

**Tips:**
- Respond to quote requests within 24 hours
- Include photos of similar work
- Offer multiple options
- Follow up after 2-3 days`,
    keywords: ['quote', 'estimate', 'proposal', 'bid', 'pricing'],
    relatedArticles: ['invoices-001', 'leads-004'],
    relatedRoutes: ['/quotes', '/quotes/new'],
    popular: true,
  },
  {
    id: 'calendar-001',
    categoryId: 'calendar',
    title: 'Calendar Overview and Navigation',
    summary: 'Master your schedule with the calendar.',
    content: `The calendar is your scheduling command center. Here's how to use it effectively.

**Calendar Views:**

**Day View:**
- Detailed hour-by-hour schedule
- Best for busy days
- See job details at a glance

**Week View:**
- See the full week
- Identify gaps and overlaps
- Great for planning

**Month View:**
- Big picture overview
- Spot patterns
- Plan ahead

**Navigating:**
- Click arrows to move forward/back
- Click "Today" to return to current date
- Click any date to jump to it

**Color Coding:**
Jobs are colored by:
- Status (scheduled, in progress, completed)
- Job type (if configured)
- Assigned technician

**Creating from Calendar:**
1. Click on a time slot
2. Select "New Job"
3. Fill in details
4. Job appears on calendar

**Drag and Drop:**
- Drag jobs to reschedule
- Drag to different time
- Drag to different day
- Drag to different technician (week view)

**Availability:**
Gray blocks show:
- Outside working hours
- Blocked time
- Appointments from connected calendars

**Filters:**
Show/hide by:
- Technician
- Job status
- Job type
- Customer

**Tips:**
- Check calendar every morning
- Use week view for planning
- Color code by job type
- Keep personal calendar synced`,
    keywords: ['calendar', 'schedule', 'view', 'day', 'week', 'month', 'navigate'],
    relatedArticles: ['jobs-001', 'calendar-002'],
    relatedRoutes: ['/calendar'],
    popular: true,
  },
  {
    id: 'messaging-001',
    categoryId: 'messaging',
    title: 'SMS Conversations Overview',
    summary: 'Communicate with customers via text message.',
    content: `SMS is the fastest way to communicate with customers. Here's how messaging works.

**Starting a Conversation:**

**From Messages:**
1. Go to **Messages**
2. Click **+ New Message**
3. Select customer or enter number
4. Type message
5. Send

**From Customer Profile:**
1. Open customer
2. Click SMS icon or **Send Message**
3. Type and send

**From Job:**
1. Open job
2. Click **Message Customer**
3. Templates auto-suggest
4. Send or customize

**Message Features:**

**Templates:**
Pre-written messages for common scenarios:
- Appointment reminders
- On my way
- Job complete
- Quote follow-up
Select template and customize if needed.

**Media:**
Send and receive:
- Photos
- Documents
- Location

**Read Receipts:**
See when messages are:
- Sent
- Delivered
- Read (if available)

**Conversation View:**
All messages with a customer in one thread:
- Most recent at bottom
- Scroll up for history
- Search within conversation

**Business Phone Number:**
Messages come from your business number:
- Professional appearance
- Keep personal number private
- Same number for calls and texts

**Best Practices:**
- Respond within business hours
- Keep messages professional
- Use templates for efficiency
- Don't over-message

**Compliance:**
- Include opt-out option
- Respect do-not-contact requests
- Follow SMS marketing rules`,
    keywords: ['sms', 'text', 'message', 'conversation', 'send', 'chat'],
    relatedArticles: ['ai-001', 'messaging-002'],
    relatedRoutes: ['/messages', '/messages/new'],
    popular: true,
  },
  {
    id: 'expenses-001',
    categoryId: 'expenses',
    title: 'Tracking Business Expenses',
    summary: 'Record and categorize your business expenses.',
    content: `Track expenses to understand your costs and prepare for tax time.

**Adding an Expense:**
1. Go to **Expenses** > **+ New Expense**
2. Fill in details:
   - Vendor/Merchant
   - Amount
   - Date
   - Category
   - Description
   - Payment method
3. Attach receipt (photo or file)
4. Save

**Expense Categories:**
Default categories:
- Materials & Supplies
- Tools & Equipment
- Vehicle & Gas
- Subcontractors
- Office Supplies
- Marketing
- Insurance
- Utilities
- Meals & Entertainment
- Other

**Custom Categories:**
1. Go to **Settings** > **Expense Categories**
2. Click **+ Add Category**
3. Name and save

**Receipt Capture:**
Multiple ways to add receipts:
- Take photo with phone
- Upload from computer
- Email receipts to your account
- Scan with OCR for auto-fill

**Linking to Jobs:**
Associate expenses with jobs:
1. Create or open expense
2. Click **Link to Job**
3. Select the job
4. Expense appears in job costs

**Expense Reports:**
View expenses by:
- Date range
- Category
- Vendor
- Team member

**Tax Preparation:**
Export for tax time:
1. Go to Reports > Expenses
2. Select date range (year)
3. Click Export
4. Download CSV or PDF

**Tips:**
- Log expenses same day
- Always save receipts
- Categorize consistently
- Link to jobs for profitability`,
    keywords: ['expenses', 'costs', 'receipts', 'spending', 'track', 'tax'],
    relatedArticles: ['expenses-002', 'reports-001'],
    relatedRoutes: ['/expenses', '/expenses/new'],
    popular: true,
  },
  {
    id: 'reports-001',
    categoryId: 'reports',
    title: 'Understanding Your Reports',
    summary: 'Gain insights into your business performance.',
    content: `Reports help you understand how your business is doing and where to improve.

**Available Reports:**

**Revenue Report:**
- Total revenue by period
- Revenue by service type
- Revenue by customer
- Revenue by technician
- Trends over time

**Jobs Report:**
- Jobs completed
- Completion rate
- Average job value
- Jobs by type
- Jobs by technician

**Lead Report:**
- Leads received
- Conversion rate
- Lead sources
- Response times
- Lead value

**Customer Report:**
- New customers
- Repeat customers
- Customer lifetime value
- Geographic distribution

**Team Report:**
- Jobs per technician
- Revenue per technician
- Time tracking
- Efficiency metrics

**Accessing Reports:**
1. Go to **Reports**
2. Select report type
3. Set date range
4. Apply filters
5. View results

**Date Ranges:**
- This week
- This month
- This quarter
- This year
- Custom range
- Comparison periods

**Filtering:**
Narrow results by:
- Team member
- Service type
- Customer
- Status

**Exporting:**
Download reports as:
- PDF (for sharing)
- CSV (for spreadsheets)
- Excel (for analysis)

**Scheduled Reports:**
Get reports automatically:
1. Set up report schedule
2. Choose frequency (daily, weekly, monthly)
3. Reports emailed to you

**Tips:**
- Review key metrics weekly
- Compare to previous periods
- Set goals based on data
- Share with team for motivation`,
    keywords: ['reports', 'analytics', 'metrics', 'data', 'insights', 'statistics'],
    relatedArticles: ['gs-003', 'reports-002'],
    relatedRoutes: ['/reports'],
    popular: true,
  },
];

// Helper functions
export function getArticleById(id: string): Article | undefined {
  return ARTICLES.find(article => article.id === id);
}

export function getArticlesByCategory(categoryId: string): Article[] {
  return ARTICLES.filter(article => article.categoryId === categoryId);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(category => category.id === id);
}

export function searchArticles(query: string): Article[] {
  const normalizedQuery = query.toLowerCase();

  return ARTICLES.filter(article => {
    const matchTitle = article.title.toLowerCase().includes(normalizedQuery);
    const matchSummary = article.summary.toLowerCase().includes(normalizedQuery);
    const matchContent = article.content.toLowerCase().includes(normalizedQuery);
    const matchKeywords = article.keywords.some(kw => kw.includes(normalizedQuery));

    return matchTitle || matchSummary || matchContent || matchKeywords;
  }).sort((a, b) => {
    // Prioritize title matches
    const aTitle = a.title.toLowerCase().includes(normalizedQuery) ? 1 : 0;
    const bTitle = b.title.toLowerCase().includes(normalizedQuery) ? 1 : 0;
    if (aTitle !== bTitle) return bTitle - aTitle;

    // Then keyword matches
    const aKeyword = a.keywords.some(kw => kw.includes(normalizedQuery)) ? 1 : 0;
    const bKeyword = b.keywords.some(kw => kw.includes(normalizedQuery)) ? 1 : 0;
    return bKeyword - aKeyword;
  });
}

export function getPopularArticles(): Article[] {
  return ARTICLES.filter(article => article.popular);
}

export function getRelatedArticles(articleId: string): Article[] {
  const article = getArticleById(articleId);
  if (!article?.relatedArticles) return [];

  return article.relatedArticles
    .map(id => getArticleById(id))
    .filter((a): a is Article => a !== undefined);
}
