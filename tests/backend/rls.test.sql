-- Backend invariant tests for Hội LHPN Sơn Trà. Runs inside ONE transaction and ROLLBACKs:
-- no real data is created or deleted. Run: psql -v ON_ERROR_STOP=1 -f tests/backend/rls.test.sql
-- Simulates real JWT claims as the `authenticated` role (same path PostgREST uses).
\set QUIET on
BEGIN;

CREATE FUNCTION pg_temp.as_user(_email text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', md5(_email)::uuid, 'email', _email, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;
CREATE FUNCTION pg_temp.as_root() RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claims', '', true); END $$;
GRANT EXECUTE ON FUNCTION pg_temp.as_user(text), pg_temp.as_root() TO authenticated;

-- T1 catalogue: 42 chapters, 20943 households, Công An NULL
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.chapters) = 42, 'T1 expected 42 chapters';
  ASSERT (SELECT sum(households) FROM public.chapters) = 20943, 'T1 households total must be 20943';
  ASSERT (SELECT households FROM public.chapters WHERE id='ch42' AND name='Công An') IS NULL, 'T1 Công An households must be NULL';
  RAISE NOTICE 'PASS T1 catalogue 42 / 20943 / Công An NULL';
END $$;

-- Admin grants (via UI RPC) two chapter users + one sensitive officer
SELECT pg_temp.as_user('ubmttqvnphuongsontra@gmail.com');
SELECT public.set_user_access('[test]a@example.org', NULL, false, ARRAY['ch01'], '[TEST]');
SELECT public.set_user_access('[test]b@example.org', NULL, false, ARRAY['ch02'], '[TEST]');
SELECT public.set_user_access('[test]sens@example.org', NULL, true, ARRAY['ch01'], '[TEST]');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.chapters) = 42, 'T2 admin sees all chapters';
  INSERT INTO public.documents(direction,title,body,scope,status,is_test,created_by) VALUES ('out','[TEST] VB chung','noi dung','all','published',true,'forged@x.org');
  ASSERT (SELECT created_by FROM public.documents WHERE title='[TEST] VB chung') = 'ubmttqvnphuongsontra@gmail.com', 'T2 created_by must not be forgeable';
  INSERT INTO public.documents(direction,title,body,scope,status,is_test,created_by) VALUES ('out','[TEST] VB ch02','rieng','selected','published',true,'x');
  INSERT INTO public.document_recipients SELECT id,'ch02' FROM public.documents WHERE title='[TEST] VB ch02';
  INSERT INTO public.documents(direction,title,body,scope,status,is_test,created_by) VALUES ('out','[TEST] VB nhap','nhap','all','draft',true,'x');
  INSERT INTO public.tasks(title,due_at,is_test,created_by) VALUES ('[TEST] NV', current_date - 1, true, 'x');
  INSERT INTO public.task_assignments(task_id,chapter_id) SELECT id,c FROM public.tasks, unnest(ARRAY['ch01','ch02']) c WHERE title='[TEST] NV';
  RAISE NOTICE 'PASS T2 admin CRUD + actor stamping';
END $$;
SELECT pg_temp.as_root();

-- T3 outsider (valid JWT, no grant) sees nothing and cannot write
SELECT pg_temp.as_user('[test]outsider@example.org');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.chapters) = 0, 'T3 outsider must not see chapters';
  ASSERT (SELECT count(*) FROM public.documents) = 0, 'T3 outsider must not see documents';
  ASSERT (SELECT count(*) FROM public.tasks) = 0, 'T3 outsider must not see tasks';
  ASSERT (SELECT count(*) FROM public.office_summary()) = 0, 'T3 outsider summary empty';
  BEGIN INSERT INTO public.submissions(chapter_id,kind,title,created_by) VALUES ('ch01','report','x','x'); ASSERT false, 'T3 outsider insert must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.set_user_access('[test]outsider@example.org','admin',true,ARRAY['ch01']); ASSERT false, 'T3 self-grant must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.export_backup(); ASSERT false, 'T3 backup must fail'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS T3 outsider isolated';
