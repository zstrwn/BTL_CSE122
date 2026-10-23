/* Thành phần giao diện dùng lại: dựng DOM, toast, hộp thoại, trạng thái, huy hiệu */
window.VL = window.VL || {};

VL.ui = (function() {
  function h(tag, attrs) {
    const el = document.createElement(tag);

    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;

      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });

    const add = (c) => {
      if (Array.isArray(c)) c.forEach(add);
      else if (c != null && c !== false)
        el.append(c.nodeType ? c : document.createTextNode(String(c)));
    };

    for (let i = 2; i < arguments.length; i++) add(arguments[i]);
    return el;
  }

  const LABELS = {
    pending: ['Chờ duyệt', 'warn'],
    confirmed: ['Đã xác nhận', 'ok'],
    rejected: ['Bị từ chối', 'bad'],
    cancelled: ['Đã hủy', 'mute'],
    completed: ['Hoàn thành', 'info'],
    no_show: ['Vắng mặt', 'bad'],
    draft: ['Nháp', 'mute'],
    open: ['Đang mở', 'ok'],
    closed: ['Đã đóng', 'mute'],
    archived: ['Lưu trữ', 'mute'],
    approved: ['Đã duyệt', 'ok'],
    active: ['Hoạt động', 'ok'],
    locked: ['Bị khóa', 'bad'],
    suspended: ['Tạm ngưng', 'bad'],
    resolved: ['Đã xử lý', 'info'],
    dismissed: ['Bác bỏ', 'mute'],
    done: ['Đã diễn ra', 'info'],
    full: ['Đủ người', 'info'],
    accepted: ['Đã chấp nhận', 'ok'],
    saved: ['Đã lưu', 'info'],
    'shift:open': ['Còn chỗ', 'ok'],
    'mod:pending': ['Chờ kiểm duyệt', 'warn'],
    'mod:rejected': ['Kiểm duyệt: từ chối', 'bad'],
    'mod:approved': ['Đã kiểm duyệt', 'ok']
  };

  const badge = (s, kind) => {
    const l = LABELS[kind ? kind + ':' + s : s] || LABELS[s] || [s, 'mute'];
    return h('span', { class: 'badge ' + l[1] }, l[0]);
  };

  function toast(msg, type) {
    let r = document.getElementById('toast-region');

    if (!r) {
      r = h('div', { id: 'toast-region', 'aria-live': 'polite' });
      document.body.append(r);
    }

    const t = h(
      'div',
      { class: 'toast ' + (type || 'ok'), role: type === 'bad' ? 'alert' : 'status' },
      msg
    );
    r.append(t);
    setTimeout(() => t.remove(), 3800);
  }

  let mid = 0;

  function modal(o) {
    return new Promise((resolve) => {
      const id = 'dlg-' + (++mid);
      let done = false;
      const d = h('dialog', { class: 'modal' + (o.wide ? ' wide' : ''), 'aria-labelledby': id });
      const form = h(
        'form',
        { method: 'dialog', novalidate: true },
        h(
          'div',
          { class: 'modal-h' },
          h('h2', { id }, o.title),
          h(
            'button',
            { type: 'button', class: 'icon-btn', 'aria-label': 'Đóng', onclick: () => d.close() },
            '✕'
          )
        ),
        h('div', { class: 'modal-b' }, o.body),
        o.hideFooter
          ? null
          : h(
            'div',
            { class: 'modal-f' },
            h(
              'button',
              { type: 'button', class: 'btn ghost', onclick: () => d.close() },
              o.cancelLabel || 'Hủy'
            ),
            h(
              'button',
              { type: 'submit', class: 'btn ' + (o.danger ? 'danger' : 'primary') },
              o.submitLabel || 'Lưu'
            )
          )
      );

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type=submit]');
        if (btn) btn.disabled = true;

        try {
          const r = o.onSubmit ? await o.onSubmit(form, d) : true;

          if (r === false) {
            if (btn) btn.disabled = false;
            return;
          }

          done = true;
          resolve(r === undefined ? true : r);
          d.close();
        } catch (err) {
          if (btn) btn.disabled = false;
          toast(err.message || 'Có lỗi xảy ra.', 'bad');
        }
      });

      d.addEventListener('close', () => {
        d.remove();
        if (!done) resolve(null);
      });

      d.append(form);
      document.body.append(d);
      d.showModal();
      const f = d.querySelector('input:not([type=hidden]),select,textarea');
      if (f) f.focus();
    });
  }

  // Xác nhận; nếu reason=true thì bắt buộc nhập lý do và trả về chuỗi lý do
  function confirm(o) {
    const ta = h('textarea', {
      name: 'reason',
      rows: 3,
      id: 'cf-reason',
      placeholder: o.reasonHint || 'Nhập lý do…'
    });
    const body = h(
      'div',
      null,
      h('p', null, o.message),
      o.reason
        ? h(
          'div',
          { class: 'field' },
          h('label', { for: 'cf-reason' }, o.reasonLabel || 'Lý do'),
          ta
        )
        : null
    );

    return modal({
      title: o.title,
      body,
      danger: o.danger,
      submitLabel: o.confirmLabel || 'Xác nhận',
      onSubmit: (f) => {
        if (!o.reason) return true;
        const v = ta.value.trim();

        if (v.length < 5) {
          VL.v.setError(ta, 'Vui lòng nhập lý do (tối thiểu 5 ký tự).');
          ta.focus();
          return false;
        }

        return v;
      }
    });
  }

  // Trạng thái đang tải / rỗng / lỗi cho một vùng nội dung
  function state(box, type, o) {
    o = o || {};
    box.innerHTML = '';

    if (type === 'loading') {
      box.append(
        h(
          'div',
          { class: 'skeleton-wrap', role: 'status', 'aria-label': 'Đang tải dữ liệu' },
          [1, 2, 3].map(() => h('div', { class: 'skeleton' })),
          h('span', { class: 'sr' }, 'Đang tải…')
        )
      );
      return;
    }

    const ico = type === 'error' ? '⚠️' : (o.icon || '📭');
    box.append(
      h(
        'div',
        { class: 'state ' + type, role: type === 'error' ? 'alert' : 'status' },
        h('div', { class: 'state-i', 'aria-hidden': 'true' }, ico),
        h('h3', null, o.title || (type === 'error' ? 'Đã xảy ra lỗi' : 'Chưa có dữ liệu')),
        h(
          'p',
          { class: 'mut' },
          o.message || (type === 'error' ? 'Không thể tải dữ liệu.' : 'Không có mục nào phù hợp.')
        ),
        type === 'error' && o.retry
          ? h('button', { class: 'btn', onclick: o.retry }, 'Thử lại')
          : null,
        type === 'empty' && o.action
          ? h('button', { class: 'btn primary', onclick: o.action.fn }, o.action.label)
          : null
      )
    );
  }

  // Chạy hành động bất đồng bộ trên nút: vô hiệu hóa trong lúc xử lý, báo thành công/lỗi
  async function act(btn, fn, okMsg) {
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }

    try {
      const r = await VL.api.run(fn);
      if (okMsg) toast(okMsg);
      return r;
    } catch (e) {
      toast(e.message, 'bad');
      return undefined;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    }
  }

  const field = (label, input, hint) => {
    const id = input.id || input.name;
    if (!input.id) input.id = id;
    return h(
      'div',
      { class: 'field' },
      h('label', { for: id }, label),
      input,
      hint ? h('div', { class: 'hint' }, hint) : null
    );
  };

  const options = (list, sel, ph) => [ph ? h('option', { value: '' }, ph) : null].concat(
    list.map((x) => h('option', { value: x.id, selected: x.id === sel }, x.name))
  );
  const chips = (names) => h(
    'div',
    { class: 'chips' },
    names.length
      ? names.map((n) => h('span', { class: 'chip' }, n))
      : h('span', { class: 'mut' }, 'Chưa có')
  );
  const bar = (pct, tone) => h(
    'div',
    { class: 'bar ' + (tone || ''), role: 'img', 'aria-label': pct + '%' },
    h('span', { style: 'width:' + Math.max(0, Math.min(100, pct)) + '%' })
  );
  return { h, badge, toast, modal, confirm, state, act, field, options, chips, bar };
})();
