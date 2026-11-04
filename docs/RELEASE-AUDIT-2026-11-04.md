# Báo cáo kiểm tra sáu PR — 04/11/2026

**Trạng thái: CHƯA ĐỦ ĐIỀU KIỆN PHÁT HÀNH. Không merge main, không deploy, không sửa cron/RLS/PIN/khóa/quyền hay dữ liệu production.**

## Phạm vi và bằng chứng

Đọc trực tiếp `refs/pull/17/head` (Mặt trận) và `refs/pull/2/head` (năm ứng dụng khác); tất cả khớp nhánh `audit/optimize-run-credits-20261104` lúc khảo sát. Fetch main; bốn PR Mặt trận, Phụ nữ, Nông dân, Thanh niên chậm 2 commit đã được merge main vào nhánh PR, không rebase/force-push. Hai PR còn lại đã chứa main. CI cũ do người dùng cung cấp; lần này xác minh bằng runner cục bộ, không suy diễn trạng thái GitHub Checks mới.

| Ứng dụng | Unit/component/DB in-memory đạt | Build | TypeScript | HTTP cục bộ trang công khai |
|---|---:|---|---|---|
| Sổ tay Mặt trận | 532 | đạt | đạt | 200 + HTML |
| Hội Cựu chiến binh | 47 | đạt | đạt | 200 + HTML |
| Hội Phụ nữ | 103 | đạt | đạt | 200 + HTML |
| Hội Nông dân | 95 | đạt | đạt | 200 + HTML |
| Công đoàn | 174 | đạt | đạt | 200 + HTML |
| Đoàn Thanh niên | 38 | đạt | đạt | 200 + HTML |

Lệnh: `node node_modules/vitest/vitest.mjs run`, `node node_modules/vite/bin/vite.js build`, `node node_modules/typescript/bin/tsc --noEmit` trong từng checkout. Node 24.22.1, Bun 1.3.13; cần GitHub CI xác minh lại Node 22 theo workflow hiện hành. Không chạy dịch vụ trả phí hoặc API AI. Không chạy lint toàn kho; bảng không coi lint là đã đạt.

Mặt trận: lượt mặc định 8 ca skip; 7 ca đã chạy riêng và đạt trên PostgreSQL **cục bộ** (server 18.6, psql 17.11): `tdp-feedback-db.test.ts` (3) và `push-bulk-db.test.ts` (4). Một ca `ct-internal.test.ts` vẫn skip sẵn, chưa được xác minh. Tổng 996 ca riêng biệt đạt; không cộng lại những lần chạy lặp.

DB integration kiểm tra: giao trùng đồng thời; ACK chỉ sau commit; phiên bản đến sai thứ tự/higher-version hội tụ; xung đột; ghi chú Văn phòng không bị nguồn ghi đè; bảng riêng tư không cho anon/authenticated đọc; cấp Push theo 41 Ban, bảo toàn liên kết cũ, cooldown/giới hạn nguyên tử, RPC không cho quyền công khai. Nông dân có 4 suite PGlite kiểm tra migration thật với fixture cô lập. Đây không phải chứng minh RLS/Storage/auth production đã được nghiệm thu. Chưa chạy bộ SQL backend Youth, bộ SQL rollback Union hoặc live backend Women do thiếu snapshot/kết nối thử nghiệm phù hợp; không chạy fixture lên production.

## Lỗi xử lý và tối ưu

- Phụ nữ và Thanh niên: khắc phục nguy cơ dữ liệu màn hình đang mở không cập nhật do tắt toàn bộ polling. Giữ refresh 5 phút khi tab hiển thị, làm mới khi focus/reconnect kể cả cache còn fresh. Không đổi quyền backend.
- Cựu chiến binh/Nông dân: giữ 5 phút và bắt buộc focus/reconnect. Lỗi truy vấn thông báo được ném cho query xử lý, không bị báo thành kết quả rỗng/số 0 thành công.
- Công đoàn: giữ 5 phút khi hiển thị; bổ sung reconnect, gộp wake khi request chưa xong, dọn listener/timer khi rời trang; không tự retry mutation. Lỗi refresh xóa dữ liệu như trước, thông báo không quy kết nhầm mọi lỗi mạng là bị thu hồi quyền.
- Mặt trận: giữ thay đổi PR 15→60 giây ở trang tổng quan, 15→30 giây ở danh sách văn bản; thêm 7 ca xác thực cron (thiếu cấu hình, Bearer sai định dạng, token sai, current/previous). Không đổi cron/secret.
- 16 ca query integration mới kiểm tra React Query thực: không polling mỗi phút, nhận revision mới sau 5 phút, tab ẩn không gọi, focus/reconnect/invalidation vẫn nhận dữ liệu và phục hồi lỗi. 3 ca scheduler Công đoàn kiểm tra offline/ẩn/in-flight/cleanup. 2 ca CCB kiểm tra lỗi đọc thông báo/biên nhận. Tổng 28 ca bổ sung.

