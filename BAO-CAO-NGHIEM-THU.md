# Báo cáo kiểm thử — Hội LHPN phường Sơn Trà (Lovable Cloud)

Ngày: 24/10/2026. Bản chạy trên Lovable Cloud riêng của dự án (không Cloudflare).
URL dùng chung cho Văn phòng và 42 Sổ Chi hội: https://son-tra-chapter-hub.lovable.app (đăng nhập mã OTP email; ứng dụng tự mở phần Văn phòng hoặc Sổ Chi hội theo quyền được cấp).

## Đã kiểm thử
| Hạng mục | Cách kiểm | Kết quả |
|---|---|---|
| Quyền, thu hồi, chéo Chi hội, outsider, giả chapter/role, văn bản, nhiệm vụ, báo cáo/thu hồi, tệp, thống kê, sao lưu/khôi phục, rollback | `bun tests/backend/rls.live.test.ts` — tài khoản đăng nhập thật trên backend thật | 90/90 đạt |
| Đồng bộ hai chiều + thông báo: Chi hội cập nhật tiến độ → Văn phòng; báo cáo mới → Văn phòng; Văn phòng phản hồi → đúng Chi hội; nội dung chung, link mở đúng mục | trong bộ test trên (T5p, T6p, T6f) | đạt (kiểm tại hàng chờ gửi) |
| Xử lý gửi Push: chọn người nhận, 42×2 = 84 thiết bị, chia lô, retry, chống trùng, loại máy hỏng, thu hồi quyền ngừng gửi | `bunx vitest run` | 7/7 đạt — **MÔ PHỎNG** |
| Giao diện Văn phòng sau đăng nhập (tạo/phát hành văn bản, giao nhiệm vụ, mở mọi mục) | Playwright, desktop 1280px + khổ iPhone 390px | đạt, không lỗi trang |

## Chưa kiểm chứng (chưa nghiệm thu)
- Nhận Push trên iPhone/Android/máy tính THẬT: chưa có thiết bị thật đăng ký. Cần cán bộ đăng nhập trên máy thật → Thông báo → Bật → Gửi thử, và thử một văn bản/nhiệm vụ thật.
- Giao diện Sổ Chi hội sau đăng nhập chỉ kiểm qua backend, chưa chạy bằng trình duyệt.
- Lịch nhắc hạn tự động trên bản xuất bản chưa quan sát một lần chạy thực.
- Sao lưu Git riêng: chưa kết nối GitHub cho dự án (cần chủ dự án kết nối trong Project settings → Git).
- Chưa có dữ liệu vận hành Cloudflare được xác nhận → không có dữ liệu thật nào được chuyển. Chưa cấp email Chi hội thật.

## Dữ liệu thử
Mọi mục [TEST] do kiểm thử tạo đã được xóa; nhật ký thao tác (chỉ mã định danh) được giữ làm bằng chứng. Không có tài khoản, thiết bị Push hay dữ liệu thật nào bị đụng tới.
