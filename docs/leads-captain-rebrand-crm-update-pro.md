# LEADS CAPTAIN REBRAND — CRM UPDATE PROMPT

**Task:** Rebrand "NeverMiss" to "Leads Captain" across the entire TradesCaptain CRM platform
**Priority:** HIGH — LEGAL REQUIREMENT
**Type:** Full platform rebrand

---

## ⚠️ LEGAL WARNING

**THE TERM "NEVERMISS" CANNOT BE USED ANYWHERE IN THE PRODUCT.**

This is a legal requirement, not a preference. All references to "NeverMiss" must be completely removed from:
- User interface (all visible text)
- Marketing materials
- Documentation
- Email templates
- SMS templates
- Any customer-facing content

Database table names and internal code variables are lower priority but should also be updated when feasible.

---

## OVERVIEW

The AI missed call text-back product formerly known as "NeverMiss" is being rebranded to "Leads Captain". This prompt provides instructions for updating all references across the CRM platform, including UI, database, API, and code.

---

## SCOPE OF CHANGES

### 1. UI/DISPLAY CHANGES (User-Facing)

Update all user-facing text from "NeverMiss" to "Leads Captain":

**Navigation & Menus:**
- Sidebar: "📱 NeverMiss" → "📱 Leads Captain"
- Menu items: "NeverMiss Dashboard" → "Leads Captain Dashboard"
- Settings sections: "NeverMiss Settings" → "Leads Captain Settings"
- Tab labels: "NeverMiss" → "Leads Captain"

**Page Titles & Headers:**
- Dashboard: "NeverMiss Dashboard" → "Leads Captain Dashboard"
- Conversations: "NeverMiss Conversations" → "Leads Captain Conversations"
- Rules: "NeverMiss Rules" → "Leads Captain Rules"
- Templates: "NeverMiss Templates" → "Leads Captain Templates"
- Settings: "NeverMiss Settings" → "Leads Captain Settings"
- Analytics: "NeverMiss Analytics" → "Leads Captain Analytics"

**Labels & Descriptions:**
- Any tooltip mentioning "NeverMiss"
- Help text referencing "NeverMiss"
- Feature descriptions
- Empty state messages
- Error messages
- Success messages
- Onboarding copy

**Plan Names & Pricing:**
- "NeverMiss" standalone plan → "Leads Captain" standalone plan
- Bundle descriptions: "Includes NeverMiss" → "Includes Leads Captain"
- Plan comparison tables
- Upgrade prompts

**CRM Integration References:**
- Contact view tab: "NeverMiss" → "Leads Captain"
- Dashboard widget title
- Activity feed labels: "NeverMiss conversation" → "Leads Captain conversation"
- Lead source: "NeverMiss" → "Leads Captain"

---

### 2. DATABASE CHANGES

**Option A: Rename Tables (Recommended for new/small deployments)**

Rename all `leadscaptain_*` tables to `leads_captain_*`:

```sql
-- Rename tables
ALTER TABLE leadscaptain_config RENAME TO leads_captain_config;
ALTER TABLE leadscaptain_intents RENAME TO leads_captain_intents;
ALTER TABLE leadscaptain_templates RENAME TO leads_captain_templates;
ALTER TABLE leadscaptain_rules RENAME TO leads_captain_rules;
ALTER TABLE leadscaptain_price_list RENAME TO leads_captain_price_list;
ALTER TABLE leadscaptain_notifications RENAME TO leads_captain_notifications;
ALTER TABLE leadscaptain_conversations RENAME TO leads_captain_conversations;
ALTER TABLE leadscaptain_messages RENAME TO leads_captain_messages;
ALTER TABLE leadscaptain_training RENAME TO leads_captain_training;
ALTER TABLE leadscaptain_audit_log RENAME TO leads_captain_audit_log;

-- Update any foreign key constraints
-- Update any indexes (they may auto-rename with table)
-- Update any triggers
-- Update any views
```

**Option B: Keep Table Names, Update Display Only (Recommended for production)**

Keep database tables as `leadscaptain_*` internally but update all UI/API display names. This avoids:
- Migration complexity
- Downtime risk
- Foreign key issues
- Index rebuilding

If choosing Option B, add a comment in the schema:
```sql
-- NOTE: Tables use 'leadscaptain_' prefix for legacy reasons
-- Product is branded as "Leads Captain" in UI
```

**Enum/Type Updates:**

If you have any enums or types referencing "leadscaptain":
```sql
-- Example: Update enum values if needed
-- ALTER TYPE lead_source RENAME VALUE 'leadscaptain' TO 'leads_captain';
```

