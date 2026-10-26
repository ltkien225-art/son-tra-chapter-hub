# Hỏi đáp pháp luật — trạng thái 26-10-2026

## Lượt tiếp tục 08:14–08:20 UTC — giảm tải, Google vẫn 429, chưa xuất bản

### Kết quả thực tế
- Kiểm tra chỉ có/không: GEMINI_API_KEY hiện diện; không in, ghi log hoặc thay giá trị. Thử câu “Khi cần đăng ký kết hôn thì làm gì?” qua helper máy chủ với nguồn công khai thật: 14.808 giây tổng truy xuất + gọi; Google trả **429 ngay bước tạo nhận định**. Dừng ngay sau một request Google, không gọi kiểm nghĩa, không probe model riêng hoặc thử bạo lực thêm. Chưa xác nhận hạn mức đã phục hồi; không có câu trả lời được chấp nhận trong lượt này. Không reset quota ứng dụng, không bật billing/paid grounding/Max hay thay key/model.
- Nguồn kết hôn: bài Chính phủ về NĐ 120/2025, PDF Bà Nà và VBHN 401/2026 thực tải. Bài Chính phủ chuyển thẩm quyền hộ tịch liên quan về cấp xã; 5/10 ngày chỉ là kết hôn có yếu tố nước ngoài. PDF Bà Nà không chứng minh kênh nộp/thời hạn riêng Sơn Trà. Không xác nhận đủ sửa đổi/thay thế hoặc mọi điều kiện kết hôn từ hai nguồn này.
- Không gọi Google thêm khi kiểm nguồn bạo lực gia đình: toàn văn Luật 13/2022 thực tải; đoạn Điều 19 chứa UBND cấp xã nơi xảy ra hành vi, Công an/Đồn Biên phòng gần nơi xảy ra hành vi, cơ sở giáo dục, trưởng thôn/tổ trưởng; đoạn khác chứa gọi điện/nhắn tin/gửi đơn thư/báo trực tiếp và trách nhiệm xử lý. Đã đọc đối chiếu đoạn thực tải, chưa có lời đáp Gemini mới để nghiệm thu ngữ nghĩa. Tìm kiếm còn có luật 2007 (metadata) và NĐ sửa đổi 347/2026; không suy ra văn bản hiện hành toàn bộ từ ngày hiệu lực. Chưa kiểm hết quan hệ thay thế và nghị định chi tiết.
- Câu “Pháp luật Sao Hỏa quy định gì?” truy xuất thật: **0 nguồn, 0 đoạn**; helper không có bằng chứng để gọi model. Đây không phải nghiệm thu UI/RPC.

### Thay đổi tối thiểu
- Nguồn công khai chỉ cache ba khóa chủ đề cố định trong bộ nhớ tối đa **10 phút**, giới hạn số chủ đề, gom các lượt tải đồng thời; giữ nguyên retrievedAt gốc, không cache lỗi/metadata-only, không cache câu hỏi/câu trả lời/phiên/hồ sơ riêng. Cache best-effort theo instance, không đảm bảo mọi instance dùng chung. Quyền/quota vẫn kiểm mỗi yêu cầu, không bị cache bỏ qua.
- Ngân sách bằng chứng giảm từ 30 đoạn × 1400 xuống tối đa **12 đoạn × 1000 ký tự**, tối đa 6 đoạn/nguồn, không chọn cửa sổ chồng nhau. Ưu tiên “báo tin/tố giác/địa chỉ tiếp nhận” khi hỏi bạo lực báo cho ai. Đầu ra generation giảm từ 5000 xuống **1800 tokens**. Vẫn giữ kiểm nguyên văn/điều/URL và **bước Google kiểm nghĩa riêng**; không gộp thành tự xác nhận để giảm call.
- Provider 429 trả ngay, không retry quota. 5xx vẫn giữ một retry giới hạn; nguồn công khai giữ retry cũ. Thời gian giới hạn theo request/PDF như trước, không tuyên bố tổng thời gian production đã đo.
- Cache bạo lực tải lại cùng instance: **0 ms** trong phép đo helper sau lần đầu khoảng 12 giây. Đây không phải đo production hoặc cam kết tốc độ.

