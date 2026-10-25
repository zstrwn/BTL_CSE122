/* =====================================================
   render.js – VẼ GIAO DIỆN
   Danh sách ca (cột trái) và chi tiết ca (cột phải).
   ===================================================== */

const shiftListEl = document.getElementById('shift-list');
const detailEl    = document.getElementById('detail');
const searchInput = document.getElementById('search-input');


// Các ca còn thiếu người trong 60 ngày tới, đã lọc theo ô tìm kiếm, ca thiếu nhiều nhất lên đầu
function getVisibleShifts() {
  const today = addDays(0), limit = addDays(60);
  const keyword = normalize(searchInput.value);

  return shifts
    .filter((s) => s.date >= today && s.date <= limit && countFilled(s.id) < s.capacity)
    .filter((s) => !keyword || normalize(opportunities[s.oppId]).includes(keyword))
    .sort((a, b) => countFilled(a.id) / a.capacity - countFilled(b.id) / b.capacity);
}

// 5.1 Danh sách ca (cột trái)
function renderShiftList() {
  const list = getVisibleShifts();

  if (!list.length) {
    state.selectedShiftId = '';
    if (searchInput.value.trim()) {
      showEmpty(shiftListEl, '🔍', 'Không tìm thấy ca phù hợp', 'Thử từ khóa khác.');
    } else {
      showEmpty(shiftListEl, '✅', 'Mọi ca đã đủ người', 'Không còn ca nào cần ghép.');
    }
    return;
  }

  // Nếu ca đang chọn không còn trong danh sách thì chọn ca đầu tiên
  if (!list.some((s) => s.id === state.selectedShiftId)) state.selectedShiftId = list[0].id;

  let html = '<div class="list">';
  list.forEach((s) => {
    const filled = countFilled(s.id);
    const percent = Math.round(filled / s.capacity * 100);
    const selected = s.id === state.selectedShiftId;
    html +=
      '<button type="button" class="item' + (selected ? ' sel' : '') + '" data-shift-id="' + s.id + '" aria-pressed="' + selected + '">' +
        '<b>' + opportunities[s.oppId] + '</b>' +
        '<div class="mut">' + fmtShift(s) + '</div>' +
        '<div class="row">' + barHTML(percent) + '<small>thiếu ' + (s.capacity - filled) + '</small></div>' +
      '</button>';
  });
  shiftListEl.innerHTML = html + '</div>';
}

// 5.2 Chi tiết ca (cột phải): người đã xếp + ứng viên đề xuất
function renderDetail() {
  const shift = findShift(state.selectedShiftId);
  if (!shift) {
    showEmpty(detailEl, '👈', 'Chưa chọn ca', 'Chọn một ca ở bên trái để xem chi tiết.');
    return;
  }

  const filled = countFilled(shift.id);
  const isFull = filled >= shift.capacity;
  const regs = activeRegs(shift.id);

  let html =
    '<h2>' + opportunities[shift.oppId] + '</h2>' +
    '<p class="mut">' + fmtShift(shift) + ' · ' + filled + '/' + shift.capacity +
    ' đã xác nhận · yêu cầu: ' + (skillNames(shift.requiredSkills).join(', ') || 'không') + '</p>';

  // Đã xếp / chờ duyệt
  html += '<h3>Đã xếp / chờ duyệt (' + regs.length + ')</h3>';
  if (regs.length) {
    html += '<div class="list">';
    regs.forEach((r) => {
      const confirmBtn = r.status === 'pending'
        ? '<button type="button" class="btn sm primary" data-action="confirm" data-reg-id="' + r.id + '">Xác nhận</button>'
        : '';
      html +=
        '<div class="item row between">' +
          '<span>' + findVolunteer(r.volunteerId).name + ' ' + statusBadge(r.status) + '</span>' +
          '<div class="acts">' + confirmBtn +
            '<button type="button" class="btn sm lnk-bad" data-action="remove" data-reg-id="' + r.id + '">Bỏ xếp</button>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
  } else {
    html += '<p class="mut">Chưa có ai.</p>';
  }

  // Ứng viên đề xuất: người chưa có trong ca, điểm cao xếp trước, lấy tối đa 8
  const candidates = volunteers
    .filter((v) => !regs.some((r) => r.volunteerId === v.id))
    .map((v) => ({ vol: v, sc: matchScore(v, shift) }))
    .sort((a, b) => b.sc.score - a.sc.score)
    .slice(0, 8);

  html += '<h3 style="margin-top:14px">Ứng viên đề xuất</h3>';
  if (candidates.length) {
    candidates.forEach((c) => {
      const off = c.sc.busy || isFull;
      html +=
        '<div class="cand">' +
          '<div class="info"><b>' + c.vol.name + '</b>' +
            '<div class="hint">' + c.sc.why.map((w) => w.detail).join(' · ') + '</div></div>' +
          '<span class="score">' + c.sc.score + '%</span>' +
          '<button type="button" class="btn sm primary" data-action="assign" data-vol-id="' + c.vol.id + '"' +
            (off ? ' disabled' : '') + (c.sc.busy ? ' title="Trùng lịch"' : '') + '>Xếp vào ca</button>' +
        '</div>';
    });
  } else {
    html += '<p class="mut">Không còn tình nguyện viên khả dụng.</p>';
  }

  detailEl.innerHTML = html;
}

function renderAll() {
  renderShiftList();
  renderDetail();
}
