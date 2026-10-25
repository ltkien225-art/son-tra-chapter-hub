-- Sửa revoke_office_code: push_subscriptions dùng cột disabled (không phải active).
CREATE OR REPLACE FUNCTION public.revoke_office_code(p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
  IF public.current_email() = 'ma-van-phong@ma-truy-cap.hoisontra.app' THEN
    RAISE EXCEPTION 'Không tự thu hồi mã đang dùng; hãy đăng nhập email quản trị dự phòng' USING errcode='42501';
  END IF;
  UPDATE office_code SET active=false, updated_by=public.current_email(), updated_at=now() WHERE id;
  UPDATE app_users SET active=false WHERE email='ma-van-phong@ma-truy-cap.hoisontra.app';
  UPDATE push_subscriptions SET disabled=true WHERE email='ma-van-phong@ma-truy-cap.hoisontra.app';
  INSERT INTO audit_log(actor, action, resource_type, resource_id) VALUES (public.current_email(), 'revoke_office_code', 'office_code', 'office');
END $$;
REVOKE ALL ON FUNCTION public.revoke_office_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_office_code(text) TO authenticated;