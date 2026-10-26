# Liên kết Sổ Chi hội — 26/10/2026

## Thay đổi
- Phân quyền → Quản lý liên kết Sổ 42 Chi hội: cấp, sao chép gửi Zalo, đổi và thu hồi có xác nhận.
- `/so/ch01`–`/so/ch42` nhận capability trong fragment `#k=…`; link thiếu/sai không cấp quyền. Không nhập PIN/email/password/OTP trong luồng Sổ mới.
- Link tái sử dụng đa máy, không tự hết hạn. Sao chép và cấp lại khi đã có link không đổi link. Token được mã hóa AES-GCM để quản trị có thể sao chép lại, chỉ hàm xác thực quản trị hiện hành được khôi phục.
- Phiên mỗi máy độc lập; đăng xuất local. Thu hồi/đổi kiểm ở nguồn quyền hiện hành, cả JWT cũ, file gateway và người nhận thông báo. Không đụng link/phiên Văn phòng hoặc dữ liệu vận hành.
- Giữ bản ghi PIN cũ và phiên cũ để chuyển đổi bổ sung an toàn; giao diện mới không cấp/nhập PIN. Không phát hành link thật tự động.

## Kiểm thử
- 30 kiểm thử nhỏ đạt; toàn bộ backend hiện có 145/145 đạt.
- TEST admin riêng, không giả danh owner: cấp idempotent, hai phiên, cách ly ch01/ch02, không đọc token/mã hóa, không gọi lookup đặc quyền, link sai bị từ chối.
- Chromium local desktop 1280×1800 và khổ iPhone 390×844: Văn phòng sao chép cùng link, hai máy mở link → tải lại → form báo cáo; PDF/PNG gửi lên, tải lại, xem/tải qua gateway; Văn phòng nhận và xem tệp; Chi hội khác không thấy báo cáo.
- Thu hồi bằng nút Văn phòng: cả hai phiên cũ bị chặn sau tải lại; link cũ không mở lại. Test riêng chặn đọc/tải file và gửi sau thu hồi, kể cả bật lại active của danh tính TEST.
- Quét bảo mật cơ bản không phát hiện lỗi; không bao gồm phân tích mã chuyên sâu.
- 23 kiểm tra link/tệp thật đạt (12 cấp/cách ly, 7 thu hồi/tệp, 4 đổi link).
- Đã xuất bản và chạy lại trên **https://son-tra-chapter-hub.lovable.app**: hai browser context trắng desktop/khổ iPhone mở đúng Sổ, tải lại giữ phiên, gửi PDF/PNG; Văn phòng nhận và mở tệp; Chi hội khác không thấy báo cáo; link sai bị từ chối; thu hồi qua UI Văn phòng chặn cả hai phiên và mở lại link. Gateway production chặn cả hai tệp sau thu hồi.
- Bản mã đã kiểm chứng production: `d52f66c4a696672c988328ea8c48961c03234101`. Dữ liệu TEST đã dọn; không cấp/đổi/thu hồi link thật.

## Giới hạn
- Chưa thử Safari/iPhone/Android/Zalo trên thiết bị thật; kiểm khổ iPhone là Chromium mô phỏng kích thước.
- Không mở link thật của người nhận, không gửi email thật hoặc giả phiên owner. Quyền quản trị thật cần phiên hợp lệ; connector hiện không hỗ trợ approval mint owner.
- Chỉ dữ liệu TEST của lượt này được dọn, giữ nhật ký kiểm thử.

## Tệp
`drizzle/migrations/0018_chapter_reusable_private_links.sql` (và metadata/types tự sinh), `src/lib/chapter-link.ts`, `src/lib/chapter-links.functions.ts`, `src/components/hoi/UnitCodes.tsx`, `src/lib/units.ts`, `src/lib/push.server.ts`, `src/routes/so.$unit.tsx`, `src/routes/index.tsx`, `src/routes/app.tsx`, `src/components/hoi/{Guide,Documents,Tasks,Submissions}.tsx`, `src/test/chapter-link.test.ts`, `tests/backend/chapter-links.live.test.ts`, `AGENTS.md`, `roadmap.md`.