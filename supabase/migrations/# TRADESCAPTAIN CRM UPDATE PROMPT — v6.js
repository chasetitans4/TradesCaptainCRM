# TRADESCAPTAIN CRM UPDATE PROMPT — v6.0

**Version:** 6.0  
**Date:** January 2025  
**Type:** Major Update — Product Restructure, Commission Updates, Revenue Recovery Integration

---

## OVERVIEW

This prompt updates the TradesCaptain CRM to version 6.0, implementing:

1. **Product Restructure** — Remove bundles, consolidate Leads Captain into CRM
2. **Commission Calculation Updates** — New product matrix
3. **Admin Portal Updates** — Remove bundle management, add Revenue Recovery
4. **Client Portal Updates** — Revenue Recovery dashboard
5. **Database Schema Updates** — New attribution tracking

---

## PART 1: PRODUCT RESTRUCTURE

### 1.1 Products to REMOVE

Remove all references, pricing, Stripe IDs, and management interfaces for:

```typescript
// REMOVE THESE PRODUCTS
const DISCONTINUED_PRODUCTS = [
  'leads-captain',        // Standalone AI SMS - Now in Blue Pro/Enterprise
  'silver-starter',       // Bundle
  'silver-pro',           // Bundle
  'silver-enterprise',    // Bundle
  'gold-starter',         // Bundle
  'gold-pro',             // Bundle
  'gold-enterprise',      // Bundle
];
```

### 1.2 Products to KEEP

```typescript
// ACTIVE PRODUCTS v6.0
const PRODUCTS = {
  // Blue CRM
  'blue-starter': { price: 49, annual: 500 },
  'blue-pro': { price: 99, annual: 1010, includesAiSms: true, smsLimit: 1000 },
  'blue-enterprise': { price: 199, annual: 2030, includesAiSms: true, smsLimit: 1500 },
  
  // Web
  'web-starter': { price: 199, annual: 2030 },
  'web-pro': { price: 299, annual: 3050 },
  'web-enterprise': { price: 499, annual: 5090 },
  
  // SEO/AEO
  'seo-aeo-starter': { price: 99, annual: 1010 },
  'seo-aeo-pro': { price: 199, annual: 2030 },
  'seo-aeo-enterprise': { price: 299, annual: 3050 },
  
  // Add-ons
  'extra-user': { price: 10, annual: null },
};
```

### 1.3 Database Migration

```sql
-- Mark discontinued products as inactive
UPDATE products 
SET status = 'discontinued', updated_at = NOW()
WHERE slug IN (
  'leads-captain',
  'silver-starter', 'silver-pro', 'silver-enterprise',
  'gold-starter', 'gold-pro', 'gold-enterprise'
);

-- Rename Local SEO to SEO/AEO
UPDATE products 
SET 
  name = REPLACE(name, 'Local SEO', 'SEO/AEO'),
  slug = REPLACE(slug, 'local-seo', 'seo-aeo'),
  updated_at = NOW()
WHERE slug LIKE 'local-seo%';

-- Update Blue Pro/Enterprise to include AI SMS
UPDATE products 
SET 
  features = jsonb_set(features, '{ai_sms_included}', 'true'),
  features = jsonb_set(features, '{sms_limit}', '1000'),
  updated_at = NOW()
WHERE slug = 'blue-pro';

UPDATE products 
SET 
  features = jsonb_set(features, '{ai_sms_included}', 'true'),
  features = jsonb_set(features, '{sms_limit}', '1500'),
  updated_at = NOW()
WHERE slug = 'blue-enterprise';
```

---

## PART 2: COMMISSION CALCULATION UPDATES

### 2.1 Commission Rates (Unchanged)

```typescript
const COMMISSION_RATES = {
  upfront: 0.50,           // 50% after 2nd payment
  recurring_m3_m5: 0.10,   // 10% months 3-5
  recurring_m6_plus: 0.15, // 15% month 6+ (locked)
  annual: 0.35,            // 35% one-time for annual
};
```

### 2.2 Updated Commission Matrix

