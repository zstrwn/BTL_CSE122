/* Quản trị viên – Kiểm duyệt hoạt động và xử lý báo cáo vi phạm */
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
})();
