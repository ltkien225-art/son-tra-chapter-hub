CREATE TABLE public.legal_faqs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL DEFAULT 'Chung' CHECK (length(topic) BETWEEN 1 AND 80),
  question text NOT NULL CHECK (length(question) BETWEEN 5 AND 500),
  answer text NOT NULL CHECK (length(answer) BETWEEN 5 AND 6000),
  source_title text NOT NULL DEFAULT '' CHECK (length(source_title) <= 300),
  source_article text NOT NULL DEFAULT '' CHECK (length(source_article) <= 200),
  source_url text NOT NULL DEFAULT '' CHECK (source_url = '' OR source_url ~ '^https://'),
  effective_date date,
  verified_on date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','retired')),
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approved_needs_source CHECK (status <> 'approved' OR (source_title <> '' AND source_url <> '' AND verified_on IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_faqs TO authenticated;
GRANT ALL ON public.legal_faqs TO service_role;
ALTER TABLE public.legal_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq read" ON public.legal_faqs FOR SELECT TO authenticated
  USING (public.is_office() OR (status = 'approved' AND public.has_any_chapter()));
CREATE POLICY "faq office insert" ON public.legal_faqs FOR INSERT TO authenticated WITH CHECK (public.is_office());
CREATE POLICY "faq office update" ON public.legal_faqs FOR UPDATE TO authenticated USING (public.is_office()) WITH CHECK (public.is_office());
CREATE POLICY "faq office delete" ON public.legal_faqs FOR DELETE TO authenticated USING (public.is_office());
CREATE TRIGGER t_stamp BEFORE INSERT OR UPDATE ON public.legal_faqs FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE OR DELETE ON public.legal_faqs FOR EACH ROW EXECUTE FUNCTION public.write_audit();

CREATE TABLE public.legal_questions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id text REFERENCES public.chapters(id),
  body text NOT NULL CHECK (length(body) BETWEEN 5 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
  reply text CHECK (reply IS NULL OR length(reply) <= 6000),
  replied_by text,
  replied_at timestamptz,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.legal_questions TO authenticated;
GRANT ALL ON public.legal_questions TO service_role;
ALTER TABLE public.legal_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lq read own or office" ON public.legal_questions FOR SELECT TO authenticated
  USING (public.is_office() OR (created_by = public.current_email() AND public.has_any_chapter()));
CREATE POLICY "lq insert member" ON public.legal_questions FOR INSERT TO authenticated
  WITH CHECK ((public.is_office() OR public.has_any_chapter()) AND (chapter_id IS NULL OR public.can_chapter(chapter_id)) AND status = 'open' AND reply IS NULL);
CREATE TRIGGER t_stamp BEFORE INSERT ON public.legal_questions FOR EACH ROW EXECUTE FUNCTION public.stamp_actor();
CREATE TRIGGER t_audit AFTER INSERT OR UPDATE ON public.legal_questions FOR EACH ROW EXECUTE FUNCTION public.write_audit();

CREATE FUNCTION public.answer_legal_question(_id uuid, _reply text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_office() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(coalesce(_reply,'')) < 2 OR length(_reply) > 6000 THEN RAISE EXCEPTION 'invalid reply'; END IF;
  UPDATE legal_questions SET reply = _reply, status = 'answered', replied_by = public.current_email(), replied_at = now(), updated_at = now() WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.answer_legal_question(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.answer_legal_question(uuid, text) TO authenticated;

CREATE TABLE public.legal_ai_usage(
  email text NOT NULL,
  day date NOT NULL DEFAULT current_date,
  n int NOT NULL DEFAULT 0,
  PRIMARY KEY (email, day)
);
GRANT ALL ON public.legal_ai_usage TO service_role;
ALTER TABLE public.legal_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.consume_legal_ai(_limit int) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me text := public.current_email(); used int;
BEGIN
  IF me = '' OR NOT (public.is_office() OR public.has_any_chapter()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO legal_ai_usage(email, day, n) VALUES (me, current_date, 1)
  ON CONFLICT (email, day) DO UPDATE SET n = legal_ai_usage.n + 1
  WHERE legal_ai_usage.n < least(greatest(_limit,1), 50)
  RETURNING n INTO used;
  RETURN coalesce(used, -1);
END $$;
REVOKE ALL ON FUNCTION public.consume_legal_ai(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_legal_ai(int) TO authenticated;