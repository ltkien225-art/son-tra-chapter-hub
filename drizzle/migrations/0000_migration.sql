
CREATE TABLE public.chapters(
  id text PRIMARY KEY CHECK (id ~ '^ch(0[1-9]|[1-3][0-9]|4[0-2])$'),
  name text NOT NULL UNIQUE,
  households integer CHECK (households IS NULL OR households >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.chapters(id,name,households) VALUES ('ch01', 'Thành Vinh 1', 547),('ch02', 'Thành Vinh 2', 537),('ch03', 'Thành Vinh 3', 492),('ch04', 'Thành Vinh 4', 465),('ch05', 'Thành Vinh 5', 517),('ch06', 'Thành Vinh 6', 549),('ch07', 'Lộc Phước 1', 500),('ch08', 'Lộc Phước 2', 496),('ch09', 'Thọ Quang', 473),('ch10', 'Mân Quang 1', 576),('ch11', 'Mân Quang 2', 456),('ch12', 'Thọ An 1', 506),('ch13', 'Thọ An 2', 598),('ch14', 'Nam Thọ', 530),('ch15', 'Quang Cư 1', 554),('ch16', 'Quang Cư 2', 513),('ch17', 'Tân Thái', 543),('ch18', 'Tân An', 485),('ch19', 'Tân Thuận', 518),('ch20', 'Tân Phú', 500),('ch21', 'Tân Lập', 474),('ch22', 'Mân Lập Đông', 501),('ch23', 'Mân Thái', 549),('ch24', 'Mân Lập Tây', 473),('ch25', 'Mân Quang 3', 450),('ch26', 'Cổ Mân', 507),('ch27', 'Vũng Thùng 1', 459),('ch28', 'Vũng Thùng 2', 593),('ch29', 'Vũng Thùng 3', 572),('ch30', 'Vũng Thùng 4', 476),('ch31', 'Nại Hiên Đông', 495),('ch32', 'Nại Thịnh 1', 521),('ch33', 'Nại Thịnh 2', 570),('ch34', 'Nại Hưng 1', 503),('ch35', 'Nại Hưng 2', 457),('ch36', 'Nại Hưng 3', 489),('ch37', 'Nại Hưng 4', 478),('ch38', 'Nại Hưng 5', 454),('ch39', 'Nại Hưng 6', 579),('ch40', 'Nại Hưng 7', 531),('ch41', 'Nại Hưng 8', 457),('ch42', 'Công An', NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.app_users(
  email text PRIMARY KEY CHECK (email = lower(email) AND email ~ '^[^@\s,]+@[^@\s,]+\.[^@\s,]+$'),
  office_role text CHECK (office_role IN ('admin','staff')),
  sensitive_access boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chapter_access(
  email text NOT NULL REFERENCES public.app_users(email) ON DELETE CASCADE,
  chapter_id text NOT NULL REFERENCES public.chapters(id),
  PRIMARY KEY(email, chapter_id)
);
CREATE TABLE public.access_requests(
  email text PRIMARY KEY,
  user_id uuid NOT NULL,
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.documents(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  code text NOT NULL DEFAULT '' CHECK (length(code) <= 80),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 20000),
  issuer text NOT NULL DEFAULT '' CHECK (length(issuer) <= 200),
  doc_date date,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','selected','office')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','withdrawn')),
  archived boolean NOT NULL DEFAULT false,
  is_test boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.document_recipients(
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chapter_id text NOT NULL REFERENCES public.chapters(id),
  read_at timestamptz,
  PRIMARY KEY(document_id, chapter_id)
);
CREATE TABLE public.tasks(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 10000),
  due_at date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','withdrawn','archived')),
  is_test boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.task_assignments(
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  chapter_id text NOT NULL REFERENCES public.chapters(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 2000),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(task_id, chapter_id)
);
CREATE TABLE public.submissions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id text NOT NULL REFERENCES public.chapters(id),
  kind text NOT NULL CHECK (kind IN ('report','activity','situation','feedback')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 10000),
  period text CHECK (period IS NULL OR period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','withdrawn')),
  is_test boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.member_counts(
  chapter_id text NOT NULL REFERENCES public.chapters(id),
  period text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  members_total integer NOT NULL CHECK (members_total >= 0),
  members_new integer NOT NULL DEFAULT 0 CHECK (members_new >= 0),
  members_left integer NOT NULL DEFAULT 0 CHECK (members_left >= 0),
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(chapter_id, period)
);
CREATE TABLE public.sensitive_cases(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id text NOT NULL REFERENCES public.chapters(id),
  category text NOT NULL CHECK (category IN ('violence','child','livelihood','health','other')),
  summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 300),
  details text NOT NULL DEFAULT '' CHECK (length(details) <= 10000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.attachments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('submission','document','sensitive_case')),
  owner_id uuid NOT NULL,
  path text NOT NULL UNIQUE,
  filename text NOT NULL CHECK (length(filename) BETWEEN 1 AND 200),
  mime text NOT NULL CHECK (mime IN ('application/pdf','image/jpeg','image/png','image/webp','image/heic')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (path LIKE owner_type || '/' || owner_id::text || '/%')
);
CREATE TABLE public.audit_log(
  id bigserial PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  chapter_id text,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.submissions(chapter_id, created_at DESC);
CREATE INDEX ON public.task_assignments(chapter_id, status);
CREATE INDEX ON public.attachments(owner_type, owner_id);
CREATE INDEX ON public.audit_log(at DESC);

-- ===== Permission helpers: re-evaluated against current tables on every request =====
CREATE FUNCTION public.current_email() RETURNS text LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT lower(coalesce(auth.jwt()->>'email','')) $$;
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT public.current_email() = 'ubmttqvnphuongsontra@gmail.com'
   OR EXISTS (SELECT 1 FROM app_users WHERE email = public.current_email() AND active AND office_role = 'admin') $$;
CREATE FUNCTION public.is_office() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT public.is_admin()
   OR EXISTS (SELECT 1 FROM app_users WHERE email = public.current_email() AND active AND office_role IN ('admin','staff')) $$;
CREATE FUNCTION public.has_sensitive() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT public.current_email() = 'ubmttqvnphuongsontra@gmail.com'
   OR EXISTS (SELECT 1 FROM app_users WHERE email = public.current_email() AND active AND sensitive_access) $$;
CREATE FUNCTION public.can_chapter(_ch text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT public.is_office() OR EXISTS (
     SELECT 1 FROM chapter_access ca JOIN app_users u ON u.email = ca.email
     WHERE ca.email = public.current_email() AND u.active AND ca.chapter_id = _ch) $$;
CREATE FUNCTION public.has_any_chapter() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM chapter_access ca JOIN app_users u ON u.email = ca.email
     WHERE ca.email = public.current_email() AND u.active) $$;
CREATE FUNCTION public.my_access() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT jsonb_build_object(
     'email', public.current_email(), 'admin', public.is_admin(), 'office', public.is_office(),
     'sensitive', public.has_sensitive(),
     'chapters', coalesce((SELECT jsonb_agg(ca.chapter_id ORDER BY ca.chapter_id) FROM chapter_access ca JOIN app_users u ON u.email=ca.email WHERE ca.email=public.current_email() AND u.active), '[]'::jsonb)) $$;

-- ===== Grants =====
GRANT SELECT ON public.chapters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users, public.chapter_access, public.access_requests,
  public.documents, public.document_recipients, public.tasks, public.task_assignments,
  public.submissions, public.member_counts, public.sensitive_cases, public.attachments TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.chapters, public.app_users, public.chapter_access, public.access_requests,
  public.documents, public.document_recipients, public.tasks, public.task_assignments,
  public.submissions, public.member_counts, public.sensitive_cases, public.attachments, public.audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO service_role;

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ===== Policies =====
CREATE POLICY ch_read ON public.chapters FOR SELECT TO authenticated USING (public.can_chapter(id));

CREATE POLICY au_read ON public.app_users FOR SELECT TO authenticated USING (public.is_office() OR email = public.current_email());
CREATE POLICY au_admin ON public.app_users FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ca_read ON public.chapter_access FOR SELECT TO authenticated USING (public.is_office() OR email = public.current_email());
CREATE POLICY ca_admin ON public.chapter_access FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY ar_read ON public.access_requests FOR SELECT TO authenticated USING (public.is_office() OR email = public.current_email());
CREATE POLICY ar_self ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (email = public.current_email() AND user_id = auth.uid() AND status = 'pending');
CREATE POLICY ar_admin_upd ON public.access_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ar_admin_del ON public.access_requests FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY doc_office ON public.documents FOR ALL TO authenticated USING (public.is_office()) WITH CHECK (public.is_office());
CREATE POLICY doc_chapter ON public.documents FOR SELECT TO authenticated USING (
  status = 'published' AND NOT archived AND (
    (scope = 'all' AND public.has_any_chapter())
    OR (scope = 'selected' AND EXISTS (SELECT 1 FROM public.document_recipients r WHERE r.document_id = id AND public.can_chapter(r.chapter_id)))));
CREATE POLICY dr_office ON public.document_recipients FOR ALL TO authenticated USING (public.is_office()) WITH CHECK (public.is_office());
CREATE POLICY dr_chapter ON public.document_recipients FOR SELECT TO authenticated USING (public.can_chapter(chapter_id));

CREATE POLICY task_office ON public.tasks FOR ALL TO authenticated USING (public.is_office()) WITH CHECK (public.is_office());
CREATE POLICY task_chapter ON public.tasks FOR SELECT TO authenticated USING (
  status = 'active' AND EXISTS (SELECT 1 FROM public.task_assignments a WHERE a.task_id = id AND public.can_chapter(a.chapter_id)));
CREATE POLICY ta_office ON public.task_assignments FOR ALL TO authenticated USING (public.is_office()) WITH CHECK (public.is_office());
CREATE POLICY ta_chapter ON public.task_assignments FOR SELECT TO authenticated USING (
  public.can_chapter(chapter_id) AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.status = 'active'));

CREATE POLICY sub_read ON public.submissions FOR SELECT TO authenticated USING (
  public.can_chapter(chapter_id) AND (status = 'submitted' OR created_by = public.current_email()));
CREATE POLICY sub_insert ON public.submissions FOR INSERT TO authenticated WITH CHECK (
  public.can_chapter(chapter_id) AND status = 'submitted');

CREATE POLICY mc_read ON public.member_counts FOR SELECT TO authenticated USING (public.can_chapter(chapter_id));
CREATE POLICY mc_ins ON public.member_counts FOR INSERT TO authenticated WITH CHECK (public.can_chapter(chapter_id));
CREATE POLICY mc_upd ON public.member_counts FOR UPDATE TO authenticated USING (public.can_chapter(chapter_id)) WITH CHECK (public.can_chapter(chapter_id));
CREATE POLICY mc_del ON public.member_counts FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY sc_read ON public.sensitive_cases FOR SELECT TO authenticated USING (public.has_sensitive() AND public.can_chapter(chapter_id));
CREATE POLICY sc_ins ON public.sensitive_cases FOR INSERT TO authenticated WITH CHECK (public.has_sensitive() AND public.can_chapter(chapter_id));
CREATE POLICY sc_upd ON public.sensitive_cases FOR UPDATE TO authenticated USING (public.has_sensitive() AND public.can_chapter(chapter_id)) WITH CHECK (public.has_sensitive() AND public.can_chapter(chapter_id));

CREATE POLICY audit_read ON public.audit_log FOR SELECT TO authenticated USING (public.is_office());

-- Attachment owner checks run as the caller, so the owner's own RLS decides access.
CREATE FUNCTION public.can_read_owner(_type text, _id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE _type
    WHEN 'submission' THEN EXISTS (SELECT 1 FROM submissions s WHERE s.id = _id AND (s.status = 'submitted' OR (public.can_chapter(s.chapter_id) AND s.created_by = public.current_email() AND NOT public.is_office() AND false)))
    WHEN 'document' THEN EXISTS (SELECT 1 FROM documents d WHERE d.id = _id)
    WHEN 'sensitive_case' THEN EXISTS (SELECT 1 FROM sensitive_cases c WHERE c.id = _id)
    ELSE false END $$;
CREATE FUNCTION public.can_write_owner(_type text, _id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE _type
    WHEN 'submission' THEN EXISTS (SELECT 1 FROM submissions s WHERE s.id = _id AND s.status = 'submitted' AND s.created_by = public.current_email())
    WHEN 'document' THEN public.is_office() AND EXISTS (SELECT 1 FROM documents d WHERE d.id = _id)
    WHEN 'sensitive_case' THEN EXISTS (SELECT 1 FROM sensitive_cases c WHERE c.id = _id)
    ELSE false END $$;
CREATE POLICY att_read ON public.attachments FOR SELECT TO authenticated USING (public.can_read_owner(owner_type, owner_id));
CREATE POLICY att_ins ON public.attachments FOR INSERT TO authenticated WITH CHECK (public.can_write_owner(owner_type, owner_id));
CREATE POLICY att_del ON public.attachments FOR DELETE TO authenticated USING (public.is_admin() OR (created_by = public.current_email() AND public.can_write_owner(owner_type, owner_id)));

-- ===== Actor stamping (cannot be forged by client) =====
CREATE FUNCTION public.stamp_actor() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE me text := public.current_email();
BEGIN
  IF me <> '' THEN
    IF TG_TABLE_NAME IN ('member_counts','task_assignments','app_users') THEN NEW.updated_by := me;
    ELSIF TG_OP = 'INSERT' THEN NEW.created_by := me;
    ELSE NEW.created_by := OLD.created_by; END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.sensitive_cases FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_stamp BEFORE INSERT ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.member_counts FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();

-- ===== Atomic audit (same transaction; ids only, no body/PII) =====
CREATE FUNCTION public.write_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; rid text; ch text; act text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  act := lower(TG_OP);
  IF TG_TABLE_NAME = 'submissions' AND TG_OP = 'UPDATE' AND NEW.status = 'withdrawn' AND OLD.status <> 'withdrawn' THEN act := 'withdraw'; END IF;
  IF TG_TABLE_NAME = 'documents' AND TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN act := 'status:' || NEW.status; END IF;
  IF TG_TABLE_NAME IN ('documents','tasks') AND TG_OP = 'UPDATE' AND to_jsonb(NEW)->>'archived' IS DISTINCT FROM to_jsonb(OLD)->>'archived' THEN act := CASE WHEN (to_jsonb(NEW)->>'archived')::boolean THEN 'archive' ELSE 'restore' END; END IF;
  rid := coalesce(to_jsonb(r)->>'id', (to_jsonb(r)->>'task_id') || ':' || (to_jsonb(r)->>'chapter_id'),
                  (to_jsonb(r)->>'chapter_id') || ':' || (to_jsonb(r)->>'period'), to_jsonb(r)->>'email', '?');
  IF TG_TABLE_NAME = 'chapter_access' THEN rid := (to_jsonb(r)->>'email') || ':' || (to_jsonb(r)->>'chapter_id'); END IF;
  ch := to_jsonb(r)->>'chapter_id';
  INSERT INTO audit_log(actor, action, resource_type, resource_id, chapter_id)
  VALUES (coalesce(nullif(public.current_email(),''),'system'), act, TG_TABLE_NAME, rid, ch);
  RETURN NULL;
END $$;
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.member_counts FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.sensitive_cases FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.write_audit();
CREATE TRIGGER t_audit AFTER INSERT OR DELETE ON public.chapter_access FOR EACH ROW EXECUTE FUNCTION public.write_audit();

-- ===== RPCs =====
CREATE FUNCTION public.withdraw_submission(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM submissions WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_chapter(s.chapter_id) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.created_by <> public.current_email() AND NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF s.status <> 'submitted' THEN RAISE EXCEPTION 'not_withdrawable' USING ERRCODE = 'P0001'; END IF;
  UPDATE submissions SET status = 'withdrawn' WHERE id = _id AND status = 'submitted';
END $$;

CREATE FUNCTION public.list_submissions(_chapter text DEFAULT NULL, _kind text DEFAULT NULL, _status text DEFAULT NULL, _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS TABLE(id uuid, chapter_id text, kind text, title text, body text, period text, status text, created_by text, created_at timestamptz, updated_at timestamptz, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.chapter_id, s.kind, s.title,
    CASE WHEN s.status = 'withdrawn' AND s.created_by <> public.current_email() THEN NULL ELSE s.body END,
    s.period, s.status, s.created_by, s.created_at, s.updated_at, count(*) OVER ()
  FROM submissions s
  WHERE public.can_chapter(s.chapter_id)
    AND (_chapter IS NULL OR s.chapter_id = _chapter)
    AND (_kind IS NULL OR s.kind = _kind)
    AND (_status IS NULL OR s.status = _status)
  ORDER BY s.created_at DESC
  LIMIT least(greatest(_limit,1),100) OFFSET greatest(_offset,0) $$;

CREATE FUNCTION public.update_assignment(_task uuid, _chapter text, _status text, _progress int, _note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_chapter(_chapter) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = _task AND status = 'active') THEN RAISE EXCEPTION 'task_not_active' USING ERRCODE = 'P0001'; END IF;
  UPDATE task_assignments SET status = _status, progress = _progress, note = coalesce(_note,'')
   WHERE task_id = _task AND chapter_id = _chapter;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
END $$;

CREATE FUNCTION public.mark_document_read(_doc uuid, _chapter text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_chapter(_chapter) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE document_recipients SET read_at = coalesce(read_at, now()) WHERE document_id = _doc AND chapter_id = _chapter
    AND EXISTS (SELECT 1 FROM documents d WHERE d.id = _doc AND d.status = 'published');
END $$;

CREATE FUNCTION public.set_user_access(_email text, _office_role text, _sensitive boolean, _chapters text[], _note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email));
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF e = 'ubmttqvnphuongsontra@gmail.com' THEN RAISE EXCEPTION 'bootstrap_admin_fixed' USING ERRCODE = 'P0001'; END IF;
  IF _office_role IS NOT NULL AND _office_role NOT IN ('admin','staff') THEN RAISE EXCEPTION 'bad_role'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(coalesce(_chapters,'{}')) c WHERE c NOT IN (SELECT id FROM chapters)) THEN RAISE EXCEPTION 'bad_chapter'; END IF;
  INSERT INTO app_users(email, office_role, sensitive_access, active, note) VALUES (e, _office_role, coalesce(_sensitive,false), true, coalesce(_note,''))
  ON CONFLICT (email) DO UPDATE SET office_role = EXCLUDED.office_role, sensitive_access = EXCLUDED.sensitive_access, active = true, note = EXCLUDED.note;
  DELETE FROM chapter_access WHERE email = e AND chapter_id <> ALL(coalesce(_chapters,'{}'));
  INSERT INTO chapter_access(email, chapter_id) SELECT e, c FROM unnest(coalesce(_chapters,'{}')) c ON CONFLICT DO NOTHING;
  UPDATE access_requests SET status = 'approved', updated_at = now() WHERE email = e;
END $$;

CREATE FUNCTION public.revoke_user_access(_email text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email));
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF e = 'ubmttqvnphuongsontra@gmail.com' THEN RAISE EXCEPTION 'bootstrap_admin_fixed' USING ERRCODE = 'P0001'; END IF;
  UPDATE app_users SET active = false, office_role = NULL, sensitive_access = false WHERE email = e;
  DELETE FROM chapter_access WHERE email = e;
END $$;

CREATE FUNCTION public.office_summary(_period text DEFAULT NULL) RETURNS TABLE(
  chapter_id text, name text, households integer, period text, members_total integer, members_new integer, members_left integer,
  submissions_count bigint, open_tasks bigint, overdue_tasks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.households, m.period, m.members_total, m.members_new, m.members_left,
    (SELECT count(*) FROM submissions s WHERE s.chapter_id = c.id AND s.status = 'submitted'),
    (SELECT count(*) FROM task_assignments a JOIN tasks t ON t.id = a.task_id WHERE a.chapter_id = c.id AND t.status = 'active' AND a.status <> 'completed'),
    (SELECT count(*) FROM task_assignments a JOIN tasks t ON t.id = a.task_id WHERE a.chapter_id = c.id AND t.status = 'active' AND a.status <> 'completed' AND t.due_at < current_date)
  FROM chapters c
  LEFT JOIN LATERAL (SELECT * FROM member_counts mc WHERE mc.chapter_id = c.id AND (_period IS NULL OR mc.period = _period) ORDER BY mc.period DESC LIMIT 1) m ON true
  WHERE public.can_chapter(c.id)
  ORDER BY c.id $$;

-- Backup excludes sensitive cases and file bytes by design.
CREATE FUNCTION public.export_backup() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('format','hoi-lhpn-son-tra-backup','version',1,'exported_at',now(),
    'chapters',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM chapters c),
    'documents',(SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]') FROM documents d),
    'document_recipients',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM document_recipients r),
    'tasks',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') FROM tasks t),
    'task_assignments',(SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]') FROM task_assignments a),
    'submissions',(SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') FROM submissions s),
    'member_counts',(SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') FROM member_counts m));
END $$;

-- Restore never deletes or overwrites: inserts only missing rows, after verifying the 42-chapter catalogue matches.
CREATE FUNCTION public.restore_backup(_b jsonb, _dry_run boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb := '{}'; n int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _b->>'format' IS DISTINCT FROM 'hoi-lhpn-son-tra-backup' OR (_b->>'version')::int <> 1 THEN RAISE EXCEPTION 'invalid_backup_format'; END IF;
  IF (SELECT count(*) FROM jsonb_to_recordset(_b->'chapters') AS x(id text, name text, households int)
       JOIN chapters c ON c.id = x.id AND c.name = x.name AND c.households IS NOT DISTINCT FROM x.households) <> 42
     OR jsonb_array_length(_b->'chapters') <> 42 THEN RAISE EXCEPTION 'chapter_catalogue_mismatch'; END IF;
  INSERT INTO documents SELECT * FROM jsonb_populate_recordset(NULL::documents, _b->'documents') ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('documents', n);
  INSERT INTO document_recipients SELECT * FROM jsonb_populate_recordset(NULL::document_recipients, _b->'document_recipients') ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('document_recipients', n);
  INSERT INTO tasks SELECT * FROM jsonb_populate_recordset(NULL::tasks, _b->'tasks') ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('tasks', n);
  INSERT INTO task_assignments SELECT * FROM jsonb_populate_recordset(NULL::task_assignments, _b->'task_assignments') ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('task_assignments', n);
  INSERT INTO submissions SELECT * FROM jsonb_populate_recordset(NULL::submissions, _b->'submissions') ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('submissions', n);
  INSERT INTO member_counts SELECT * FROM jsonb_populate_recordset(NULL::member_counts, _b->'member_counts') ON CONFLICT DO NOTHING; GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('member_counts', n);
  IF _dry_run THEN RAISE EXCEPTION 'DRY_RUN:%', res::text USING ERRCODE = 'P0003'; END IF;
  RETURN res;
END $$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_email(), public.is_admin(), public.is_office(), public.has_sensitive(), public.can_chapter(text),
  public.has_any_chapter(), public.my_access(), public.can_read_owner(text,uuid), public.can_write_owner(text,uuid),
  public.withdraw_submission(uuid), public.list_submissions(text,text,text,int,int), public.update_assignment(uuid,text,text,int,text),
  public.mark_document_read(uuid,text), public.set_user_access(text,text,boolean,text[],text), public.revoke_user_access(text),
  public.office_summary(text), public.export_backup(), public.restore_backup(jsonb,boolean) TO authenticated;