END $$;
SELECT pg_temp.as_root();

-- T4 chapter A: own chapter only, cross-chapter / fake chapter_id rejected
SELECT pg_temp.as_user('[test]a@example.org');
DO $$ DECLARE sid uuid; BEGIN
  ASSERT (SELECT array_agg(id) FROM public.chapters) = ARRAY['ch01'], 'T4 A sees only ch01';
  ASSERT (SELECT count(*) FROM public.documents WHERE title='[TEST] VB chung') = 1, 'T4 A sees broadcast doc';
  ASSERT (SELECT count(*) FROM public.documents WHERE title IN ('[TEST] VB ch02','[TEST] VB nhap')) = 0, 'T4 A must not see ch02/draft docs';
  BEGIN INSERT INTO public.submissions(chapter_id,kind,title,created_by) VALUES ('ch02','report','x','x'); ASSERT false, 'T4 cross-chapter insert must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.submissions(chapter_id,kind,title,created_by) VALUES ('ch99','report','x','x'); ASSERT false, 'T4 fake chapter must fail';
  EXCEPTION WHEN insufficient_privilege OR foreign_key_violation OR check_violation THEN NULL; END;
  BEGIN INSERT INTO public.member_counts(chapter_id,period,members_total) VALUES ('ch02','2026-10',5); ASSERT false, 'T4 cross-chapter members must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.update_assignment((SELECT id FROM public.tasks LIMIT 1),'ch02','completed',100,''); ASSERT false, 'T4 cross-chapter task update must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.app_users SET office_role='admin' WHERE email='[test]a@example.org'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  ASSERT NOT public.is_office(), 'T4 fake role escalation must not work';
  INSERT INTO public.submissions(chapter_id,kind,title,body,created_by) VALUES ('ch01','report','[TEST] BC A','bi mat','x') RETURNING id INTO sid;
  INSERT INTO public.member_counts(chapter_id,period,members_total,members_new) VALUES ('ch01','2026-10',120,3);
  ASSERT (SELECT updated_by FROM public.member_counts WHERE chapter_id='ch01') = '[test]a@example.org', 'T4 updated_by stamped';
  PERFORM public.update_assignment((SELECT id FROM public.tasks WHERE title='[TEST] NV'),'ch01','in_progress',50,'dang lam');
  ASSERT (SELECT count(*) FROM public.audit_log) = 0, 'T4 chapter cannot read audit log';
  PERFORM set_config('test.sid', sid::text, true);
  RAISE NOTICE 'PASS T4 chapter isolation, forged chapter/role rejected';
END $$;
SELECT pg_temp.as_root();

-- T5 chapter B cannot see or withdraw A's report
SELECT pg_temp.as_user('[test]b@example.org');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.submissions) = 0, 'T5 B must not see A submissions';
  ASSERT (SELECT count(*) FROM public.list_submissions()) = 0, 'T5 B list empty';
  BEGIN PERFORM public.withdraw_submission(current_setting('test.sid')::uuid); ASSERT false, 'T5 B withdraw must fail';
  EXCEPTION WHEN no_data_found OR insufficient_privilege THEN NULL; END;
  ASSERT (SELECT count(*) FROM public.documents WHERE title='[TEST] VB ch02') = 1, 'T5 B sees its addressed doc';
  RAISE NOTICE 'PASS T5 cross-chapter read/withdraw blocked';
END $$;
SELECT pg_temp.as_root();

-- T6 A withdraws own report; office keeps metadata but body is hidden; second withdraw rejected; audit atomic
SELECT pg_temp.as_user('[test]a@example.org');
SELECT public.withdraw_submission(current_setting('test.sid')::uuid);
DO $$ BEGIN
  BEGIN PERFORM public.withdraw_submission(current_setting('test.sid')::uuid); ASSERT false, 'T6 double withdraw must fail';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  ASSERT (SELECT body FROM public.list_submissions() LIMIT 1) = 'bi mat', 'T6 author still sees own withdrawn body';
