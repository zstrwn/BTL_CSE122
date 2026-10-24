/* Vai trò TỔ CHỨC XÃ HỘI: quản lý hoạt động, ca, danh sách tình nguyện viên, hồ sơ tổ chức */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, state, field, chips, bar } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store,
    Q = VL.q;

  const skillChecks = (sel) => h(
    'div',
    { class: 'checks' },
    Q.active(S.all('skills')).map(
      (k) => h(
        'label',
        null,
        h('input', { type: 'checkbox', name: 'skills', value: k.id, checked: sel.includes(k.id) }),
        k.name
      )
    )
  );
  const readSkills = (root) => Array.from(root.querySelectorAll('[name=skills]:checked')).map((i) =>
    i.value
  );
  const myOpps = (org) => S.where('opportunities', (p) => p.orgId === org);

  const myShifts = (org) => {
    const ids = myOpps(org).map((p) => p.id);
    return S.where('shifts', (s) => ids.includes(s.oppId));
  };

  // 1. Quản lý hoạt động
  VL.pages['organization-opportunity-management'] = function(session) {
    const list = document.getElementById('list'),
      f = document.getElementById('flt'),
      org = session.refId;

    let data = [];

    function load() {
      state(list, 'loading');

      VL.api.run(
        () => myOpps(org).map(
          (p) => Object.assign(
            {},
            p,
            {
              cat: S.find('categories', p.categoryId) || {},
              shifts: S.where('shifts', (s) => s.oppId === p.id).length,
              regs: S.where('registrations', (r) =>
                S.find('shifts', r.shiftId) && S.find('shifts', r.shiftId).oppId === p.id
              ).length
            }
          )
        )
      )
        .then((d) => {
          data = d;
          render();
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    function render() {
      const q = U.norm(f.elements.q.value),
        st = f.elements.status.value;

      const r = data.filter((p) =>
        (!q || U.norm(p.title + p.location).includes(q)) && (!st || p.status === st)
      );
      if (!data.length)
        return state(list, 'empty', {
          icon: '📋',
          title: 'Chưa có hoạt động nào',
          message: 'Tạo hoạt động đầu tiên để bắt đầu tuyển tình nguyện viên.',
          action: { label: '+ Tạo hoạt động', fn: () => edit() }
        });
      if (!r.length)
        return state(list, 'empty', { icon: '🔎', title: 'Không có hoạt động khớp bộ lọc' });
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
                ['Hoạt động', 'Trạng thái', 'Ca / Đăng ký', 'Thao tác'].map((x) => h('th', null, x))
              )
            ),
            h(
              'tbody',
              null,
              r.map(
                (p) => h(
                  'tr',
                  null,
                  h(
                    'td',
                    { 'data-label': 'Hoạt động' },
                    h('b', null, p.title),
                    h('div', { class: 'mut' }, p.cat.name + ' · ' + p.location),
                    chips(S.skillNames(p.requiredSkills))
                  ),
                  h(
                    'td',
                    { 'data-label': 'Trạng thái' },
                    badge(p.status),
                    ' ',
                    p.status !== 'draft' && p.moderation !== 'approved'
                      ? badge(p.moderation, 'mod')
                      : null,
                    p.moderation === 'rejected' && p.rejectReason
                      ? h('div', { class: 'hint' }, 'Lý do từ chối: ' + p.rejectReason)
                      : null
                  ),
                  h(
                    'td',
                    { 'data-label': 'Ca / Đăng ký' },
                    p.shifts + ' ca · ' + p.regs + ' đăng ký'
                  ),
                  h(
                    'td',
                    { 'data-label': 'Thao tác' },
                    h(
                      'div',
                      { class: 'acts' },
                      h('button', { class: 'btn sm', onclick: () => edit(p) }, 'Sửa'),
                      p.status === 'open'
                        ? h(
                          'button',
                          {
                            class: 'btn sm',
                            onclick: () => setStatus(p, 'closed', 'Đã đóng nhận đăng ký.')
                          },
                          'Đóng'
                        )
                        : null,
                      ['closed', 'archived'].includes(p.status)
                        ? h(
                          'button',
                          {
                            class: 'btn sm',
                            onclick: () => setStatus(p, 'open', 'Đã mở lại hoạt động.')
                          },
                          'Mở lại'
                        )
                        : null,
                      p.status !== 'archived'
                        ? h(
                          'button',
                          {
                            class: 'btn sm',
                            onclick: () => setStatus(p, 'archived', 'Đã lưu trữ hoạt động.')
                          },
                          'Lưu trữ'
                        )
                        : null,
                      h('button', { class: 'btn sm lnk-bad', onclick: () => del(p) }, 'Xóa')
                    )
                  )
                )
              )
            )
          )
        )
      );
    }

    async function setStatus(p, st, msg) {
      try {
        await VL.api.run(() => {
          S.update('opportunities', p.id, { status: st });
          S.audit('Đổi trạng thái hoạt động → ' + st, p.title);
        });

        VL.ui.toast(msg);
        load();
      } catch (e) {
        VL.ui.toast(e.message, 'bad');
      }
    }

    async function del(p) {
      if (p.shifts) return VL.ui.toast('Hoạt động đã có ca – hãy "Lưu trữ" thay vì xóa.', 'bad');
      if (!(await VL.ui.confirm({
        title: 'Xóa hoạt động?',
        message: 'Xóa vĩnh viễn "' + p.title + '"? Thao tác không thể hoàn tác.',
        danger: true,
        confirmLabel: 'Xóa'
      }))) return;

      await VL.api.run(() => {
        S.remove('opportunities', p.id);
        S.audit('Xóa hoạt động', p.title);
      });

      VL.ui.toast('Đã xóa hoạt động.');
      load();
    }

    function edit(p) {
      const isNew = !p;
      p = p ||
        {
          title: '',
          categoryId: '',
          location: '',
          description: '',
          requiredSkills: [],
          status: 'draft'
        };
      const desc = h('textarea', { name: 'description', rows: 4 });
      desc.value = p.description;
      const sel = h(
        'select',
        { name: 'status' },
        [['draft', 'Nháp (chưa công khai)'], ['open', 'Gửi duyệt & mở đăng ký']].map(
          (o) => h(
            'option',
            {
              value: o[0],
              selected: p.status === o[0] ||
                (o[0] === 'open' && !['draft'].includes(p.status) && !isNew)
            },
            o[1]
          )
        )
      );
      const body = h(
        'div',
        null,
        field('Tên hoạt động', h('input', { name: 'title', value: p.title, maxlength: 100 })),
        field(
          'Lĩnh vực',
          h(
            'select',
            { name: 'categoryId' },
            VL.ui.options(Q.active(S.all('categories')), p.categoryId, '— Chọn lĩnh vực —')
          )
        ),
        field('Địa điểm', h('input', { name: 'location', value: p.location })),
        field('Mô tả (20–500 ký tự)', desc),
        h('fieldset', null, h('legend', null, 'Kỹ năng yêu cầu'), skillChecks(p.requiredSkills)),
        field(
          'Trạng thái',
          sel,
          'Hoạt động mở sẽ được quản trị viên kiểm duyệt trước khi hiển thị.'
        )
      );
      const rules = {
        title: [V.required('Vui lòng nhập tên hoạt động.'), V.min(5, 'Tên tối thiểu 5 ký tự.')],
        categoryId: [V.required('Chọn một lĩnh vực.')],
        location: [V.required('Vui lòng nhập địa điểm.')],
        description: [
          V.required('Vui lòng nhập mô tả.'),
          V.min(20, 'Mô tả tối thiểu 20 ký tự.'),
          V.max(500)
        ]
      };

      VL.ui.modal({
        title: isNew ? 'Tạo hoạt động' : 'Sửa hoạt động',
        body,
        wide: true,
        submitLabel: isNew ? 'Tạo' : 'Lưu',
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            const rec = {
              title: v.title.trim(),
              categoryId: v.categoryId,
              location: v.location.trim(),
              description: v.description.trim(),
              requiredSkills: readSkills(form),
              status: v.status
            };

            if (v.status === 'open' && p.moderation !== 'approved') {
              rec.moderation = 'pending';
              rec.rejectReason = '';
              S.notifyRole(
                'admin',
                'Hoạt động "' + rec.title + '" chờ kiểm duyệt.',
                'admin-moderation'
              );
            }

            if (isNew) {
              rec.orgId = org;
              rec.moderation = rec.moderation || 'none';
              rec.createdAt = new Date().toISOString();
              S.add('opportunities', rec);
              S.audit('Tạo hoạt động', rec.title);
            } else {
              S.update('opportunities', p.id, rec);
              S.audit('Sửa hoạt động', rec.title);
            }
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast(isNew ? 'Đã tạo hoạt động.' : 'Đã lưu thay đổi.');
          load();
        }
      });
    }

    document.getElementById('new').addEventListener('click', () => edit());
    f.addEventListener('input', U.debounce(render, 200));

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') render();
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };

  // 2. Quản lý ca
  VL.pages['organization-shift-management'] = function(session) {
    const list = document.getElementById('list'),
      f = document.getElementById('flt'),
      org = session.refId;

    const opps = myOpps(org).filter((p) => p.status !== 'archived');
    f.elements.opp.append(...VL.ui.options(opps, U.qs('opp') || '', 'Tất cả hoạt động'));
    let data = [];

    function load() {
      state(list, 'loading');

      VL.api.run(() => myShifts(org).map(Q.shiftView).sort((a, b) => b.date.localeCompare(a.date)))
        .then((d) => {
          data = d;
          render();
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    function render() {
      const o = f.elements.opp.value,
        st = f.elements.status.value,
        r = data.filter((s) => (!o || s.oppId === o) && (!st || s.status === st));

      if (!r.length)
        return state(list, 'empty', {
          icon: '🕒',
          title: 'Chưa có ca nào',
          message: 'Tạo ca để tình nguyện viên có thể đăng ký.',
          action: { label: '+ Tạo ca', fn: () => edit() }
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
                ['Ca', 'Lấp đầy', 'Trạng thái', 'Thao tác'].map((x) => h('th', null, x))
              )
            ),
            h(
              'tbody',
              null,
              r.map(
                (s) => h(
                  'tr',
                  null,
                  h(
                    'td',
                    { 'data-label': 'Ca' },
                    h('b', null, Q.fmtShift(s)),
                    h('div', { class: 'mut' }, s.opp.title)
                  ),
                  h(
                    'td',
                    { 'data-label': 'Lấp đầy' },
                    h(
                      'div',
                      { class: 'row' },
                      bar(
                        Math.round(s.filled / s.capacity * 100),
                        s.filled / s.capacity < 0.5 ? 'warn' : ''
                      ),
                      h('small', null, s.filled + '/' + s.capacity)
                    ),
                    s.pending ? h('div', { class: 'hint' }, s.pending + ' chờ duyệt') : null
                  ),
                  h('td', { 'data-label': 'Trạng thái' }, badge(s.status, 'shift')),
                  h(
                    'td',
                    { 'data-label': 'Thao tác' },
                    h(
                      'div',
                      { class: 'acts' },
                      ['open', 'full'].includes(s.status)
                        ? h('button', { class: 'btn sm', onclick: () => edit(s) }, 'Sửa')
                        : null,
                      ['open', 'full'].includes(s.status) && s.date <= U.today()
                        ? h('button', { class: 'btn sm', onclick: () => finish(s) }, 'Hoàn thành')
                        : null,
                      ['open', 'full'].includes(s.status)
                        ? h(
                          'button',
                          { class: 'btn sm lnk-bad', onclick: () => cancel(s) },
                          'Hủy ca'
                        )
                        : null,
                      h('button', { class: 'btn sm lnk-bad', onclick: () => del(s) }, 'Xóa')
                    )
                  )
                )
              )
            )
          )
        )
      );
    }

    function edit(s) {
      const isNew = !s;
      s = s ||
        {
          oppId: f.elements.opp.value,
          date: '',
          start: '08:00',
          end: '12:00',
          capacity: 10,
          requiredSkills: []
        };
      if (!opps.length) return VL.ui.toast('Hãy tạo một hoạt động trước khi tạo ca.', 'bad');
      const body = h(
        'div',
        null,
        field(
          'Hoạt động',
          h('select', { name: 'oppId' }, VL.ui.options(opps, s.oppId, '— Chọn hoạt động —'))
        ),
        field('Ngày', h('input', { type: 'date', name: 'date', value: s.date, min: U.today() })),
        h(
          'div',
          { class: 'row' },
          h(
            'div',
            { style: 'flex:1' },
            field('Bắt đầu', h('input', { type: 'time', name: 'start', value: s.start }))
          ),
          h(
            'div',
            { style: 'flex:1' },
            field('Kết thúc', h('input', { type: 'time', name: 'end', value: s.end }))
          )
        ),
        field(
          'Số chỗ (1–200)',
          h('input', { type: 'number', name: 'capacity', value: s.capacity, min: 1, max: 200 })
        ),
        h(
          'fieldset',
          null,
          h('legend', null, 'Kỹ năng riêng cho ca (bỏ trống = theo hoạt động)'),
          skillChecks(s.requiredSkills)
        )
      );
      const filled = isNew ? 0 : S.filled(s.id);
      const rules = {
        oppId: [V.required('Chọn hoạt động.')],
        date: [V.required('Chọn ngày.'), V.futureDate],
        start: [V.required('Chọn giờ bắt đầu.')],
        end: [
          V.required('Chọn giờ kết thúc.'),
          V.custom(
            (v, fm) => (v && fm.elements.start.value && U.mins(v) <= U.mins(fm.elements.start.value)
              ? 'Giờ kết thúc phải sau giờ bắt đầu.'
              : '')
          )
        ],
        capacity: [
          V.num(1, 200, 'Số chỗ từ 1 đến 200.'),
          V.custom((v) => (+v < filled ? 'Không thể nhỏ hơn số đã xác nhận (' + filled + ').' : ''))
        ]
      };

      VL.ui.modal({
        title: isNew ? 'Tạo ca' : 'Sửa ca',
        body,
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            const rec = {
              oppId: v.oppId,
              date: v.date,
              start: v.start,
              end: v.end,
              capacity: +v.capacity,
              requiredSkills: readSkills(form)
            };

            if (isNew) {
              S.add('shifts', Object.assign(rec, { status: 'open' }));
              S.audit('Tạo ca', v.date);
            } else {
              S.update('shifts', s.id, rec);
              Q.syncShift(s.id);
              S.audit('Sửa ca', v.date);
            }
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast(isNew ? 'Đã tạo ca.' : 'Đã lưu ca.');
          load();
        }
      });
    }

    async function cancel(s) {
      const reason = await VL.ui.confirm({
        title: 'Hủy ca?',
        message: 'Các tình nguyện viên đã đăng ký sẽ được thông báo.',
        reason: true,
        reasonLabel: 'Lý do hủy ca',
        danger: true,
        confirmLabel: 'Hủy ca'
      });
      if (!reason) return;

      await VL.api.run(() => {
        S.update('shifts', s.id, { status: 'cancelled' });

        S.where('registrations', (r) =>
          r.shiftId === s.id && ['pending', 'confirmed'].includes(r.status)
        ).forEach((r) => {
          S.update('registrations', r.id, {
            status: 'cancelled',
            note: 'Tổ chức hủy ca: ' + reason
          });
          S.notify(
            S.userOfVolunteer(r.volunteerId),
            'Ca "' + s.opp.title + '" ngày ' + U.fmtDate(s.date) + ' đã bị hủy: ' + reason,
            'volunteer-my-shifts'
          );
        });

        S.audit('Hủy ca', s.opp.title);
      });

      VL.ui.toast('Đã hủy ca và thông báo cho tình nguyện viên.');
      load();
    }

    async function finish(s) {
      await VL.api.run(() => {
        S.update('shifts', s.id, { status: 'done' });
        S.audit('Hoàn thành ca', s.opp.title);
      });

      VL.ui.toast('Ca đã chuyển sang "Đã diễn ra". Hãy ghi nhận giờ ở Danh sách TNV.');
      load();
    }

    async function del(s) {
      if (S.where('registrations', (r) => r.shiftId === s.id).length)
        return VL.ui.toast('Ca đã có đăng ký – hãy "Hủy ca" thay vì xóa.', 'bad');
      if (!(await VL.ui.confirm({
        title: 'Xóa ca?',
        message: 'Ca ngày ' + U.fmtDate(s.date) + ' sẽ bị xóa.',
        danger: true,
        confirmLabel: 'Xóa'
      }))) return;
      await VL.api.run(() => S.remove('shifts', s.id));
      VL.ui.toast('Đã xóa ca.');
      load();
    }

    document.getElementById('new').addEventListener('click', () => edit());

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') render();
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };

  // 3. Danh sách tình nguyện viên (roster)
  VL.pages['organization-volunteer-roster'] = function(session) {
    const list = document.getElementById('list'),
      f = document.getElementById('flt'),
      org = session.refId;

    f.elements.shift.append(
      ...myShifts(org)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (s) => h(
            'option',
            { value: s.id },
            U.fmtDate(s.date) + ' – ' + (S.find('opportunities', s.oppId) || {}).title
          )
        )
    );
    let data = [];

    function load() {
      state(list, 'loading');

      VL.api.run(() => {
        const ids = myShifts(org).map((s) => s.id);
        return S.where('registrations', (r) => ids.includes(r.shiftId)).map(Q.regView);
      })
        .then((d) => {
          data = d;
          render();
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    const filtered = () => {
      const q = U.norm(f.elements.q.value),
        sh = f.elements.shift.value,
        st = f.elements.status.value;

      return data.filter((r) =>
        (!q || U.norm(r.vol.name).includes(q)) &&
          (!sh || r.shiftId === sh) &&
          (!st || r.status === st)
      );
    };

    function render() {
      const r = filtered();
      if (!r.length)
        return state(list, 'empty', {
          icon: '👥',
          title: 'Chưa có tình nguyện viên nào',
          message: 'Đăng ký mới sẽ xuất hiện tại đây, hoặc bạn có thể thêm thủ công.',
          action: { label: '+ Thêm tình nguyện viên', fn: add }
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
                ['Tình nguyện viên', 'Ca', 'Trạng thái', 'Thao tác'].map((x) => h('th', null, x))
              )
            ),
            h(
              'tbody',
              null,
              r.map(
                (x) => h(
                  'tr',
                  null,
                  h(
                    'td',
                    { 'data-label': 'Tình nguyện viên' },
                    h('b', null, x.vol.name),
                    h(
                      'div',
                      { class: 'mut' },
                      S.skillNames(x.vol.skills || []).join(', ') || 'Chưa khai báo kỹ năng'
                    ),
                    x.note ? h('div', { class: 'hint' }, 'Ghi chú: ' + x.note) : null
                  ),
                  h(
                    'td',
                    { 'data-label': 'Ca' },
                    Q.fmtShift(x.shift),
                    h('div', { class: 'mut' }, x.shift.opp.title)
                  ),
                  h(
                    'td',
                    { 'data-label': 'Trạng thái' },
                    badge(x.status),
                    x.status === 'completed' ? h('div', { class: 'hint' }, x.hours + ' giờ') : null
                  ),
                  h(
                    'td',
                    { 'data-label': 'Thao tác' },
                    h(
                      'div',
                      { class: 'acts' },
                      x.status === 'pending'
                        ? [
                          h(
                            'button',
                            { class: 'btn sm primary', onclick: () => confirmReg(x) },
                            'Xác nhận'
                          ),
                          h(
                            'button',
                            { class: 'btn sm lnk-bad', onclick: () => reject(x) },
                            'Từ chối'
                          )
                        ]
                        : null,
                      x.status === 'confirmed'
                        ? [
                          h(
                            'button',
                            { class: 'btn sm primary', onclick: () => complete(x) },
                            'Ghi giờ'
                          ),
                          h('button', { class: 'btn sm', onclick: () => noShow(x) }, 'Vắng mặt')
                        ]
                        : null,
                      h('button', { class: 'btn sm lnk-bad', onclick: () => remove(x) }, 'Xóa')
                    )
                  )
                )
              )
            )
          )
        )
      );
    }

    const run = async (fn, msg) => {
      try {
        await VL.api.run(fn);
        VL.ui.toast(msg);
        load();
      } catch (e) {
        VL.ui.toast(e.message, 'bad');
      }
    };

    function confirmReg(x) {
      run(() => {
        if (S.filled(x.shiftId) >= x.shift.capacity)
          throw new Error('Ca đã đủ người, không thể xác nhận thêm.');
        S.update('registrations', x.id, { status: 'confirmed' });
        Q.syncShift(x.shiftId);
        S.notify(
          S.userOfVolunteer(x.volunteerId),
          'Đăng ký ca "' + x.shift.opp.title + '" đã được xác nhận.',
          'volunteer-my-shifts'
        );
      }, 'Đã xác nhận ' + x.vol.name + '.');
    }

    async function reject(x) {
      const reason = await VL.ui.confirm({
        title: 'Từ chối đăng ký?',
        message: 'Từ chối ' + x.vol.name + ' tham gia ca ngày ' + U.fmtDate(x.shift.date) + '.',
        reason: true,
        reasonLabel: 'Lý do từ chối',
        danger: true,
        confirmLabel: 'Từ chối'
      });
      if (!reason) return;

      run(() => {
        S.update('registrations', x.id, { status: 'rejected', rejectReason: reason });
        S.notify(
          S.userOfVolunteer(x.volunteerId),
          'Đăng ký ca "' + x.shift.opp.title + '" bị từ chối: ' + reason,
          'volunteer-my-shifts'
        );
      }, 'Đã từ chối đăng ký.');
    }

    function complete(x) {
      const inp = h('input', {
        type: 'number',
        name: 'hours',
        step: '0.5',
        min: 0.5,
        max: 24,
        value: U.hoursOf(x.shift)
      });

      VL.ui.modal({
        title: 'Ghi nhận giờ – ' + x.vol.name,
        body: field('Số giờ đóng góp', inp, 'Từ 0,5 đến 24 giờ.'),
        submitLabel: 'Ghi nhận',
        onSubmit: () => {
          if (V.num(0.5, 24)(inp.value)) {
            V.setError(inp, 'Nhập số giờ từ 0,5 đến 24.');
            return false;
          }

          return VL.api.run(() => {
            const hrs = +inp.value;
            S.update('registrations', x.id, { status: 'completed', hours: hrs });
            const v = S.find('volunteers', x.volunteerId);
            if (v) S.update('volunteers', v.id, { hours: (v.hours || 0) + hrs });
            S.notify(
              S.userOfVolunteer(x.volunteerId),
              'Bạn được ghi nhận ' + hrs + ' giờ cho "' + x.shift.opp.title + '". Cảm ơn bạn!',
              'volunteer-my-shifts'
            );
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã ghi nhận giờ tình nguyện.');
          load();
        }
      });
    }

    function noShow(x) {
      run(() => S.update('registrations', x.id, { status: 'no_show' }), 'Đã đánh dấu vắng mặt.');
    }

    async function remove(x) {
      if (!(await VL.ui.confirm({
        title: 'Xóa khỏi danh sách?',
        message: 'Xóa bản ghi của ' + x.vol.name + ' khỏi ca này?',
        danger: true,
        confirmLabel: 'Xóa'
      }))) return;

      run(() => {
        S.remove('registrations', x.id);
        Q.syncShift(x.shiftId);
      }, 'Đã xóa bản ghi.');
    }

    function add() {
      const shifts = myShifts(org)
        .filter((s) => s.status === 'open' && s.date >= U.today())
        .map(Q.shiftView);
      const body = h(
        'div',
        null,
        field(
          'Tình nguyện viên',
          h(
            'select',
            { name: 'vol' },
            VL.ui.options(Q.active(S.all('volunteers')), '', '— Chọn tình nguyện viên —')
          )
        ),
        field(
          'Ca',
          h(
            'select',
            { name: 'shift' },
            [h('option', { value: '' }, '— Chọn ca —')].concat(
              shifts.map((s) => h('option', { value: s.id }, Q.fmtShift(s) + ' – ' + s.opp.title))
            )
          )
        )
      );
      const rules = {
        vol: [V.required('Chọn tình nguyện viên.')],
        shift: [V.required('Chọn ca.')]
      };

      VL.ui.modal({
        title: 'Thêm tình nguyện viên vào ca',
        body,
        submitLabel: 'Thêm',
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            const vol = S.find('volunteers', v.vol),
              sh = S.find('shifts', v.shift);

            if (S.where('registrations', (r) =>
              r.shiftId === sh.id &&
                r.volunteerId === vol.id &&
                ['pending', 'confirmed'].includes(r.status)
            ).length) throw new Error('Tình nguyện viên đã có trong ca này.');
            if (VL.ai.conflicts(vol, sh))
              throw new Error('Tình nguyện viên bị trùng giờ với ca khác.');
            if (S.filled(sh.id) >= sh.capacity) throw new Error('Ca đã đủ người.');
            S.add('registrations', {
              shiftId: sh.id,
              volunteerId: vol.id,
              status: 'confirmed',
              hours: 0,
              note: 'Tổ chức thêm thủ công',
              createdAt: new Date().toISOString()
            });
            Q.syncShift(sh.id);
            S.notify(
              S.userOfVolunteer(vol.id),
              'Bạn được thêm vào ca "' + (S.find('opportunities', sh.oppId) || {}).title + '".',
              'volunteer-my-shifts'
            );
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã thêm tình nguyện viên.');
          load();
        }
      });
    }

    document.getElementById('add').addEventListener('click', add);

    document.getElementById('export').addEventListener('click', () => {
      const r = filtered();
      if (!r.length) return VL.ui.toast('Không có dữ liệu để xuất.', 'bad');
      U.csv(
        'danh-sach-tnv.csv',
        [['Tình nguyện viên', 'Email', 'Hoạt động', 'Ngày', 'Trạng thái', 'Giờ']].concat(
          r.map(
            (x) => [x.vol.name, x.vol.email, x.shift.opp.title, x.shift.date, x.status, x.hours]
          )
        )
      );
    });

    f.addEventListener('input', U.debounce(render, 200));

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') render();
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };

  // 4. Hồ sơ tổ chức
  VL.pages['organization-profile'] = function(session) {
    const view = document.getElementById('view'),
      org = session.refId;

    function render() {
      state(view, 'loading');

      VL.api.run(() => S.find('organizations', org))
        .then((o) => {
          const opps = myOpps(org),
            shifts = myShifts(org);

          view.innerHTML = '';
          view.append(
            h(
              'div',
              { class: 'grid g2' },
              h(
                'section',
                { class: 'card', 'aria-labelledby': 'oi' },
                h('div', { class: 'row between' }, h('h2', { id: 'oi' }, o.name), badge(o.status)),
                h('p', null, o.mission || 'Chưa có giới thiệu.'),
                h('p', { class: 'mut' }, [o.email, o.phone, o.city].filter(Boolean).join(' · '))
              ),
              h(
                'section',
                { class: 'card' },
                h('h2', null, 'Hoạt động của tổ chức'),
                h(
                  'div',
                  { class: 'grid g4' },
                  [
                    [opps.length, 'Hoạt động'],
                    [shifts.length, 'Ca'],
                    [
                      S.where('registrations', (r) =>
                        shifts.some((s) => s.id === r.shiftId) && r.status === 'completed'
                      ).reduce((t, r) => t + r.hours, 0),
                      'Giờ đã ghi nhận'
                    ]
                  ].map(
                    (k) => h('div', { class: 'kpi' }, h('b', null, k[0]), h('span', null, k[1]))
                  )
                )
              )
            )
          );
        })
        .catch((e) => state(view, 'error', { message: e.message, retry: render }));
    }

    document.getElementById('edit').addEventListener('click', () => {
      const o = S.find('organizations', org),
        mi = h('textarea', { name: 'mission', rows: 3 });

      mi.value = o.mission;
      const body = h(
        'div',
        null,
        field('Tên tổ chức', h('input', { name: 'name', value: o.name })),
        field('Sứ mệnh (tối đa 300 ký tự)', mi),
        field('Email liên hệ', h('input', { name: 'email', type: 'email', value: o.email })),
        field('Điện thoại', h('input', { name: 'phone', value: o.phone })),
        field('Thành phố', h('input', { name: 'city', value: o.city }))
      );
      const rules = {
        name: [V.required('Vui lòng nhập tên tổ chức.'), V.min(3)],
        mission: [V.max(300, 'Tối đa 300 ký tự.')],
        email: [V.required('Vui lòng nhập email.'), V.email],
        phone: [V.phone]
      };

      VL.ui.modal({
        title: 'Sửa hồ sơ tổ chức',
        body,
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            S.update('organizations', org, {
              name: v.name.trim(),
              mission: v.mission.trim(),
              email: v.email.trim(),
              phone: v.phone.trim(),
              city: v.city.trim()
            });
            S.update('users', session.userId, { name: v.name.trim() });
            S.audit('Cập nhật hồ sơ tổ chức', v.name);
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
})();
