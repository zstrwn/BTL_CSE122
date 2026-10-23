# Bảng kiểm kê màn hình

Trạng thái: B = bình thường, T = đang tải, R = rỗng, L = lỗi, OK = thành công, V = vô hiệu hóa, C = chờ duyệt, X = bị từ chối, H = hoàn thành, A = hủy/lưu trữ.

| Vai trò | Mục tiêu người dùng | Nhiệm vụ | Màn hình | Tệp | CRUD/Trạng thái | AI | Người phụ trách |
|---|---|---|---|---|---|---|---|
| Tình nguyện viên | Có hồ sơ đầy đủ | Xem/sửa kỹ năng, lịch rảnh | Volunteer Profile | `pages/volunteer-profile.html` | R/U · B T L OK | – | SV1 |
| Tình nguyện viên | Tìm đúng cơ hội | Tìm, lọc, xem ca, đăng ký | Opportunity Search | `pages/volunteer-opportunity-search.html` | C/R/U · B T R L OK V C | độ phù hợp % | SV1 |
| Tình nguyện viên | Quản lý ca đã đăng ký | Hủy, sửa ghi chú, xóa lịch sử | My Shifts | `pages/volunteer-my-shifts.html` | C/R/U/D · B T R L C X H A | – | SV1 |
| Tình nguyện viên | Nhận gợi ý ca | Chọn kỹ năng/lịch → AI gợi ý → đăng ký | AI Matcher | `pages/volunteer-ai-matcher.html` | C/R · B T R L OK | **AI-1** | SV1 |
| Tổ chức xã hội | Tạo hoạt động | Tạo/sửa/đóng/lưu trữ/xóa, gửi duyệt | Opportunity Management | `pages/organization-opportunity-management.html` | C/R/U/D · B T R L C X A | – | SV2 |
| Tổ chức xã hội | Tạo ca | Tạo/sửa/hủy/hoàn thành/xóa ca | Shift Management | `pages/organization-shift-management.html` | C/R/U/D · B T R L V A H | – | SV2 |
| Tổ chức xã hội | Duyệt người tham gia | Xác nhận/từ chối/ghi giờ/thêm thủ công/xuất CSV | Volunteer Roster | `pages/organization-volunteer-roster.html` | C/R/U/D · B T R L C X H | – | SV2 |
| Tổ chức xã hội | Giữ thông tin tổ chức | Xem/sửa hồ sơ | Organization Profile | `pages/organization-profile.html` | R/U · B T L OK | – | SV2 |
| Điều phối viên | Biết nguồn lực | Xem KPI, lấp đầy, cung–cầu kỹ năng | Resource Dashboard | `pages/coordinator-resource-dashboard.html` | R · B T R L | dự báo nhanh | SV3 |
| Điều phối viên | Ghép người vào ca | Chọn ca, xếp/bỏ xếp, xác nhận | Matching Board | `pages/coordinator-matching-board.html` | C/R/U · B T R L V | **AI-1** | SV3 |
| Điều phối viên | Phát hiện thiếu hụt | Dự báo, gửi cảnh báo, lưu báo cáo | Shortage Alerts | `pages/coordinator-shortage-alerts.html` | C/R/D · B T R L | **AI-2** | SV3 |
| Điều phối viên | Ghi nhận đóng góp | Tạo, sửa, lưu, gửi, xóa tóm tắt | Impact Summary | `pages/coordinator-impact-summary.html` | C/R/U/D · B R L H A X | **AI-3** | SV3 |
| Quản trị viên | Chuẩn hóa taxonomy | Thêm/sửa/lưu trữ/xóa lĩnh vực & kỹ năng | Category Management | `pages/admin-category-management.html` | C/R/U/D · B T R L A | – | SV3 |
| Quản trị viên | Quản lý tài khoản | Tạo/sửa/phê duyệt/khóa | User Management | `pages/admin-user-management.html` | C/R/U · B T R L C V | – | SV3 |
| Quản trị viên | Kiểm duyệt | Duyệt/từ chối hoạt động, xử lý báo cáo | Moderation | `pages/admin-moderation.html` | C/R/U/D · B T R L C X H | nhận phản hồi AI | SV3 |
| Quản trị viên | Truy vết | Lọc, xuất nhật ký | Audit Log | `pages/admin-audit-log.html` | R · B T R L | – | SV3 |
| Dùng chung | Đăng nhập + chọn vai trò | Đăng nhập, khóa tạm 5 lần sai | Login | `login.html` | B OK L V | – | SV1 |
| Dùng chung | Tạo tài khoản | Đăng ký TNV / tổ chức (chờ duyệt) | Register | `register.html` | C OK L | – | SV1 |
| Dùng chung | Khôi phục | Quên mật khẩu (mô phỏng) | Forgot Password | `forgot-password.html` | OK L | – | SV1 |
| Dùng chung | Theo dõi tin | Đọc/xóa thông báo | Notifications | `pages/notifications.html` | R/U/D · B T R L | – | SV3 |
| Dùng chung | Tùy chỉnh | Giao diện, đổi mật khẩu, mô phỏng lỗi | Settings | `pages/settings.html` | U · B OK L | – | SV3 |
| Dùng chung | Giới thiệu / lỗi | Landing, 403, 404 | Index, 403, 404 | `index.html`, `403.html`, `404.html` | B | – | SV3 |

> Cột "Người phụ trách" là gợi ý theo mục 14 đề bài; nhóm điều chỉnh lại cho cân bằng.