**Data Updates:**

Update any stored string values:
```sql
-- Update lead source values
UPDATE leads SET source = 'Leads Captain' WHERE source = 'NeverMiss';

-- Update activity logs
UPDATE activity_log SET description = REPLACE(description, 'NeverMiss', 'Leads Captain');

-- Update any JSON fields containing the name
UPDATE settings SET config = REPLACE(config::text, 'NeverMiss', 'Leads Captain')::jsonb 
WHERE config::text LIKE '%NeverMiss%';
```

---

### 3. API CHANGES

**Option A: Rename Endpoints (Breaking change)**

```
OLD                              NEW
/api/leadscaptain/config           → /api/leads-captain/config
/api/leadscaptain/conversations    → /api/leads-captain/conversations
/api/leadscaptain/messages         → /api/leads-captain/messages
/api/leadscaptain/rules            → /api/leads-captain/rules
/api/leadscaptain/templates        → /api/leads-captain/templates
/api/leadscaptain/analytics        → /api/leads-captain/analytics
/api/leadscaptain/webhooks/*       → /api/leads-captain/webhooks/*
```

**Option B: Keep Endpoints, Add Aliases (Non-breaking)**

Keep old endpoints working, add new aliases:
```typescript
// routes.ts
// Keep old routes for backwards compatibility
router.use('/api/leadscaptain', leadscaptainRouter);
// Add new branded routes (same handlers)
router.use('/api/leads-captain', leadscaptainRouter);
```

**Response Body Updates:**

Update any response fields that expose the product name:
```typescript
// Before
{ product: "NeverMiss", ... }

// After
{ product: "Leads Captain", ... }
```

---

### 4. CODE CHANGES

**File Renames (Optional):**

```
leadscaptain.ts              → leads-captain.ts
leadscaptain.service.ts      → leads-captain.service.ts
leadscaptain.controller.ts   → leads-captain.controller.ts
leadscaptain.types.ts        → leads-captain.types.ts
LeadsCaptainConfig.tsx       → LeadsCaptainConfig.tsx
NevermissDashboard.tsx    → LeadsCaptainDashboard.tsx
NevermissConversations.tsx → LeadsCaptainConversations.tsx
```

**Variable/Function Renames:**

```typescript
// Before
const leadscaptainConfig = ...
function getNevermissConversations() { ... }
interface NevermissMessage { ... }
type NevermissIntent = ...

// After
const leadsCaptainConfig = ...
function getLeadsCaptainConversations() { ... }
interface LeadsCaptainMessage { ... }
type LeadsCaptainIntent = ...
```

**Import Updates:**

```typescript
// Before
import { NevermissService } from './leadscaptain.service';

// After
import { LeadsCaptainService } from './leads-captain.service';
```

**String Constants:**

Create/update a constants file:
```typescript
// constants.ts
export const PRODUCT_NAMES = {
  LEADS_CAPTAIN: 'Leads Captain',
  // Legacy reference for migrations
  LEADS CAPTAIN_LEGACY: 'NeverMiss',
};
```

---

### 5. CONFIGURATION UPDATES

**Environment Variables:**

```env
# Before
LEADS CAPTAIN_ENABLED=true
LEADS CAPTAIN_DEFAULT_TEMPLATE=...

# After
LEADS_CAPTAIN_ENABLED=true
LEADS_CAPTAIN_DEFAULT_TEMPLATE=...
```

**Feature Flags:**

```typescript
// Before
if (features.leadscaptainEnabled) { ... }

// After
if (features.leadsCaptainEnabled) { ... }
```

---

### 6. INTEGRATION UPDATES

**Twilio Webhooks:**

If webhook URLs contain "leadscaptain", update in Twilio console:
```
OLD: https://api.tradescaptain.com/webhooks/leadscaptain/incoming
NEW: https://api.tradescaptain.com/webhooks/leads-captain/incoming
```

**CRM Integration Points:**

Update any internal references:
```typescript
// Lead source tracking
lead.source = 'Leads Captain'; // was 'NeverMiss'

// Activity logging
logActivity({
  type: 'leads_captain_conversation', // was 'leadscaptain_conversation'
  description: 'New Leads Captain conversation started'
});

// Dashboard widget
<LeadsCaptainWidget /> // was <NevermissWidget />
```

---

### 7. DOCUMENTATION UPDATES

Update all internal documentation:
- README files
- API documentation
- Code comments
- JSDoc/TSDoc
- Swagger/OpenAPI specs
- Database schema documentation

