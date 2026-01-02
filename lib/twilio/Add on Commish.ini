# Admin Portal Add-On: Sales Attribution

**Purpose:** This is an add-on feature to the existing Admin Portal. When an admin creates an invoice or subscription for a new customer, they must select who to credit the sale to.

---

## Feature Overview

When an admin sends an invoice to close a deal, prompt them with a dropdown to select:
1. **An Agent** — That agent receives full commission per existing rules
2. **Company** — No commission paid, 100% revenue credited to company

---

## UI: Attribution Dropdown

Add this field to all invoice/subscription creation forms:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  New Subscription                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Customer: Smith Plumbing                                                    │
│  Plan: Gold Pro ($349/mo)                                                    │
│  Billing: Monthly                                                            │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  CREDIT SALE TO *                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Select agent or company...                                          ▼ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Dropdown Options:                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🏢 Company (No Commission)                                             │ │
│  │ ─────────────────────────────────────────────────────────────────────  │ │
│  │ 👤 Mike Johnson (12 active leads)                                      │ │
│  │ 👤 Sarah Williams (8 active leads)                                     │ │
│  │ 👤 Jake Thompson (15 active leads)                                     │ │
│  │ 👤 Emily Davis (6 active leads)                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ⚠️ This selection determines commission payout. Cannot be changed after    │
│     invoice is sent.                                                         │
│                                                                              │
│                                        [Cancel]    [Send Invoice]            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Dropdown Requirements

- "Company (No Commission)" always appears first, separated by divider
- Agents listed alphabetically with their active lead count
- Only show active agents (not terminated/inactive)
- Field is required — cannot submit without selection

---

## UI: Company Selection Confirmation Modal

When admin selects "Company", show confirmation:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ Confirm Company Sale                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  You selected "Company" for this sale.                                       │
│                                                                              │
│  This means:                                                                 │
│  • No agent will receive commission                                          │
│  • 100% of revenue is credited to the company                               │
│  • This cannot be changed after the invoice is sent                         │
│                                                                              │
│  Are you sure?                                                               │
│                                                                              │
│                                   [Go Back]    [Confirm Company Sale]        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Attribution Rules

| Selection | Commission | Database Recording |
|-----------|------------|-------------------|
| **Company** | 0% — No commission generated | `agent_id = NULL`, `company_sale = TRUE` |
| **Agent** | Full commission per existing rules | `agent_id = [selected]`, `company_sale = FALSE` |

### When Attribution Applies

- ✓ Admin creates new subscription
- ✓ Admin sends invoice for new customer
- ✓ Admin upgrades customer to new plan
- ✓ Admin processes custom quote
- ✗ Customer self-serve signup (auto-attributed or unattributed)
- ✗ Renewals (original agent retained)

### Important Rules

1. Attribution selection is **permanent** — cannot be changed after invoice is sent
2. If agent is selected, treat it as if that agent made the sale themselves
3. If company is selected, no commission record is created (or create with `status = 'company_credited'` and `commission_amount = 0`)
4. Only users with `admin` or `super_admin` role see this dropdown

---

## Database Changes

### Add to `crm_accounts` table

```sql
ALTER TABLE crm_accounts ADD COLUMN company_sale BOOLEAN DEFAULT FALSE;
-- If TRUE, agent_id should be NULL and no commission is generated
```

### Add to `web_customers` table

```sql
ALTER TABLE web_customers ADD COLUMN company_sale BOOLEAN DEFAULT FALSE;
-- If TRUE, agent_id should be NULL and no commission is generated
```

### Add to `commissions` table

```sql
ALTER TABLE commissions ADD COLUMN company_sale BOOLEAN DEFAULT FALSE;
-- If TRUE, commission_amount = 0 and status = 'company_credited'
```

### New table: `sales_attribution_log`

```sql
CREATE TABLE sales_attribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was sold
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  
  -- Attribution
  attributed_to TEXT NOT NULL, -- 'company' or 'agent'
  agent_id UUID REFERENCES admin_users(id), -- NULL if company sale
  
  -- Who made the decision
  created_by UUID REFERENCES admin_users(id) NOT NULL,
  
  -- Context
  sale_amount DECIMAL(10,2),
  plan_type TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attribution_agent ON sales_attribution_log(agent_id);
CREATE INDEX idx_attribution_created_by ON sales_attribution_log(created_by);
```