```typescript
// Commission examples by product
const COMMISSION_MATRIX = {
  // Blue CRM
  'blue-starter': { upfront: 24.50, m35: 4.90, m6: 7.35 },
  'blue-pro': { upfront: 49.50, m35: 9.90, m6: 14.85 },
  'blue-enterprise': { upfront: 99.50, m35: 19.90, m6: 29.85 },
  
  // Web
  'web-starter': { upfront: 99.50, m35: 19.90, m6: 29.85 },
  'web-pro': { upfront: 149.50, m35: 29.90, m6: 44.85 },
  'web-enterprise': { upfront: 249.50, m35: 49.90, m6: 74.85 },
  
  // SEO/AEO
  'seo-aeo-starter': { upfront: 49.50, m35: 9.90, m6: 14.85 },
  'seo-aeo-pro': { upfront: 99.50, m35: 19.90, m6: 29.85 },
  'seo-aeo-enterprise': { upfront: 149.50, m35: 29.90, m6: 44.85 },
  
  // Add-ons
  'extra-user': { upfront: 5.00, m35: 1.00, m6: 1.50 },
};

// Annual commissions (35%)
const ANNUAL_COMMISSION = {
  'blue-starter': 175,
  'blue-pro': 354,
  'blue-enterprise': 711,
  'web-starter': 711,
  'web-pro': 1068,
  'web-enterprise': 1782,
  'seo-aeo-starter': 354,
  'seo-aeo-pro': 711,
  'seo-aeo-enterprise': 1068,
};
```

### 2.3 Commission Calculation Function

```typescript
function calculateCommission(
  subscription: Subscription,
  paymentDate: Date
): CommissionAmount {
  const product = PRODUCTS[subscription.productSlug];
  const monthsActive = getMonthsActive(subscription.startDate, paymentDate);
  
  // Annual subscription
  if (subscription.billingCycle === 'annual') {
    return {
      amount: product.annual * COMMISSION_RATES.annual,
      type: 'annual',
      payAfter: '2nd_payment',
    };
  }
  
  // Monthly subscription
  if (monthsActive === 2) {
    // Upfront commission after 2nd payment
    return {
      amount: product.price * COMMISSION_RATES.upfront,
      type: 'upfront',
      payOn: getNextPayDate(paymentDate),
    };
  } else if (monthsActive >= 3 && monthsActive <= 5) {
    return {
      amount: product.price * COMMISSION_RATES.recurring_m3_m5,
      type: 'recurring',
      payOn: getNextPayDate(paymentDate),
    };
  } else if (monthsActive >= 6) {
    return {
      amount: product.price * COMMISSION_RATES.recurring_m6_plus,
      type: 'recurring_locked',
      payOn: getNextPayDate(paymentDate),
    };
  }
  
  return { amount: 0, type: 'pending' };
}

// Payment schedule: 1st and 15th of each month
function getNextPayDate(referenceDate: Date): Date {
  const day = referenceDate.getDate();
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();
  
  if (day < 15) {
    return new Date(year, month, 15);
  } else {
    // Next month 1st
    return new Date(year, month + 1, 1);
  }
}

// Same-day rule: Never pay commission on same day as client payment
function applySameDayRule(
  commissionDate: Date,
  clientPaymentDate: Date
): Date {
  if (isSameDay(commissionDate, clientPaymentDate)) {
    return getNextPayDate(commissionDate);
  }
  return commissionDate;
}
```

---

## PART 3: ADMIN PORTAL UPDATES

### 3.1 Remove Bundle Management

```typescript
// REMOVE these admin sections/routes
const REMOVED_ADMIN_SECTIONS = [
  '/admin/products/bundles',
  '/admin/products/silver',
  '/admin/products/gold',
  '/admin/products/leads-captain',
];

// REMOVE these components
// - BundleManagement.tsx
// - SilverBundleCard.tsx
// - GoldBundleCard.tsx
// - LeadsCaptainStandalone.tsx
```

### 3.2 Update Product Management

