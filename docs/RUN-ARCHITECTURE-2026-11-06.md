# SƠN TRÀ DIGITAL LAB — Nghiên cứu kiến trúc giảm Run Lovable Cloud

Ngày lập: 06/11/2026, giờ Việt Nam. Phiên bản: nghiên cứu bổ sung cho sáu PR hiện có.

**Kết luận:** ưu tiên kiến trúc lai theo từng phân hệ: giữ PostgreSQL cho phần quyền và giao dịch phức tạp, dùng Workers cho xử lý độc lập, chỉ cân nhắc D1 cho dữ liệu có ranh giới đơn giản đã kiểm thử. Đây là hướng có cơ hội giảm chi phí nền về lâu dài; chuyển API mà vẫn gọi PostgreSQL không loại bỏ chi phí server. Trong giới hạn hiện tại — không Pause/Remove, không đổi cron, không chuyển DB, không deploy — chưa có bằng chứng đạt miễn phí cho cả sáu ứng dụng. Không phê duyệt chuyển đổi production bằng báo cáo này.

## 1. Bằng chứng chi phí và độ tin cậy

| Dữ kiện | Giá trị | Nguồn và cách sử dụng |
|---|---:|---|
| Sổ tay: Run / 30 ngày, ảnh 06/11 | 38,8 credits | Chủ sở hữu cung cấp trong nhiệm vụ; chưa đọc lại ảnh gốc/billing API trong phiên này |
| Run được miễn phí bao phủ trong cùng màn hình | 21,6 | Coverage của cửa sổ đã chọn; không phải hạn mức tháng cố định |
| Tổng / Build / Run | 364 / 325 / 38,8 | 325 + 38,8 = 363,8, phù hợp tổng hiển thị làm tròn 364; không cộng Build vào ngân sách vận hành |
| Database server ngày 04 và 05/11 | khoảng 1,86 credits/ngày mỗi ngày | Hai ngày quan sát do chủ sở hữu cung cấp; chưa có active hours/đơn giá cùng ngày |
| Database server ngày 06/11 | 0,15 tại lúc chụp | Ngày chưa hoàn tất; không ngoại suy thành cả ngày hoặc chứng minh savings |
| Sổ tay ngày 04/11, hồ sơ PR | Run 37,3; DB server 34,2 / 30 ngày; active 153 giờ / 7 ngày | Dữ kiện lịch sử đã đọc từ docs/RUN-COST-EVIDENCE-2026-11-04.md; không ghép các cửa sổ để tính giá giờ |
| Miễn phí Lovable theo tài liệu hiện hành | Cloud 20 credits/tháng/workspace | [S1]; AI và connector có grant riêng, không bù chéo Cloud tùy ý |

38,8 − 21,6 = **17,2 credits chưa được coverage hiển thị bao phủ**. Đây không phải hóa đơn tiền mặt: có thể đã trừ credits chung. Không mua thêm vẫn có thể tiêu credits gói/bonus cho đến khi hết. 38,8 lớn hơn Cloud grant 20 là 18,8, nhưng phép so này chỉ dùng sàng lọc; phải tách Cloud/AI/connector và cùng kỳ cấp trước khi kết luận đối soát.

Nếu 38,8 hoàn toàn là Cloud và cùng một kỳ: riêng Sổ tay cần giảm ít nhất **48,45%** để xuống 20, hoặc **61,34%** để xuống mục tiêu nội bộ 15, chưa dành chỗ cho năm ứng dụng còn lại. So với coverage 21,6 trong ảnh, mức giảm tương đương 44,33%; 21,6 không dùng làm grant tương lai. 1,86 × 30 = **55,8 credits** chỉ là kịch bản tốc độ hai ngày kéo dài 30 ngày, không phải dự báo đã xác minh và không cộng chồng vào 38,8.

Khoản miễn phí theo workspace không theo repo. Chưa đối soát được workspace ID, kỳ cấp, số dư grant, trạng thái unified/legacy billing và chi phí năm dự án khác. Không có căn cứ nói sáu app hưởng 6 × 20 hoặc 6 × 21,6. Tài khoản Cloudflare cũng phải cộng cả Workers/D1 đang chạy cho 41 TDP và các dự án khác.

## 2. Phạm vi khảo sát mã nguồn và sáu PR

Đọc tree theo SHA, 188 tệp backend/migration/tài liệu ban đầu và 462 tệp bổ sung thuộc src/workflow; không đọc giá trị .env hoặc secret. Đối chiếu API, client, migration và AGENTS.md. Đây là bản đồ theo mã nhánh nghiên cứu, **không xác nhận toàn bộ migration đã áp dụng production**. Không chạy SQL production, không gọi API nghiệp vụ thật và không chạy lại bộ test ứng dụng lịch sử. Dữ kiện metadata 04/11 được ghi rõ là lịch sử.

