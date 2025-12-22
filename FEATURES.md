# Trades Captain CRM - Feature Summary

A comprehensive CRM system built for trade service businesses (HVAC, plumbing, electrical, etc.) using Next.js 14, Supabase, and TypeScript.

---

## Core CRM Features

### Customer Management
- **Customer Profiles**: Full customer records with contact info, service history, and notes
- **Customer Lifecycle Value (CLV) Tracking**: Track and analyze customer value over time
- **Service History**: Complete history of all jobs, invoices, and interactions
- **Property/Equipment Tracking**: Track customer equipment, warranties, and service records
- **Tags & Segmentation**: Organize customers with custom tags
- **Favorites System**: Star important customers for quick access
- **Recently Viewed**: Track recently accessed customer records

### Lead Management
- **Lead Capture**: Multi-source lead tracking (web forms, calls, referrals)
- **Lead Scoring**: Automatic and manual lead qualification
- **Pipeline Stages**: Customizable lead pipeline with drag-and-drop
- **Lead Conversion**: Convert leads to customers with one click
- **Source Tracking**: Track where leads come from for ROI analysis

### Job Management
- **Job Scheduling**: Create and schedule service jobs
- **Job Status Tracking**: Track job progress through customizable stages
- **Technician Assignment**: Assign jobs to team members
- **Job Costing**: Track labor, materials, and profitability
- **Job Notes & Photos**: Attach documentation to jobs
- **Recurring Jobs**: Schedule recurring service appointments
- **Checklists**: Custom job checklists for quality assurance

---

## Scheduling & Dispatch

### Calendar & Scheduling
- **Interactive Calendar**: Day, week, and month views
- **Drag-and-Drop Scheduling**: Easily reschedule jobs
- **Technician Calendars**: Individual calendars per team member
- **Availability Management**: Set working hours and time off
- **Schedule Conflicts**: Automatic conflict detection

### Dispatch Board
- **Real-time Dispatch**: Live view of all active jobs
- **Event-Based GPS Tracking**: Battery-efficient location tracking (see details below)
- **Route Optimization**: Optimize routes for efficiency
- **Job Assignment**: Quick job assignment to available techs

### GPS Tracking (Event-Based Approach)

We use **event-based tracking** instead of continuous GPS polling. This is the optimal approach for trades businesses - minimal data usage (~10-50 KB/day per technician) and negligible battery impact.

#### GPS Tracking Comparison

| Method | Data Usage | Battery | Best For |
|--------|-----------|---------|----------|
| Real-time (5-10 sec) | High (~2-5 MB/day) | Heavy drain | Fleet management, deliveries |
| Interval (1-5 min) | Moderate (~500KB/day) | Moderate | Overkill for most trades |
| **Event-based** | **Very Low (~50KB/day)** | **Minimal** | **Trades CRM** |
| On-demand | Negligible | None | Basic needs |

#### When GPS Fires

| Event | When Tracked | Purpose |
|-------|--------------|---------|
| Clock In | Start of day | Day start location |
| Job Start | "On my way" or "Arrived" | Proof of arrival |
| Job Complete | Status change | Service verification |
| Clock Out | End of day | Day end location |

**Result**: 4-10 GPS pings per technician per day = ~10-50 KB total

#### What We Track

- **"Technician arrived" timestamp + location** - Proof of service
- **"Job completed" location** - Verification for customers
- **Current location on dispatch board** - On-demand refresh only
- **ETA calculation** - For customer communication

#### What We Avoid (High Data/Battery)

- Live map with constantly moving dots
- Background tracking every 30 seconds
- Full route history by default
- Continuous Google Maps API calls

#### Implementation Pattern

```typescript
// GOOD: Event-based (low data, battery-friendly)
const trackLocation = async (event: 'clock_in' | 'arrived' | 'completed' | 'clock_out') => {
  const position = await getCurrentPosition();
  await saveLocationEvent(technicianId, event, position);
};

// BAD: Continuous tracking (high data + battery killer)
setInterval(() => {
  trackAndSendLocation(); // Every 30 seconds = angry technicians
}, 30000);
```

