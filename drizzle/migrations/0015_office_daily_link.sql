-- Liên kết Văn phòng dùng hằng ngày (/van-phong#k=...): MỘT link riêng mở được đồng thời nhiều máy
-- (Chủ tịch/Bí thư/cấp phó), không bind thiết bị, không hỏi mã mỗi máy.
-- Chỉ lưu SHA-256 hash; token nằm trong fragment URL, không gửi dạng thô, không log, không repo.
-- Mỗi link có danh tính riêng; thu hồi link → danh tính mất quyền ngay ở mọi request (RLS kiểm tra mỗi lần).

CREATE TABLE public.office_daily_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  identity_email text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text
);
GRANT SELECT (id, label, active, created_by, created_at, last_used_at, revoked_at, revoke_reason) ON public.office_daily_links TO authenticated;
GRANT ALL ON public.office_daily_links TO service_role;
ALTER TABLE public.office_daily_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY odl_admin_read ON public.office_daily_links FOR SELECT TO authenticated USING (public.is_admin());

-- Quản trị cấp liên kết mới (token tạo + băm ở server function; chỉ hash được lưu, token thô hiện một lần).
CREATE FUNCTION public.create_office_daily_link(p_token_hash text, p_label text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := gen_random_uuid(); v_email text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR length(coalesce(p_label,'')) > 120 THEN
    RAISE EXCEPTION 'Yêu cầu không hợp lệ' USING errcode='22023';
  END IF;
  v_email := 'vp-link-' || substr(replace(v_id::text, '-', ''), 1, 12) || '@ma-truy-cap.hoisontra.app';
  INSERT INTO office_daily_links(id, token_hash, identity_email, label, created_by)
  VALUES (v_id, p_token_hash, v_email, btrim(coalesce(p_label,'')), public.current_email());
  INSERT INTO app_users(email, office_role, sensitive_access, active, note)
  VALUES (v_email, 'admin', false, true, 'Mở /van-phong bằng liên kết riêng dùng hằng ngày');
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES (public.current_email(), 'create_office_daily_link', 'office_daily_links', v_id::text);
  RETURN v_id;
END $$;

-- Thu hồi: link không mở được máy mới; mọi phiên đang mở bằng link mất quyền ở request kế tiếp.
CREATE FUNCTION public.revoke_office_daily_link(p_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  IF public.current_email() LIKE 'vp-link-%@ma-truy-cap.hoisontra.app' THEN
    RAISE EXCEPTION 'Không tự thu hồi bằng phiên liên kết hằng ngày; hãy dùng mã bảo vệ hoặc email quản trị dự phòng' USING errcode='42501';
  END IF;
  UPDATE office_daily_links SET active=false, revoked_at=now(), revoke_reason=btrim(coalesce(p_reason,''))
  WHERE id=p_id AND active RETURNING identity_email INTO v_email;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING errcode='P0002'; END IF;
  UPDATE app_users SET active=false WHERE email=v_email;
  UPDATE push_subscriptions SET disabled=true WHERE email=v_email;
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES (public.current_email(), 'revoke_office_daily_link', 'office_daily_links', p_id::text);
END $$;

-- Đổi token lấy phiên: dùng nhiều lần, nhiều máy đồng thời, mỗi máy một phiên độc lập. Chỉ service_role.
CREATE FUNCTION public.office_daily_link_lookup_service(p_token_hash text)
RETURNS TABLE(identity_email text) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE office_daily_links SET last_used_at = now()
  WHERE token_hash = p_token_hash AND active
  RETURNING identity_email
$$;

REVOKE ALL ON FUNCTION public.create_office_daily_link(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_office_daily_link(text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_office_daily_link(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_office_daily_link(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.office_daily_link_lookup_service(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.office_daily_link_lookup_service(text) TO service_role;
