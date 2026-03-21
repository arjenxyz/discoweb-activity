-- Replace existing category check on system_mails to include 'order'
-- This migration is safe to run: it finds and drops the existing CHECK constraint
-- that references the category column and then replaces it with a new one.

DO $$
DECLARE
  cname text;
BEGIN
  -- find a check constraint on system_mails that mentions "category"
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

  -- add new check constraint allowing 'order' (NOT VALID skips existing rows)
  EXECUTE $inner$ALTER TABLE public.system_mails
    ADD CONSTRAINT system_mails_category_check
    CHECK (category IN ('announcement','maintenance','sponsor','update','lottery','reward','order')) NOT VALID;$inner$;
END$$;
