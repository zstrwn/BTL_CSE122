/* =====================================================
   data.js – DỮ LIỆU MẪU (lấy từ assets/data/seed.js của dự án)
   Chỉ chứa dữ liệu và hằng số, không có xử lý.
   ===================================================== */

// Ngày dạng "yyyy-mm-dd" cách hôm nay n ngày (n âm = đã qua)
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Lĩnh vực hoạt động
const categories = [
  { id: 'c1', name: 'Giáo dục', status: 'active' },
  { id: 'c2', name: 'Môi trường', status: 'active' },
  { id: 'c3', name: 'Y tế & sức khỏe', status: 'active' },
  { id: 'c4', name: 'An sinh xã hội', status: 'active' },
  { id: 'c5', name: 'Văn hóa – Cộng đồng', status: 'archived' }
];

// Kỹ năng
const skills = [
  { id: 's1', name: 'Giảng dạy', status: 'active' },
  { id: 's2', name: 'Sơ cấp cứu', status: 'active' },
  { id: 's3', name: 'Truyền thông', status: 'active' },
  { id: 's4', name: 'Nấu ăn', status: 'active' },
  { id: 's5', name: 'Lái xe', status: 'active' },
  { id: 's6', name: 'Tổ chức sự kiện', status: 'active' },
  { id: 's7', name: 'Thiết kế', status: 'active' },
  { id: 's8', name: 'Ngoại ngữ', status: 'active' },
  { id: 's9', name: 'Thể lực tốt', status: 'active' },
  { id: 's10', name: 'Chăm sóc người cao tuổi', status: 'archived' }
];

// Hoạt động (moderation: approved = đã duyệt)
const opportunities = [
  { id: 'p1', title: 'Trồng cây ven sông Hồng',               categoryId: 'c2', status: 'open',   moderation: 'approved' },
  { id: 'p2', title: 'Lớp học tiếng Anh cho trẻ em vùng cao', categoryId: 'c1', status: 'open',   moderation: 'approved' },
  { id: 'p3', title: 'Bữa cơm yêu thương cuối tuần',          categoryId: 'c4', status: 'open',   moderation: 'approved' },
  { id: 'p4', title: 'Chiến dịch truyền thông gây quỹ',       categoryId: 'c4', status: 'open',   moderation: 'pending' },
  { id: 'p5', title: 'Ngày hội đổi sách cũ',                  categoryId: 'c1', status: 'closed', moderation: 'approved' },
  { id: 'p6', title: 'Quyên góp quần áo mùa đông (nháp)',     categoryId: 'c4', status: 'draft',  moderation: 'rejected' }
];

// Tình nguyện viên đang hoạt động. availability: thứ -> các buổi rảnh
const volunteers = [
  { id: 'v1', name: 'Nguyễn Thị Lan', skills: ['s1', 's3', 's8'], hours: 36,
    availability: { sat: ['morning', 'afternoon'], sun: ['morning'], wed: ['evening'] } },
  { id: 'v2', name: 'Phạm Quang Minh', skills: ['s2', 's5', 's9'], hours: 58,
    availability: { sat: ['morning', 'afternoon', 'evening'], sun: ['morning', 'afternoon'], fri: ['evening'] } },
  { id: 'v3', name: 'Lê Thị Hoa', skills: ['s4', 's6'], hours: 20,
    availability: { sun: ['morning', 'afternoon'], sat: ['morning'] } },
  { id: 'v4', name: 'Vũ Anh Đức', skills: ['s7'], hours: 5,
    availability: {} }
];

