# Khai báo sử dụng AI

| Mục | Nội dung (nhóm điền) |
|---|---|
| Công cụ AI đã dùng | Claude (Anthropic) để dựng khung mã nguồn ban đầu; … |
| Prompt chính | Chuyển bản mẫu `index.html` 4 vai trò cũ thành sản phẩm đa trang theo BTL-24 … |
| Phần AI sinh ra | Cấu trúc thư mục, mô-đun JS, CSS, HTML các màn hình, dữ liệu mẫu |
| Phần sinh viên chỉnh sửa | … (phải điền: bạn đã sửa/viết lại gì) |
| Lỗi AI gặp phải | … (ví dụ: sự kiện `change` làm vẽ lại danh sách khiến nút bấm mất; hàm validate bỏ sót trường không có luật) |
| Cách kiểm chứng | Chạy từng màn hình, thử dữ liệu rỗng/sai, bật mô phỏng lỗi, thử mobile |
| Điều học được | … |

## Tính năng mock vs API thật
| Tính năng | Loại |
|---|---|
| AI-1 Volunteer Matcher | **Mock** – luật có trọng số (kỹ năng, lịch rảnh, kinh nghiệm) trong `js/modules/ai.js` |
| AI-2 Shift Shortage Predictor | **Mock** – ước tính lấp đầy, vắng mặt lịch sử, nguồn lực |
| AI-3 Impact Summary | **Mock** – mẫu câu theo giọng văn + số liệu thật từ dữ liệu |
| Dữ liệu | LocalStorage, không gọi API ngoài |
