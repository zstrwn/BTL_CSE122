window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { badge, state } = VL.ui,
    V = VL.v,
    S = VL.store,
    O = VL.org;

  VL.pages['organization-profile'] = function(session) {
    const box = document.getElementById('state-box'),
      view = document.getElementById('profile-box'),
      put = (id, text) => { document.getElementById(id).textContent = text; },
      org = session.refId;

    function render() {
      box.hidden = false;
      view.hidden = true;
      state(box, 'loading');

      VL.api.run(() => S.find('organizations', org))
        .then((o) => {
          const opps = O.myOpps(org),
            shifts = O.myShifts(org);

          box.hidden = true;
          box.innerHTML = '';
          view.hidden = false;

          put('o-name', o.name);
          const status = document.getElementById('o-status');
          status.innerHTML = '';
          status.append(badge(o.status));
          put('o-mission', o.mission || 'Chưa có giới thiệu.');
          put('o-contact', [o.email, o.phone, o.city].filter(Boolean).join(' · '));
          put('k-opps', opps.length);
          put('k-shifts', shifts.length);
          put(
            'k-hours',
            S.where('registrations', (r) =>
              shifts.some((s) => s.id === r.shiftId) && r.status === 'completed'
            ).reduce((t, r) => t + r.hours, 0)
          );
        })
        .catch((e) => state(box, 'error', { message: e.message, retry: render }));
    }

    document.getElementById('edit').addEventListener('click', () => {
      const o = S.find('organizations', org),

        body = O.formFrom('tpl-profile');

      body.querySelector('[name="name"]').value = o.name;
      body.querySelector('[name="mission"]').value = o.mission;
      body.querySelector('[name="email"]').value = o.email;
      body.querySelector('[name="phone"]').value = o.phone;
      body.querySelector('[name="city"]').value = o.city;
      const rules = {
        name: [V.required('Vui lòng nhập tên tổ chức.'), V.min(3)],
        mission: [V.max(300, 'Tối đa 300 ký tự.')],
        email: [V.required('Vui lòng nhập email.'), V.email],
        phone: [V.phone]
      };

      VL.ui.modal({
        title: 'Sửa hồ sơ tổ chức',
        body,
        onSubmit: (form) => {
          const v = V.validate(form, rules);
          if (!v) return false;

          return VL.api.run(() => {
            S.update('organizations', org, {
              name: v.name.trim(),
              mission: v.mission.trim(),
              email: v.email.trim(),
              phone: v.phone.trim(),
              city: v.city.trim()
            });
            S.update('users', session.userId, { name: v.name.trim() });
            S.audit('Cập nhật hồ sơ tổ chức', v.name);
          });
        }
      }).then((ok) => {
        if (ok) {
          VL.ui.toast('Đã cập nhật hồ sơ.');
          render();
        }
      });
    });

    render();
  };
})();