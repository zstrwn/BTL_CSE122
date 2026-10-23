/* AI mô phỏng ở Frontend: bộ máy ghép (AI-1), dự báo thiếu hụt (AI-2) và luồng trải nghiệm AI dùng chung.
   Luồng: Nhập -> Kiểm tra -> Đang xử lý -> Kết quả -> Vì sao? -> Chấp nhận/Sửa/Từ chối/Tạo lại/Lưu.*/
window.VL = window.VL || {};

VL.ai = (function() {
  const { h } = VL.ui,
    S = VL.store,
    U = VL.util;

  const forcedFail = () => localStorage.getItem('vl_sim_ai_fail') === '1' || U.qs('ai') === 'fail';

  const requiredOf = (shift) => {
    if (shift.requiredSkills && shift.requiredSkills.length) return shift.requiredSkills;
    const o = S.find('opportunities', shift.oppId);
    return o ? o.requiredSkills : [];
  };

  const conflicts = (vol, shift) => S.where('registrations', (r) =>
    r.volunteerId === vol.id &&
      ['pending', 'confirmed'].includes(r.status) &&
      r.shiftId !== shift.id
  ).some((r) => {
    const s = S.find('shifts', r.shiftId);
    return s && U.overlap(s, shift);
  });

  const completeness = (vol) =>
    (vol.skills && vol.skills.length ? 0.4 : 0) +
      (Object.values(vol.availability || {}).some((a) => a.length) ? 0.4 : 0) +
      (vol.bio ? 0.2 : 0);

  // AI-1: điểm ghép giữa một tình nguyện viên và một ca (luật có trọng số)
  function matchScore(vol, shift, weights) {
    const w = Object.assign({ skill: 0.6, time: 0.3, exp: 0.1 }, weights || {});
    const sum = w.skill + w.time + w.exp;
    Object.keys(w).forEach((k) => (w[k] /= sum));

    const req = requiredOf(shift),
      have = vol.skills || [],
      hit = req.filter((x) => have.includes(x)),
      missing = req.filter((x) => !have.includes(x));

    const skill = req.length ? hit.length / req.length : 0.5;

    const day = U.dayKey(shift.date),
      ses = U.sessionOf(shift.start),
      free = ((vol.availability || {})[day] || []).includes(ses),
      busy = conflicts(vol, shift);

    const time = busy ? 0 : free ? 1 : 0,
      exp = Math.min((vol.hours || 0) / 50, 1);

    const score = Math.round(100 * (w.skill * skill + w.time * time + w.exp * exp));
    const why = [];
    why.push(
      req.length
        ? {
          tone: hit.length === req.length ? 'ok' : hit.length ? 'warn' : 'bad',
          label: 'Kỹ năng',
          detail: 'Khớp ' +
            hit.length +
            '/' +
            req.length +
            (hit.length ? ': ' + S.skillNames(hit).join(', ') : '') +
            (missing.length ? ' · thiếu ' + S.skillNames(missing).join(', ') : '')
        }
        : { tone: 'ok', label: 'Kỹ năng', detail: 'Ca không yêu cầu kỹ năng đặc thù.' }
    );
    why.push(
      busy
        ? { tone: 'bad', label: 'Lịch', detail: 'Trùng với một ca khác đã đăng ký.' }
        : {
          tone: free ? 'ok' : 'warn',
          label: 'Lịch rảnh',
          detail: (free ? 'Rảnh ' : 'Chưa khai báo rảnh ') +
            U.DAY_VI[day] +
            ' buổi ' +
            U.SESSION_VI[ses].toLowerCase() +
            '.'
        }
    );
    why.push({
      tone: exp > 0.5 ? 'ok' : 'warn',
      label: 'Kinh nghiệm',
      detail: (vol.hours || 0) + ' giờ đã đóng góp.'
    });
    return {
      score,
      skill,
      time,
      exp,
      hit,
      missing,
      free,
      busy,
      why,
      confidence: completeness(vol)
    };
  }

  // AI-2: dự báo khả năng thiếu người của các ca sắp tới
  function predictShortage(days, threshold) {
    const lo = U.today(),
      hi = U.addDays(days),
      vols = S.all('volunteers');

    const regs = S.all('registrations');
    const hist = regs.filter((r) => ['completed', 'no_show'].includes(r.status));
    const noShow = hist.length
      ? hist.filter((r) => r.status === 'no_show').length / hist.length
      : 0.1;

    const items = S.where('shifts', (s) => s.status === 'open' && s.date >= lo && s.date <= hi)
      .map((s) => {
        const opp = S.find('opportunities', s.oppId),
          org = opp ? S.find('organizations', opp.orgId) : null,
          req = requiredOf(s);

        const confirmed = S.filled(s.id),
          pending = regs.filter((r) => r.shiftId === s.id && r.status === 'pending').length;

        const daysLeft = Math.max(
          0,
          Math.round((new Date(s.date) - new Date(U.today())) / 86400000)
        );
        const expected = (confirmed + pending * 0.6) * (1 - noShow);
        const pool = vols.filter((v) =>
          !conflicts(v, s) &&
            matchScore(v, s).time === 1 &&
            (!req.length || req.some((x) => (v.skills || []).includes(x)))
        ).length;
        const gap = Math.max(0, s.capacity - expected);
        const urgency = daysLeft <= 3 ? 1.25 : daysLeft <= 7 ? 1.1 : 1;
        const risk = Math.min(
          100,
          Math.round((gap / s.capacity) * 100 * urgency - Math.min(pool, 5) * 3)
        );
        const why = [
          {
            tone: confirmed / s.capacity < 0.5 ? 'bad' : 'warn',
            label: 'Mức lấp đầy',
            detail: confirmed + ' đã xác nhận + ' + pending + ' chờ duyệt / ' + s.capacity + ' chỗ.'
          },
          {
            tone: daysLeft <= 3 ? 'bad' : 'warn',
            label: 'Thời gian',
            detail: 'Còn ' + daysLeft + ' ngày nữa là diễn ra.'
          },
          {
            tone: pool >= 3 ? 'ok' : 'bad',
            label: 'Nguồn lực',
            detail: pool + ' tình nguyện viên rảnh và có kỹ năng phù hợp.'
          },
          {
            tone: 'warn',
            label: 'Lịch sử',
            detail: 'Tỉ lệ vắng mặt trước đây ' + Math.round(noShow * 100) + '%, đã trừ vào dự báo.'
          }
        ];
        return {
          shift: s,
          opp,
          org,
          confirmed,
          pending,
          expected: Math.round(expected * 10) / 10,
          risk: Math.max(0, risk),
          level: risk >= 70 ? 'high' : risk >= threshold ? 'med' : 'low',
          pool,
          daysLeft,
          why
        };
      })
      .filter((x) => x.level !== 'low')
      .sort((a, b) => b.risk - a.risk);

    return {
      items,
      total: S.where('shifts', (s) => s.status === 'open' && s.date >= lo && s.date <= hi).length,
      confidence: hist.length >= 3 ? 0.85 : 0.5
    };
  }

  // Luồng trải nghiệm AI dùng chung
  function flow(root, cfg) {
    const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });
    root.append(out);

    let attempt = 0,
      res = null;

    const idle = () => {
      out.innerHTML = '';
      out.append(
        h(
          'div',
          { class: 'ai-idle mut' },
          cfg.idle || 'Nhập dữ liệu rồi bấm nút chạy AI để xem đề xuất.'
        )
      );
    };

    const say = (kind, text) => {
      const b = out.querySelector('.ai-banner');
      if (b) b.remove();
      out.querySelector('.ai-card').prepend(
        h('div', { class: 'ai-banner ' + kind, role: 'status' }, text)
      );
    };

    async function act(btn, fn, ok, after) {
      btn.disabled = true;

      try {
        await VL.api.run(() => fn());
        if (ok) VL.ui.toast(ok);
        if (after) after();
      } catch (e) {
        VL.ui.toast(e.message, 'bad');
        btn.disabled = false;
      }
    }

    function report(msg) {
      const s = VL.auth.current();
      S.add('reports', {
        type: 'ai',
        targetId: cfg.id,
        reason: 'Phản hồi về ' + cfg.title + ': ' + msg,
        reporter: s ? s.name : '',
        status: 'open',
        createdAt: new Date().toISOString()
      });
      VL.ui.toast('Đã gửi báo cáo cho quản trị viên.');
    }

    function failView(kind, message) {
      out.innerHTML = '';
      const btn = (t, fn, c) => h(
        'button',
        { type: 'button', class: 'btn ' + (c || ''), onclick: fn },
        t
      );
      out.append(
        h(
          'div',
          { class: 'ai-card ' + kind, role: 'alert' },
          h(
            'div',
            { class: 'ai-h' },
            h('span', { class: 'badge warn' }, kind === 'error' ? 'Lỗi AI' : 'Không đủ dữ liệu')
          ),
          h('p', null, message),
          h(
            'div',
            { class: 'ai-actions' },
            btn('Thử lại', () => start(true), 'primary'),
            cfg.manual ? btn('Dùng thủ công', () => cfg.manual()) : null,
            btn('Bỏ qua', idle),
            btn('Báo cáo', () => report(message))
          )
        )
      );
    }

    function resultView() {
      out.innerHTML = '';
      const low = res.status === 'uncertain';

      const conf = Math.round((res.confidence || 0) * 100),
        body = h('div', { class: 'ai-body' });

      body.append(cfg.renderResult(res));
      const mk = (t, c, fn) => h(
        'button',
        { type: 'button', class: 'btn ' + c, onclick: (e) => fn(e.currentTarget) },
        t
      );

      const acc = mk(
        '✔ Chấp nhận',
        'primary',
        (b) => act(
          b,
          () => cfg.accept(res),
          cfg.acceptMsg || 'Đã chấp nhận.',
          () => {
            say('ok', '✔ ' + (cfg.acceptedText || 'Bạn đã chấp nhận kết quả AI.'));
            lockAll();
          }
        )
      );

      const rej = mk(
        '✖ Từ chối',
        'ghost',
        (b) => act(
          b,
          () => cfg.reject && cfg.reject(res),
          'Đã từ chối. AI sẽ không áp dụng kết quả này.',
          () => {
            say('bad', 'Bạn đã từ chối kết quả. Có thể tạo lại hoặc dùng thủ công.');
            lockAll();
          }
        )
      );

      const ed = mk('✎ Sửa', '', async () => {
        const nd = cfg.edit ? await cfg.edit(res) : null;

        if (nd) {
          res = nd;
          resultView();
        }
      });

      const rg = mk('↻ Tạo lại', '', () => {
        attempt++;
        start(true);
      });

      const sv = mk(
        '💾 Lưu',
        '',
        (b) => act(
          b,
          () => cfg.save && cfg.save(res),
          cfg.saveMsg || 'Đã lưu vào ứng dụng.',
          () => say('info', '💾 Đã lưu kết quả.')
        )
      );

      function lockAll() {
        [acc, rej, ed].forEach((x) => (x.disabled = true));
      }

      out.append(
        h(
          'div',
          { class: 'ai-card ' + (low ? 'uncertain' : '') },
          low
            ? h(
              'div',
              { class: 'ai-banner warn', role: 'status' },
              'AI chưa chắc chắn về kết quả này (độ tin cậy ' +
                conf +
                '%). ' +
                (res.message || 'Hãy kiểm tra kỹ hoặc chỉnh sửa.')
            )
            : null,
          h(
            'div',
            { class: 'ai-h' },
            h('span', { class: 'badge ai' }, '✨ ' + cfg.title),
            h('span', { class: 'conf' }, 'Độ tin cậy ' + conf + '%'),
            VL.ui.bar(conf, low ? 'warn' : '')
          ),
          body,
          h(
            'details',
            { class: 'why', open: true },
            h('summary', null, 'Vì sao có kết quả này?'),
            h(
              'ul',
              null,
              (res.why || []).map(
                (w) => h('li', { class: w.tone }, h('b', null, w.label + ': '), w.detail)
              )
            )
          ),
          h(
            'div',
            { class: 'ai-actions' },
            acc,
            ed,
            rej,
            rg,
            sv,
            low && cfg.manual ? mk('Dùng thủ công', '', () => cfg.manual()) : null,
            low ? mk('Báo cáo', '', () => report(res.message || 'Kết quả không chắc chắn')) : null
          )
        )
      );
    }

    async function start(again) {
      if (!again) attempt = 0;
      const steps = cfg.steps || ['Đang đọc dữ liệu…', 'Đang phân tích…', 'Đang tổng hợp kết quả…'];
      out.innerHTML = '';

      const txt = h('span', null, steps[0]),
        pb = h('span', { style: 'width:5%' });

      out.append(
        h(
          'div',
          { class: 'ai-card processing', role: 'status', 'aria-label': 'AI đang xử lý' },
          h('div', { class: 'ai-h' }, h('span', { class: 'badge ai' }, '✨ AI đang xử lý')),
          h('div', { class: 'bar' }, pb),
          h('p', { class: 'mut' }, txt),
          h('div', { class: 'skeleton' })
        )
      );

      const anim = (async () => {
        for (let i = 0; i < steps.length; i++) {
          txt.textContent = steps[i];
          pb.style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
          await new Promise((r) => setTimeout(r, 450));
        }
      })();

      try {
        const [r] = await Promise.all([
          new Promise(
            (ok, no) => setTimeout(() => {
              try {
                if (forcedFail() || VL.api.simError()) throw new Error('x');
                ok(cfg.run(attempt));
              } catch (e) {
                no(e);
              }
            }, 100)
          ),
          anim
        ]);

        if (r.status === 'insufficient')
          return failView('insufficient', r.message || 'Không đủ dữ liệu để đưa ra đề xuất.');
        res = r;
        resultView();
      } catch (e) {
        failView('error', 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại.');
      }
    }

    idle();
    return { start: () => start(false), reset: idle };
  }

  return { matchScore, predictShortage, flow, requiredOf, conflicts, completeness };
})();
