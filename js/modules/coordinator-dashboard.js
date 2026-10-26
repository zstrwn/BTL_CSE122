/* =====================================================
   coordinator-dashboard.js – BẢNG ĐIỀU KHIỂN NGUỒN LỰC
   Gồm: ô chỉ số (KPI), biểu đồ mức lấp đầy, dự báo nhanh,
        bảng cung – cầu theo kỹ năng.
   Trang: pages/coordinator-dashboard.html
   ===================================================== */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h, state, bar } = VL.ui,
    U = VL.util,
    S = VL.store,
    Q = VL.q;

  // Các ca đang mở trong khoảng từ hôm nay đến hôm nay + days ngày (kèm hoạt động, số người đã đủ)
  const upcoming = (days) => S.where('shifts', (s) =>
    s.status === 'open' && s.date >= U.today() && s.date <= U.addDays(days)
  ).map(Q.shiftView);

  VL.pages['coordinator-dashboard'] = function() {
    const form = document.getElementById('filter-form'),
      kpiEl = document.getElementById('kpi'),
      barsEl = document.getElementById('bars'),
      shortEl = document.getElementById('short'),
      skillsEl = document.getElementById('skills');

    // Danh sách lĩnh vực cho bộ lọc
    form.elements.cat.append(...VL.ui.options(Q.active(S.all('categories')), '', 'Mọi lĩnh vực'));

    // Lấy dữ liệu theo khoảng thời gian (days) và lĩnh vực (cat; '' = tất cả)
    function load() {
      [barsEl, skillsEl, shortEl].forEach((box) => state(box, 'loading'));
      kpiEl.innerHTML = '';

      VL.api.run(() => {
        const days = +form.elements.range.value,
          cat = form.elements.cat.value;

        const sh = upcoming(days)
          .filter((s) => !cat || s.opp.categoryId === cat)
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          sh,
          vols: Q.active(S.all('volunteers')),
          pred: VL.ai.predictShortage(days, 40)
        };
      })
        .then(renderDashboard)
        .catch((e) => [barsEl, skillsEl, shortEl].forEach(
          (box) => state(box, 'error', { message: e.message, retry: load })
        ));
    }

    // 1. Các ô chỉ số
    function renderKpi(d) {
      const capacity = d.sh.reduce((t, s) => t + s.capacity, 0),
        filled = d.sh.reduce((t, s) => t + s.filled, 0),
        hours = d.vols.reduce((t, v) => t + (v.hours || 0), 0);

      const items = [
        [d.sh.length, 'Ca đang mở'],
        [capacity ? Math.round(filled / capacity * 100) + '%' : '—', 'Tỉ lệ lấp đầy'],
        [capacity - filled, 'Chỗ còn thiếu'],
        [d.vols.length, 'Tình nguyện viên'],
        [hours, 'Giờ đóng góp']
      ];

      kpiEl.innerHTML = '';
      kpiEl.append(...items.map(
        (k) => h('article', { class: 'card kpi' }, h('b', null, k[0]), h('span', null, k[1]))
      ));
    }

    // 2. Biểu đồ mức lấp đầy: tối đa 10 ca, đỏ nếu < 40%, vàng nếu < 70%
    function renderBars(d) {
      if (!d.sh.length) {
        return state(barsEl, 'empty', { icon: '📊', title: 'Không có ca mở trong khoảng này' });
      }

      barsEl.innerHTML = '';
      barsEl.append(h('div', { class: 'bars' }, d.sh.slice(0, 10).map((s) => {
        const percent = Math.round(s.filled / s.capacity * 100);
        return h(
          'div',
          { class: 'r' },
          h('span', { title: s.opp.title }, U.fmtDate(s.date).slice(0, 5) + ' ' + s.opp.title.slice(0, 18)),
          bar(percent, percent < 40 ? 'bad' : percent < 70 ? 'warn' : ''),
          h('b', null, s.filled + '/' + s.capacity)
        );
      })));
    }

    // 3. Dự báo nhanh: 3 ca có nguy cơ cao nhất
    function renderShort(d) {
      shortEl.innerHTML = '';

      if (!d.pred.items.length) {
        return shortEl.append(h('p', { class: 'mut' }, 'Chưa phát hiện ca nào có nguy cơ thiếu người.'));
      }

      shortEl.append(
        h('div', { class: 'list' }, d.pred.items.slice(0, 3).map((x) => h(
          'div',
          { class: 'item row between' },
          h(
            'div',
            null,
            h('b', null, x.opp.title),
            h('div', { class: 'mut' }, Q.fmtShift(x.shift) + ' · nguy cơ ' + x.risk + '%')
          ),
          h(
            'a',
            { class: 'btn sm primary', href: VL.path.page('coordinator-matching') + '?shift=' + x.shift.id },
            'Xếp người'
          )
        ))),
        h(
          'p',
          { style: 'margin-top:10px' },
          h('a', { href: VL.path.page('coordinator-shortage') }, 'Xem phân tích AI đầy đủ →')
        )
      );
    }

    // 4. Bảng cung – cầu theo kỹ năng
    function renderSkills(d) {
      if (!d.sh.length) {
        return state(skillsEl, 'empty', { icon: '🧰', title: 'Chưa có nhu cầu kỹ năng' });
      }

      const rows = Q.active(S.all('skills')).map((k) => ({
        name: k.name,
        // nhu cầu = tổng số chỗ còn thiếu của các ca yêu cầu kỹ năng này
        demand: d.sh.reduce(
          (t, s) => t + (VL.ai.requiredOf(s).includes(k.id) ? s.capacity - s.filled : 0), 0
        ),
        // nguồn lực = số tình nguyện viên có kỹ năng này
        supply: d.vols.filter((v) => (v.skills || []).includes(k.id)).length
      })).filter((r) => r.demand || r.supply);

      skillsEl.innerHTML = '';
      skillsEl.append(h(
        'div',
        { class: 'tbl-wrap' },
        h(
          'table',
          { class: 'stack' },
          h(
            'thead',
            null,
            h('tr', null, ['Kỹ năng', 'Nhu cầu (chỗ)', 'Nguồn lực (TNV)', 'Cân đối'].map((x) => h('th', null, x)))
          ),
          h('tbody', null, rows.map((r) => h(
            'tr',
            null,
            h('td', { 'data-label': 'Kỹ năng' }, r.name),
            h('td', { 'data-label': 'Nhu cầu' }, r.demand),
            h('td', { 'data-label': 'Nguồn lực' }, r.supply),
            h(
              'td',
              { 'data-label': 'Cân đối' },
              r.demand > r.supply
                ? h('span', { class: 'badge bad' }, 'Thiếu ' + (r.demand - r.supply))
                : h('span', { class: 'badge ok' }, 'Đủ')
            )
          )))
        )
      ));
    }

    // Vẽ lại toàn bộ bảng điều khiển
    function renderDashboard(d) {
      renderKpi(d);
      renderBars(d);
      renderShort(d);
      renderSkills(d);
    }

    // Đổi bộ lọc thì tải lại
    form.addEventListener('change', load);
    form.addEventListener('submit', (e) => e.preventDefault());
    load();
  };
})();
