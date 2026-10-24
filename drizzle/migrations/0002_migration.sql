
CREATE OR REPLACE FUNCTION public.write_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; o jsonb; rid text; act text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN o := to_jsonb(OLD); END IF;
  act := lower(TG_OP);
  IF TG_OP = 'UPDATE' AND r ? 'status' AND (r->>'status') IS DISTINCT FROM (o->>'status') THEN
    act := CASE WHEN TG_TABLE_NAME = 'submissions' AND r->>'status' = 'withdrawn' THEN 'withdraw' ELSE 'status:' || (r->>'status') END;
  END IF;
  IF TG_OP = 'UPDATE' AND r ? 'archived' AND (r->>'archived') IS DISTINCT FROM (o->>'archived') THEN
    act := CASE WHEN (r->>'archived')::boolean THEN 'archive' ELSE 'restore' END;
  END IF;
  rid := CASE
    WHEN TG_TABLE_NAME = 'chapter_access' THEN (r->>'email') || ':' || (r->>'chapter_id')
    WHEN r ? 'id' THEN r->>'id'
    WHEN TG_TABLE_NAME = 'task_assignments' THEN (r->>'task_id') || ':' || (r->>'chapter_id')
    WHEN TG_TABLE_NAME = 'member_counts' THEN (r->>'chapter_id') || ':' || (r->>'period')
    ELSE coalesce(r->>'email','?') END;
  INSERT INTO audit_log(actor, action, resource_type, resource_id, chapter_id)
  VALUES (coalesce(nullif(public.current_email(),''),'system'), act, TG_TABLE_NAME, rid, r->>'chapter_id');
  RETURN NULL;
END $$;
