-- Mã bảo vệ Văn phòng (/van-phong, không cần email) + liên kết tiếp nhận quản trị một lần (/tiep-nhan).
-- Mô hình tương đương Bộ Đoàn: chỉ lưu SHA-256 hash; tra cứu đổi phiên chỉ qua service_role.

CREATE TABLE public.office_code (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  code_hash text NOT NULL,
  identity_email text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT ALL ON public.office_code TO service_role;
ALTER TABLE public.office_code ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.handover_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, label, active, used_at, expires_at, created_by, created_at) ON public.handover_invites TO authenticated;
GRANT ALL ON public.handover_invites TO service_role;
ALTER TABLE public.handover_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY hi_admin_read ON public.handover_invites FOR SELECT TO authenticated USING (public.is_admin());

-- Chống dò mã/liên kết theo IP (chỉ lưu hash IP).
CREATE TABLE public.link_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX link_attempts_ip_time ON public.link_attempts(ip_hash, created_at);
GRANT ALL ON public.link_attempts TO service_role;
ALTER TABLE public.link_attempts ENABLE ROW LEVEL SECURITY;

-- Quản trị đặt/đổi mã bảo vệ Văn phòng (client gửi hash SHA-256, mã thô không rời thiết bị).
CREATE FUNCTION public.set_office_code(p_code_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  IF p_code_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Mã không hợp lệ' USING errcode='22023'; END IF;
  INSERT INTO office_code(id, code_hash, identity_email, active, updated_by)
  VALUES (true, p_code_hash, 'ma-van-phong@ma-truy-cap.hoisontra.app', true, public.current_email())
  ON CONFLICT (id) DO UPDATE SET code_hash=EXCLUDED.code_hash, active=true, updated_by=public.current_email(), updated_at=now();
  INSERT INTO app_users(email, office_role, sensitive_access, active, note)
  VALUES ('ma-van-phong@ma-truy-cap.hoisontra.app', 'admin', false, true, 'Mở /van-phong bằng mã bảo vệ Văn phòng')
  ON CONFLICT (email) DO UPDATE SET office_role='admin', active=true;
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES (public.current_email(), 'set_office_code', 'office_code', 'office');
END $$;

-- Thu hồi mã: phiên đang mở bằng mã mất quyền ở thao tác kế tiếp (RLS kiểm tra mỗi request).
CREATE FUNCTION public.revoke_office_code(p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  IF public.current_email() = 'ma-van-phong@ma-truy-cap.hoisontra.app' THEN
    RAISE EXCEPTION 'Không tự thu hồi mã đang dùng; hãy đăng nhập email quản trị dự phòng' USING errcode='42501';
  END IF;
  UPDATE office_code SET active=false, updated_by=public.current_email(), updated_at=now() WHERE id;
  UPDATE app_users SET active=false WHERE email='ma-van-phong@ma-truy-cap.hoisontra.app';
  UPDATE push_subscriptions SET active=false WHERE email='ma-van-phong@ma-truy-cap.hoisontra.app';
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES (public.current_email(), 'revoke_office_code', 'office_code', 'office');
END $$;

-- Trạng thái mã cho màn Phân quyền (không lộ hash).
CREATE FUNCTION public.office_code_status()
RETURNS TABLE(active boolean, updated_at timestamptz, last_used_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  RETURN QUERY SELECT o.active, o.updated_at, o.last_used_at FROM office_code o WHERE o.id;
END $$;

-- Tra cứu khi đổi mã lấy phiên; chỉ service_role.
CREATE FUNCTION public.office_code_lookup_service(p_code_hash text)
RETURNS TABLE(identity_email text) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE office_code SET last_used_at = now() WHERE id AND code_hash = p_code_hash AND active
  RETURNING identity_email
$$;

-- Quản trị cấp liên kết tiếp nhận một lần (token tạo + băm ở server function; chỉ hash được lưu).
CREATE FUNCTION public.create_handover_invite(p_token_hash text, p_label text, p_hours integer DEFAULT 72)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_hours IS NULL OR p_hours < 1 OR p_hours > 720 OR length(coalesce(p_label,'')) > 120 THEN
    RAISE EXCEPTION 'Yêu cầu không hợp lệ' USING errcode='22023';
  END IF;
  INSERT INTO handover_invites(id, token_hash, label, expires_at, created_by)
  VALUES (v_id, p_token_hash, btrim(coalesce(p_label,'')), now() + make_interval(hours => p_hours), public.current_email());
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES (public.current_email(), 'create_handover', 'handover_invites', v_id::text);
  RETURN v_id;
END $$;

CREATE FUNCTION public.revoke_handover_invite(p_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  UPDATE handover_invites SET active=false WHERE id=p_id AND used_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING errcode='P0002'; END IF;
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES (public.current_email(), 'revoke_handover', 'handover_invites', p_id::text);
END $$;

-- Đổi token lấy phiên quản trị: dùng một lần (đánh dấu used_at nguyên tử), còn hạn, còn hiệu lực. Chỉ service_role.
CREATE FUNCTION public.handover_lookup_service(p_token_hash text)
RETURNS TABLE(identity_email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE handover_invites SET used_at = now()
  WHERE token_hash = p_token_hash AND active AND used_at IS NULL AND expires_at > now()
  RETURNING id INTO v_id;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO app_users(email, office_role, sensitive_access, active, note)
  VALUES ('tiep-nhan-quan-tri@ma-truy-cap.hoisontra.app', 'admin', false, true, 'Tiếp nhận quản trị qua liên kết một lần')
  ON CONFLICT (email) DO UPDATE SET office_role='admin', active=true;
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES ('tiep-nhan', 'use_handover', 'handover_invites', v_id::text);
  RETURN QUERY SELECT 'tiep-nhan-quan-tri@ma-truy-cap.hoisontra.app'::text;
END $$;

REVOKE ALL ON FUNCTION public.set_office_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_office_code(text) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_office_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_office_code(text) TO authenticated;
REVOKE ALL ON FUNCTION public.office_code_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.office_code_status() TO authenticated;
REVOKE ALL ON FUNCTION public.office_code_lookup_service(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.office_code_lookup_service(text) TO service_role;
REVOKE ALL ON FUNCTION public.create_handover_invite(text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_handover_invite(text,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_handover_invite(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_handover_invite(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.handover_lookup_service(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handover_lookup_service(text) TO service_role;

-- Mã PIN 8 số của 'office' được thay bằng mã bảo vệ /van-phong: vô hiệu lối cũ.
UPDATE app_users SET active=false, note='Lối Văn phòng cũ (thay bằng mã bảo vệ /van-phong)'
WHERE email = (SELECT login_email FROM unit_logins WHERE unit='office');
UPDATE unit_logins SET enabled=false WHERE unit='office';