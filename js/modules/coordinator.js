/* Vai trò ĐIỀU PHỐI VIÊN: bảng điều khiển nguồn lực, bảng ghép người (AI-1), cảnh báo thiếu ca (AI-2), tóm tắt tác động (AI-3) */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, state, field, chips, bar } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store,
    Q = VL.q;

  const upcoming = (days) => S.where('shifts', (s) =>
    s.status === 'open' && s.date >= U.today() && s.date <= U.addDays(days)
  ).map(Q.shiftView);

  // 1. Bảng điều khiển nguồn lực
  VL.pages['coordinator-resource-dashboard'] = function() {
    const f = document.getElementById('flt'),
      kpi = document.getElementById('kpi'),
      bars = document.getElementById('bars'),
      skills = document.getElementById('skills'),
      short = document.getElementById('short');

    f.elements.cat.append(...VL.ui.options(Q.active(S.all('categories')), '', 'Mọi lĩnh vực'));

    function load() {
      [bars, skills, short].forEach((b) => state(b, 'loading'));
      kpi.innerHTML = '';

      VL.api.run(() => {
        const days = +f.elements.range.value,
          cat = f.elements.cat.value;

        const sh = upcoming(days)
          .filter((s) => !cat || s.opp.categoryId === cat)
          .sort((a, b) => a.date.localeCompare(b.date));
        return {
          sh,
          vols: Q.active(S.all('volunteers')),
          pred: VL.ai.predictShortage(days, 40),
          days
        };
      })
        .then(render)
        .catch(
          (e) => [bars, skills, short].forEach(
            (b) => state(b, 'error', { message: e.message, retry: load })
          )
        );
    }

    function render(d) {
      const cap = d.sh.reduce((t, s) => t + s.capacity, 0),
        fil = d.sh.reduce((t, s) => t + s.filled, 0),
        hours = d.vols.reduce((t, v) => t + (v.hours || 0), 0);

      kpi.innerHTML = '';
      kpi.append(
        ...[
          [d.sh.length, 'Ca đang mở'],
          [cap ? Math.round(fil / cap * 100) + '%' : '—', 'Tỉ lệ lấp đầy'],
          [cap - fil, 'Chỗ còn thiếu'],
          [d.vols.length, 'Tình nguyện viên'],
          [hours, 'Giờ đóng góp']
        ].map((k) => h('div', { class: 'card kpi' }, h('b', null, k[0]), h('span', null, k[1])))
      );

      if (!d.sh.length) {
        state(bars, 'empty', { icon: '📊', title: 'Không có ca mở trong khoảng này' });
        state(skills, 'empty', { title: 'Chưa có nhu cầu kỹ năng' });
      } else {
        bars.innerHTML = '';

        bars.append(
          h(
            'div',
            { class: 'bars' },
            d.sh.slice(0, 10).map((s) => {
              const p = Math.round(s.filled / s.capacity * 100);
              return h(
                'div',
                { class: 'r' },
                h(
                  'span',
                  { title: s.opp.title },
                  U.fmtDate(s.date).slice(0, 5) + ' ' + s.opp.title.slice(0, 18)
                ),
                bar(p, p < 40 ? 'bad' : p < 70 ? 'warn' : ''),
                h('b', null, s.filled + '/' + s.capacity)
              );
            })
          )
        );

        const rows = Q.active(S.all('skills'))
          .map(
            (k) => ({
              k,
              demand: d.sh.reduce(
                (t, s) => t + (VL.ai.requiredOf(s).includes(k.id) ? s.capacity - s.filled : 0),
                0
              ),
              supply: d.vols.filter((v) => (v.skills || []).includes(k.id)).length
            })
          )
          .filter((r) => r.demand || r.supply);
        skills.innerHTML = '';
        skills.append(
          h(
            'div',
            { class: 'tbl-wrap' },
            h(
              'table',
              { class: 'stack' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  ['Kỹ năng', 'Nhu cầu (chỗ)', 'Nguồn lực (TNV)', 'Cân đối'].map(
                    (x) => h('th', null, x)
                  )
                )
              ),
              h(
                'tbody',
                null,
                rows.map(
                  (r) => h(
                    'tr',
                    null,
                    h('td', { 'data-label': 'Kỹ năng' }, r.k.name),
                    h('td', { 'data-label': 'Nhu cầu' }, r.demand),
                    h('td', { 'data-label': 'Nguồn lực' }, r.supply),
                    h(
                      'td',
                      { 'data-label': 'Cân đối' },
                      r.demand > r.supply
                        ? h('span', { class: 'badge bad' }, 'Thiếu ' + (r.demand - r.supply))
                        : h('span', { class: 'badge ok' }, 'Đủ')
                    )
                  )
                )
              )
            )
          )
        );
      }

      short.innerHTML = '';

      if (!d.pred.items.length)
        short.append(h('p', { class: 'mut' }, 'Chưa phát hiện ca nào có nguy cơ thiếu người.'));
      else
        short.append(
          h(
            'div',
            { class: 'list' },
            d.pred.items.slice(0, 3).map(
              (x) => h(
                'div',
                { class: 'item row between' },
                h(
                  'div',
                  null,
                  h('b', null, x.opp.title),
                  h('div', { class: 'mut' }, Q.fmtShift(x.shift) + ' · nguy cơ ' + x.risk + '%')
                ),
                h(
                  'a',
                  {
                    class: 'btn sm primary',
                    href: VL.path.page('coordinator-matching-board') + '?shift=' + x.shift.id
                  },
                  'Xếp người'
                )
              )
            )
          ),
          h(
            'p',
            null,
            h(
              'a',
              { href: VL.path.page('coordinator-shortage-alerts') },
              'Xem phân tích AI đầy đủ →'
            )
          )
        );
    }

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') load();
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };

  // 2. Bảng ghép người (có AI-1 ở phía điều phối)
  VL.pages['coordinator-matching-board'] = function() {
    const sBox = document.getElementById('shifts'),
      cBox = document.getElementById('cand'),
      aiRoot = document.getElementById('ai-root'),
      f = document.getElementById('flt');

    let sel = U.qs('shift') || '',
      flow = null;

    function assign(vol, shift) {
      if (S.filled(shift.id) >= shift.capacity) throw new Error('Ca đã đủ người.');
      if (S.where('registrations', (r) =>
        r.shiftId === shift.id &&
          r.volunteerId === vol.id &&
          ['pending', 'confirmed'].includes(r.status)
      ).length) throw new Error(vol.name + ' đã có trong ca.');
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
          (S.find('opportunities', shift.oppId) || {}).title +
          '" ngày ' +
          U.fmtDate(shift.date) +
          '.',
        'volunteer-my-shifts'
      );
    }

    function loadShifts() {
      state(sBox, 'loading');

      VL.api.run(
        () => upcoming(60)
          .filter((s) => s.filled < s.capacity)
          .sort((a, b) => (a.filled / a.capacity) - (b.filled / b.capacity))
      )
        .then((list) => {
          const q = U.norm(f.elements.q.value),
            r = list.filter((s) => !q || U.norm(s.opp.title).includes(q));

          if (!r.length)
            return state(sBox, 'empty', {
              icon: '✅',
              title: 'Mọi ca đã đủ người',
              message: 'Không còn ca nào cần ghép.'
            });
          if (!sel || !r.some((s) => s.id === sel)) sel = r[0].id;
          sBox.innerHTML = '';

          sBox.append(
            h(
              'div',
              { class: 'list' },
              r.map(
                (s) => h(
                  'button',
                  {
                    type: 'button',
                    class: 'item' + (s.id === sel ? ' sel' : ''),
                    style: 'text-align:left;cursor:pointer;' +
                      (s.id === sel ? 'border-color:var(--pri);background:var(--pri-t)' : ''),
                    'aria-pressed': s.id === sel,
                    onclick: () => {
                      sel = s.id;
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
                )
              )
            )
          );

          loadCand();
        })
        .catch((e) => state(sBox, 'error', { message: e.message, retry: loadShifts }));
    }

    function loadCand() {
      const shift = S.find('shifts', sel);
      if (!shift) return;
      const sv = Q.shiftView(shift);
      state(cBox, 'loading');

      VL.api.run(
        () => ({
          regs: S.where('registrations', (r) =>
            r.shiftId === sel && ['pending', 'confirmed'].includes(r.status)
          ).map(Q.regView),
          cands: Q.active(S.all('volunteers'))
            .filter((v) =>
              !S.where('registrations', (r) =>
                r.shiftId === sel &&
                  r.volunteerId === v.id &&
                  ['pending', 'confirmed'].includes(r.status)
              ).length
            )
            .map((v) => ({ v, sc: VL.ai.matchScore(v, shift) }))
            .sort((a, b) => b.sc.score - a.sc.score)
        })
      )
        .then((d) => {
          cBox.innerHTML = '';

          cBox.append(
            h('h2', null, sv.opp.title),
            h(
              'p',
              { class: 'mut' },
              Q.fmtShift(sv) +
                ' · ' +
                sv.filled +
                '/' +
                sv.capacity +
                ' đã xác nhận · yêu cầu: ' +
                (S.skillNames(VL.ai.requiredOf(shift)).join(', ') || 'không')
            ),
            h('h3', null, 'Đã xếp / chờ duyệt (' + d.regs.length + ')'),
            d.regs.length
              ? h(
                'div',
                { class: 'list' },
                d.regs.map(
                  (r) => h(
                    'div',
                    { class: 'item row between' },
                    h('span', null, r.vol.name + ' ', badge(r.status)),
                    h(
                      'div',
                      { class: 'acts' },
                      r.status === 'pending'
                        ? h(
                          'button',
                          {
                            class: 'btn sm primary',
                            onclick: () => act(() => {
                              if (S.filled(sel) >= shift.capacity)
                                throw new Error('Ca đã đủ người.');
                              S.update('registrations', r.id, { status: 'confirmed' });
                              Q.syncShift(sel);
                              S.notify(
                                S.userOfVolunteer(r.volunteerId),
                                'Đăng ký ca đã được xác nhận.',
                                'volunteer-my-shifts'
                              );
                            }, 'Đã xác nhận.')
                          },
                          'Xác nhận'
                        )
                        : null,
                      h(
                        'button',
                        {
                          class: 'btn sm lnk-bad',
                          onclick: () => act(() => {
                            S.update('registrations', r.id, {
                              status: 'cancelled',
                              note: 'Điều phối viên gỡ khỏi ca'
                            });
                            Q.syncShift(sel);
                            S.notify(
                              S.userOfVolunteer(r.volunteerId),
                              'Bạn được điều phối viên gỡ khỏi ca "' + sv.opp.title + '".',
                              'volunteer-my-shifts'
                            );
                          }, 'Đã gỡ khỏi ca.')
                        },
                        'Bỏ xếp'
                      )
                    )
                  )
                )
              )
              : h('p', { class: 'mut' }, 'Chưa có ai.'),
            h('h3', { style: 'margin-top:14px' }, 'Ứng viên đề xuất'),
            d.cands.length
              ? h(
                'div',
                null,
                d.cands.slice(0, 8).map(
                  (c) => h(
                    'div',
                    { class: 'cand' },
                    h(
                      'div',
                      { style: 'flex:1' },
                      h('b', null, c.v.name),
                      h('div', { class: 'hint' }, c.sc.why.map((w) => w.detail).join(' · '))
                    ),
                    h('span', { class: 'score' }, c.sc.score + '%'),
                    h(
                      'button',
                      {
                        class: 'btn sm primary',
                        disabled: c.sc.busy || sv.filled >= sv.capacity,
                        title: c.sc.busy ? 'Trùng lịch' : '',
                        onclick: () => act(
                          () => assign(c.v, S.find('shifts', sel)),
                          'Đã xếp ' + c.v.name + ' vào ca.'
                        )
                      },
                      'Xếp vào ca'
                    )
                  )
                )
              )
              : h('p', { class: 'mut' }, 'Không còn tình nguyện viên khả dụng.')
          );
        })
        .catch((e) => state(cBox, 'error', { message: e.message, retry: loadCand }));
    }

    async function act(fn, msg) {
      try {
        await VL.api.run(fn);
        VL.ui.toast(msg);
        loadShifts();
      } catch (e) {
        VL.ui.toast(e.message, 'bad');
      }
    }

    const WEIGHTS = [
      { skill: 0.6, time: 0.3, exp: 0.1 },
      { skill: 0.3, time: 0.6, exp: 0.1 },
      { skill: 0.8, time: 0.1, exp: 0.1 }
    ];

    function build(w, attempt) {
      const shift = S.find('shifts', sel);
      if (!shift) return { status: 'insufficient' };
      const gap = shift.capacity - S.filled(sel);
      const items = Q.active(S.all('volunteers'))
        .filter((v) =>
          !S.where('registrations', (r) =>
            r.shiftId === sel &&
              r.volunteerId === v.id &&
              ['pending', 'confirmed'].includes(r.status)
          ).length
        )
        .map((v) => ({ v, sc: VL.ai.matchScore(v, shift, w) }))
        .filter((x) => !x.sc.busy && x.sc.score >= 30)
        .sort((a, b) => b.sc.score - a.sc.score)
        .slice(0, Math.min(gap, 5));
      if (!items.length)
        return {
          status: 'insufficient',
          message: 'Không đủ dữ liệu: chưa có tình nguyện viên nào đạt tối thiểu 30% độ phù hợp.'
        };
      const conf = Math.min(
        0.95,
        0.3 +
          items.reduce((t, x) => t + VL.ai.completeness(x.v), 0) / items.length * 0.4 +
          items[0].sc.score / 300
      );
      return {
        status: items[0].sc.score < 50 ? 'uncertain' : 'ok',
        confidence: conf,
        message: 'Điểm phù hợp cao nhất còn thấp.',
        weights: w,
        attempt,
        data: { items, sel: items.map((x) => x.v.id) },
        why: items[0].sc.why.map(
          (x) => Object.assign({}, x, { label: x.label + ' (#1: ' + items[0].v.name + ')' })
        ).concat([
          {
            tone: 'ok',
            label: 'Trọng số',
            detail: 'Kỹ năng ' +
              Math.round(w.skill * 100) +
              '% · lịch ' +
              Math.round(w.time * 100) +
              '% · kinh nghiệm ' +
              Math.round(w.exp * 100) +
              '%.'
          }
        ])
      };
    }

    flow = VL.ai.flow(aiRoot, {
      id: 'AI-1',
      title: 'Volunteer Matcher',
      idle: 'Chọn một ca bên trái rồi bấm "Nhờ AI gợi ý" để xem đội hình đề xuất.',
      steps: [
        'Đang đọc yêu cầu của ca…',
        'Đang chấm điểm từng tình nguyện viên…',
        'Đang chọn đội hình tối ưu…'
      ],
      run: (a) => build(WEIGHTS[a % WEIGHTS.length], a),
      manual: () => cBox.scrollIntoView({ behavior: 'smooth' }),
      renderResult: (res) => h(
        'div',
        null,
        res.data.items.map(
          (x) => h(
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
          )
        )
      ),
      accept(res) {
        const shift = S.find('shifts', sel);
        const pk = res.data.items.filter((x) => res.data.sel.includes(x.v.id));
        if (!pk.length) throw new Error('Hãy chọn ít nhất một người để xếp.');
        pk.forEach((x) => assign(x.v, shift));
        setTimeout(loadShifts, 50);
      },
      acceptMsg: 'Đã xếp đội hình AI đề xuất vào ca.',
      acceptedText: 'Đã xếp các tình nguyện viên được chọn vào ca.',
      save(res) {
        const k = 'vl_saved_roster_' + sel;
        localStorage.setItem(k, JSON.stringify(res.data.sel));
      },
      saveMsg: 'Đã lưu đội hình đề xuất cho ca này.',
      edit: (res) => new Promise((resolve) => {
        const sl = (n, l) => field(
          l + ' (%)',
          h('input', {
            type: 'range',
            name: n,
            min: 0,
            max: 100,
            value: Math.round(res.weights[n] * 100)
          })
        );

        VL.ui.modal({
          title: 'Điều chỉnh trọng số',
          body: h(
            'div',
            null,
            sl('skill', 'Kỹ năng'),
            sl('time', 'Lịch rảnh'),
            sl('exp', 'Kinh nghiệm')
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
        }).then((w) => resolve(w ? build(w, res.attempt) : null));
      })
    });

    document.getElementById('run-ai').addEventListener('click', () => {
      if (!sel) return VL.ui.toast('Hãy chọn một ca cần ghép trước.', 'bad');
      flow.start();
    });

    f.addEventListener('input', U.debounce(loadShifts, 200));
    f.addEventListener('submit', (e) => e.preventDefault());
    loadShifts();
  };

  // 3. AI-3: Tóm tắt tác động
  VL.pages['coordinator-impact-summary'] = function(session) {
    const f = document.getElementById('sf'),
      err = document.getElementById('sf-err'),
      savedBox = document.getElementById('saved');

    f.elements.opp.append(
      ...VL.ui.options(
        S.all('opportunities').filter((p) => p.moderation === 'approved'),
        '',
        '— Chọn hoạt động —'
      )
    );
    const TONES = {
      'trang-trong': 'Trang trọng',
      'than-thien': 'Thân thiện',
      'ngan-gon': 'Ngắn gọn'
    };

    function stats(oppId) {
      const shifts = S.where('shifts', (s) => s.oppId === oppId && s.status !== 'cancelled'),
        ids = shifts.map((s) => s.id),
        regs = S.where('registrations', (r) => ids.includes(r.shiftId)),
        done = regs.filter((r) => r.status === 'completed');

      return {
        shifts: shifts.length,
        doneShifts: shifts.filter((s) => s.status === 'done').length,
        vols: new Set(done.map((r) => r.volunteerId)).size,
        hours: done.reduce((t, r) => t + r.hours, 0),
        noShow: regs.filter((r) => r.status === 'no_show').length,
        regs: regs.length
      };
    }

    function write(opp, st, tone, attempt) {
      const t = opp.title,
        v = attempt % 2;

      if (tone === 'ngan-gon')
        return t +
          ': ' +
          st.vols +
          ' tình nguyện viên, ' +
          st.hours +
          ' giờ đóng góp qua ' +
          st.doneShifts +
          ' ca.';
      if (tone === 'than-thien')
        return (v ? 'Thật tuyệt vời! ' : 'Cảm ơn mọi người! ') +
          'Nhờ ' +
          st.vols +
          ' bạn tình nguyện viên, "' +
          t +
          '" đã có ' +
          st.hours +
          ' giờ đóng góp qua ' +
          st.doneShifts +
          ' ca hoạt động. Mỗi giờ các bạn trao đi đều làm cộng đồng ấm áp hơn.';
      return 'Hoạt động "' +
        t +
        '" đã hoàn thành ' +
        st.doneShifts +
        '/' +
        st.shifts +
        ' ca, với sự tham gia của ' +
        st.vols +
        ' tình nguyện viên, ghi nhận tổng cộng ' +
        st.hours +
        ' giờ đóng góp' +
        (v ? ' và ' + st.noShow + ' trường hợp vắng mặt.' : '.') +
        ' Kết quả cho thấy mức độ cam kết ổn định của cộng đồng.';
    }

    function build(oppId, tone, attempt, text) {
      const opp = S.find('opportunities', oppId),
        st = stats(oppId);

      if (!st.doneShifts && !st.vols)
        return {
          status: 'insufficient',
          message: 'Không đủ dữ liệu để đưa ra đề xuất: hoạt động này chưa có ca nào hoàn thành.'
        };
      const why = [
        {
          tone: 'ok',
          label: 'Dữ liệu dùng',
          detail: st.doneShifts +
            ' ca hoàn thành · ' +
            st.vols +
            ' TNV · ' +
            st.hours +
            ' giờ · ' +
            st.noShow +
            ' vắng mặt.'
        },
        {
          tone: st.hours ? 'ok' : 'warn',
          label: 'Số giờ',
          detail: st.hours
            ? 'Tổng giờ lấy từ các đăng ký đã hoàn thành.'
            : 'Chưa có giờ nào được ghi nhận nên số liệu có thể thiếu.'
        },
        {
          tone: 'ok',
          label: 'Giọng văn',
          detail: TONES[tone] + ' (mẫu #' + (attempt % 2 + 1) + ').'
        }
      ];
      return {
        status: st.hours ? 'ok' : 'uncertain',
        confidence: st.hours ? 0.5 + Math.min(0.4, st.vols * 0.1) : 0.4,
        message: 'Chưa có giờ được ghi nhận.',
        why,
        oppId,
        tone,
        attempt,
        stats: st,
        data: { text: text || write(opp, st, tone, attempt) }
      };
    }

    let current = null;

    function persist(res, status) {
      const rec = {
        oppId: res.oppId,
        tone: res.tone,
        text: res.data.text,
        status,
        createdAt: new Date().toISOString()
      };

      if (res.recId) S.update('impactSummaries', res.recId, rec);
      else res.recId = S.add('impactSummaries', rec).id;

      S.audit(
        'Tóm tắt tác động (' + status + ')',
        (S.find('opportunities', res.oppId) || {}).title
      );
      renderSaved();
    }

    const flow = VL.ai.flow(document.getElementById('ai-root'), {
      id: 'AI-3',
      title: 'Impact Summary',
      idle: 'Chọn hoạt động và giọng văn, sau đó bấm "Tạo tóm tắt".',
      steps: ['Đang tổng hợp số liệu đóng góp…', 'Đang soạn nội dung…', 'Đang kiểm tra số liệu…'],
      run: (a) => {
        current = build(f.elements.opp.value, f.elements.tone.value, a);
        return current;
      },
      manual: () => savedBox.scrollIntoView({ behavior: 'smooth' }),
      renderResult: (res) => h(
        'div',
        null,
        h(
          'blockquote',
          {
            style: 'margin:0 0 10px;padding:10px 14px;border-left:4px solid var(--ai);background:var(--ai-t);border-radius:8px'
          },
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
      accept: (res) => {
        persist(res, 'accepted');
        S.notify(
          S.userOfOrg((S.find('opportunities', res.oppId) || {}).orgId),
          'Điều phối viên đã chốt tóm tắt tác động cho "' +
            (S.find('opportunities', res.oppId) || {}).title +
            '".',
          'organization-opportunity-management'
        );
      },
      acceptMsg: 'Đã chấp nhận và lưu tóm tắt.',
      acceptedText: 'Tóm tắt đã được chấp nhận và lưu vào danh sách bên dưới.',
      reject: (res) => {
        if (res.recId) persist(res, 'rejected');
      },
      save: (res) => persist(res, 'saved'),
      saveMsg: 'Đã lưu bản nháp tóm tắt.',
      edit: (res) => new Promise((resolve) => {
        const ta = h('textarea', { name: 'text', rows: 6 });
        ta.value = res.data.text;

        VL.ui.modal({
          title: 'Sửa tóm tắt',
          body: field('Nội dung (30–800 ký tự)', ta),
          onSubmit: () => {
            const t = ta.value.trim();

            if (t.length < 30 || t.length > 800) {
              V.setError(ta, 'Nội dung cần từ 30 đến 800 ký tự.');
              return false;
            }

            return t;
          }
        }).then(
          (t) => resolve(
            t
              ? Object.assign(
                {},
                res,
                {
                  data: { text: t },
                  why: res.why.concat([
                    {
                      tone: 'warn',
                      label: 'Đã chỉnh sửa',
                      detail: 'Nội dung đã được bạn chỉnh tay.'
                    }
                  ])
                }
              )
              : null
          )
        );
      })
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!f.elements.opp.value) {
        err.textContent = 'Hãy chọn một hoạt động.';
        return;
      }

      err.textContent = '';
      flow.start();
    });

    function renderSaved() {
      savedBox.innerHTML = '';
      const rows = S.all('impactSummaries').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (!rows.length)
        return state(savedBox, 'empty', { icon: '🌱', title: 'Chưa có tóm tắt nào được lưu' });

      savedBox.append(
        h(
          'div',
          { class: 'list' },
          rows.map((r) => {
            const p = S.find('opportunities', r.oppId) || { title: '(đã xóa)' };

            return h(
              'article',
              { class: 'item' },
              h('div', { class: 'row between' }, h('b', null, p.title), badge(r.status)),
              h('p', null, r.text),
              h(
                'div',
                { class: 'acts' },
                h('button', { class: 'btn sm', onclick: () => editSaved(r) }, 'Sửa'),
                h(
                  'button',
                  {
                    class: 'btn sm',
                    onclick: () => {
                      S.notify(
                        S.userOfOrg(p.orgId),
                        'Bạn nhận được tóm tắt tác động: ' + r.text.slice(0, 80) + '…',
                        'organization-opportunity-management'
                      );
                      VL.ui.toast('Đã gửi cho tổ chức.');
                    }
                  },
                  'Gửi tổ chức'
                ),
                r.status !== 'rejected'
                  ? h(
                    'button',
                    {
                      class: 'btn sm',
                      onclick: () => {
                        S.update('impactSummaries', r.id, { status: 'archived' });
                        renderSaved();
                      }
                    },
                    'Lưu trữ'
                  )
                  : null,
                h('button', { class: 'btn sm lnk-bad', onclick: () => delSaved(r) }, 'Xóa')
              )
            );
          })
        )
      );
    }

    function editSaved(r) {
      const ta = h('textarea', { name: 'text', rows: 5 });
      ta.value = r.text;

      VL.ui.modal({
        title: 'Sửa tóm tắt đã lưu',
        body: field('Nội dung (30–800 ký tự)', ta),
        onSubmit: () => {
          const t = ta.value.trim();

          if (t.length < 30 || t.length > 800) {
            V.setError(ta, 'Nội dung cần từ 30 đến 800 ký tự.');
            return false;
          }

          return VL.api.run(() => S.update('impactSummaries', r.id, { text: t }));
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã cập nhật.');
          renderSaved();
        }
      });
    }

    async function delSaved(r) {
      if (!(await VL.ui.confirm({
        title: 'Xóa tóm tắt?',
        message: 'Tóm tắt này sẽ bị xóa vĩnh viễn.',
        danger: true,
        confirmLabel: 'Xóa'
      }))) return;
      S.remove('impactSummaries', r.id);
      VL.ui.toast('Đã xóa.');
      renderSaved();
    }

    renderSaved();
  };

  // 4. AI-2: Shift Shortage Predictor
  VL.pages['coordinator-shortage-alerts'] = function() {
    const f = document.getElementById('pf'),
      err = document.getElementById('pf-err'),
      hist = document.getElementById('history'),
      KEY = 'vl_saved_shortage';

    const saved = () => JSON.parse(localStorage.getItem(KEY) || '[]');

    function build(days, thr, attempt) {
      const eff = Math.max(10, thr - (attempt % 2) * 10),
        r = VL.ai.predictShortage(days, eff);

      if (!r.total)
        return {
          status: 'insufficient',
          message: 'Không đủ dữ liệu để đưa ra đề xuất: không có ca nào đang mở trong ' +
            days +
            ' ngày tới.'
        };
      const conf = r.confidence - (days > 14 ? 0.3 : 0);
      return {
        status: conf < 0.6 ? 'uncertain' : 'ok',
        confidence: conf,
        message: 'Dự báo xa thường kém chính xác.',
        input: { days, thr },
        attempt,
        data: {
          items: r.items,
          sel: r.items.filter((x) => x.level === 'high').map((x) => x.shift.id),
          total: r.total
        },
        why: [
          {
            tone: 'ok',
            label: 'Phạm vi',
            detail: 'Quét ' +
              r.total +
              ' ca mở trong ' +
              days +
              ' ngày tới, ngưỡng cảnh báo ' +
              eff +
              '%.'
          }
        ].concat(
          r.items.length
            ? r.items[0].why.map(
              (w) => Object.assign({}, w, { label: w.label + ' (ca rủi ro nhất)' })
            )
            : [
              {
                tone: 'ok',
                label: 'Kết luận',
                detail: 'Mọi ca đều có tỉ lệ lấp đầy dự kiến trên ngưỡng.'
              }
            ]
        )
      };
    }

    const flow = VL.ai.flow(document.getElementById('ai-root'), {
      id: 'AI-2',
      title: 'Shift Shortage Predictor',
      idle: 'Chọn phạm vi và ngưỡng rồi bấm "Dự báo thiếu hụt".',
      steps: [
        'Đang đọc đăng ký các ca…',
        'Đang ước tính vắng mặt từ lịch sử…',
        'Đang tính nguy cơ thiếu người…'
      ],
      run: (a) => {
        const d = +f.elements.days.value,
          t = +f.elements.thr.value;

        return build(d, t, a);
      },
      manual: () => {
        location.href = VL.path.page('coordinator-matching-board');
      },
      renderResult: (res) =>
        !res.data.items.length
          ? h(
            'div',
            { class: 'state' },
            h('div', { class: 'state-i' }, '✅'),
            h('h3', null, 'Không có ca nào có nguy cơ thiếu người'),
            h('p', { class: 'mut' }, 'Đã quét ' + res.data.total + ' ca.')
          )
          : h(
            'div',
            null,
            res.data.items.map(
              (x) => h(
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
                  h(
                    'div',
                    { class: 'mut' },
                    Q.fmtShift(x.shift) +
                      ' · dự kiến ' +
                      x.expected +
                      '/' +
                      x.shift.capacity +
                      ' người'
                  ),
                  bar(x.risk, x.level === 'high' ? 'bad' : 'warn')
                ),
                h(
                  'div',
                  { style: 'text-align:right' },
                  h(
                    'span',
                    { class: 'badge ' + (x.level === 'high' ? 'bad' : 'warn') },
                    (x.level === 'high' ? 'Cao ' : 'Vừa ') + x.risk + '%'
                  ),
                  h(
                    'div',
                    null,
                    h(
                      'a',
                      {
                        class: 'btn sm',
                        href: VL.path.page('coordinator-matching-board') + '?shift=' + x.shift.id
                      },
                      'Xếp người'
                    )
                  )
                )
              )
            )
          ),
      accept(res) {
        const pk = res.data.items.filter((x) => res.data.sel.includes(x.shift.id));
        if (!pk.length) throw new Error('Hãy chọn ít nhất một ca để gửi cảnh báo.');

        pk.forEach((x) => {
          S.update('shifts', x.shift.id, { flagged: true });
          S.notify(
            S.userOfOrg(x.opp.orgId),
            'Cảnh báo AI: ca "' +
              x.opp.title +
              '" ngày ' +
              U.fmtDate(x.shift.date) +
              ' có nguy cơ thiếu người (' +
              x.risk +
              '%).',
            'organization-shift-management'
          );
        });

        S.audit('Gửi cảnh báo thiếu ca', pk.length + ' ca');
      },
      acceptMsg: 'Đã gửi cảnh báo tới các tổ chức liên quan.',
      acceptedText: 'Đã gửi cảnh báo cho các ca được chọn.',
      save(res) {
        const l = saved();
        l.unshift({
          at: new Date().toISOString(),
          days: res.input.days,
          thr: res.input.thr,
          count: res.data.items.length,
          high: res.data.items.filter((x) => x.level === 'high').length
        });
        localStorage.setItem(KEY, JSON.stringify(l.slice(0, 10)));
        renderHist();
      },
      saveMsg: 'Đã lưu báo cáo dự báo.',
      edit: (res) => new Promise((resolve) => {
        const body = h(
          'div',
          null,
          field(
            'Phạm vi (ngày)',
            h(
              'select',
              { name: 'days' },
              [7, 14, 30].map(
                (d) => h('option', { value: d, selected: d === res.input.days }, d + ' ngày tới')
              )
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
            if (V.num(10, 90)(fm.elements.thr.value)) {
              V.setError(fm.elements.thr, 'Ngưỡng từ 10 đến 90.');
              return false;
            }

            return { d: +fm.elements.days.value, t: +fm.elements.thr.value };
          }
        }).then((x) => {
          if (x) {
            f.elements.days.value = x.d;
            f.elements.thr.value = x.t;
          }

          resolve(x ? build(x.d, x.t, res.attempt) : null);
        });
      })
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();

      if (V.num(10, 90)(f.elements.thr.value)) {
        err.textContent = 'Ngưỡng cảnh báo phải từ 10 đến 90.';
        return;
      }

      err.textContent = '';
      flow.start();
    });

    function renderHist() {
      hist.innerHTML = '';
      const l = saved();
      if (!l.length) return hist.append(h('p', { class: 'mut' }, 'Chưa có báo cáo nào được lưu.'));

      hist.append(
        h(
          'div',
          { class: 'list' },
          l.map(
            (x, i) => h(
              'div',
              { class: 'item row between' },
              h(
                'span',
                null,
                U.fmtDateTime(x.at) +
                  ' · ' +
                  x.days +
                  ' ngày · ngưỡng ' +
                  x.thr +
                  '% → ' +
                  x.count +
                  ' ca nguy cơ (' +
                  x.high +
                  ' cao)'
              ),
              h(
                'button',
                {
                  class: 'btn sm lnk-bad',
                  onclick: () => {
                    const a = saved();
                    a.splice(i, 1);
                    localStorage.setItem(KEY, JSON.stringify(a));
                    renderHist();
                  }
                },
                'Xóa'
              )
            )
          )
        )
      );
    }

    renderHist();
  };
})();
