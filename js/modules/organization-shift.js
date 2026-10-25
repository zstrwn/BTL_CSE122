window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, bar } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store,
    Q = VL.q,
    O = VL.org;

  VL.pages['organization-shift-management'] = function(session) {
    const R = O.regions(),
      f = document.getElementById('flt'),
      org = session.refId;

    const opps = O.myOpps(org)
    .filter((p) => p.status !== 'archived')
    .map((p) => ({ id: p.id, name: p.title }));
    f.elements.opp.append(...VL.ui.options(opps, U.qs('opp') || '', 'Tất cả hoạt động'));
    let data = [];

    function load() {
      R.showStatus('loading');

      VL.api.run(() => O.myShifts(org).map(Q.shiftView).sort((a, b) => b.date.localeCompare(a.date)))
        .then((d) => {
          data = d;
          render();
        })
        .catch((e) => R.showStatus('error', { message: e.message, retry: load }));
    }

    function render() {
      const o = f.elements.opp.value,
        st = f.elements.status.value,
        r = data.filter((s) => (!o || s.oppId === o) && (!st || s.status === st));

      if (!r.length)
        return R.showStatus('empty', {
          icon: '🕒',
          title: 'Chưa có ca nào',
          message: 'Tạo ca để tình nguyện viên có thể đăng ký.',
          action: { label: '+ Tạo ca', fn: () => edit() }
        });

      R.showTable();
      R.rows.innerHTML = '';
      r.forEach((s) => R.rows.append(row(s)));
    }

    function row(s) {
      return h(
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

      const body = O.formFrom('tpl-shift');
      body.querySelector('[name="oppId"]').append(
        ...VL.ui.options(opps, s.oppId, '— Chọn hoạt động —')
      );
      const dateEl = body.querySelector('[name="date"]');
      dateEl.min = U.today();
      dateEl.value = s.date;
      body.querySelector('[name="start"]').value = s.start;
      body.querySelector('[name="end"]').value = s.end;
      const capEl = body.querySelector('[name="capacity"]');
      capEl.value = s.capacity;
      capEl.min = 1;
      capEl.max = 200;
      O.fillSkills(body, s.requiredSkills);
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
              requiredSkills: O.readSkills(form)
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
})();