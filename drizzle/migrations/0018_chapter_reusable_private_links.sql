CREATE TABLE public.chapter_private_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), chapter_id text NOT NULL REFERENCES public.chapters(id), token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'), token_cipher text NOT NULL, identity_email text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
GRANT SELECT(id,chapter_id,active,created_at,revoked_at) ON public.chapter_private_links TO authenticated;
GRANT ALL ON public.chapter_private_links TO service_role;
ALTER TABLE public.chapter_private_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY chapter_links_admin_metadata ON public.chapter_private_links FOR SELECT TO authenticated USING(public.is_admin());
CREATE UNIQUE INDEX chapter_one_active_private_link ON public.chapter_private_links(chapter_id) WHERE active;
CREATE FUNCTION public.chapter_link_allows(_email text,_chapter text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT _email NOT LIKE 'so-link-%@ma-truy-cap.hoisontra.app' OR EXISTS(SELECT 1 FROM public.chapter_private_links l WHERE l.identity_email=_email AND l.chapter_id=_chapter AND l.active) $$;
REVOKE ALL ON FUNCTION public.chapter_link_allows(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.chapter_link_allows(text,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.current_email()='ubmttqvnphuongsontra@gmail.com' OR EXISTS(SELECT 1 FROM public.app_users u WHERE u.email=public.current_email() AND u.active AND u.office_role='admin' AND u.email NOT LIKE 'so-link-%@ma-truy-cap.hoisontra.app' AND (u.email NOT LIKE 'vp-link-%@ma-truy-cap.hoisontra.app' OR EXISTS(SELECT 1 FROM public.office_daily_links l WHERE l.identity_email=u.email AND l.active))) $$;
CREATE OR REPLACE FUNCTION public.is_office() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_admin() OR EXISTS(SELECT 1 FROM public.app_users u WHERE u.email=public.current_email() AND u.active AND u.office_role IN('admin','staff') AND u.email NOT LIKE 'so-link-%@ma-truy-cap.hoisontra.app' AND (u.email NOT LIKE 'vp-link-%@ma-truy-cap.hoisontra.app' OR EXISTS(SELECT 1 FROM public.office_daily_links l WHERE l.identity_email=u.email AND l.active))) $$;
CREATE OR REPLACE FUNCTION public.has_sensitive() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.current_email()='ubmttqvnphuongsontra@gmail.com' OR EXISTS(SELECT 1 FROM public.app_users u WHERE u.email=public.current_email() AND u.active AND u.sensitive_access AND u.email NOT LIKE 'vp-link-%@ma-truy-cap.hoisontra.app' AND u.email NOT LIKE 'so-link-%@ma-truy-cap.hoisontra.app') $$;
CREATE OR REPLACE FUNCTION public.can_chapter(_ch text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_office() OR EXISTS(SELECT 1 FROM public.chapter_access ca JOIN public.app_users u ON u.email=ca.email WHERE ca.email=public.current_email() AND u.active AND ca.chapter_id=_ch AND public.chapter_link_allows(ca.email,ca.chapter_id)) $$;
CREATE OR REPLACE FUNCTION public.has_any_chapter() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.chapter_access ca JOIN public.app_users u ON u.email=ca.email WHERE ca.email=public.current_email() AND u.active AND public.chapter_link_allows(ca.email,ca.chapter_id)) $$;
CREATE OR REPLACE FUNCTION public.my_access() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('email',public.current_email(),'admin',public.is_admin(),'office',public.is_office(),'sensitive',public.has_sensitive(),'chapters',coalesce((SELECT jsonb_agg(ca.chapter_id ORDER BY ca.chapter_id) FROM public.chapter_access ca JOIN public.app_users u ON u.email=ca.email WHERE ca.email=public.current_email() AND u.active AND public.chapter_link_allows(ca.email,ca.chapter_id)),'[]'::jsonb)) $$;
CREATE OR REPLACE FUNCTION public.chapter_recipients(_chs text[]) RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT DISTINCT ca.email FROM public.chapter_access ca JOIN public.app_users u ON u.email=ca.email WHERE u.active AND ca.chapter_id=ANY(_chs) AND public.chapter_link_allows(ca.email,ca.chapter_id) $$;
CREATE FUNCTION public.manage_chapter_private_link(p_chapter text,p_action text,p_hash text DEFAULT NULL,p_cipher text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_email text; v_old uuid;
BEGIN
 IF NOT public.is_admin() OR auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
 PERFORM 1 FROM public.chapters WHERE id=p_chapter FOR UPDATE;
 IF NOT FOUND OR p_action NOT IN('issue','rotate','revoke') THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT id INTO v_old FROM public.chapter_private_links WHERE chapter_id=p_chapter AND active;
 IF p_action='issue' AND v_old IS NOT NULL THEN RETURN v_old; END IF;
 IF p_action IN('issue','rotate') AND (p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_cipher IS NULL OR length(p_cipher)>1000 OR length(p_cipher)<40) THEN RAISE EXCEPTION 'invalid_input'; END IF;
 IF v_old IS NOT NULL THEN
  UPDATE public.chapter_private_links SET active=false,revoked_at=now() WHERE id=v_old RETURNING identity_email INTO v_email;
  UPDATE public.app_users SET active=false WHERE email=v_email;
  UPDATE public.push_subscriptions SET disabled=true WHERE email=v_email;
 END IF;
 IF p_action='revoke' THEN
  INSERT INTO public.audit_log(actor,action,resource_type,resource_id,chapter_id) VALUES(public.current_email(),'revoke_chapter_link','chapter_private_links',coalesce(v_old::text,p_chapter),p_chapter);
  RETURN v_old;
 END IF;
 v_id:=gen_random_uuid(); v_email:='so-link-'||p_chapter||'-'||replace(v_id::text,'-','')||'@ma-truy-cap.hoisontra.app';
 INSERT INTO public.app_users(email,office_role,sensitive_access,active,note) VALUES(v_email,NULL,false,true,'Liên kết Sổ Chi hội');
 INSERT INTO public.chapter_private_links(id,chapter_id,token_hash,token_cipher,identity_email,created_by) VALUES(v_id,p_chapter,p_hash,p_cipher,v_email,public.current_email());
 INSERT INTO public.chapter_access(email,chapter_id) VALUES(v_email,p_chapter);
 INSERT INTO public.audit_log(actor,action,resource_type,resource_id,chapter_id) VALUES(public.current_email(),p_action||'_chapter_link','chapter_private_links',v_id::text,p_chapter);
 RETURN v_id;
END $$;
CREATE FUNCTION public.chapter_private_link_cipher(p_chapter text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_admin() OR auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF; RETURN (SELECT token_cipher FROM public.chapter_private_links WHERE chapter_id=p_chapter AND active); END $$;
CREATE FUNCTION public.chapter_private_link_lookup_service(p_chapter text,p_hash text) RETURNS TABLE(identity_email text) LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT l.identity_email FROM public.chapter_private_links l JOIN public.app_users u ON u.email=l.identity_email WHERE l.chapter_id=p_chapter AND l.token_hash=p_hash AND l.active AND u.active AND u.office_role IS NULL AND NOT u.sensitive_access $$;
REVOKE ALL ON FUNCTION public.manage_chapter_private_link(text,text,text,text),public.chapter_private_link_cipher(text),public.chapter_private_link_lookup_service(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_chapter_private_link(text,text,text,text),public.chapter_private_link_cipher(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chapter_private_link_lookup_service(text,text) TO service_role;
COMMENT ON TABLE public.unit_logins IS 'DEPRECATED for chapter UI: replaced by chapter_private_links; legacy sessions and office access retained during additive transition.';