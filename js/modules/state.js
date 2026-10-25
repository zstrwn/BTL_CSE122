/* =====================================================
   state.js – TRẠNG THÁI CỦA TRANG
   Mọi file đọc/ghi trạng thái qua đối tượng `state` này.
   ===================================================== */

const state = {
  // id của ca đang chọn ở cột trái; có thể truyền sẵn qua địa chỉ ?shift=sh1 (từ trang Bảng điều khiển / Cảnh báo)
  selectedShiftId: new URLSearchParams(location.search).get('shift') || '',
  ai: {
    result: null,        // kết quả AI hiện tại (null = chưa có)
    attempt: 0,          // số lần "Tạo lại" (chọn bộ trọng số)
    token: 0             // đổi mỗi lần chạy mới để huỷ lượt chạy cũ
  }
};
