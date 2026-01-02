-- =====================================================
-- OUTREACH MODULE CORE TABLES
-- Version: 5.8
-- Migration 013: Core tables for SMS consent, scheduling, calls
-- =====================================================

-- =====================================================
-- SMS CONSENT & COMPLIANCE
-- =====================================================

-- Consent tracking (TCPA compliance)
CREATE TABLE IF NOT EXISTS sms_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,

    consent_type VARCHAR(50) NOT NULL,        -- 'express_written', 'express', 'implied'
    consent_source VARCHAR(100) NOT NULL,     -- 'website_form', 'referral_submit', 'inbound_inquiry', 'sms_widget'

    consent_timestamp TIMESTAMPTZ NOT NULL,
    consent_ip VARCHAR(50),
    consent_user_agent TEXT,
    consent_form_url TEXT,
    consent_language TEXT,                    -- Exact text shown to user

    is_valid BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoke_method VARCHAR(50),                -- 'STOP_reply', 'manual', 'complaint'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_consent_phone ON sms_consent(phone);
CREATE INDEX idx_sms_consent_valid ON sms_consent(phone, is_valid) WHERE is_valid = true;

-- Global opt-out list
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,

    opted_out_at TIMESTAMPTZ NOT NULL,
    opt_out_method VARCHAR(50),               -- 'STOP_reply', 'manual_request', 'complaint'
    opt_out_keyword VARCHAR(20),              -- 'STOP', 'UNSUBSCRIBE', etc.
    original_campaign_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_opt_outs_phone ON sms_opt_outs(phone);

-- Internal suppression list (manual blocks)
CREATE TABLE IF NOT EXISTS suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    reason VARCHAR(50) NOT NULL,              -- 'complaint', 'legal', 'internal', 'competitor'
    source VARCHAR(50),
    added_by UUID REFERENCES admin_users(id),
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppression_list_phone ON suppression_list(phone);

-- DNC checking settings (Datazapp integration)
CREATE TABLE IF NOT EXISTS dnc_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key TEXT,
    check_federal BOOLEAN DEFAULT true,
    check_state BOOLEAN DEFAULT true,
    check_litigator BOOLEAN DEFAULT true,
    check_on_create BOOLEAN DEFAULT true,
    recheck_after_days INTEGER DEFAULT 90,
    cache_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DNC check results cache
CREATE TABLE IF NOT EXISTS dnc_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    contact_id UUID,                          -- Will reference outreach_contacts after that table is created
    dnc_status VARCHAR(30) NOT NULL,          -- 'clean', 'federal_dnc', 'state_dnc', 'litigator', 'error'
    safe_to_contact BOOLEAN NOT NULL,
    response_data JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_dnc_checks_phone ON dnc_checks(phone);
CREATE INDEX idx_dnc_checks_expires ON dnc_checks(expires_at);

-- =====================================================
-- AREA CODE TIMEZONE MAPPING
-- For detecting lead timezone from phone number
-- =====================================================

CREATE TABLE IF NOT EXISTS area_code_timezones (
    area_code VARCHAR(3) PRIMARY KEY,
    timezone VARCHAR(50) NOT NULL,
    state VARCHAR(2),
    region VARCHAR(100)
);

