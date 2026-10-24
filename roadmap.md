# Roadmap — Hội LHPN Sơn Trà (Lovable Cloud)

- [x] Backend: schema, 42 Chi hội seed, quyền theo Chi hội, thu hồi tức thì, nhật ký, kho tệp riêng tư
- [x] Kiểm thử backend thật (tests/backend/rls.live.test.ts) — 81/81 đạt
- [x] Giao diện Văn phòng + Sổ Chi hội, đăng nhập mã email, yêu cầu cấp quyền
- [x] Đồng bộ: tự làm mới mỗi phút / khi quay lại / có mạng lại; chống bấm gửi trùng
- [x] Web Push: đăng ký nhiều thiết bị, outbox chống trùng, kiểm quyền lúc gửi, retry, nhắc hạn hằng ngày, không PII (mô phỏng 84 thiết bị đạt)
- [x] Manifest + biểu tượng + hướng dẫn iPhone/Android
- [ ] Đối chiếu HUONG-DAN-SU-DUNG.md (commit f4734f8) — chờ: kho GitHub riêng tư, cần người dùng tải tệp lên
- [ ] Kiểm thử giao diện khi đã đăng nhập + Push trên máy thật — chờ: tài khoản quản trị đăng nhập lần đầu trên preview/điện thoại
- [ ] Đẩy mã nguồn sang Git riêng — chờ: người dùng kết nối GitHub cho dự án
- [ ] Xuất bản chính thức — sau khi 2 mục kiểm thử trên đạt
