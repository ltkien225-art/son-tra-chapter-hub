DROP POLICY IF EXISTS evidence_read ON storage.objects;
CREATE POLICY evidence_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'evidence'
  AND split_part(name, '/', 1) = ANY (ARRAY['submission','document','sensitive_case','task'])
  AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.can_read_owner(split_part(name, '/', 1), (CASE WHEN split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN split_part(name, '/', 2) ELSE NULL END)::uuid)
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    WHERE a.path = objects.name
      AND a.owner_type = split_part(objects.name, '/', 1)
      AND a.owner_id::text = split_part(objects.name, '/', 2)
  )
);