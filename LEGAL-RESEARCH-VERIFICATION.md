# Hỏi đáp pháp luật — trạng thái 26-10-2026

## Chưa nghiệm thu hoặc xuất bản luồng mới

Luồng mới đã được triển khai ở mã nguồn, nhưng chưa đạt yêu cầu câu đăng ký kết hôn ổn định và kiểm thử toàn luồng bằng danh tính TEST trên production. Không publish trong lượt này. Production https://son-tra-chapter-hub.lovable.app chưa được xác nhận chạy luồng truy xuất mới.

## Phạm vi thực hiện

- Bỏ yêu cầu có FAQ approved; không đọc FAQ để quyết định gọi Gemini; 3 mục mẫu vẫn pending, 0 approved khi kiểm tra.
- Máy chủ dùng biểu mẫu tìm kiếm công khai của vanban.chinhphu.vn, tải metadata và PDF tại datafiles.chinhphu.vn, giới hạn dung lượng/trang/thời gian và không theo redirect. Không sử dụng dịch vụ tìm kiếm trả phí hay google_search.
- Gemini sinh nhận định/trích dẫn có cấu trúc từ nội dung thực tải. Máy chủ chỉ chấp nhận trích dẫn xuất hiện nguyên văn trong nguồn, điều được nêu phải xuất hiện trong trích dẫn; không sử dụng URL do model tạo. Metadata không được dùng làm căn cứ lời khuyên. Văn bản có hiệu lực trong tương lai không được tải toàn văn để dùng như luật hiện hành.
- Đây là kiểm tra nguồn gốc và sự tồn tại trích dẫn, KHÔNG chứng minh suy luận/paraphrase đúng tuyệt đối hoặc đã đối chiếu mọi văn bản thay thế. Mỗi nhận định vẫn phải được đối chiếu về ý nghĩa. Luồng chưa có bước kiểm chứng ngữ nghĩa độc lập tự động.
- Kiểm quyền hiện hành my_access trước truy xuất, quota RPC 10 lượt/ngày, 500 ký tự; không gửi hồ sơ riêng/FAQ/body riêng tới Gemini. No-store. Không lưu câu hỏi/kết quả vào database, không log khóa hoặc nội dung nguồn/câu hỏi.
- UI hiển thị URL thực tải, trích dẫn từng nhận định, thời điểm và giới hạn; hướng dẫn cho Văn phòng/Chi hội cập nhật, FAQ vẫn tùy chọn.

## Kiểm tra thật đã làm

Chỉ gọi dịch vụ với câu hỏi pháp luật chung và nguồn công khai từ môi trường sandbox; đây KHÔNG phải kiểm thử production hoặc danh tính TEST qua ứng dụng.

- GEMINI_API_KEY hiện diện; giá trị không in/ghi log. Gemini HTTP 200 đã nhận được; cũng có nhiều HTTP 503.
- Kết hôn: tải được metadata luật Hộ tịch 2014, luật mới hiệu lực 01-03-2027 và toàn văn hợp nhất 401/VBHN-BTP ngày 22-01-2026. Một số PDF luật không đọc được (scan hoặc lỗi tải). Câu trả lời chưa được chấp nhận: 503, JSON thiếu/không hợp lệ hoặc trích dẫn không vượt kiểm tra. KHÔNG tuyên bố câu kết hôn hoạt động.
- Bạo lực gia đình: một lần Gemini trả 5 nhận định có trích dẫn thực xuất hiện trong toàn văn Luật 13/2022/QH15; đã đối chiếu trách nhiệm báo tin, địa chỉ tiếp nhận và hình thức báo tin trong nguồn. Lần sau có 503 và kết quả bị validator từ chối. Chưa xác nhận đối chiếu hết sửa đổi hiện hành.
- URL nguồn thực tải: https://datafiles.chinhphu.vn/cpp/files/vbpq/2023/4/luat13.pdf và https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/401-vbhn-btp.pdf . Metadata tương ứng: https://vanban.chinhphu.vn/?pageid=27160&docid=207711 và https://vanban.chinhphu.vn/?pageid=27160&docid=216777 .
- Không tạo/duyệt FAQ, không đổi link/dữ liệu thật; lệnh setup TEST bị chặn trước thực thi. Công cụ tạo danh tính TEST được phép cũng báo không khả dụng cho dự án. Không giả owner để vượt kiểm tra.

