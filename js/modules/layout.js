/* Khung giao diện nhất quán: đầu trang, điều hướng theo vai trò, chuyển sáng/tối, thông báo */
window.VL = window.VL || {};

VL.layout = (function() {
  const { h } = VL.ui;
  const NAV = {
    volunteer: [
      ['volunteer-opportunity-search', '🔎', 'Tìm cơ hội'],
      ['volunteer-my-shifts', '📅', 'Ca của tôi'],
      ['volunteer-ai-matcher', '✨', 'AI gợi ý ca'],
      ['volunteer-profile', '👤', 'Hồ sơ']
    ],
    organization: [
      ['organization-opportunity-management', '📋', 'Hoạt động'],
      ['organization-shift-management', '🕒', 'Quản lý ca'],
      ['organization-volunteer-roster', '👥', 'Danh sách TNV'],
      ['organization-profile', '🏢', 'Hồ sơ tổ chức']
    ],
    coordinator: [
      ['coordinator-resource-dashboard', '📊', 'Bảng điều khiển'],
      ['coordinator-matching-board', '🧩', 'Bảng ghép người'],
      ['coordinator-shortage-alerts', '🚨', 'Cảnh báo thiếu ca'],
      ['coordinator-impact-summary', '🌱', 'Tóm tắt tác động']
    ],
    admin: [
      ['admin-moderation', '🛡️', 'Kiểm duyệt'],
      ['admin-category-management', '🗂️', 'Danh mục'],
      ['admin-user-management', '👤', 'Người dùng'],
      ['admin-audit-log', '📜', 'Nhật ký hệ thống']
    ]
  };
  const SHARED = [['notifications', '🔔', 'Thông báo'], ['settings', '⚙️', 'Cài đặt']];

  function render(session) {
    const page = document.body.dataset.page;
    const role = VL.auth.ROLES[session.role];
    const unread = VL.store.where('notifications', (n) =>
      n.userId === session.userId && !n.read
    ).length;
    const bell = h(
      'a',
      {
        class: 'icon-btn bell',
        href: VL.path.page('notifications'),
        'aria-label': 'Thông báo' + (unread ? ' (' + unread + ' chưa đọc)' : '')
      },
      '🔔',
      unread ? h('span', { class: 'dot' }, unread > 9 ? '9+' : unread) : null
    );

    const theme = h(
      'button',
      {
        class: 'icon-btn',
        type: 'button',
        'aria-label': 'Chuyển chế độ sáng/tối',
        onclick: () => {
          const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.dataset.theme = t;
          localStorage.setItem('vl_theme', t);
        }
      },
      '🌓'
    );

    const menu = h(
      'button',
      {
        class: 'icon-btn menu-btn',
        type: 'button',
        'aria-label': 'Mở menu',
        'aria-expanded': 'false',
        'aria-controls': 'sidebar',
        onclick: () => toggle()
      },
      '☰'
    );
    document.getElementById('topbar').append(
      menu,
      h(
        'a',
        { class: 'brand', href: VL.auth.home(session.role) },
        h('span', { class: 'logo', 'aria-hidden': 'true' }, '♥'),
        h('b', null, 'VolunteerLink')
      ),
      h('span', { class: 'role-chip' }, role.icon + ' ' + role.label),
      h('span', { class: 'sp' }),
      h('span', { class: 'who' }, session.name),
      bell,
      theme,
      h('button', { class: 'btn sm', type: 'button', onclick: VL.auth.logout }, 'Đăng xuất')
    );
    const nav = document.getElementById('sidebar');
    nav.append(
      h(
        'ul',
        null,
        NAV[session.role].concat(SHARED).map(
          (n) => h(
            'li',
            null,
            h(
              'a',
              { href: VL.path.page(n[0]), 'aria-current': n[0] === page ? 'page' : null },
              h('span', { 'aria-hidden': 'true' }, n[1]),
              ' ' + n[2]
            )
          )
        )
      )
    );
    const scrim = h('div', { class: 'scrim', onclick: () => toggle(false) });
    document.body.append(scrim);

    function toggle(force) {
      const open = force != null ? force : !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      scrim.classList.toggle('on', open);
      menu.setAttribute('aria-expanded', open);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggle(false);
    });
  }

  return { render, NAV };
})();
