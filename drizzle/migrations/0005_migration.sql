
CREATE OR REPLACE FUNCTION public.notify_events() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE chs text[]; n jsonb := to_jsonb(NEW); o jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END; d record;
BEGIN
  IF TG_TABLE_NAME = 'documents' THEN
    IF n->>'status' IN ('published','withdrawn') AND (TG_OP = 'INSERT' OR (o->>'status') IS DISTINCT FROM (n->>'status')) AND n->>'scope' <> 'office' THEN
      IF n->>'scope' = 'all' THEN SELECT array_agg(id) INTO chs FROM chapters;
      ELSE SELECT array_agg(chapter_id) INTO chs FROM document_recipients WHERE document_id = (n->>'id')::uuid; END IF;
      PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(coalesce(chs,'{}'))), 'document',
        CASE WHEN n->>'status' = 'published' THEN 'Văn bản mới' ELSE 'Văn bản đã thu hồi' END,
        CASE WHEN n->>'status' = 'published' THEN 'Văn phòng Hội vừa gửi một văn bản. Mở ứng dụng để xem.' ELSE 'Một văn bản đã được Văn phòng thu hồi.' END,
        'doc:' || (n->>'id') || ':' || (n->>'status'));
    END IF;
  ELSIF TG_TABLE_NAME = 'document_recipients' THEN
    SELECT status, scope INTO d FROM documents WHERE id = (n->>'document_id')::uuid;
    IF d.status = 'published' AND d.scope = 'selected' THEN
      PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(ARRAY[n->>'chapter_id'])), 'document', 'Văn bản mới',
        'Văn phòng Hội vừa gửi một văn bản. Mở ứng dụng để xem.', 'doc:' || (n->>'document_id') || ':published');
    END IF;
  ELSIF TG_TABLE_NAME = 'task_assignments' THEN
    PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(ARRAY[n->>'chapter_id'])), 'task', 'Nhiệm vụ mới',
      'Chi hội vừa được giao một nhiệm vụ. Mở ứng dụng để xem hạn và yêu cầu.', 'task:' || (n->>'task_id') || ':' || (n->>'chapter_id'));
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    IF (o->>'status') IS DISTINCT FROM (n->>'status') OR (o->>'due_at') IS DISTINCT FROM (n->>'due_at') THEN
      SELECT array_agg(chapter_id) INTO chs FROM task_assignments WHERE task_id = (n->>'id')::uuid;
      PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(coalesce(chs,'{}'))), 'task',
        CASE WHEN n->>'status' = 'withdrawn' THEN 'Nhiệm vụ đã thu hồi' ELSE 'Nhiệm vụ được điều chỉnh' END,
        'Văn phòng Hội vừa cập nhật một nhiệm vụ. Mở ứng dụng để xem.',
        'taskupd:' || (n->>'id') || ':' || (n->>'status') || ':' || coalesce(n->>'due_at','') || ':' || extract(epoch from now())::bigint);
    END IF;
  ELSIF TG_TABLE_NAME = 'submissions' THEN
    PERFORM public.enqueue(ARRAY(SELECT public.office_recipients()), 'submission', 'Chi hội gửi báo cáo mới',
      'Có một mục mới gửi lên Văn phòng. Mở ứng dụng để xem.', 'sub:' || (n->>'id'));
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER t_notify AFTER INSERT ON public.document_recipients FOR EACH ROW EXECUTE FUNCTION public.notify_events();
