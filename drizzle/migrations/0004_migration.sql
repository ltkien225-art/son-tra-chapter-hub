
CREATE TABLE public.push_subscriptions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(endpoint) <= 1000),
  p256dh text NOT NULL CHECK (length(p256dh) <= 200),
  auth text NOT NULL CHECK (length(auth) <= 100),
  device_label text NOT NULL DEFAULT '' CHECK (length(device_label) <= 120),
  fail_count integer NOT NULL DEFAULT 0,
  disabled boolean NOT NULL DEFAULT false,
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notification_outbox(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/app',
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_devices integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notification_outbox(status, next_attempt_at);
CREATE INDEX ON public.notification_outbox(recipient_email, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT ON public.notification_outbox TO authenticated;
GRANT ALL ON public.push_subscriptions, public.notification_outbox TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_own_read ON public.push_subscriptions FOR SELECT TO authenticated USING (email = public.current_email());
CREATE POLICY ps_own_ins ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (email = public.current_email() AND (public.is_office() OR public.has_any_chapter()));
CREATE POLICY ps_own_del ON public.push_subscriptions FOR DELETE TO authenticated USING (email = public.current_email());
CREATE POLICY ob_read ON public.notification_outbox FOR SELECT TO authenticated USING (recipient_email = public.current_email() OR public.is_admin());

-- Recipients resolved from CURRENT permissions
CREATE FUNCTION public.chapter_recipients(_chs text[]) RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ca.email FROM chapter_access ca JOIN app_users u ON u.email = ca.email
  WHERE u.active AND ca.chapter_id = ANY(_chs) $$;
CREATE FUNCTION public.office_recipients() RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'ubmttqvnphuongsontra@gmail.com' UNION SELECT email FROM app_users WHERE active AND office_role IN ('admin','staff') $$;

CREATE FUNCTION public.enqueue(_emails text[], _kind text, _title text, _body text, _key text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO notification_outbox(recipient_email, kind, title, body, dedupe_key)
  SELECT e, _kind, _title, _body, _key || ':' || e FROM unnest(_emails) e WHERE e <> coalesce(public.current_email(),'')
  ON CONFLICT (dedupe_key) DO NOTHING $$;

-- Generic notification text only: never titles/bodies/PII.
CREATE FUNCTION public.notify_events() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE chs text[];
BEGIN
  IF TG_TABLE_NAME = 'documents' THEN
    IF NEW.status IN ('published','withdrawn') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) AND NEW.scope <> 'office' THEN
      IF NEW.scope = 'all' THEN SELECT array_agg(id) INTO chs FROM chapters;
      ELSE SELECT array_agg(chapter_id) INTO chs FROM document_recipients WHERE document_id = NEW.id; END IF;
      PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(coalesce(chs,'{}'))), 'document',
        CASE WHEN NEW.status = 'published' THEN 'Văn bản mới' ELSE 'Văn bản đã thu hồi' END,
        CASE WHEN NEW.status = 'published' THEN 'Văn phòng Hội vừa gửi một văn bản. Mở ứng dụng để xem.' ELSE 'Một văn bản đã được Văn phòng thu hồi.' END,
        'doc:' || NEW.id || ':' || NEW.status);
    END IF;
  ELSIF TG_TABLE_NAME = 'task_assignments' THEN
    PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(ARRAY[NEW.chapter_id])), 'task', 'Nhiệm vụ mới',
      'Chi hội vừa được giao một nhiệm vụ. Mở ứng dụng để xem hạn và yêu cầu.', 'task:' || NEW.task_id || ':' || NEW.chapter_id);
  ELSIF TG_TABLE_NAME = 'tasks' AND TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.due_at IS DISTINCT FROM NEW.due_at) THEN
    SELECT array_agg(chapter_id) INTO chs FROM task_assignments WHERE task_id = NEW.id;
    PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(coalesce(chs,'{}'))), 'task',
      CASE WHEN NEW.status = 'withdrawn' THEN 'Nhiệm vụ đã thu hồi' ELSE 'Nhiệm vụ được điều chỉnh' END,
      'Văn phòng Hội vừa cập nhật một nhiệm vụ. Mở ứng dụng để xem.',
      'taskupd:' || NEW.id || ':' || NEW.status || ':' || coalesce(NEW.due_at::text,'') || ':' || extract(epoch from now())::bigint);
  ELSIF TG_TABLE_NAME = 'submissions' AND TG_OP = 'INSERT' THEN
    PERFORM public.enqueue(ARRAY(SELECT public.office_recipients()), 'submission', 'Chi hội gửi báo cáo mới',
      'Có một mục mới gửi lên Văn phòng. Mở ứng dụng để xem.', 'sub:' || NEW.id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER t_notify AFTER INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.notify_events();
CREATE TRIGGER t_notify AFTER INSERT ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.notify_events();
CREATE TRIGGER t_notify AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_events();
CREATE TRIGGER t_notify AFTER INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.notify_events();

-- Due-soon reminders (called daily); dedupe per task/chapter/day
CREATE FUNCTION public.enqueue_due_reminders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT a.task_id, a.chapter_id, t.due_at FROM task_assignments a JOIN tasks t ON t.id = a.task_id
           WHERE t.status = 'active' AND a.status <> 'completed' AND t.due_at BETWEEN current_date - 1 AND current_date + 2 LOOP
    PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(ARRAY[r.chapter_id])), 'reminder',
      CASE WHEN r.due_at < current_date THEN 'Nhiệm vụ quá hạn' ELSE 'Nhiệm vụ sắp đến hạn' END,
      'Chi hội có nhiệm vụ cần hoàn thành. Mở ứng dụng để cập nhật tiến độ.', 'due:' || r.task_id || ':' || r.chapter_id || ':' || current_date);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Test push for self
CREATE FUNCTION public.enqueue_test_push() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO notification_outbox(recipient_email, kind, title, body, dedupe_key)
  SELECT public.current_email(), 'test', 'Thử thông báo', 'Thông báo hoạt động trên thiết bị này.', 'test:' || public.current_email() || ':' || extract(epoch from clock_timestamp())
  WHERE public.is_office() OR public.has_any_chapter() $$;

REVOKE EXECUTE ON FUNCTION public.chapter_recipients(text[]), public.office_recipients(), public.enqueue(text[],text,text,text,text), public.enqueue_due_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_test_push() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_test_push() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_due_reminders(), public.chapter_recipients(text[]), public.office_recipients() TO service_role;
