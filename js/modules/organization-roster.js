window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store,
    Q = VL.q,
    O = VL.org;

  VL.pages['organization-volunteer-roster'] = function(session) {
    const R = O.regions(),
      f = document.getElementById('flt'),
      org = session.refId;

    f.elements.shift.append(
      ...O.myShifts(org)
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
      R.showStatus('loading');

      VL.api.run(() => {
        const ids = O.myShifts(org).map((s) => s.id);
        return S.where('registrations', (r) => ids.includes(r.shiftId)).map(Q.regView);
      })
        .then((d) => {
          data = d;
          render();
        })
        .catch((e) => R.showStatus('error', { message: e.message, retry: load }));
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
        return R.showStatus('empty', {
          icon: '👥',
          title: 'Chưa có tình nguyện viên nào',
          message: 'Đăng ký mới sẽ xuất hiện tại đây, hoặc bạn có thể thêm thủ công.',
          action: { label: '+ Thêm tình nguyện viên', fn: add }
        });

      R.showTable();
      R.rows.innerHTML = '';
      r.forEach((x) => R.rows.append(row(x)));
    }

    function row(x) {
      return h(
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

      const body = O.formFrom('tpl-hours');
      const inp = body.querySelector('[name="hours"]');
      inp.value = U.hoursOf(x.shift);

      VL.ui.modal({
        title: 'Ghi nhận giờ – ' + x.vol.name,
        body,
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
      const shifts = O.myShifts(org)
        .filter((s) => s.status === 'open' && s.date >= U.today())
        .map(Q.shiftView);

      const body = O.formFrom('tpl-add');
      body.querySelector('[name="vol"]').append(
        ...VL.ui.options(Q.active(S.all('volunteers')), '', '— Chọn tình nguyện viên —')
      );
      body.querySelector('[name="shift"]').append(
        h('option', { value: '' }, '— Chọn ca —'),
        ...shifts.map((s) => h('option', { value: s.id }, Q.fmtShift(s) + ' – ' + s.opp.title))
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
})();