/* =====================================================
   saved.js – DANH SÁCH "TÓM TẮT ĐÃ LƯU" VÀ CÁC MODAL
   - renderSaved       : vẽ danh sách
   - Nút Sửa / Gửi tổ chức / Lưu trữ / Xóa của từng bản
   - Modal sửa nội dung (dùng cho cả bản AI và bản đã lưu)
   - Modal xác nhận xóa
   ===================================================== */

const savedEl     = document.getElementById('saved');
const textDlg     = document.getElementById('text-dialog');
const textForm    = document.getElementById('text-form');
const textArea    = document.getElementById('text-area');
const textErr     = document.getElementById('text-err');
const confirmDlg  = document.getElementById('confirm-dialog');

let textTarget = null;     // đang sửa gì: { mode: 'ai' | 'saved', ... }
let deleteId = '';         // id bản đang chờ xác nhận xóa

// Nội dung hợp lệ: từ 30 đến 800 ký tự
const validText = (t) => t.length >= 30 && t.length <= 800;

/* ---------- Danh sách ---------- */
function renderSaved() {
  if (!summaries.length) {
    showEmpty(savedEl, '🌱', 'Chưa có tóm tắt nào được lưu');
    return;
  }
  const rows = summaries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  savedEl.innerHTML = '<div class="list">' + rows.map((r) => {
    const opp = findOpp(r.oppId) || { title: '(đã xóa)' };
    return '<article class="item">' +
      '<div class="row between"><b>' + opp.title + '</b>' + statusBadge(r.status) + '</div>' +
      '<p class="saved-text">' + esc(r.text) + '</p>' +
      '<div class="acts">' +
        '<button type="button" class="btn sm" data-action="edit" data-id="' + r.id + '">Sửa</button>' +
        '<button type="button" class="btn sm" data-action="send" data-id="' + r.id + '">Gửi tổ chức</button>' +
        (r.status !== 'rejected'
          ? '<button type="button" class="btn sm" data-action="archive" data-id="' + r.id + '">Lưu trữ</button>' : '') +
        '<button type="button" class="btn sm lnk-bad" data-action="delete" data-id="' + r.id + '">Xóa</button>' +
      '</div>' +
    '</article>';
  }).join('') + '</div>';
}

// Các nút trên từng bản (một chỗ lắng nghe cho tất cả nút)
savedEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const rec = summaries.find((r) => r.id === btn.dataset.id);

  if (btn.dataset.action === 'edit') {
    openTextDialog({ mode: 'saved', title: 'Sửa tóm tắt đã lưu', text: rec.text, rec: rec });
  }
  if (btn.dataset.action === 'send') {
    showToast('Đã gửi cho tổ chức.');
  }
  if (btn.dataset.action === 'archive') {
    rec.status = 'archived';
    saveSummaries();
    renderSaved();
  }
  if (btn.dataset.action === 'delete') {
    deleteId = rec.id;
    confirmDlg.showModal();
  }
});

/* ---------- Modal sửa nội dung ---------- */
bindDialogClose(textDlg);

function openTextDialog(target) {
  textTarget = target;
  document.getElementById('text-title').textContent = target.title;
  textArea.value = target.text;
  textErr.textContent = '';
  textArea.removeAttribute('aria-invalid');
  textDlg.showModal();
}

// Kiểm tra độ dài trước khi đóng
textForm.addEventListener('submit', (e) => {
  if (!validText(textArea.value.trim())) {
    e.preventDefault();                                  // giữ modal mở
    textErr.textContent = 'Nội dung cần từ 30 đến 800 ký tự.';
    textArea.setAttribute('aria-invalid', 'true');
  }
});

// Đóng bằng "Lưu" -> áp dụng nội dung mới
textDlg.addEventListener('close', () => {
  if (textDlg.returnValue !== 'ok') return;
  textDlg.returnValue = '';
  const text = textArea.value.trim();

  if (textTarget.mode === 'ai') {
    // Sửa kết quả AI: hiện lại kết quả với nội dung mới + ghi chú "đã chỉnh sửa"
    flow.show(Object.assign({}, textTarget.res, {
      text: text,
      why: textTarget.res.why.concat([{ tone: 'warn', label: 'Đã chỉnh sửa', detail: 'Nội dung đã được bạn chỉnh tay.' }])
    }));
  } else {
    // Sửa bản đã lưu
    textTarget.rec.text = text;
    saveSummaries();
    showToast('Đã cập nhật.');
    renderSaved();
  }
});

/* ---------- Modal xác nhận xóa ---------- */
confirmDlg.addEventListener('close', () => {
  if (confirmDlg.returnValue === 'ok' && deleteId) {
    summaries = summaries.filter((r) => r.id !== deleteId);
    saveSummaries();
    showToast('Đã xóa.');
    renderSaved();
  }
  deleteId = '';
  confirmDlg.returnValue = '';
});
