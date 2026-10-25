/* Đăng nhập (chọn vai trò ngay trên màn hình đăng nhập), đăng ký, phiên làm việc, bảo vệ trang */
window.VL = window.VL || {};

VL.path = (function() {
  const inPages = () => (document.body.dataset.base || '') === '../';
  return {
    page: (n) => (inPages() ? '' : 'pages/') + n + '.html',
    root: (f) => (inPages() ? '../' : '') + f
  };
})();

VL.auth = (function() {
  const SKEY = 'vl_session',
    FKEY = 'vl_fail';

  const ROLES = {
    volunteer: {
      label: 'Tình nguyện viên',
      desc: 'Xây hồ sơ và đăng ký ca',
      icon: '🙋',
      demo: 'lan.nguyen@vl.demo',
      home: 'volunteer-opportunity-search'
    },
    organization: {
      label: 'Tổ chức xã hội',
      desc: 'Tạo hoạt động và ca',
      icon: '🏢',
      demo: 'org.xanh@vl.demo',
      home: 'organization-opportunity-management'
    },
    coordinator: {
      label: 'Điều phối viên',
      desc: 'Matching và theo dõi thiếu hụt',
      icon: '🧭',
      demo: 'coord@vl.demo',
      home: 'coordinator-resource-dashboard'
    },
    admin: {
      label: 'Quản trị viên',
      desc: 'Taxonomy và kiểm duyệt',
      icon: '🛡️',
      demo: 'admin@vl.demo',
      home: 'admin-moderation'
    }
  };

  const current = () => {
    try {
      return JSON.parse(localStorage.getItem(SKEY));
    } catch (e) {
      return null;
    }
  };

  const home = (role) => VL.path.page(ROLES[role].home);

  function lockedFor() {
    const f = JSON.parse(sessionStorage.getItem(FKEY) || '{"n":0,"until":0}');
    return Math.max(0, Math.ceil((f.until - Date.now()) / 1000));
  }

  function login(email, password, role) {
    const left = lockedFor();
    if (left)
      return {
        ok: false,
        locked: left,
        error: 'Đăng nhập tạm khóa. Thử lại sau ' + left + ' giây.'
      };
    const u = VL.store.where('users', (x) =>
      x.email.toLowerCase() === String(email).trim().toLowerCase()
    )[0];

    const fail = (msg) => {
      const f = JSON.parse(sessionStorage.getItem(FKEY) || '{"n":0,"until":0}');
      f.n++;

      if (f.n >= 5) {
        f.until = Date.now() + 30000;
        f.n = 0;
      }

      sessionStorage.setItem(FKEY, JSON.stringify(f));
      return { ok: false, error: msg, locked: lockedFor() };
    };

    if (!u || u.password !== password) return fail('Email hoặc mật khẩu không đúng.');
    if (u.role !== role)
      return {
        ok: false,
        error: 'Tài khoản này thuộc vai trò "' + ROLES[u.role].label + '". Hãy chọn đúng vai trò.'
      };
    if (u.status === 'locked')
      return { ok: false, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' };
    if (u.status === 'pending')
      return { ok: false, error: 'Tài khoản đang chờ quản trị viên phê duyệt.' };
    sessionStorage.removeItem(FKEY);
    localStorage.setItem(
      SKEY,
      JSON.stringify({ userId: u.id, role: u.role, name: u.name, refId: u.refId })
    );
    return { ok: true, role: u.role };
  }

  function register(d) {
    if (VL.store.where('users', (x) => x.email.toLowerCase() === d.email.toLowerCase()).length)
      return { ok: false, error: 'Email này đã được đăng ký.' };

    if (d.role === 'volunteer') {
      const v = VL.store.add('volunteers', {
        userId: null,
        name: d.name,
        email: d.email,
        phone: '',
        city: '',
        bio: '',
        skills: [],
        hours: 0,
        status: 'active',
        availability: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
      });
      const u = VL.store.add('users', {
        email: d.email,
        password: d.password,
        role: 'volunteer',
        name: d.name,
        status: 'active',
        refId: v.id
      });
      VL.store.update('volunteers', v.id, { userId: u.id });
      return { ok: true, message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' };
    }

    const o = VL.store.add('organizations', {
      name: d.orgName || d.name,
      mission: '',
      email: d.email,
      phone: '',
      city: '',
      status: 'pending'
    });
    VL.store.add('users', {
      email: d.email,
      password: d.password,
      role: 'organization',
      name: o.name,
      status: 'pending',
      refId: o.id
    });
    VL.store.notifyRole(
      'admin',
      'Tổ chức mới "' + o.name + '" đăng ký, chờ phê duyệt.',
      'admin-user-management'
    );
    return {
      ok: true,
      message: 'Đã gửi đăng ký. Tài khoản tổ chức sẽ hoạt động sau khi quản trị viên phê duyệt.'
    };
  }

  function logout() {
    localStorage.removeItem(SKEY);
    location.href = VL.path.root('login.html');
  }

  // Bảo vệ trang: chưa đăng nhập -> login; sai vai trò -> 403
  function guard(required) {
    const s = current();

    if (!s) {
      location.replace(
        VL.path.root('login.html') +
          '?next=' +
          encodeURIComponent(location.pathname.split('/').pop())
      );
      return null;
    }

    const u = VL.store.find('users', s.userId);

    if (!u || u.status !== 'active') {
      localStorage.removeItem(SKEY);
      location.replace(VL.path.root('login.html'));
      return null;
    }

    if (required && required !== 'any' && s.role !== required) {
      location.replace(VL.path.root('403.html'));
      return null;
    }

    return s;
  }

  return { ROLES, current, login, register, logout, guard, home, lockedFor };
})();
