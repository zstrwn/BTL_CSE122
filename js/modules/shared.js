/* Màn hình dùng chung: đăng nhập (chọn vai trò), đăng ký, quên mật khẩu, thông báo, cài đặt */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h } = VL.ui,
    V = VL.v,
    U = VL.util,
    S = VL.store;

  const ROLES = VL.auth.ROLES;

  const roleBox = (box, sel, onChange, only) => {
    Object.keys(ROLES)
      .filter((k) => !only || only.includes(k))
      .forEach(
        (k) => box.append(
          h(
            'div',
            { class: 'role' },
            h('input', {
              type: 'radio',
              name: 'role',
              id: 'role-' + k,
              value: k,
              checked: k === sel
            }),
            h(
              'label',
              { for: 'role-' + k },
              ROLES[k].icon + ' ' + ROLES[k].label,
              h('small', null, ROLES[k].desc)
            )
          )
        )
      );
    box.addEventListener('change', onChange);
  };

  VL.pages.login = function() {
    const form = document.getElementById('lf'),
      err = document.getElementById('form-err'),
      btn = document.getElementById('go');

    const want = U.qs('role');
    roleBox(document.getElementById('roles-box'), ROLES[want] ? want : 'volunteer', fill);

    function fill() {
      const r = ROLES[form.elements.role.value];
      form.elements.email.value = r.demo;
      form.elements.password.value = '123456';
      err.textContent = '';
      V.setError(form.elements.email, '');
      V.setError(form.elements.password, '');
    }

    fill();
    const rules = {
      email: [V.required('Vui lòng nhập email.'), V.email],
      password: [V.required('Vui lòng nhập mật khẩu.'), V.min(6, 'Mật khẩu tối thiểu 6 ký tự.')]
    };
    V.live(form, rules);

    function lockUi() {
      const t = setInterval(() => {
        const s = VL.auth.lockedFor();

        if (!s) {
          clearInterval(t);
          btn.disabled = false;
          btn.textContent = 'Đăng nhập';
          err.textContent = '';
        } else {
          btn.disabled = true;
          btn.textContent = 'Thử lại sau ' + s + 's';
        }
      }, 500);
    }

    if (VL.auth.lockedFor()) lockUi();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      err.textContent = '';
      const v = V.validate(form, rules);
      if (!v) return;
      btn.disabled = true;
      btn.textContent = 'Đang đăng nhập…';

      VL.api.run(
        () => VL.auth.login(v.email, v.password, form.elements.role.value),
        { safe: true, delay: 500 }
      ).then((r) => {
        if (r.ok) {
          location.href = VL.auth.home(r.role);
          return;
        }

        err.textContent = r.error;
        btn.disabled = false;
        btn.textContent = 'Đăng nhập';
        if (r.locked) lockUi();
      });
    });
  };

  VL.pages.register = function() {
    const form = document.getElementById('rf'),
      msg = document.getElementById('form-msg'),
      orgF = document.getElementById('org-field');

    roleBox(
      document.getElementById('roles-box'),
      'volunteer',
      () => {
        orgF.hidden = form.elements.role.value !== 'organization';
      },
      ['volunteer', 'organization']
    );

    const rules = {
      name: [V.required('Vui lòng nhập họ tên.'), V.min(2)],
      email: [V.required('Vui lòng nhập email.'), V.email],
      password: [V.required('Vui lòng nhập mật khẩu.'), V.min(6, 'Mật khẩu tối thiểu 6 ký tự.')],
      confirm: [
        V.custom((v, f) => (v === f.elements.password.value ? '' : 'Mật khẩu nhập lại không khớp.'))
      ],
      orgName: [
        V.custom(
          (v, f) => (f.elements.role.value === 'organization' && !v.trim()
            ? 'Vui lòng nhập tên tổ chức.'
            : '')
        )
      ]
    };
    V.live(form, rules);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      msg.textContent = '';
      const v = V.validate(form, rules);
      if (!v) return;
      const b = form.querySelector('button[type=submit]');
      b.disabled = true;

      VL.api.run(
        () => VL.auth.register({
          role: form.elements.role.value,
          name: v.name.trim(),
          email: v.email.trim(),
          password: v.password,
          orgName: v.orgName.trim()
        }),
        { safe: true }
      ).then((r) => {
        msg.className = 'ai-banner ' + (r.ok ? 'ok' : 'bad');
        msg.textContent = r.ok ? r.message : r.error;
        b.disabled = false;
        if (r.ok) form.reset();
      });
    });
  };

  VL.pages.forgot = function() {
    const form = document.getElementById('ff'),
      msg = document.getElementById('form-msg');

    const rules = { email: [V.required('Vui lòng nhập email.'), V.email] };
    V.live(form, rules);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = V.validate(form, rules);
      if (!v) return;

      VL.api.run(() => true, { safe: true, delay: 600 }).then(() => {
        msg.className = 'ai-banner ok';
        msg.textContent = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi (mô phỏng).';
      });
    });
  };

  VL.pages.notifications = function(session) {
    const list = document.getElementById('list'),
      filter = document.getElementById('flt');

    async function load() {
      VL.ui.state(list, 'loading');

      try {
        let items = await VL.api.run(
          () => S.where('notifications', (n) => n.userId === session.userId).sort(
            (a, b) => b.at.localeCompare(a.at)
          )
        );
        if (filter.value === 'unread') items = items.filter((n) => !n.read);
        if (!items.length)
          return VL.ui.state(list, 'empty', {
            icon: '🔔',
            title: 'Không có thông báo',
            message: filter.value === 'unread'
              ? 'Bạn đã đọc hết thông báo.'
              : 'Thông báo mới sẽ xuất hiện tại đây.'
          });
        list.innerHTML = '';

        list.append(
          h(
            'div',
            { class: 'list' },
            items.map(
              (n) => h(
                'div',
                { class: 'item row between' + (n.read ? '' : ' unread') },
                h(
                  'div',
                  null,
                  h('div', null, n.text),
                  h('small', { class: 'mut' }, U.fmtDateTime(n.at))
                ),
                h(
                  'div',
                  { class: 'acts' },
                  n.link
                    ? h(
                      'a',
                      {
                        class: 'btn sm',
                        href: VL.path.page(n.link),
                        onclick: () => S.update('notifications', n.id, { read: true })
                      },
                      'Mở'
                    )
                    : null,
                  n.read
                    ? null
                    : h(
                      'button',
                      {
                        class: 'btn sm',
                        onclick: () => {
                          S.update('notifications', n.id, { read: true });
                          load();
                        }
                      },
                      'Đã đọc'
                    ),
                  h(
                    'button',
                    {
                      class: 'btn sm lnk-bad',
                      'aria-label': 'Xóa thông báo',
                      onclick: () => {
                        S.remove('notifications', n.id);
                        load();
                      }
                    },
                    'Xóa'
                  )
                )
              )
            )
          )
        );
      } catch (e) {
        VL.ui.state(list, 'error', { message: e.message, retry: load });
      }
    }

    filter.addEventListener('change', load);

    document.getElementById('read-all').addEventListener('click', () => {
      S.where('notifications', (n) => n.userId === session.userId && !n.read).forEach(
        (n) => S.update('notifications', n.id, { read: true })
      );
      VL.ui.toast('Đã đánh dấu tất cả là đã đọc.');
      load();
    });

    load();
  };

  VL.pages.settings = function(session) {
    const th = document.getElementById('theme'),
      se = document.getElementById('sim-error'),
      sa = document.getElementById('sim-ai');

    th.value = localStorage.getItem('vl_theme') || 'system';
    se.checked = localStorage.getItem('vl_sim_error') === '1';
    sa.checked = localStorage.getItem('vl_sim_ai_fail') === '1';

    th.addEventListener('change', () => {
      if (th.value === 'system') {
        localStorage.removeItem('vl_theme');
        document.documentElement.dataset.theme = '';
      } else {
        localStorage.setItem('vl_theme', th.value);
        document.documentElement.dataset.theme = th.value;
      }
    });

    se.addEventListener('change', () => {
      localStorage.setItem('vl_sim_error', se.checked ? '1' : '0');
      VL.ui.toast(se.checked ? 'Đã bật mô phỏng lỗi mạng.' : 'Đã tắt mô phỏng lỗi mạng.');
    });

    sa.addEventListener('change', () => {
      localStorage.setItem('vl_sim_ai_fail', sa.checked ? '1' : '0');
      VL.ui.toast(
        sa.checked ? 'AI sẽ báo lỗi để thử trạng thái thất bại.' : 'AI hoạt động bình thường.'
      );
    });

    const f = document.getElementById('pf'),
      msg = document.getElementById('pf-msg');

    const rules = {
      current: [V.required('Nhập mật khẩu hiện tại.')],
      next: [V.required('Nhập mật khẩu mới.'), V.min(6, 'Mật khẩu tối thiểu 6 ký tự.')],
      again: [
        V.custom((v, fm) => (v === fm.elements.next.value ? '' : 'Mật khẩu nhập lại không khớp.'))
      ]
    };
    V.live(f, rules);

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = V.validate(f, rules);
      if (!v) return;
      const u = S.find('users', session.userId);

      if (u.password !== v.current) {
        V.setError(f.elements.current, 'Mật khẩu hiện tại không đúng.');
        return;
      }

      S.update('users', u.id, { password: v.next });
      S.audit('Đổi mật khẩu', u.email);
      f.reset();
      msg.className = 'ai-banner ok';
      msg.textContent = 'Đã đổi mật khẩu thành công.';
    });

    document.getElementById('reset').addEventListener('click', async () => {
      if (await VL.ui.confirm({
        title: 'Đặt lại dữ liệu demo?',
        message: 'Mọi thay đổi sẽ bị xóa và dữ liệu mẫu ban đầu được khôi phục.',
        danger: true,
        confirmLabel: 'Đặt lại'
      })) {
        S.reset();
        VL.ui.toast('Đã khôi phục dữ liệu demo.');
        setTimeout(() => location.reload(), 600);
      }
    });

    document.getElementById('acct').textContent = session.name + ' · ' + ROLES[session.role].label;
  };
})();
