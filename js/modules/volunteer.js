/* Vai trò TÌNH NGUYỆN VIÊN: hồ sơ, tìm cơ hội, ca của tôi, AI gợi ý ca (AI-1) */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, state, field, chips, bar } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store,
    Q = VL.q;

  const SES = ['morning', 'afternoon', 'evening'],
    DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const me = (s) => S.find('volunteers', s.refId);

  const availGrid = (av, editable, prefix) => {
    const g = h(
      'div',
      { class: 'avail' },
      h('span'),
      SES.map((x) => h('span', { class: 'h' }, U.SESSION_VI[x]))
    );

    DAYS.forEach((d) => {
      g.append(h('span', null, U.DAY_VI[d]));

      SES.forEach((x) => {
        const on = (av[d] || []).includes(x);
        g.append(
          editable
            ? h(
              'label',
              { 'aria-label': U.DAY_VI[d] + ' ' + U.SESSION_VI[x] },
              h('input', {
                type: 'checkbox',
                name: (prefix || 'av') + '-' + d + '-' + x,
                checked: on
              })
            )
            : h('span', { class: on ? 'on' : 'off' }, on ? '✔' : '–')
        );
      });
    });

    return g;
  };

  const readAvail = (root, prefix) => {
    const av = {};

    DAYS.forEach((d) => {
      av[d] = SES.filter((x) =>
        root.querySelector('[name="' + (prefix || 'av') + '-' + d + '-' + x + '"]').checked
      );
    });

    return av;
  };

  const skillChecks = (sel, name) => h(
    'div',
    { class: 'checks' },
    Q.active(S.all('skills')).map(
      (k) => h(
        'label',
        null,
        h('input', {
          type: 'checkbox',
          name: name || 'skills',
          value: k.id,
          checked: sel.includes(k.id)
        }),
        k.name
      )
    )
  );
  const readSkills = (root, name) => Array.from(
    root.querySelectorAll('[name="' + (name || 'skills') + '"]:checked')
  ).map((i) => i.value);

  // 1. Hồ sơ tình nguyện viên
  VL.pages['volunteer-profile'] = function(session) {
    const view = document.getElementById('view');

    function render() {
      state(view, 'loading');

      VL.api.run(() => me(session))
        .then((v) => {
          const pct = Math.round(VL.ai.completeness(v) * 100),
            done = S.where('registrations', (r) =>
              r.volunteerId === v.id && r.status === 'completed'
            ).length;

          view.innerHTML = '';
          view.append(
            h(
              'div',
              { class: 'grid g2' },
              h(
                'section',
                { class: 'card', 'aria-labelledby': 'pi' },
                h('h2', { id: 'pi' }, v.name),
                h(
                  'p',
                  { class: 'mut' },
                  v.email + (v.phone ? ' · ' + v.phone : '') + (v.city ? ' · ' + v.city : '')
                ),
                h('p', null, v.bio || 'Chưa có giới thiệu bản thân.'),
                h('h3', null, 'Kỹ năng'),
                chips(S.skillNames(v.skills)),
                h(
                  'div',
                  { style: 'margin-top:14px' },
                  h('b', null, 'Mức hoàn thiện hồ sơ: ' + pct + '%'),
                  bar(pct, pct < 60 ? 'warn' : ''),
                  pct < 100
                    ? h(
                      'p',
                      { class: 'hint' },
                      'Bổ sung kỹ năng, lịch rảnh và giới thiệu để AI ghép ca chính xác hơn.'
                    )
                    : null
                )
              ),
              h(
                'section',
                { class: 'card', 'aria-labelledby': 'ps' },
                h('h2', { id: 'ps' }, 'Đóng góp'),
                h(
                  'div',
                  { class: 'grid g4' },
                  h(
                    'div',
                    { class: 'kpi' },
                    h('b', null, v.hours),
                    h('span', null, 'Giờ tình nguyện')
                  ),
                  h('div', { class: 'kpi' }, h('b', null, done), h('span', null, 'Ca hoàn thành'))
                )
              ),
              h(
                'section',
                { class: 'card', style: 'grid-column:1/-1', 'aria-labelledby': 'pa' },
                h('h2', { id: 'pa' }, 'Lịch rảnh hằng tuần'),
                availGrid(v.availability, false)
              )
            )
          );
        })
        .catch((e) => state(view, 'error', { message: e.message, retry: render }));
    }

    document.getElementById('edit').addEventListener('click', () => {
      const v = me(session);
      const f = h(
        'div',
        null,
        field('Họ và tên', h('input', { name: 'name', value: v.name, maxlength: 80 })),
        field('Số điện thoại', h('input', { name: 'phone', value: v.phone, inputmode: 'tel' })),
        field('Thành phố', h('input', { name: 'city', value: v.city })),
        field('Giới thiệu (tối đa 280 ký tự)', h('textarea', { name: 'bio', rows: 3 }, v.bio)),
        h('fieldset', null, h('legend', null, 'Kỹ năng'), skillChecks(v.skills)),
        h('fieldset', null, h('legend', null, 'Lịch rảnh'), availGrid(v.availability, true))
      );
      f.querySelector('textarea').value = v.bio;
      const rules = {
        name: [V.required('Vui lòng nhập họ tên.'), V.min(2)],
        phone: [V.phone],
        bio: [V.max(280, 'Giới thiệu tối đa 280 ký tự.')]
      };

      VL.ui.modal({
        title: 'Chỉnh sửa hồ sơ',
        body: f,
        wide: true,
        onSubmit: (form) => {
          const val = V.validate(form, rules);
          if (!val) return false;

          return VL.api.run(() => {
            S.update('volunteers', v.id, {
              name: val.name.trim(),
              phone: val.phone.trim(),
              city: val.city.trim(),
              bio: val.bio.trim(),
              skills: readSkills(form),
              availability: readAvail(form)
            });
            S.update('users', session.userId, { name: val.name.trim() });
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã cập nhật hồ sơ.');
          render();
        }
      });
    });

    render();
  };

  // Đăng ký một ca (dùng ở trang Tìm cơ hội và AI-1)
  function canRegister(v, shift) {
    if (shift.status !== 'open') return 'Ca này đã đủ người hoặc không còn nhận đăng ký.';
    if (shift.date < U.today()) return 'Ca đã diễn ra.';
    if (S.where('registrations', (r) =>
      r.shiftId === shift.id &&
        r.volunteerId === v.id &&
        ['pending', 'confirmed'].includes(r.status)
    ).length) return 'Bạn đã đăng ký ca này.';
    if (VL.ai.conflicts(v, shift)) return 'Ca này trùng giờ với một ca bạn đã đăng ký.';
    return '';
  }

  function register(v, shift, note) {
    const bad = canRegister(v, shift);
    if (bad) throw new Error(bad);
    const r = S.add('registrations', {
      shiftId: shift.id,
      volunteerId: v.id,
      status: 'pending',
      hours: 0,
      note: note || '',
      createdAt: new Date().toISOString()
    });
    const opp = S.find('opportunities', shift.oppId);
    S.notify(
      S.userOfOrg(opp.orgId),
      v.name + ' vừa đăng ký ca "' + opp.title + '" (' + U.fmtDate(shift.date) + ').',
      'organization-volunteer-roster'
    );
    return r;
  }

  // 2. Tìm cơ hội
  VL.pages['volunteer-opportunity-search'] = function(session) {
    const list = document.getElementById('list'),
      f = document.getElementById('flt');

    f.elements.cat.append(...VL.ui.options(Q.active(S.all('categories')), '', 'Tất cả lĩnh vực'));
    f.elements.skill.append(...VL.ui.options(Q.active(S.all('skills')), '', 'Mọi kỹ năng'));
    let data = [];

    function load() {
      state(list, 'loading');

      VL.api.run(() => {
        const v = me(session),
          orgOk = S.where('organizations', (o) => o.status === 'approved').map((o) => o.id);

        return S.where('opportunities', (p) =>
          p.status === 'open' && p.moderation === 'approved' && orgOk.includes(p.orgId)
        ).map((p) => {
          const shifts = S.where('shifts', (s) =>
            s.oppId === p.id && s.status !== 'cancelled' && s.date >= U.today()
          )
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(Q.shiftView);
          const best = shifts.filter((s) => s.status === 'open').reduce(
            (m, s) => Math.max(m, VL.ai.matchScore(v, s).score),
            0
          );
          return Object.assign(
            {},
            p,
            {
              shifts,
              best,
              org: S.find('organizations', p.orgId),
              cat: S.find('categories', p.categoryId) || {},
              next: shifts[0] ? shifts[0].date : '9999'
            }
          );
        });
      })
        .then((d) => {
          data = d;
          render();
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    function render() {
      const q = U.norm(f.elements.q.value),
        cat = f.elements.cat.value,
        sk = f.elements.skill.value,
        only = f.elements.only.checked;

      let r = data.filter((p) =>
        (!q ||
          U.norm(p.title + ' ' + p.description + ' ' + p.location + ' ' + p.org.name).includes(
            q
          )) &&
          (!cat || p.categoryId === cat) &&
          (!sk || p.requiredSkills.includes(sk)) &&
          (!only || p.shifts.some((s) => s.status === 'open'))
      );
      r.sort(
        f.elements.sort.value === 'date'
          ? (a, b) => a.next.localeCompare(b.next)
          : (a, b) => b.best - a.best
      );
      document.getElementById('count').textContent = r.length + ' cơ hội phù hợp';

      if (!r.length)
        return state(list, 'empty', {
          icon: '🔎',
          title: 'Không tìm thấy cơ hội phù hợp',
          message: 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa.',
          action: {
            label: 'Xóa bộ lọc',
            fn: () => {
              f.reset();
              render();
            }
          }
        });

      list.innerHTML = '';
      list.append(
        h(
          'div',
          { class: 'grid g3' },
          r.map(
            (p) => h(
              'article',
              { class: 'card opp' },
              h(
                'div',
                { class: 'row between' },
                badge('open', 'shift'),
                h(
                  'span',
                  { class: 'score', title: 'Độ phù hợp với bạn' },
                  p.best ? p.best + '% phù hợp' : '—'
                )
              ),
              h('h3', null, p.title),
              h('div', { class: 'meta' }, p.org.name + ' · ' + p.cat.name),
              h('p', null, p.location),
              chips(S.skillNames(p.requiredSkills)),
              h('p', { class: 'meta', style: 'margin-top:8px' }, p.shifts.length + ' ca sắp tới'),
              h('button', { class: 'btn primary', onclick: () => open(p) }, 'Xem ca & đăng ký')
            )
          )
        )
      );
    }

    function open(p) {
      const v = me(session);

      const body = h(
        'div',
        null,
        h('p', null, p.description),
        h('h3', null, 'Các ca sắp tới'),
        p.shifts.length
          ? h(
            'div',
            { class: 'list' },
            p.shifts.map((s) => {
              const why = canRegister(v, s),
                sc = VL.ai.matchScore(v, s);

              return h(
                'div',
                { class: 'item' },
                h(
                  'div',
                  { class: 'row between' },
                  h('b', null, Q.fmtShift(s)),
                  badge(s.status, 'shift')
                ),
                h(
                  'div',
                  { class: 'row' },
                  bar(Math.round(s.filled / s.capacity * 100)),
                  h('small', null, s.filled + '/' + s.capacity + ' chỗ · khớp ' + sc.score + '%')
                ),
                h(
                  'div',
                  { class: 'row between', style: 'margin-top:8px' },
                  h('small', { class: 'mut' }, why || 'Bạn có thể đăng ký ca này.'),
                  h(
                    'button',
                    {
                      type: 'button',
                      class: 'btn sm primary',
                      disabled: !!why,
                      onclick: () => confirmReg(v, s, p)
                    },
                    'Đăng ký'
                  )
                )
              );
            })
          )
          : h('p', { class: 'mut' }, 'Chưa có ca nào được mở.')
      );

      VL.ui.modal({ title: p.title, body, wide: true, hideFooter: true });
    }

    function confirmReg(v, s, p) {
      const ta = h('textarea', {
        name: 'note',
        rows: 3,
        maxlength: 200,
        placeholder: 'Ví dụ: Tôi có thể đến sớm 15 phút'
      });

      VL.ui.modal({
        title: 'Đăng ký ca ' + Q.fmtShift(s),
        body: h(
          'div',
          null,
          h('p', null, 'Hoạt động: ' + p.title),
          field('Ghi chú cho tổ chức (không bắt buộc)', ta)
        ),
        submitLabel: 'Gửi đăng ký',
        onSubmit: () => {
          if (ta.value.length > 200) {
            V.setError(ta, 'Tối đa 200 ký tự.');
            return false;
          }

          return VL.api.run(() => register(v, S.find('shifts', s.id), ta.value.trim()));
        }
      }).then((ok) => {
        if (ok) {
          document.querySelectorAll('dialog').forEach((d) => d.close());
          VL.ui.toast('Đã gửi đăng ký – chờ tổ chức xác nhận.');
          load();
        }
      });
    }

    f.addEventListener('input', U.debounce(render, 200));

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') render();
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      render();
    });

    f.addEventListener('reset', () => setTimeout(render));
    load();
  };

  // 3. Ca của tôi
  VL.pages['volunteer-my-shifts'] = function(session) {
    const list = document.getElementById('list'),
      tabsEl = document.getElementById('tabs'),
      kpi = document.getElementById('kpi');

    const TABS = [
      ['up', 'Sắp tới', (r) => r.status === 'confirmed'],
      ['pend', 'Chờ duyệt', (r) => r.status === 'pending'],
      ['done', 'Đã tham gia', (r) => ['completed', 'no_show'].includes(r.status)],
      ['cx', 'Đã hủy / Từ chối', (r) => ['cancelled', 'rejected'].includes(r.status)]
    ];

    let tab = 'up',
      regs = [];

    function load() {
      state(list, 'loading');

      VL.api.run(
        () => S.where('registrations', (r) => r.volunteerId === session.refId)
          .map(Q.regView)
          .sort((a, b) => (b.shift.date || '').localeCompare(a.shift.date || ''))
      )
        .then((d) => {
          regs = d;
          render();
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    function render() {
      const v = me(session);
      kpi.innerHTML = '';
      kpi.append(
        ...[
          ['Giờ tình nguyện', v.hours],
          ['Ca sắp tới', regs.filter(TABS[0][2]).length],
          ['Chờ duyệt', regs.filter(TABS[1][2]).length]
        ].map((k) => h('div', { class: 'card kpi' }, h('b', null, k[1]), h('span', null, k[0])))
      );
      tabsEl.innerHTML = '';

      TABS.forEach(
        (t) => tabsEl.append(
          h(
            'button',
            {
              type: 'button',
              role: 'tab',
              'aria-selected': t[0] === tab,
              onclick: () => {
                tab = t[0];
                render();
              }
            },
            t[1] + ' (' + regs.filter(t[2]).length + ')'
          )
        )
      );

      const rows = regs.filter(TABS.find((t) => t[0] === tab)[2]);
      if (!rows.length)
        return state(list, 'empty', {
          icon: '📅',
          title: 'Chưa có ca nào',
          message: 'Hãy tìm cơ hội phù hợp và đăng ký ca đầu tiên.',
          action: {
            label: 'Tìm cơ hội',
            fn: () => (location.href = VL.path.page('volunteer-opportunity-search'))
          }
        });
      list.innerHTML = '';
      list.append(
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
                ['Hoạt động', 'Thời gian', 'Trạng thái', 'Thao tác'].map((x) => h('th', null, x))
              )
            ),
            h(
              'tbody',
              null,
              rows.map(
                (r) => h(
                  'tr',
                  null,
                  h(
                    'td',
                    { 'data-label': 'Hoạt động' },
                    h('b', null, r.shift.opp.title),
                    h('div', { class: 'mut' }, r.shift.org.name)
                  ),
                  h('td', { 'data-label': 'Thời gian' }, Q.fmtShift(r.shift)),
                  h(
                    'td',
                    { 'data-label': 'Trạng thái' },
                    badge(r.status),
                    r.status === 'completed' ? h('div', { class: 'hint' }, r.hours + ' giờ') : null,
                    r.rejectReason ? h('div', { class: 'hint' }, 'Lý do: ' + r.rejectReason) : null,
                    r.note ? h('div', { class: 'hint' }, 'Ghi chú: ' + r.note) : null
                  ),
                  h(
                    'td',
                    { 'data-label': 'Thao tác' },
                    h(
                      'div',
                      { class: 'acts' },
                      ['pending', 'confirmed'].includes(r.status)
                        ? h(
                          'button',
                          { class: 'btn sm lnk-bad', onclick: () => cancel(r) },
                          'Hủy đăng ký'
                        )
                        : null,
                      r.status === 'pending'
                        ? h(
                          'button',
                          { class: 'btn sm', onclick: () => editNote(r) },
                          'Sửa ghi chú'
                        )
                        : null,
                      ['cancelled', 'rejected'].includes(r.status)
                        ? h('button', { class: 'btn sm lnk-bad', onclick: () => del(r) }, 'Xóa')
                        : null
                    )
                  )
                )
              )
            )
          )
        )
      );
    }

    async function cancel(r) {
      const reason = await VL.ui.confirm({
        title: 'Hủy đăng ký?',
        message: 'Bạn sẽ hủy ca "' + r.shift.opp.title + '" ngày ' + U.fmtDate(r.shift.date) + '.',
        reason: true,
        reasonLabel: 'Lý do hủy',
        danger: true,
        confirmLabel: 'Hủy đăng ký'
      });
      if (!reason) return;

      try {
        await VL.api.run(() => {
          S.update('registrations', r.id, { status: 'cancelled', note: reason });
          Q.syncShift(r.shiftId);
          S.notify(
            S.userOfOrg(r.shift.opp.orgId),
            session.name + ' đã hủy ca "' + r.shift.opp.title + '": ' + reason,
            'organization-volunteer-roster'
          );
        });

        VL.ui.toast('Đã hủy đăng ký.');
        load();
      } catch (e) {
        VL.ui.toast(e.message, 'bad');
      }
    }

    function editNote(r) {
      const ta = h('textarea', { name: 'note', rows: 3, maxlength: 200 });
      ta.value = r.note;

      VL.ui.modal({
        title: 'Sửa ghi chú đăng ký',
        body: field('Ghi chú', ta),
        onSubmit: () => {
          if (ta.value.length > 200) {
            V.setError(ta, 'Tối đa 200 ký tự.');
            return false;
          }

          return VL.api.run(() => S.update('registrations', r.id, { note: ta.value.trim() }));
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã cập nhật ghi chú.');
          load();
        }
      });
    }

    async function del(r) {
      if (!(await VL.ui.confirm({
        title: 'Xóa bản ghi?',
        message: 'Bản ghi đăng ký này sẽ bị xóa vĩnh viễn khỏi lịch sử của bạn.',
        danger: true,
        confirmLabel: 'Xóa'
      }))) return;

      try {
        await VL.api.run(() => S.remove('registrations', r.id));
        VL.ui.toast('Đã xóa.');
        load();
      } catch (e) {
        VL.ui.toast(e.message, 'bad');
      }
    }

    load();
  };

  // 4. AI-1: Volunteer Matcher
  VL.pages['volunteer-ai-matcher'] = function(session) {
    const v = me(session),
      f = document.getElementById('mf'),
      skillsBox = document.getElementById('skills-box'),
      availBox = document.getElementById('avail-box'),
      err = document.getElementById('mf-err');

    const KEY = 'vl_saved_matches_' + session.userId,
      saved = () => JSON.parse(localStorage.getItem(KEY) || '[]');

    function fillFromProfile() {
      const p = me(session);
      skillsBox.innerHTML = '';
      skillsBox.append(skillChecks(p.skills));
      availBox.innerHTML = '';
      availBox.append(availGrid(p.availability, true));
    }

    fillFromProfile();
    document.getElementById('from-profile').addEventListener('click', fillFromProfile);
    const WEIGHTS = [
      { skill: 0.6, time: 0.3, exp: 0.1 },
      { skill: 0.3, time: 0.6, exp: 0.1 },
      { skill: 0.75, time: 0.15, exp: 0.1 }
    ];

    function compute(input, w) {
      const tmp = Object.assign({}, v, { skills: input.skills, availability: input.availability });
      const items = S.where('shifts', (s) =>
        s.status === 'open' && s.date >= U.today() && s.date <= U.addDays(input.days)
      )
        .filter((s) => !canRegister(tmp, s))
        .map((s) => ({ shift: Q.shiftView(s), sc: VL.ai.matchScore(tmp, s, w) }))
        .filter((x) => x.sc.score >= 30)
        .sort((a, b) => b.sc.score - a.sc.score)
        .slice(0, 5);
      return items;
    }

    function build(input, w, attempt) {
      const items = compute(input, w);
      if (!items.length)
        return {
          status: 'insufficient',
          message: 'Không đủ dữ liệu để đưa ra đề xuất. Hãy thêm kỹ năng hoặc khung giờ rảnh.'
        };
      const conf = Math.min(
        0.95,
        0.35 + VL.ai.completeness(tmpVol(input)) * 0.45 + items[0].sc.score / 400
      );
      return {
        status: conf < 0.6 ? 'uncertain' : 'ok',
        confidence: conf,
        message: 'Hồ sơ chưa đủ thông tin để chắc chắn.',
        input,
        weights: w,
        attempt,
        data: { items, sel: items.map((x) => x.shift.id) },
        why: items[0].sc.why.map(
          (x) => Object.assign({}, x, { label: x.label + ' (ca #1)' })
        ).concat([
          {
            tone: 'ok',
            label: 'Trọng số',
            detail: 'Kỹ năng ' +
              Math.round(w.skill * 100) +
              '% · lịch rảnh ' +
              Math.round(w.time * 100) +
              '% · kinh nghiệm ' +
              Math.round(w.exp * 100) +
              '%.'
          }
        ])
      };
    }

    const tmpVol = (i) => ({ skills: i.skills, availability: i.availability, bio: v.bio });

    const flow = VL.ai.flow(document.getElementById('ai-root'), {
      id: 'AI-1',
      title: 'Volunteer Matcher',
      idle: 'Chọn kỹ năng, lịch rảnh rồi bấm "Gợi ý ca phù hợp".',
      steps: [
        'Đang đọc kỹ năng & lịch rảnh…',
        'Đang đối chiếu với các ca còn chỗ…',
        'Đang xếp hạng độ phù hợp…'
      ],
      run: (attempt) => build(readInput(), WEIGHTS[attempt % WEIGHTS.length], attempt),
      manual: () => {
        location.href = VL.path.page('volunteer-opportunity-search');
      },
      renderResult(res) {
        return h(
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
                h('b', null, x.shift.opp.title),
                h('div', { class: 'mut' }, Q.fmtShift(x.shift) + ' · ' + x.shift.org.name),
                h('div', { class: 'hint' }, x.sc.why[0].detail)
              ),
              h('span', { class: 'score' }, x.sc.score + '%')
            )
          )
        );
      },
      accept(res) {
        const picked = res.data.items.filter((x) => res.data.sel.includes(x.shift.id));
        if (!picked.length) throw new Error('Hãy chọn ít nhất một ca để đăng ký.');

        picked.forEach(
          (x, i) => picked.slice(0, i).forEach((y) => {
            if (U.overlap(x.shift, y.shift)) throw new Error('Hai ca được chọn trùng giờ nhau.');
          })
        );

        picked.forEach((x) => register(v, S.find('shifts', x.shift.id), 'Đăng ký từ gợi ý AI'));
      },
      acceptMsg: 'Đã đăng ký các ca đã chọn – chờ tổ chức xác nhận.',
      acceptedText: 'Đã gửi đăng ký các ca được chọn. Xem tại "Ca của tôi".',
      save(res) {
        const ids = saved()
          .filter((x) => !res.data.items.some((i) => i.shift.id === x))
          .concat(res.data.sel);
        localStorage.setItem(KEY, JSON.stringify(ids));
        renderSaved();
      },
      edit(res) {
        return new Promise((resolve) => {
          const sl = (n, label) => field(
            label + ' (%)',
            h('input', {
              type: 'range',
              name: n,
              min: 0,
              max: 100,
              value: Math.round(res.weights[n] * 100)
            })
          );

          VL.ui.modal({
            title: 'Điều chỉnh trọng số ghép',
            body: h(
              'div',
              null,
              h(
                'p',
                { class: 'mut' },
                'Thay đổi mức ưu tiên giữa kỹ năng, lịch rảnh và kinh nghiệm.'
              ),
              sl('skill', 'Kỹ năng'),
              sl('time', 'Lịch rảnh'),
              sl('exp', 'Kinh nghiệm')
            ),
            submitLabel: 'Tính lại',
            onSubmit: (form) => {
              const w = {
                skill: +form.elements.skill.value,
                time: +form.elements.time.value,
                exp: +form.elements.exp.value
              };

              if (w.skill + w.time + w.exp === 0) {
                VL.ui.toast('Cần ít nhất một trọng số lớn hơn 0.', 'bad');
                return false;
              }

              return w;
            }
          }).then((w) => resolve(w ? build(res.input, w, res.attempt) : null));
        });
      }
    });

    function readInput() {
      return {
        skills: readSkills(skillsBox),
        availability: readAvail(availBox),
        days: +f.elements.days.value
      };
    }

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const i = readInput();

      if (!i.skills.length && !DAYS.some((d) => i.availability[d].length)) {
        err.textContent = 'Chọn ít nhất 1 kỹ năng hoặc 1 khung giờ rảnh.';
        return;
      }

      err.textContent = '';
      flow.start();
    });

    function renderSaved() {
      const box = document.getElementById('saved'),
        ids = saved(),
        shifts = ids.map((id) => S.find('shifts', id)).filter(Boolean);

      box.innerHTML = '';
      if (!shifts.length)
        return box.append(h('p', { class: 'mut' }, 'Chưa có gợi ý nào được lưu.'));

      box.append(
        h(
          'div',
          { class: 'list' },
          shifts.map((s) => {
            const sv = Q.shiftView(s);

            return h(
              'div',
              { class: 'item row between' },
              h('div', null, h('b', null, sv.opp.title), h('div', { class: 'mut' }, Q.fmtShift(s))),
              h(
                'button',
                {
                  class: 'btn sm lnk-bad',
                  onclick: () => {
                    localStorage.setItem(KEY, JSON.stringify(saved().filter((x) => x !== s.id)));
                    renderSaved();
                  }
                },
                'Bỏ lưu'
              )
            );
          })
        )
      );
    }

    renderSaved();
  };
})();
