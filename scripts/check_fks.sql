
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Checking Foreign Keys on commissions table:';
    FOR r IN 
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint 
        WHERE conrelid = 'commissions'::regclass
    LOOP
        RAISE NOTICE '%: %', r.conname, r.def;
    END LOOP;
END $$;
