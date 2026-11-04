# Kiểm toán chi phí Cloud Run – Bộ Phụ nữ (chỉ phương án)

## 1. Số liệu đã ghi nhận (06/10 → 04/11/2026, 03:08 UTC)
Nguồn: công cụ cost optimization, phạm vi dự án này.

| Mục | Số lượng | Credit yêu cầu |
|---|---|---|
| Cấp DB | Pico (0,0774 credit/giờ) | — |
| Giờ DB hoạt động | 30,45 giờ (ghi nhận 25/10 → 04/11) | 2,357 |
| Worker (máy chủ ứng dụng) | 59 worker-day | 0,590 |
| Lượt gọi worker | 10 | 0,000015 |
| Mạng + lưu tệp | ~0,009 GB | 0,004 |
| **Tổng Run** | | **≈ 2,95 credit/30 ngày** |
| Build (không tính Run) | | 193,8 |

**Độ chắc chắn:** cao cho số credit đã ghi; thấp cho nguyên nhân. Dữ liệu ghi có độ trễ, ngày hiện tại chưa đủ; số lượt gọi (10) rõ ràng thấp hơn thực tế sử dụng nên không dùng làm bằng chứng. Đây là "credit yêu cầu", không phải số tiền đã trả.

**Diễn giải:** DB chỉ chạy ~3 giờ/ngày, nghĩa là đã tự nghỉ khi không có người dùng. Nếu chạy liên tục sẽ ~55,7 credit/tháng. Worker ~0,02 credit/ngày.

## 2. Lý do vận hành (đã thấy trong mã / chưa kiểm)
- `src/router.tsx`: mọi danh sách tự tải lại mỗi 60 giây khi tab mở (`refetchInterval: 60_000`), cùng `src/routes/app.tsx` kiểm quyền mỗi 60 giây → khi có người mở app, DB không thể nghỉ. Đây là nguyên nhân giờ hoạt động có khả năng cao nhất (chưa đo).
- Cron nhắc việc hằng ngày + retry hằng giờ: không thấy trong mã nguồn; cần xác minh bằng danh sách lịch (chỉ đọc). Một lần chạy mỗi giờ có thể đánh thức DB tới 24 lần/ngày.
- Gemini: chạy ở worker + gọi Google; không tính vào DB ngoài ghi quota.
- Nhánh audit chỉ đặt staleTime 30s: giảm lượt truy vấn khi chuyển màn hình nhưng **không** bỏ chu kỳ 60s → gần như không giảm giờ DB.

## 3. Ngân sách
Mục tiêu workspace ≤ 15 Run credit/tháng cho 6 ứng dụng (~2,5/ứng dụng). Bộ Phụ nữ hiện ~2,95 → hơi vượt mức chia đều; cần số liệu 5 ứng dụng còn lại (phải chạy kiểm toán workspace có quyền quản lý thanh toán). Gói Free có 20 credit Cloud miễn phí/tháng; không có lựa chọn nạp thêm trên Free nên khi hết, Cloud sẽ bị tạm dừng — cần biên an toàn.

## 4. Ba phương án

| | A. Giữ nguyên | B. Giảm chu kỳ tự tải (khuyến nghị) | C. B + gom lịch nhắc việc |
|---|---|---|---|
| Thay đổi | Không | Bỏ tự tải 60s toàn cục; chỉ tải lại khi mở lại tab/có mạng/thao tác; kiểm quyền 5 phút + mỗi thao tác ghi (server vẫn kiểm RLS mỗi yêu cầu) | Thêm: retry hằng giờ chỉ chạy khi outbox còn việc, nếu không thì gỡ; nhắc việc 1 lần/ngày |
| Ưu | 0 rủi ro | Cắt giờ DB khi tab bị bỏ mở | Giảm đánh thức DB ban đêm |
| Nhược | Có thể vượt 2,5 | Dữ liệu mới hiện chậm hơn nếu không có Push/quay lại tab | Cần sửa lịch (thay đổi runtime) |
| Rủi ro | Hết credit Free | Thấp; quyền không đổi vì kiểm phía server | Trung bình: lỗi lịch → mất nhắc việc |
| Tác động giờ DB (ước lượng, chưa đo) | 0 | Có thể giảm đáng kể nếu nguyên nhân là tab mở lâu | Thêm phần giờ do cron, nếu cron tồn tại |

Không bỏ chức năng, quyền, dữ liệu, link; không yêu cầu cài lại (service worker giữ nguyên).

## 5. Bảng thay đổi cấp tệp/dịch vụ (khi được duyệt)
| Tệp/dịch vụ | PA | Thay đổi |
|---|---|---|
| `src/router.tsx` | B,C | `refetchInterval: false`, `staleTime` 60s, giữ focus/reconnect |
| `src/routes/app.tsx` | B,C | Kiểm quyền 300s thay 60s |
| Push hiện có | B,C | Dùng tín hiệu Push để làm mới danh sách khi đang mở |
| Lịch nhắc việc/retry (backend) | C | Chỉ sửa sau khi đọc danh sách lịch; wake-on-enqueue |
| Nhánh audit GitHub | — | Không merge; thay thế bằng B |

## 6. SQL chỉ đọc để xác minh (chạy trước khi sửa)
```sql
-- outbox: lượng việc chờ thực tế
select status, count(*), max(created_at) from public.notification_outbox group by status;
-- tần suất hoạt động theo giờ trong 7 ngày (từ audit)
select date_trunc('hour', created_at) h, count(*) from public.audit_log
where created_at > now() - interval '7 days' group by 1 order by 1;
```
Danh sách lịch: dùng công cụ liệt kê lịch (không đọc trực tiếp bảng cron).

## 7. Nghiệm thu
- Unit test hiện có đạt; đồng bộ Văn phòng↔Chi hội vẫn cập nhật khi quay lại tab/có mạng/Push.
- Thu hồi quyền vẫn chặn ngay ở yêu cầu kế tiếp (server).
- Sau 7 ngày: so giờ DB/ngày với mức nền ~3 giờ/ngày, cùng điều kiện sử dụng; chỉ nhận "đã giảm" khi số liệu thanh toán ghi nhận giảm.

## 8. Rollback
Đổi lại 2 giá trị trong `router.tsx`/`app.tsx`; lịch backend khôi phục từ bản ghi danh sách lịch đã lưu trước khi sửa.

## 9. Còn chưa xác minh
Lịch cron thực tế, số liệu 5 ứng dụng còn lại, mức giờ DB tối thiểu khi không ai dùng.
