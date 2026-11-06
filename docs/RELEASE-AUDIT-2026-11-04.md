# Báo cáo kiểm tra sáu PR — bổ sung 04/11/2026

**Trạng thái: CHƯA ĐỦ ĐIỀU KIỆN PHÁT HÀNH. Không merge main, không deploy, không sửa cron/RLS/PIN/khóa/quyền hay dữ liệu production.**

## Xác minh tiếp theo trong phiên 04/11/2026

Đối chiếu trực tiếp sáu PR và main qua GitHub connector; tất cả đang mở, DRAFT, đúng nhánh yêu cầu, chưa merged. Tại thời điểm đọc, mỗi HEAD chứa toàn bộ main (behind_by=0). Mã nguồn text được tải theo SHA và kiểm tra Git blob hash; assets Mặt trận dùng trong test cũng khớp hash. Không clone được qua Git HTTPS do chưa có credential CLI; dùng API đã được cấp quyền, không yêu cầu token trong chat.

| Repository | PR | HEAD trước cập nhật phiên này | main đã đối chiếu | ahead / behind |
|---|---:|---|---|---|
| `so-tay-mat-tran-so-son-tra` | #17 | `8274f0205b86bc25de4879b0a430904b6bd09598` | `d370fe3c8d2b47f57ac6b9ed3a4f445b33ea295b` | +11 / −0 |
| `son-tra-chapter-hub` | #2 | `e4c1586426e95dee8e6a52d7d1ba00f352e7b2c7` | `8dee3d278706e5fea0ccf57db58fb334cc6258f4` | +6 / −0 |
| `son-tra-union-desk` | #2 | `3051a9e931e5de317d86659f4eabcd6bd57fbb4f` | `6c9b7dd3b71517d1107a19524dc1086e1a98193a` | +5 / −0 |
| `son-tra-youth-archive` | #2 | `a80a894137f16a421b2dd6a5defc7406937e5d76` | `6399d46a3d869e2b204ca7e18a783551a577f0b6` | +4 / −0 |
| `son-tra-branch-compass` | #2 | `63662009ebd19b6f268cf7cc1b55d01297a97e33` | `390b52ffc9440d61bac1539915acc4f2b8bc5685` | +2 / −0 |
| `son-tra-farmer-hub` | #2 | `0b1a5b63baec44619badb2fefcdf1ebfa35034c7` | `2f4e0c4b5566b0388f04d7f089ae3cef596f5c8e` | +4 / −0 |

Bằng chứng kiểm thử bên dưới gắn với các SHA này cộng diff tối ưu bổ sung trong chính PR; commit mới giữ nguyên lịch sử. Trước phát hành phải đối chiếu main/HEAD lại.

### Kết quả chạy lại hiện tại

