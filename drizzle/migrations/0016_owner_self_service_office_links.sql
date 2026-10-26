CREATE OR REPLACE FUNCTION public.create_office_daily_link(p_token_hash text, p_label text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid:=gen_random_uuid(); v_email text;
BEGIN
 IF public.current_email() <> 'ubmttqvnphuongsontra@gmail.com' OR auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
 IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR length(coalesce(p_label,''))>120 THEN RAISE EXCEPTION 'invalid_input' USING errcode='22023'; END IF;
 v_email:='vp-link-'||replace(v_id::text,'-','')||'@ma-truy-cap.hoisontra.app';
 INSERT INTO public.office_daily_links(id,token_hash,identity_email,label,created_by) VALUES(v_id,p_token_hash,v_email,btrim(coalesce(p_label,'')),public.current_email());
 INSERT INTO public.app_users(email,office_role,sensitive_access,active,note) VALUES(v_email,'admin',false,true,'Liên kết Văn phòng dùng chung');
 INSERT INTO public.audit_log(actor,action,resource_type,resource_id) VALUES(public.current_email(),'create_office_daily_link','office_daily_links',v_id::text);
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.revoke_office_daily_link(p_id uuid,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_email text;
BEGIN
 IF public.current_email()<>'ubmttqvnphuongsontra@gmail.com' OR auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
 UPDATE public.office_daily_links SET active=false,revoked_at=now(),revoke_reason=left(btrim(coalesce(p_reason,'')),300) WHERE id=p_id AND active RETURNING identity_email INTO v_email;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING errcode='P0002'; END IF;
 UPDATE public.app_users SET active=false WHERE email=v_email;
 UPDATE public.push_subscriptions SET disabled=true WHERE email=v_email;
 INSERT INTO public.audit_log(actor,action,resource_type,resource_id) VALUES(public.current_email(),'revoke_office_daily_link','office_daily_links',p_id::text);
END $$;
ALTER POLICY odl_admin_read ON public.office_daily_links USING (auth.uid() IS NOT NULL AND public.current_email()='ubmttqvnphuongsontra@gmail.com');
CREATE OR REPLACE FUNCTION public.office_daily_link_lookup_service(p_token_hash text) RETURNS TABLE(identity_email text) LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.office_daily_links l SET last_used_at=now() WHERE l.token_hash=p_token_hash AND l.active AND EXISTS(SELECT 1 FROM public.app_users u WHERE u.email=l.identity_email AND u.active AND u.office_role='admin') RETURNING l.identity_email
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.current_email()='ubmttqvnphuongsontra@gmail.com' OR EXISTS(SELECT 1 FROM public.app_users u WHERE u.email=public.current_email() AND u.active AND u.office_role='admin' AND (u.email NOT LIKE 'vp-link-%@ma-truy-cap.hoisontra.app' OR EXISTS(SELECT 1 FROM public.office_daily_links l WHERE l.identity_email=u.email AND l.active)))
$$;
CREATE OR REPLACE FUNCTION public.has_sensitive() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.current_email()='ubmttqvnphuongsontra@gmail.com' OR EXISTS(SELECT 1 FROM public.app_users u WHERE u.email=public.current_email() AND u.active AND u.sensitive_access AND u.email NOT LIKE 'vp-link-%@ma-truy-cap.hoisontra.app')
$$;
REVOKE ALL ON FUNCTION public.create_office_daily_link(text,text),public.revoke_office_daily_link(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_office_daily_link(text,text),public.revoke_office_daily_link(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.office_daily_link_lookup_service(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.office_daily_link_lookup_service(text) TO service_role;