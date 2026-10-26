# Hỏi đáp pháp luật tra cứu trực tiếp

- Bỏ điều kiện FAQ đã duyệt; giữ thư viện tùy chọn, không tự duyệt mẫu.
- Tra cứu trực tiếp cổng văn bản Chính phủ, đọc trang và PDF chính thức; chỉ dùng grounding nếu tài liệu và khóa xác nhận có hạn mức miễn phí.
- Gắn từng nhận định với trích dẫn nội dung đã tải, URL và thời điểm; không khẳng định hiện hành khi chưa đối chiếu đủ. Nêu rõ thiếu/xung đột nguồn.
- Giữ quyền hiện hành, chặn dữ liệu cá nhân, 500 ký tự và 10 lượt/ngày; không gửi hồ sơ riêng, không bật billing/Max/dịch vụ trả phí.
- Cập nhật UI/HDSD theo khả năng thực tế; kiểm thử thuần và TEST thật, security, biên dịch tự động; chỉ publish khi đạt.

## Chi tiết kỹ thuật
Tách helper truy xuất HTML/PDF phía máy chủ và kiểm tra trích dẫn thuần; giữ TanStack server function và quota RPC, không thay schema/link/dữ liệu thật.
