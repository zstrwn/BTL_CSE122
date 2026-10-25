/* Tiện ích dùng chung */
window.VL = window.VL || {};

VL.util = (function() {
  const norm = (s) => String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => iso(new Date());

  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  const fmtDate = (s) => {
    if (!s) return '';
    const [y, m, d] = s.slice(0, 10).split('-');
    return d + '/' + m + '/' + y;
  };

  const fmtDateTime = (s) => {
    const d = new Date(s);
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' ' + fmtDate(iso(d));
  };

  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_VI = {
    mon: 'Thứ Hai',
    tue: 'Thứ Ba',
    wed: 'Thứ Tư',
    thu: 'Thứ Năm',
    fri: 'Thứ Sáu',
    sat: 'Thứ Bảy',
    sun: 'Chủ nhật'
  };
  const SESSION_VI = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' };
  const dayKey = (dateStr) => DAYS[new Date(dateStr + 'T00:00:00').getDay()];

  const sessionOf = (t) => {
    const h = parseInt(t.slice(0, 2), 10);
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  };

  const mins = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
  const hoursOf = (s) => Math.round(((mins(s.end) - mins(s.start)) / 60) * 10) / 10;
  const overlap = (a, b) =>
    a.date === b.date && mins(a.start) < mins(b.end) && mins(b.start) < mins(a.end);

  const debounce = (fn, ms = 250) => {
    let t;

    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  const qs = (k) => new URLSearchParams(location.search).get(k);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const csv = (name, rows) => {
    const body = rows.map(
      (r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')
    ).join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  return {
    norm,
    pad,
    iso,
    today,
    addDays,
    fmtDate,
    fmtDateTime,
    DAY_VI,
    SESSION_VI,
    DAYS,
    dayKey,
    sessionOf,
    mins,
    hoursOf,
    overlap,
    debounce,
    qs,
    $,
    $$,
    csv
  };
})();
