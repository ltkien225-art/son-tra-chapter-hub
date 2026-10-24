import { Section } from "./common";

export function Guide({ office }: { office: boolean }) {
  const items = office
    ? [
        ["Duyệt người dùng", "Vào “Phân quyền”. Người mới đăng nhập sẽ hiện trong “Yêu cầu chờ duyệt”. Bấm “Duyệt & gắn Chi hội”, chọn đúng Chi hội rồi Lưu. Thu hồi có hiệu lực ngay."],
        ["Văn bản", "Tạo văn bản (lưu nháp) → kiểm tra → “Phát hành” cho tất cả hoặc Chi hội được chọn. “Thu hồi” làm Chi hội không còn đọc được nội dung. “Lưu trữ” để gọn danh sách, có thể khôi phục."],
        ["Nhiệm vụ", "Giao nhiệm vụ, đặt hạn, chọn Chi hội. Theo dõi tiến độ từng Chi hội; mục quá hạn tô đỏ. Lưu trữ khi xong."],
        ["Tổng hợp", "Xem báo cáo/hoạt động/phản ánh của 42 Chi hội, lọc theo Chi hội, loại, trạng thái; xuất CSV chỉ gồm thông tin chung, không kèm nội dung."],
        ["Sao lưu", "Quản trị tải tệp sao lưu định kỳ (ví dụ mỗi tuần), cất ở nơi an toàn. Khôi phục luôn chạy “Kiểm tra thử” trước."],
      ]
    : [
        ["Đăng nhập", "Nhập email đã được Văn phòng duyệt, mở thư lấy mã và nhập vào. Không chia sẻ mã cho người khác."],
        ["Văn bản nhận", "Bấm vào văn bản để đọc nội dung và tệp đính kèm."],
        ["Nhiệm vụ", "Mở nhiệm vụ, chọn trạng thái, kéo tiến độ, ghi chú rồi bấm “Cập nhật”."],
        ["Gửi báo cáo", "Chọn loại (báo cáo, hoạt động, tình hình, phản ánh), nhập tiêu đề, nội dung, bấm Gửi. Sau đó mở mục vừa gửi để đính kèm PDF/ảnh. Gửi nhầm thì bấm “Thu hồi”."],
        ["Hội viên", "Mỗi kỳ nhập tổng hội viên, số kết nạp mới, số giảm. Không nhập số hộ vào ô hội viên."],
      ];
  return (
    <Section title="Hướng dẫn sử dụng">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(([t, d], i) => (
          <div key={t} className="panel p-5"><p className="text-sm font-bold text-primary">Bước {i + 1} · {t}</p><p className="mt-1 text-sm">{d}</p></div>
        ))}
      </div>
      <div className="panel p-5 text-sm">
        <b>Bảo mật:</b> Không ghi họ tên, số điện thoại, địa chỉ của phụ nữ/trẻ em cần hỗ trợ vào báo cáo thường. Hồ sơ nhạy cảm chỉ người được cấp quyền đặc biệt mới tạo và xem. Dùng xong trên máy dùng chung hãy bấm “Đăng xuất”.
      </div>
    </Section>
  );
}
