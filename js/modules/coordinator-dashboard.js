/* =====================================================
   dashboard.js – LẤY DỮ LIỆU & VẼ GIAO DIỆN BẢNG ĐIỀU KHIỂN
   Gồm: ô chỉ số (KPI), biểu đồ mức lấp đầy, dự báo nhanh,
        bảng cung – cầu theo kỹ năng.
   ===================================================== */

const kpiEl    = document.getElementById('kpi');
const barsEl   = document.getElementById('bars');
const shortEl  = document.getElementById('short');
const skillsEl = document.getElementById('skills');

// Đường dẫn sang các trang khác của điều phối viên
const MATCHING_URL = '../bang-ghep-nguoi/index.html';
const SHORTAGE_URL = '../canh-bao-thieu-ca/index.html';

// Lấy dữ liệu theo khoảng thời gian (days) và lĩnh vực (cat; '' = tất cả)
function getDashboardData(days, cat) {
  const sh = upcomingShifts(days)
    .map(viewOf)
    .filter((s) => !cat || s.opp.categoryId === cat)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { sh: sh, vols: volunteers, pred: predictShortage(days, 40) };
}

// 1. Năm ô chỉ số
function renderKpi(d) {
  const capacity = d.sh.reduce((t, s) => t + s.capacity, 0);
  const filled = d.sh.reduce((t, s) => t + s.filled, 0);
  const hours = d.vols.reduce((t, v) => t + v.hours, 0);

  const items = [
    [d.sh.length, 'Ca đang mở'],
    [capacity ? Math.round(filled / capacity * 100) + '%' : '—', 'Tỉ lệ lấp đầy'],
    [capacity - filled, 'Chỗ còn thiếu'],
    [d.vols.length, 'Tình nguyện viên'],
    [hours, 'Giờ đóng góp']
  ];

  kpiEl.innerHTML = items.map((k) => '<article class="card kpi"><b>' + k[0] + '</b><span>' + k[1] + '</span></article>').join('');
}

// 2. Biểu đồ mức lấp đầy: tối đa 10 ca, đỏ nếu < 40%, vàng nếu < 70%
function renderBars(d) {
  if (!d.sh.length) {
    showEmpty(barsEl, '📊', 'Không có ca mở trong khoảng này');
    return;
  }
  const rows = d.sh.slice(0, 10).map((s) => {
    const percent = Math.round(s.filled / s.capacity * 100);
    const tone = percent < 40 ? 'bad' : percent < 70 ? 'warn' : '';
    return '<div class="r">' +
      '<span title="' + s.opp.title + '">' + fmtDate(s.date).slice(0, 5) + ' ' + s.opp.title.slice(0, 18) + '</span>' +
      barHTML(percent, tone) +
      '<b>' + s.filled + '/' + s.capacity + '</b>' +
    '</div>';
  });
  barsEl.innerHTML = '<div class="bars">' + rows.join('') + '</div>';
}

// 3. Dự báo nhanh: 3 ca có nguy cơ cao nhất
function renderShort(d) {
  if (!d.pred.items.length) {
    shortEl.innerHTML = '<p class="mut">Chưa phát hiện ca nào có nguy cơ thiếu người.</p>';
    return;
  }
  const rows = d.pred.items.slice(0, 3).map((x) =>
    '<div class="item row between">' +
      '<div><b>' + x.opp.title + '</b>' +
        '<div class="mut">' + fmtShift(x.shift) + ' · nguy cơ ' + x.risk + '%</div></div>' +
      '<a class="btn sm primary" href="' + MATCHING_URL + '?shift=' + x.shift.id + '">Xếp người</a>' +
    '</div>'
  );
  shortEl.innerHTML = '<div class="list">' + rows.join('') + '</div>' +
    '<p style="margin-top:10px"><a href="' + SHORTAGE_URL + '">Xem phân tích AI đầy đủ →</a></p>';
}

// 4. Bảng cung – cầu theo kỹ năng
function renderSkills(d) {
  if (!d.sh.length) {
    showEmpty(skillsEl, '🧰', 'Chưa có nhu cầu kỹ năng');
    return;
  }
  const rows = skills.filter(isActive).map((k) => ({
    name: k.name,
    // nhu cầu = tổng số chỗ còn thiếu của các ca yêu cầu kỹ năng này
    demand: d.sh.reduce((t, s) => t + (s.requiredSkills.includes(k.id) ? s.capacity - s.filled : 0), 0),
    // nguồn lực = số tình nguyện viên có kỹ năng này
    supply: d.vols.filter((v) => v.skills.includes(k.id)).length
  })).filter((r) => r.demand || r.supply);

  const body = rows.map((r) =>
    '<tr>' +
      '<td data-label="Kỹ năng">' + r.name + '</td>' +
      '<td data-label="Nhu cầu">' + r.demand + '</td>' +
      '<td data-label="Nguồn lực">' + r.supply + '</td>' +
      '<td data-label="Cân đối">' + (r.demand > r.supply
        ? '<span class="badge bad">Thiếu ' + (r.demand - r.supply) + '</span>'
        : '<span class="badge ok">Đủ</span>') + '</td>' +
    '</tr>'
  ).join('');

  skillsEl.innerHTML = '<div class="tbl-wrap"><table class="stack">' +
    '<thead><tr><th>Kỹ năng</th><th>Nhu cầu (chỗ)</th><th>Nguồn lực (TNV)</th><th>Cân đối</th></tr></thead>' +
    '<tbody>' + body + '</tbody></table></div>';
}

// Vẽ lại toàn bộ bảng điều khiển
function renderDashboard(d) {
  renderKpi(d);
  renderBars(d);
  renderShort(d);
  renderSkills(d);
}
