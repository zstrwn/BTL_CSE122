# VolunteerLink – Khai báo sử dụng AI

| Mục | Nội dung |
|---|---|
| Công cụ AI đã dùng | Claude (Anthropic) để dựng khung mã nguồn ban đầu |
| Prompt chính | Chuyển bản mẫu `index.html` 4 vai trò cũ thành sản phẩm đa trang theo đề BTL-24 |
| Phần AI sinh ra | Cấu trúc thư mục, mô-đun JS, CSS, HTML các màn hình, dữ liệu mẫu |
| Phần sinh viên chỉnh sửa | Chưa bổ sung |
| Lỗi AI gặp phải | Sự kiện `change` vẽ lại danh sách khiến nút vừa bấm bị mất; `V.validate` chỉ kiểm tra các trường có trong `rules` nên bỏ sót trường không có luật; thiếu `auth.js` thì `main.js` bỏ qua guard vai trò và không dựng sidebar; `docs/screen-list.md` dẫn tên tệp màn hình điều phối viên của bản cũ |
| Cách kiểm chứng | Chạy từng màn hình, thử dữ liệu rỗng/sai, bật mô phỏng lỗi, thử mobile |
| Điều học được | Chưa bổ sung |

## Tính năng mock vs API thật

| Tính năng | Loại |
|---|---|
| AI-1 Volunteer Matcher | **Mock** – luật có trọng số (kỹ năng, lịch rảnh, kinh nghiệm) trong `js/modules/ai.js` |
| AI-2 Shift Shortage Predictor | **Mock** – ước tính lấp đầy, vắng mặt lịch sử, nguồn lực (`js/modules/ai.js:101-130`) |
| AI-3 Impact Summary | **Mock** – mẫu câu theo giọng văn + số liệu thật từ dữ liệu |
| Trang `pages/admin-ai-matching.html` | **Mock trình diễn** – danh sách ứng viên khai báo cứng trong `js/modules/admin-ai-matching.js:9-15`, không đọc `VL.store` |
| Dữ liệu | LocalStorage, không gọi API ngoài |

## Ghi chú kỹ thuật

`js/modules/render.js`, `state.js`, `saved.js`, `history.js`, `data.js` là các tệp còn lại của bản mẫu một trang, không được trang HTML nào nạp. Thuật toán đang chạy nằm trong `js/modules/ai.js`.
