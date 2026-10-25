# Đánh giá: giao diện Hội LHPN Sơn Trà theo ảnh mẫu 2 màn hình (chưa sửa code)

## 1. Có làm giống được không?
Có. Bố cục, màu và kiểu biểu tượng của hai màn hình làm lại được ở mức gần giống, chạy được trên iPhone và máy tính. Không thể giống từng điểm ảnh, vì ảnh mẫu do máy tạo ra, không phải bản thiết kế có số đo.

## 2. Phần nào giống được, phần nào cần thêm
Giống được:
- Màu xanh dương và hồng pastel cho toàn ứng dụng; đầu trang "Hội LHPN phường Sơn Trà".
- Văn phòng: 4 thẻ số liệu, lưới 3 cột ô chức năng lớn có biểu tượng.
- Sổ Chi hội: lưới 2 cột nút lớn, mục "Hoạt động gần đây", thanh điều hướng ở đáy màn hình trên điện thoại.
- Biểu tượng cùng phong cách (nét đơn, bo tròn), lấy từ bộ biểu tượng đang dùng.

Cần thêm hoặc khác ảnh mẫu:
- Ảnh Sơn Trà ven biển: cần ảnh gốc có quyền sử dụng. Nếu không có, có thể tạo một ảnh minh họa phong cảnh (không phải ảnh thật của địa phương).
- Logo Hội LHPN: cần file logo chính thức. Mình không tự vẽ lại logo của tổ chức.
- Chữ và nút nhỏ trong ảnh mẫu sẽ được làm to hơn để người lớn tuổi dễ bấm.
- Nút trong ảnh mà ứng dụng chưa có chức năng sẽ không được thêm vào, để tránh nút trống.
- Để đối chiếu chính xác cần chính file ảnh mẫu. Hiện chưa nhận được ảnh; hãy tải 2 ảnh vào khung chat trước khi triển khai.

## 3. Chức năng, dữ liệu và quyền có giữ nguyên không?
Có. Chỉ thay phần trình bày. Giữ nguyên:
- đăng nhập bằng mã email và phân quyền;
- 42 Chi hội và số hộ;
- văn bản, nhiệm vụ, báo cáo, thu hồi, tệp đính kèm, hồ sơ nhạy cảm, thông báo đẩy, đồng bộ, hướng dẫn.

Không thay đổi cơ sở dữ liệu, không xóa dữ liệu.

## 4. Khối lượng, rủi ro, cách kiểm tra
- Khối lượng: vừa phải, khoảng 1–2 lượt làm việc ở chế độ thường. Gồm bộ màu, đầu trang, trang tổng quan Văn phòng, trang đầu Sổ Chi hội và thanh điều hướng đáy.
- Rủi ro thấp. Có thể gặp chữ bị chật trên màn hình hẹp, hoặc thanh đáy che nút; sẽ kiểm tra để tránh.
- Kiểm tra:
  - chụp màn hình khổ iPhone (390×844) và máy tính (1280) cho cả Văn phòng và Sổ Chi hội, đặt cạnh ảnh mẫu để so;
  - chạy lại các bài kiểm thử quyền, tệp và thông báo hiện có;
  - chỉ xuất bản khi các bài kiểm thử đạt.
  
  Đây là kiểm tra trên trình duyệt giả lập, không phải iPhone thật. Thử trên máy thật vẫn cần cán bộ thực hiện.

## 5. Số liệu minh họa
Các số 6.328 hội viên, 18 nhiệm vụ, 12 báo cáo và các hoạt động trong ảnh sẽ không được đưa vào hệ thống.
- Chỉ "42 Chi hội" là số cố định.
- Các thẻ khác lấy số thật đang có; chưa có số thì hiện "Chưa có số liệu".
- "Hoạt động gần đây" lấy từ nhật ký thật và có thể trống.

## Chi tiết kỹ thuật (khi được duyệt triển khai)
- Đổi bộ màu trong `src/styles.css` sang xanh dương/hồng pastel. Cập nhật màu chủ đạo trong bộ nhớ dự án, thay cho tím sen.
- `src/routes/app.tsx`: thêm đầu trang có ảnh nền (tùy chọn); 4 thẻ thống kê lấy từ hàm tổng hợp đang có; lưới ô chức năng 3 cột (2 cột trên điện thoại) để mở các mục hiện có.
- Sổ Chi hội: trang đầu dạng lưới 2 cột, danh sách hoạt động gần đây lấy từ dữ liệu được phép xem, thanh điều hướng đáy chỉ hiện trên điện thoại.
- Không có migration, không đổi quyền.
