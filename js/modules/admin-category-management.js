/* Quản trị viên – Quản lý danh mục: lĩnh vực + kỹ năng */
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
})();
