import { Section } from "./common";

export function Guide({ office }: { office: boolean }) {
  const items = office
    ? [
        ["Duyệt người dùng", "Vào “Phân quyền”. Người mới đăng nhập sẽ hiện trong “Yêu cầu chờ duyệt”. Bấm “Duyệt & gắn Chi hội”, chọn đúng Chi hội rồi Lưu. Thu hồi có hiệu lực ngay."],
        ["Văn bản", "Tạo văn bản (lưu nháp) → kiểm tra → “Phát hành” cho tất cả hoặc Chi hội được chọn. “Thu hồi” làm Chi hội không còn đọc được nội dung. “Lưu trữ” để gọn danh sách, có thể khôi phục."],
        ["Nhiệm vụ", "Giao nhiệm vụ, đặt hạn, chọn Chi hội. Theo dõi tiến độ từng Chi hội; mục quá hạn tô đỏ. Lưu trữ khi xong."],
        ["Tổng hợp", "Xem báo cáo/hoạt động/phản ánh của 42 Chi hội, lọc theo Chi hội, loại, trạng thái; xuất CSV chỉ gồm thông tin chung, không kèm nội dung. Mở một mục → nhập “Phản hồi” → Gửi phản hồi; Chi hội nhận thông báo."],
        ["Minh chứng PDF/ảnh", "Khi sửa văn bản có thể đính kèm PDF/ảnh. Bấm “Xem” để mở ngay trong ứng dụng; liên kết xem chỉ sống 60 giây và chỉ người có quyền mới mở được."],
        ["Hồ sơ bảo mật", "Chỉ người được tích “Quyền đặc biệt” mới thấy mục Hồ sơ bảo mật. Không đưa nội dung hồ sơ vào báo cáo thường, nhật ký hay bản xuất."],
        ["Sao lưu", "Quản trị tải tệp sao lưu định kỳ (ví dụ mỗi tuần), cất ở nơi an toàn. Khôi phục luôn chạy “Kiểm tra thử” trước."],
      ]
    : [
        ["Đăng nhập", "Nhập email đã được Văn phòng duyệt, mở thư lấy mã và nhập vào. Không chia sẻ mã cho người khác."],
        ["Văn bản nhận", "Bấm vào văn bản để đọc nội dung và tệp đính kèm."],
        ["Nhiệm vụ", "Mở nhiệm vụ, chọn trạng thái, kéo tiến độ, ghi chú rồi bấm “Cập nhật”."],
        ["Gửi báo cáo", "Chọn loại (báo cáo, hoạt động, tình hình, phản ánh), nhập tiêu đề, nội dung, bấm Gửi. Sau đó mở mục vừa gửi để đính kèm PDF/ảnh. Gửi nhầm thì bấm “Thu hồi”. Phản hồi của Văn phòng hiện ngay dưới mục đã gửi."],
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
