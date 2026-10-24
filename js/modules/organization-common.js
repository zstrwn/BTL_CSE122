window.VL = window.VL || {};

VL.org = (function() {
  const { h, state } = VL.ui,
    S = VL.store,
    Q = VL.q;

    const regions = () => {
      const box = document.getElementById('state-box'),
        table = document.getElementById('table-box'),
        rows = document.getElementById('rows');

      return {
        rows,
        showStatus: (type, o) => {
          box.hidden = false;
          table.hidden = true;
          state(box, type, o);
        },
        showTable: () => {
          box.hidden = true;
          box.innerHTML = '';
          table.hidden = false;
        }
      };
    };

    const formFrom = (id) => document.getElementById(id).content.cloneNode(true);

    const fillSkills = (root, sel) => {
      const box = root.querySelector('.checks');
      box.innerHTML = '';

      Q.active(S.all('skills')).forEach((k) => box.append(
        h(
          'label',
          null,
          h('input', { type: 'checkbox', name: 'skills', value: k.id, checked: sel.includes(k.id) }),
          k.name
        )
      ));
    };

    const readSkills = (root) => Array.from(root.querySelectorAll('[name=skills]:checked')).map((i) =>
      i.value
    );
    const myOpps = (org) => S.where('opportunities', (p) => p.orgId === org);

    const myShifts = (org) => {
      const ids = myOpps(org).map((p) => p.id);
      return S.where('shifts', (s) => ids.includes(s.oppId));
    };

  return { regions, formFrom, fillSkills, readSkills, myOpps, myShifts };
})();