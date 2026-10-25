<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules (Hội LHPN Sơn Trà)
- All permissions live in backend RLS + SECURITY DEFINER helpers (`can_chapter`, `is_office`, `has_sensitive`) re-read on every request; never gate data only in the UI — revocation must apply even with a valid JWT.
- Actor columns (`created_by`, `updated_by`) are stamped by trigger; audit rows are written by trigger in the same transaction and store ids only (no body/PII).
- Withdrawn submissions/documents are hidden from recipients at the row level; office lists use `list_submissions` which nulls withdrawn bodies.
- Private files: bucket `evidence`, path `<owner_type>/<owner_id>/<uuid>.<ext>`; always open via 60-second signed URLs (direct downloads may be cached by the storage proxy after revocation).
- Push: DB triggers enqueue generic, PII-free rows into `notification_outbox`; `src/lib/push-processor.ts` (pure, unit-tested) delivers via `push.server.ts`; recipients are re-checked at send time. The service worker `public/push-sw.js` must never cache app data.
- Backend acceptance tests: `bun tests/backend/rls.live.test.ts` (real auth, cleans only its own run's rows); unit tests: `bunx vitest run`.
- `reference/hoi-source-2d45022/` is the read-only original Cloudflare source; do not edit or deploy it.
- Attachments: every record type that carries files (submission, document, sensitive_case, task) goes through `Attachments`/`FilePicker`; the DB trigger `verify_attachment_object` requires the storage object to exist with matching size/MIME, and access is decided by `can_read_owner`/`can_write_owner` — why: no fake records, one permission path for upload/view/download.
- Office "Mở Sổ" is a read-only UI mode (`ctx.officeView`) using the Office's own permissions — why: never impersonate a chapter account or write on its behalf (e.g. no false "đã đọc").
- Private file reads go only through `/api/files/:id` (bearer token, attachments RLS re-checked every request, `Cache-Control: no-store`); storage.objects has no SELECT policy for signed-in users — why: signed links/storage proxy cache could outlive a revocation.
- Legal Q&A: AI (Gemini free key, server-only) may only summarise Office-approved FAQs that carry an official source; PII is refused server-side and quota/no-key falls back to FAQ — why: no fabricated law, no personal data to free-tier AI, never auto-switch to paid.
- Unit access codes: each Chi hội signs in at `/so/<unit>` with an 8-digit code; the server (`unit-login.functions.ts`) checks a bcrypt hash + DB lockout, then issues a normal session for a synthetic per-unit account that holds ordinary `app_users`/`chapter_access` rows. Changing/revoking a code replaces and deletes that account — why: reuse the one RLS permission path, and old devices lose access on the next request even with an unexpired JWT. Email OTP remains only for admins/personal accounts.
- Office access (Đoàn-style): `/van-phong` opens with a shared office protection code (6–40 chars, only SHA-256 hash stored in `office_code`, lookup via service-role-only `office_code_lookup_service`); the code identity `ma-van-phong@ma-truy-cap.hoisontra.app` is an admin `app_users` row. `/tiep-nhan#t=…` is a one-time, expiring handover link (`handover_invites`, token in URL fragment only, hash stored) that signs in the `tiep-nhan-quan-tri@…` admin identity so the recipient sets the office code themselves. Public exchange endpoints (`src/lib/links.functions.ts`) are IP-rate-limited via `link_attempts` (hashed IP). Email OTP remains the admin fallback — why: no email needed for daily office/chapter work, and handover never exposes a credential in logs or chat.
