ALTER TABLE public.attachments DROP CONSTRAINT attachments_owner_type_check;
ALTER TABLE public.attachments ADD CONSTRAINT attachments_owner_type_check CHECK (owner_type IN ('submission','document','sensitive_case','task'));
ALTER TABLE public.submissions DROP CONSTRAINT submissions_kind_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_kind_check CHECK (kind IN ('report','activity','situation','feedback','result'));

CREATE OR REPLACE FUNCTION public.can_read_owner(_type text, _id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT CASE _type
    WHEN 'submission' THEN EXISTS (SELECT 1 FROM submissions s WHERE s.id = _id)
    WHEN 'document' THEN EXISTS (SELECT 1 FROM documents d WHERE d.id = _id)
    WHEN 'sensitive_case' THEN EXISTS (SELECT 1 FROM sensitive_cases c WHERE c.id = _id)
    WHEN 'task' THEN EXISTS (SELECT 1 FROM tasks t WHERE t.id = _id)
    ELSE false END $$;
CREATE OR REPLACE FUNCTION public.can_write_owner(_type text, _id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT CASE _type
    WHEN 'submission' THEN EXISTS (SELECT 1 FROM submissions s WHERE s.id = _id AND s.status = 'submitted' AND s.created_by = public.current_email())
    WHEN 'document' THEN public.is_office() AND EXISTS (SELECT 1 FROM documents d WHERE d.id = _id)
    WHEN 'sensitive_case' THEN EXISTS (SELECT 1 FROM sensitive_cases c WHERE c.id = _id)
    WHEN 'task' THEN public.is_office() AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = _id)
    ELSE false END $$;

DROP POLICY evidence_upload ON storage.objects;
CREATE POLICY evidence_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence'
    AND split_part(name,'/',1) IN ('submission','document','sensitive_case','task')
    AND split_part(name,'/',2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.can_write_owner(split_part(name,'/',1), split_part(name,'/',2)::uuid));

-- Metadata row must match a real uploaded object (same path, size, type) — blocks fake/mismatched records.
CREATE OR REPLACE FUNCTION public.verify_attachment_object() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o record;
BEGIN
  IF coalesce(current_setting('app.restoring', true),'') = 'on' THEN RETURN NEW; END IF;
  SELECT metadata INTO o FROM storage.objects WHERE bucket_id = 'evidence' AND name = NEW.path;
  IF NOT FOUND THEN RAISE EXCEPTION 'file_missing' USING ERRCODE = 'P0001'; END IF;
  IF (o.metadata->>'size')::bigint IS DISTINCT FROM NEW.size_bytes OR (o.metadata->>'mimetype') IS DISTINCT FROM NEW.mime THEN
    RAISE EXCEPTION 'file_mismatch' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER t_verify BEFORE INSERT ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.verify_attachment_object();