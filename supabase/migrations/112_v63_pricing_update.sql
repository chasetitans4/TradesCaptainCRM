-- =====================================================
-- v6.3 PRICING UPDATE
-- Migration: 112_v63_pricing_update.sql
-- Date: January 2025
-- Changes:
--   - Blue Starter: $49 → $39/mo
--   - Blue Pro: 3 users → 5 users
--   - Leads Captain: Now $49/mo add-on (not included in any plan)
--   - SMS limits: Starter+LC=1K, Pro+LC=2K, Enterprise+LC=3K
-- =====================================================

-- 1. Update plan_leads_captain_features: Leads Captain is now an ADD-ON
-- It's no longer "included" in any plan - must be purchased separately

-- Blue Starter: No LC included, 1000 SMS if addon purchased
UPDATE plan_leads_captain_features SET
  includes_leads_captain = false,
  sms_included = 1000
WHERE plan_type = 'blue_starter';

-- Blue Pro: No LC included, 2000 SMS if addon purchased
UPDATE plan_leads_captain_features SET
  includes_leads_captain = false,
  sms_included = 2000
WHERE plan_type = 'blue_pro';

-- Blue Enterprise: No LC included, 3000 SMS if addon purchased
UPDATE plan_leads_captain_features SET
  includes_leads_captain = false,
  sms_included = 3000
WHERE plan_type = 'blue_enterprise';

-- 2. Add has_leads_captain_addon column to businesses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'has_leads_captain_addon'
    ) THEN
        ALTER TABLE businesses ADD COLUMN has_leads_captain_addon BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Create addon_subscriptions table to track add-on purchases
CREATE TABLE IF NOT EXISTS addon_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    addon_type VARCHAR(50) NOT NULL, -- 'leads_captain', 'extra_user'
    stripe_subscription_item_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'canceled', 'past_due'
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, addon_type)
);

-- 4. Create index for addon lookups
CREATE INDEX IF NOT EXISTS idx_addon_subscriptions_business_id
ON addon_subscriptions(business_id);

CREATE INDEX IF NOT EXISTS idx_addon_subscriptions_status
ON addon_subscriptions(status) WHERE status = 'active';

-- 5. Enable RLS on addon_subscriptions
ALTER TABLE addon_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Business members can view their addons
DROP POLICY IF EXISTS "Business members can view their addons" ON addon_subscriptions;
CREATE POLICY "Business members can view their addons" ON addon_subscriptions
    FOR SELECT USING (
        business_id = (SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1)
    );

-- Policy: Service role can manage all addons
DROP POLICY IF EXISTS "Service role manages addons" ON addon_subscriptions;
CREATE POLICY "Service role manages addons" ON addon_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Create function to check if business has active LC addon
CREATE OR REPLACE FUNCTION has_active_leads_captain_addon(p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM addon_subscriptions
        WHERE business_id = p_business_id
        AND addon_type = 'leads_captain'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get SMS limit based on plan + addon
CREATE OR REPLACE FUNCTION get_sms_limit_for_business(p_business_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_plan_type VARCHAR(50);
    v_has_addon BOOLEAN;
    v_sms_limit INTEGER;
BEGIN
    -- Get business plan type
    SELECT plan_type INTO v_plan_type
    FROM businesses
    WHERE id = p_business_id;

    IF v_plan_type IS NULL THEN
        RETURN 0;
    END IF;

    -- Check if has active LC addon
    v_has_addon := has_active_leads_captain_addon(p_business_id);

    IF NOT v_has_addon THEN
        RETURN 0; -- No SMS without addon
    END IF;

    -- Get SMS limit from plan features
    SELECT sms_included INTO v_sms_limit
    FROM plan_leads_captain_features
    WHERE plan_type = v_plan_type;

    RETURN COALESCE(v_sms_limit, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Sync has_leads_captain_addon flag on businesses table
-- (In case there are any existing addon_subscriptions)
UPDATE businesses b
SET has_leads_captain_addon = EXISTS (
    SELECT 1 FROM addon_subscriptions a
    WHERE a.business_id = b.id
    AND a.addon_type = 'leads_captain'
    AND a.status = 'active'
);

-- 9. Create trigger to keep has_leads_captain_addon in sync
CREATE OR REPLACE FUNCTION sync_leads_captain_addon_flag()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.addon_type = 'leads_captain' THEN
            UPDATE businesses
            SET has_leads_captain_addon = (NEW.status = 'active')
            WHERE id = NEW.business_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.addon_type = 'leads_captain' THEN
            UPDATE businesses
            SET has_leads_captain_addon = false
            WHERE id = OLD.business_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_leads_captain_addon ON addon_subscriptions;
CREATE TRIGGER trg_sync_leads_captain_addon
AFTER INSERT OR UPDATE OR DELETE ON addon_subscriptions
FOR EACH ROW EXECUTE FUNCTION sync_leads_captain_addon_flag();

-- 10. Add comment for documentation
COMMENT ON TABLE addon_subscriptions IS 'v6.3: Tracks add-on purchases like Leads Captain ($49/mo)';
COMMENT ON COLUMN businesses.has_leads_captain_addon IS 'v6.3: Quick flag for Leads Captain addon status';