## Kiểm thử và bảo mật

43/43 tests cục bộ đã đạt, gồm bảo vệ ngày hiệu lực và tên người tiếng Việt. Quét backend cơ bản không phát hiện vấn đề, không phải phân tích sâu mã. Build tự động báo OK lúc 07:24:30 UTC. Lần gọi thật cuối cả hai câu đều trả no_source sau kiểm tra trích dẫn; không coi lần thành công trước là độ tin cậy ổn định. Không chạy bộ backend có footprint rộng hoặc đọc hồ sơ thật.

Chưa kiểm chứng: server runtime production/giới hạn bộ nhớ khi PDF, câu ngoài nguồn từ UI, PII/quota qua RPC với TEST, quyền thu hồi qua session cũ, màn hình mobile đã đăng nhập, đối chiếu toàn bộ thủ tục dịch vụ công địa phương, nguồn lỗi/cũ toàn luồng.

## Chi phí và model — tài liệu Google đã kiểm tra

- https://ai.google.dev/gemini-api/docs/google-search
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/billing
- https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash

Tài liệu giá tại thời điểm đọc ghi grounding Free Tier cho 2.5 Flash tối đa 500 requests/day, nhưng chính khóa này bị 404/model unavailable to new users. Không coi hạn mức đó dùng được cho khóa. Grounding của 3.8 Flash không có Free Tier theo bảng đã đọc; phần miễn phí hàng tháng nằm trong Paid Tier, không phải quyền bật billing. Model 3.5 Flash được tài liệu ghi deprecated/auto-routed; code giữ endpoint đang có, không tự chuyển dịch vụ/model trả phí.

Không bật billing, Max, tài khoản dịch vụ mới, paid fallback hay tìm kiếm trả phí. Truy xuất trực tiếp không có phí API tìm kiếm nhà cung cấp mới; vẫn có chi phí tài nguyên ứng dụng hiện hữu và hạn mức Gemini theo tài khoản Google. Không đọc được trạng thái billing hoặc số quota Google còn lại từ dashboard; HTTP 200 không chứng minh mức sử dụng miễn phí hay số quota còn lại. Quota ứng dụng 10/ngày không phải quota Google.

## Tệp chính và phiên bản

src/lib/legal.functions.ts; src/lib/legal-research.server.ts; src/lib/legal-evidence.ts; src/lib/legal.ts; src/components/hoi/Legal.tsx; src/components/hoi/Guide.tsx; src/test/legal.test.ts; src/test/legal-evidence.test.ts; package.json/bun.lock; AGENTS.md; roadmap.md.

HEAD quan sát lúc kiểm tra cuối: 5c71d44f3cef7a11d80653ac9b334e65288961b5 (trước cập nhật báo cáo cuối). Không tự commit; chưa có SHA production cho luồng mới, không coi SHA này là bản production.

## Điều kiện tiếp tục

1. Có danh tính TEST được cho phép đăng nhập (không owner/thay link thật).
2. Khắc phục nguồn/đoạn liên quan để câu kết hôn trả lời có bằng chứng hợp lệ, kiểm tra ngữ nghĩa từng nhận định và luật/thủ tục hiện hành.
3. Kiểm thử TEST preview đầy đủ, rồi chỉ xuất bản khi đạt và chạy lại production, gồm quota/PII/nguồn sai/cũ; không suy ra từ helper tests.

Phương án không phát sinh phí tìm kiếm mới đang dùng là truy xuất trực tiếp. Nếu cần Google grounding hoặc API tìm kiếm có phí, phải trình giá/giới hạn cụ thể và chờ chủ dự án cho phép; không tự bật.