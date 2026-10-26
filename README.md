# VolunteerLink – Ghép tình nguyện viên với hoạt động cộng đồng (BTL-24, CSE122)

Nguyên mẫu Frontend thuần HTML/CSS/JavaScript, **không cần máy chủ backend**: mở trực tiếp `index.html` (hoặc `login.html`) bằng trình duyệt. Toàn bộ luồng bên dưới đã được kiểm thử khi phục vụ thư mục này qua một máy chủ tĩnh (ví dụ `npx serve`); chạy bằng `file://` chưa được kiểm chứng trong lần test này.
Dữ liệu giả lập nằm trong `assets/data/seed.js` và được lưu vào LocalStorage; nút **Cài đặt → Đặt lại dữ liệu demo** để khôi phục.

## Đăng nhập – chọn vai trò ngay trên màn hình đăng nhập
Chọn 1 trong 4 vai trò, tài khoản demo được điền sẵn (mật khẩu `123456`):

| Vai trò | Email demo | Trang chủ |
|---|---|---|
| Tình nguyện viên | lan.nguyen@vl.demo | Tìm cơ hội |
| Tổ chức xã hội | org.xanh@vl.demo | Quản lý hoạt động |
| Điều phối viên | coord@vl.demo | Bảng điều khiển nguồn lực |
| Quản trị viên | admin@vl.demo | Kiểm duyệt |

Đăng nhập sai vai trò sẽ báo lỗi; truy cập trang của vai trò khác sẽ chuyển tới `403.html`.

## Chức năng theo vai trò (tên file trong `pages/`)
- **Tình nguyện viên (4):** `volunteer-opportunity-search` (AI ghép ca), `volunteer-my-shifts`, `volunteer-ai-matcher` (AI-1), `volunteer-profile`
- **Tổ chức xã hội (4):** `organization-opportunity-management`, `organization-shift-management`, `organization-volunteer-roster`, `organization-profile`
- **Điều phối viên (4):** `coordinator-dashboard`, `coordinator-matching` (AI-1), `coordinator-shortage` (AI-2), `coordinator-impact` (AI-3)
- **Quản trị viên (5):** `admin-moderation` (trang chủ), `admin-category-management`, `admin-user-management`, `admin-ai-matching`, `admin-audit-log`
- **Dùng chung:** `index.html`, `login.html`, `register.html`, `forgot-password.html`, `403.html`, `404.html`, `pages/notifications`, `pages/settings`

Chi tiết CRUD/trạng thái/AI từng màn hình: `docs/screen-list.md` (lưu ý: tài liệu này vẫn ghi tên file cũ `coordinator-resource-dashboard`, `coordinator-matching-board`, `coordinator-shortage-alerts`, `coordinator-impact-summary`; tên thật trong `pages/` là `coordinator-dashboard`, `coordinator-matching`, `coordinator-shortage`, `coordinator-impact`. Khóa `link` cũ trong thông báo đã lưu ở LocalStorage vẫn trỏ đúng trang nhờ ánh xạ `RENAMED` ở đầu `js/modules/auth.js`).

## Cấu trúc thư mục (theo mục 19 của đề BTL-24)
```text
BTL_CSE122/
├── index.html · login.html · register.html · forgot-password.html · 403.html · 404.html
├── README.md
├── docs/            project-proposal · roles-and-features · screen-list · team-assignment · ai-usage-report
├── pages/           19 màn hình (4 TNV + 4 tổ chức + 4 điều phối + 5 quản trị + thông báo + cài đặt)
├── assets/
│   ├── images/ · icons/       # thư mục rỗng – chưa có file ảnh/icon nào được nạp
│   └── data/seed.js           # dữ liệu giả lập (12 khóa: users, volunteers, organizations, opportunities, shifts, registrations, categories, skills, reports, notifications, impactSummaries, auditLog)
├── css/             style.css (token, thành phần, sáng/tối) · responsive.css
└── js/
    ├── main.js              # khởi động: guard vai trò -> layout -> mô-đun trang
    └── modules/
        ├── utils.js store.js api.js validators.js ui.js render.js   # hạ tầng dùng chung
        ├── auth.js layout.js queries.js                              # phiên + ánh xạ tên trang, khung điều hướng, truy vấn ghép bảng
        ├── ai.js                                                     # AI-1/AI-2 + luồng trải nghiệm AI dùng chung
        ├── shared.js volunteer.js                                    # đăng nhập/đăng ký/thông báo/cài đặt + 4 màn hình TNV
        ├── organization-common.js organization-{opportunity,shift,roster,profile}.js
        ├── coordinator-{dashboard,matching,shortage,impact}.js
        └── admin-{moderation,category-management,user-management,ai-matching,audit-log}.js
```
Thứ tự nạp `<script>` quan trọng: seed → utils → store → api → validators → ui → (render) → auth → layout → queries → ai → mô-đun trang → `main.js`. Thiếu `auth.js` thì `main.js` bỏ qua guard vai trò và không dựng sidebar.

## Đã đáp ứng yêu cầu kỹ thuật
- **CRUD có nghiệp vụ:** tạo/sửa/hủy/lưu trữ/xóa có điều kiện; đồng bộ trạng thái ca (còn chỗ ↔ đủ người, kể cả khi TNV hủy đăng ký); thông báo chéo vai trò (TNV ↔ tổ chức ↔ điều phối); nhật ký hệ thống ghi thao tác của tổ chức và quản trị viên.
- **Trạng thái:** đang tải (skeleton), rỗng, lỗi + Thử lại (bật *Mô phỏng lỗi mạng* trong Cài đặt), thành công (toast), vô hiệu hóa, chờ duyệt, bị từ chối, hoàn thành, đã hủy/lưu trữ.
- **AI (mô phỏng bằng luật, có giải thích):** Nhập → kiểm tra → đang xử lý → kết quả + độ tin cậy → "Vì sao?" → Chấp nhận/Sửa/Từ chối/Tạo lại/Lưu. Trạng thái thất bại: *không đủ dữ liệu*, *chưa chắc chắn*, *lỗi xử lý* (bật *Mô phỏng AI thất bại*) với Thử lại/Dùng thủ công/Bỏ qua/Báo cáo. Riêng `admin-ai-matching` dùng luồng AI riêng (danh sách ứng viên mẫu + "Vì sao?"), chưa nối vào `VL.ai.flow` nên không có các nút Chấp nhận/Sửa/Từ chối/Tạo lại/Lưu và không theo cờ *Mô phỏng AI thất bại*.
- **Responsive + a11y:** sidebar → ngăn kéo trên tablet/mobile, bảng → thẻ trên mobile, liên kết bỏ qua điều hướng, `aria-live`, `<dialog>`, focus rõ, chế độ sáng/tối, tôn trọng `prefers-reduced-motion`.

## Việc nhóm vẫn phải tự hoàn thành (không thể thay bằng mã)
Figma/Canva, bảng Trello/Jira/Notion, lịch sử Git (nhánh + PR + commit đúng mẫu), video OBS cho từng màn hình, điền `docs/ai-usage-report.md` và `docs/team-assignment.md` bằng thông tin thật của nhóm.
