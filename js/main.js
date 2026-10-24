/* Điểm khởi động: bảo vệ trang theo vai trò -> dựng khung -> chạy mô-đun của trang hiện tại */
(function() {
  if (!window.VL || !VL.auth) return; // trang tĩnh (index, 403, 404)

  const page = document.body.dataset.page,
    role = document.body.dataset.role;

  if (role) {
    const s = VL.auth.guard(role);
    if (!s) return;
    VL.session = s;
    VL.layout.render(s);
  }

  const init = VL.pages && VL.pages[page];
  if (init) init(VL.session);
})();