// Các ca (status: open = đang mở, done = đã diễn ra)
const shifts = [
  { id: 'sh1',  oppId: 'p1', date: addDays(3),   start: '07:00', end: '11:00', capacity: 20, requiredSkills: ['s9'],       status: 'open' },
  { id: 'sh2',  oppId: 'p1', date: addDays(10),  start: '07:00', end: '11:00', capacity: 20, requiredSkills: ['s9', 's6'], status: 'open' },
  { id: 'sh3',  oppId: 'p2', date: addDays(4),   start: '19:00', end: '20:30', capacity: 6,  requiredSkills: ['s1', 's8'], status: 'open' },
  { id: 'sh4',  oppId: 'p2', date: addDays(11),  start: '19:00', end: '20:30', capacity: 6,  requiredSkills: ['s1', 's8'], status: 'open' },
  { id: 'sh5',  oppId: 'p3', date: addDays(5),   start: '08:00', end: '12:00', capacity: 8,  requiredSkills: ['s4'],       status: 'open' },
  { id: 'sh6',  oppId: 'p3', date: addDays(6),   start: '08:00', end: '12:00', capacity: 8,  requiredSkills: ['s4', 's5'], status: 'open' },
  { id: 'sh7',  oppId: 'p3', date: addDays(-7),  start: '08:00', end: '12:00', capacity: 8,  requiredSkills: ['s4'],       status: 'done' },
  { id: 'sh8',  oppId: 'p5', date: addDays(-14), start: '09:00', end: '15:00', capacity: 10, requiredSkills: ['s6'],       status: 'done' },
  { id: 'sh9',  oppId: 'p1', date: addDays(-20), start: '07:00', end: '11:00', capacity: 15, requiredSkills: ['s9'],       status: 'done' },
  { id: 'sh10', oppId: 'p3', date: addDays(2),   start: '15:00', end: '18:00', capacity: 4,  requiredSkills: ['s5'],       status: 'open' }
];

// Đăng ký. status: pending | confirmed | completed | no_show | rejected | cancelled
const registrations = [
  { id: 'r1',  shiftId: 'sh1',  volunteerId: 'v1', status: 'confirmed', hours: 0 },
  { id: 'r2',  shiftId: 'sh3',  volunteerId: 'v1', status: 'pending',   hours: 0 },
  { id: 'r3',  shiftId: 'sh9',  volunteerId: 'v1', status: 'completed', hours: 4 },
  { id: 'r4',  shiftId: 'sh7',  volunteerId: 'v1', status: 'completed', hours: 4 },
  { id: 'r5',  shiftId: 'sh1',  volunteerId: 'v2', status: 'confirmed', hours: 0 },
  { id: 'r6',  shiftId: 'sh1',  volunteerId: 'v3', status: 'pending',   hours: 0 },
  { id: 'r7',  shiftId: 'sh5',  volunteerId: 'v3', status: 'confirmed', hours: 0 },
  { id: 'r8',  shiftId: 'sh7',  volunteerId: 'v3', status: 'completed', hours: 4 },
  { id: 'r9',  shiftId: 'sh7',  volunteerId: 'v2', status: 'no_show',   hours: 0 },
  { id: 'r10', shiftId: 'sh8',  volunteerId: 'v2', status: 'completed', hours: 6 },
  { id: 'r11', shiftId: 'sh9',  volunteerId: 'v2', status: 'completed', hours: 4 },
  { id: 'r12', shiftId: 'sh6',  volunteerId: 'v2', status: 'rejected',  hours: 0 },
  { id: 'r13', shiftId: 'sh2',  volunteerId: 'v1', status: 'cancelled', hours: 0 }
];

// Tóm tắt tác động có sẵn
const impactSeed = [
  { id: 'im1', oppId: 'p5', tone: 'trang-trong', status: 'saved', createdAt: new Date().toISOString(),
    text: 'Ngày hội đổi sách cũ đã hoàn thành với 1 ca, ghi nhận 0 giờ tình nguyện đã xác nhận. Cần cập nhật số liệu điểm danh.' }
];

// Thông báo mẫu của điều phối viên
const notificationSeed = [
  { id: 'n4', text: 'AI cảnh báo: ca "Lớp học tiếng Anh" có nguy cơ thiếu người.',
    link: '../canh-bao-thieu-ca/index.html', read: false, at: new Date().toISOString() }
];

// Tên hiển thị
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_VI = { mon: 'Thứ Hai', tue: 'Thứ Ba', wed: 'Thứ Tư', thu: 'Thứ Năm', fri: 'Thứ Sáu', sat: 'Thứ Bảy', sun: 'Chủ nhật' };
const SESSION_VI = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' };
