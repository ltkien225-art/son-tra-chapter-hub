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
