/* =====================================================
   forecast.js – QUY TẮC ĐẾM CHỖ & DỰ BÁO THIẾU NGƯỜI (AI-2)
   Dùng cho Bảng điều khiển (dự báo nhanh) và Cảnh báo thiếu ca.
   ===================================================== */

/* ---------- Giờ giấc ---------- */
const dayKey = (iso) => DAYS[new Date(iso + 'T00:00:00').getDay()];

function sessionOf(time) {
  const hour = parseInt(time.slice(0, 2), 10);
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

const minutes = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);

function isOverlap(a, b) {
  return a.date === b.date && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}

/* ---------- Đếm chỗ ---------- */

// Số người đã chắc chắn tham gia (đã xác nhận / đã hoàn thành)
function countFilled(shiftId) {
  return registrations.filter((r) => r.shiftId === shiftId && ['confirmed', 'completed'].includes(r.status)).length;
}

// Các ca đang mở trong khoảng từ hôm nay đến hôm nay + days ngày
function upcomingShifts(days) {
  const lo = today(), hi = addDays(days);
  return shifts.filter((s) => s.status === 'open' && s.date >= lo && s.date <= hi);
}

// Ca kèm thông tin hoạt động và số người đã đủ (để hiển thị)
function viewOf(shift) {
  return Object.assign({}, shift, { opp: findOpp(shift.oppId), filled: countFilled(shift.id) });
}

// Tình nguyện viên đã có ca khác trùng giờ chưa?
function hasConflict(vol, shift) {
  return registrations.some((r) => {
    if (r.volunteerId !== vol.id || r.shiftId === shift.id || !['pending', 'confirmed'].includes(r.status)) return false;
    return isOverlap(findShift(r.shiftId), shift);
  });
}

// Tình nguyện viên có khai báo rảnh đúng thứ + buổi của ca không?
function isFree(vol, shift) {
  return (vol.availability[dayKey(shift.date)] || []).includes(sessionOf(shift.start));
}

/* ---------- AI-2: dự báo ca có nguy cơ thiếu người ---------- */

// threshold: ngưỡng cảnh báo (%). Trả về { items, total, confidence }
function predictShortage(days, threshold) {
  const history = registrations.filter((r) => ['completed', 'no_show'].includes(r.status));
  const noShow = history.length
    ? history.filter((r) => r.status === 'no_show').length / history.length   // tỉ lệ vắng mặt trước đây
    : 0.1;

  const open = upcomingShifts(days);

  const items = open.map((s) => {
    const required = s.requiredSkills;
    const confirmed = countFilled(s.id);
    const pending = registrations.filter((r) => r.shiftId === s.id && r.status === 'pending').length;
    const daysLeft = Math.max(0, Math.round((new Date(s.date) - new Date(today())) / 86400000));

    // Số người dự kiến đến thật: đã xác nhận + 60% số chờ duyệt, trừ đi tỉ lệ vắng mặt
    const expected = (confirmed + pending * 0.6) * (1 - noShow);

    // Số tình nguyện viên có thể bổ sung: rảnh, không trùng lịch, có kỹ năng phù hợp
    const pool = volunteers.filter((v) =>
      !hasConflict(v, s) && isFree(v, s) &&
      (!required.length || required.some((x) => v.skills.includes(x)))
    ).length;

    // Nguy cơ (%) = tỉ lệ còn thiếu × độ gấp − bù theo nguồn lực sẵn có
    const gap = Math.max(0, s.capacity - expected);
    const urgency = daysLeft <= 3 ? 1.25 : daysLeft <= 7 ? 1.1 : 1;
    const risk = Math.min(100, Math.round((gap / s.capacity) * 100 * urgency - Math.min(pool, 5) * 3));

    return {
      shift: s,
      opp: findOpp(s.oppId),
      expected: Math.round(expected * 10) / 10,
      risk: Math.max(0, risk),
      level: risk >= 70 ? 'high' : risk >= threshold ? 'med' : 'low',
      why: [
        { tone: confirmed / s.capacity < 0.5 ? 'bad' : 'warn', label: 'Mức lấp đầy',
          detail: confirmed + ' đã xác nhận + ' + pending + ' chờ duyệt / ' + s.capacity + ' chỗ.' },
        { tone: daysLeft <= 3 ? 'bad' : 'warn', label: 'Thời gian', detail: 'Còn ' + daysLeft + ' ngày nữa là diễn ra.' },
        { tone: pool >= 3 ? 'ok' : 'bad', label: 'Nguồn lực', detail: pool + ' tình nguyện viên rảnh và có kỹ năng phù hợp.' },
        { tone: 'warn', label: 'Lịch sử', detail: 'Tỉ lệ vắng mặt trước đây ' + Math.round(noShow * 100) + '%, đã trừ vào dự báo.' }
      ]
    };
  })
    .filter((x) => x.level !== 'low')
    .sort((a, b) => b.risk - a.risk);

  return { items: items, total: open.length, confidence: history.length >= 3 ? 0.85 : 0.5 };
}
