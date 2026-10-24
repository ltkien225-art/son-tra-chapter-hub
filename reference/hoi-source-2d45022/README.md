# Bộ công cụ số Hội LHPN phường Sơn Trà

## Trạng thái
Khởi tạo dự án độc lập, **chưa triển khai lên Cloudflare**. Không chỉnh sửa Worker, D1, R2 hay dữ liệu của Mặt trận và Đoàn phường.

- Worker dự kiến: `hoi-phu-nu-son-tra-office`
- D1 dự kiến: `hoi-phu-nu-son-tra-office`
- R2 dự kiến: `hoi-phu-nu-son-tra-attachments`
- Email quản trị: `ubmttqvnphuongsontra@gmail.com`
- Danh mục: 42 Chi hội theo danh sách tháng 8/2026.

## Phân hệ
Văn phòng: tổng quan; văn bản đến/đi; giao nhiệm vụ; hồ sơ Chi hội; quản lý hội viên; phong trào/cuộc vận động; hỗ trợ phụ nữ; giám sát, phản biện; hộp thư; báo cáo; cẩm nang; phân quyền.

Sổ Chi hội: văn bản nhận; nhiệm vụ; báo cáo/đính kèm; cập nhật hội viên và biến động; hoạt động, mô hình; phản ánh tình hình; lịch sử gửi; hướng dẫn sử dụng.

## Nguyên tắc
Mỗi Chi hội chỉ truy cập dữ liệu được cấp quyền. Hồ sơ nhạy cảm liên quan đến phụ nữ, trẻ em và vụ việc hỗ trợ có phân quyền riêng, không mặc định hiển thị cho mọi Chi hội. Dữ liệu thử nghiệm phải phân biệt dữ liệu thật. Không sao chép bí mật, token hay dữ liệu từ các ứng dụng khác.

## Bước tiếp theo
Tách mã nguồn đã kiểm chứng sang thư mục riêng, cấu hình Worker/D1/R2 mới, nhập danh mục 42 Chi hội, kiểm thử phân quyền và nghiệm thu trước khi xuất bản.

