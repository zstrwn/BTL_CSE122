/* Vai trò QUẢN TRỊ VIÊN: kiểm duyệt, danh mục (taxonomy), người dùng, nhật ký hệ thống */
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

  // 1. Quản lý danh mục: lĩnh vực + kỹ năng
  VL.pages['admin-category-management'] = function() {
    const list = document.getElementById('list'),
      tabsEl = document.getElementById('tabs'),
      f = document.getElementById('flt');

    let tab = 'categories';
    const T = {
      categories: [
        'Lĩnh vực',
        (c) => S.where('opportunities', (p) => p.categoryId === c.id).length + ' hoạt động'
      ],
      skills: [
        'Kỹ năng',
        (k) =>
          S.where('volunteers', (v) => (v.skills || []).includes(k.id)).length +
            ' TNV · ' +
            S.where('opportunities', (p) => (p.requiredSkills || []).includes(k.id)).length +
            ' hoạt động'
      ]
    };
    const used = (x) => (tab === 'categories'
      ? S.where('opportunities', (p) => p.categoryId === x.id).length
      : S.where('volunteers', (v) => (v.skills || []).includes(x.id)).length +
        S.where('opportunities', (p) => (p.requiredSkills || []).includes(x.id)).length);

    function load() {
      state(list, 'loading');

      VL.api.run(() => S.all(tab))
        .then((rows) => {
          tabsEl.innerHTML = '';

          Object.keys(T).forEach(
            (k) => tabsEl.append(
              h(
                'button',
                {
                  type: 'button',
                  role: 'tab',
                  'aria-selected': k === tab,
                  onclick: () => {
                    tab = k;
                    load();
                  }
                },
                T[k][0]
              )
            )
          );

          const q = U.norm(f.elements.q.value),
            st = f.elements.status.value,
            r = rows.filter((x) => (!q || U.norm(x.name).includes(q)) && (!st || x.status === st));

          if (!r.length)
            return state(list, 'empty', {
              icon: '🗂️',
              title: 'Không có mục nào',
              message: rows.length ? 'Không khớp bộ lọc.' : 'Hãy thêm mục đầu tiên.',
              action: rows.length ? null : { label: '+ Thêm mới', fn: () => edit() }
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
                    [T[tab][0], 'Đang dùng', 'Trạng thái', 'Thao tác'].map((x) => h('th', null, x))
                  )
                ),
                h(
                  'tbody',
                  null,
                  r.map(
                    (x) => h(
                      'tr',
                      null,
                      h('td', { 'data-label': T[tab][0] }, h('b', null, x.name)),
                      h('td', { 'data-label': 'Đang dùng' }, T[tab][1](x)),
                      h('td', { 'data-label': 'Trạng thái' }, badge(x.status)),
                      h(
                        'td',
                        { 'data-label': 'Thao tác' },
                        h(
                          'div',
                          { class: 'acts' },
                          h('button', { class: 'btn sm', onclick: () => edit(x) }, 'Sửa'),
                          h(
                            'button',
                            {
                              class: 'btn sm',
                              onclick: () => run(
                                () => {
                                  S.update(tab, x.id, {
                                    status: x.status === 'active' ? 'archived' : 'active'
                                  });
                                  S.audit(
                                    (x.status === 'active' ? 'Lưu trữ ' : 'Khôi phục ') +
                                      T[tab][0].toLowerCase(),
                                    x.name
                                  );
                                },
                                x.status === 'active' ? 'Đã lưu trữ.' : 'Đã khôi phục.',
                                load
                              )
                            },
                            x.status === 'active' ? 'Lưu trữ' : 'Khôi phục'
                          ),
                          h('button', { class: 'btn sm lnk-bad', onclick: () => del(x) }, 'Xóa')
                        )
                      )
                    )
                  )
                )
              )
            )
          );
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    function edit(x) {
      const isNew = !x;
      x = x || { name: '', status: 'active' };
      const rules = {
        name: [
          V.required('Vui lòng nhập tên.'),
          V.min(2),
          V.max(60),
          V.custom(
            (v) => (S.where(tab, (y) => y.id !== x.id && U.norm(y.name) === U.norm(v)).length
              ? 'Tên này đã tồn tại.'
              : '')
          )
        ]
      };

      VL.ui.modal({
        title: (isNew ? 'Thêm ' : 'Sửa ') + T[tab][0].toLowerCase(),
        body: h(
          'div',
          null,
          field('Tên', h('input', { name: 'name', value: x.name, maxlength: 60 }))
        ),
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            if (isNew) S.add(tab, { name: v.name.trim(), status: 'active' });
            else S.update(tab, x.id, { name: v.name.trim() });

            S.audit((isNew ? 'Thêm ' : 'Sửa ') + T[tab][0].toLowerCase(), v.name);
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã lưu.');
          load();
        }
      });
    }

    async function del(x) {
      if (used(x)) return VL.ui.toast('Mục đang được sử dụng – hãy "Lưu trữ" thay vì xóa.', 'bad');
      if (!(await VL.ui.confirm({
        title: 'Xóa "' + x.name + '"?',
        message: 'Thao tác không thể hoàn tác.',
        danger: true,
        confirmLabel: 'Xóa'
      }))) return;

      run(
        () => {
          S.remove(tab, x.id);
          S.audit('Xóa ' + T[tab][0].toLowerCase(), x.name);
        },
        'Đã xóa.',
        load
      );
    }

    document.getElementById('new').addEventListener('click', () => edit());
    f.addEventListener('input', U.debounce(load, 200));

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') load();
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };

  // 2. Quản lý người dùng
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

  // 3. Kiểm duyệt
  VL.pages['admin-moderation'] = function() {
    const list = document.getElementById('list'),
      tabsEl = document.getElementById('tabs'),
      f = document.getElementById('flt');

    let tab = 'opps';
    const target = (r) =>
      r.type === 'opportunity'
        ? ((S.find('opportunities', r.targetId) || {}).title || '(đã xóa)')
        : r.type === 'user'
          ? ((S.find('users', r.targetId) || {}).name || '(đã xóa)')
          : 'Tính năng ' + r.targetId;
    const TYPE = { opportunity: 'Hoạt động', user: 'Người dùng', ai: 'Phản hồi AI' };

    function load() {
      state(list, 'loading');

      VL.api.run(
        () => ({
          opps: S.where('opportunities', (p) => p.moderation === 'pending'),
          reps: S.all('reports').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        })
      )
        .then((d) => {
          tabsEl.innerHTML = '';

          [
            ['opps', 'Hoạt động chờ duyệt (' + d.opps.length + ')'],
            [
              'reps',
              'Báo cáo vi phạm (' + d.reps.filter((r) => r.status === 'open').length + ' mở)'
            ]
          ].forEach(
            (t) => tabsEl.append(
              h(
                'button',
                {
                  type: 'button',
                  role: 'tab',
                  'aria-selected': t[0] === tab,
                  onclick: () => {
                    tab = t[0];
                    f.hidden = tab === 'opps';
                    load();
                  }
                },
                t[1]
              )
            )
          );

          list.innerHTML = '';

          if (tab === 'opps') {
            if (!d.opps.length)
              return state(list, 'empty', { icon: '✅', title: 'Không có hoạt động nào chờ duyệt' });

            return list.append(
              h(
                'div',
                { class: 'list' },
                d.opps.map((p) => {
                  const o = S.find('organizations', p.orgId) || {};

                  return h(
                    'article',
                    { class: 'item' },
                    h(
                      'div',
                      { class: 'row between' },
                      h('b', null, p.title),
                      badge('pending', 'mod')
                    ),
                    h('div', { class: 'mut' }, o.name + ' · ' + p.location),
                    h('p', null, p.description),
                    VL.ui.chips(S.skillNames(p.requiredSkills)),
                    h(
                      'div',
                      { class: 'acts', style: 'margin-top:10px' },
                      h(
                        'button',
                        {
                          class: 'btn sm primary',
                          onclick: () => run(
                            () => {
                              S.update('opportunities', p.id, {
                                moderation: 'approved',
                                rejectReason: ''
                              });
                              S.notify(
                                S.userOfOrg(p.orgId),
                                'Hoạt động "' + p.title + '" đã được duyệt.',
                                'organization-opportunity-management'
                              );
                              S.audit('Duyệt hoạt động', p.title);
                            },
                            'Đã duyệt hoạt động.',
                            load
                          )
                        },
                        'Duyệt'
                      ),
                      h('button', { class: 'btn sm lnk-bad', onclick: () => reject(p) }, 'Từ chối')
                    )
                  );
                })
              )
            );
          }

          const q = U.norm(f.elements.q.value),
            st = f.elements.status.value,
            r = d.reps.filter((x) =>
              (!q || U.norm(target(x) + x.reason).includes(q)) && (!st || x.status === st)
            );

          if (!r.length)
            return state(list, 'empty', {
              icon: '🛡️',
              title: 'Không có báo cáo nào',
              action: { label: '+ Tạo báo cáo', fn: () => report() }
            });

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
                    ['Đối tượng', 'Lý do', 'Trạng thái', 'Thao tác'].map((x) => h('th', null, x))
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
                        { 'data-label': 'Đối tượng' },
                        h('b', null, target(x)),
                        h(
                          'div',
                          { class: 'mut' },
                          TYPE[x.type] + ' · báo bởi ' + (x.reporter || 'ẩn danh')
                        )
                      ),
                      h(
                        'td',
                        { 'data-label': 'Lý do' },
                        x.reason,
                        x.resolution ? h('div', { class: 'hint' }, 'Xử lý: ' + x.resolution) : null
                      ),
                      h('td', { 'data-label': 'Trạng thái' }, badge(x.status)),
                      h(
                        'td',
                        { 'data-label': 'Thao tác' },
                        h(
                          'div',
                          { class: 'acts' },
                          x.status === 'open'
                            ? [
                              h(
                                'button',
                                { class: 'btn sm primary', onclick: () => resolve(x) },
                                'Xử lý'
                              ),
                              h(
                                'button',
                                {
                                  class: 'btn sm',
                                  onclick: () => run(
                                    () => {
                                      S.update('reports', x.id, { status: 'dismissed' });
                                      S.audit('Bác bỏ báo cáo', target(x));
                                    },
                                    'Đã bác bỏ báo cáo.',
                                    load
                                  )
                                },
                                'Bác bỏ'
                              )
                            ]
                            : null,
                          x.status !== 'open'
                            ? h(
                              'button',
                              {
                                class: 'btn sm lnk-bad',
                                onclick: () => run(
                                  () => S.remove('reports', x.id),
                                  'Đã xóa báo cáo.',
                                  load
                                )
                              },
                              'Xóa'
                            )
                            : null
                        )
                      )
                    )
                  )
                )
              )
            )
          );
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    async function reject(p) {
      const reason = await VL.ui.confirm({
        title: 'Từ chối hoạt động?',
        message: 'Nêu lý do để tổ chức chỉnh sửa và gửi lại.',
        reason: true,
        reasonLabel: 'Lý do từ chối',
        danger: true,
        confirmLabel: 'Từ chối'
      });
      if (!reason) return;

      run(
        () => {
          S.update('opportunities', p.id, {
            moderation: 'rejected',
            status: 'draft',
            rejectReason: reason
          });
          S.notify(
            S.userOfOrg(p.orgId),
            'Hoạt động "' + p.title + '" bị từ chối: ' + reason,
            'organization-opportunity-management'
          );
          S.audit('Từ chối hoạt động', p.title);
        },
        'Đã từ chối hoạt động.',
        load
      );
    }

    function resolve(x) {
      const acts = [['none', 'Chỉ ghi nhận, không hành động']].concat(
        x.type === 'opportunity'
          ? [['close', 'Đóng hoạt động bị báo cáo']]
          : x.type === 'user' ? [['lock', 'Khóa tài khoản bị báo cáo']] : []
      );

      const sel = h('select', { name: 'act' }, acts.map((a) => h('option', { value: a[0] }, a[1]))),
        note = h('textarea', { name: 'note', rows: 2, placeholder: 'Ghi chú xử lý (tùy chọn)' });

      VL.ui.modal({
        title: 'Xử lý báo cáo',
        body: h(
          'div',
          null,
          h('p', null, x.reason),
          field('Hành động', sel),
          field('Ghi chú', note)
        ),
        submitLabel: 'Hoàn tất xử lý',
        onSubmit: () => VL.api.run(() => {
          const a = sel.value;
          if (a === 'close') S.update('opportunities', x.targetId, { status: 'closed' });
          if (a === 'lock') S.update('users', x.targetId, { status: 'locked' });
          S.update('reports', x.id, {
            status: 'resolved',
            resolution: (acts.find((y) => y[0] === a)[1]) +
              (note.value.trim() ? ' – ' + note.value.trim() : '')
          });
          S.audit('Xử lý báo cáo', target(x));
        })
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã xử lý báo cáo.');
          load();
        }
      });
    }

    function report() {
      const body = h(
        'div',
        null,
        field(
          'Loại đối tượng',
          h(
            'select',
            { name: 'type' },
            [['opportunity', 'Hoạt động'], ['user', 'Người dùng']].map(
              (o) => h('option', { value: o[0] }, o[1])
            )
          )
        ),
        field('Đối tượng', h('select', { name: 'target' })),
        field('Lý do', h('textarea', { name: 'reason', rows: 3 }))
      );

      const fill = () => {
        const t = body.querySelector('[name=type]').value,
          s = body.querySelector('[name=target]');

        s.innerHTML = '';
        s.append(
          ...(t === 'opportunity'
            ? S.all('opportunities').map((p) => h('option', { value: p.id }, p.title))
            : S.all('users').map(
              (u) => h('option', { value: u.id }, u.name + ' (' + u.email + ')')
            ))
        );
      };

      body.querySelector('[name=type]').addEventListener('change', fill);
      fill();
      const rules = {
        reason: [V.required('Vui lòng nhập lý do.'), V.min(10, 'Lý do tối thiểu 10 ký tự.')]
      };

      VL.ui.modal({
        title: 'Tạo báo cáo vi phạm',
        body,
        submitLabel: 'Tạo',
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            S.add('reports', {
              type: form.elements.type.value,
              targetId: form.elements.target.value,
              reason: v.reason.trim(),
              reporter: VL.session.name,
              status: 'open',
              createdAt: new Date().toISOString()
            });
            S.audit('Tạo báo cáo vi phạm', v.reason.slice(0, 40));
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã tạo báo cáo.');
          load();
        }
      });
    }

    document.getElementById('new').addEventListener('click', () => {
      tab = 'reps';
      f.hidden = false;
      report();
    });

    f.hidden = true;
    f.addEventListener('input', U.debounce(load, 200));

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search' && e.target.type !== 'text') load();
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };

  // 4. Nhật ký hệ thống
  VL.pages['admin-audit-log'] = function() {
    const list = document.getElementById('list'),
      f = document.getElementById('flt');

    let shown = 15,
      rows = [];

    function load() {
      state(list, 'loading');

      VL.api.run(() => S.all('auditLog').sort((a, b) => b.at.localeCompare(a.at)))
        .then((d) => {
          rows = d;

          const actors = Array.from(new Set(d.map((x) => x.actor))),
            cur = f.elements.actor.value;

          f.elements.actor.innerHTML = '';
          f.elements.actor.append(
            h('option', { value: '' }, 'Mọi người thực hiện'),
            ...actors.map((a) => h('option', { value: a, selected: a === cur }, a))
          );
          render();
        })
        .catch((e) => state(list, 'error', { message: e.message, retry: load }));
    }

    const filtered = () => {
      const q = U.norm(f.elements.q.value),
        a = f.elements.actor.value,
        from = f.elements.from.value,
        to = f.elements.to.value;

      return rows.filter((x) =>
        (!q || U.norm(x.action + x.target).includes(q)) &&
          (!a || x.actor === a) &&
          (!from || x.at.slice(0, 10) >= from) &&
          (!to || x.at.slice(0, 10) <= to)
      );
    };

    function render() {
      const r = filtered();
      if (!r.length) return state(list, 'empty', { icon: '📜', title: 'Không có bản ghi phù hợp' });
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
                ['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng'].map(
                  (x) => h('th', null, x)
                )
              )
            ),
            h(
              'tbody',
              null,
              r.slice(0, shown).map(
                (x) => h(
                  'tr',
                  null,
                  h('td', { 'data-label': 'Thời gian' }, U.fmtDateTime(x.at)),
                  h('td', { 'data-label': 'Người thực hiện' }, x.actor),
                  h('td', { 'data-label': 'Hành động' }, x.action),
                  h('td', { 'data-label': 'Đối tượng' }, x.target)
                )
              )
            )
          )
        ),
        r.length > shown
          ? h(
            'p',
            { style: 'text-align:center;margin-top:12px' },
            h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  shown += 15;
                  render();
                }
              },
              'Xem thêm (' + (r.length - shown) + ')'
            )
          )
          : null
      );
    }

    document.getElementById('export').addEventListener('click', () => {
      const r = filtered();
      if (!r.length) return VL.ui.toast('Không có dữ liệu để xuất.', 'bad');
      U.csv(
        'nhat-ky-he-thong.csv',
        [['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng']].concat(
          r.map((x) => [x.at, x.actor, x.action, x.target])
        )
      );
    });

    f.addEventListener(
      'input',
      U.debounce(() => {
        shown = 15;
        render();
      }, 200)
    );

    f.addEventListener('change', (e) => {
      if (e.target.type !== 'search') {
        shown = 15;
        render();
      }
    });

    f.addEventListener('submit', (e) => e.preventDefault());
    load();
  };
})();