### Online Booking
- **Public Booking Widget**: Embeddable booking form for websites
- **Service Selection**: Customers choose service type
- **Date/Time Selection**: Available slot picker
- **Contact Information**: Customer details collection
- **Booking Confirmation**: Automatic confirmation flow

---

## Financial Features

### Invoicing
- **Invoice Creation**: Professional invoice generation
- **Line Items**: Products, services, and custom items
- **Tax Calculation**: Automatic tax computation
- **Payment Terms**: Net 15, Net 30, Due on Receipt
- **Invoice Templates**: Customizable invoice designs
- **Batch Invoicing**: Create multiple invoices at once
- **Recurring Invoices**: Auto-generate recurring invoices

### Quotes & Estimates
- **Quote Builder**: Create detailed service quotes
- **Quote Templates**: Pre-built quote templates
- **Quote Approval**: Customer approval workflow
- **Quote-to-Invoice**: Convert approved quotes to invoices
- **Quote Expiration**: Automatic expiry management

### Payments
- **Payment Processing**: Accept credit card payments
- **Partial Payments**: Track partial payment status
- **Payment History**: Complete payment audit trail
- **Payment Reminders**: Automated payment reminder emails

### Memberships & Subscriptions
- **Membership Plans**: Create recurring service plans
- **Plan Management**: Monthly, quarterly, yearly billing cycles
- **Included Services**: Define services included in plans
- **Subscriber Tracking**: Track active subscribers
- **Revenue Analytics**: Membership revenue reporting

### Promotions & Coupons
- **Promo Codes**: Create discount codes
- **Discount Types**: Percentage, fixed amount, free service
- **Usage Limits**: Set per-code and per-customer limits
- **Date Ranges**: Schedule promotion periods
- **Public/Private Codes**: Control code visibility
- **Usage Tracking**: Track promotion effectiveness

---

## Communication

### Messaging
- **Two-Way SMS**: Send and receive text messages
- **Email Integration**: Send emails from the CRM
- **Message Templates**: Pre-built message templates
- **Bulk Messaging**: Send to multiple recipients
- **Message History**: Complete conversation history

### Call Tracking
- **Inbound Call Logging**: Track incoming calls
- **Outbound Call Logging**: Log outbound calls
- **Call Recording Links**: Store call recording URLs
- **Call Analytics**: Call volume and duration stats
- **Missed Call Alerts**: Notifications for missed calls
- **Twilio Integration**: VoIP integration support

### Notifications
- **Email Notifications**: Automated email alerts
- **SMS Notifications**: Text message alerts
- **Push Notifications**: Browser push notifications
- **Appointment Reminders**: Automated appointment reminders
- **Payment Reminders**: Overdue payment alerts

---

## Field Service Tools

### Mobile-Ready Interface
- **Responsive Design**: Works on all devices
- **Offline Support**: Core features work offline
- **Photo Capture**: Take and attach photos
- **Signature Capture**: Digital signature collection

### Time & Expense Tracking
- **Timesheets**: Track technician hours
- **Clock In/Out**: Time clock functionality
- **Mileage Tracking**: Vehicle mileage logging
- **Expense Receipts**: Photo receipt capture
- **Expense Reports**: Generate expense reports

### Inventory Management
- **Parts Inventory**: Track parts and materials
- **Stock Levels**: Monitor inventory quantities
- **Reorder Alerts**: Low stock notifications
- **Purchase Orders**: Create POs for suppliers
- **Parts Used Tracking**: Track parts used per job

---

## Customer Engagement

### Customer Portal
- **Self-Service Portal**: Customers manage their account
- **Appointment Viewing**: See upcoming appointments
- **Invoice Access**: View and pay invoices
- **Quote Review**: Review and approve quotes
- **Service Requests**: Submit new service requests
- **Equipment History**: View equipment records
- **Profile Management**: Update contact info

### Reviews & Reputation
- **Review Requests**: Automated review request emails
- **Multi-Platform Tracking**: Google, Facebook, Yelp reviews
- **Review Response**: Respond to reviews from CRM
- **Rating Analytics**: Average rating tracking
- **Review Dashboard**: Centralized review management