-- Seed US area codes with timezones
INSERT INTO area_code_timezones (area_code, timezone, state, region) VALUES
-- Eastern Time
('201', 'America/New_York', 'NJ', 'Northern New Jersey'),
('202', 'America/New_York', 'DC', 'Washington DC'),
('203', 'America/New_York', 'CT', 'Connecticut'),
('207', 'America/New_York', 'ME', 'Maine'),
('212', 'America/New_York', 'NY', 'New York City'),
('215', 'America/New_York', 'PA', 'Philadelphia'),
('216', 'America/New_York', 'OH', 'Cleveland'),
('224', 'America/Chicago', 'IL', 'Northern Illinois'),
('225', 'America/Chicago', 'LA', 'Baton Rouge'),
('229', 'America/New_York', 'GA', 'Southwest Georgia'),
('231', 'America/New_York', 'MI', 'Western Michigan'),
('234', 'America/New_York', 'OH', 'Northeast Ohio'),
('239', 'America/New_York', 'FL', 'Southwest Florida'),
('240', 'America/New_York', 'MD', 'Maryland'),
('248', 'America/New_York', 'MI', 'Southeast Michigan'),
('251', 'America/Chicago', 'AL', 'Mobile'),
('252', 'America/New_York', 'NC', 'Eastern North Carolina'),
('253', 'America/Los_Angeles', 'WA', 'Tacoma'),
('254', 'America/Chicago', 'TX', 'Central Texas'),
('256', 'America/Chicago', 'AL', 'Northern Alabama'),
('260', 'America/New_York', 'IN', 'Fort Wayne'),
('262', 'America/Chicago', 'WI', 'Southeast Wisconsin'),
('267', 'America/New_York', 'PA', 'Philadelphia'),
('269', 'America/New_York', 'MI', 'Southwest Michigan'),
('270', 'America/Chicago', 'KY', 'Western Kentucky'),
('272', 'America/New_York', 'PA', 'Scranton'),
('276', 'America/New_York', 'VA', 'Southwest Virginia'),
('281', 'America/Chicago', 'TX', 'Houston'),
('301', 'America/New_York', 'MD', 'Maryland'),
('302', 'America/New_York', 'DE', 'Delaware'),
('303', 'America/Denver', 'CO', 'Denver'),
('304', 'America/New_York', 'WV', 'West Virginia'),
('305', 'America/New_York', 'FL', 'Miami'),
('307', 'America/Denver', 'WY', 'Wyoming'),
('308', 'America/Chicago', 'NE', 'Western Nebraska'),
('309', 'America/Chicago', 'IL', 'Central Illinois'),
('310', 'America/Los_Angeles', 'CA', 'Los Angeles West'),
('312', 'America/Chicago', 'IL', 'Chicago'),
('313', 'America/New_York', 'MI', 'Detroit'),
('314', 'America/Chicago', 'MO', 'St. Louis'),
('315', 'America/New_York', 'NY', 'Central New York'),
('316', 'America/Chicago', 'KS', 'Wichita'),
('317', 'America/New_York', 'IN', 'Indianapolis'),
('318', 'America/Chicago', 'LA', 'Northern Louisiana'),
('319', 'America/Chicago', 'IA', 'Eastern Iowa'),
('320', 'America/Chicago', 'MN', 'Central Minnesota'),
('321', 'America/New_York', 'FL', 'Central Florida'),
('323', 'America/Los_Angeles', 'CA', 'Los Angeles'),
('325', 'America/Chicago', 'TX', 'Abilene'),
('330', 'America/New_York', 'OH', 'Northeast Ohio'),
('331', 'America/Chicago', 'IL', 'Western Chicago'),
('334', 'America/Chicago', 'AL', 'Montgomery'),
('336', 'America/New_York', 'NC', 'Greensboro'),
('337', 'America/Chicago', 'LA', 'Southwest Louisiana'),
('339', 'America/New_York', 'MA', 'Eastern Massachusetts'),
('346', 'America/Chicago', 'TX', 'Houston'),
('347', 'America/New_York', 'NY', 'New York City'),
('351', 'America/New_York', 'MA', 'Eastern Massachusetts'),
('352', 'America/New_York', 'FL', 'North Central Florida'),
('360', 'America/Los_Angeles', 'WA', 'Western Washington'),
('361', 'America/Chicago', 'TX', 'Corpus Christi'),
('364', 'America/New_York', 'KY', 'Kentucky'),
('385', 'America/Denver', 'UT', 'Utah'),
('386', 'America/New_York', 'FL', 'Northeast Florida'),
('401', 'America/New_York', 'RI', 'Rhode Island'),
('402', 'America/Chicago', 'NE', 'Eastern Nebraska'),
('404', 'America/New_York', 'GA', 'Atlanta'),
('405', 'America/Chicago', 'OK', 'Oklahoma City'),
('406', 'America/Denver', 'MT', 'Montana'),
('407', 'America/New_York', 'FL', 'Orlando'),
('408', 'America/Los_Angeles', 'CA', 'San Jose'),
('409', 'America/Chicago', 'TX', 'Southeast Texas'),
('410', 'America/New_York', 'MD', 'Baltimore'),
('412', 'America/New_York', 'PA', 'Pittsburgh'),
('413', 'America/New_York', 'MA', 'Western Massachusetts'),
('414', 'America/Chicago', 'WI', 'Milwaukee'),
('415', 'America/Los_Angeles', 'CA', 'San Francisco'),
('417', 'America/Chicago', 'MO', 'Southwest Missouri'),
('419', 'America/New_York', 'OH', 'Northwest Ohio'),
('423', 'America/New_York', 'TN', 'Chattanooga'),
('424', 'America/Los_Angeles', 'CA', 'Los Angeles'),
('425', 'America/Los_Angeles', 'WA', 'Eastside Seattle'),
('430', 'America/Chicago', 'TX', 'East Texas'),
('432', 'America/Chicago', 'TX', 'West Texas'),
('434', 'America/New_York', 'VA', 'Central Virginia'),
('435', 'America/Denver', 'UT', 'Rural Utah'),
('440', 'America/New_York', 'OH', 'Northeast Ohio'),
('442', 'America/Los_Angeles', 'CA', 'Inland Empire'),
('443', 'America/New_York', 'MD', 'Baltimore'),
('458', 'America/Los_Angeles', 'OR', 'Oregon'),
('469', 'America/Chicago', 'TX', 'Dallas'),
('470', 'America/New_York', 'GA', 'Atlanta'),
('475', 'America/New_York', 'CT', 'Connecticut'),
('478', 'America/New_York', 'GA', 'Macon'),
('479', 'America/Chicago', 'AR', 'Northwest Arkansas'),
('480', 'America/Phoenix', 'AZ', 'Phoenix East'),
('484', 'America/New_York', 'PA', 'Philadelphia'),
('501', 'America/Chicago', 'AR', 'Central Arkansas'),
('502', 'America/New_York', 'KY', 'Louisville'),
('503', 'America/Los_Angeles', 'OR', 'Portland'),
('504', 'America/Chicago', 'LA', 'New Orleans'),
('505', 'America/Denver', 'NM', 'New Mexico'),
('507', 'America/Chicago', 'MN', 'Southern Minnesota'),
('508', 'America/New_York', 'MA', 'Southeast Massachusetts'),
('509', 'America/Los_Angeles', 'WA', 'Eastern Washington'),
('510', 'America/Los_Angeles', 'CA', 'Oakland'),
('512', 'America/Chicago', 'TX', 'Austin'),
('513', 'America/New_York', 'OH', 'Cincinnati'),
('515', 'America/Chicago', 'IA', 'Des Moines'),
('516', 'America/New_York', 'NY', 'Long Island'),
('517', 'America/New_York', 'MI', 'Lansing'),
('518', 'America/New_York', 'NY', 'Albany'),
('520', 'America/Phoenix', 'AZ', 'Tucson'),
('530', 'America/Los_Angeles', 'CA', 'Northern California'),
('531', 'America/Chicago', 'NE', 'Omaha'),
('534', 'America/Chicago', 'WI', 'Wisconsin'),
('539', 'America/Chicago', 'OK', 'Tulsa'),
('540', 'America/New_York', 'VA', 'Western Virginia'),
('541', 'America/Los_Angeles', 'OR', 'Oregon'),
('551', 'America/New_York', 'NJ', 'Northern New Jersey'),
('559', 'America/Los_Angeles', 'CA', 'Fresno'),
('561', 'America/New_York', 'FL', 'Palm Beach'),
('562', 'America/Los_Angeles', 'CA', 'Long Beach'),
('563', 'America/Chicago', 'IA', 'Eastern Iowa'),
('567', 'America/New_York', 'OH', 'Northwest Ohio'),
('570', 'America/New_York', 'PA', 'Northeast Pennsylvania'),
('571', 'America/New_York', 'VA', 'Northern Virginia'),
('573', 'America/Chicago', 'MO', 'Central Missouri'),
('574', 'America/New_York', 'IN', 'South Bend'),
('575', 'America/Denver', 'NM', 'Southern New Mexico'),
('580', 'America/Chicago', 'OK', 'Western Oklahoma'),
('585', 'America/New_York', 'NY', 'Rochester'),
('586', 'America/New_York', 'MI', 'Detroit Suburbs'),
('601', 'America/Chicago', 'MS', 'Jackson'),
('602', 'America/Phoenix', 'AZ', 'Phoenix'),
('603', 'America/New_York', 'NH', 'New Hampshire'),
('605', 'America/Chicago', 'SD', 'South Dakota'),
('606', 'America/New_York', 'KY', 'Eastern Kentucky'),
('607', 'America/New_York', 'NY', 'Southern New York'),
('608', 'America/Chicago', 'WI', 'Madison'),
('609', 'America/New_York', 'NJ', 'Central New Jersey'),
('610', 'America/New_York', 'PA', 'Southeast Pennsylvania'),
('612', 'America/Chicago', 'MN', 'Minneapolis'),
('614', 'America/New_York', 'OH', 'Columbus'),
('615', 'America/Chicago', 'TN', 'Nashville'),
('616', 'America/New_York', 'MI', 'Grand Rapids'),
('617', 'America/New_York', 'MA', 'Boston'),
('618', 'America/Chicago', 'IL', 'Southern Illinois'),
('619', 'America/Los_Angeles', 'CA', 'San Diego'),
('620', 'America/Chicago', 'KS', 'Southern Kansas'),
('623', 'America/Phoenix', 'AZ', 'Phoenix West'),
('626', 'America/Los_Angeles', 'CA', 'Pasadena'),
('628', 'America/Los_Angeles', 'CA', 'San Francisco'),
('629', 'America/Chicago', 'TN', 'Nashville'),
('630', 'America/Chicago', 'IL', 'Western Chicago'),
('631', 'America/New_York', 'NY', 'Long Island'),
('636', 'America/Chicago', 'MO', 'St. Louis'),
('641', 'America/Chicago', 'IA', 'Southern Iowa'),
('646', 'America/New_York', 'NY', 'New York City'),
('650', 'America/Los_Angeles', 'CA', 'Peninsula'),
('651', 'America/Chicago', 'MN', 'St. Paul'),
('657', 'America/Los_Angeles', 'CA', 'Orange County'),
('660', 'America/Chicago', 'MO', 'Northern Missouri'),
('661', 'America/Los_Angeles', 'CA', 'Bakersfield'),
('662', 'America/Chicago', 'MS', 'Northern Mississippi'),
('667', 'America/New_York', 'MD', 'Baltimore'),
('669', 'America/Los_Angeles', 'CA', 'San Jose'),
('678', 'America/New_York', 'GA', 'Atlanta'),
('680', 'America/New_York', 'NY', 'Syracuse'),
('681', 'America/New_York', 'WV', 'West Virginia'),
('682', 'America/Chicago', 'TX', 'Fort Worth'),
('689', 'America/New_York', 'FL', 'Orlando'),
('701', 'America/Chicago', 'ND', 'North Dakota'),
('702', 'America/Los_Angeles', 'NV', 'Las Vegas'),
('703', 'America/New_York', 'VA', 'Northern Virginia'),
('704', 'America/New_York', 'NC', 'Charlotte'),
('706', 'America/New_York', 'GA', 'Columbus'),
('707', 'America/Los_Angeles', 'CA', 'North Bay'),
('708', 'America/Chicago', 'IL', 'Chicago Suburbs'),
('712', 'America/Chicago', 'IA', 'Western Iowa'),
('713', 'America/Chicago', 'TX', 'Houston'),
('714', 'America/Los_Angeles', 'CA', 'Orange County'),
('715', 'America/Chicago', 'WI', 'Northern Wisconsin'),
('716', 'America/New_York', 'NY', 'Buffalo'),
('717', 'America/New_York', 'PA', 'Harrisburg'),
('718', 'America/New_York', 'NY', 'New York City'),
('719', 'America/Denver', 'CO', 'Colorado Springs'),
('720', 'America/Denver', 'CO', 'Denver'),
('724', 'America/New_York', 'PA', 'Southwest Pennsylvania'),
('725', 'America/Los_Angeles', 'NV', 'Las Vegas'),
('726', 'America/Chicago', 'TX', 'San Antonio'),
('727', 'America/New_York', 'FL', 'St. Petersburg'),
('731', 'America/Chicago', 'TN', 'Western Tennessee'),
('732', 'America/New_York', 'NJ', 'Central New Jersey'),
('734', 'America/New_York', 'MI', 'Ann Arbor'),
('737', 'America/Chicago', 'TX', 'Austin'),
('740', 'America/New_York', 'OH', 'Southeast Ohio'),
('743', 'America/New_York', 'NC', 'Greensboro'),
('747', 'America/Los_Angeles', 'CA', 'Los Angeles'),
('754', 'America/New_York', 'FL', 'Fort Lauderdale'),
('757', 'America/New_York', 'VA', 'Virginia Beach'),
('760', 'America/Los_Angeles', 'CA', 'North San Diego'),
('762', 'America/New_York', 'GA', 'Augusta'),
('763', 'America/Chicago', 'MN', 'Minneapolis Suburbs'),
('765', 'America/New_York', 'IN', 'Central Indiana'),
('769', 'America/Chicago', 'MS', 'Jackson'),
('770', 'America/New_York', 'GA', 'Atlanta Suburbs'),
('772', 'America/New_York', 'FL', 'Treasure Coast'),
('773', 'America/Chicago', 'IL', 'Chicago'),
('774', 'America/New_York', 'MA', 'Southeast Massachusetts'),
('775', 'America/Los_Angeles', 'NV', 'Reno'),
('779', 'America/Chicago', 'IL', 'Northern Illinois'),
('781', 'America/New_York', 'MA', 'Boston Suburbs'),
('785', 'America/Chicago', 'KS', 'Topeka'),
('786', 'America/New_York', 'FL', 'Miami'),
('801', 'America/Denver', 'UT', 'Salt Lake City'),
('802', 'America/New_York', 'VT', 'Vermont'),
('803', 'America/New_York', 'SC', 'Columbia'),
('804', 'America/New_York', 'VA', 'Richmond'),
('805', 'America/Los_Angeles', 'CA', 'Ventura'),
('806', 'America/Chicago', 'TX', 'Panhandle'),
('808', 'Pacific/Honolulu', 'HI', 'Hawaii'),
('810', 'America/New_York', 'MI', 'Flint'),
('812', 'America/New_York', 'IN', 'Southern Indiana'),
('813', 'America/New_York', 'FL', 'Tampa'),
('814', 'America/New_York', 'PA', 'Central Pennsylvania'),
('815', 'America/Chicago', 'IL', 'Northern Illinois'),
('816', 'America/Chicago', 'MO', 'Kansas City'),
('817', 'America/Chicago', 'TX', 'Fort Worth'),
('818', 'America/Los_Angeles', 'CA', 'San Fernando Valley'),
('820', 'America/Los_Angeles', 'CA', 'Bakersfield'),
('828', 'America/New_York', 'NC', 'Western North Carolina'),
('830', 'America/Chicago', 'TX', 'South Central Texas'),
('831', 'America/Los_Angeles', 'CA', 'Monterey'),
('832', 'America/Chicago', 'TX', 'Houston'),
('843', 'America/New_York', 'SC', 'Charleston'),
('845', 'America/New_York', 'NY', 'Hudson Valley'),
('847', 'America/Chicago', 'IL', 'Northern Chicago'),
('848', 'America/New_York', 'NJ', 'Central New Jersey'),
('850', 'America/Chicago', 'FL', 'Panhandle'),
('856', 'America/New_York', 'NJ', 'Southern New Jersey'),
('857', 'America/New_York', 'MA', 'Boston'),
('858', 'America/Los_Angeles', 'CA', 'San Diego'),
('859', 'America/New_York', 'KY', 'Lexington'),
('860', 'America/New_York', 'CT', 'Connecticut'),
('862', 'America/New_York', 'NJ', 'Northern New Jersey'),
('863', 'America/New_York', 'FL', 'Central Florida'),
('864', 'America/New_York', 'SC', 'Greenville'),
('865', 'America/New_York', 'TN', 'Knoxville'),
('870', 'America/Chicago', 'AR', 'Eastern Arkansas'),
('872', 'America/Chicago', 'IL', 'Chicago'),
('878', 'America/New_York', 'PA', 'Pittsburgh'),
('901', 'America/Chicago', 'TN', 'Memphis'),
('903', 'America/Chicago', 'TX', 'East Texas'),
('904', 'America/New_York', 'FL', 'Jacksonville'),
('906', 'America/New_York', 'MI', 'Upper Peninsula'),
('907', 'America/Anchorage', 'AK', 'Alaska'),
('908', 'America/New_York', 'NJ', 'Central New Jersey'),
('909', 'America/Los_Angeles', 'CA', 'Inland Empire'),
('910', 'America/New_York', 'NC', 'Fayetteville'),
('912', 'America/New_York', 'GA', 'Savannah'),
('913', 'America/Chicago', 'KS', 'Kansas City'),
('914', 'America/New_York', 'NY', 'Westchester'),
('915', 'America/Denver', 'TX', 'El Paso'),
('916', 'America/Los_Angeles', 'CA', 'Sacramento'),
('917', 'America/New_York', 'NY', 'New York City'),
('918', 'America/Chicago', 'OK', 'Tulsa'),
('919', 'America/New_York', 'NC', 'Raleigh'),
('920', 'America/Chicago', 'WI', 'Green Bay'),
('925', 'America/Los_Angeles', 'CA', 'East Bay'),
('928', 'America/Phoenix', 'AZ', 'Northern Arizona'),
('929', 'America/New_York', 'NY', 'New York City'),
('930', 'America/New_York', 'IN', 'Southern Indiana'),
('931', 'America/Chicago', 'TN', 'Middle Tennessee'),
('936', 'America/Chicago', 'TX', 'Southeast Texas'),
('937', 'America/New_York', 'OH', 'Dayton'),
('938', 'America/Chicago', 'AL', 'Northern Alabama'),
('940', 'America/Chicago', 'TX', 'North Texas'),
('941', 'America/New_York', 'FL', 'Sarasota'),
('947', 'America/New_York', 'MI', 'Southeast Michigan'),
('949', 'America/Los_Angeles', 'CA', 'Orange County'),
('951', 'America/Los_Angeles', 'CA', 'Riverside'),
('952', 'America/Chicago', 'MN', 'Minneapolis Suburbs'),
('954', 'America/New_York', 'FL', 'Fort Lauderdale'),
('956', 'America/Chicago', 'TX', 'Rio Grande Valley'),
('959', 'America/New_York', 'CT', 'Connecticut'),
('970', 'America/Denver', 'CO', 'Northern Colorado'),
('971', 'America/Los_Angeles', 'OR', 'Portland'),
('972', 'America/Chicago', 'TX', 'Dallas'),
('973', 'America/New_York', 'NJ', 'Northern New Jersey'),
('978', 'America/New_York', 'MA', 'Northeast Massachusetts'),
('979', 'America/Chicago', 'TX', 'Southeast Texas'),
('980', 'America/New_York', 'NC', 'Charlotte'),
('984', 'America/New_York', 'NC', 'Raleigh'),
('985', 'America/Chicago', 'LA', 'Southeast Louisiana'),
('989', 'America/New_York', 'MI', 'Central Michigan')
ON CONFLICT (area_code) DO NOTHING;

