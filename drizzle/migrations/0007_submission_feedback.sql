CREATE TABLE public.submission_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.submission_feedback TO authenticated;
GRANT ALL ON public.submission_feedback TO service_role;
ALTER TABLE public.submission_feedback ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.submission_visible(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM submissions s WHERE s.id = _id AND public.can_chapter(s.chapter_id) AND (s.status = 'submitted' OR s.created_by = public.current_email())) $$;
CREATE POLICY fb_read ON public.submission_feedback FOR SELECT TO authenticated USING (public.submission_visible(submission_id));
CREATE POLICY fb_ins ON public.submission_feedback FOR INSERT TO authenticated WITH CHECK (public.is_office() AND EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_id AND s.status = 'submitted'));
CREATE OR REPLACE FUNCTION public.notify_feedback() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ch text;
BEGIN
  SELECT chapter_id INTO ch FROM submissions WHERE id = NEW.submission_id;
  PERFORM public.enqueue(ARRAY(SELECT public.chapter_recipients(ARRAY[ch])), 'feedback', 'Văn phòng đã phản hồi',
    'Văn phòng vừa phản hồi một mục Chi hội gửi. Mở ứng dụng để xem.', 'fb:' || NEW.id);
  RETURN NULL;
END $$;
CREATE TRIGGER t_stamp BEFORE INSERT ON public.submission_feedback FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_audit AFTER INSERT ON public.submission_feedback FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_notify AFTER INSERT ON public.submission_feedback FOR EACH ROW EXECUTE FUNCTION public.notify_feedback();
CREATE OR REPLACE FUNCTION public.outbox_set_url() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.url := CASE NEW.kind WHEN 'document' THEN '/app?tab=docs' WHEN 'task' THEN '/app?tab=tasks' WHEN 'reminder' THEN '/app?tab=tasks'
    WHEN 'submission' THEN '/app?tab=subs' WHEN 'feedback' THEN '/app?tab=subs' WHEN 'progress' THEN '/app?tab=tasks' WHEN 'test' THEN '/app?tab=push' ELSE '/app' END;
  RETURN NEW;
END $$;