### Referral Program
- **Referral Programs**: Create referral incentive programs
- **Referrer Rewards**: Credit, cash, gift cards
- **Referee Discounts**: New customer incentives
- **Referral Tracking**: Track referral conversions
- **Shareable Links**: Easy-to-share referral links

### Follow-up Management
- **Scheduled Follow-ups**: Plan follow-up activities
- **Follow-up Types**: Call, email, SMS, visit
- **Priority Levels**: Low, medium, high, urgent
- **Overdue Alerts**: Track overdue follow-ups
- **Outcome Tracking**: Record follow-up results

---

## Reporting & Analytics

### Dashboard
- **KPI Cards**: Key metrics at a glance
- **Revenue Charts**: Visual revenue tracking
- **Job Statistics**: Job volume and status
- **Lead Metrics**: Conversion rates and sources

### Reports
- **Revenue Reports**: Income and sales analysis
- **Job Reports**: Job completion and profitability
- **Technician Reports**: Performance by team member
- **Customer Reports**: Customer acquisition and retention
- **Lead Reports**: Lead source and conversion analysis
- **Custom Date Ranges**: Flexible reporting periods

### Analytics
- **Trend Analysis**: Historical trend visualization
- **Comparison Reports**: Period-over-period comparison
- **Export Options**: PDF, CSV, Excel exports

---

## Team & Permissions

### User Management
- **User Roles**: Owner, Admin, Manager, Technician
- **Role-Based Permissions**: Granular access control
- **Feature Flags**: Enable/disable features per user
- **Activity Logging**: Track user actions

### Team Features
- **Team Directory**: View all team members
- **Performance Tracking**: Individual metrics
- **Commission Tracking**: Sales commission management
- **Shift Scheduling**: Team schedule management

---

## Settings & Configuration

### Business Settings
- **Company Profile**: Business name, logo, contact
- **Service Types**: Define offered services
- **Pricing Configuration**: Set labor and service rates
- **Tax Settings**: Configure tax rates
- **Operating Hours**: Set business hours

### Integration Settings
- **Payment Gateway**: Stripe/payment integration
- **Email Provider**: SMTP/email service setup
- **SMS Provider**: Twilio/SMS service setup
- **Calendar Sync**: Google/Outlook calendar
- **Accounting Integration**: QuickBooks sync

### Notification Settings
- **Email Templates**: Customize email content
- **SMS Templates**: Configure text messages
- **Trigger Configuration**: Set notification triggers
- **Quiet Hours**: Do not disturb periods

---

## User Experience

### Command Palette (Cmd+K)
- **Quick Navigation**: Jump to any page instantly
- **Global Search**: Search customers, jobs, leads, invoices
- **Quick Actions**: Create new records from anywhere
- **Keyboard-First**: Full keyboard navigation

### Keyboard Shortcuts
- **Navigation Shortcuts**: Cmd+Shift+C (Customers), Cmd+Shift+J (Jobs), etc.
- **Action Shortcuts**: Cmd+N (New), Cmd+K (Search)
- **Help Dialog**: Cmd+/ shows all shortcuts

### Data Tables
- **Sorting**: Click column headers to sort
- **Filtering**: Advanced filter options
- **Bulk Actions**: Select and act on multiple items
- **Column Customization**: Show/hide columns
- **Export**: Download data as CSV

### Favorites & History
- **Favorite Records**: Star important items
- **Recently Viewed**: Quick access to recent items
- **Quick Access**: Favorites shown in command palette

---

## Technical Features

### Security
- **Authentication**: Supabase Auth (email, magic link)
- **Row-Level Security**: Database-level access control
- **API Authorization**: JWT-based API security
- **Audit Logging**: Track all data changes

### Performance
- **Server Components**: Next.js 14 App Router
- **Optimized Queries**: Efficient database queries
- **Caching**: Response caching where appropriate
- **Lazy Loading**: Load data on demand

