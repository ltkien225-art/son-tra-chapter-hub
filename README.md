# Son Tra Chapter Hub

Chuyển và TIẾP TỤC dự án hiện có: Bộ công cụ Văn phòng Hội LHPN phường Sơn Trà &42Sổ Chi hội. Chủ dự án yêu cầu BỎ CLOUDFLARE, dùng Lovable Cloud riêng. Đọc toàn bộ ZIP đính kèm, nhất là WORK-HANDOFF.md và LOVABLE-MIGRATION.md; giải nén, giữ nguồn tham chiếu, không xây demo từ đầu. Source commit2d45022fd6c3905f61356b4ba76b270c0f6735a0, nhánhfeature/hoi-phu-nu-son-tra-starter của ltkien225-art/so-tay-mat-tran-so-son-tra. Dùng chế độ thường, tiết kiệm credit, khôngMax và không tự mua thêm. Đây là cùng workspace đã nạp300credit dùng chung, không mặc định có thêm300credit riêng cho Hội.

Tạo backend/database/storage và đăng nhập OTP email riêng trên Lovable, không cần tài khoản Cloudflare. Không tạo D1/Worker, không đòi user đăng nhậpCloudflare. Admin ứng dụng ubmttqvnphuongsontra@gmail.com; chủ Lovableltkien225@gmail.com là vai trò khác. Văn phòng tự duyệt email, gắn Chi hội, cấp/thu hồi ngay trên UI; mỗi yêu cầu đọc/ghi kiểm tra quyền hiện hành, kể cả khi JWT còn hạn. Chưa cấp email Chi hội thật, không tự mở quyền sau đăng nhập. Không hỏi tiếp tục hay không sau từng phần đã được yêu cầu.

Giữ đúng42Chi hội trong chapters.json vàseed, tổng20943hộ; Công An sốhộNULL; tuyệt đối không đồng nhất sốhộ với hội viên. Thiết kế tím sen/hồng phấn theo prototype hiện có, nút lớn, điện thoại tốt. Hoàn thiện Văn phòng và42Sổ Chi hội: văn bản đến/đi/phát hành/thu hồi; nhiệm vụ phân công/tiến độ/hạn/quá hạn/lưu trữ; Chi hội gửi, xem lịch sử, thu hồi báo cáo của mình; người nhận không đọc nội dung đã thu hồi; hội viên theo kỳ, hoạt động/tình hình/phản ánh, tổng hợp đầy đủ phân trang, nhật ký, PDF/ảnh/minh chứng riêng tư vàviewer kiểmtra quyền. Hồ sơ nhạy cảm phụ nữ/trẻ em chỉ người có quyền đặc biệt mới thấy, khôngPIItronglog/public/bảnxuất thường. Không dùng dữ liệu giả làm sốliệu thật. Hướng dẫn, sao lưu/khôi phục có kiểmtra antoàn.

Mã nguồn đã sửa CSRF/giới hạnbody/nguyên tửaudit/ẩnbodythu hồi,5tests cục bộ vàActions40136932923đạt. Chuyển các invariant sang kiểmthửbackendmới, không coi testcũ là nghiệmthu. Kiểmtra JWT/auth thật, outsider, chéoChi hội, giảchapterid/role, thu hồi email, quyền xem/tảifile, gửi/thu hồi báo cáo, rollback, CRUDvăn bản/nhiệm vụ/archive/restore/thống kê. Phân biệt kiểmthửmôphỏng/thiếtbịthật, desktop/iPhone/Android. Không đòi credentials qua chat, chỉ secureform. Không xóa dữ liệu thật hoặc dữ liệu[TEST]chưa duyệt. Chưa xác nhận có dữ liệu vận hành Cloudflare, không tự tuyên bố đã chuyển database thật.

TUYỆT ĐỐI không canthiệp Mặt trận87408efa-533b-46d9-944b-9a8a9ee5ff51 hoặc Đoàn66c8c0fb-3033-4baa-b7fe-b8485274c3cb, DB/secret/tài nguyên hai hệthống đó; repođồngbộ nếu cần dùngriêng. Hoànthiện và thửnghiệm trên dựán này. Trước côngbốchínhthức, báoURLpreview,commit,tệpđổi,testsđạt/chưađạt,vướngmắc,creditđãdùng. Không publishtrangtrống hoặc tuyênbốđãnghiệmthu khi chưa kiểmchứng. Tiếp tục các phần antoàn đãủyquyền, chỉ dừng ở xác thực/secureapproval thật sự.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://son-tra-chapter-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bf4fe436-7e4c-4c54-9f0d-23c90f8b694f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
