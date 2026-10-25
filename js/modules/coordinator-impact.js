/* =====================================================
   impact.js – LOGIC AI-3 "IMPACT SUMMARY"
   - getStats / writeSummary / buildSummary : tổng hợp số liệu và viết tóm tắt
   - persist                                : lưu tóm tắt vào danh sách
   - createAIFlow                           : ghép vào khối AI dùng chung (ai-card.js)
   ===================================================== */

const summaryForm = document.getElementById('summary-form');

const TONES = { 'trang-trong': 'Trang trọng', 'than-thien': 'Thân thiện', 'ngan-gon': 'Ngắn gọn' };
const SUMMARY_KEY = 'vl_impact_summaries';

// Danh sách tóm tắt đã lưu (nạp từ localStorage, lần đầu dùng dữ liệu mẫu)
let summaries = loadList(SUMMARY_KEY, impactSeed);
const saveSummaries = () => saveList(SUMMARY_KEY, summaries);

// Thống kê đóng góp của một hoạt động
function getStats(oppId) {
  const oppShifts = shifts.filter((s) => s.oppId === oppId);
  const ids = oppShifts.map((s) => s.id);
  const regs = registrations.filter((r) => ids.includes(r.shiftId));
  const done = regs.filter((r) => r.status === 'completed');

  return {
    shifts: oppShifts.length,
    doneShifts: oppShifts.filter((s) => s.status === 'done').length,
    vols: new Set(done.map((r) => r.volunteerId)).size,       // số tình nguyện viên khác nhau
    hours: done.reduce((t, r) => t + r.hours, 0),             // tổng giờ
    noShow: regs.filter((r) => r.status === 'no_show').length
  };
}

// Viết nội dung tóm tắt theo giọng văn; attempt chẵn/lẻ cho 2 mẫu khác nhau
function writeSummary(opp, st, tone, attempt) {
  const t = opp.title;
  const variant = attempt % 2;

  if (tone === 'ngan-gon') {
    return t + ': ' + st.vols + ' tình nguyện viên, ' + st.hours + ' giờ đóng góp qua ' + st.doneShifts + ' ca.';
  }
  if (tone === 'than-thien') {
    return (variant ? 'Thật tuyệt vời! ' : 'Cảm ơn mọi người! ') + 'Nhờ ' + st.vols + ' bạn tình nguyện viên, "' + t +
      '" đã có ' + st.hours + ' giờ đóng góp qua ' + st.doneShifts + ' ca hoạt động. ' +
      'Mỗi giờ các bạn trao đi đều làm cộng đồng ấm áp hơn.';
  }
  return 'Hoạt động "' + t + '" đã hoàn thành ' + st.doneShifts + '/' + st.shifts + ' ca, với sự tham gia của ' +
    st.vols + ' tình nguyện viên, ghi nhận tổng cộng ' + st.hours + ' giờ đóng góp' +
    (variant ? ' và ' + st.noShow + ' trường hợp vắng mặt.' : '.') +
    ' Kết quả cho thấy mức độ cam kết ổn định của cộng đồng.';
}

// Tạo kết quả AI cho một hoạt động
function buildSummary(oppId, tone, attempt) {
  const opp = findOpp(oppId);
  const st = getStats(oppId);

  if (!st.doneShifts && !st.vols) {
    return { status: 'insufficient', message: 'Không đủ dữ liệu để đưa ra đề xuất: hoạt động này chưa có ca nào hoàn thành.' };
  }

  return {
    status: st.hours ? 'ok' : 'uncertain',
    confidence: st.hours ? 0.5 + Math.min(0.4, st.vols * 0.1) : 0.4,
    message: 'Chưa có giờ được ghi nhận.',
    oppId: oppId,
    tone: tone,
    attempt: attempt,
    stats: st,
    text: writeSummary(opp, st, tone, attempt),
    why: [
      { tone: 'ok', label: 'Dữ liệu dùng',
        detail: st.doneShifts + ' ca hoàn thành · ' + st.vols + ' TNV · ' + st.hours + ' giờ · ' + st.noShow + ' vắng mặt.' },
      { tone: st.hours ? 'ok' : 'warn', label: 'Số giờ',
        detail: st.hours ? 'Tổng giờ lấy từ các đăng ký đã hoàn thành.' : 'Chưa có giờ nào được ghi nhận nên số liệu có thể thiếu.' },
      { tone: 'ok', label: 'Giọng văn', detail: TONES[tone] + ' (mẫu #' + (attempt % 2 + 1) + ').' }
    ]
  };
}

// HTML phần thân kết quả: nội dung tóm tắt + 3 chip số liệu
function renderBody(res) {
  const chips = [res.stats.doneShifts + ' ca', res.stats.vols + ' TNV', res.stats.hours + ' giờ'];
  return '<blockquote class="quote">' + esc(res.text) + '</blockquote>' +
    '<div class="chips">' + chips.map((c) => '<span class="chip">' + c + '</span>').join('') + '</div>';
}

// Lưu (thêm mới hoặc cập nhật) một tóm tắt với trạng thái saved / accepted / rejected
function persist(res, status) {
  const data = { oppId: res.oppId, tone: res.tone, text: res.text, status: status, createdAt: new Date().toISOString() };

  if (res.recId) {
    Object.assign(summaries.find((r) => r.id === res.recId), data);   // đã lưu trước đó -> cập nhật
  } else {
    res.recId = 'im' + Date.now();
    summaries.push(Object.assign({ id: res.recId }, data));
  }
  saveSummaries();
  renderSaved();
}

// Ghép vào khối AI dùng chung
const flow = createAIFlow({
  rootId: 'ai-root',
  title: 'Impact Summary',
  idleText: 'Chọn hoạt động và giọng văn, sau đó bấm "Tạo tóm tắt".',
  steps: ['Đang tổng hợp số liệu đóng góp…', 'Đang soạn nội dung…', 'Đang kiểm tra số liệu…'],

  run: (attempt) => buildSummary(summaryForm.elements.opp.value, summaryForm.elements.tone.value, attempt),
  renderBody: renderBody,

  accept: (res) => persist(res, 'accepted'),
  acceptMsg: 'Đã chấp nhận và lưu tóm tắt.',
  acceptedText: 'Tóm tắt đã được chấp nhận và lưu vào danh sách bên dưới.',

  reject: (res) => { if (res.recId) persist(res, 'rejected'); },

  save: (res) => persist(res, 'saved'),
  saveMsg: 'Đã lưu bản nháp tóm tắt.',

  edit: (res) => openTextDialog({ mode: 'ai', title: 'Sửa tóm tắt', text: res.text, res: res }),

  manual: () => document.getElementById('saved').scrollIntoView({ behavior: 'smooth' })
});
