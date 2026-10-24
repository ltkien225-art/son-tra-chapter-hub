CREATE OR REPLACE FUNCTION public.outbox_set_url() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.url := CASE NEW.kind WHEN 'document' THEN '/app?tab=docs' WHEN 'task' THEN '/app?tab=tasks' WHEN 'reminder' THEN '/app?tab=tasks'
    WHEN 'submission' THEN '/app?tab=subs' WHEN 'progress' THEN '/app?tab=tasks' WHEN 'test' THEN '/app?tab=push' ELSE '/app' END;
  RETURN NEW;
END $$;
CREATE TRIGGER t_url BEFORE INSERT ON public.notification_outbox FOR EACH ROW EXECUTE FUNCTION public.outbox_set_url();

CREATE OR REPLACE FUNCTION public.notify_chapter_updates() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_TABLE_NAME = 'task_assignments' THEN
    IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.progress IS DISTINCT FROM NEW.progress) AND NOT public.is_office() THEN
      PERFORM public.enqueue(ARRAY(SELECT public.office_recipients()), 'progress',
        CASE WHEN NEW.status = 'completed' THEN 'Chi hội hoàn thành nhiệm vụ' ELSE 'Chi hội cập nhật tiến độ' END,
        'Có cập nhật tiến độ nhiệm vụ. Mở ứng dụng để xem.',
        'prog:' || NEW.task_id || ':' || NEW.chapter_id || ':' || NEW.status || ':' || NEW.progress);
    END IF;
  ELSIF TG_TABLE_NAME = 'submissions' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'withdrawn' THEN
      PERFORM public.enqueue(ARRAY(SELECT public.office_recipients()), 'submission', 'Chi hội đã thu hồi một mục',
        'Một mục gửi lên đã được thu hồi. Mở ứng dụng để xem.', 'subwd:' || NEW.id);
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER t_notify_upd AFTER UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.notify_chapter_updates();
CREATE TRIGGER t_notify_upd AFTER UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.notify_chapter_updates();