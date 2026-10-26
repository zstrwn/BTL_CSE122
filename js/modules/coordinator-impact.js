/* =====================================================
   coordinator-impact.js – TÓM TẮT TÁC ĐỘNG (AI-3 "Impact Summary")
   - stats / write / buildSummary : tổng hợp số liệu và viết tóm tắt
   - persist                      : lưu tóm tắt vào kho dữ liệu (impactSummaries)
   - VL.ai.flow                   : khối AI dùng chung (Chấp nhận / Sửa / Từ chối / Tạo lại / Lưu)
   - "Tóm tắt đã lưu"             : danh sách + Sửa / Gửi tổ chức / Lưu trữ / Xóa
   Trang: pages/coordinator-impact.html
   ===================================================== */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, state, field } = VL.ui,
    V = VL.v,
    S = VL.store;

  const TONES = { 'trang-trong': 'Trang trọng', 'than-thien': 'Thân thiện', 'ngan-gon': 'Ngắn gọn' };

  // Nội dung hợp lệ: từ 30 đến 800 ký tự
  const validText = (t) => t.length >= 30 && t.length <= 800;

  VL.pages['coordinator-impact'] = function() {
    const form = document.getElementById('summary-form'),
      errEl = document.getElementById('form-err'),
      savedEl = document.getElementById('saved');

    // Chỉ cho chọn hoạt động đã được kiểm duyệt (VL.ui.options đọc trường "name" nên đổi từ "title")
    form.elements.opp.append(...VL.ui.options(
      S.all('opportunities').filter((p) => p.moderation === 'approved').map((p) => ({ id: p.id, name: p.title })),
      '',
      '— Chọn hoạt động —'
    ));

    /* ---------- Tổng hợp số liệu & viết tóm tắt ---------- */

    // Thống kê đóng góp của một hoạt động
    function getStats(oppId) {
      const shifts = S.where('shifts', (s) => s.oppId === oppId && s.status !== 'cancelled'),
        ids = shifts.map((s) => s.id),
        regs = S.where('registrations', (r) => ids.includes(r.shiftId)),
        done = regs.filter((r) => r.status === 'completed');

      return {
        shifts: shifts.length,
        doneShifts: shifts.filter((s) => s.status === 'done').length,
        vols: new Set(done.map((r) => r.volunteerId)).size,          // số tình nguyện viên khác nhau
        hours: done.reduce((t, r) => t + (r.hours || 0), 0),          // tổng giờ
        noShow: regs.filter((r) => r.status === 'no_show').length,
        regs: regs.length
      };
    }

    // Viết nội dung tóm tắt theo giọng văn; attempt chẵn/lẻ cho 2 mẫu khác nhau
    function writeSummary(opp, st, tone, attempt) {
      const t = opp.title,
        variant = attempt % 2;

      if (tone === 'ngan-gon') {
        return t + ': ' + st.vols + ' tình nguyện viên, ' + st.hours + ' giờ đóng góp qua ' + st.doneShifts + ' ca.';
      }
      if (tone === 'than-thien') {
        return (variant ? 'Thật tuyệt vời! ' : 'Cảm ơn mọi người! ') + 'Nhờ ' + st.vols +
          ' bạn tình nguyện viên, "' + t + '" đã có ' + st.hours + ' giờ đóng góp qua ' + st.doneShifts +
          ' ca hoạt động. Mỗi giờ các bạn trao đi đều làm cộng đồng ấm áp hơn.';
      }
      return 'Hoạt động "' + t + '" đã hoàn thành ' + st.doneShifts + '/' + st.shifts + ' ca, với sự tham gia của ' +
        st.vols + ' tình nguyện viên, ghi nhận tổng cộng ' + st.hours + ' giờ đóng góp' +
        (variant ? ' và ' + st.noShow + ' trường hợp vắng mặt.' : '.') +
        ' Kết quả cho thấy mức độ cam kết ổn định của cộng đồng.';
    }

    // Tạo kết quả AI cho một hoạt động
    function buildSummary(oppId, tone, attempt) {
      const opp = S.find('opportunities', oppId),
        st = getStats(oppId);

      if (!opp || (!st.doneShifts && !st.vols)) {
        return {
          status: 'insufficient',
          message: 'Không đủ dữ liệu để đưa ra đề xuất: hoạt động này chưa có ca nào hoàn thành.'
        };
      }

      return {
        status: st.hours ? 'ok' : 'uncertain',
        confidence: st.hours ? 0.5 + Math.min(0.4, st.vols * 0.1) : 0.4,
        message: 'Chưa có giờ được ghi nhận.',
        oppId,
        tone,
        attempt,
        stats: st,
        data: { text: writeSummary(opp, st, tone, attempt) },
        why: [
          {
            tone: 'ok',
            label: 'Dữ liệu dùng',
            detail: st.doneShifts + ' ca hoàn thành · ' + st.vols + ' TNV · ' + st.hours + ' giờ · ' +
              st.noShow + ' vắng mặt.'
          },
          {
            tone: st.hours ? 'ok' : 'warn',
            label: 'Số giờ',
            detail: st.hours
              ? 'Tổng giờ lấy từ các đăng ký đã hoàn thành.'
              : 'Chưa có giờ nào được ghi nhận nên số liệu có thể thiếu.'
          },
          { tone: 'ok', label: 'Giọng văn', detail: TONES[tone] + ' (mẫu #' + (attempt % 2 + 1) + ').' }
        ]
      };
    }

    // Lưu (thêm mới hoặc cập nhật) một tóm tắt với trạng thái saved / accepted / rejected
    function persist(res, status) {
      const rec = {
        oppId: res.oppId,
        tone: res.tone,
        text: res.data.text,
        status,
        createdAt: new Date().toISOString()
      };

      if (res.recId) S.update('impactSummaries', res.recId, rec);   // đã lưu trước đó -> cập nhật
      else res.recId = S.add('impactSummaries', rec).id;

      S.audit('Tóm tắt tác động (' + status + ')', (S.find('opportunities', res.oppId) || {}).title);
      renderSaved();
    }

    // Hộp thoại sửa nội dung (dùng cho cả bản AI và bản đã lưu). Trả về nội dung mới hoặc null nếu hủy.
    function editText(title, text, rows) {
      const ta = h('textarea', { name: 'text', rows });
      ta.value = text;

      return VL.ui.modal({
        title,
        body: field('Nội dung (30–800 ký tự)', ta),
        onSubmit: () => {
          const t = ta.value.trim();

          if (!validText(t)) {
            V.setError(ta, 'Nội dung cần từ 30 đến 800 ký tự.');
            return false;
          }
          return t;
        }
      });
    }

    /* ---------- Khối AI ---------- */
    const flow = VL.ai.flow(document.getElementById('ai-root'), {
      id: 'AI-3',
      title: 'Impact Summary',
      idle: 'Chọn hoạt động và giọng văn, sau đó bấm "Tạo tóm tắt".',
      steps: ['Đang tổng hợp số liệu đóng góp…', 'Đang soạn nội dung…', 'Đang kiểm tra số liệu…'],

      run: (attempt) => buildSummary(form.elements.opp.value, form.elements.tone.value, attempt),
      manual: () => savedEl.scrollIntoView({ behavior: 'smooth' }),

      // Nội dung tóm tắt + 3 chip số liệu
      renderResult: (res) => h(
        'div',
        null,
        h(
          'blockquote',
          { style: 'margin:0 0 10px;padding:10px 14px;border-left:4px solid var(--ai);background:var(--ai-t);border-radius:8px' },
          res.data.text
        ),
        h(
          'div',
          { class: 'chips' },
          [res.stats.doneShifts + ' ca', res.stats.vols + ' TNV', res.stats.hours + ' giờ'].map(
            (x) => h('span', { class: 'chip' }, x)
          )
        )
      ),

      // Chấp nhận: lưu và báo cho tổ chức
      accept(res) {
        persist(res, 'accepted');
        const opp = S.find('opportunities', res.oppId) || {};
        S.notify(
          S.userOfOrg(opp.orgId),
          'Điều phối viên đã chốt tóm tắt tác động cho "' + opp.title + '".',
          'organization-opportunity-management'
        );
      },
      acceptMsg: 'Đã chấp nhận và lưu tóm tắt.',
      acceptedText: 'Tóm tắt đã được chấp nhận và lưu vào danh sách bên dưới.',

      reject(res) { if (res.recId) persist(res, 'rejected'); },

      save(res) { persist(res, 'saved'); },
      saveMsg: 'Đã lưu bản nháp tóm tắt.',

      // Sửa: hiện lại kết quả với nội dung mới + ghi chú "đã chỉnh sửa"
      edit: (res) => editText('Sửa tóm tắt', res.data.text, 6).then((t) => (t
        ? Object.assign({}, res, {
          data: { text: t },
          why: res.why.concat([{ tone: 'warn', label: 'Đã chỉnh sửa', detail: 'Nội dung đã được bạn chỉnh tay.' }])
        })
        : null))
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!form.elements.opp.value) {
        errEl.textContent = 'Hãy chọn một hoạt động.';
        return;
      }

      errEl.textContent = '';
      flow.start();
    });

    /* ---------- Danh sách "Tóm tắt đã lưu" ---------- */
    function renderSaved() {
      const rows = S.all('impactSummaries').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (!rows.length) {
        return state(savedEl, 'empty', { icon: '🌱', title: 'Chưa có tóm tắt nào được lưu' });
      }

      savedEl.innerHTML = '';
      savedEl.append(h('div', { class: 'list' }, rows.map((r) => {
        const opp = S.find('opportunities', r.oppId) || { title: '(đã xóa)' };

        return h(
          'article',
          { class: 'item' },
          h('div', { class: 'row between' }, h('b', null, opp.title), badge(r.status)),
          h('p', null, r.text),
          h(
            'div',
            { class: 'acts' },
            h('button', { type: 'button', class: 'btn sm', onclick: () => editSaved(r) }, 'Sửa'),
            h('button', {
              type: 'button',
              class: 'btn sm',
              onclick: () => {
                S.notify(
                  S.userOfOrg(opp.orgId),
                  'Bạn nhận được tóm tắt tác động: ' + r.text.slice(0, 80) + '…',
                  'organization-opportunity-management'
                );
                VL.ui.toast('Đã gửi cho tổ chức.');
              }
            }, 'Gửi tổ chức'),
            r.status !== 'rejected' && r.status !== 'archived'
              ? h('button', {
                type: 'button',
                class: 'btn sm',
                onclick: () => {
                  S.update('impactSummaries', r.id, { status: 'archived' });
                  renderSaved();
                }
              }, 'Lưu trữ')
              : null,
            h('button', { type: 'button', class: 'btn sm lnk-bad', onclick: () => deleteSaved(r) }, 'Xóa')
          )
        );
      })));
    }

    // Sửa một bản đã lưu
    function editSaved(r) {
      editText('Sửa tóm tắt đã lưu', r.text, 5).then((t) => {
        if (!t) return;
        S.update('impactSummaries', r.id, { text: t });
        VL.ui.toast('Đã cập nhật.');
        renderSaved();
      });
    }

    // Xóa một bản đã lưu (có hộp thoại xác nhận)
    async function deleteSaved(r) {
      const ok = await VL.ui.confirm({
        title: 'Xóa tóm tắt?',
        message: 'Tóm tắt này sẽ bị xóa vĩnh viễn.',
        danger: true,
        confirmLabel: 'Xóa'
      });
      if (!ok) return;

      S.remove('impactSummaries', r.id);
      VL.ui.toast('Đã xóa.');
      renderSaved();
    }

    renderSaved();
  };
})();
