
-- RPC to increment SaaS offer usage
DROP FUNCTION IF EXISTS increment_saas_offer_usage(text);
CREATE OR REPLACE FUNCTION increment_saas_offer_usage(p_offer_code text)
RETURNS void AS $$
BEGIN
  INSERT INTO saas_offer_stats (offer_code, use_count, last_used_at)
  VALUES (p_offer_code, 1, NOW())
  ON CONFLICT (offer_code)
  DO UPDATE SET
    use_count = saas_offer_stats.use_count + 1,
    last_used_at = NOW();
END;
$$ LANGUAGE plpgsql;
