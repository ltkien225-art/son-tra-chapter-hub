# Roadmap — Hội LHPN Sơn Trà (Lovable Cloud)

- [x] Legal research implementation: removed approved-FAQ dependency, actual government search form + official PDF extraction, server privacy/current access/quota, fetched URLs/verbatim evidence/time, optional FAQ and updated guide; no paid grounding or billing enabled.
- [ ] Legal research acceptance/publish: continue with bounded public-source caching, smaller evidence budgets and minimal Google recovery probes without resetting quota or weakening the independent semantic gate. Official create-test-user currently unavailable; require official TEST sign-in for preview/production E2E/quota/revocation, then publish only after acceptance. No owner/real-link substitution.

- [x] Replace chapter PIN workflow with reusable private links: additive schema, current parent permissions, issue/copy/change/revoke, entry and guides; operational data and office access untouched.
- [x] Local authorized TEST acceptance: two independent desktop/iPhone-width sessions, PDF/image upload/reload/view/download, Office reception, isolation, invalid/revoked links, rotation and parent revocation; 30 unit + 145 regression + 23 link/file live assertions passed; basic security scan no findings (not deep analysis).
- [x] Published chapter link workflow; production browser acceptance passed with two isolated TEST contexts, report/attachments received by Office, cross-chapter rejection and both sessions rejected after revoke. Production gateway rejects revoked file reads. Removed only this run's TEST data, retaining audit evidence. Physical Safari/Android/Zalo remains unverified.

- [x] Owner self-service /cap-link-van-phong implemented: explicit magic email/signup=false, owner-only issue/revoke, reusable office capability and local logout; 25 unit + 145 backend + 7 negative live authorization tests passed; basic security checks clean.
- [ ] Positive owner issuance/copy, three-device sessions and parent revoke E2E — blocked: owner session approval unavailable in this context; no impersonation or real link issued. Physical-device tests and actual email delivery remain unverified.

- [x] Approved artwork applied to shared headers and versioned opaque icons; production PNGs byte-match exports (180/192/512/maskable/64), manifest/head updated; desktop + iPhone-width public entry screens verified. Authenticated workspace UI and physical phone installation not tested in this identity-only change.

- [x] Backend: schema, 42 Chi hội seed, quyền theo Chi hội, thu hồi tức thì, nhật ký, kho tệp riêng tư
- [x] Kiểm thử backend thật (tests/backend/rls.live.test.ts) — 90/90 đạt
- [x] Giao diện Văn phòng + Sổ Chi hội, đăng nhập mã email, yêu cầu cấp quyền
- [x] Truy cập kiểu Bộ Đoàn: /van-phong bằng mã bảo vệ tự đặt (không email), /tiep-nhan liên kết một lần cho người tiếp nhận quản trị, quản trị cấp/đổi/thu hồi; kiểm thử trình duyệt toàn luồng đạt (iPhone + desktop)
- [x] Đồng bộ: tự làm mới mỗi phút / khi quay lại / có mạng lại; chống bấm gửi trùng
- [x] Web Push: đăng ký nhiều thiết bị, outbox chống trùng, kiểm quyền lúc gửi, retry, nhắc hạn hằng ngày, không PII (mô phỏng 84 thiết bị đạt)
- [x] Đồng bộ 2 chiều: thanh trạng thái đồng bộ/mất mạng/lỗi + nút Làm mới
- [x] Push Chi hội→Văn phòng: cập nhật tiến độ, hoàn thành, thu hồi báo cáo; bấm thông báo mở đúng mục
- [ ] Push trên iPhone/Android/máy tính THẬT — chờ: cán bộ bật thông báo trên thiết bị và bấm Gửi thử (bắt buộc để nghiệm thu)
- [x] Văn phòng phản hồi báo cáo → thông báo đúng Chi hội
- [x] Dọn dữ liệu [TEST] của kiểm thử; báo cáo BAO-CAO-NGHIEM-THU.md
- [x] Manifest + biểu tượng + hướng dẫn iPhone/Android
- [ ] Đối chiếu HUONG-DAN-SU-DUNG.md (commit f4734f8) — chờ: kho GitHub riêng tư, cần người dùng tải tệp lên
- [ ] Kiểm thử giao diện khi đã đăng nhập + Push trên máy thật — chờ: tài khoản quản trị đăng nhập lần đầu trên preview/điện thoại
- [ ] Đẩy mã nguồn sang Git riêng — chờ: người dùng kết nối GitHub cho dự án
- [ ] Xuất bản chính thức — sau khi 2 mục kiểm thử trên đạt
- [ ] Giao diện theo ảnh mẫu (xanh dương/hồng) — chờ: chủ dự án tải 2 ảnh mẫu
- [x] Hỏi đáp pháp luật mức 1: thư viện có nguồn + duyệt, tìm kiếm, chặn dữ liệu cá nhân, giới hạn lượt, câu hỏi riêng cho cán bộ
- [x] Prior FAQ-only Gemini flow activated and tested on production before the new research requirement; that result does NOT certify the new retrieval flow. Three sample FAQs remain pending, none autoapproved.