Giới hạn: màn hình đang hiển thị có thể chờ tối đa khoảng 5 phút để thấy thay đổi từ người khác; thao tác ghi vẫn dùng invalidation/read-back hiện có. Cần nghiệm thu nhiều thiết bị và Web Push thật trước merge. Không cache dữ liệu riêng tư vào service worker, không đổi manifest/start_url/URL nên không yêu cầu cài lại.

## Ngân sách và cron

15 credits/tháng là mục tiêu, chưa chứng minh đạt. Số liệu chi phí trong tài liệu PR Mặt trận là bằng chứng lịch sử chưa được xác minh lại trong phiên này. Polling thưa giảm truy vấn, không bảo đảm DB ngủ nếu cron mỗi phút vẫn đánh thức nó. Hai job `push-outbox-retry` và `son-tra-tdp-feedback-retry` giữ nguyên; HTTP202 của wake hoặc job thành công không phải ACK giao hàng.

Trước mọi thử nghiệm cron: xuất cấu hình job hiện hành vào nơi riêng tư (command có thể chứa secret); chụp retry/outbox/lease/ACK; chứng minh enqueue→dispatch→ACK, retry 429/5xx/timeout, mất mạng, crash giữa commit và ACK, token/subscription thu hồi, không gửi trùng; xác minh nguồn 41 TDP có fallback bền vững. Kiểm thử receiver cục bộ chưa thay được nghiệm thu end-to-end của nguồn.

## Sao lưu: CHƯA XÁC NHẬN AN TOÀN

Khoảng 90 MB DB, 401 tệp Storage là số người dùng cung cấp, chưa đo lại. Chưa có dump, bản blobs, manifest checksum hoặc biên bản restore trong phiên. Chỉ tìm thấy tên cấu hình Supabase publishable trong .env; không có admin/DB/Storage credentials được cấp. Không đọc/in giá trị hoặc thu thập bí mật.

Quy trình bắt buộc do người quản trị thực hiện trong công cụ đã được cấp quyền; không cần mua dịch vụ:

1. Ghi nhận project, thời điểm, version PostgreSQL, schema/migration, extensions, role/grant/RLS/policy, function/trigger, auth, Storage buckets/metadata/policy và cấu hình scheduler. Export cấu hình provider không nằm trong pg_dump bằng cơ chế hỗ trợ. Bảo quản secret hiện có trong kho bí mật của chủ sở hữu, không xoay khóa, không đưa vào Git.
2. Tạo backup DB nhất quán bằng công cụ export/backup được provider hỗ trợ; kiểm tra mã thoát, cấu trúc archive và checksum SHA-256. DB dump riêng không chứa đầy đủ bytes Storage.
3. Liệt kê **tất cả** bucket/object qua phân trang, gồm private bucket, đường dẫn, size, MIME/metadata, version/time và checksum từng object; tải bytes vào nơi riêng tư đã có, kiểm tra toàn bộ manifest thay vì lấy mẫu. Đối chiếu DB↔object, tổng số/tổng bytes; 401 không phải hằng số cố định. Không công bố manifest chứa tên cá nhân/đường dẫn nhạy cảm.
4. Bảo đảm cùng điểm phục hồi giữa DB và Storage: snapshot/phiên bản provider nếu có; nếu export chạy khi đang có ghi, phải có mốc cutoff cùng delta/tombstone và đối chiếu cuối để không bỏ sót ghi/thu hồi. Không tự dừng đồng bộ, không coi hai export khác thời điểm là đủ.
5. Restore **bản sao** vào môi trường cục bộ/đích thử nghiệm miễn phí sẵn có, chưa gắn URL production. Chặn cron, push/email/webhook ra ngoài và khóa egress trước khi restore; không chạy bí mật production để gửi thử. Giữ nguyên backup gốc. Đối chiếu toàn bộ số hàng, khóa ngoại, hash blob, quyền và metadata. Auth/Storage phục hồi cần cơ chế provider phù hợp; DB giả lập không chứng minh đăng nhập/Web Push đã phục hồi.
6. Đo RPO/RTO thực tế; test văn bản + biên nhận/thu hồi, nhiệm vụ + tiến độ, báo cáo tuần/tháng, private files, PIN/quyền âm, 41 TDP hai chiều và Push trên fixture cô lập. Ký biên bản thời điểm/count/hash/kết quả/người giữ backup và có ít nhất một bản ngoài môi trường chuẩn bị phát hành. Không xóa bản production để thử restore.

