/* =====================================================
   history.js – DANH SÁCH "BÁO CÁO ĐÃ LƯU"
   Lưu trong localStorage của trình duyệt (tối đa 10 báo cáo).
   ===================================================== */

const HISTORY_KEY = 'vl_saved_shortage';
const historyEl = document.getElementById('history');

const getHistory = () => loadList(HISTORY_KEY, []);

// Thêm một báo cáo mới lên đầu danh sách
function addHistory(res) {
  const list = getHistory();
  list.unshift({
    at: new Date().toISOString(),
    days: res.input.days,
    thr: res.input.thr,
    count: res.items.length,
    high: res.items.filter((x) => x.level === 'high').length
  });
  saveList(HISTORY_KEY, list.slice(0, 10));
  renderHistory();
}

function renderHistory() {
  const list = getHistory();
  if (!list.length) {
    historyEl.innerHTML = '<p class="mut">Chưa có báo cáo nào được lưu.</p>';
    return;
  }
  historyEl.innerHTML = '<div class="list">' + list.map((x, i) =>
    '<div class="item row between">' +
      '<span>' + fmtDateTime(x.at) + ' · ' + x.days + ' ngày · ngưỡng ' + x.thr + '% → ' +
        x.count + ' ca nguy cơ (' + x.high + ' cao)</span>' +
      '<button type="button" class="btn sm lnk-bad" data-index="' + i + '">Xóa</button>' +
    '</div>'
  ).join('') + '</div>';
}

// Bấm "Xóa" ở một dòng
historyEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-index]');
  if (!btn) return;
  const list = getHistory();
  list.splice(+btn.dataset.index, 1);
  saveList(HISTORY_KEY, list);
  renderHistory();
  showToast('Đã xóa báo cáo.');
});