Node 24.22.1, Bun 1.3.13, Vitest 4.1.11; cài dependency theo bun.lock (frozen, ignore-scripts; CCB cập nhật lock sau khi khai báo peer kiểm thử còn thiếu). Dùng fixture/mock/cơ sở dữ liệu PGlite cục bộ, không ghi TEST lên backend vận hành. Chạy `node node_modules/vitest/vitest.mjs run`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build` trong từng snapshot.

| Ứng dụng | Tests đạt | Skip | TypeScript | Build |
|---|---:|---:|---|---|
| Mặt trận | 532 | 8 | đạt | đạt |
| Phụ nữ | 103 | 0 | đạt | đạt |
| Công đoàn | 175 | 0 | đạt | đạt |
| Thanh niên | 38 | 0 | đạt | đạt |
| Cựu chiến binh | 48 | 0 | đạt | đạt |
| Nông dân | 95 | 0 | đạt | đạt |
| Tổng phiên này | **991** | **8** | 6/6 | 6/6 |

Tám skip Mặt trận: 7 ca opt-in PostgreSQL và 1 ca ct-internal sẵn có. Đã thử chuẩn bị PostgreSQL riêng nhưng môi trường thiếu psql/thư viện hệ thống và không cho đổi chủ thư mục sang user DB; chưa chạy lại được. Không thay bằng SQL ghi thử production. **996 ca của phiên trước là số lịch sử, không phải kết quả mới.** Không cộng lại lần chạy lặp. Bộ PGlite Nông dân chạy migration/quyền trên fixture đã đạt; query integration test thực của React Query và scheduler cũng đạt. Chưa lặp HTTP smoke hoặc browser/Push/nguồn 41 TDP thật, không kế thừa kết quả đó như đã chạy mới.

GitHub Actions tại HEAD trước cập nhật: Mặt trận success #41792774156; Phụ nữ success #41792556961; Công đoàn success #41792563474; Thanh niên success #41792567353; Nông dân success #41792561456. **CCB failure #41792555053**, log job 126449075640 xác nhận thiếu @testing-library/dom, build/typecheck trong lượt đó skipped. Bổ sung devDependency @testing-library/dom=10.4.2 và bun.lock, không đổi runtime/auth. CI ở commit mới cần đọc lại; CI cũ thành công không thay được kết quả mới.

### Tối ưu bổ sung và giới hạn

- CCB: thông báo rỗng chỉ đọc notifications, bỏ đọc notification_reads; khi có dữ liệu chỉ đọc biên nhận của tối đa 200 thông báo đang hiển thị. Lỗi ở một trong hai bước vẫn báo lỗi; invalidation/focus/reconnect tiếp tục đọc mới, không cache kết quả rỗng vĩnh viễn. Thêm regression kiểm tra inbox rỗng → có dữ liệu, đúng phạm vi IDs và unread. Đổi truy vấn song song thành hai bước phụ thuộc có thể tăng độ trễ inbox có dữ liệu; đổi lại giảm đọc rỗng và biên nhận không dùng. Cần đo p95 thực tế.
- Công đoàn: Sổ đơn vị dùng scheduler có chặn ẩn/offline và gộp in-flight; giữ 30 giây khi hiển thị để không nới cửa sổ thu hồi. Có refresh ngay khi visibility/online/focus, hủy listener khi rời trang và không áp kết quả sau cleanup. Không retry mutation. Test bổ sung giữ đúng 30 giây, không đọc nền, refresh khi quay lại và dọn listener.
- Không đổi kiểm tra quyền trên server/RLS, ACK, outbox, chống ghi trùng hoặc lịch job. Giữ poll kiểm tra quyền tệp 5 giây của Thanh niên vì đây là chức năng thu hồi, chưa có cơ chế thay thế được nghiệm thu. Không tắt toàn bộ cập nhật đa người dùng để giảm requests.
- Phụ nữ, Thanh niên, Nông dân và Mặt trận giữ mã tối ưu trước đó; chưa có thay đổi mới đủ căn cứ để giảm giờ DB. Cập nhật báo cáo và bằng chứng thay vì tạo diff mã không cần thiết.

### Chi phí và kiểm kê backend

Đọc [RUN-COST-EVIDENCE-2026-11-04.md](./RUN-COST-EVIDENCE-2026-11-04.md) để có bảng sáu app, nguồn/kỳ đo, công thức chi phí nền, điều kiện cần của mục tiêu 15 và bản nháp Support chưa gửi. Đã loại bỏ phép tính theo đơn giá pico chưa xác minh; Estimated cost Tiny 37,64 không được dùng làm giá DB. Không giả định ngủ sau vài phút/giờ, không hứa giãn cron tiết kiệm giờ DB.

Đã truy cập Lovable connector với quyền chủ sở hữu, sáu backend enabled. Chỉ đọc SELECT metadata, không xem command/secret/nội dung nghiệp vụ. pg_database_size khác phạm vi chỉ số allocated storage 0,28/2 GB trong ảnh; không dùng để phủ nhận số liệu ảnh.

| Backend | pg_database_size (bytes) | Object metadata Storage |
|---|---:|---:|
| Sổ Tay Mặt Trận | 27342515 | 385 |
| Son Tra Farmer Hub | 13014707 | 0 |
| Son Tra Branch Compass | 13383347 | 4 |
| Son Tra Youth Archive | 13473459 | 10 |
| Son Tra Union Desk | 12375731 | 2 |
| Son Tra Chapter Hub | 14948019 | 0 |

Đây là snapshot metadata, không phải checksum/tải thử bytes. Count không bao gồm bằng chứng nội dung object thực tồn tại; 0 object cũng chưa chứng minh backup DB/config đầy đủ. Nguồn 41 TDP và Google Sheets cần bảo vệ/khôi phục riêng.

### Backup/restore — vẫn CHƯA ĐẠT

Kết nối hiện có đọc SQL metadata nhưng các tool Lovable được cung cấp không có chức năng export archive DB hoặc tải toàn bộ private Storage bytes/cấu hình provider. Không có archive/manifest/hash đã nhận, chưa có restore thử. Không dùng SELECT dữ liệu cá nhân để giả lập dump; không thử Restore dashboard lên production vì thao tác đó thay DB hiện hành. Không yêu cầu gửi secret/cookie/password trong chat. Cần mở luồng export/download được provider hỗ trợ trong phiên quản trị thích hợp, hoặc nhận bộ backup riêng tư đã export vào môi trường xử lý được cấp quyền; bảo quản ở nơi riêng của chủ sở hữu, không đưa GitHub.

Sau khi có bytes: kiểm tra archive + đầy đủ bucket/object qua pagination; hash toàn bộ, đối chiếu số lượng/tổng bytes/metadata và DB; xác lập cutoff/delta nhất quán khi production vẫn ghi; phục hồi vào bản sao miễn phí cô lập chặn egress/cron/Push; kiểm tra schema/auth/RLS/file access/thu hồi, ACK/idempotency/41 TDP và đo RPO/RTO. Quy trình chi tiết bên dưới được giữ làm checklist, **không phải biên bản thực hiện**.

### Cổng phát hành và đánh giá 04/12/2026

Thứ tự: CCB → Nông dân → Công đoàn → Phụ nữ → Thanh niên → **Mặt trận sau cùng**. Mỗi lượt cần CI đúng HEAD, backup DB+Storage phục hồi đạt, kiểm thử quyền/PIN/file/Push và nguồn 41 TDP phù hợp, SHA/artifact/deployment rollback ghi riêng và theo dõi ít nhất một ngày làm việc. Dừng lượt kế nếu bất kỳ cổng nào thiếu. Không merge/deploy hiện tại.

Giữ origin/manifest/start_url/scope/Push subscription/VAPID, các phiên và URL cũ; không cài lại. Frontend rollback bằng artifact cũ hoặc revert có review, không reset/force-push/ghi đè dữ liệu mới. Nếu chưa triển khai trước 04/12, báo rõ chưa có savings sau triển khai. Thu dữ liệu cùng kỳ cho sáu app theo mẫu trong báo cáo chi phí; chưa có dữ liệu tương lai hoặc đơn giá thì để thiếu, không tạo dự báo chắc chắn.

---

## Hồ sơ lịch sử của lượt trước — chưa coi là kiểm tra lại

### Phạm vi và bằng chứng (lịch sử)

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

### Lỗi xử lý và tối ưu (lịch sử)

- Phụ nữ và Thanh niên: khắc phục nguy cơ dữ liệu màn hình đang mở không cập nhật do tắt toàn bộ polling. Giữ refresh 5 phút khi tab hiển thị, làm mới khi focus/reconnect kể cả cache còn fresh. Không đổi quyền backend.
- Cựu chiến binh/Nông dân: giữ 5 phút và bắt buộc focus/reconnect. Lỗi truy vấn thông báo được ném cho query xử lý, không bị báo thành kết quả rỗng/số 0 thành công.
- Công đoàn: giữ 5 phút khi hiển thị; bổ sung reconnect, gộp wake khi request chưa xong, dọn listener/timer khi rời trang; không tự retry mutation. Lỗi refresh xóa dữ liệu như trước, thông báo không quy kết nhầm mọi lỗi mạng là bị thu hồi quyền.
- Mặt trận: giữ thay đổi PR 15→60 giây ở trang tổng quan, 15→30 giây ở danh sách văn bản; thêm 7 ca xác thực cron (thiếu cấu hình, Bearer sai định dạng, token sai, current/previous). Không đổi cron/secret.
- 16 ca query integration mới kiểm tra React Query thực: không polling mỗi phút, nhận revision mới sau 5 phút, tab ẩn không gọi, focus/reconnect/invalidation vẫn nhận dữ liệu và phục hồi lỗi. 3 ca scheduler Công đoàn kiểm tra offline/ẩn/in-flight/cleanup. 2 ca CCB kiểm tra lỗi đọc thông báo/biên nhận. Tổng 28 ca bổ sung.

Giới hạn: màn hình đang hiển thị có thể chờ tối đa khoảng 5 phút để thấy thay đổi từ người khác; thao tác ghi vẫn dùng invalidation/read-back hiện có. Cần nghiệm thu nhiều thiết bị và Web Push thật trước merge. Không cache dữ liệu riêng tư vào service worker, không đổi manifest/start_url/URL nên không yêu cầu cài lại.

### Ngân sách và cron (lịch sử)

15 credits/tháng là mục tiêu, chưa chứng minh đạt. Số liệu chi phí trong tài liệu PR Mặt trận là bằng chứng lịch sử chưa được xác minh lại trong phiên này. Không dùng nhận định ngủ ngắn hạn; cơ chế auto-pause khoảng 7 ngày và đơn giá/active-hours phải đọc theo báo cáo chi phí mới ở trên. Hai job `push-outbox-retry` và `son-tra-tdp-feedback-retry` giữ nguyên; HTTP202 của wake hoặc job thành công không phải ACK giao hàng.

Trước mọi thử nghiệm cron: xuất cấu hình job hiện hành vào nơi riêng tư (command có thể chứa secret); chụp retry/outbox/lease/ACK; chứng minh enqueue→dispatch→ACK, retry 429/5xx/timeout, mất mạng, crash giữa commit và ACK, token/subscription thu hồi, không gửi trùng; xác minh nguồn 41 TDP có fallback bền vững. Kiểm thử receiver cục bộ chưa thay được nghiệm thu end-to-end của nguồn.

### Quy trình sao lưu chưa thực hiện

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

### Chặn được ghi nhận trong lượt trước

- Thiếu bằng chứng backup + restore đầy đủ và quyền quản trị Lovable/DB/Storage phù hợp. Trình duyệt chia sẻ không khởi động được (thiếu cấu hình xác thực nền tảng); đăng nhập ở trình duyệt cá nhân không tự cấp phiên cho Codex. Không yêu cầu gửi cookie/password/token trong chat.
- Cả sáu URL public bị proxy 403; đây là giới hạn mạng, không chứng minh ứng dụng down. Đã lưu bản nháp cho phép đúng sáu tên miền, chưa áp dụng/publish. Kiểm thử HTTP cục bộ đạt không thay cho hậu kiểm URL cũ.
- Chưa có số credits hiện hành, E2E nguồn 41 TDP, Push trên thiết bị thật hoặc kiểm thử auth/Storage restore. Chưa merge/deploy nên không có hậu kiểm sau cập nhật.

Đường dẫn log của lượt trước `/workspace/validation-20261104/` chưa được xác minh còn tồn tại. Log lượt hiện tại nằm ngoài snapshot mã nguồn tại `/workspace/scratch/e6e7666a0e47/*-{test,typecheck,build}.log`; chỉ kết quả tổng hợp và checksum log được đưa GitHub.