-- =====================================================
-- AGENT AVAILABILITY & SCHEDULING
-- =====================================================

-- Add timezone fields to admin_users if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'timezone') THEN
        ALTER TABLE admin_users ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'timezone_offset_minutes') THEN
        ALTER TABLE admin_users ADD COLUMN timezone_offset_minutes INTEGER;
    END IF;
END $$;

-- Agent weekly availability (recurring hours)
CREATE TABLE IF NOT EXISTS agent_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,                 -- In agent's LOCAL timezone
    end_time TIME NOT NULL,                   -- In agent's LOCAL timezone

    -- For multiple shifts per day
    shift_number INTEGER DEFAULT 1,           -- 1 = primary, 2 = secondary shift

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(agent_id, day_of_week, shift_number)
);

CREATE INDEX idx_agent_availability_agent ON agent_availability(agent_id);
CREATE INDEX idx_agent_availability_day ON agent_availability(day_of_week);

-- Agent break times (lunch, meetings, etc.)
CREATE TABLE IF NOT EXISTS agent_break_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    reason VARCHAR(100),                      -- 'Lunch', 'Team meeting', etc.
    recurring BOOLEAN DEFAULT true,           -- TRUE = every week

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_break_times_agent ON agent_break_times(agent_id);
CREATE INDEX idx_agent_break_times_day ON agent_break_times(agent_id, day_of_week);