### Phiên TEST và bước khả thi không phát sinh phí
- Lệnh chính thức đã chạy đúng: `lovable auth-session --create-test-user --json`. Công cụ trả “Creating a test user is not available for this project”; **không trả approval_required, action/params, thẻ hoặc URL phê duyệt**. Không thể dùng approvals tool để tạo thẻ không tồn tại. Không dùng --self, không tạo magic-link service-role hoặc giả owner thay thế. Không tạo dữ liệu TEST trong lượt này, nên không có gì cần dọn.
- Bước chủ dự án có thể làm: **trong Lovable Preview của dự án Hội, mở trang đầu → đăng nhập bằng một email TEST riêng do chủ dự án kiểm soát → tự nhập mã trong thư ngay tại trang (không gửi mã/mật khẩu/link/khóa vào chat)**. Nếu chưa có quyền, để TEST gửi yêu cầu rồi quản trị duyệt chính email TEST bằng Phân quyền; không đổi quyền người thật/link thật. Sau đó trở lại Preview đăng nhập TEST và gửi “đã đăng nhập TEST”. Phiên có thể được công cụ chính thức cung cấp ở lượt tiếp theo; cần kiểm trạng thái thực tế, không hứa rằng chắc chắn đã có session. Gửi thư và cấu hình xác thực hosted chưa được kiểm bằng tài khoản TEST tại lượt này.
- Phương án Google không có phí tìm kiếm mới: chờ hạn mức phục hồi, giữ truy xuất trực tiếp hiện có và chỉ thử lại một luồng kết hôn sau đó. Không đọc được số quota Google còn lại hoặc thời điểm phục hồi, không hứa thời gian; chủ dự án có thể xem hạn mức trong Google AI Studio của mình, không cần gửi khóa. Hai bước kiểm chứng vẫn phải vượt qua trước nghiệm thu.

### Kiểm thử/bằng chứng/phiên bản
- **37/37 tests liên quan** (5 tệp) đạt: cache 3, fetch/passage 9, research semantic 5, evidence 13, legal privacy/limit 7. Không chạy lại bộ backend rộng. Các negative PII/quota/nguồn giả/cũ/ngữ nghĩa/lỗi mạng ở đây là unit mock; không thay thế kiểm TEST quyền/quota/thu hồi phiên thật.
- Biên dịch tự động **build OK 08:17:33 UTC**. Quét bảo mật mới không thấy lỗi trong **basic checks**, không chạy deep code analysis; kết quả cũ supply-chain stale không được coi là scan mới.
- Chromium mô phỏng 1280×1800 và 390×844 trên trang đầu preview và production đều HTTP 200, không tràn ngang; screenshot đã xem. Đây chỉ là trang công khai không đăng nhập, không phải Safari/Android vật lý hoặc runtime PDF/Hỏi đáp production. Ban đầu navigation cùng page timeout; mở page mới cho từng viewport thì đạt.
- Bằng chứng không chứa secret: `/tmp/browser/legal-recovery/marriage.json`, `violence-public-sources.json`, `outside-public-sources.json`, `browser-results.log`, `screenshots/`. JSON chứa chỉ câu hỏi chung/nguồn công khai và kết quả lỗi. Script probe không lưu khóa.
- Mã quan sát sau thay đổi: **cb93cd7250d8cc6c192a11175e7bcada9cfeabe4** (trước cập nhật báo cáo cuối), **không phải SHA triển khai**. Không yêu cầu publish trong lượt này; production https://son-tra-chapter-hub.lovable.app vẫn giữ bản đã xuất bản trước, chưa xác nhận luồng mới.
- Tệp mới: `src/lib/legal-source-cache.server.ts`, `src/test/legal-source-cache.test.ts`. Tệp sửa: `src/lib/legal-research.server.ts`, `src/lib/legal-passages.ts`, `src/lib/legal-fetch.server.ts`, `src/test/legal-fetch.test.ts`, `src/components/hoi/Guide.tsx`, `AGENTS.md`, `roadmap.md`, báo cáo này. Không đổi schema/quyền/link/phiên/logo hoặc dữ liệu thật.
- Còn chờ: Google phục hồi + TEST chính thức để nghiệm thu preview kết hôn/bạo lực/ngoài nguồn/PII/quota/phân quyền/thu hồi, đối chiếu đủ nguồn hiện hành, runtime production và xuất bản/xác minh production sau khi đạt. Không coi unit/HTTP 200/helper là nghiệm thu.

