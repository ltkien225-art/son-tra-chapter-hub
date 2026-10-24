# Bàn giao cho ChatGPT Work — Hội LHPN phường Sơn Trà

Tiếp tục dự án hiện có; KHÔNG tạo lại từ đầu, KHÔNG sửa hệ thống Mặt trận hay Đoàn phường.

## Nguồn
- Repo: `ltkien225-art/so-tay-mat-tran-so-son-tra`
- Branch: `feature/hoi-phu-nu-son-tra-starter`
- Project: `projects/hoi-phu-nu-son-tra`
- Prototype: `prototype/index.html`
- Schema: `office/schema.sql`
- Seed: `office/seed-chapters.sql`
- Danh mục: `office/chapters.json`
- Cấu hình chưa kích hoạt: `office/wrangler.toml`
- Nền tảng tham khảo: `projects/doan-son-tra/office` (CHỈ ĐỌC và tái sử dụng có kiểm soát)

## Đích
Worker `hoi-phu-nu-son-tra-office`, D1 riêng cùng tên, R2 `hoi-phu-nu-son-tra-attachments`; quản trị `ubmttqvnphuongsontra@gmail.com`. Chỉ tạo Cloudflare resources khi được phép và có công cụ hỗ trợ; không giả mạo trạng thái đã tạo.

## Công việc
1. Hoàn thiện mã Worker, giao diện Văn phòng Hội và Sổ Chi hội trên thư mục dự án độc lập. Thiết kế tím sen/hồng phấn; hỗ trợ điện thoại.
2. Tích hợp Cloudflare Access xác thực email; quản trị viên từ email đã chỉ định; kiểm tra phân quyền từng Chi hội tại API, không chỉ ẩn nút trên giao diện.
3. 42 Chi hội đã có tên và số hộ. Không đồng nhất số hộ với hội viên; Chi hội Công An để số hộ NULL. Kiểm tra tổng số hộ 20.943.
4. Quản lý văn bản, nhiệm vụ, hạn, thu hồi, lưu trữ; báo cáo, minh chứng, số liệu hội viên theo kỳ; nhật ký thay đổi.
5. Hồ sơ nhạy cảm phụ nữ/trẻ em chỉ được xem bởi người được phân quyền đặc biệt; không đưa PII vào dữ liệu public hoặc log.
6. Viết kiểm thử tự động cho xác thực, cách ly Chi hội, truy cập trái phép, CRUD, và trạng thái thu hồi; chạy CI trước deploy.
7. Tạo Cloudflare D1/R2 mới, chạy schema và seed; cấu hình Wrangler với ID D1 MỚI, không sử dụng ID của Đoàn phường.
8. Triển khai có xác nhận mục tiêu, thử nghiệm bằng tài khoản thực; báo cáo link chính thức và vấn đề còn lại.

## Lưu ý an toàn
- Chưa có Cloudflare Worker/D1/R2 chính thức cho Hội Phụ nữ được xác nhận tạo thành công.
- Không lưu token, secret, danh sách số điện thoại cá nhân trong GitHub public.
- Không công bố website là hoạt động nếu chưa deploy và xác minh.
- Trước thao tác không thể đảo ngược hoặc thay đổi bảo mật, dừng và yêu cầu người dùng xác nhận.

## Cập nhật triển khai 25/10/2026
- Đã có giao diện thực tế: `office/public/index.html`, `office/public/app.js`.
- Đã có API: `office/src/worker.js` (xác thực JWT Access, danh sách Chi hội, báo cáo/thu hồi, số liệu hội viên).
- Đã có `office/package.json`, `office/tests/smoke.test.mjs`, CI `.github/workflows/hoi-phu-nu-son-tra-check.yml`.
- Ưu tiên trước tiên: chạy kiểm thử thực tế, sửa lỗi nếu có, tạo D1 mới, seed, cấu hình Access One-time PIN cho đúng email, cấu hình vars Worker, deploy và kiểm thử đăng nhập.
- Chưa có chứng cứ CI xanh, chưa có D1 ID mới và chưa có URL triển khai chính thức. Không tự tuyên bố hoàn thành.
- Lovable hiện có hai dự án Mặt trận và Đoàn, chưa có dự án Hội Phụ nữ. Không thay đổi hai dự án này; không tạo bản Lovable Hội Phụ nữ trùng lặp nếu chưa có nhu cầu kỹ thuật cụ thể.
- Người dùng muốn tự động thực hiện tối đa; chỉ xin hỗ trợ khi xác thực Cloudflare, phê duyệt bảo mật hoặc việc không thể tự động hóa.