-- Agent time off / ad-hoc blocks
CREATE TABLE IF NOT EXISTS agent_time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

    block_type VARCHAR(20) NOT NULL,          -- 'time_off', 'meeting', 'busy', 'vacation'
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_time_blocks_agent ON agent_time_blocks(agent_id);
CREATE INDEX idx_agent_time_blocks_dates ON agent_time_blocks(start_datetime, end_datetime);

-- =====================================================
-- BLACKOUT DATES
-- =====================================================

-- Global holiday blackouts (all agents)
CREATE TABLE IF NOT EXISTS global_blackout_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    blackout_date DATE NOT NULL,
    name VARCHAR(100),                        -- 'Christmas Day', 'New Year', etc.
    recurring_yearly BOOLEAN DEFAULT false,   -- If TRUE, applies every year

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(blackout_date)
);

CREATE INDEX idx_global_blackout_date ON global_blackout_dates(blackout_date);

-- Seed common US holidays
INSERT INTO global_blackout_dates (blackout_date, name, recurring_yearly) VALUES
('2025-01-01', 'New Year''s Day', true),
('2025-07-04', 'Independence Day', true),
('2025-11-27', 'Thanksgiving', false),
('2025-11-28', 'Day After Thanksgiving', false),
('2025-12-24', 'Christmas Eve', true),
('2025-12-25', 'Christmas Day', true),
('2025-12-31', 'New Year''s Eve', true)
ON CONFLICT (blackout_date) DO NOTHING;