### Developer Experience
- **TypeScript**: Full type safety
- **API Routes**: RESTful API endpoints
- **Modular Architecture**: Clean code organization
- **Component Library**: 40+ reusable UI components

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| Forms | React Hook Form + Zod |
| State | React Context + Hooks |
| Icons | Lucide React |
| Charts | Recharts |
| Tables | TanStack Table |
| Calendar | FullCalendar |
| Maps | Google Maps API |
| Payments | Stripe |
| SMS | Twilio |
| Email | SendGrid / Resend |

---

## File Structure

```
app/
├── (auth)/                 # Auth pages (login, register, forgot-password)
├── (dashboard)/            # Main app pages
│   ├── customers/          # Customer management
│   ├── jobs/               # Job management
│   ├── leads/              # Lead management
│   ├── invoices/           # Invoicing
│   ├── quotes/             # Quoting
│   ├── schedule/           # Calendar & scheduling
│   ├── dispatch/           # Dispatch board
│   ├── messages/           # Messaging center
│   ├── reports/            # Reporting
│   ├── reviews/            # Review management
│   ├── follow-ups/         # Follow-up management
│   └── settings/           # Settings pages
│       ├── memberships/    # Membership plans
│       ├── referrals/      # Referral program
│       └── promotions/     # Promotions & coupons
├── portal/[businessId]/    # Customer portal (public)
├── book/[businessId]/      # Online booking (public)
└── api/                    # API routes

lib/
├── supabase/               # Database client & queries
├── calls/                  # Call tracking
├── favorites/              # Favorites system
├── hooks/                  # Custom React hooks
├── permissions/            # Role-based access
├── promotions/             # Promotions engine
├── reviews/                # Review management
└── utils/                  # Utility functions

components/
├── layout/                 # Layout components (sidebar, header)
├── ui/                     # UI primitives (40+ components)
└── forms/                  # Form components
```

---

## API Endpoints

### Customers
- `GET/POST /api/customers` - List/create customers
- `GET/PATCH/DELETE /api/customers/[id]` - Single customer operations

### Jobs
- `GET/POST /api/jobs` - List/create jobs
- `GET/PATCH/DELETE /api/jobs/[id]` - Single job operations

### Leads
- `GET/POST /api/leads` - List/create leads
- `GET/PATCH/DELETE /api/leads/[id]` - Single lead operations

### Invoices
- `GET/POST /api/invoices` - List/create invoices
- `GET/PATCH/DELETE /api/invoices/[id]` - Single invoice operations

### Quotes
- `GET/POST /api/quotes` - List/create quotes
- `GET/PATCH/DELETE /api/quotes/[id]` - Single quote operations

### Calls
- `GET/POST /api/calls` - List/record calls
- `GET/PATCH /api/calls/[id]` - Single call operations
- `GET /api/calls/stats` - Call statistics

### Reviews
- `GET/POST /api/reviews` - List/create reviews
- `PATCH /api/reviews/[id]` - Update review
- `POST /api/reviews/[id]/respond` - Respond to review
- `GET/POST /api/reviews/requests` - Review requests

### Follow-ups
- `GET/POST /api/follow-ups` - List/create follow-ups
- `GET/PATCH/DELETE /api/follow-ups/[id]` - Single follow-up operations
- `POST /api/follow-ups/[id]/complete` - Complete follow-up

### Memberships
- `GET/POST /api/memberships/plans` - List/create plans
- `PATCH/DELETE /api/memberships/plans/[id]` - Single plan operations

### Referrals
- `GET /api/referrals` - List referrals
- `GET/POST /api/referrals/programs` - List/create programs
- `PATCH/DELETE /api/referrals/programs/[id]` - Single program operations

### Promotions
- `GET/POST /api/promotions` - List/create promotions
- `GET/PATCH/DELETE /api/promotions/[id]` - Single promotion operations

### Search
- `GET /api/search` - Global search across all entities

### Favorites
- `GET/POST /api/favorites` - List/toggle favorites
- `GET/POST /api/recently-viewed` - Recently viewed items

---

## Version

**Current Version**: 1.0.0
**Last Updated**: December 2024
