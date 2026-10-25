import { Section } from "./common";

export function Guide({ office }: { office: boolean }) {
  const items = office
    ? [
        ["Duyệt người dùng", "Vào “Phân quyền”. Người mới đăng nhập sẽ hiện trong “Yêu cầu chờ duyệt”. Bấm “Duyệt & gắn Chi hội”, chọn đúng Chi hội rồi Lưu. Thu hồi có hiệu lực ngay."],
        ["Văn bản", "Tạo văn bản (lưu nháp) → kiểm tra → “Phát hành” cho tất cả hoặc Chi hội được chọn. “Thu hồi” làm Chi hội không còn đọc được nội dung. “Lưu trữ” để gọn danh sách, có thể khôi phục."],
        ["Nhiệm vụ", "Giao nhiệm vụ, đặt hạn, chọn Chi hội. Theo dõi tiến độ từng Chi hội; mục quá hạn tô đỏ. Lưu trữ khi xong."],
        ["Tổng hợp", "Xem báo cáo/hoạt động/phản ánh của 42 Chi hội, lọc theo Chi hội, loại, trạng thái; xuất CSV chỉ gồm thông tin chung, không kèm nội dung. Mở một mục → nhập “Phản hồi” → Gửi phản hồi; Chi hội nhận thông báo."],
        ["Đính kèm PDF/ảnh", "Trong form “Văn bản mới” hoặc “Giao nhiệm vụ”, bấm ô hồng “📎 Đính kèm PDF / ảnh / minh chứng” (chọn được nhiều tệp, mỗi tệp ≤ 10 MB) rồi bấm “Lưu & tải … tệp”. Mỗi tệp hiện trạng thái “đang tải / ✓ đã tải lên / lỗi”; lỗi thì bấm “Thử lại”, chữ đã nhập không mất. Muốn bổ sung sau: mở văn bản → “Sửa”, hoặc mở nhiệm vụ → “Sửa / đính kèm / đổi phân công”. Bấm “Xem” để xem PDF/ảnh (ảnh có “Phóng to”), “Tải về” để lưu."],
        ["Mở Sổ Chi hội", "Ở “Tổng quan”, danh mục 42 Chi hội có nút “Mở Sổ …” cho từng Chi hội. Sổ mở ra đúng tên Chi hội, chỉ để xem (văn bản nhận, nhiệm vụ, báo cáo, hội viên). Bấm “← Về Văn phòng” ở góc trên để quay lại."],
        ["Kết quả & minh chứng từ Chi hội", "Mở nhiệm vụ để xem “Kết quả đã gửi” kèm ảnh/PDF của từng Chi hội; mục “Báo cáo” có tệp đính kèm và ô “Phản hồi”. Mục Chi hội đã thu hồi thì không còn xem được nội dung và tệp."],
        ["Hồ sơ bảo mật", "Chỉ người được tích “Quyền đặc biệt” mới thấy mục Hồ sơ bảo mật. Không đưa nội dung hồ sơ vào báo cáo thường, nhật ký hay bản xuất."],
        ["Sao lưu", "Quản trị tải tệp sao lưu định kỳ (ví dụ mỗi tuần), cất ở nơi an toàn. Khôi phục luôn chạy “Kiểm tra thử” trước."],
      ]
    : [
        ["Đăng nhập", "Mở link riêng của Chi hội (Văn phòng gửi, dạng …/so/ch01) hoặc vào trang đầu → chọn Chi hội → “Tiếp tục”. Nhập mã truy cập 8 số do Văn phòng đọc/gọi điện báo. Không cần email. Không đăng mã lên nhóm. Sai 5 lần bị khóa 15 phút. Nếu hiện “Mã đã được đổi hoặc thu hồi”: liên hệ Văn phòng nhận mã mới."],
        ["Văn bản nhận", "Bấm vào văn bản để đọc nội dung. Tệp đính kèm có nút “Xem” (xem ngay trong ứng dụng, ảnh có “Phóng to”) và “Tải về”."],
        ["Nhiệm vụ", "Mở nhiệm vụ: xem tệp hướng dẫn kèm theo; chọn trạng thái, kéo tiến độ, bấm “Cập nhật tiến độ”. Để nộp kết quả: ở ô “Gửi kết quả / minh chứng về Văn phòng” ghi tóm tắt, bấm “📎 Đính kèm…” (điện thoại có thêm “📷 Chụp ảnh”), rồi bấm “Gửi kết quả”."],
        ["Gửi báo cáo", "Chọn loại (báo cáo, hoạt động, tình hình, phản ánh), nhập tiêu đề, nội dung, bấm ô “📎 Đính kèm PDF / ảnh / minh chứng” để chọn tệp, rồi bấm “Gửi lên Văn phòng & … tệp”. Tệp lỗi có nút “Thử lại”; muốn bổ sung thì mở mục đã gửi và đính kèm thêm. Gửi nhầm thì bấm “Thu hồi”. Phản hồi của Văn phòng hiện ngay dưới mục đã gửi."],
        ["Hội viên", "Mỗi kỳ nhập tổng hội viên, số kết nạp mới, số giảm. Không nhập số hộ vào ô hội viên."],
        ["Lịch sử & thu hồi", "Mục Gửi báo cáo liệt kê tất cả những gì Chi hội đã gửi. Thu hồi xong, Văn phòng chỉ thấy tiêu đề và trạng thái “Đã thu hồi”, không đọc được nội dung và tệp."],
      ];
  const common: [string, string][] = [
    ["Cài lên điện thoại — Android", "Mở trang bằng Chrome → bấm ⋮ → “Thêm vào màn hình chính” (hoặc “Cài đặt ứng dụng”). Biểu tượng hoa sen sẽ xuất hiện."],
    ["Cài lên điện thoại — iPhone", "Mở bằng Safari → nút Chia sẻ → “Thêm vào MH chính”. Cần iOS 16.4 trở lên để nhận thông báo; luôn mở ứng dụng từ biểu tượng hoa sen, rồi mới bật thông báo."],
    ["Máy tính (Chrome/Edge)", "Mở trang, đăng nhập, vào “Thông báo” → bật. Trình duyệt phải đang chạy (có thể thu nhỏ) mới nhận được."],
    ["Bật thông báo", "Ứng dụng chỉ xin quyền khi bạn bấm “Bật thông báo trên thiết bị này”. Bấm “Gửi thử” để kiểm tra. Mỗi người bật được trên nhiều máy; muốn dừng bấm “Tắt”. Khi bị thu hồi quyền, máy sẽ không nhận thông báo nữa."],
    ["Thông báo nhận được", office
      ? "Văn phòng nhận khi: Chi hội gửi báo cáo/phản ánh mới, thu hồi một mục, cập nhật tiến độ hoặc hoàn thành nhiệm vụ."
      : "Chi hội nhận khi: có văn bản mới hoặc bị thu hồi, được giao nhiệm vụ, nhiệm vụ đổi hạn/thu hồi, nhiệm vụ sắp đến hạn hoặc quá hạn, Văn phòng phản hồi mục Chi hội đã gửi."],
    ["Bấm vào thông báo", "Thông báo chỉ ghi chung (không có tên người, nội dung hồ sơ). Bấm vào sẽ mở đúng mục; ứng dụng kiểm tra lại quyền rồi mới hiện dữ liệu."],
    ["Đồng bộ", "Văn phòng và Chi hội dùng chung một nguồn dữ liệu, không cần nhập lại. Thanh trạng thái dưới tiêu đề cho biết “Đã đồng bộ lúc…”, “Đang đồng bộ”, “Mất mạng” hoặc “Đồng bộ lỗi”. Ứng dụng tự làm mới mỗi phút, khi quay lại ứng dụng và khi có mạng lại; bấm “Làm mới” để cập nhật ngay. Thông báo chỉ để nhắc, không thay thế dữ liệu."],
    ["Hỏi đáp pháp luật", office
      ? "Mục “Hỏi đáp pháp luật”: chọn mục có sẵn hoặc nhập câu hỏi/trả lời, tên văn bản, điều khoản, liên kết chính thức (https://), ngày hiệu lực, ngày kiểm chứng → “Lưu (chờ duyệt)”. Chỉ khi đã đối chiếu văn bản gốc mới bấm “Duyệt & hiển thị”. Câu hỏi riêng của Chi hội hiện ở cuối trang để trả lời; không đưa vào AI."
      : "Mục “Hỏi đáp pháp luật”: gõ từ khóa để tìm câu hỏi đáp đã duyệt, bấm để xem trả lời và văn bản gốc. Có thể hỏi trợ lý (chỉ câu hỏi chung, KHÔNG ghi tên, số điện thoại, CCCD, địa chỉ). Việc riêng: dùng “Gửi câu hỏi riêng cho cán bộ”, chỉ Văn phòng đọc."],
    ["Xử lý lỗi thường gặp", "Không nhận được mã: xem thư Rác/Spam, chờ 1 phút rồi gửi lại. “Chưa được cấp quyền”: gửi yêu cầu và báo Văn phòng. Không có thông báo: kiểm tra đã cho phép thông báo trong cài đặt máy, iPhone phải mở từ màn hình chính; bấm “Gửi thử”. Lỗi khi gửi: kiểm tra mạng rồi bấm lại — hệ thống chống gửi trùng."],
  ];
  return (
    <Section title="Hướng dẫn sử dụng">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(([t, d], i) => (
          <div key={t} className="panel p-5"><p className="text-sm font-bold text-primary">Bước {i + 1} · {t}</p><p className="mt-1 text-sm">{d}</p></div>
        ))}
      </div>
      <h3 className="font-bold text-primary">Cài đặt, thông báo và xử lý lỗi</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {common.map(([t, d]) => (
          <div key={t} className="panel p-5"><p className="text-sm font-bold text-primary">{t}</p><p className="mt-1 text-sm">{d}</p></div>
        ))}
      </div>
      <div className="panel p-5 text-sm">
        <b>Bảo mật:</b> Không ghi họ tên, số điện thoại, địa chỉ của phụ nữ/trẻ em cần hỗ trợ vào báo cáo thường. Hồ sơ nhạy cảm chỉ người được cấp quyền đặc biệt mới tạo và xem. Dùng xong trên máy dùng chung hãy bấm “Đăng xuất”.
      </div>
    </Section>
  );
}
