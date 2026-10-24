
CREATE OR REPLACE FUNCTION public.task_is_active(_task uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM tasks WHERE id = _task AND status = 'active') $$;
CREATE OR REPLACE FUNCTION public.task_assigned_to_me(_task uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM task_assignments a WHERE a.task_id = _task AND public.can_chapter(a.chapter_id)) $$;
CREATE OR REPLACE FUNCTION public.doc_addressed_to_me(_doc uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM document_recipients r WHERE r.document_id = _doc AND public.can_chapter(r.chapter_id)) $$;
REVOKE EXECUTE ON FUNCTION public.task_is_active(uuid), public.task_assigned_to_me(uuid), public.doc_addressed_to_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.task_is_active(uuid), public.task_assigned_to_me(uuid), public.doc_addressed_to_me(uuid) TO authenticated;

DROP POLICY task_chapter ON public.tasks;
CREATE POLICY task_chapter ON public.tasks FOR SELECT TO authenticated USING (status = 'active' AND public.task_assigned_to_me(id));
DROP POLICY ta_chapter ON public.task_assignments;
CREATE POLICY ta_chapter ON public.task_assignments FOR SELECT TO authenticated USING (public.can_chapter(chapter_id) AND public.task_is_active(task_id));
DROP POLICY doc_chapter ON public.documents;
CREATE POLICY doc_chapter ON public.documents FOR SELECT TO authenticated USING (
  status = 'published' AND NOT archived AND ((scope = 'all' AND public.has_any_chapter()) OR (scope = 'selected' AND public.doc_addressed_to_me(id))));
