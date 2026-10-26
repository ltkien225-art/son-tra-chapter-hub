# Cấp link Văn phòng Hội LHPN Sơn Trà

Trang chính thức: https://son-tra-chapter-hub.lovable.app/cap-link-van-phong

## Quy trình
1. Chủ sở hữu bấm **Xác minh để cấp link**, mở liên kết trong email chính thức. Không cần mật khẩu; không gửi email tự động, không đăng ký tài khoản mới.
2. Sau xác minh, bấm **Cấp một link dùng chung**, rồi **Sao chép link gửi Zalo**. Link đầy đủ chỉ hiện trong lần cấp, không lưu vào tài liệu này.
3. Người nhận mở link để vào Văn phòng, không nhập email/PIN. Link không tự hết hạn; chủ sở hữu có thể thu hồi tại trang cấp link. Đăng xuất riêng máy không chủ động đăng xuất máy khác.

## Kiểm chứng ngày 26/10/2026
- 25 kiểm thử đơn vị đạt.
- 145 kiểm thử nghiệp vụ/quyền/tệp hiện có đạt. Sửa phạm vi test thông báo: chỉ xét các tài khoản do chính lần test tạo; không xóa hoặc đổi người nhận thật.
- 7 kiểm thử quyền thật mới đạt: anonymous/outsider/admin không phải owner không cấp được; admin không phải owner không thu hồi/list; endpoint lookup service không cho authenticated gọi; cột hash không được authenticated chọn.
- Playwright Chromium thật khổ 1280×1800 và 390×844: trang cấp link có nút xác minh, không ô mật khẩu, không tự gọi gửi email; link giả bị từ chối, fragment được xóa, raw capability không lưu localStorage.
- Build tự động OK; basic security scan không có lỗi, không thay thế kiểm toán sâu.
- Return URL production đã được xác nhận nằm trong allowlist chính thức.

## Chưa kiểm chứng
Không có phiên owner được duyệt. Lệnh chính thức `lovable auth-session --json --user 5d872c56-7dae-4915-88b8-54310cfb8996` báo: “Minting a session as a specific auth user requires user approval, which is unavailable in this context.” Không có thẻ approval để duyệt trong môi trường này. Không tự mint owner hoặc giả claims.

Do đó chưa xác nhận email thực sự đến hộp thư, owner cấp/copy link, 3 phiên trình duyệt độc lập, mở lại trình duyệt, local logout và thu hồi parent xuyên cả 3 phiên. Không báo E2E hoàn tất. Không tạo link thật, không mở/claim handover thật, không đổi dữ liệu/link/phiên thật. Không thử điện thoại vật lý.

## Tệp chính
- `src/routes/cap-link-van-phong.tsx`, `src/routes/van-phong.tsx`, `src/routes/app.tsx`
- `src/lib/office-link.ts`, `src/lib/links.functions.ts`, `src/lib/units.ts`
- migrations `0016_owner_self_service_office_links.sql`, `0017_office_link_private_columns.sql` (áp dụng tiếp phần 0015 có sẵn)
- `src/test/office-link.test.ts`, `tests/backend/office-links.live.test.ts`, điều chỉnh `tests/backend/rls.live.test.ts`
- `AGENTS.md`, `roadmap.md`, tệp này; kiểu dữ liệu do công cụ tự cập nhật.