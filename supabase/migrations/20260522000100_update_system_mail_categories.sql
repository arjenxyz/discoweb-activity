-- Update system_mails category check:
-- - remove unused: maintenance, sponsor
-- - keep active: announcement, system, update, lottery, reward, order

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname
  INTO cname
  FROM pg_constraint con
  JOIN pg_class cls ON con.conrelid = cls.oid
  WHERE cls.relname = 'system_mails'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%category%in%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.system_mails DROP CONSTRAINT %I', cname);
  END IF;

  EXECUTE $inner$ALTER TABLE public.system_mails
    ADD CONSTRAINT system_mails_category_check
    CHECK (category IN ('announcement','system','update','lottery','reward','order')) NOT VALID;$inner$;
END$$;