END $$;
SELECT pg_temp.as_root();
SELECT pg_temp.as_user('ubmttqvnphuongsontra@gmail.com');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.submissions WHERE id=current_setting('test.sid')::uuid) = 0, 'T6 office must not read withdrawn row directly';
  ASSERT (SELECT body FROM public.list_submissions() WHERE id=current_setting('test.sid')::uuid) IS NULL, 'T6 office list hides withdrawn body';
  ASSERT (SELECT status FROM public.list_submissions() WHERE id=current_setting('test.sid')::uuid) = 'withdrawn', 'T6 status visible';
  ASSERT (SELECT count(*) FROM public.audit_log WHERE action='withdraw' AND resource_id=current_setting('test.sid')) = 1, 'T6 audit written atomically';
  ASSERT NOT EXISTS (SELECT 1 FROM public.audit_log WHERE resource_id LIKE '%bi mat%'), 'T6 no body in audit';
  -- document withdraw: recipients lose access
  UPDATE public.documents SET status='withdrawn' WHERE title='[TEST] VB chung';
  -- archive / restore task
  UPDATE public.tasks SET status='archived' WHERE title='[TEST] NV';
  RAISE NOTICE 'PASS T6 report withdraw + body hidden + audit';
END $$;
SELECT pg_temp.as_root();
SELECT pg_temp.as_user('[test]a@example.org');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.documents WHERE title='[TEST] VB chung') = 0, 'T7 withdrawn doc hidden from recipients';
  ASSERT (SELECT count(*) FROM public.tasks WHERE title='[TEST] NV') = 0, 'T7 archived task hidden from chapter';
  BEGIN PERFORM public.update_assignment((SELECT task_id FROM public.task_assignments LIMIT 1),'ch01','completed',100,''); ASSERT false, 'T7 update archived task must fail';
  EXCEPTION WHEN raise_exception OR no_data_found THEN NULL; WHEN not_null_violation THEN NULL; END;
  RAISE NOTICE 'PASS T7 withdrawn document / archived task hidden';
END $$;
SELECT pg_temp.as_root();

-- T8 sensitive cases: only sensitive-flagged + chapter; ordinary chapter user / office staff without flag cannot see
SELECT pg_temp.as_user('[test]sens@example.org');
INSERT INTO public.sensitive_cases(chapter_id,category,summary,details,created_by) VALUES ('ch01','child','[TEST] ho so','chi tiet','x');
SELECT pg_temp.as_root();
SELECT pg_temp.as_user('[test]a@example.org');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.sensitive_cases) = 0, 'T8 ordinary chapter must not see sensitive cases';
  BEGIN INSERT INTO public.sensitive_cases(chapter_id,category,summary,created_by) VALUES ('ch01','other','x','x'); ASSERT false, 'T8 insert must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS T8 sensitive cases restricted';
END $$;
SELECT pg_temp.as_root();
SELECT pg_temp.as_user('ubmttqvnphuongsontra@gmail.com');
SELECT public.set_user_access('[test]staff@example.org','staff',false,ARRAY[]::text[],'[TEST]');
SELECT pg_temp.as_root();
SELECT pg_temp.as_user('[test]staff@example.org');
DO $$ BEGIN
  ASSERT public.is_office(), 'T8 staff is office';
  ASSERT (SELECT count(*) FROM public.sensitive_cases) = 0, 'T8 office staff without flag must not see sensitive cases';
  ASSERT NOT EXISTS (SELECT 1 FROM public.audit_log WHERE resource_type='sensitive_cases' AND resource_id LIKE '%ho so%'), 'T8 no PII in audit';
  BEGIN PERFORM public.set_user_access('[test]x@example.org','admin',true,ARRAY['ch01']); ASSERT false, 'T8 staff cannot grant';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS T8b office staff without sensitive flag blocked';
END $$;
SELECT pg_temp.as_root();

