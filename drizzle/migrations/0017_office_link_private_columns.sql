REVOKE SELECT ON public.office_daily_links FROM authenticated;
GRANT SELECT(id,label,active,created_by,created_at,last_used_at,revoked_at,revoke_reason) ON public.office_daily_links TO authenticated;
CREATE OR REPLACE FUNCTION public.is_office() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_admin() OR EXISTS(SELECT 1 FROM public.app_users u WHERE u.email=public.current_email() AND u.active AND u.office_role IN('admin','staff') AND (u.email NOT LIKE 'vp-link-%@ma-truy-cap.hoisontra.app' OR EXISTS(SELECT 1 FROM public.office_daily_links l WHERE l.identity_email=u.email AND l.active)))
$$;