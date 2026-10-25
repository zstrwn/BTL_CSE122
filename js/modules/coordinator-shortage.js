/* =====================================================
   shortage.js – LOGIC AI-2 "SHIFT SHORTAGE PREDICTOR"
   - buildPrediction : tạo kết quả dự báo (dựa trên predictShortage ở forecast.js)
   - renderBody      : vẽ danh sách ca có nguy cơ
   - createAIFlow    : ghép tất cả vào khối AI dùng chung (ai-card.js)
   - Modal "Sửa"     : điều chỉnh phạm vi / ngưỡng rồi tính lại
   ===================================================== */

const paramForm = document.getElementById('param-form');
const editDlg   = document.getElementById('edit-dialog');
const editForm  = document.getElementById('edit-form');
const editErr   = document.getElementById('edit-err');

const MATCHING_URL = '../bang-ghep-nguoi/index.html';

// Ngưỡng hợp lệ: số nguyên từ 10 đến 90
const validThreshold = (v) => v !== '' && Number.isInteger(+v) && +v >= 10 && +v <= 90;

// Tạo kết quả dự báo. Mỗi lần "Tạo lại" lẻ sẽ hạ ngưỡng 10% để thấy thêm ca
function buildPrediction(days, thr, attempt) {
  const effective = Math.max(10, thr - (attempt % 2) * 10);
  const r = predictShortage(days, effective);

  if (!r.total) {
    return { status: 'insufficient',
      message: 'Không đủ dữ liệu để đưa ra đề xuất: không có ca nào đang mở trong ' + days + ' ngày tới.' };
  }

  const confidence = r.confidence - (days > 14 ? 0.3 : 0);   // dự báo xa thì kém chính xác
  const why = [{ tone: 'ok', label: 'Phạm vi',
    detail: 'Quét ' + r.total + ' ca mở trong ' + days + ' ngày tới, ngưỡng cảnh báo ' + effective + '%.' }];

  if (r.items.length) {
    r.items[0].why.forEach((w) => why.push(Object.assign({}, w, { label: w.label + ' (ca rủi ro nhất)' })));
  } else {
    why.push({ tone: 'ok', label: 'Kết luận', detail: 'Mọi ca đều có tỉ lệ lấp đầy dự kiến trên ngưỡng.' });
  }

  return {
    status: confidence < 0.6 ? 'uncertain' : 'ok',
    confidence: confidence,
    message: 'Dự báo xa thường kém chính xác.',
    input: { days: days, thr: thr },
    attempt: attempt,
    items: r.items,
    total: r.total,
    selected: r.items.filter((x) => x.level === 'high').map((x) => x.shift.id),  // ca được tick sẵn
    why: why
  };
}

// HTML phần thân kết quả: mỗi ca nguy cơ là một dòng có ô tick
function renderBody(res) {
  if (!res.items.length) {
    return '<div class="state"><div class="state-i" aria-hidden="true">✅</div>' +
      '<h3>Không có ca nào có nguy cơ thiếu người</h3><p class="mut">Đã quét ' + res.total + ' ca.</p></div>';
  }
  return res.items.map((x) => {
    const checked = res.selected.includes(x.shift.id);
    const high = x.level === 'high';
    return '<label class="cand' + (checked ? ' sel' : '') + '">' +
      '<input type="checkbox" data-id="' + x.shift.id + '"' + (checked ? ' checked' : '') + '>' +
      '<div class="info"><b>' + x.opp.title + '</b>' +
        '<div class="mut">' + fmtShift(x.shift) + ' · dự kiến ' + x.expected + '/' + x.shift.capacity + ' người</div>' +
        barHTML(x.risk, high ? 'bad' : 'warn') + '</div>' +
      '<div class="side"><span class="badge ' + (high ? 'bad' : 'warn') + '">' + (high ? 'Cao ' : 'Vừa ') + x.risk + '%</span>' +
        '<div><a class="btn sm" href="' + MATCHING_URL + '?shift=' + x.shift.id + '">Xếp người</a></div></div>' +
    '</label>';
  }).join('');
}

// Ghép vào khối AI dùng chung
let editingResult = null;   // kết quả đang được sửa trong modal

const flow = createAIFlow({
  rootId: 'ai-root',
  title: 'Shift Shortage Predictor',
  idleText: 'Chọn phạm vi và ngưỡng rồi bấm "Dự báo thiếu hụt".',
  steps: ['Đang đọc đăng ký các ca…', 'Đang ước tính vắng mặt từ lịch sử…', 'Đang tính nguy cơ thiếu người…'],

  // Lấy tham số từ form rồi dự báo
  run: (attempt) => buildPrediction(+paramForm.elements.days.value, +paramForm.elements.thr.value, attempt),

  renderBody: renderBody,

  // Tick / bỏ tick một ca
  onToggle: (res, id, checked) => {
    const i = res.selected.indexOf(id);
    if (checked && i < 0) res.selected.push(id);
    if (!checked && i >= 0) res.selected.splice(i, 1);
  },

  // Chấp nhận: đánh dấu các ca được chọn là đã cảnh báo
  accept: (res) => {
    const picked = res.items.filter((x) => res.selected.includes(x.shift.id));
    if (!picked.length) throw new Error('Hãy chọn ít nhất một ca để gửi cảnh báo.');
    picked.forEach((x) => { x.shift.flagged = true; });
  },
  acceptMsg: 'Đã gửi cảnh báo tới các tổ chức liên quan.',
  acceptedText: 'Đã gửi cảnh báo cho các ca được chọn.',

  // Lưu: thêm vào danh sách "Báo cáo đã lưu" (history.js)
  save: (res) => addHistory(res),
  saveMsg: 'Đã lưu báo cáo dự báo.',

  // Sửa: mở modal chỉnh tham số
  edit: (res) => {
    editingResult = res;
    editForm.elements.days.value = res.input.days;
    editForm.elements.thr.value = res.input.thr;
    editErr.textContent = '';
    editDlg.showModal();
  },

  manual: () => { location.href = MATCHING_URL; }
});

/* ---------- Modal "Điều chỉnh tham số" ---------- */
bindDialogClose(editDlg);

// Kiểm tra ngưỡng trước khi đóng modal
editForm.addEventListener('submit', (e) => {
  if (!validThreshold(editForm.elements.thr.value)) {
    e.preventDefault();                          // giữ modal mở
    editErr.textContent = 'Ngưỡng từ 10 đến 90.';
    editForm.elements.thr.setAttribute('aria-invalid', 'true');
  }
});

// Đóng bằng "Tính lại" -> cập nhật form chính và dự báo lại
editDlg.addEventListener('close', () => {
  if (editDlg.returnValue !== 'ok') return;
  editDlg.returnValue = '';
  const days = +editForm.elements.days.value;
  const thr = +editForm.elements.thr.value;
  paramForm.elements.days.value = days;
  paramForm.elements.thr.value = thr;
  flow.show(buildPrediction(days, thr, editingResult.attempt));
});
