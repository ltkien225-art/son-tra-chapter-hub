CREATE TABLE public.unit_logins(
  unit text PRIMARY KEY CHECK (unit = 'office' OR unit ~ '^ch(0[1-9]|[1-3][0-9]|4[0-2])$'),
  pin_hash text,
  login_email text,
  enabled boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 0,
  rotated_by text,
  rotated_at timestamptz
);
GRANT ALL ON public.unit_logins TO service_role;
ALTER TABLE public.unit_logins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.unit_login_attempts(
  id bigserial PRIMARY KEY,
  unit text NOT NULL,
  ok boolean NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX unit_login_attempts_unit_at ON public.unit_login_attempts(unit, at);
GRANT ALL ON public.unit_login_attempts TO service_role;
GRANT USAGE ON SEQUENCE public.unit_login_attempts_id_seq TO service_role;
ALTER TABLE public.unit_login_attempts ENABLE ROW LEVEL SECURITY;

-- Admin-only listing without secrets.
CREATE FUNCTION public.list_unit_logins() RETURNS TABLE(unit text, enabled boolean, version integer, rotated_at timestamptz, rotated_by text, fails_15m bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.unit, l.enabled, l.version, l.rotated_at, l.rotated_by,
    (SELECT count(*) FROM unit_login_attempts a WHERE a.unit = l.unit AND NOT a.ok AND a.at > now() - interval '15 minutes')
  FROM unit_logins l WHERE public.is_admin() ORDER BY l.unit $$;
REVOKE ALL ON FUNCTION public.list_unit_logins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_unit_logins() TO authenticated;

-- Server-only: check PIN with lockout (5 failures / 15 min per unit).
CREATE FUNCTION public.unit_login_check(_unit text, _pin text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE l unit_logins; fails int;
BEGIN
  SELECT count(*) INTO fails FROM unit_login_attempts WHERE unit = _unit AND NOT ok AND at > now() - interval '15 minutes';
  IF fails >= 5 THEN RETURN 'LOCKED'; END IF;
  SELECT * INTO l FROM unit_logins WHERE unit = _unit;
  IF l.unit IS NULL OR NOT l.enabled OR l.pin_hash IS NULL OR l.login_email IS NULL
     OR extensions.crypt(_pin, l.pin_hash) <> l.pin_hash THEN
    INSERT INTO unit_login_attempts(unit, ok) VALUES (_unit, false);
    RETURN NULL;
  END IF;
  INSERT INTO unit_login_attempts(unit, ok) VALUES (_unit, true);
  RETURN l.login_email;
END $$;
REVOKE ALL ON FUNCTION public.unit_login_check(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unit_login_check(text,text) TO service_role;

-- Server-only: install a new code + new login identity; old identity loses access immediately.
CREATE FUNCTION public.unit_login_rotate(_unit text, _pin text, _email text, _actor text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE old text;
BEGIN
  SELECT login_email INTO old FROM unit_logins WHERE unit = _unit;
  IF old IS NOT NULL THEN
    DELETE FROM chapter_access WHERE email = old;
    UPDATE app_users SET active = false, note = 'Mã truy cập cũ (đã đổi/thu hồi)' WHERE email = old;
  END IF;
  IF _email IS NOT NULL THEN
    INSERT INTO app_users(email, office_role, sensitive_access, active, note)
    VALUES (_email, CASE WHEN _unit = 'office' THEN 'staff' END, false, true, 'Đăng nhập bằng mã truy cập ' || _unit)
    ON CONFLICT (email) DO UPDATE SET active = true;
    IF _unit <> 'office' THEN INSERT INTO chapter_access(email, chapter_id) VALUES (_email, _unit) ON CONFLICT DO NOTHING; END IF;
  END IF;
  INSERT INTO unit_logins(unit, pin_hash, login_email, enabled, version, rotated_by, rotated_at)
  VALUES (_unit, CASE WHEN _pin IS NULL THEN NULL ELSE extensions.crypt(_pin, extensions.gen_salt('bf', 10)) END, _email, _email IS NOT NULL, 1, _actor, now())
  ON CONFLICT (unit) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, login_email = EXCLUDED.login_email,
    enabled = EXCLUDED.enabled, version = unit_logins.version + 1, rotated_by = _actor, rotated_at = now();
  DELETE FROM unit_login_attempts WHERE unit = _unit;
  INSERT INTO audit_log(actor, action, resource_type, resource_id, chapter_id)
  VALUES (_actor, CASE WHEN _email IS NULL THEN 'revoke_code' ELSE 'rotate_code' END, 'unit_logins', _unit, CASE WHEN _unit <> 'office' THEN _unit END);
  RETURN old;
END $$;
REVOKE ALL ON FUNCTION public.unit_login_rotate(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unit_login_rotate(text,text,text,text) TO service_role;