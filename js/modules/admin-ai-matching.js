/* Quản trị viên – AI-1 Volunteer Matcher: nhập kỹ năng/lịch -> điểm phù hợp có giải thích (mô phỏng bằng luật) */
window.VL = window.VL || {};
VL.pages = VL.pages || {};

(function() {
  const { h } = VL.ui;

  // Dữ liệu ứng viên mẫu (độc lập với kho dữ liệu chính)
  const CANDIDATES = [
    { id: 1, name: 'Nguyễn Văn A', skills: ['Truyền thông', 'Dạy học', 'Lãnh đạo'], availability: 'Cuối tuần' },
    { id: 2, name: 'Trần Thị B', skills: ['Y tế', 'Sơ cứu', 'Hậu cần'], availability: 'Các ngày trong tuần' },
    { id: 3, name: 'Lê Văn C', skills: ['Sự kiện', 'Truyền thông', 'Hậu cần'], availability: 'Cuối tuần' },
    { id: 4, name: 'Phạm Quang D', skills: ['Dạy học', 'Sơ cứu'], availability: 'Buổi tối' },
    { id: 5, name: 'Hoàng Tú E', skills: ['Truyền thông', 'Dạy học'], availability: 'Cuối tuần' }
  ];

  // Kỹ năng chiếm 60%, lịch rảnh chiếm 40%
  function score(c, reqSkills, timeReq) {
    const common = c.skills.filter((s) => reqSkills.includes(s)),
      reasons = [];
    let sc = 0;

    if (common.length) {
      sc += 0.6 * (common.length / reqSkills.length);
      reasons.push('Khớp ' + common.length + '/' + reqSkills.length + ' kỹ năng (' + common.join(', ') + ')');
    } else reasons.push('Không khớp kỹ năng nào');

    if (c.availability === timeReq) {
      sc += 0.4;
      reasons.push('Hoàn toàn khớp lịch rảnh');
    } else reasons.push('Lịch rảnh không khớp (' + c.availability + ' so với ' + timeReq + ')');

    return { pct: Math.min(Math.round(sc * 100), 100), reasons };
  }

  VL.pages['admin-ai-matching'] = function() {
    const form = document.getElementById('aiForm'),
      out = document.getElementById('ai-out'),
      err = document.getElementById('ai-err'),
      btn = document.getElementById('btn-run-ai');

    VL.ui.state(out, 'empty', {
      icon: '✨',
      title: 'Chưa có kết quả',
      message: 'Chọn kỹ năng, thời gian rồi nhấn "Gợi ý" để AI phân tích.'
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      err.textContent = '';

      const skills = Array.from(form.querySelectorAll('input[name=skills]:checked')).map((c) => c.value),
        timeReq = form.elements.timeReq.value;

      if (!skills.length) {
        err.textContent = 'Vui lòng chọn ít nhất 1 kỹ năng yêu cầu.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Đang phân tích…';
      VL.ui.state(out, 'loading');

      VL.api.run(() => CANDIDATES.map((c) => Object.assign({}, c, score(c, skills, timeReq))))
        .then((rows) => {
          rows = rows.filter((r) => r.pct > 20).sort((a, b) => b.pct - a.pct);
          if (!rows.length)
            return VL.ui.state(out, 'empty', {
              icon: '🔍',
              title: 'Không có ứng viên phù hợp',
              message: 'Thử nới lỏng kỹ năng hoặc thời gian.'
            });

          out.innerHTML = '';
          out.append(
            h(
              'div',
              { class: 'list' },
              rows.map((r) => h(
                'article',
                { class: 'item' },
                h(
                  'div',
                  { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' },
                  h('b', null, '👤 ' + r.name),
                  h('span', { class: 'badge ' + (r.pct >= 70 ? 'ok' : 'warn') }, r.pct + '% phù hợp')
                ),
                h('div', { class: 'bar' + (r.pct >= 70 ? '' : ' warn'), style: 'margin:10px 0', 'aria-hidden': 'true' }, h('span', { style: 'width:' + r.pct + '%' })),
                h('p', { class: 'mut', style: 'margin:0 0 8px' }, 'Kỹ năng: ' + r.skills.join(', ') + ' · Lịch rảnh: ' + r.availability),
                h('details', null, h('summary', null, '💡 Vì sao?'), h('ul', null, r.reasons.map((x) => h('li', null, x))))
              ))
            )
          );
        })
        .catch((x) => VL.ui.state(out, 'error', { message: x.message, retry: () => form.requestSubmit() }))
        .finally(() => {
          btn.disabled = false;
          btn.textContent = '✨ Gợi ý ứng viên phù hợp';
        });
    });
  };
})();
