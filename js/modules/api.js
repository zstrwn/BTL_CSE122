/* API giả lập: bọc thao tác dữ liệu trong Promise có độ trễ và lỗi mô phỏng
   (bật trong Cài đặt hoặc thêm ?error=1 vào URL) để minh họa trạng thái đang tải / lỗi.*/
window.VL = window.VL || {};

VL.api = (function() {
  const simError = () =>
    localStorage.getItem('vl_sim_error') === '1' || VL.util.qs('error') === '1';

  function run(fn, opts) {
    const o = opts || {};
    const delay = o.delay != null ? o.delay : 250 + Math.random() * 300;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (simError() && !o.safe)
          return reject(new Error('Không thể kết nối máy chủ giả lập. Vui lòng thử lại.'));

        try {
          resolve(fn());
        } catch (e) {
          reject(e);
        }
      }, delay);
    });
  }

  return { run, simError };
})();