| Ứng dụng | Repository | PR | HEAD khảo sát | Trạng thái lúc đọc |
|---|---|---:|---|---|
| Sổ tay Mặt trận | so-tay-mat-tran-so-son-tra | 17 | 52e64c5ef975957ff75b6641d63527f97abf1764 | draft, chưa merge; mergeable=false |
| Phụ nữ | son-tra-chapter-hub | 2 | a460bc6644aa5c6214acf7f944eb0a759c3c232c | draft, chưa merge |
| Công đoàn | son-tra-union-desk | 2 | 3cab4433e7da86f3942bd6547793154d0653e751 | draft, chưa merge |
| Thanh niên | son-tra-youth-archive | 2 | fe637626722f8261e1debe24a5dd4a2155e584e9 | draft, chưa merge |
| Cựu chiến binh | son-tra-branch-compass | 2 | bddaa6d35639e76bcfbff82e4343090b316180d2 | draft, chưa merge |
| Nông dân | son-tra-farmer-hub | 2 | f0b424460e23c627c372ab37734ca3d332579458 | draft, chưa merge |

Các SHA trên là mốc trước bổ sung tài liệu; không phải deployment ID. Xung đột Sổ tay là điều kiện phải giải quyết riêng trước phát hành, chưa được sửa trong nghiên cứu.

## 3. Bảng phụ thuộc backend sáu ứng dụng

| Ứng dụng | PostgreSQL / quyền / Auth | Storage | Push, cron và realtime | API, nguồn ngoài và phần tách được |
|---|---|---|---|---|
| Mặt trận | Các bảng vb_*, gy_*, th_*, td_*, ks_*, dh_*, push_*, tdp_feedback_*; RPC khóa hàng/revision/audit. Văn phòng dùng cookie HttpOnly ký; PIN riêng bảo vệ PII; Supabase admin chỉ server, bảng riêng tư không cấp anon/authenticated | minh-chung, van-ban; download kiểm tra trạng thái/thu hồi; token theo Ban, biên nhận sau tải thành công | Web Push: push_links/subscriptions/outbox/audit, push_claim/finish; snapshot 04/11 có push-outbox-retry và son-tra-tdp-feedback-retry mỗi phút. Không mặc định lịch 15 phút trong mã đã áp dụng production | Sheets Văn phòng/41 Ban, BFF nguồn TDP, receiver /api/integrations/tdp-feedback; ACK gắn commit. Cẩm nang/nội dung công khai, chuyển đổi định dạng không nhạy cảm có thể tách; báo cáo tuần/PII chưa tách |
| Phụ nữ | chapters, app_users, chapter_access, documents/recipients, tasks/assignments, submissions, sensitive_cases; RLS, RPC my_access, mark_document_read, quản trị quyền và trigger audit. Auth đi kèm capability chi hội/văn phòng | evidence; signed URL 60 giây, có cửa sổ cache sau thu hồi cần nghiệm thu | Push qua notification_outbox và trigger; recipient kiểm tra lúc gửi. Snapshot 04/11: hoi-push-daily-reminders 0 1 * * *, hoi-push-hourly-retry 15 * * * * | /api/dieu-hanh/summary, /api/files/$id, /api/public/push/cron; legal FAQ/tra cứu có AI và quota. Nội dung công khai được duyệt và cache nguồn công khai là ứng viên; không tách sensitive_cases |
| Công đoàn | union_units/entries/files/announcements/audit/work_items; capability Văn phòng có hash, hạn, thu hồi, phạm vi manager kiểm tra mỗi lệnh; Auth chủ sở hữu dùng cho cấp link, không thay quyền nghiệp vụ | union-evidence; metadata/quyền gắn bản ghi | Chưa thấy triển khai Web Push/service worker Push trong mã khảo sát; thông báo trong app không đồng nghĩa Web Push. Snapshot 04/11 không pg_cron; lịch ngoài chưa biết | /api/dieu-hanh/summary, /api/public/legal-ai; union_change_work, union_capability_review, union_legal_ai_reserve. legal-faq.ts và hướng dẫn công khai có thể hoạt động độc lập, AI thì không mặc định miễn phí |
| Thanh niên | units, office_staff, unit_access, office_records, task_units/document_units, unit_submissions/task_updates; RPC save_record, unit_submit, unit_update_progress; Auth + access_links/handover/office_code; audit/thu hồi | ho-so; kiểm tra chữ ký bytes, RPC đăng ký attachment và kiểm tra can_read_object | Web Push bằng push_outbox, resolve recipient lúc gửi; snapshot 04/11 doan-push-daily 0 0 * * *. Kiểm tra quyền tệp 5 giây là polling có mục đích thu hồi | /api/dieu-hanh/summary, /api/public/push-cron; tài liệu hướng dẫn công khai có thể tách; hồ sơ, submit, outbox chưa tách |
| Cựu chiến binh | units/members/documents/targets/reads/tasks/reports/notifications/audit; RLS is_office/can_access_unit/can_view_entity. Sổ link riêng unit_book_* qua RPC book_read/book_submit, token 256-bit; office JWT session bị ràng buộc link còn hiệu lực | files và unit-book, bucket riêng tư; quyền tệp phụ thuộc attachment còn hiệu lực | Chưa thấy Web Push trong mã khảo sát. notifications/notification_reads là hộp thư nội bộ. Snapshot 04/11 không pg_cron, chưa kiểm kê lịch ngoài | /api/dieu-hanh/summary; hướng dẫn công khai là ứng viên đầu tiên. Không chuyển book_submit sang D1 trước khi thay cơ chế khóa và thu hồi nguyên tử |
| Nông dân | profiles/user_roles/units/unit_members, documents/tasks/progress/reports/member_counts/petitions/trainings/livelihoods; RLS, trigger thông báo/audit. Office capability session có scope và hạn; unit_links server gắn unit, nguồn link riêng | attachments; gateway cùng origin, xác thực trước và sau I/O, không dùng signed URL dài hạn | Chưa thấy Web Push trong mã khảo sát; notifications là trong app. Snapshot 04/11 không pg_cron; lịch ngoài chưa biết | /api/dieu-hanh/summary, /api/public/attachment; danh mục tập huấn/sinh kế chỉ được tách nếu trường thực sự công khai. Dữ liệu hội viên/kiến nghị chưa phù hợp thí điểm |

