/* =====================================================
   coordinator-shortage.js – CẢNH BÁO THIẾU CA (AI-2 "Shift Shortage Predictor")
   - buildPrediction : tạo kết quả dự báo (dựa trên VL.ai.predictShortage)
   - VL.ai.flow      : khối AI dùng chung (Chấp nhận / Sửa / Từ chối / Tạo lại / Lưu)
   - "Sửa"           : hộp thoại chỉnh phạm vi / ngưỡng rồi tính lại
   - Báo cáo đã lưu  : lưu trong localStorage của trình duyệt (tối đa 10 báo cáo)
   Trang: pages/coordinator-shortage.html
   ===================================================== */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, field, bar } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store,
    Q = VL.q;

  const HISTORY_KEY = 'vl_saved_shortage';

  // Ngưỡng hợp lệ: số nguyên từ 10 đến 90
  const validThreshold = (v) => v !== '' && Number.isInteger(+v) && +v >= 10 && +v <= 90;

  // Đọc danh sách báo cáo đã lưu (hỏng thì coi như rỗng)
  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  };
  const setHistory = (list) => localStorage.setItem(HISTORY_KEY, JSON.stringify(list));

  VL.pages['coordinator-shortage'] = function() {
    const form = document.getElementById('param-form'),
      errEl = document.getElementById('param-err'),
      historyEl = document.getElementById('history');

    // Tạo kết quả dự báo. Mỗi lần "Tạo lại" lẻ sẽ hạ ngưỡng 10% để thấy thêm ca
    function buildPrediction(days, thr, attempt) {
      const effective = Math.max(10, thr - (attempt % 2) * 10),
        r = VL.ai.predictShortage(days, effective);

      if (!r.total) {
        return {
          status: 'insufficient',
          message: 'Không đủ dữ liệu để đưa ra đề xuất: không có ca nào đang mở trong ' + days + ' ngày tới.'
        };
      }

      const confidence = r.confidence - (days > 14 ? 0.3 : 0);   // dự báo xa thì kém chính xác

      return {
        status: confidence < 0.6 ? 'uncertain' : 'ok',
        confidence,
        message: 'Dự báo xa thường kém chính xác.',
        input: { days, thr },
        attempt,
        data: {
          items: r.items,
          sel: r.items.filter((x) => x.level === 'high').map((x) => x.shift.id),   // ca được tick sẵn
          total: r.total
        },
        why: [{
          tone: 'ok',
          label: 'Phạm vi',
          detail: 'Quét ' + r.total + ' ca mở trong ' + days + ' ngày tới, ngưỡng cảnh báo ' + effective + '%.'
        }].concat(
          r.items.length
            ? r.items[0].why.map((w) => Object.assign({}, w, { label: w.label + ' (ca rủi ro nhất)' }))
            : [{ tone: 'ok', label: 'Kết luận', detail: 'Mọi ca đều có tỉ lệ lấp đầy dự kiến trên ngưỡng.' }]
        )
      };
    }

    /* ---------- Khối AI ---------- */
    const flow = VL.ai.flow(document.getElementById('ai-root'), {
      id: 'AI-2',
      title: 'Shift Shortage Predictor',
      idle: 'Chọn phạm vi và ngưỡng rồi bấm "Dự báo thiếu hụt".',
      steps: [
        'Đang đọc đăng ký các ca…',
        'Đang ước tính vắng mặt từ lịch sử…',
        'Đang tính nguy cơ thiếu người…'
      ],

      // Lấy tham số từ form rồi dự báo
      run: (attempt) => buildPrediction(+form.elements.days.value, +form.elements.thr.value, attempt),
      manual: () => { location.href = VL.path.page('coordinator-matching'); },

      // Mỗi ca nguy cơ là một dòng có ô tick
      renderResult: (res) => !res.data.items.length
        ? h(
          'div',
          { class: 'state' },
          h('div', { class: 'state-i', 'aria-hidden': 'true' }, '✅'),
          h('h3', null, 'Không có ca nào có nguy cơ thiếu người'),
          h('p', { class: 'mut' }, 'Đã quét ' + res.data.total + ' ca.')
        )
        : h('div', null, res.data.items.map((x) => {
          const high = x.level === 'high';
          return h(
            'label',
            { class: 'cand' + (res.data.sel.includes(x.shift.id) ? ' sel' : '') },
            h('input', {
              type: 'checkbox',
              checked: res.data.sel.includes(x.shift.id),
              onchange: (e) => {
                const i = res.data.sel.indexOf(x.shift.id);
                if (e.target.checked && i < 0) res.data.sel.push(x.shift.id);
                if (!e.target.checked && i >= 0) res.data.sel.splice(i, 1);
                e.target.closest('.cand').classList.toggle('sel', e.target.checked);
              }
            }),
            h(
              'div',
              { style: 'flex:1' },
              h('b', null, x.opp.title),
              h('div', { class: 'mut' }, Q.fmtShift(x.shift) + ' · dự kiến ' + x.expected + '/' + x.shift.capacity + ' người'),
              bar(x.risk, high ? 'bad' : 'warn')
            ),
            h(
              'div',
              { style: 'text-align:right' },
              h('span', { class: 'badge ' + (high ? 'bad' : 'warn') }, (high ? 'Cao ' : 'Vừa ') + x.risk + '%'),
              h(
                'div',
                null,
                h(
                  'a',
                  { class: 'btn sm', href: VL.path.page('coordinator-matching') + '?shift=' + x.shift.id },
                  'Xếp người'
                )
              )
            )
          );
        })),

      // Chấp nhận: đánh dấu các ca được chọn là đã cảnh báo và báo cho tổ chức
      accept(res) {
        const picked = res.data.items.filter((x) => res.data.sel.includes(x.shift.id));
        if (!picked.length) throw new Error('Hãy chọn ít nhất một ca để gửi cảnh báo.');

        picked.forEach((x) => {
          S.update('shifts', x.shift.id, { flagged: true });
          S.notify(
            S.userOfOrg(x.opp.orgId),
            'Cảnh báo AI: ca "' + x.opp.title + '" ngày ' + U.fmtDate(x.shift.date) +
              ' có nguy cơ thiếu người (' + x.risk + '%).',
            'organization-shift-management'
          );
        });
        S.audit('Gửi cảnh báo thiếu ca', picked.length + ' ca');
      },
      acceptMsg: 'Đã gửi cảnh báo tới các tổ chức liên quan.',
      acceptedText: 'Đã gửi cảnh báo cho các ca được chọn.',

      // Lưu: thêm vào danh sách "Báo cáo đã lưu"
      save(res) {
        const list = getHistory();
        list.unshift({
          at: new Date().toISOString(),
          days: res.input.days,
          thr: res.input.thr,
          count: res.data.items.length,
          high: res.data.items.filter((x) => x.level === 'high').length
        });
        setHistory(list.slice(0, 10));
        renderHistory();
      },
      saveMsg: 'Đã lưu báo cáo dự báo.',

      // Sửa: hộp thoại chỉnh tham số rồi tính lại
      edit: (res) => new Promise((resolve) => {
        const body = h(
          'div',
          null,
          field(
            'Phạm vi (ngày)',
            h(
              'select',
              { name: 'days' },
              [7, 14, 30].map((d) => h('option', { value: d, selected: d === res.input.days }, d + ' ngày tới'))
            )
          ),
          field(
            'Ngưỡng cảnh báo (%)',
            h('input', { type: 'number', name: 'thr', min: 10, max: 90, value: res.input.thr })
          )
        );

        VL.ui.modal({
          title: 'Điều chỉnh tham số dự báo',
          body,
          submitLabel: 'Tính lại',
          onSubmit: (fm) => {
            if (!validThreshold(fm.elements.thr.value)) {
              V.setError(fm.elements.thr, 'Ngưỡng từ 10 đến 90.');
              return false;
            }
            V.setError(fm.elements.thr, '');
            return { days: +fm.elements.days.value, thr: +fm.elements.thr.value };
          }
        }).then((x) => {
          if (x) {   // cập nhật luôn form chính cho khớp
            form.elements.days.value = x.days;
            form.elements.thr.value = x.thr;
          }
          resolve(x ? buildPrediction(x.days, x.thr, res.attempt) : null);
        });
      })
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validThreshold(form.elements.thr.value)) {
        errEl.textContent = 'Ngưỡng cảnh báo phải từ 10 đến 90.';
        form.elements.thr.setAttribute('aria-invalid', 'true');
        return;
      }

      errEl.textContent = '';
      form.elements.thr.removeAttribute('aria-invalid');
      flow.start();
    });

    /* ---------- Báo cáo đã lưu ---------- */
    function renderHistory() {
      const list = getHistory();
      historyEl.innerHTML = '';

      if (!list.length) {
        return historyEl.append(h('p', { class: 'mut' }, 'Chưa có báo cáo nào được lưu.'));
      }

      historyEl.append(h('div', { class: 'list' }, list.map((x, i) => h(
        'div',
        { class: 'item row between' },
        h(
          'span',
          null,
          U.fmtDateTime(x.at) + ' · ' + x.days + ' ngày · ngưỡng ' + x.thr + '% → ' +
            x.count + ' ca nguy cơ (' + x.high + ' cao)'
        ),
        h('button', {
          type: 'button',
          class: 'btn sm lnk-bad',
          onclick: () => {
            const cur = getHistory();
            cur.splice(i, 1);
            setHistory(cur);
            renderHistory();
            VL.ui.toast('Đã xóa báo cáo.');
          }
        }, 'Xóa')
      ))));
    }

    renderHistory();
  };
})();
