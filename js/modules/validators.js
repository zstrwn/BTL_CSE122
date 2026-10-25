/* Kiểm tra hợp lệ biểu mẫu: rules = { fieldName: [ruleFn, ...] }, ruleFn(value, form) -> chuỗi lỗi | '' */
window.VL = window.VL || {};

VL.v = (function() {
  const required = (msg) => (v) => (String(v == null ? '' : v).trim()
    ? ''
    : msg || 'Trường này là bắt buộc.');
  const email = (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email không hợp lệ.');
  const phone = (v) => (!v || /^(0|\+84)\d{9}$/.test(String(v).replace(/[\s.]/g, ''))
    ? ''
    : 'Số điện thoại không hợp lệ (VD: 0912345678).');
  const min = (n, msg) => (v) => (!v || String(v).trim().length >= n
    ? ''
    : msg || 'Tối thiểu ' + n + ' ký tự.');
  const max = (n, msg) => (v) => (String(v || '').length <= n
    ? ''
    : msg || 'Tối đa ' + n + ' ký tự.');

  const num = (lo, hi, msg) => (v) => {
    const n = Number(v);
    return v !== '' && !isNaN(n) && n >= lo && n <= hi
      ? ''
      : msg || 'Nhập số từ ' + lo + ' đến ' + hi + '.';
  };

  const futureDate = (v) => (!v || v >= VL.util.today() ? '' : 'Ngày không được ở quá khứ.');
  const custom = (fn) => fn;

  function setError(field, msg) {
    const wrap = field.closest('.field') || field.parentElement;
    let e = wrap.querySelector('.err');

    if (!e) {
      e = document.createElement('div');
      e.className = 'err';
      e.id = (field.id || field.name) + '-err';
      wrap.append(e);
    }

    e.textContent = msg || '';

    if (msg) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', e.id);
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  }

  function validate(form, rules) {
    let first = null;
    const values = {};

    Object.keys(rules).forEach((name) => {
      const f = form.elements[name];
      if (!f) return;
      const val = f.type === 'checkbox' ? f.checked : f.value;
      values[name] = val;
      let msg = '';

      for (const r of rules[name]) {
        msg = r(val, form);
        if (msg) break;
      }

      setError(f, msg);
      if (msg && !first) first = f;
    });

    Array.from(form.elements).forEach((f) => {
      if (f.name && !(f.name in values))
        values[f.name] = f.type === 'checkbox' ? f.checked : f.value;
    });

    if (first) first.focus();
    return first ? null : values;
  }

  function live(form, rules) {
    Object.keys(rules).forEach((n) => {
      const f = form.elements[n];

      if (f)
        f.addEventListener('blur', () => {
          let m = '';

          for (const r of rules[n]) {
            m = r(f.value, form);
            if (m) break;
          }

          setError(f, m);
        });
    });
  }

  return { required, email, phone, min, max, num, futureDate, custom, validate, live, setError };
})();
