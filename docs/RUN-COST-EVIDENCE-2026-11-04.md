# Chi phí vận hành sáu ứng dụng — cập nhật 04/11/2026

**DRAFT — chưa đạt cổng phát hành. Mục tiêu tổng Run ≤15 credits/tháng chưa được chứng minh khả thi với sáu backend hiện tại. Không Pause/Remove, đổi cron, chuyển DB, mua credits hoặc mở dịch vụ có phí.**

## Nguồn và giới hạn

- S1: số liệu ảnh Lovable do chủ sở hữu cung cấp trong nhiệm vụ ngày 04/11/2026. Phiên này không trực tiếp đọc được billing dashboard hoặc xác minh timestamp/filter của ảnh; coi là bằng chứng do chủ sở hữu cung cấp, không phải số đọc qua API.
- S2: [Lovable — Project usage](https://docs.lovable.dev/features/project-usage), đọc 04/11/2026: phân biệt Database server, Database storage và các loại Run; usage có độ trễ, kỳ mặc định 30 ngày. Grant bù tiêu thụ không làm giảm số Run thực tế.
- S3: [Lovable — Performance/capacity](https://docs.lovable.dev/features/database-performance), đọc 04/11/2026: estimated monthly cost dùng backend usage 30 ngày, gồm server và backend khác; ít lịch sử có thể dùng estimate mặc định. Đổi tên size không đổi giá giờ.
- S4: [Lovable — Pause/resume](https://docs.lovable.dev/features/database-pause-remove), đọc 04/11/2026: tự pause sau khoảng 7 ngày không hoạt động; jobs/nền có thể giữ backend hoạt động; URL công khai không tự wake. Pause chặn đọc/ghi, sign-in và Storage.
- S5: [Lovable — Backups/export](https://docs.lovable.dev/features/database-backups), đọc 04/11/2026: backup/export DB không chứa bytes Storage; export còn không chứa secrets, API keys, cấu hình nhà cung cấp đăng nhập hoặc mã Edge Functions. Restore dashboard thay DB cùng project, không dùng để thử trên production.
- S6: truy vấn SELECT metadata qua kết nối Lovable đã cấp quyền, trong phiên ngày 04/11/2026 (Asia/Saigon). Chỉ lấy version, pg_database_size, extension cron, tên/lịch/trạng thái job và tổng object; không lấy command có thể chứa secret, tên file, nội dung nghiệp vụ hoặc dữ liệu cá nhân. Đây là snapshot riêng lẻ, không phải lịch sử 30 ngày. Tất cả sáu backend enabled, PostgreSQL 17.11.

## Bảng đo — chưa thay dữ kiện thiếu bằng suy đoán

| Ứng dụng / repo | Size DB | Active hours | Database server credits | Run credits | Kỳ đo | Cron được kiểm tra | Hoạt động nền khác |
|---|---|---|---|---|---|---|---|
| Mặt trận / so-tay-mat-tran-so-son-tra | Tiny, Shared CPU, RAM tối đa 0,5 GB (S1) | 153 giờ/7 ngày (S1) | 34,2 (S1; 30 ngày theo ngữ cảnh Usage, cần xác minh filter chính xác) | 37,3/30 ngày (S1) | Hai cửa sổ 7 và 30 ngày; chưa có timestamp đầu/cuối | push-outbox-retry; son-tra-tdp-feedback-retry: đều * * * * *, active=true (S6) | Polling UI, Push, nguồn 41 TDP; số lần thực tế chưa đo |
| Phụ nữ / son-tra-chapter-hub | Chưa đọc được size thực tế | Chưa có | Chưa có | Chưa có | Chưa có | hoi-push-daily-reminders: 0 1 * * *; hoi-push-hourly-retry: 15 * * * *, active=true (S6) | Polling/Push; chưa có traffic nền theo kỳ |
| Công đoàn / son-tra-union-desk | Chưa đọc được size thực tế | Chưa có | Chưa có | Chưa có | Chưa có | Không cài pg_cron tại snapshot (S6); chưa kiểm kê scheduler bên ngoài | Polling UI; chưa có số thực tế |
| Thanh niên / son-tra-youth-archive | Chưa đọc được size thực tế | Chưa có | Chưa có | Chưa có | Chưa có | doan-push-daily: 0 0 * * *, active=true (S6) | Polling/Push; chưa có traffic nền theo kỳ |
| Cựu chiến binh / son-tra-branch-compass | Chưa đọc được size thực tế | Chưa có | Chưa có | Chưa có | Chưa có | Không cài pg_cron tại snapshot (S6); chưa kiểm kê scheduler bên ngoài | Polling UI; chưa có số thực tế |
| Nông dân / son-tra-farmer-hub | Chưa đọc được size thực tế | Chưa có | Chưa có | Chưa có | Chưa có | Không cài pg_cron tại snapshot (S6); chưa kiểm kê scheduler bên ngoài | Polling UI; chưa có số thực tế |

Lịch trên là biểu thức thô; chưa xác minh timezone của scheduler nên không quy đổi thành giờ Việt Nam. Không có pg_cron không đồng nghĩa không có scheduler/hoạt động nền khác.

Mặt trận: S1 ghi ~16,1 nghìn requests/7 ngày, Database storage 0,28/2 GB, Estimated cost Tiny 37,64 credits/tháng. **37,64 là estimate backend tổng hợp, không phải đơn giá DB, không chia 720 để suy ra giá giờ.** Không suy ra pico → Tiny là nâng cấp.

## Đơn giá và mức chi phí nền

Chưa tìm thấy bảng đơn giá Tiny theo giờ hoặc định nghĩa/rounding active hours đủ cụ thể trong S2–S4. Không có phản hồi Support. Đơn giá pico 0,0774 trước đây, phép tính 39,3 giờ và 150–200 giờ đã bị rút khỏi căn cứ lập ngân sách. Không chia 34,2 credits/30 ngày cho 153 giờ/7 ngày.

Gọi p_i là đơn giá server theo giờ đã được provider xác nhận, H_i là giờ tính phí cùng kỳ, V_i là phần server theo tải nếu có, O_i là toàn bộ Run ngoài server, tránh đếm trùng. Khi mô hình tính phí được xác nhận: **C_6 = Σ(H_i × p_i + V_i + O_i)**. Hiện p_i, H_i 30 ngày của cả sáu và V_i chưa đủ nên **chi phí nền bằng số của sáu app: chưa xác định**, không điền 6 × 37,64.

Kịch bản kế hoạch dùng thường xuyên, sáu server đều được tính phí liên tục trong 30 ngày: H_i=720, tổng 4.320 instance-hours. Phần nền theo giờ là 720 × Σp_i. Muốn tổng ≤15, điều kiện cần là Σp_i≤0,0208333 credit/giờ (bình quân ≤0,00347222/app/giờ), còn phải trừ V_i và O_i. Đây là điều kiện đại số, **không phải đơn giá hoặc xác nhận provider tính đủ 720 giờ**. Tháng 31 ngày dùng 744; cửa sổ 04/11→04/12 là 30 ngày.

Dữ kiện quan sát: riêng Mặt trận 37,3/30 ngày đã cao hơn ngân sách cả bộ 22,3 credits; riêng server 34,2 cũng vượt 15. Nếu 34,2 và 37,3 cùng filter thì phần ngoài server xấp xỉ 3,1 (làm tròn), không gọi là giá cố định. Năm app còn lại chưa có số cùng kỳ nên chưa thể cộng tổng hoặc dự báo chính xác. Dùng thường xuyên không tạo khoảng 7 ngày hoàn toàn không hoạt động; giảm polling/giãn cron không tạo căn cứ hứa giảm giờ DB. Chưa chứng minh mục tiêu 15 khả thi chỉ bằng tối ưu truy vấn trong kiến trúc này.

## Ba hướng để chủ sở hữu cân nhắc — chưa di chuyển

| Hướng | Lợi ích | Chi phí | Hạn chế/rủi ro | Điều kiện |
|---|---|---|---|---|
| A. Giữ sáu backend, tối ưu truy vấn và đo | Giữ URL, phiên, quyền, Push, nguồn 41 TDP; ít thay đổi | Không mở dịch vụ trả phí; Run vẫn theo C_6, chưa có số nền | Có thể vẫn vượt 15 dù giảm requests | Khuyến nghị làm ngay trên PR; đủ backup/restore và nghiệm thu rồi mới phát hành |
| B. Hợp nhất backend trên tài nguyên đã có, nếu đủ hạn mức miễn phí | Có thể giảm số instance tính phí | Chưa có báo giá/hạn mức; mô hình H_shared×p_shared + tải/Storage/network | Rủi ro cô lập dữ liệu, auth/session, key, Push, migration và rollback; có thể cần đăng nhập lại | Chỉ nghiên cứu sau Support + backup phục hồi + mapping quyền; cần quyết định riêng vì vượt giới hạn hiện tại |
| C. Giữ giao diện, chuyển backend sang hạ tầng có sẵn của đơn vị | Có thể chủ động tài nguyên và giữ frontend URL | Chỉ không phát sinh dịch vụ nếu đã có máy, lưu trữ, mạng, backup đủ năng lực; công vận hành chưa định lượng | Uptime, vá lỗi, egress, bí mật, dự phòng, auth/Push đều phải tự vận hành; không mặc định miễn phí | Kiểm kê năng lực và tổng chi phí trước, có thử phục hồi/cắt chuyển/quay lại; chưa triển khai |

Chọn A cho đợt hiện tại để giảm tải có kiểm chứng. Không hứa A đạt 15. B/C chỉ là phương án đánh giá; không tự gộp/chuyển DB hoặc đổi khóa/RLS.

## Nội dung chủ sở hữu gửi Support — BẢN NHÁP, CHƯA GỬI

Subject: Confirm Tiny hourly Run credit pricing and active-hours metering for six existing projects

Please confirm, in writing, for our existing workspace and six projects (we will provide project IDs privately):
1. The current Tiny Database server rate in Run credits per billable hour, currency/credit conversion if applicable, effective date, region and legacy-plan differences. Is there any server usage charge besides instance hours?
2. The exact definition of an active/billable hour: running uptime, query execution time, or another meter; rounding/minimums, restart treatment, and whether idle but unpaused time is billed. Can you provide 30-day billable hours and Database server credits per project for one identical UTC interval?
3. Does ordinary daily use keep a Tiny backend billable continuously? Please confirm that the ~7-day inactivity pause is distinct from short-term compute-idle behavior, and specify what jobs/background traffic reset inactivity. We will not pause production or change scheduled jobs for this investigation.
4. Our screenshots show Run 37.3 and Database server 34.2 over 30 days, 153 active hours and ~16.1k requests over 7 days, Tiny estimated monthly backend cost 37.64. Please reconcile these meters without mixing windows, and confirm that 37.64 includes server plus other backend costs rather than a fixed DB-only price.
5. Please confirm that the size-name rename did not change our hourly rate, and share any supported lower-cost option that preserves current URLs, data, sign-in/session behavior, Web Push and 41-group two-way sync without paid add-ons.
6. Which no-additional-fee export/download mechanism can provide a full DB archive plus all private Storage bytes and metadata for an isolated restore test? Please identify consistency/cutoff limitations and included/excluded auth/provider settings. We will not test restore by replacing the live database.

Không gửi tự động, chưa có ticket/phản hồi. Không đính kèm tokens, cookies, PIN, dữ liệu cá nhân hoặc backup.

## Chuẩn bị đánh giá 04/12/2026

Dùng cùng khoảng UTC 03/11/2026 17:00 → 03/12/2026 17:00 (00:00 ngày 04/11 → 00:00 ngày 04/12, Asia/Saigon), hoặc ghi rõ cửa sổ provider thực sự hỗ trợ; chưa có số tương lai. Thu daily/cumulative Run, DB server, active hours, size/rate thay đổi, DB storage, file bytes, network/compute/realtime/AI, request và lỗi theo từng app. Ghi coverage/grant riêng. Không dùng ước tính Tiny thay usage.

Ghi riêng thời điểm phát hành, số thiết bị hoạt động, pending/dead/oldest-age, ACK, retry và trùng giao dịch, độ trễ p95, quyền thu hồi, Push thật và đủ 41 TDP. So baseline cùng lưu lượng/kỳ; phần chưa triển khai không gọi là savings. Có ít nhất 7 ngày đo sau mỗi thay đổi và một ngày làm việc quan sát từng lượt; chưa đủ cửa sổ thì ghi chưa kết luận. Đánh giá ngày 04/12 là mốc báo cáo, không ép phát hành để kịp ngày.
