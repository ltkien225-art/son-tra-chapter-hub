
CREATE OR REPLACE FUNCTION public.can_read_owner(_type text, _id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE _type
    WHEN 'submission' THEN EXISTS (SELECT 1 FROM submissions s WHERE s.id = _id)
    WHEN 'document' THEN EXISTS (SELECT 1 FROM documents d WHERE d.id = _id)
    WHEN 'sensitive_case' THEN EXISTS (SELECT 1 FROM sensitive_cases c WHERE c.id = _id)
    ELSE false END $$;

CREATE OR REPLACE FUNCTION public.stamp_actor() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE me text := public.current_email();
BEGIN
  IF coalesce(current_setting('app.restoring', true),'') = 'on' THEN RETURN NEW; END IF;
  IF me <> '' THEN
    IF TG_TABLE_NAME IN ('member_counts','task_assignments','app_users') THEN NEW.updated_by := me;
    ELSIF TG_OP = 'INSERT' THEN NEW.created_by := me;
    ELSE NEW.created_by := OLD.created_by; END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.restore_backup(_b jsonb, _dry_run boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb := '{}'; n int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _b->>'format' IS DISTINCT FROM 'hoi-lhpn-son-tra-backup' OR (_b->>'version') IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'invalid_backup_format'; END IF;
  IF jsonb_typeof(_b->'chapters') <> 'array' OR jsonb_array_length(_b->'chapters') <> 42 OR
     (SELECT count(*) FROM jsonb_to_recordset(_b->'chapters') AS x(id text, name text, households int)
       JOIN chapters c ON c.id = x.id AND c.name = x.name AND c.households IS NOT DISTINCT FROM x.households) <> 42
     THEN RAISE EXCEPTION 'chapter_catalogue_mismatch'; END IF;
  PERFORM set_config('app.restoring','on',true);
  INSERT INTO documents SELECT * FROM jsonb_populate_recordset(NULL::documents, coalesce(_b->'documents','[]')) ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('documents', n);
  INSERT INTO document_recipients SELECT * FROM jsonb_populate_recordset(NULL::document_recipients, coalesce(_b->'document_recipients','[]')) ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('document_recipients', n);
  INSERT INTO tasks SELECT * FROM jsonb_populate_recordset(NULL::tasks, coalesce(_b->'tasks','[]')) ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('tasks', n);
  INSERT INTO task_assignments SELECT * FROM jsonb_populate_recordset(NULL::task_assignments, coalesce(_b->'task_assignments','[]')) ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('task_assignments', n);
  INSERT INTO submissions SELECT * FROM jsonb_populate_recordset(NULL::submissions, coalesce(_b->'submissions','[]')) ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('submissions', n);
  INSERT INTO member_counts SELECT * FROM jsonb_populate_recordset(NULL::member_counts, coalesce(_b->'member_counts','[]')) ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('member_counts', n);
  PERFORM set_config('app.restoring','off',true);
  IF _dry_run THEN RAISE EXCEPTION 'DRY_RUN:%', res::text USING ERRCODE = 'P0003'; END IF;
  RETURN res;
END $$;
REVOKE EXECUTE ON FUNCTION public.restore_backup(jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_backup(jsonb,boolean) TO authenticated;

-- Private evidence bucket: read only when the caller can read the attachment row (which checks the owner's RLS).
CREATE POLICY evidence_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND EXISTS (SELECT 1 FROM public.attachments a WHERE a.path = name));
CREATE POLICY evidence_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence'
    AND split_part(name,'/',1) IN ('submission','document','sensitive_case')
    AND split_part(name,'/',2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.can_write_owner(split_part(name,'/',1), split_part(name,'/',2)::uuid));
CREATE POLICY evidence_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND public.is_admin());
