window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, chips } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store,
    Q = VL.q,
    O = VL.org;

  VL.pages['organization-opportunity-management'] = function(session) {
    const R = O.regions(),
      f = document.getElementById('flt'),
      org = session.refId;

    let data = [];

    function load() {
      R.showStatus('loading');

      VL.api.run(
        () => O.myOpps(org).map(
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
        .catch((e) => R.showStatus('error', { message: e.message, retry: load }));
    }

    function render() {
      const q = U.norm(f.elements.q.value),
        st = f.elements.status.value;

      const r = data.filter((p) =>
        (!q || U.norm(p.title + p.location).includes(q)) && (!st || p.status === st)
      );
      if (!data.length)
        return R.showStatus('empty', {
          icon: '📋',
          title: 'Chưa có hoạt động nào',
          message: 'Tạo hoạt động đầu tiên để bắt đầu tuyển tình nguyện viên.',
          action: { label: '+ Tạo hoạt động', fn: () => edit() }
        });
      if (!r.length)
        return R.showStatus('empty', { icon: '🔎', title: 'Không có hoạt động khớp bộ lọc' });

      R.showTable();
      R.rows.innerHTML = '';
      r.forEach((p) => R.rows.append(row(p)));
    }

    function row(p) {
      return h(
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
        h('td', { 'data-label': 'Ca / Đăng ký' }, p.shifts + ' ca · ' + p.regs + ' đăng ký'),
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

      const body = O.formFrom('tpl-opp');
      body.querySelector('[name="title"]').value = p.title;
      body.querySelector('[name="categoryId"]').append(
        ...VL.ui.options(Q.active(S.all('categories')), p.categoryId, '— Chọn lĩnh vực —')
      );
      body.querySelector('[name="location"]').value = p.location;
      body.querySelector('[name="description"]').value = p.description;
      O.fillSkills(body, p.requiredSkills);
      body.querySelector('[name="status"]').value =
        isNew || p.status === 'draft' ? 'draft' : 'open';
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
              requiredSkills: O.readSkills(form),
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
})();