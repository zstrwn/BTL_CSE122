/* Kho dữ liệu LocalStorage: CRUD cho các thực thể + nhật ký + thông báo */
window.VL = window.VL || {};

VL.store = (function() {
  const KEY = 'vl_db_v1';
  let db = null;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      /* bỏ qua khi đầy bộ nhớ */
    }
  };

  (function load() {
    try {
      const raw = localStorage.getItem(KEY);

      if (raw) {
        db = JSON.parse(raw);
        return;
      }
    } catch (e) {
      /* dữ liệu hỏng -> tạo mới */
    }

    db = clone(VL.seed());
    persist();
  })();

  const PREFIX = {
    users: 'u',
    volunteers: 'v',
    organizations: 'o',
    opportunities: 'p',
    shifts: 'sh',
    registrations: 'r',
    skills: 's',
    categories: 'c',
    reports: 'rp',
    notifications: 'n',
    impactSummaries: 'im',
    auditLog: 'a'
  };

  const nextId = (e) => {
    const p = PREFIX[e] || 'x';

    const max = db[e].reduce((m, r) => {
      const n = parseInt(String(r.id).slice(p.length), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);

    return p + (max + 1);
  };

  // API gồm: CRUD chung (all/find/where/add/update/remove), nhật ký/thông báo và vài truy vấn nghiệp vụ dùng lại ở nhiều trang
  const api = {
    all: (e) => clone(db[e] || []),
    find: (e, id) => {
      const r = (db[e] || []).find((x) => x.id === id);
      return r ? clone(r) : null;
    },
    where: (e, fn) => clone((db[e] || []).filter(fn)),
    add(e, obj) {
      const rec = Object.assign({ id: nextId(e) }, obj);
      db[e].push(rec);
      persist();
      return clone(rec);
    },
    update(e, id, patch) {
      const i = db[e].findIndex((x) => x.id === id);
      if (i < 0) throw new Error('Không tìm thấy bản ghi (' + e + ' ' + id + ').');
      db[e][i] = Object.assign({}, db[e][i], patch);
      persist();
      return clone(db[e][i]);
    },
    remove(e, id) {
      const n = db[e].length;
      db[e] = db[e].filter((x) => x.id !== id);
      persist();
      return n !== db[e].length;
    },
    reset() {
      db = clone(VL.seed());
      persist();
    },
    audit(action, target) {
      const s = VL.auth && VL.auth.current();
      api.add('auditLog', {
        at: new Date().toISOString(),
        actor: s ? s.name : 'Hệ thống',
        action,
        target: target || ''
      });
    },
    notify(userId, text, link) {
      if (userId)
        api.add('notifications', {
          userId,
          text,
          link: link || '',
          read: false,
          at: new Date().toISOString()
        });
    },
    notifyRole(role, text, link) {
      db.users.filter((u) => u.role === role && u.status === 'active').forEach(
        (u) => api.notify(u.id, text, link)
      );
    },
    userOfOrg(orgId) {
      const u = db.users.find((x) => x.role === 'organization' && x.refId === orgId);
      return u ? u.id : null;
    },
    userOfVolunteer(vId) {
      const u = db.users.find((x) => x.role === 'volunteer' && x.refId === vId);
      return u ? u.id : null;
    },
    filled(shiftId) {
      return db.registrations.filter((r) =>
        r.shiftId === shiftId && ['confirmed', 'completed'].includes(r.status)
      ).length;
    },
    skillNames(ids) {
      return (ids || []).map((id) => {
        const s = db.skills.find((x) => x.id === id);
        return s ? s.name : null;
      }).filter(Boolean);
    }
  };

  return api;
})();