## Lượt tiếp tục 07:33–07:43 UTC — chưa xuất bản

- Giữ nguyên ứng dụng, khóa/link/logo/quyền. Bổ sung truy xuất trực tiếp bài Chính phủ về Nghị định 120/2025/NĐ-CP và PDF hướng dẫn kết hôn tại cổng xã Bà Nà, Đà Nẵng. Cả hai HTTP 200, nội dung thực tải được. Cổng DVC quốc gia timeout; không dùng snippet thay cho bằng chứng, không kích hoạt OCR/tìm kiếm trả phí.
- Nguồn: https://xaydungchinhsach.chinhphu.vn/nghi-dinh-120-2025-nd-cp-trinh-tu-thu-tuc-dang-ky-ho-tich-tai-ubnd-cap-xa-119250612132316605.htm và https://bana.danang.gov.vn/documents/2131766/4460881/bieu-mau-dang-ky-ket-hon.pdf/00b8c1bb-42b2-c87f-3b9a-cd02737bf9b6 . Nguồn Bà Nà được ghi rõ không xác nhận quy trình địa phương Sơn Trà; mẫu điền sẵn có tên/CCCD bị cắt bỏ trước khi gửi AI.
- Đối chiếu trực tiếp nguồn: mẫu tờ khai trực tiếp/bưu chính; mẫu điện tử khi nộp online; giấy nhân thân còn giá trị; giấy cư trú chỉ khi không khai thác được dữ liệu. Bài Chính phủ xác nhận chuyển nhiệm vụ cấp huyện cho UBND cấp xã theo hai cấp; thời hạn 5/10 ngày được nêu chỉ dành kết hôn có yếu tố nước ngoài, không dùng cho kết hôn trong nước. Chưa đối chiếu được hết sửa đổi/thay thế sau các nguồn này; không khẳng định toàn bộ còn hiệu lực chỉ từ ngày hiệu lực.
- Khắc phục lỗi trích dẫn: máy chủ cấp ID đoạn liên tục đúng nguồn; Gemini chỉ chọn ID, không tự viết lại quote. Validator nguyên văn/điều/URL vẫn giữ, thêm từ chối nguồn chưa có hiệu lực. Có bước Gemini thứ hai kiểm nghĩa/phạm vi/cơ quan và từ chối toàn bộ khi một nhận định không được hỗ trợ. Cùng model kiểm nghĩa không phải bảo đảm pháp lý tuyệt đối hay đánh giá độc lập của con người.
- Giới hạn tài nguyên: PDF tối đa 4 MiB/65 trang, đọc từng PDF tuần tự, tối đa 3 kết quả văn bản + nguồn thủ tục, đoạn nguồn giới hạn 30; PDF scan không đọc được thì giữ metadata/nguồn HTML thay thế, không bịa OCR. Mỗi gọi mạng tối đa 2 attempts, có backoff, tôn trọng Retry-After dài; 402/403/404 không retry, không fallback trả phí. Generation 30s/attempt, verification 20s/attempt; tổng thời gian truy xuất có thể dài và chưa đo được trên production.
- Test thật helper: một lần câu kết hôn dùng nguồn thủ tục trả 4 nhận định, vượt validator và kiểm nghĩa; đã đọc nguồn để đối chiếu các nhận định. Câu kết hôn full sources trước sửa ưu tiên trả no_source do dữ liệu luật nước ngoài lấn át; sau ưu tiên đúng nguồn sinh hướng dẫn tờ khai/online/nhân thân/cư trú, nhưng bước kiểm nghĩa trả Google 429. Không hiển thị câu chưa vượt bước này. Dừng gọi thêm Google sau hạn mức, không suy ra quota còn lại hoặc bật billing.
- Bạo lực gia đình lượt này full-helper trả no_source; chưa đạt chấp nhận ổn định/đối chiếu mọi sửa đổi. Câu Sao Hỏa thực truy xuất không có nguồn, no_source đúng. Đây không phải kiểm thử RPC/UI với TEST.
- Đã tạo một auth user TEST mới duy nhất, không cấp quyền app, không mint magic link. Lệnh chính thức `lovable auth-session --json --user 3e5b4f9a-7448-4be4-9c31-2d6cb980b483` bị từ chối vì cần user approval nhưng context không cung cấp approval. Đây không phải refusal `approval_required` có action/params, nên không thể mở thẻ bằng approvals tool. Không dùng owner/phiên thật để thay thế. Auth user TEST chưa dùng đã được xác minh ID+email và xóa riêng; bằng chứng ownership/cleanup ở /tmp/browser/legal-current. UUID trên đã bị xóa, không dùng để phê duyệt lần sau.
- Bước cần thiết tiếp theo: chạy trong phiên có thẻ phê duyệt `lovable auth-session --create-test-user --json`, hoặc tạo TEST mới rồi `lovable auth-session --json --user <UUID TEST mới>` để chủ dự án duyệt đúng danh tính; sau đó cấp quyền Chi hội trong app và nghiệm thu, không dùng --self. Hiện công cụ create-test-user cũng báo không khả dụng. Không có URL/thẻ phê duyệt hợp lệ được trả về để cung cấp; không bịa URL.
- 25/25 tests liên quan đạt: 13 evidence + 7 fetch/resources/retry + 5 semantic-gate. Không lặp bộ 43 rộng. Biên dịch tự động OK 07:41:22 UTC; scan backend cơ bản không findings, không deep analysis. Trang công khai 1280×1800 và 390×844 không tràn ngang; có screenshot, chỉ Chromium mô phỏng, không phải Hỏi đáp đã đăng nhập/mobile vật lý.
- Chưa làm: TEST quyền/PII/quota/thu hồi qua phiên thật, UI Hỏi đáp desktop/mobile, runtime PDF production, publish và xác minh production. Không có SHA deployment mới. SHA mã quan sát giữa lượt: 3e04c06a67cea2bfd9689568e63963252f1edd4d (trước cập nhật cuối, không phải SHA production).
- Tệp mới: src/lib/legal-fetch.server.ts, src/lib/legal-passages.ts, src/lib/legal-procedure.server.ts, src/test/legal-fetch.test.ts, src/test/legal-research.test.ts. Sửa legal-research.server.ts, legal-evidence.ts, legal-evidence.test.ts, Guide.tsx, AGENTS.md, roadmap.md và báo cáo này.