Trong src được đọc của cả sáu SHA, chưa thấy lời gọi `.channel(` hoặc `postgres_changes`. Vì vậy chưa xác nhận ứng dụng nào dùng subscription realtime chủ động; nhiều màn hình hiện cập nhật bằng polling. Không kết luận dịch vụ Realtime production tắt hoặc chi phí bằng 0: cần đối chiếu publication, dashboard connections/messages và các client ngoài kho.

Tuyến summary năm đoàn thể là hợp đồng phục vụ điều hành, không tự chứng minh đã có đồng bộ nghiệp vụ hai chiều với 41 TDP. Hệ thống 41 TDP độc lập là phụ thuộc bên ngoài; phải kiểm kê nguồn, scheduler, outbox và ACK riêng. Không thay yêu cầu tích hợp bằng nút mở trang.

### Dấu vết mã để kiểm tra lại

Đường dẫn tính từ root từng repo tại SHA ở bảng trên:

- Chung: src/integrations/supabase/client.ts, client.server.ts; drizzle/migrations/*.sql; AGENTS.md; docs/RUN-COST-EVIDENCE-2026-11-04.md. Các public publishable key không phải service-role key; bí mật server không được xuất ra trình duyệt.
- Mặt trận: src/lib/push-server.server.ts; tdp-feedback-receiver.server.ts; tdp-source.server.ts; vp-auth.server.ts; th-auth.server.ts; drizzle/migrations/0010_push_two_way_private.sql, 0021_private_tdp_feedback_receiver.sql.
- Phụ nữ: src/lib/push.server.ts, push-processor.ts, legal-research.server.ts; drizzle/migrations/0006_push_deeplinks_and_chapter_updates.sql và 0011_legal_faq_level1.sql.
- Công đoàn: src/lib/union.functions.ts; legal-ai.server.ts; legal-faq.ts; drizzle/migrations/0013_legal_ai_budget_breaker.sql.
- Thanh niên: src/lib/webpush.server.ts, push.functions.ts; drizzle/migrations/0003_web_push.sql, 0004_idempotent_submit_push_retry.sql.
- CCB: drizzle/migrations/0004_unit_book_capabilities.sql, 0007_office_session_revocation.sql, 0011_owner_office_link_self_service.sql.
- Nông dân: src/lib/attachment-handler.server.ts, attachment-access.server.ts, office-capability.server.ts; drizzle/migrations/0010_private_attachment_gateway.sql.

## 4. Vì sao requests giảm mà active hours có thể không giảm

Lovable mô tả Database server phụ thuộc kích cỡ instance, thời gian active và tải truy vấn [S2]. Chưa có đơn giá/định nghĩa làm tròn billable hour cho sáu project. Mô hình kiểm toán phải giữ các phần tách biệt:

**C = Σ(B_i + V_i + O_i)**; nếu provider xác nhận mô hình giờ thì B_i = p_i × H_i. V_i là phần server theo tải nếu có; O_i là storage/network/compute/realtime/AI/connector, không đếm trùng.

Giảm polling, gộp request in-flight, bỏ gọi khi tab ẩn và dùng index có thể giảm V/O. Nếu server vẫn active suốt cùng khoảng, B không giảm tương ứng. Các nguồn có thể duy trì hoạt động gồm cron trong DB, retry/outbox, người dùng hàng ngày, token/session checks, request BFF/summary, polling và kiểm tra quyền tệp. Đây là danh sách tác nhân cần đối chiếu telemetry, chưa phải kết luận nguồn nào gây bao nhiêu giờ.

Ví dụ: chuyển cron mỗi phút từ pg_cron sang Workers nhưng Worker vẫn truy vấn DB mỗi phút thì luồng gọi DB vẫn tồn tại; tổng requests có thể không giảm. Chuyển retry ra Workers chỉ có lợi nền đáng kể khi queue, payload tối thiểu và trạng thái cần thiết thật sự độc lập, không phải mỗi lần lại đọc quyền/outbox PostgreSQL.

Tài liệu [S3] nói auto-Pause khoảng 7 ngày không hoạt động; jobs/nền có thể ngăn việc đó. Traffic đến URL public không resume backend đã Pause. Đây không phải cơ chế ngủ vài phút rồi tự dậy theo request. Dùng thường xuyên không tạo khoảng 7 ngày rỗng. Storage còn được tính khi Pause. Không dùng Pause làm giải pháp trong nhiệm vụ này.

Đo kiểm chứng: lấy cùng kỳ từng project, cùng size; ghi server credits, active hours, request, query duration và job invocation, phân nhóm tab hiện/ẩn, public/private, cron/manual. Không gọi health-check DB chỉ để đo vì chính phép đo có thể tạo hoạt động. Thu billing/dashboard có độ trễ và ghi timezone/cutoff. Cần provider giải thích tương quan trước khi quy savings từ request sang giờ.

## 5. Ba phương án kiến trúc và chi phí

Tiền mặt ở bảng là **dịch vụ bổ sung**, không gồm thuê bao hiện có, nhân công hay credits bị trừ. Không mua hoặc bật dịch vụ trả phí trong nghiên cứu.

| Phương án | Tiền mặt bổ sung | Run dự kiến và giả định | Ưu điểm / trường hợp dùng | Hạn chế, chuyển đổi và rollback |
|---|---:|---|---|---|
| A — Giữ sáu backend, tối ưu | 0 USD nếu không mua thêm; vượt grant vẫn tiêu credits chung | C_A = B + (1−a)V + (1−b)O. Nếu B không đổi, mức thấp nhất vẫn có B + phần O bắt buộc; tổng sáu chưa biết | Ít thay đổi; giữ quyền, phiên, dữ liệu; phù hợp bước đầu, sửa query/index theo telemetry sau duyệt | Không chứng minh đạt miễn phí. Không được giảm kiểm tra thu hồi/ACK để tiết kiệm. Rollback artifact/mã tối ưu, không rollback dữ liệu |
| B — Workers xử lý phần độc lập | 0 USD khi cùng tài khoản còn đủ Workers Free và CPU đáp ứng | C_B = B_còn_lại + V_còn_lại + O_còn_lại. Nếu vẫn gọi PG thường xuyên: B có thể giữ nguyên | Chuyển định dạng, public cache, xử lý thuần; từng bước, ít đụng schema | Phải thay adapter/runtime TanStack/Node nếu cần; Auth/Storage vẫn phụ thuộc Lovable. Worker proxy không tạo serverless DB. Rollback adapter/route về implementation cũ, giữ dữ liệu nguồn |
| C — Workers + D1 cho phân hệ tương thích | 0 USD nếu không vượt hạn mức chung, không mở paid/R2 mặc định | C_C là phần Run còn tại Lovable; phần D1 không tiêu Lovable credits nếu không gọi Lovable. Không gán C_C=0 khi sáu backend cũ vẫn active | Có cơ hội loại chi phí giờ đối với chức năng tách hoàn toàn; phù hợp danh mục công khai, lookup/nhật ký đơn giản đã thiết kế quyền | Phải viết lại policy/RPC/transaction, đồng bộ delta và ownership. Tách một bảng chưa chắc giảm B. Rollback bằng adapter và journal có thứ tự; phải nhập lại delta đã ACK, không restore backup cũ đè dữ liệu mới |

### Kịch bản số minh họa — không phải dự báo provider

Chỉ để thấy độ nhạy: giả sử Sổ tay 38,8 = B 34,0 + V/O 4,8 trong cùng một kỳ, tất cả là Cloud. **34,0 và 4,8 là giả định**, không lấy 34,2 lịch sử trừ vào 38,8 hiện tại.

| Kịch bản | Phép tính | Run Sổ tay / 30 ngày |
|---|---|---:|
| A: giảm 50% phần biến đổi, nền giữ nguyên | 34 + 4,8 × 0,5 | 36,40 |
| B: chuyển 80% phần biến đổi ra Workers, nền giữ nguyên | 34 + 4,8 × 0,2 | 34,96 |
| C1: chuyển 80% công việc nhưng nền cũ còn nguyên | như B | 34,96 |
| C2: về lâu dài giảm được 80% cả nền lẫn phần biến đổi | 34 × 0,2 + 4,8 × 0,2 | 7,76 |

C2 chỉ hợp lệ khi telemetry/billing chứng minh nền giảm, mọi phụ thuộc giữ backend hoạt động đã được xử lý và có phê duyệt chuyển đổi riêng. Hiện không cho phép Pause/Remove/đổi cron nên **chưa có cách thực hiện C2 trong đợt này**. Không coi chuyển 80% bảng hay requests đồng nghĩa giảm 80% nền.

Nếu Sổ tay còn 7,76 thì năm app khác và phần Cloud bổ sung phải tổng ≤12,24 để cả workspace ≤20; muốn ≤15 thì phải ≤7,24. Nếu Sổ tay vẫn 38,8 Cloud/kỳ thì dù năm app về 0 vẫn vượt 20. Với sáu server giả sử tính 720 giờ trong 30 ngày, điều kiện cần Σp_i ≤20/720 =0,027778 credit/giờ trước mọi chi phí khác; mục tiêu 15 là 0,020833. Đây là bất đẳng thức, không phải đơn giá đã biết.

**Chọn C có chọn lọc làm hướng dài hạn, A làm bước đo và tối ưu trước, B làm cầu nối khi có phần thực sự độc lập.** Không mặc định hợp nhất sáu backend hoặc chuyển toàn bộ PostgreSQL sang D1. Đối với nội dung hoàn toàn tĩnh, đóng gói ngay trong giao diện có thể rẻ và đơn giản hơn cả D1; D1 chỉ đáng dùng khi cần cập nhật độc lập/có truy vấn.

## 6. Hạn mức miễn phí và điểm không tương thích D1

Theo [S4–S7], Workers Free 100.000 requests/ngày và 10 ms CPU/invocation; D1 Free 5 triệu rows read/ngày, 100.000 rows written/ngày, tổng 5 GB/tài khoản, 10 database, tối đa 500 MB/database. D1 không tính giờ compute khi không query; index/scan và ghi index ảnh hưởng rows. Vượt daily free thì query lỗi đến lần reset, không tự coi là tiếp tục miễn phí. Reset 00:00 UTC tương ứng 07:00 Việt Nam. Free Time Travel 7 ngày, không phải 30 ngày của Paid.

Không chia 5 triệu/100.000 cho từng app rồi coi mỗi app có quota riêng. Không coi 100.000 requests Workers là 100.000 rows D1. File PDF/ảnh thuộc object storage, không nên nhét vào D1 BLOB. R2 là dịch vụ phải kiểm tra điều kiện kích hoạt/billing riêng; chưa chọn hoặc bật trong nghiên cứu này.

| Phụ thuộc hiện có | Vấn đề khi sang D1 | Yêu cầu trước chuyển |
|---|---|---|
| PostgreSQL RLS/GRANT/SECURITY DEFINER, auth.uid/jwt | D1/SQLite không mang nguyên policy PostgreSQL sang | Worker phải là cổng duy nhất; default-deny, kiểm tra role/unit/current revocation mỗi request, test request giả mạo và truy cập chéo đơn vị |
| Auth và capability/session | D1 không thay Supabase Auth; giữ Auth Lovable vẫn giữ phụ thuộc. JWT/cookie cũ không tự hoạt động ở provider khác | Giữ issuer cũ giai đoạn đầu hoặc có cầu nối phiên được thiết kế/duyệt; kiểm thử iOS standalone, expiry, signout, thu hồi; không hứa giữ nguyên mọi phiên |
| Storage riêng tư | D1 không thay bucket/policy/signed URL | Giữ gateway cũ trước; nếu chuyển phải hash đủ bytes/metadata và kiểm tra quyền trước/sau I/O; thu hồi không bị cache vượt SLA |
| RPC PL/pgSQL/trigger | Không chạy nguyên mã Postgres, array/enum/UUID/jsonb/extension khác semantics | Kiểm kê function theo call graph, viết lại, golden fixtures cho output/audit; trigger SQLite có thể dùng nhưng không tương đương PL/pgSQL |
| Transaction, row lock, SKIP LOCKED, advisory lock | Không port nguyên mô hình khóa hàng/lease PG | D1 batch có tính transaction [S6]; thiết kế CAS revision, unique key, lease bằng update có điều kiện, test đồng thời và crash; không gọi D1 là không có transaction |
| pg_cron/pg_net | Không được chuyển ngầm sang Workers Cron | Lịch mới cần phê duyệt; tránh hai scheduler đồng thời; journal job ownership, retry/backoff, không thay lịch production đợt này |
| Realtime/publication | Không có đường chuyển tương đương tự động | Nếu cần, chọn SSE/WebSocket/Durable Objects sau đánh giá quota; không nhân polling lên để bù. Hiện chưa xác nhận subscriber trong mã |
| Web Push | Subscription gắn origin và VAPID; delivery không đảm bảo chính xác một lần | Giữ origin, worker scope, VAPID, subscription và payload không PII; move sender phải giữ outbox/lease/dedup, retry 429/5xx/410, thu hồi |
| Secrets | Service-role bỏ qua RLS nếu dùng sai | Không gửi secret vào client, log, GitHub hoặc fixture; binding secret theo môi trường. Không đổi khóa production |
| Đồng bộ 41 TDP | Hai DB/queue có thể tạo split-brain, lặp và ACK sớm | Một writer mỗi entity; source_id + version + event_id + payload hash; ACK sau commit bền; tombstone và delta có thứ tự, revision conflict rõ; giữ ghi chú Văn phòng |

## 7. Nguyên mẫu cô lập đã thực hiện

**Chọn:** danh mục hướng dẫn công khai của CCB, dựng lại bằng 1.000 bản ghi giả. CCB đứng đầu lộ trình nên phù hợp kiểm tra adapter trước; không đưa hội viên, token, tệp thật, Auth, Push hoặc dữ liệu TDP vào thí điểm. Nội dung giả không có giá trị hướng dẫn nghiệp vụ.

Nguyên mẫu gồm reader Workers dùng D1 binding, schema SQLite có index (category,published,id), phân trang cursor tối đa 20, GET-only, tham số bind, chặn input ngoài phạm vi và fail-closed khi thiếu DB. Không có writer từ Internet, cron, outbound fetch, URL production hay cấu hình deploy. Không nhập vào tuyến chạy của ứng dụng.

Thực nghiệm ngày 06/11, cục bộ:

- SQLite: seed 1.000 dòng; chạy 10.000 truy vấn; xác nhận dùng index, giới hạn trang, chặn SQL injection qua binding, ẩn bản ghi chưa công bố, dump/restore fixture so sánh toàn bộ hàng: 5 kiểm tra đạt.
- Handler JavaScript: 7 kiểm tra đạt cho GET hợp lệ, POST, route sai, category sai, cursor âm, thiếu binding, DB lỗi; D1 binding được mock.
- p50 truy vấn SQLite khoảng 0,0123 ms; p95 khoảng 0,0310 ms trên máy thử. **Không dùng số này chứng minh CPU Workers <10 ms hoặc latency D1 thật**; không gồm mạng/serialization/edge.
- Hash fixture: 3cf627f6166a777bab3586245c2d82b35f9b7d24cb5a657fd478f7facaff7660.
- Số gọi Lovable/Cloudflare: 0/0; tiền dịch vụ bổ sung thực nghiệm: 0 USD. Chưa có remote D1 rows_read/rows_written hoặc CPU Workers. Không chạy Wrangler/Miniflare vì chưa có công cụ đó sẵn trong môi trường; không tạo tài nguyên cloud.
- Restore ở đây chỉ là **fixture SQLite**, không phải khôi phục Database + Storage của sáu ứng dụng.

Kịch bản tải để đo khi có môi trường cô lập được phê duyệt: giả sử cả sáu app dùng 300 phiên/ngày/app, 10 trang/phiên →18.000 requests/ngày; tối đa 40 rows_read/page theo ngân sách giả định có index →720.000 rows_read/ngày. Giả sử 600 cập nhật công khai/ngày toàn bộ, dự trù 5 rows_written/cập nhật kể cả index →3.000/ngày. Tương ứng 18% request, 14,4% read và 3% write hạn mức Free, **chưa cộng traffic tài khoản đang có**; hệ số này không phải đo D1. Nếu bỏ index và mỗi request quét 10.000 dòng thì 180 triệu rows/ngày, vượt quota 36 lần.

Bước đo cloud còn thiếu: chỉ dùng project/DB giả tách riêng, không deploy theo quyền đợt này; sau khi được duyệt riêng mới thu tổng meta.rows_read/rows_written, CPU, p50/p95 mạng, lỗi/quota và baseline account. Theo dõi 7 ngày với ngày tải cao 5 lần; không bật trả phí. Nếu CPU/quota không đạt, chọn nội dung static hoặc giảm thiết kế truy vấn, không tự nâng cấp gói.

## 8. Backup Database + Storage — ĐIỀU KIỆN CHẶN

Tài liệu Lovable [S8] xác nhận daily backup/export DB và tải Storage là hai việc riêng. Export chứa cấu trúc/dữ liệu và tài khoản/password hash, nhưng không đủ secrets, API keys, sign-in provider config hoặc mã Edge Functions. Restore dashboard thay DB cùng project, không dùng làm bài thử ở production.

**Chưa có bằng chứng đã nhận archive đủ sáu DB, tải đủ Storage bytes hoặc khôi phục thử thành công.** Hồ sơ 04/11 cũng ghi chưa đạt; nghiên cứu này không có export/restore mới và không suy từ nút Backup hoặc số metadata thành đã bảo vệ dữ liệu. Vì vậy tất cả chuyển đổi dữ liệu production bị chặn.

Số metadata Storage lịch sử 04/11: Mặt trận 385; Phụ nữ 0; Công đoàn 2; Thanh niên 10; CCB 4; Nông dân 0. Đây là count lịch sử, không kiểm chứng bytes hôm nay, không làm tiêu chí cố định và không chứng minh bucket rỗng luôn an toàn.

Điều kiện gỡ chặn cho từng app:

1. Archive PostgreSQL nhất quán, có schema/data/auth/RLS/grants/functions/triggers/extensions; migration head và phiên bản được ghi. Lập manifest/hash, kiểm tra archive đọc được. Không lưu dữ liệu cá nhân hoặc secret vào GitHub.
2. Liệt kê đủ bucket/object qua phân trang; tải **toàn bộ bytes**, hash từng object, đối chiếu size/MIME/path/quyền/tổng số/tổng dung lượng và tham chiếu trong DB. Đánh giá orphan và missing, không tự xóa.
3. Đồng nhất cutoff Database/Storage, ghi nhận delta/tombstone phát sinh trong lúc backup; chưa được phép tự dừng job/nguồn để tạo cutoff.
4. Backup cấu hình không nằm trong archive: provider Auth, job và secret references, Sheets/nguồn TDP, scope Push/VAPID; bí mật nằm trong kho riêng của chủ sở hữu, không trích ra báo cáo.
5. Restore vào môi trường miễn phí cô lập; khóa egress và cron/Push/email **trước restore**. Đối chiếu toàn bộ hash/count, quyền âm/dương, thu hồi, token/session, file gateway, outbox, ACK và delta. Ghi log RPO/RTO đo thực; mục tiêu đề xuất RPO=0 bản ghi đã ACK và RTO≤4 giờ, cần chủ sở hữu duyệt theo năng lực thực tế.
6. Giữ một bản độc lập khỏi backend nguồn. Chỉ gọi là đạt sau có biên bản thời gian, hash, count, ca test, lỗi và người giữ backup; không dùng SQLite fixture ở mục 7 để vượt cổng này.

## 9. Lộ trình tuần tự và giữ nguyên ứng dụng đã cài

| Giai đoạn | Công việc | Cổng ra |
|---|---|---|
| 0 — Nghiên cứu hiện tại | Báo cáo, bản đồ mã, fixture local, đối chiếu tài liệu | Không thay production, không yêu cầu người dùng cài gì |
| 1 — Đo và bảo vệ | Lấy size/active hours/credits cùng kỳ 30 ngày của sáu project và workspace; rà cron ngoài; backup + restore cô lập | Đủ bằng chứng giá giờ/phạm vi grant/restore; xác định phần nào tạo server floor |
| 2 — Pilot công khai | CCB public guide, static hoặc Workers/D1 nếu cần cập nhật động; dữ liệu giả trước, feature flag mặc định tắt | Remote metrics thực, quota tài khoản còn đủ, quyền/latency đạt; phê duyệt riêng mới thử trên URL hiện có |
| 3 — Chuyển từng phân hệ | CCB → Nông dân → Công đoàn → Phụ nữ → Thanh niên | Mỗi app một quyết định, một writer, delta và rollback đã diễn tập; quan sát ít nhất 7 ngày, không ép tiến độ |
| 4 — Sổ tay cuối cùng | Chỉ khi các bước trước chứng minh tiết kiệm nền; chia nhỏ phần độc lập, giữ lõi quyền/TDP/Push | Kiểm thử nguồn 41 TDP hai chiều đầy đủ, ACK sau commit, quyền và tệp/Push thật |
| 5 — Đánh giá tài nguyên cũ | Lập phương án ngừng tài nguyên không còn phụ thuộc nếu cần giảm nền | Hoàn toàn ngoài quyền hiện tại; không Pause/Remove hoặc xóa archive/dữ liệu theo báo cáo này |

Giữ frontend origin, URL, manifest id/start_url/scope và service-worker URL/scope; thay backend bằng adapter bên trong cùng giao diện, không thêm ứng dụng. Nếu origin là *.lovable.app thì không tự chuyển domain; giữ frontend tại đó trong các bước đầu. Khả năng giữ URL này khi rời hoàn toàn hosting Lovable chưa được provider xác nhận và không được hứa trước.

Giữ subscription Push và VAPID, không yêu cầu đăng ký/cài lại. Origin đổi sẽ phá điều kiện này; đây là cổng chặn. Giữ khóa và quyền production trong nghiên cứu. Cookie, JWT issuer và session không tự di chuyển chỉ vì UI còn URL: phải thử phiên hiện hữu, thiết bị standalone và cơ chế thu hồi trước; chưa có bằng chứng thì giữ Auth cũ.

Với 41 TDP: không thay source-of-truth tùy ý. Giữ hợp đồng receiver/BFF, event_id/version/source_id và checksum; ACK chỉ sau ghi bền, timeout sau commit gửi lại không tăng số; kiểm tra event cũ/mới sai thứ tự, xung đột cùng version khác hash, retry có backoff, lease hết hạn, crash giữa commit và ACK, tombstone và văn phòng ghi chú. HTTP 202 hoặc worker wake không phải ACK nghiệp vụ. Nút Đồng bộ ngay chỉ gọi cùng pipeline an toàn, không tạo writer thứ hai. Lịch thứ Năm 15:30/16:00/16:30/chốt 17:00 là đề xuất trước đây chưa triển khai; không dùng nó làm hiện trạng hoặc tự đổi cron.

Rollback tương lai: feature flag/adaptor quay về nguồn cũ; trước đó journal mọi ghi mới và phiên bản, replay delta theo idempotency rồi đối chiếu count/hash/ACK. Không dual-write không kiểm soát; đọc shadow không có quyền ghi. Dừng cắt chuyển nếu quyền sai hoặc mất/trùng bản ghi. Khôi phục artifact frontend riêng với data reconciliation; không restore dump cũ lên production để rollback giao diện. Chỉ một phân hệ tại một thời điểm.

## 10. Danh mục rủi ro và nghiệm thu

| Rủi ro | Mức | Dấu hiệu / biện pháp | Điều kiện nghiệm thu |
|---|---|---|---|
| Chuyển request nhưng nền không giảm | Cao | Server credits/active hours không đổi; phân tích B/V/O | Savings cùng kỳ, cùng tải; không chỉ đếm requests |
| Quota tài khoản chung đã bị 41 TDP dùng | Cao | Không đủ headroom hoặc lỗi Free quota | Account tổng <50% quota ở tải thường; stress 5× vẫn trong quota hoặc có cơ chế giới hạn an toàn |
| RLS bị mất khi dùng service role/Worker | Nghiêm trọng | Truy cập chéo unit, forge role/token | 100% ca âm/dương/quyền thu hồi đạt; 0 bí mật ở bundle/log |
| ACK sớm, mất hoặc lặp nghiệp vụ | Nghiêm trọng | ACK có nhưng bản ghi chưa durable; retry tăng tổng | 0 mất bản ghi đã ACK; 0 bản ghi trùng theo event/version; crash/replay đạt |
| Thu hồi tệp không hiệu lực do cache | Cao | Link cũ vẫn đọc sau SLA | Cửa sổ thu hồi đã được chủ sở hữu chấp nhận; kiểm tra gateway/cache mọi đường tải |
| Push/PWA bị đứt | Cao | Mất subscription/session sau cập nhật | URL/manifest/scope giữ nguyên; iOS standalone, Android, web + thu hồi Push đạt |
| Backup thiếu bytes hoặc lệch thời điểm | Nghiêm trọng | Metadata có, file thiếu; thiếu delta | Toàn bộ hash/restore/cutoff đạt; RPO/RTO đo được |
| Split-brain khi rollback | Nghiêm trọng | Hai writer, delta sau chuyển không về nguồn | Một writer; journal/replay/reconcile diễn tập đạt |
| Chi phí AI bị bỏ sót | Cao | API legal-ai tiêu Run ngoài server | Tách AI/connector; không gọi AI trong pilot; quota server-side giữ nguyên |
| Migration trong repo khác production | Cao | Hàm/RPC thiếu hoặc policy drift | Inventory live chỉ đọc được cấp quyền, diff schema/config trước quyết định |

Cổng nghiệm thu tài chính: một kỳ cấp đầy đủ và rolling 30 ngày sau chuyển, cả sáu app cùng workspace; Cloud ≤ grant thực tế đã đối soát (tài liệu hiện ghi 20), AI/connector trong grant riêng, không tiêu credits chung do vận hành nếu mục tiêu là chỉ phần miễn phí. Mục tiêu vận hành đề xuất tổng Run ≤15 để có biên dự phòng, nhưng còn phụ thuộc grant theo loại. Không kết luận từ một ngày 0,15 hoặc một app đạt.

Cổng chức năng: dữ liệu và quyền bảo toàn, không cài lại, hợp đồng API cũ đạt, 41 TDP không thiếu tổ, ACK/dedup/thu hồi và Web Push thiết bị thật đạt; p95 tác vụ người dùng mục tiêu ≤2 giây và tỷ lệ lỗi không tăng so baseline (đề xuất, phải nghiệm thu trong điều kiện mạng thực). Restore/rollback đủ bằng chứng là bắt buộc trước chuyển dữ liệu.

## 11. Điểm chưa xác minh và kết luận có điều kiện

Chưa có: ảnh gốc 06/11 được đọc lại; Run/Cloud/AI/connector năm app cùng kỳ; workspace/billing-cycle mapping; đơn giá và metering active-hours; traffic cron ngoài, publication/realtime live; quota Cloudflare thực còn; D1/Workers metrics remote; archive DB+Storage đủ và restore thật; kiểm thử Push/session/41 TDP end-to-end sau chuyển. Không có phản hồi Support mới và không gửi yêu cầu cho Support trong nhiệm vụ.

Tự phản biện: pilot public guide chứng minh một ranh giới có thể tách, không đại diện cho lõi quyền/Push/TDP và có thể vốn đã là nội dung tĩnh nên tiết kiệm gần 0. Mô hình B=34 là giả định, không phải baseline đo; số SQLite rất nhanh không chứng minh Workers Free phù hợp. Thiết kế D1 chỉ trở thành phương án tài chính khi giảm được số backend/giờ bị tính phí hoặc phần tải thực có ý nghĩa; giữ nguyên sáu server có thể vẫn vượt grant sau khi chuyển nhiều chức năng.

**Đề xuất tối ưu sau phản biện:** chưa di chuyển dữ liệu. Giữ sáu PR draft; dùng A để có baseline, hoàn thành backup/restore; chỉ dùng B/C cho ranh giới đã chứng minh độc lập và không nhạy cảm. Nội dung tĩnh dùng static trước; D1 chỉ dành phần cần cập nhật/truy vấn động. Sau pilot phải đo server floor còn lại trước khi đầu tư tiếp. Nếu server floor sáu app vẫn > grant, báo rõ mục tiêu miễn phí không thể đạt trong ràng buộc giữ tất cả backend active; chuẩn bị quyết định kiến trúc riêng, không mua credits hoặc tự ngừng dịch vụ.

## 12. Nguồn chính thức đọc ngày 06/11/2026

- [S1 — Lovable credits and usage](https://docs.lovable.dev/introduction/credits-and-usage): nguồn/phạm vi grant, Build/Run và kỳ cấp.
- [S2 — Lovable project usage](https://docs.lovable.dev/features/project-usage): phân loại chi phí và thời gian active.
- [S3 — Lovable pause/resume](https://docs.lovable.dev/features/database-pause-remove): inactivity, resume và phạm vi dịch vụ.
- [S4 — Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): scale-to-zero, quota, rows/index và lỗi vượt Free.
- [S5 — Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): request/CPU Free.
- [S6 — D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/): binding, prepared statement, batch transaction.
- [S7 — D1 limits](https://developers.cloudflare.com/d1/platform/limits/): giới hạn DB, tài khoản và Time Travel Free.
- [S8 — Lovable backups/export](https://docs.lovable.dev/features/database-backups): phạm vi export, Storage/config và restore cùng project.
- [S9 — Supabase backups](https://supabase.com/docs/guides/platform/backups): DB metadata không thay Storage bytes; không suy quyền lợi Supabase paid áp dụng cho Lovable.

Bằng chứng nội bộ: sáu PR #17/#2 tại https://github.com/ltkien225-art/ theo repository và SHA ở mục 2; docs/RELEASE-AUDIT-2026-11-04.md và docs/RUN-COST-EVIDENCE-2026-11-04.md đã đọc. Các kết quả test 991/8 trong hồ sơ đó là lịch sử 04/11, không được báo thành đã chạy lại 06/11.
