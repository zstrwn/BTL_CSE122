/* Quản trị viên – Quản lý người dùng: tạo, sửa, phê duyệt, khóa, đặt lại mật khẩu */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, badge, state, field } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store;

  const ROLES = VL.auth.ROLES;

  const run = async (fn, msg, done) => {
    try {
      await VL.api.run(fn);
      if (msg) VL.ui.toast(msg);
      done();
    } catch (e) {
      VL.ui.toast(e.message, 'bad');
    }
  };

  VL.pages['admin-user-management'] = function(session) {
    const list = document.getElementById('list'),
      f = document.getElementById('flt');

    function load() {
      state(list, 'loading');

      VL.api.run(() => S.all('users'))
        .then((rows) => {
          const q = U.norm(f.elements.q.value),
            ro = f.elements.role.value,
            st = f.elements.status.value,
            r = rows.filter((u) =>
              (!q || U.norm(u.name + u.email).includes(q)) &&
                (!ro || u.role === ro) &&
                (!st || u.status === st)
            );

          if (!r.length)
            return state(list, 'empty', { icon: '👤', title: 'Không tìm thấy người dùng' });
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
                    ['Người dùng', 'Vai trò', 'Trạng thái', 'Thao tác'].map((x) => h('th', null, x))
                  )
                ),
                h(
                  'tbody',
                  null,
                  r.map((u) => {
                    const self = u.id === session.userId;

                    return h(
                      'tr',
                      null,
                      h(
                        'td',
                        { 'data-label': 'Người dùng' },
                        h('b', null, u.name + (self ? ' (bạn)' : '')),
                        h('div', { class: 'mut' }, u.email)
                      ),
                      h('td', { 'data-label': 'Vai trò' }, ROLES[u.role].label),
                      h('td', { 'data-label': 'Trạng thái' }, badge(u.status)),
                      h(
                        'td',
                        { 'data-label': 'Thao tác' },
                        h(
                          'div',
                          { class: 'acts' },
                          u.status === 'pending'
                            ? h(
                              'button',
                              {
                                class: 'btn sm primary',
                                onclick: () => run(
                                  () => approve(u),
                                  'Đã phê duyệt ' + u.name + '.',
                                  load
                                )
                              },
                              'Phê duyệt'
                            )
                            : null,
                          h('button', { class: 'btn sm', onclick: () => edit(u) }, 'Sửa'),
                          !self && u.status !== 'pending'
                            ? h(
                              'button',
                              {
                                class: 'btn sm ' + (u.status === 'active' ? 'lnk-bad' : ''),
                                onclick: () => toggle(u)
                              },
                              u.status === 'active' ? 'Khóa' : 'Mở khóa'
                            )
                            : null,
                          h(
                            'button',
                            {
                              class: 'btn sm',
                              onclick: () => run(
                                () => {
                                  S.update('users', u.id, { password: '123456' });
                                  S.audit('Đặt lại mật khẩu', u.email);
                                },
                                'Đã đặt lại mật khẩu về 123456 (demo).',
                                load
                              )
                            },
                            'Đặt lại MK'
                          )
                        )
                      )
                    );
                  })
                )
              )
            )
          );
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    function approve(u) {
      S.update('users', u.id, { status: 'active' });
      if (u.role === 'organization' && u.refId)
        S.update('organizations', u.refId, { status: 'approved' });
      S.notify(u.id, 'Tài khoản của bạn đã được phê duyệt.', '');
      S.audit('Phê duyệt tài khoản', u.email);
    }

    async function toggle(u) {
      if (u.status === 'active') {
        const reason = await VL.ui.confirm({
          title: 'Khóa tài khoản?',
          message: 'Người dùng ' + u.name + ' sẽ không thể đăng nhập.',
          reason: true,
          reasonLabel: 'Lý do khóa',
          danger: true,
          confirmLabel: 'Khóa'
        });
        if (!reason) return;

        run(
          () => {
            S.update('users', u.id, { status: 'locked' });
            S.audit('Khóa tài khoản (' + reason + ')', u.email);
          },
          'Đã khóa tài khoản.',
          load
        );
      } else
        run(
          () => {
            S.update('users', u.id, { status: 'active' });
            S.audit('Mở khóa tài khoản', u.email);
          },
          'Đã mở khóa.',
          load
        );
    }

    function edit(u) {
      const isNew = !u;
      u = u || { name: '', email: '', role: 'volunteer', status: 'active' };
      const self = !isNew && u.id === session.userId;
      const body = h(
        'div',
        null,
        field('Họ tên', h('input', { name: 'name', value: u.name })),
        field('Email', h('input', { name: 'email', type: 'email', value: u.email })),
        field(
          'Vai trò',
          h(
            'select',
            { name: 'role', disabled: self },
            Object.keys(ROLES).map(
              (k) => h('option', { value: k, selected: u.role === k }, ROLES[k].label)
            )
          ),
          self ? 'Không thể đổi vai trò của chính bạn.' : ''
        ),
        isNew
          ? field('Mật khẩu tạm', h('input', { name: 'password', type: 'text', value: '123456' }))
          : null
      );
      const rules = {
        name: [V.required('Vui lòng nhập họ tên.'), V.min(2)],
        email: [
          V.required('Vui lòng nhập email.'),
          V.email,
          V.custom(
            (v) => (S.where('users', (x) =>
              x.id !== u.id && x.email.toLowerCase() === v.trim().toLowerCase()
            ).length
              ? 'Email đã được sử dụng.'
              : '')
          )
        ]
      };
      if (isNew)
        rules.password = [V.required('Nhập mật khẩu tạm.'), V.min(6, 'Tối thiểu 6 ký tự.')];

      VL.ui.modal({
        title: isNew ? 'Tạo người dùng' : 'Sửa người dùng',
        body,
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            const role = self ? u.role : form.elements.role.value;

            if (isNew) {
              let ref = null;
              if (role === 'volunteer')
                ref = S.add('volunteers', {
                  userId: null,
                  name: v.name.trim(),
                  email: v.email.trim(),
                  phone: '',
                  city: '',
                  bio: '',
                  skills: [],
                  hours: 0,
                  status: 'active',
                  availability: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
                }).id;
              if (role === 'organization')
                ref = S.add('organizations', {
                  name: v.name.trim(),
                  mission: '',
                  email: v.email.trim(),
                  phone: '',
                  city: '',
                  status: 'approved'
                }).id;
              const nu = S.add('users', {
                email: v.email.trim(),
                password: v.password,
                role,
                name: v.name.trim(),
                status: 'active',
                refId: ref
              });
              if (role === 'volunteer') S.update('volunteers', ref, { userId: nu.id });
              S.audit('Tạo người dùng', v.email);
            } else {
              S.update('users', u.id, { name: v.name.trim(), email: v.email.trim(), role });
              S.audit('Sửa người dùng', v.email);
            }
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã lưu người dùng.');
          load();
        }
      });
    }

    document.getElementById('new').addEventListener('click', () => edit());
    f.addEventListener('input', U.debounce(load, 200));

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') load();
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };
})();