## Chưa nghiệm thu hoặc xuất bản luồng mới

Luồng mới đã được triển khai ở mã nguồn, nhưng chưa đạt yêu cầu câu đăng ký kết hôn ổn định và kiểm thử toàn luồng bằng danh tính TEST trên production. Không publish trong lượt này. Production https://son-tra-chapter-hub.lovable.app chưa được xác nhận chạy luồng truy xuất mới.

## Phạm vi thực hiện

- Bỏ yêu cầu có FAQ approved; không đọc FAQ để quyết định gọi Gemini; 3 mục mẫu vẫn pending, 0 approved khi kiểm tra.
- Máy chủ dùng biểu mẫu tìm kiếm công khai của vanban.chinhphu.vn, tải metadata và PDF tại datafiles.chinhphu.vn, giới hạn dung lượng/trang/thời gian và không theo redirect. Không sử dụng dịch vụ tìm kiếm trả phí hay google_search.
- Gemini sinh nhận định/trích dẫn có cấu trúc từ nội dung thực tải. Máy chủ chỉ chấp nhận trích dẫn xuất hiện nguyên văn trong nguồn, điều được nêu phải xuất hiện trong trích dẫn; không sử dụng URL do model tạo. Metadata không được dùng làm căn cứ lời khuyên. Văn bản có hiệu lực trong tương lai không được tải toàn văn để dùng như luật hiện hành.
- Đây là kiểm tra nguồn gốc và sự tồn tại trích dẫn, KHÔNG chứng minh suy luận/paraphrase đúng tuyệt đối hoặc đã đối chiếu mọi văn bản thay thế. Bước kiểm chứng ngữ nghĩa bằng một call Google riêng đã được bổ sung ở lượt 07:33, không phải đánh giá độc lập của con người.
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