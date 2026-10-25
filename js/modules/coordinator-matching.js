/* Điểm phù hợp (%) và lý do ở mỗi ứng viên */

// Đăng ký còn hiệu lực (chờ duyệt hoặc đã xác nhận) của một ca
function activeRegs(shiftId) {
  return registrations.filter((r) => r.shiftId === shiftId && r.status !== 'cancelled');
}

// Số người ĐÃ XÁC NHẬN trong ca
function countFilled(shiftId) {
  return registrations.filter((r) => r.shiftId === shiftId && r.status === 'confirmed').length;
}

// Tình nguyện viên đã có ca khác trùng giờ chưa?
function hasConflict(vol, shift) {
  return registrations.some((r) => {
    if (r.volunteerId !== vol.id || r.shiftId === shift.id || r.status === 'cancelled') return false;
    return isOverlap(findShift(r.shiftId), shift);
  });
}

// Mức đầy đủ hồ sơ (0–1): có kỹ năng 0.4 + có lịch rảnh 0.4 + có giới thiệu 0.2
function completeness(vol) {
  const hasSkills = vol.skills.length > 0;
  const hasTime = Object.values(vol.availability).some((a) => a.length);
  return (hasSkills ? 0.4 : 0) + (hasTime ? 0.4 : 0) + (vol.bio ? 0.2 : 0);
}
                //Tính điểm phù hợp //

// Điểm 0–100 giữa tình nguyện viên và ca: kỹ năng + lịch rảnh + kinh nghiệm (theo trọng số)
function matchScore(vol, shift, weights) {
  const w = Object.assign({ skill: 0.6, time: 0.3, exp: 0.1 }, weights || {});
  const sum = w.skill + w.time + w.exp;
  const required = shift.requiredSkills;

  // 1) Kỹ năng: tỉ lệ kỹ năng yêu cầu mà người này có
  const hit = required.filter((x) => vol.skills.includes(x));
  const missing = required.filter((x) => !vol.skills.includes(x));
  const skillRate = required.length ? hit.length / required.length : 0.5;

  // 2) Lịch: rảnh đúng thứ + buổi thì 1 điểm, trùng ca khác thì 0
  const day = dayKey(shift.date);
  const session = sessionOf(shift.start);
  const free = (vol.availability[day] || []).includes(session);
  const busy = hasConflict(vol, shift);
  const timeRate = busy ? 0 : free ? 1 : 0;

  // 3) Kinh nghiệm: 50 giờ trở lên là tối đa
  const expRate = Math.min(vol.hours / 50, 1);

  const score = Math.round(100 * (w.skill * skillRate + w.time * timeRate + w.exp * expRate) / sum);

  // Giải thích "vì sao" (dùng cho khung "Vì sao có kết quả này?")
  const why = [];
  why.push(required.length
    ? { tone: hit.length === required.length ? 'ok' : hit.length ? 'warn' : 'bad', label: 'Kỹ năng',
        detail: 'Khớp ' + hit.length + '/' + required.length +
          (hit.length ? ': ' + skillNames(hit).join(', ') : '') +
          (missing.length ? ' · thiếu ' + skillNames(missing).join(', ') : '') }
    : { tone: 'ok', label: 'Kỹ năng', detail: 'Ca không yêu cầu kỹ năng đặc thù.' });
  why.push(busy
    ? { tone: 'bad', label: 'Lịch', detail: 'Trùng với một ca khác đã đăng ký.' }
    : { tone: free ? 'ok' : 'warn', label: 'Lịch rảnh',
        detail: (free ? 'Rảnh ' : 'Chưa khai báo rảnh ') + DAY_VI[day] + ' buổi ' + SESSION_VI[session].toLowerCase() + '.' });
  why.push({ tone: expRate > 0.5 ? 'ok' : 'warn', label: 'Kinh nghiệm', detail: vol.hours + ' giờ đã đóng góp.' });

  return { score: score, busy: busy, why: why };
}


/* ---------- Xếp người vào ca ---------- */

// Xếp một tình nguyện viên vào ca (xác nhận luôn). Báo lỗi bằng throw để nơi gọi bắt.
function assign(vol, shift) {
  if (countFilled(shift.id) >= shift.capacity) throw new Error('Ca đã đủ người.');
  if (activeRegs(shift.id).some((r) => r.volunteerId === vol.id)) throw new Error(vol.name + ' đã có trong ca.');
  if (hasConflict(vol, shift)) throw new Error(vol.name + ' bị trùng giờ với ca khác.');

  registrations.push({ id: 'r' + nextRegId++, shiftId: shift.id, volunteerId: vol.id, status: 'confirmed' });
}


/* ---------- Dựng đề xuất đội hình (AI) ---------- */

// Tạo đề xuất: chọn tối đa 5 người điểm cao, không trùng lịch, đạt tối thiểu 30%
function buildSuggestion(weights, attempt) {
  const shift = findShift(state.selectedShiftId);
  if (!shift) return { status: 'insufficient', message: 'Không đủ dữ liệu để đưa ra đề xuất.' };

  // Chuẩn hóa trọng số để tổng = 1
  const sum = weights.skill + weights.time + weights.exp;
  const w = { skill: weights.skill / sum, time: weights.time / sum, exp: weights.exp / sum };

  const gap = shift.capacity - countFilled(shift.id);
  const regs = activeRegs(shift.id);

  const items = volunteers
    .filter((v) => !regs.some((r) => r.volunteerId === v.id))
    .map((v) => ({ vol: v, sc: matchScore(v, shift, w) }))
    .filter((x) => !x.sc.busy && x.sc.score >= 30)
    .sort((a, b) => b.sc.score - a.sc.score)
    .slice(0, Math.min(gap, 5));

  if (!items.length) {
    return { status: 'insufficient', message: 'Không đủ dữ liệu: chưa có tình nguyện viên nào đạt tối thiểu 30% độ phù hợp.' };
  }

  // Độ tin cậy: hồ sơ càng đầy đủ + điểm người đầu càng cao thì càng tin cậy
  const avgComplete = items.reduce((t, x) => t + completeness(x.vol), 0) / items.length;
  const confidence = Math.min(0.95, 0.3 + avgComplete * 0.4 + items[0].sc.score / 300);

  return {
    status: items[0].sc.score < 50 ? 'uncertain' : 'ok',
    confidence: confidence,
    weights: w,
    attempt: attempt,
    items: items,
    selected: items.map((x) => x.vol.id),   // những người đang được tick
    why: items[0].sc.why
      .map((x) => Object.assign({}, x, { label: x.label + ' (#1: ' + items[0].vol.name + ')' }))
      .concat([{ tone: 'ok', label: 'Trọng số',
        detail: 'Kỹ năng ' + Math.round(w.skill * 100) + '% · lịch ' + Math.round(w.time * 100) +
          '% · kinh nghiệm ' + Math.round(w.exp * 100) + '%.' }])
  };
}
