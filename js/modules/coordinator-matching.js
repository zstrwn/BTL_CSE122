/* =====================================================
   coordinator-matching.js – BẢNG GHÉP NGƯỜI (AI-1)
   Cột trái: danh sách ca còn thiếu người.
   Cột phải: người đã xếp + ứng viên đề xuất (kèm điểm phù hợp).
   Nút "Nhờ AI gợi ý đội hình": AI chọn sẵn tối đa 5 người, điều phối viên tick/sửa trọng số rồi chấp nhận.
   Trang: pages/coordinator-matching.html
   ===================================================== */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, state, field, bar } = VL.ui,
    U = VL.util,
    S = VL.store,
    Q = VL.q;

  // Các ca đang mở trong khoảng từ hôm nay đến hôm nay + days ngày (kèm hoạt động, số người đã đủ)
  const upcoming = (days) => S.where('shifts', (s) =>
    s.status === 'open' && s.date >= U.today() && s.date <= U.addDays(days)
  ).map(Q.shiftView);

  // Đăng ký còn hiệu lực (chờ duyệt hoặc đã xác nhận) của một ca
  const activeRegs = (shiftId) => S.where('registrations', (r) =>
    r.shiftId === shiftId && ['pending', 'confirmed'].includes(r.status)
  );

  // Ba bộ trọng số xoay vòng mỗi lần "Tạo lại": kỹ năng / lịch rảnh / kinh nghiệm
  const WEIGHTS = [
    { skill: 0.6, time: 0.3, exp: 0.1 },
    { skill: 0.3, time: 0.6, exp: 0.1 },
    { skill: 0.8, time: 0.1, exp: 0.1 }
  ];

  VL.pages['coordinator-matching'] = function() {
    const form = document.getElementById('filter-form'),
      shiftListEl = document.getElementById('shift-list'),
      detailEl = document.getElementById('detail'),
      aiRoot = document.getElementById('ai-root');

    // id của ca đang chọn; có thể truyền sẵn qua địa chỉ ?shift=sh1 (từ Bảng điều khiển / Cảnh báo)
    let selectedShiftId = U.qs('shift') || '',
      flow = null;

    /* ---------- Xếp người vào ca ---------- */

    // Xếp một tình nguyện viên vào ca (xác nhận luôn). Báo lỗi bằng throw để nơi gọi bắt.
    function assign(vol, shift) {
      if (S.filled(shift.id) >= shift.capacity) throw new Error('Ca đã đủ người.');
      if (activeRegs(shift.id).some((r) => r.volunteerId === vol.id)) {
        throw new Error(vol.name + ' đã có trong ca.');
      }
      if (VL.ai.conflicts(vol, shift)) throw new Error(vol.name + ' bị trùng giờ với ca khác.');

      S.add('registrations', {
        shiftId: shift.id,
        volunteerId: vol.id,
        status: 'confirmed',
        hours: 0,
        note: 'Điều phối viên xếp',
        createdAt: new Date().toISOString()
      });
      Q.syncShift(shift.id);
      S.notify(
        S.userOfVolunteer(vol.id),
        'Bạn được điều phối viên xếp vào ca "' +
          (S.find('opportunities', shift.oppId) || {}).title + '" ngày ' + U.fmtDate(shift.date) + '.',
        'volunteer-my-shifts'
      );
    }

    // Chạy một thao tác (có độ trễ giả lập), báo kết quả rồi tải lại danh sách
    async function act(fn, msg) {
      try {
        await VL.api.run(fn);
        VL.ui.toast(msg);
        loadShifts();
      } catch (e) {
        VL.ui.toast(e.message, 'bad');
      }
    }

    /* ---------- Cột trái: danh sách ca ---------- */

    // Các ca còn thiếu người trong 60 ngày tới, đã lọc theo ô tìm kiếm, ca thiếu nhiều nhất lên đầu
    function loadShifts() {
      state(shiftListEl, 'loading');

      VL.api.run(() => upcoming(60)
        .filter((s) => s.filled < s.capacity)
        .sort((a, b) => (a.filled / a.capacity) - (b.filled / b.capacity)))
        .then((list) => {
          const keyword = U.norm(form.elements.q.value),
            shown = list.filter((s) => !keyword || U.norm(s.opp.title).includes(keyword));

          if (!shown.length) {
            selectedShiftId = '';
            detailEl.innerHTML = '';
            return keyword
              ? state(shiftListEl, 'empty', {
                icon: '🔍', title: 'Không tìm thấy ca phù hợp', message: 'Thử từ khóa khác.'
              })
              : state(shiftListEl, 'empty', {
                icon: '✅', title: 'Mọi ca đã đủ người', message: 'Không còn ca nào cần ghép.'
              });
          }

          // Nếu ca đang chọn không còn trong danh sách thì chọn ca đầu tiên
          if (!shown.some((s) => s.id === selectedShiftId)) selectedShiftId = shown[0].id;

          shiftListEl.innerHTML = '';
          shiftListEl.append(h('div', { class: 'list' }, shown.map((s) => {
            const selected = s.id === selectedShiftId;
            return h(
              'button',
              {
                type: 'button',
                class: 'item' + (selected ? ' sel' : ''),
                style: 'text-align:left;cursor:pointer;' +
                  (selected ? 'border-color:var(--pri);background:var(--pri-t)' : ''),
                'aria-pressed': selected,
                onclick: () => {
                  selectedShiftId = s.id;
                  if (flow) flow.reset();
                  loadShifts();
                }
              },
              h('b', null, s.opp.title),
              h('div', { class: 'mut' }, Q.fmtShift(s)),
              h(
                'div',
                { class: 'row' },
                bar(Math.round(s.filled / s.capacity * 100)),
                h('small', null, 'thiếu ' + (s.capacity - s.filled))
              )
            );
          })));

          loadDetail();
        })
        .catch((e) => state(shiftListEl, 'error', { message: e.message, retry: loadShifts }));
    }

    /* ---------- Cột phải: chi tiết ca ---------- */

    // Người đã xếp / chờ duyệt + ứng viên đề xuất (điểm cao xếp trước, tối đa 8)
    function loadDetail() {
      const shift = S.find('shifts', selectedShiftId);
      if (!shift) {
        return state(detailEl, 'empty', {
          icon: '👈', title: 'Chưa chọn ca', message: 'Chọn một ca ở bên trái để xem chi tiết.'
        });
      }

      const sv = Q.shiftView(shift);
      state(detailEl, 'loading');

      VL.api.run(() => {
        const regs = activeRegs(selectedShiftId).map(Q.regView);
        const taken = regs.map((r) => r.volunteerId);
        return {
          regs,
          cands: Q.active(S.all('volunteers'))
            .filter((v) => !taken.includes(v.id))
            .map((v) => ({ v, sc: VL.ai.matchScore(v, shift) }))
            .sort((a, b) => b.sc.score - a.sc.score)
        };
      })
        .then((d) => {
          const isFull = sv.filled >= sv.capacity;

          detailEl.innerHTML = '';
          detailEl.append(
            h('h2', null, sv.opp.title),
            h(
              'p',
              { class: 'mut' },
              Q.fmtShift(sv) + ' · ' + sv.filled + '/' + sv.capacity + ' đã xác nhận · yêu cầu: ' +
                (S.skillNames(VL.ai.requiredOf(shift)).join(', ') || 'không')
            ),

            // Đã xếp / chờ duyệt
            h('h3', null, 'Đã xếp / chờ duyệt (' + d.regs.length + ')'),
            d.regs.length
              ? h('div', { class: 'list' }, d.regs.map((r) => h(
                'div',
                { class: 'item row between' },
                h('span', null, r.vol.name + ' ', badge(r.status)),
                h(
                  'div',
                  { class: 'acts' },
                  r.status === 'pending'
                    ? h('button', {
                      type: 'button',
                      class: 'btn sm primary',
                      onclick: () => act(() => {
                        if (S.filled(selectedShiftId) >= shift.capacity) throw new Error('Ca đã đủ người.');
                        S.update('registrations', r.id, { status: 'confirmed' });
                        Q.syncShift(selectedShiftId);
                        S.notify(
                          S.userOfVolunteer(r.volunteerId),
                          'Đăng ký ca đã được xác nhận.',
                          'volunteer-my-shifts'
                        );
                      }, 'Đã xác nhận.')
                    }, 'Xác nhận')
                    : null,
                  h('button', {
                    type: 'button',
                    class: 'btn sm lnk-bad',
                    onclick: () => act(() => {
                      S.update('registrations', r.id, {
                        status: 'cancelled', note: 'Điều phối viên gỡ khỏi ca'
                      });
                      Q.syncShift(selectedShiftId);
                      S.notify(
                        S.userOfVolunteer(r.volunteerId),
                        'Bạn được điều phối viên gỡ khỏi ca "' + sv.opp.title + '".',
                        'volunteer-my-shifts'
                      );
                    }, 'Đã gỡ khỏi ca.')
                  }, 'Bỏ xếp')
                )
              )))
              : h('p', { class: 'mut' }, 'Chưa có ai.'),

            // Ứng viên đề xuất
            h('h3', { style: 'margin-top:14px' }, 'Ứng viên đề xuất'),
            d.cands.length
              ? h('div', null, d.cands.slice(0, 8).map((c) => h(
                'div',
                { class: 'cand' },
                h(
                  'div',
                  { style: 'flex:1' },
                  h('b', null, c.v.name),
                  h('div', { class: 'hint' }, c.sc.why.map((w) => w.detail).join(' · '))
                ),
                h('span', { class: 'score' }, c.sc.score + '%'),
                h('button', {
                  type: 'button',
                  class: 'btn sm primary',
                  disabled: c.sc.busy || isFull,
                  title: c.sc.busy ? 'Trùng lịch' : '',
                  onclick: () => act(
                    () => assign(c.v, S.find('shifts', selectedShiftId)),
                    'Đã xếp ' + c.v.name + ' vào ca.'
                  )
                }, 'Xếp vào ca')
              )))
              : h('p', { class: 'mut' }, 'Không còn tình nguyện viên khả dụng.')
          );
        })
        .catch((e) => state(detailEl, 'error', { message: e.message, retry: loadDetail }));
    }

    /* ---------- AI-1: đề xuất đội hình ---------- */

    // Tạo đề xuất: chọn tối đa 5 người điểm cao, không trùng lịch, đạt tối thiểu 30%
    function buildSuggestion(weights, attempt) {
      const shift = S.find('shifts', selectedShiftId);
      if (!shift) return { status: 'insufficient', message: 'Không đủ dữ liệu để đưa ra đề xuất.' };

      // Chuẩn hóa trọng số để tổng = 1
      const total = weights.skill + weights.time + weights.exp;
      const w = { skill: weights.skill / total, time: weights.time / total, exp: weights.exp / total };

      const gap = shift.capacity - S.filled(selectedShiftId),
        taken = activeRegs(selectedShiftId).map((r) => r.volunteerId);

      const items = Q.active(S.all('volunteers'))
        .filter((v) => !taken.includes(v.id))
        .map((v) => ({ v, sc: VL.ai.matchScore(v, shift, w) }))
        .filter((x) => !x.sc.busy && x.sc.score >= 30)
        .sort((a, b) => b.sc.score - a.sc.score)
        .slice(0, Math.min(gap, 5));

      if (!items.length) {
        return {
          status: 'insufficient',
          message: 'Không đủ dữ liệu: chưa có tình nguyện viên nào đạt tối thiểu 30% độ phù hợp.'
        };
      }

      // Độ tin cậy: hồ sơ càng đầy đủ + điểm người đầu càng cao thì càng tin cậy
      const avgComplete = items.reduce((t, x) => t + VL.ai.completeness(x.v), 0) / items.length;
      const confidence = Math.min(0.95, 0.3 + avgComplete * 0.4 + items[0].sc.score / 300);

      return {
        status: items[0].sc.score < 50 ? 'uncertain' : 'ok',
        confidence,
        message: 'Điểm phù hợp cao nhất còn thấp.',
        weights: w,
        attempt,
        data: { items, sel: items.map((x) => x.v.id) },   // sel: những người đang được tick
        why: items[0].sc.why
          .map((x) => Object.assign({}, x, { label: x.label + ' (#1: ' + items[0].v.name + ')' }))
          .concat([{
            tone: 'ok',
            label: 'Trọng số',
            detail: 'Kỹ năng ' + Math.round(w.skill * 100) + '% · lịch ' + Math.round(w.time * 100) +
              '% · kinh nghiệm ' + Math.round(w.exp * 100) + '%.'
          }])
      };
    }

    flow = VL.ai.flow(aiRoot, {
      id: 'AI-1',
      title: 'Volunteer Matcher',
      idle: 'Chọn một ca bên trái rồi bấm "Nhờ AI gợi ý đội hình" để xem đội hình đề xuất.',
      steps: [
        'Đang đọc yêu cầu của ca…',
        'Đang chấm điểm từng tình nguyện viên…',
        'Đang chọn đội hình tối ưu…'
      ],
      run: (attempt) => buildSuggestion(WEIGHTS[attempt % WEIGHTS.length], attempt),
      manual: () => detailEl.scrollIntoView({ behavior: 'smooth' }),

      // Mỗi người đề xuất là một dòng có ô tick
      renderResult: (res) => h('div', null, res.data.items.map((x) => h(
        'label',
        { class: 'cand' + (res.data.sel.includes(x.v.id) ? ' sel' : '') },
        h('input', {
          type: 'checkbox',
          checked: res.data.sel.includes(x.v.id),
          onchange: (e) => {
            const i = res.data.sel.indexOf(x.v.id);
            if (e.target.checked && i < 0) res.data.sel.push(x.v.id);
            if (!e.target.checked && i >= 0) res.data.sel.splice(i, 1);
            e.target.closest('.cand').classList.toggle('sel', e.target.checked);
          }
        }),
        h(
          'div',
          { style: 'flex:1' },
          h('b', null, x.v.name),
          h('div', { class: 'hint' }, x.sc.why.map((w) => w.detail).join(' · '))
        ),
        h('span', { class: 'score' }, x.sc.score + '%')
      ))),

      // Chấp nhận: xếp tất cả người đang được tick vào ca
      accept(res) {
        const shift = S.find('shifts', selectedShiftId),
          picked = res.data.items.filter((x) => res.data.sel.includes(x.v.id));

        if (!picked.length) throw new Error('Hãy chọn ít nhất một người để xếp.');
        picked.forEach((x) => assign(x.v, shift));
        setTimeout(loadShifts, 50);
      },
      acceptMsg: 'Đã xếp đội hình AI đề xuất vào ca.',
      acceptedText: 'Đã xếp các tình nguyện viên được chọn vào ca.',

      // Lưu: nhớ đội hình đã chọn cho ca này
      save(res) {
        localStorage.setItem('vl_saved_roster_' + selectedShiftId, JSON.stringify(res.data.sel));
      },
      saveMsg: 'Đã lưu đội hình đề xuất cho ca này.',

      // Sửa: mở hộp thoại chỉnh trọng số rồi tính lại
      edit: (res) => new Promise((resolve) => {
        const slider = (name, label) => field(
          label + ' (%)',
          h('input', {
            type: 'range', name, min: 0, max: 100, value: Math.round(res.weights[name] * 100)
          })
        );

        VL.ui.modal({
          title: 'Điều chỉnh trọng số',
          body: h(
            'div',
            null,
            slider('skill', 'Kỹ năng'),
            slider('time', 'Lịch rảnh'),
            slider('exp', 'Kinh nghiệm')
          ),
          submitLabel: 'Tính lại',
          onSubmit: (fm) => {
            const w = {
              skill: +fm.elements.skill.value,
              time: +fm.elements.time.value,
              exp: +fm.elements.exp.value
            };

            if (!(w.skill + w.time + w.exp)) {
              VL.ui.toast('Cần ít nhất một trọng số > 0.', 'bad');
              return false;
            }
            return w;
          }
        }).then((w) => resolve(w ? buildSuggestion(w, res.attempt) : null));
      })
    });

    document.getElementById('run-ai').addEventListener('click', () => {
      if (!selectedShiftId) return VL.ui.toast('Hãy chọn một ca cần ghép trước.', 'bad');
      flow.start();
    });

    form.addEventListener('input', U.debounce(loadShifts, 200));
    form.addEventListener('submit', (e) => e.preventDefault());
    loadShifts();
  };
})();