-- Agent-specific blackout days
CREATE TABLE IF NOT EXISTS agent_blackout_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

    -- For recurring weekly blackouts
    blackout_type VARCHAR(20) NOT NULL,       -- 'recurring' or 'specific'
    day_of_week INTEGER,                      -- 0=Sunday, 6=Saturday (for recurring)

    -- For specific date blackouts
    blackout_date DATE,                       -- Specific date (for specific)
    blackout_end_date DATE,                   -- End date for date ranges

    reason VARCHAR(200),                      -- 'Training day', 'Vacation', etc.

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_blackout_agent ON agent_blackout_days(agent_id);
CREATE INDEX idx_agent_blackout_date ON agent_blackout_days(blackout_date);
CREATE INDEX idx_agent_blackout_recurring ON agent_blackout_days(day_of_week) WHERE blackout_type = 'recurring';

-- =====================================================
-- CALL DISTRIBUTION
-- =====================================================

-- Call distribution settings (singleton - one row)
CREATE TABLE IF NOT EXISTS call_distribution_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    distribution_method VARCHAR(50) DEFAULT 'round_robin',  -- 'round_robin', 'weighted', 'availability_first', 'skill_based', 'least_busy'

    -- Scheduling rules
    buffer_minutes INTEGER DEFAULT 30,        -- MINIMUM 30 MINUTES between calls
    call_duration_minutes INTEGER DEFAULT 15,
    max_advance_business_days INTEGER DEFAULT 3,  -- ONLY 3 BUSINESS DAYS OUT
    min_notice_hours INTEGER DEFAULT 2,

    skip_at_capacity BOOLEAN DEFAULT true,
    prioritize_hot_leads BOOLEAN DEFAULT true,

    -- Global blackouts
    blackout_saturday BOOLEAN DEFAULT true,   -- Weekend OFF by default
    blackout_sunday BOOLEAN DEFAULT true,     -- Weekend OFF by default

    -- Admin overflow settings
    overflow_to_admin BOOLEAN DEFAULT true,
    overflow_distribution_mode VARCHAR(20) DEFAULT 'manual',  -- 'manual', 'auto', 'hybrid'
    overflow_auto_assign_time TIME DEFAULT '08:00',           -- Daily batch assign time
    overflow_auto_assign_on_availability BOOLEAN DEFAULT true,
    overflow_notification VARCHAR(20) DEFAULT 'immediate',     -- 'immediate', 'daily_digest'

    -- AI messages
    overflow_ai_message TEXT DEFAULT 'Our calendar is packed this week! Someone will reach out within 24 hours to find a time that works. Thanks for your patience!',
    weekend_request_ai_message TEXT DEFAULT 'I''ve put you down for [Day] at [Time]. Someone from our team will confirm within 24 hours. Sound good?',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO call_distribution_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Agent distribution weights (for weighted distribution)
