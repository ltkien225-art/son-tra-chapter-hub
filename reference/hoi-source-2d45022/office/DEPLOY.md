# Quy trình triển khai Hội LHPN Sơn Trà (độc lập)

## Trạng thái
Mã nguồn đã có, CHƯA có D1 ID, CHƯA có Cloudflare Access application và CHƯA triển khai Worker. Không đưa đường dẫn thử nghiệm cho Chi hội trước khi hoàn tất xác thực.

## Chuẩn bị tài nguyên Cloudflare
1. Tạo D1 mới: `hoi-phu-nu-son-tra-office`. Tuyệt đối không dùng D1 của Đoàn hoặc Mặt trận.
2. Ghi ID mới vào mục `[[d1_databases]]` trong `office/wrangler.toml`, binding `DB`.
3. Chạy trong thư mục `projects/hoi-phu-nu-son-tra/office`:
   - `npm install`
   - `npx wrangler d1 execute hoi-phu-nu-son-tra-office --remote --file=./schema.sql`
   - `npx wrangler d1 execute hoi-phu-nu-son-tra-office --remote --file=./seed-chapters.sql`
4. Kiểm tra 42 dòng chapters trước khi cấp quyền người dùng. Không đưa danh sách số điện thoại cá nhân lên public assets.
5. Thiết lập Cloudflare Access application bảo vệ riêng Worker `hoi-phu-nu-son-tra-office`; dùng email One-time PIN và chính sách Allow theo danh sách email đã được phê duyệt. Không dùng phương thức Cloudflare-account-only như lỗi Đoàn đang gặp. Không mở công khai.
6. Đặt secrets/vars `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` (audience 64 ký tự hex) và `ADMIN_EMAIL=ubmttqvnphuongsontra@gmail.com` cho Worker. Không commit token hoặc secret lên GitHub.
7. Thêm quyền cho email Chi hội đã xác nhận vào bảng `chapter_access` theo chapter_id; không cấp quyền hàng loạt bằng email chưa xác minh.
8. Chạy `npm run check` và `npm run deploy` sau khi Access và D1 sẵn sàng. R2 attachments chưa được triển khai; không quảng cáo chức năng đính kèm.
9. Kiểm thử tài khoản quản trị và ít nhất hai Chi hội: không đọc/ghi chéo, gửi báo cáo, thu hồi báo cáo của chính mình, thống kê hội viên; thử trên Safari iPhone và Android.

## Ranh giới an toàn
Chỉ thay đổi nhánh `feature/hoi-phu-nu-son-tra-starter`, thư mục `projects/hoi-phu-nu-son-tra`, Worker/D1 Hội Phụ nữ. Không thay đổi Mặt trận, Đoàn hoặc tài nguyên Cloudflare dùng chung.