```typescript
// New product categories for admin
const ADMIN_PRODUCT_CATEGORIES = [
  {
    name: 'Blue CRM',
    products: ['blue-starter', 'blue-pro', 'blue-enterprise'],
    addons: ['extra-user'],
  },
  {
    name: 'Web',
    products: ['web-starter', 'web-pro', 'web-enterprise'],
  },
  {
    name: 'SEO/AEO',
    products: ['seo-aeo-starter', 'seo-aeo-pro', 'seo-aeo-enterprise'],
  },
];
```

### 3.3 Add Revenue Recovery Admin Panel

```tsx
// New admin component: RevenueRecoveryOverview.tsx
interface RevenueRecoveryOverviewProps {
  dateRange: DateRange;
}

const RevenueRecoveryOverview: React.FC<RevenueRecoveryOverviewProps> = ({ dateRange }) => {
  const { data: stats } = useQuery(['revenue-recovery-stats', dateRange], 
    () => fetchRevenueRecoveryStats(dateRange)
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Revenue Recovery</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <StatCard 
            label="Total Influenced (All Clients)"
            value={formatCurrency(stats?.totalInfluenced)}
          />
          <StatCard 
            label="Active Recovery Mode"
            value={`${stats?.activeClients} / ${stats?.totalClients}`}
          />
          <StatCard 
            label="Avg Recovery Rate"
            value={`${stats?.avgRecoveryRate}%`}
          />
          <StatCard 
            label="Avg Response Latency"
            value={`< ${stats?.avgLatency} sec`}
          />
        </div>
        
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Influenced</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats?.clients.map(client => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>{formatCurrency(client.influenced)}</TableCell>
                <TableCell>
                  <Badge variant={client.recoveryEnabled ? 'success' : 'secondary'}>
                    {client.recoveryEnabled ? 'Active' : 'Paused'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

### 3.4 Per-Client Recovery Controls

```tsx
// Add to client detail admin view
const ClientRecoveryControls: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { data: settings, mutate } = useClientRecoverySettings(clientId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Recovery Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Recovery Mode</Label>
          <Select 
            value={settings?.recoveryMode}
            onValueChange={(v) => mutate({ recoveryMode: v })}
          >
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="locked">Locked (Client Cannot Change)</SelectItem>
          </Select>
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Client Can Disable</Label>
          <Switch 
            checked={settings?.clientCanDisable}
            onCheckedChange={(v) => mutate({ clientCanDisable: v })}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Attribution Window</Label>
          <Select 
            value={settings?.attributionWindow}
            onValueChange={(v) => mutate({ attributionWindow: v })}
          >
            <SelectItem value="24">24 hours</SelectItem>
            <SelectItem value="48">48 hours</SelectItem>
            <SelectItem value="72">72 hours</SelectItem>
            <SelectItem value="168">7 days</SelectItem>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## PART 4: CLIENT PORTAL UPDATES

### 4.1 Add Revenue Recovery Dashboard

Create new Home (Revenue) page as default landing:

```tsx
// app/(client)/home/page.tsx
export default function RevenueDashboard() {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Revenue Recovery</h1>
      
      <RevenueInfluencedCard />
      
      <div className="grid md:grid-cols-2 gap-6">
        <SystemCoverageStatus />
        <RecoveryOpportunities />
      </div>
      
      <RecentActivityFeed />
      
      <QuickSettings />
    </div>
  );
}
```

### 4.2 Revenue Influenced Card

```tsx
const RevenueInfluencedCard: React.FC = () => {
  const { data } = useRevenueInfluenced();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue Influenced</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-blue-600">
          {formatCurrency(data?.amount)}
        </div>
        <p className="text-muted-foreground mt-2">
          Influenced by missed call recovery, automated follow-ups, 
          and after-hours handling.
        </p>
      </CardContent>
    </Card>
  );
};
```

### 4.3 System Coverage Status

```tsx
const SystemCoverageStatus: React.FC = () => {
  const { data } = useSystemStatus();
  
  const features = [
    { name: 'Missed Calls', key: 'missedCalls' },
    { name: 'After-Hours', key: 'afterHours' },
    { name: 'Follow-Ups', key: 'followUps' },
    { name: 'Booking', key: 'booking' },
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {features.map(feature => (
            <div key={feature.key} className="flex items-center justify-between">
              <span>{feature.name}</span>
              <div className="flex items-center gap-2">
                {data?.[feature.key]?.active ? (
                  <Badge variant="success" className="gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Active
                  </Badge>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="gap-1">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          Paused
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {data?.[feature.key]?.reason}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4.4 Recovery Opportunities

```tsx
const RecoveryOpportunities: React.FC = () => {
  const { data: opportunities } = useRecoveryOpportunities();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery Opportunities</CardTitle>
        <CardDescription>
          {opportunities?.length || 0} pending • ~{formatCurrency(opportunities?.totalPotential)} potential
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {opportunities?.slice(0, 5).map(opp => (
            <div key={opp.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium">{opp.title}</div>
                <div className="text-sm text-muted-foreground">{opp.status}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">~{formatCurrency(opp.potential)}</div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={opp.link}>View</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4.5 Activity Feed

```tsx
const RecentActivityFeed: React.FC = () => {
  const { data: activities } = useRecentActivity();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities?.map(activity => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn(
                "mt-1 w-2 h-2 rounded-full",
                activity.completed ? "bg-green-500" : "bg-blue-500"
              )} />
              <div className="flex-1">
                <div className="text-sm">{activity.description}</div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4.6 Recovery Mode Toggle

```tsx
const RecoveryModeToggle: React.FC = () => {
  const { data: settings, mutate } = useClientSettings();
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleToggle = (enabled: boolean) => {
    if (!enabled) {
      setShowConfirm(true);
    } else {
      mutate({ recoveryMode: true });
    }
  };
  
  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <div className="font-medium">Revenue Recovery Mode</div>
          <div className="text-sm text-muted-foreground">
            System automatically handles missed calls, follow-ups, and after-hours inquiries.
          </div>
        </div>
        <Switch 
          checked={settings?.recoveryMode}
          onCheckedChange={handleToggle}
          disabled={settings?.recoveryModeLocked}
        />
      </div>
      
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Revenue Recovery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop automatic handling of:
              <ul className="list-disc ml-6 mt-2">
                <li>Missed call text-backs</li>
                <li>After-hours inquiries</li>
                <li>Estimate follow-ups</li>
                <li>No-show rescheduling</li>
              </ul>
              <p className="mt-4 font-medium">
                Based on your recent activity, an estimated $850/week may go unbooked.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              variant="destructive"
              onClick={() => mutate({ recoveryMode: false })}
            >
              Disable Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
```

---

## PART 5: DATABASE SCHEMA UPDATES

### 5.1 Revenue Attribution Table

```sql
-- Revenue attribution tracking
CREATE TABLE IF NOT EXISTS revenue_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  
  -- Trigger (what started the recovery attempt)
  trigger_type VARCHAR(50) NOT NULL,
  trigger_id UUID NOT NULL,
  trigger_at TIMESTAMPTZ NOT NULL,
  
  -- Action (what the system did)
  action_type VARCHAR(50) NOT NULL,
  action_id UUID,
  action_at TIMESTAMPTZ NOT NULL,
  
  -- Outcome (what resulted)
  outcome_type VARCHAR(50),
  outcome_id UUID,
  outcome_at TIMESTAMPTZ,
  
  -- Attribution
  revenue_amount_cents INTEGER DEFAULT 0,
  confidence VARCHAR(20) DEFAULT 'medium',
  window_hours INTEGER DEFAULT 72,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_trigger_type CHECK (
    trigger_type IN ('missed_call', 'estimate_followup', 'no_show', 'after_hours')
  ),
  CONSTRAINT valid_confidence CHECK (
    confidence IN ('high', 'medium', 'low')
  )
);

CREATE INDEX idx_attributions_org_date ON revenue_attributions(organization_id, trigger_at);
CREATE INDEX idx_attributions_outcome ON revenue_attributions(outcome_type, outcome_id);
```

### 5.2 Client Recovery Settings

```sql
-- Client recovery settings
CREATE TABLE IF NOT EXISTS client_recovery_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  recovery_enabled BOOLEAN DEFAULT true,
  recovery_locked BOOLEAN DEFAULT false,
  attribution_window_hours INTEGER DEFAULT 72,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Attribution Summary View

```sql
CREATE OR REPLACE VIEW revenue_attribution_summary AS
SELECT 
  organization_id,
  DATE_TRUNC('month', trigger_at) as month,
  COUNT(*) as total_attempts,
  COUNT(outcome_id) as successful_recoveries,
  SUM(
    CASE 
      WHEN confidence = 'high' THEN revenue_amount_cents 
      ELSE revenue_amount_cents * 0.7 
    END
  ) as influenced_revenue_cents,
  ROUND(
    COUNT(outcome_id)::numeric / NULLIF(COUNT(*), 0) * 100, 
    1
  ) as recovery_rate
FROM revenue_attributions
GROUP BY organization_id, DATE_TRUNC('month', trigger_at);
```

---

## PART 6: NAVIGATION UPDATES

### 6.1 Client Navigation

```typescript
// Update client navigation
const CLIENT_NAV_ITEMS = [
  { name: 'Home', href: '/home', icon: HomeIcon },        // NEW - Revenue Dashboard
  { name: 'Leads', href: '/leads', icon: UsersIcon },
  { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
  { name: 'Customers', href: '/customers', icon: UserIcon },
  { name: 'Messages', href: '/messages', icon: MessageIcon },
  { name: 'Inventory', href: '/inventory', icon: BoxIcon },
  { name: 'Estimates', href: '/estimates', icon: FileTextIcon },
  { name: 'Invoices', href: '/invoices', icon: ReceiptIcon },
  { name: 'Reports', href: '/reports', icon: ChartIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

// Set Home as default
export const DEFAULT_CLIENT_ROUTE = '/home';
```

### 6.2 Admin Navigation

```typescript
// Update admin navigation - remove bundle sections
const ADMIN_NAV_ITEMS = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Clients', href: '/admin/clients', icon: UsersIcon },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
  { name: 'Commissions', href: '/admin/commissions', icon: DollarIcon },
  { name: 'Revenue Recovery', href: '/admin/revenue-recovery', icon: TrendingUpIcon }, // NEW
  { name: 'Products', href: '/admin/products', icon: PackageIcon },
  { name: 'Agents', href: '/admin/agents', icon: UserPlusIcon },
  { name: 'Reports', href: '/admin/reports', icon: ChartIcon },
  { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
];
```

---

## PART 7: API UPDATES

### 7.1 Remove Bundle Endpoints

```typescript
// REMOVE these API routes
const REMOVED_ENDPOINTS = [
  'POST /api/subscriptions/bundle',
  'GET /api/products/bundles',
  'GET /api/products/silver/*',
  'GET /api/products/gold/*',
  'GET /api/products/leads-captain',
];
```

### 7.2 Add Revenue Recovery Endpoints

```typescript
// NEW API routes
const NEW_ENDPOINTS = [
  // Client-facing
  'GET /api/revenue-recovery/summary',
  'GET /api/revenue-recovery/opportunities',
  'GET /api/revenue-recovery/activity',
  'GET /api/revenue-recovery/settings',
  'PATCH /api/revenue-recovery/settings',
  
  // Admin
  'GET /api/admin/revenue-recovery/overview',
  'GET /api/admin/revenue-recovery/clients',
  'GET /api/admin/revenue-recovery/clients/:id/settings',
  'PATCH /api/admin/revenue-recovery/clients/:id/settings',
];
```

### 7.3 Example API Implementations

```typescript
// GET /api/revenue-recovery/summary
export async function GET(req: Request) {
  const { organizationId } = await getSession(req);
  const { period } = parseSearchParams(req);
  
  const dateRange = getDateRange(period); // 'week' | 'month' | 'quarter'
  
  const summary = await db
    .from('revenue_attribution_summary')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('month', dateRange.start)
    .lte('month', dateRange.end)
    .single();
  
  return Response.json({
    amount: summary?.influenced_revenue_cents / 100 || 0,
    attempts: summary?.total_attempts || 0,
    recoveries: summary?.successful_recoveries || 0,
    rate: summary?.recovery_rate || 0,
  });
}

// GET /api/revenue-recovery/opportunities
export async function GET(req: Request) {
  const { organizationId } = await getSession(req);
  
  const opportunities = await db
    .from('revenue_attributions')
    .select(`
      id,
      trigger_type,
      trigger_at,
      action_type,
      action_at,
      outcome_type,
      revenue_amount_cents,
      confidence
    `)
    .eq('organization_id', organizationId)
    .is('outcome_id', null) // Not yet converted
    .order('trigger_at', { ascending: false })
    .limit(10);
  
  return Response.json(
    opportunities.map(opp => ({
      id: opp.id,
      title: formatTriggerType(opp.trigger_type),
      status: formatActionStatus(opp.action_type, opp.action_at),
      potential: opp.revenue_amount_cents / 100,
      link: getOpportunityLink(opp),
    }))
  );
}
```

---

## PART 8: ENV UPDATES

### 8.1 Remove Stripe Price IDs

```env
# REMOVE these Stripe IDs
# STRIPE_LEADS_CAPTAIN_PRICE_ID=...
# STRIPE_SILVER_STARTER_PRICE_ID=...
# STRIPE_SILVER_PRO_PRICE_ID=...
# STRIPE_SILVER_ENTERPRISE_PRICE_ID=...
# STRIPE_GOLD_STARTER_PRICE_ID=...
# STRIPE_GOLD_PRO_PRICE_ID=...
# STRIPE_GOLD_ENTERPRISE_PRICE_ID=...
```

### 8.2 Rename SEO Price IDs

```env
# RENAME Local SEO to SEO/AEO
STRIPE_SEO_AEO_STARTER_PRICE_ID=price_xxx  # was STRIPE_LOCAL_SEO_STARTER_PRICE_ID
STRIPE_SEO_AEO_PRO_PRICE_ID=price_xxx      # was STRIPE_LOCAL_SEO_PRO_PRICE_ID
STRIPE_SEO_AEO_ENTERPRISE_PRICE_ID=price_xxx # was STRIPE_LOCAL_SEO_ENTERPRISE_PRICE_ID
```

---

## PART 9: TESTING CHECKLIST

### Pre-Deployment

- [ ] All bundle references removed from UI
- [ ] All bundle routes return 404 or redirect
- [ ] Product list only shows active products
- [ ] Commission calculator uses v6.0 matrix
- [ ] SEO/AEO rename complete everywhere
- [ ] Blue Pro/Enterprise show AI SMS included
- [ ] Revenue Recovery dashboard renders
- [ ] Attribution tracking creates records
- [ ] Admin can view/edit client recovery settings

### Post-Deployment

- [ ] Existing clients unaffected
- [ ] New subscriptions create correctly
- [ ] Commission calculations accurate
- [ ] Revenue Recovery populates data
- [ ] No 500 errors in logs
- [ ] Stripe webhooks functioning

---

## PART 10: MIGRATION PLAN

### Phase 1: Database Updates
1. Run product status migration
2. Create attribution tables
3. Create recovery settings table
4. Create summary views

### Phase 2: Backend Updates
1. Update product constants
2. Update commission calculations
3. Add recovery API endpoints
4. Remove bundle endpoints

### Phase 3: Frontend Updates
1. Update admin product management
2. Add admin recovery panel
3. Update client navigation
4. Add client recovery dashboard

### Phase 4: Cleanup
1. Remove bundle components
2. Remove bundle routes
3. Update env variables
4. Archive old Stripe products

---

**Document Version:** 6.0  
**Created:** January 2025

---

**End of CRM Update Prompt**