---

## IMPLEMENTATION CHECKLIST

### Phase 1: UI Updates (No Breaking Changes)
- [ ] Update all display text in UI components
- [ ] Update navigation labels
- [ ] Update page titles and headers
- [ ] Update help text and tooltips
- [ ] Update error/success messages
- [ ] Update plan names in pricing displays
- [ ] Update email templates
- [ ] Update SMS templates (default messages)

### Phase 2: Code Refactoring (Internal)
- [ ] Rename files (optional)
- [ ] Rename variables and functions
- [ ] Update imports
- [ ] Update constants
- [ ] Add code comments for legacy references

### Phase 3: Database (If Doing Full Migration)
- [ ] Create migration script
- [ ] Test migration on staging
- [ ] Schedule maintenance window
- [ ] Run migration
- [ ] Verify data integrity
- [ ] Update foreign keys and constraints

### Phase 4: API Updates (If Doing Full Migration)
- [ ] Add new route aliases
- [ ] Update response bodies
- [ ] Update API documentation
- [ ] Notify any API consumers
- [ ] Deprecate old endpoints (with timeline)

### Phase 5: External Services
- [ ] Update Twilio webhook URLs
- [ ] Update any third-party integrations
- [ ] Update monitoring/alerting labels

### Phase 6: Testing
- [ ] UI regression testing
- [ ] API endpoint testing
- [ ] Database query testing
- [ ] Integration testing
- [ ] End-to-end testing

### Phase 7: Deployment
- [ ] Deploy to staging
- [ ] QA verification
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Update status page if needed

---

## RECOMMENDED APPROACH

For **production systems with active users**, I recommend:

1. **UI-Only Changes First**
   - Update all display text to "Leads Captain"
   - Keep database tables as `leadscaptain_*`
   - Keep API endpoints as `/api/leadscaptain/*`
   - Add aliases for new branded endpoints
   - Zero downtime, no data migration needed

2. **Code Refactoring Later** (Optional)
   - Rename files and variables in a future sprint
   - Do this as part of normal code maintenance
   - No user impact

3. **Database Migration Never** (Unless Starting Fresh)
   - Table names are internal implementation details
   - Users never see them
   - Migration risk outweighs benefit

---

## FIND AND REPLACE COMMANDS

For quick updates, use these search/replace patterns:

**Case-Sensitive Replacements:**
```
NeverMiss → Leads Captain
Nevermiss → Leads Captain (or LeadsCaptain for code)
LEADS CAPTAIN → LEADS_CAPTAIN
leadscaptain → leads_captain (for code only, not database)
```

**Regex for Code Files:**
```regex
# Match NeverMiss as word
\bNeverMiss\b → Leads Captain

# Match leadscaptain in camelCase
leadscaptain(?=[A-Z]) → leadsCaptain

# Match LEADS CAPTAIN in constants
\bLEADS CAPTAIN\b → LEADS_CAPTAIN
```

---

## ROLLBACK PLAN

If issues arise:

1. **UI Rollback:** Revert display text changes (simple string updates)
2. **API Rollback:** Remove new aliases, keep old endpoints
3. **Database Rollback:** Run reverse migration (if tables were renamed)

Keep old code/configs for 30 days before full cleanup.

---

## QUESTIONS TO ANSWER BEFORE STARTING

1. **Are there external API consumers?**
   - If yes, need deprecation timeline for old endpoints

2. **Is the database small enough for table renames?**
   - If >1M rows, consider keeping old table names

3. **Are there any hardcoded references in customer data?**
   - Check for stored "NeverMiss" strings in user content

4. **What's the acceptable downtime window?**
   - UI-only changes = zero downtime
   - Database migration = maintenance window needed

---

## VERIFICATION COMMANDS

After implementation, verify no old references remain:

```bash
# Search codebase for remaining references
grep -r "NeverMiss" --include="*.ts" --include="*.tsx" --include="*.js" src/
grep -r "leadscaptain" --include="*.ts" --include="*.tsx" --include="*.js" src/

# Search database for old values
SELECT * FROM leads WHERE source ILIKE '%leadscaptain%';
SELECT * FROM activity_log WHERE description ILIKE '%leadscaptain%';

# Check API responses
curl https://api.tradescaptain.com/api/leads-captain/config | grep -i leadscaptain
```

---

**Document Version:** 1.0
**Created:** December 2025
**Product:** TradesCaptain CRM
**Change:** NeverMiss → Leads Captain Rebrand