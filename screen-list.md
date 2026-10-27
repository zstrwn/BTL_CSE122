# VolunteerLink – Danh mục màn hình

Trạng thái: B = bình thường, T = đang tải, R = rỗng, L = lỗi, OK = thành công, V = vô hiệu hóa, C = chờ duyệt, X = bị từ chối, H = hoàn thành, A = hủy/lưu trữ.

| Vai trò | Mục tiêu người dùng | Nhiệm vụ | Màn hình | Tệp | CRUD/Trạng thái | AI | Thành viên |
|---|---|---|---|---|---|---|---|
| Tình nguyện viên | Có hồ sơ đầy đủ | Xem/sửa kỹ năng, lịch rảnh | Volunteer Profile | `pages/volunteer-profile.html` | R/U · B T L OK | – | Nguyễn Duy Khánh |
| Tình nguyện viên | Tìm đúng cơ hội | Tìm, lọc, xem ca, đăng ký | Opportunity Search | `pages/volunteer-opportunity-search.html` | C/R/U · B T R L OK V C | độ phù hợp % | Trương Quang Huy |
| Tình nguyện viên | Quản lý ca đã đăng ký | Hủy, sửa ghi chú, xóa lịch sử | My Shifts | `pages/volunteer-my-shifts.html` | C/R/U/D · B T R L C X H A | – | Đoàn Phú Hưng |
| Tình nguyện viên | Nhận gợi ý ca | Chọn kỹ năng/lịch → AI gợi ý → đăng ký | AI Matcher | `pages/volunteer-ai-matcher.html` | C/R · B T R L OK | **AI-1** | Trương Quang Huy |
| Tổ chức xã hội | Tạo hoạt động | Tạo/sửa/đóng/lưu trữ/xóa, gửi duyệt | Opportunity Management | `pages/organization-opportunity-management.html` | C/R/U/D · B T R L C X A | – | Đoàn Phú Hưng |
| Tổ chức xã hội | Tạo ca | Tạo/sửa/hủy/hoàn thành/xóa ca | Shift Management | `pages/organization-shift-management.html` | C/R/U/D · B T R L V A H | – | Đoàn Phú Hưng |
| Tổ chức xã hội | Duyệt người tham gia | Xác nhận/từ chối/ghi giờ/thêm thủ công/xuất CSV | Volunteer Roster | `pages/organization-volunteer-roster.html` | C/R/U/D · B T R L C X H | – | Đoàn Phú Hưng |
| Tổ chức xã hội | Giữ thông tin tổ chức | Xem/sửa hồ sơ | Organization Profile | `pages/organization-profile.html` | R/U · B T L OK | – | Đoàn Phú Hưng |
| Điều phối viên | Biết nguồn lực | Xem KPI, lấp đầy, cung–cầu kỹ năng | Resource Dashboard | `pages/coordinator-dashboard.html` | R · B T R L | dự báo nhanh | Nguyễn Duy Khánh |
| Điều phối viên | Ghép người vào ca | Chọn ca, xếp/bỏ xếp, xác nhận | Matching Board | `pages/coordinator-matching.html` | C/R/U · B T R L V | **AI-1** | Nguyễn Duy Khánh |
| Điều phối viên | Phát hiện thiếu hụt | Dự báo, gửi cảnh báo, lưu báo cáo | Shortage Alerts | `pages/coordinator-shortage.html` | C/R/D · B T R L | **AI-2** | Nguyễn Duy Khánh |
| Điều phối viên | Ghi nhận đóng góp | Tạo, sửa, lưu, gửi, xóa tóm tắt | Impact Summary | `pages/coordinator-impact.html` | C/R/U/D · B R L H A X | **AI-3** | Nguyễn Duy Khánh |
| Quản trị viên | Chuẩn hóa taxonomy | Thêm/sửa/lưu trữ/xóa lĩnh vực & kỹ năng | Category Management | `pages/admin-category-management.html` | C/R/U/D · B T R L A | – | Trương Quang Huy |
| Quản trị viên | Quản lý tài khoản | Tạo/sửa/phê duyệt/khóa | User Management | `pages/admin-user-management.html` | C/R/U · B T R L C V | – | Trương Quang Huy |
| Quản trị viên | Kiểm duyệt | Duyệt/từ chối hoạt động, xử lý báo cáo | Moderation | `pages/admin-moderation.html` | C/R/U/D · B T R L C X H | – | Trương Quang Huy |
| Quản trị viên | Truy vết | Lọc, xuất nhật ký | Audit Log | `pages/admin-audit-log.html` | R · B T R L | – | Trương Quang Huy |
| Quản trị viên | Demo ghép người | Nhập kỹ năng + khung giờ → xếp hạng ứng viên | AI Matching (demo) | `pages/admin-ai-matching.html` | R · B T R L OK | scoring demo | Trương Quang Huy |
| Dùng chung | Đăng nhập + chọn vai trò | Đăng nhập, khóa tạm 5 lần sai | Login | `login.html` | B OK L V | – | Cả nhóm |
| Dùng chung | Tạo tài khoản | Đăng ký TNV / tổ chức (chờ duyệt) | Register | `register.html` | C OK L | – | Cả nhóm |
| Dùng chung | Khôi phục | Quên mật khẩu (mô phỏng) | Forgot Password | `forgot-password.html` | OK L | – | Cả nhóm |
| Dùng chung | Theo dõi tin | Đọc/xóa thông báo | Notifications | `pages/notifications.html` | R/U/D · B T R L | – | Cả nhóm |
| Dùng chung | Tùy chỉnh | Giao diện, đổi mật khẩu, mô phỏng lỗi | Settings | `pages/settings.html` | U · B OK L | – | Cả nhóm |
| Dùng chung | Giới thiệu / lỗi | Landing, 403, 404 | Index, 403, 404 | `index.html`, `403.html`, `404.html` | B | – | Cả nhóm |

Toàn bộ 25 màn hình đều được khai báo trong `js/main.js` thông qua `document.body.dataset.page` và registry `VL.pages`.