Bản JSON/CSV xuất từ giao diện chỉ bao phủ một số bảng không thay cho backup đầy đủ. Google Sheets và hệ thống nguồn TDP không nằm trong DB của ứng dụng: kiểm kê nguồn, quyền sở hữu và phương án khôi phục riêng, không đưa nội dung cá nhân vào báo cáo GitHub.

## Phát hành không cài lại và rollback

Thứ tự dự kiến theo phạm vi diff: Cựu chiến binh → Nông dân → Công đoàn → Phụ nữ → Thanh niên → Mặt trận. Trước **từng** ứng dụng: CI trên HEAD mới + backup phục hồi đã đạt + base main/deployment ID được ghi riêng + quyền/Push/đồng bộ đa thiết bị đạt + người phụ trách theo dõi. Chưa đủ một điều kiện thì dừng, không merge/publish.

Giữ nguyên origin, domain, manifest identity/start_url/scope, worker messaging và push subscription/VAPID. Phát hành qua kênh hiện có, không cài lại, không đổi link/PIN. Pilot ở lượt đầu có giám sát; xác minh URL cũ trên iPhone standalone/Android/web với các phiên có sẵn. Xem/tab focus/online và thao tác ghi phải nhận dữ liệu mới; test thu hồi quyền/file và báo cáo không tính trùng. Không kiểm thử dữ liệu TEST lên production khi chưa có kịch bản được chủ sở hữu chấp thuận.

Rollback ứng dụng: ghi SHA main và artifact/deployment cũ ngay trước cập nhật; nếu stale dữ liệu vượt SLA đã nghiệm thu, có lỗi quyền/file/Push/ACK hoặc tăng backlog, dừng các lượt sau và khôi phục artifact cũ qua kênh hiện có. Nếu cần Git, tạo revert commit của thay đổi tối ưu (với merge commit phải chọn đúng parent theo review), không reset/force-push. Kiểm tra diff chỉ hoàn tác thay đổi của đợt này. Đợt hiện tại không thay schema nên không cần data rollback. Không replay mutation, không xóa outbox, không thay khóa. Nếu tương lai đổi cron, restore đúng job/schedule/active/command từ bản riêng tư trước rồi kiểm tra lease/ACK/backlog.

Chỉ restore DB/Storage production khi có sự cố dữ liệu thực và có quyết định riêng của chủ sở hữu, sau đánh giá delta kể từ backup; rollback frontend không được tự ghi đè dữ liệu mới.

## Theo dõi tới 04/12/2026 (Asia/Saigon)

Sau canary cần quan sát ít nhất một ngày làm việc cho mỗi lượt và 7 ngày đo chi phí trước khi kết luận; không nén cửa sổ theo dõi để đủ ngày. Ghi hàng ngày: Run credits từng app/toàn workspace, DB instance-hours, request/RPC/error, active-device traffic, độ trễ p95, pending/dead/oldest-age, ACK nguồn, thu hồi, so sánh baseline cùng lưu lượng. Khi tốc độ burn dự báo vượt 15/tháng thì báo để điều chỉnh, không mua credits hay tự thay cron. Chi phí cố định phải tính riêng, không ngoại suy từ giảm số request.

Ngày 04/12/2026 lập đối chiếu thực tế với mục tiêu 15, số đồng bộ thành công theo TDP, mất/trùng dữ liệu, lỗi quyền/Push và rollback đã dùng. Chưa đặt lịch tự động và chưa có số sau triển khai.

## Chặn còn lại

- Thiếu bằng chứng backup + restore đầy đủ và quyền quản trị Lovable/DB/Storage phù hợp. Trình duyệt chia sẻ không khởi động được (thiếu cấu hình xác thực nền tảng); đăng nhập ở trình duyệt cá nhân không tự cấp phiên cho Codex. Không yêu cầu gửi cookie/password/token trong chat.
- Cả sáu URL public bị proxy 403; đây là giới hạn mạng, không chứng minh ứng dụng down. Đã lưu bản nháp cho phép đúng sáu tên miền, chưa áp dụng/publish. Kiểm thử HTTP cục bộ đạt không thay cho hậu kiểm URL cũ.
- Chưa có số credits hiện hành, E2E nguồn 41 TDP, Push trên thiết bị thật hoặc kiểm thử auth/Storage restore. Chưa merge/deploy nên không có hậu kiểm sau cập nhật.

Log gốc giữ cục bộ ngoài checkout tại `/workspace/validation-20261104/`; báo cáo chỉ lưu kết quả tổng hợp, không đưa dữ liệu/secret lên GitHub.
