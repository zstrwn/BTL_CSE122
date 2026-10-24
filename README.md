# VolunteerLink – Ghép tình nguyện viên với hoạt động cộng đồng (BTL-24, CSE122)

Nguyên mẫu Frontend thuần HTML/CSS/JavaScript, **không cần máy chủ**: mở `index.html` (hoặc `login.html`) bằng trình duyệt.
Dữ liệu giả lập nằm trong `assets/data/seed.js` và được lưu vào LocalStorage; nút **Cài đặt → Đặt lại dữ liệu demo** để khôi phục.

## Đăng nhập – chọn vai trò ngay trên màn hình đăng nhập
Chọn 1 trong 4 vai trò, tài khoản demo được điền sẵn (mật khẩu `123456`):

| Vai trò | Email demo | Trang chủ |
|---|---|---|
| Tình nguyện viên | lan.nguyen@vl.demo | Tìm cơ hội |
| Tổ chức xã hội | org.xanh@vl.demo | Quản lý hoạt động |
| Điều phối viên | ngduykhanh0201@gmail.com | Bảng điều khiển nguồn lực |
| Quản trị viên | admin@vl.demo | Kiểm duyệt |

Đăng nhập sai vai trò sẽ báo lỗi; truy cập trang của vai trò khác sẽ chuyển tới `403.html`.

## Chức năng theo vai trò (mỗi vai trò 4 màn hình nghiệp vụ)
- **Tình nguyện viên:** `volunteer-profile`, `volunteer-opportunity-search`, `volunteer-my-shifts`, `volunteer-ai-matcher` (AI-1)
- **Tổ chức xã hội:** `organization-opportunity-management`, `organization-shift-management`, `organization-volunteer-roster`, `organization-profile`
- **Điều phối viên:** `coordinator-resource-dashboard`, `coordinator-matching-board` (AI-1), `coordinator-shortage-alerts` (AI-2), `coordinator-impact-summary` (AI-3)
- **Quản trị viên:** `admin-category-management`, `admin-user-management`, `admin-moderation`, `admin-audit-log`
- **Dùng chung:** `index`, `login` (chọn vai trò), `register`, `forgot-password`, `pages/notifications`, `pages/settings`, `403`, `404`

Chi tiết CRUD/trạng thái/AI từng màn hình: `docs/screen-list.md`.

## Cấu trúc thư mục (theo mục 19 của đề BTL-24)
```text
volunteerlink/
├── index.html · login.html · register.html · forgot-password.html · 403.html · 404.html
├── README.md
├── docs/            project-proposal · roles-and-features · screen-list · team-assignment · ai-usage-report
├── design/          figma-link.txt · mockups/
├── pages/           18 màn hình theo vai trò + dùng chung
├── assets/
│   ├── images/ · icons/
│   └── data/seed.js         # dữ liệu giả lập (6 thực thể bắt buộc + categories, reports, notifications…)
├── css/             style.css (token, thành phần, sáng/tối) · responsive.css
└── js/
    ├── main.js              # khởi động: guard vai trò -> layout -> mô-đun trang
    └── modules/
        ├── utils.js store.js api.js validators.js ui.js   # hạ tầng dùng chung
        ├── auth.js layout.js queries.js                    # phiên, khung điều hướng, truy vấn ghép bảng
        ├── ai.js                                           # AI-1/AI-2 + luồng trải nghiệm AI
        └── shared.js volunteer.js organization.js coordinator.js admin.js
```
Thứ tự nạp `<script>` quan trọng: seed → utils → store → api → validators → ui → auth → layout → queries → ai → mô-đun vai trò → `main.js`.

## Đã đáp ứng yêu cầu kỹ thuật
- **CRUD có nghiệp vụ:** tạo/sửa/hủy/lưu trữ/xóa có điều kiện; đồng bộ trạng thái ca (còn chỗ ↔ đủ người), thông báo chéo vai trò, nhật ký hệ thống.
- **Trạng thái:** đang tải (skeleton), rỗng, lỗi + Thử lại (bật *Mô phỏng lỗi mạng* trong Cài đặt), thành công (toast), vô hiệu hóa, chờ duyệt, bị từ chối, hoàn thành, đã hủy/lưu trữ.
- **AI (mô phỏng bằng luật, có giải thích):** Nhập → kiểm tra → đang xử lý → kết quả + độ tin cậy → "Vì sao?" → Chấp nhận/Sửa/Từ chối/Tạo lại/Lưu. Trạng thái thất bại: *không đủ dữ liệu*, *chưa chắc chắn*, *lỗi xử lý* (bật *Mô phỏng AI thất bại*) với Thử lại/Dùng thủ công/Bỏ qua/Báo cáo.
- **Responsive + a11y:** sidebar → ngăn kéo trên tablet/mobile, bảng → thẻ trên mobile, liên kết bỏ qua điều hướng, `aria-live`, `<dialog>`, focus rõ, chế độ sáng/tối, tôn trọng `prefers-reduced-motion`.

## Việc nhóm vẫn phải tự hoàn thành (không thể thay bằng mã)
Figma/Canva, bảng Trello/Jira/Notion, lịch sử Git (nhánh + PR + commit đúng mẫu), video OBS cho từng màn hình, điền `docs/ai-usage-report.md` và `docs/team-assignment.md` bằng thông tin thật của nhóm.
