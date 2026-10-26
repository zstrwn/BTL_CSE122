/* Quản trị viên – Nhật ký hệ thống */
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
