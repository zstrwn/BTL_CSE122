/* =====================================================
   ai-card.js – KHỐI AI DÙNG CHUNG
   Luồng: chờ → đang xử lý → kết quả (+ "Vì sao?") hoặc "không đủ dữ liệu".
   Các nút: Chấp nhận / Sửa / Từ chối / Tạo lại / Lưu / Dùng thủ công / Báo cáo.

   Mỗi trang chỉ cần gọi createAIFlow({...}) và truyền vào:
     rootId, title, idleText, steps      – chữ hiển thị
     run(attempt)                        – tạo kết quả (trả về đối tượng res)
     renderBody(res)                     – HTML phần thân kết quả
     accept / reject / save / edit / manual / onToggle – việc cần làm của trang
   ===================================================== */

function createAIFlow(cfg) {
  const root = document.getElementById(cfg.rootId);
  const flow = { attempt: 0, token: 0, result: null };
  const steps = cfg.steps || ['Đang đọc dữ liệu…', 'Đang phân tích…', 'Đang tổng hợp kết quả…'];

  // 1. Trạng thái chờ
  function showIdle() {
    flow.token++;            // huỷ lượt chạy đang dở (nếu có)
    flow.result = null;
    root.innerHTML = '<div class="ai-idle mut">' + cfg.idleText + '</div>';
  }

  // Dòng thông báo màu ở đầu thẻ
  function banner(kind, text) {
    const card = root.querySelector('.ai-card');
    const old = card.querySelector('.ai-banner');
    if (old) old.remove();
    card.insertAdjacentHTML('afterbegin', '<div class="ai-banner ' + kind + '" role="status">' + text + '</div>');
  }

  // Khoá các nút quyết định sau khi chấp nhận / từ chối
  function lock() {
    root.querySelectorAll('[data-ai=accept],[data-ai=reject],[data-ai=edit]').forEach((b) => { b.disabled = true; });
  }

  // 2. Không đủ dữ liệu (hoặc AI gặp lỗi khi isError = true)
  function showFail(message, isError) {
    flow.result = null;
    root.innerHTML =
      '<div class="ai-card insufficient" role="alert">' +
        '<div class="ai-h">' + (isError ? '<span class="badge bad">AI gặp lỗi</span>'
                                       : '<span class="badge warn">Không đủ dữ liệu</span>') + '</div>' +
        '<p>' + message + '</p>' +
        '<div class="ai-actions">' +
          '<button type="button" class="btn primary" data-ai="retry">Thử lại</button>' +
          (cfg.manual ? '<button type="button" class="btn" data-ai="manual">Dùng thủ công</button>' : '') +
          '<button type="button" class="btn" data-ai="skip">Bỏ qua</button>' +
          '<button type="button" class="btn" data-ai="report">Báo cáo</button>' +
        '</div>' +
      '</div>';
  }

  // 3. Kết quả
  function showResult(res) {
    flow.result = res;
    const low = res.status === 'uncertain';
    const conf = Math.round((res.confidence || 0) * 100);
    const why = (res.why || []).map((w) => '<li class="' + w.tone + '"><b>' + w.label + ': </b>' + w.detail + '</li>').join('');

    root.innerHTML =
      '<div class="ai-card' + (low ? ' uncertain' : '') + '">' +
        (low ? '<div class="ai-banner warn" role="status">AI chưa chắc chắn về kết quả này (độ tin cậy ' + conf + '%). ' +
          (res.message || 'Hãy kiểm tra kỹ hoặc chỉnh sửa.') + '</div>' : '') +
        '<div class="ai-h"><span class="badge ai">✨ ' + cfg.title + '</span>' +
          '<span class="conf">Độ tin cậy ' + conf + '%</span>' + barHTML(conf, low ? 'warn' : '') + '</div>' +
        '<div class="ai-body">' + cfg.renderBody(res) + '</div>' +
        '<details class="why" open><summary>Vì sao có kết quả này?</summary><ul>' + why + '</ul></details>' +
        '<div class="ai-actions">' +
          '<button type="button" class="btn primary" data-ai="accept">✔ Chấp nhận</button>' +
          '<button type="button" class="btn" data-ai="edit">✎ Sửa</button>' +
          '<button type="button" class="btn ghost" data-ai="reject">✖ Từ chối</button>' +
          '<button type="button" class="btn" data-ai="regen">↻ Tạo lại</button>' +
          '<button type="button" class="btn" data-ai="save">💾 Lưu</button>' +
          (low && cfg.manual ? '<button type="button" class="btn" data-ai="manual">Dùng thủ công</button>' : '') +
          (low ? '<button type="button" class="btn" data-ai="report">Báo cáo</button>' : '') +
        '</div>' +
      '</div>';
  }

  // Hiện kết quả hoặc lỗi tuỳ trạng thái
  function present(res) {
    if (res.status === 'insufficient') showFail(res.message);
    else showResult(res);
  }

  // Chạy AI: đang xử lý (3 bước) → tính kết quả
  async function start(again) {
    if (!again) flow.attempt = 0;
    const myToken = ++flow.token;

    root.innerHTML =
      '<div class="ai-card" role="status" aria-label="AI đang xử lý">' +
        '<div class="ai-h"><span class="badge ai">✨ AI đang xử lý</span></div>' +
        '<div class="bar"><span id="ai-progress" style="width:5%"></span></div>' +
        '<p class="mut" id="ai-step">' + steps[0] + '</p>' +
        '<div class="skeleton"></div>' +
      '</div>';

    for (let i = 0; i < steps.length; i++) {
      if (myToken !== flow.token) return;      // người dùng đã bấm lại / bỏ qua
      document.getElementById('ai-step').textContent = steps[i];
      document.getElementById('ai-progress').style.width = Math.round((i + 1) / steps.length * 100) + '%';
      await wait(450);
    }
    if (myToken !== flow.token) return;

    // Cài đặt đang bật "Mô phỏng AI thất bại" -> báo lỗi để thử nút Thử lại / Dùng thủ công / Báo cáo
    if (isSimulated('vl_sim_ai_fail')) {
      return showFail('AI không phản hồi (đang bật mô phỏng lỗi AI trong Cài đặt). Hãy thử lại hoặc dùng thủ công.', true);
    }
    present(cfg.run(flow.attempt));
  }

  // Xử lý các nút trong thẻ AI (một chỗ lắng nghe cho tất cả nút)
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-ai]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.ai;
    const res = flow.result;

    if (action === 'accept') {
      try {
        cfg.accept(res);
      } catch (err) {
        return showToast(err.message, 'bad');
      }
      showToast(cfg.acceptMsg || 'Đã chấp nhận.');
      banner('ok', '✔ ' + (cfg.acceptedText || 'Bạn đã chấp nhận kết quả AI.'));
      lock();
    }
    if (action === 'reject') {
      if (cfg.reject) cfg.reject(res);
      showToast('Đã từ chối. AI sẽ không áp dụng kết quả này.');
      banner('bad', 'Bạn đã từ chối kết quả. Có thể tạo lại hoặc dùng thủ công.');
      lock();
    }
    if (action === 'save') {
      if (cfg.save) cfg.save(res);
      showToast(cfg.saveMsg || 'Đã lưu kết quả.');
      banner('info', '💾 Đã lưu kết quả.');
    }
    if (action === 'edit')   cfg.edit(res);
    if (action === 'regen')  { flow.attempt++; start(true); }
    if (action === 'retry')  start(true);
    if (action === 'skip')   showIdle();
    if (action === 'manual') cfg.manual();
    if (action === 'report') showToast('Đã gửi báo cáo cho quản trị viên.');
  });

  // Tick / bỏ tick một mục trong kết quả (nếu trang có danh sách chọn)
  root.addEventListener('change', (e) => {
    if (!e.target.matches('input[type=checkbox]') || !flow.result) return;
    if (cfg.onToggle) cfg.onToggle(flow.result, e.target.dataset.id, e.target.checked);
    e.target.closest('.cand').classList.toggle('sel', e.target.checked);
  });

  showIdle();
  return { start: () => start(false), reset: showIdle, show: present };
}