---

## UI: Company vs Agent Sales Report

Add to management KPI dashboard:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Sales Attribution Report                                    This Month      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SUMMARY                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ Total Sales    │  │ Agent Sales    │  │ Company Sales  │                │
│  │ $24,500        │  │ $21,200 (87%)  │  │ $3,300 (13%)   │                │
│  │ 47 deals       │  │ 41 deals       │  │ 6 deals        │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                              │
│  COMPANY SALES (No Commission)                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Date       │ Customer           │ Plan          │ Amount  │ Created By ││
│  ├────────────────────────────────────────────────────────────────────────┤│
│  │ Dec 23     │ ABC Electric       │ Gold Pro      │ $349    │ Admin Mike ││
│  │ Dec 20     │ Metro HVAC         │ Blue Pro      │ $99     │ Admin Sarah││
│  │ Dec 18     │ City Plumbing      │ Gold Starter  │ $199    │ Admin Mike ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Create Subscription/Invoice

Update existing endpoint to require `attributed_to` field:

```typescript
// POST /api/admin/subscriptions
// POST /api/admin/invoices

interface CreateSubscriptionRequest {
  customer_id: string;
  plan_type: string;
  billing_interval: 'month' | 'year';
  
  // NEW: Required attribution field
  attributed_to: 'company' | string; // 'company' or agent UUID
}
```

### Get Agents for Dropdown

```typescript
// GET /api/admin/agents/for-attribution
// Returns list of active agents with lead counts

interface AgentOption {
  id: string;
  name: string;
  active_leads: number;
}

// Response
{
  agents: AgentOption[];
}
```

### Get Attribution Report

```typescript
// GET /api/admin/reports/attribution?period=this_month

interface AttributionReport {
  total_sales: number;
  total_deals: number;
  agent_sales: number;
  agent_deals: number;
  company_sales: number;
  company_deals: number;
  company_sales_list: {
    date: string;
    customer_name: string;
    plan_type: string;
    amount: number;
    created_by: string;
  }[];
}
```

---

## Commission Logic Update

When processing a new sale:

```typescript
async function processNewSale(sale: Sale, attributedTo: string) {
  if (attributedTo === 'company') {
    // No commission - company sale
    await db.crm_accounts.update({
      where: { id: sale.account_id },
      data: {
        agent_id: null,
        company_sale: true,
      }
    });
    
    // Log attribution
    await db.sales_attribution_log.create({
      data: {
        crm_account_id: sale.account_id,
        attributed_to: 'company',
        agent_id: null,
        created_by: currentUser.id,
        sale_amount: sale.amount,
        plan_type: sale.plan_type,
      }
    });
    
    // No commission record created
    return;
  }
  
  // Agent sale - process normally
  const agentId = attributedTo;
  
  await db.crm_accounts.update({
    where: { id: sale.account_id },
    data: {
      agent_id: agentId,
      company_sale: false,
    }
  });
  
  // Log attribution
  await db.sales_attribution_log.create({
    data: {
      crm_account_id: sale.account_id,
      attributed_to: 'agent',
      agent_id: agentId,
      created_by: currentUser.id,
      sale_amount: sale.amount,
      plan_type: sale.plan_type,
    }
  });
  
  // Create commission per existing rules
  await createCommission(sale, agentId);
}
```

---

## Permissions

| Role | Can See Dropdown | Can Select Company | Can View Report |
|------|------------------|-------------------|-----------------|
| Super Admin | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ |
| Agent | ✗ | ✗ | ✗ |
| Support | ✗ | ✗ | ✗ |
| Finance | ✗ | ✗ | ✓ (view only) |

---

## Summary

This feature allows admins to:
1. Credit sales to specific agents (who receive full commission)
2. Credit sales to "Company" (no commission paid)
3. Track and report on company vs agent sales
4. Maintain audit trail of all attribution decisions