CREATE TABLE IF NOT EXISTS agent_distribution_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,

    weight_percent INTEGER DEFAULT 100,       -- Relative weight (100 = normal, 50 = half, 200 = double)
    max_daily_calls INTEGER DEFAULT 10,
    current_daily_calls INTEGER DEFAULT 0,
    last_assigned_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(agent_id)
);

CREATE INDEX idx_agent_distribution_weights_agent ON agent_distribution_weights(agent_id);

-- Distribution log (for auditing)
CREATE TABLE IF NOT EXISTS call_distribution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    contact_id UUID,                          -- Will reference outreach_contacts after that table is created
    scheduled_call_id UUID,                   -- Will reference scheduled_calls after that table is created
    selected_agent_id UUID REFERENCES admin_users(id),

    distribution_method VARCHAR(50),
    agents_considered JSONB,                  -- Array of agent IDs in pool
    selection_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_distribution_log_agent ON call_distribution_log(selected_agent_id);
CREATE INDEX idx_call_distribution_log_created ON call_distribution_log(created_at DESC);

-- =====================================================
-- SCHEDULED CALLS
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    contact_id UUID,                          -- Will reference outreach_contacts after that table is created
    agent_id UUID REFERENCES admin_users(id), -- NULL if pending admin assignment
    campaign_id UUID,                         -- Will reference outreach_campaigns after that table is created

    -- Time (ALWAYS STORED IN UTC)
    scheduled_at TIMESTAMPTZ NOT NULL,        -- UTC timestamp
    duration_minutes INTEGER DEFAULT 15,

    -- Timezone context (for display)
    agent_timezone VARCHAR(50),               -- 'America/Chicago' — copied from agent at booking
    lead_timezone VARCHAR(50),                -- 'America/Los_Angeles' — copied from contact at booking

    call_type VARCHAR(20) DEFAULT 'phone',    -- 'phone', 'zoom', 'google_meet'
    meeting_link TEXT,

    status VARCHAR(30) DEFAULT 'scheduled',   -- 'scheduled', 'pending_admin_approval', 'confirmed',
                                              -- 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled'

    -- Weekend/overflow handling
    weekend_request BOOLEAN DEFAULT false,    -- Lead specifically asked for weekend
    overflow_reason VARCHAR(50),              -- 'no_availability_3day', 'weekend_request', 'all_agents_blocked'
    admin_approved BOOLEAN,                   -- NULL = pending, TRUE = approved, FALSE = rejected/rescheduled
    admin_approved_by UUID REFERENCES admin_users(id),
    admin_approved_at TIMESTAMPTZ,

    -- Reminders
    lead_reminder_sent BOOLEAN DEFAULT false,
    agent_reminder_sent BOOLEAN DEFAULT false,

    -- Outcome (after call)
    outcome VARCHAR(50),                      -- 'closed', 'demo_scheduled', 'callback',
                                              -- 'not_interested', 'no_answer', 'wrong_number'
    outcome_notes TEXT,
    plan_sold VARCHAR(50),

    -- Rescheduling
    rescheduled_from_id UUID REFERENCES scheduled_calls(id),
    reschedule_count INTEGER DEFAULT 0,

    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_calls_agent ON scheduled_calls(agent_id);
