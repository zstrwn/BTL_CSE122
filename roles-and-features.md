# VolunteerLink – Vai trò và chức năng

| Vai trò | Thành viên | Trách nhiệm chính | Chức năng (≥ 4) |
|---|---|---|---|
| Tình nguyện viên | Hồ sơ: Nguyễn Duy Khánh · Tìm hoạt động và AI Matcher: Trương Quang Huy · Ca của tôi: Đoàn Phú Hưng | Xây hồ sơ và đăng ký ca | Hồ sơ & lịch rảnh · Tìm/lọc cơ hội · Quản lý ca của tôi · AI gợi ý ca (AI-1) |
| Tổ chức xã hội | Đoàn Phú Hưng | Tạo hoạt động và ca | Quản lý hoạt động · Quản lý ca · Danh sách TNV (duyệt, ghi giờ, CSV) · Hồ sơ tổ chức |
| Điều phối viên | Nguyễn Duy Khánh | Matching và theo dõi thiếu hụt | Bảng điều khiển nguồn lực · Bảng ghép người (AI-1) · Cảnh báo thiếu ca (AI-2) · Tóm tắt tác động (AI-3) |
| Quản trị viên | Trương Quang Huy | Taxonomy và kiểm duyệt | Danh mục · Người dùng · Kiểm duyệt · Nhật ký hệ thống |

## Hành trình chính

Tổ chức tạo hoạt động → Admin kiểm duyệt → TNV tìm/đăng ký ca (hoặc nhận gợi ý AI-1) → Tổ chức xác nhận → Điều phối viên theo dõi thiếu hụt (AI-2) và ghép người bổ sung → Tổ chức ghi giờ → Điều phối viên tạo tóm tắt tác động (AI-3).

## Thực thể dữ liệu

`volunteers, organizations, opportunities, shifts, registrations, skills` (bắt buộc) + `users, categories, reports, notifications, impactSummaries, auditLog`.