-- T9 attachments: storage read gated by attachment row + owner RLS
SELECT pg_temp.as_user('[test]a@example.org');
DO $$ DECLARE sid uuid; BEGIN
  INSERT INTO public.submissions(chapter_id,kind,title,created_by) VALUES ('ch01','activity','[TEST] HD','x') RETURNING id INTO sid;
  INSERT INTO public.attachments(owner_type,owner_id,path,filename,mime,size_bytes,created_by)
    VALUES ('submission',sid,'submission/'||sid||'/f.pdf','f.pdf','application/pdf',100,'x');
  PERFORM set_config('test.att', 'submission/'||sid||'/f.pdf', true);
  BEGIN INSERT INTO public.attachments(owner_type,owner_id,path,filename,mime,size_bytes,created_by)
    VALUES ('sensitive_case',(SELECT gen_random_uuid()),'sensitive_case/x/f.pdf','f.pdf','application/pdf',100,'x'); ASSERT false, 'T9 attach to foreign owner must fail';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
END $$;
SELECT pg_temp.as_root();
SELECT pg_temp.as_user('[test]b@example.org');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.attachments) = 0, 'T9 B must not see A attachments';
  ASSERT NOT public.can_write_owner('submission', split_part(current_setting('test.att'),'/',2)::uuid), 'T9 B cannot upload to A owner';
  RAISE NOTICE 'PASS T9 attachment metadata isolated';
END $$;
SELECT pg_temp.as_root();

-- T10 revocation is immediate even with an unexpired JWT
SELECT pg_temp.as_user('ubmttqvnphuongsontra@gmail.com');
SELECT public.revoke_user_access('[test]a@example.org');
DO $$ BEGIN
  BEGIN PERFORM public.revoke_user_access('ubmttqvnphuongsontra@gmail.com'); ASSERT false, 'T10 bootstrap admin cannot be revoked';
  EXCEPTION WHEN raise_exception THEN NULL; END;
END $$;
SELECT pg_temp.as_root();
SELECT pg_temp.as_user('[test]a@example.org');
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.chapters) = 0, 'T10 revoked user sees no chapters';
  ASSERT (SELECT count(*) FROM public.submissions) = 0, 'T10 revoked user loses own reports';
  ASSERT (SELECT count(*) FROM public.attachments) = 0, 'T10 revoked user loses files';
  BEGIN INSERT INTO public.submissions(chapter_id,kind,title,created_by) VALUES ('ch01','report','x','x'); ASSERT false, 'T10 revoked write must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS T10 revocation immediate';
END $$;
SELECT pg_temp.as_root();

-- T11 backup/restore safety: dry-run rolls back, tampered catalogue rejected
SELECT pg_temp.as_user('ubmttqvnphuongsontra@gmail.com');
DO $$ DECLARE b jsonb; bad jsonb; BEGIN
  b := public.export_backup();
  ASSERT NOT (b ? 'sensitive_cases'), 'T11 backup excludes sensitive cases';
  ASSERT jsonb_array_length(b->'chapters') = 42, 'T11 backup has 42 chapters';
  bad := jsonb_set(b, '{chapters,41,households}', '999');
  BEGIN PERFORM public.restore_backup(bad, false); ASSERT false, 'T11 tampered catalogue must fail';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM = 'chapter_catalogue_mismatch', 'T11 wrong error ' || SQLERRM; END;
  BEGIN PERFORM public.restore_backup(b, true); ASSERT false, 'T11 dry run must raise';
  EXCEPTION WHEN SQLSTATE 'P0003' THEN ASSERT SQLERRM LIKE 'DRY_RUN:%', 'T11 dry run msg'; END;
  ASSERT (public.restore_backup(b, false)->>'documents')::int = 0, 'T11 restore never duplicates';
  RAISE NOTICE 'PASS T11 backup/restore guarded';
END $$;
SELECT pg_temp.as_root();

-- T12 anon has no access at all
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM 1 FROM public.chapters; ASSERT false, 'T12 anon must not read';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'PASS T12 anon denied';
END $$;
RESET ROLE;

ROLLBACK;
\echo ALL BACKEND TESTS PASSED (transaction rolled back, no data kept)