CREATE INDEX idx_scheduled_calls_scheduled ON scheduled_calls(scheduled_at);
CREATE INDEX idx_scheduled_calls_status ON scheduled_calls(status);
CREATE INDEX idx_scheduled_calls_weekend ON scheduled_calls(weekend_request) WHERE weekend_request = true;
CREATE INDEX idx_scheduled_calls_pending ON scheduled_calls(status) WHERE status = 'pending_admin_approval';

-- No-show escalation tracking
CREATE TABLE IF NOT EXISTS no_show_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID,                          -- Will reference outreach_contacts after that table is created
    scheduled_call_id UUID REFERENCES scheduled_calls(id),
    no_show_number INTEGER NOT NULL,          -- 1, 2, 3, 4+
    escalation_action VARCHAR(50),            -- 'retry_24h', 'flag_at_risk', 'final_warning', 'archive'
    score_adjustment INTEGER,                 -- -15, -25, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_no_show_escalations_contact ON no_show_escalations(contact_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE sms_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_code_timezones ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_break_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_blackout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_distribution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_distribution_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_distribution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_escalations ENABLE ROW LEVEL SECURITY;

-- Policies for admin access (service role bypasses RLS)
-- Area code timezones - readable by all
CREATE POLICY area_code_timezones_read ON area_code_timezones FOR SELECT USING (true);

-- Agent availability - agents see their own, admins see all
CREATE POLICY agent_availability_policy ON agent_availability
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Agent break times
CREATE POLICY agent_break_times_policy ON agent_break_times
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Agent time blocks
CREATE POLICY agent_time_blocks_policy ON agent_time_blocks
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Agent blackout days
CREATE POLICY agent_blackout_days_policy ON agent_blackout_days
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Agent distribution weights
CREATE POLICY agent_distribution_weights_policy ON agent_distribution_weights
    FOR ALL USING (
        agent_id = auth.uid() OR
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Scheduled calls - agents see their assigned calls, admins see all
CREATE POLICY scheduled_calls_policy ON scheduled_calls
    FOR ALL USING (
        agent_id = auth.uid() OR
        agent_id IS NULL OR  -- Pending admin assignment
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );

-- Global tables - admin only
CREATE POLICY sms_consent_admin ON sms_consent FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'agent'))
);

