# Tìm Google ngay trong Bộ Phụ nữ — bản thử

Trang: `/xem-thu-google`. Đây là tích hợp Google Search Element thật, không có kết quả mô phỏng.

## Trạng thái
- Trang thử độc lập với Văn phòng và Sổ Chi hội. Không đổi luồng Hỏi đáp đang dùng trước khi chủ dự án duyệt.
- Chưa có mã công cụ tìm kiếm (`cx`); Google yêu cầu chủ tài khoản hoàn tất bước CAPTCHA và chấp nhận điều khoản khi tạo công cụ.
- Chưa nghiệm thu kết quả Google thật, hoặc điện thoại thật. Không nhận đã có câu trả lời AI.

## Kết nối
1. Tạo công cụ Google với nguồn `*.chinhphu.vn`, `*.moj.gov.vn`, `vbpl.vn`, `dichvucong.gov.vn`.
2. Sao chép “Mã công cụ tìm kiếm” (cx công khai, không phải khóa Gemini).
3. Mở `/xem-thu-google`, dán mã rồi bấm “Kết nối để xem thử”. Có thể gửi lại URL chứa cx; câu hỏi không được lưu vào URL.
4. Nhập câu hỏi chung rồi bấm “Tìm với Google”; kết quả và đoạn trích được Google hiển thị trong trang. Bấm vào văn bản gốc mới mở trang nguồn ở thẻ riêng.

Google Search Element cung cấp kết quả tìm kiếm, không cam kết có phần trả lời AI của Google Search. Không có máy chủ Python/proxy, gọi Gemini, khóa API, billing hoặc phụ thuộc mới.

## Kiểm tra đã chạy
- 8 kiểm thử đạt: không tải/gửi tự động; chặn câu hỏi có dấu hiệu dữ liệu cá nhân; gửi tới vùng kết quả trong trang; không popup/chuyển URL; xóa kết quả; lỗi mạng; không thực hiện sau khi rời trang; nạp script có thời hạn và đúng miền.
- Bản dựng cả trình duyệt và máy chủ đạt.
- TypeScript không có lỗi mới trong các tệp thêm. Toàn dự án còn hai lỗi đã có ở `legal-html-sources.server.ts` và `legal-patch-regression.test.ts`; không sửa trong phạm vi này.

Sau khi có cx, phải thử kết quả thật từ Google trên bản xem trước trước khi thay `GoogleSearch` trong `src/components/hoi/Legal.tsx` bằng `GoogleLegalSearch` và xuất bản.

Tài liệu: https://developers.google.com/custom-search/docs/element
