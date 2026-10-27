# VolunteerLink – Phân công thành viên

| Thành viên | Vai trò đảm nhận | Màn hình phụ trách | Mô-đun JavaScript |
|---|---|---|---|
| Đoàn Phú Hưng | Tổ chức xã hội | `organization-opportunity-management`, `organization-shift-management`, `organization-volunteer-roster`, `organization-profile` | `organization-opportunity.js`, `organization-shift.js`, `organization-roster.js`, `organization-profile.js`, `organization-common.js` |
| Đoàn Phú Hưng | Tình nguyện viên – Ca của tôi | `volunteer-my-shifts` | `volunteer.js:458` |
| Nguyễn Duy Khánh | Điều phối viên | `coordinator-dashboard`, `coordinator-matching`, `coordinator-shortage`, `coordinator-impact` | `coordinator-dashboard.js`, `coordinator-matching.js`, `coordinator-shortage.js`, `coordinator-impact.js`, `ai.js` |
| Nguyễn Duy Khánh | Tình nguyện viên – Hồ sơ | `volunteer-profile` | `volunteer.js:83` |
| Trương Quang Huy | Quản trị viên | `admin-moderation`, `admin-user-management`, `admin-category-management`, `admin-audit-log`, `admin-ai-matching` | `admin-moderation.js`, `admin-user-management.js`, `admin-category-management.js`, `admin-audit-log.js`, `admin-ai-matching.js` |
| Trương Quang Huy | Tình nguyện viên – Tìm hoạt động và AI Matcher | `volunteer-opportunity-search`, `volunteer-ai-matcher` | `volunteer.js:239`, `volunteer.js:674`, `ai.js` |
| Cả nhóm | Trang dùng chung và trang tĩnh | `login`, `register`, `forgot-password`, `notifications`, `settings`, `index`, `403`, `404` | `shared.js`, `auth.js`, `layout.js`, `store.js`, `queries.js`, `ui.js`, `api.js`, `validators.js`, `utils.js` |

Bốn màn hình tình nguyện viên cùng nằm trong một tệp `js/modules/volunteer.js`, nên phân chia ở trên là theo màn hình, không theo tệp.

## Quy ước làm việc

- Nhánh: `feature/<tên-màn-hình>`.
- Commit: `feat:` cho tính năng mới, `fix:` cho sửa lỗi, `docs:` cho cập nhật tài liệu.
- Video OBS: `<tên-thành-viên>-<số-thứ-tự>-<tên-màn-hình>.mp4`.

## Điểm nổi bật trình bày

- Đoàn Phú Hưng – Tổ chức xã hội: quy trình khép kín và tính đúng đắn dữ liệu (kiểm duyệt được kích hoạt khi mở hoạt động, `Q.syncShift` tự cân chỉnh sức chứa, chặn xóa lồng nhau).
- Nguyễn Duy Khánh – Điều phối viên: hỗ trợ ra quyết định (dự báo rủi ro thiếu người, chấm điểm ứng viên theo trọng số chỉnh được, kèm giải thích và độ tin cậy, người dùng duyệt bước cuối).
- Trương Quang Huy – Quản trị viên: quản trị và kiểm toán (từ chối hoạt động thì ép về nháp, khóa tài khoản phải có lý do, không tự khóa/hạ cấp chính mình, đếm nơi sử dụng trước khi xóa danh mục, nhật ký hệ thống xuất CSV).