CREATE POLICY sms_opt_outs_admin ON sms_opt_outs FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'agent'))
);

CREATE POLICY suppression_list_admin ON suppression_list FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY dnc_settings_admin ON dnc_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY dnc_checks_admin ON dnc_checks FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'agent'))
);

CREATE POLICY global_blackout_read ON global_blackout_dates FOR SELECT USING (true);
CREATE POLICY global_blackout_admin ON global_blackout_dates FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY call_distribution_settings_admin ON call_distribution_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY call_distribution_log_admin ON call_distribution_log FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY no_show_escalations_admin ON no_show_escalations FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'agent'))
);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_call_distribution_settings_updated_at
    BEFORE UPDATE ON call_distribution_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_calls_updated_at
    BEFORE UPDATE ON scheduled_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dnc_settings_updated_at
    BEFORE UPDATE ON dnc_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE sms_consent IS 'TCPA consent tracking for SMS outreach';
COMMENT ON TABLE sms_opt_outs IS 'Global opt-out list for phones that replied STOP';
COMMENT ON TABLE suppression_list IS 'Internal suppression list for blocked numbers';
COMMENT ON TABLE dnc_settings IS 'Configuration for DNC list checking (Datazapp)';
COMMENT ON TABLE dnc_checks IS 'Cached DNC check results';
COMMENT ON TABLE area_code_timezones IS 'US area code to timezone mapping for lead timezone detection';
COMMENT ON TABLE agent_availability IS 'Weekly recurring availability hours per agent';
COMMENT ON TABLE agent_break_times IS 'Recurring break times per agent (lunch, meetings)';
COMMENT ON TABLE agent_time_blocks IS 'Ad-hoc time off and busy blocks per agent';
COMMENT ON TABLE global_blackout_dates IS 'Global holidays when no calls are scheduled';
COMMENT ON TABLE agent_blackout_days IS 'Agent-specific blackout days (recurring or specific dates)';
COMMENT ON TABLE call_distribution_settings IS 'Global call distribution configuration (singleton)';
COMMENT ON TABLE agent_distribution_weights IS 'Per-agent distribution weights for weighted distribution';
COMMENT ON TABLE call_distribution_log IS 'Audit log of how calls were distributed to agents';
COMMENT ON TABLE scheduled_calls IS 'Scheduled outreach calls with agents';
COMMENT ON TABLE no_show_escalations IS 'Tracking of no-show escalation tiers';

-- =====================================================
-- DONE - Migration 013
-- =====================================================
