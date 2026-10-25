/* Dữ liệu giả lập VolunteerLink – mô-đun dữ liệu (không cần máy chủ).
   Các thực thể: users, volunteers, organizations, opportunities, shifts,
   registrations, skills, categories, reports, notifications, impactSummaries, auditLog*/
window.VL = window.VL || {};

VL.seed = function() {
  const D = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const av = (o) => Object.assign(
    { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    o
  );
  const now = new Date().toISOString();
  return {
    categories: [
      { id: 'c1', name: 'Giáo dục', status: 'active' },
      { id: 'c2', name: 'Môi trường', status: 'active' },
      { id: 'c3', name: 'Y tế & sức khỏe', status: 'active' },
      { id: 'c4', name: 'An sinh xã hội', status: 'active' },
      { id: 'c5', name: 'Văn hóa – Cộng đồng', status: 'archived' }
    ],
    skills: [
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
    ],
    organizations: [
      {
        id: 'o1',
        name: 'Quỹ Hạt Giống Xanh',
        mission: 'Trồng cây, làm sạch môi trường và giáo dục xanh cho học sinh.',
        email: 'hello@hatgiongxanh.vn',
        phone: '0243 555 0101',
        city: 'Hà Nội',
        status: 'approved'
      },
      {
        id: 'o2',
        name: 'Ngân hàng Thực phẩm Hà Thành',
        mission: 'Thu gom và phân phối bữa ăn cho người có hoàn cảnh khó khăn.',
        email: 'lienhe@nhtp.vn',
        phone: '0243 555 0202',
        city: 'Hà Nội',
        status: 'approved'
      },
      {
        id: 'o3',
        name: 'CLB Sức khỏe Cộng đồng',
        mission: 'Khám sàng lọc và tập huấn sơ cấp cứu miễn phí.',
        email: 'clb@skcd.vn',
        phone: '0243 555 0303',
        city: 'Hà Nội',
        status: 'pending'
      }
    ],
    users: [
      {
        id: 'u1',
        email: 'lan.nguyen@vl.demo',
        password: '123456',
        role: 'volunteer',
        name: 'Nguyễn Thị Lan',
        status: 'active',
        refId: 'v1'
      },
      {
        id: 'u2',
        email: 'org.xanh@vl.demo',
        password: '123456',
        role: 'organization',
        name: 'Quỹ Hạt Giống Xanh',
        status: 'active',
        refId: 'o1'
      },
      {
        id: 'u3',
        email: 'coord@vl.demo',
        password: '123456',
        role: 'coordinator',
        name: 'Trần Minh Quân',
        status: 'active',
        refId: null
      },
      {
        id: 'u4',
        email: 'admin@vl.demo',
        password: '123456',
        role: 'admin',
        name: 'Quản trị hệ thống',
        status: 'active',
        refId: null
      },
      {
        id: 'u5',
        email: 'minh.pham@vl.demo',
        password: '123456',
        role: 'volunteer',
        name: 'Phạm Quang Minh',
        status: 'active',
        refId: 'v2'
      },
      {
        id: 'u6',
        email: 'hoa.le@vl.demo',
        password: '123456',
        role: 'volunteer',
        name: 'Lê Thị Hoa',
        status: 'active',
        refId: 'v3'
      },
      {
        id: 'u7',
        email: 'duc.vu@vl.demo',
        password: '123456',
        role: 'volunteer',
        name: 'Vũ Anh Đức',
        status: 'locked',
        refId: 'v4'
      },
      {
        id: 'u8',
        email: 'org.skcd@vl.demo',
        password: '123456',
        role: 'organization',
        name: 'CLB Sức khỏe Cộng đồng',
        status: 'pending',
        refId: 'o3'
      },
      {
        id: 'u9',
        email: 'org.nhtp@vl.demo',
        password: '123456',
        role: 'organization',
        name: 'Ngân hàng Thực phẩm Hà Thành',
        status: 'active',
        refId: 'o2'
      }
    ],
    volunteers: [
      {
        id: 'v1',
        userId: 'u1',
        name: 'Nguyễn Thị Lan',
        email: 'lan.nguyen@vl.demo',
        phone: '0912345678',
        city: 'Hà Nội',
        bio: 'Sinh viên năm 3, thích hoạt động môi trường và dạy học cho trẻ em.',
        skills: ['s1', 's3', 's8'],
        hours: 36,
        status: 'active',
        availability: av({ sat: ['morning', 'afternoon'], sun: ['morning'], wed: ['evening'] })
      },
      {
        id: 'v2',
        userId: 'u5',
        name: 'Phạm Quang Minh',
        email: 'minh.pham@vl.demo',
        phone: '0987654321',
        city: 'Hà Nội',
        bio: 'Điều dưỡng, có chứng chỉ sơ cấp cứu.',
        skills: ['s2', 's5', 's9'],
        hours: 58,
        status: 'active',
        availability: av({
          sat: ['morning', 'afternoon', 'evening'],
          sun: ['morning', 'afternoon'],
          fri: ['evening']
        })
      },
      {
        id: 'v3',
        userId: 'u6',
        name: 'Lê Thị Hoa',
        email: 'hoa.le@vl.demo',
        phone: '0909090909',
        city: 'Hà Nội',
        bio: 'Đầu bếp nghiệp dư, thích nấu ăn từ thiện.',
        skills: ['s4', 's6'],
        hours: 20,
        status: 'active',
        availability: av({ sun: ['morning', 'afternoon'], sat: ['morning'] })
      },
      {
        id: 'v4',
        userId: 'u7',
        name: 'Vũ Anh Đức',
        email: 'duc.vu@vl.demo',
        phone: '0933333333',
        city: 'Hà Nội',
        bio: '',
        skills: ['s7'],
        hours: 5,
        status: 'active',
        availability: av({})
      }
    ],
    opportunities: [
      {
        id: 'p1',
        orgId: 'o1',
        title: 'Trồng cây ven sông Hồng',
        categoryId: 'c2',
        location: 'Bãi giữa sông Hồng, Long Biên',
        description: 'Trồng 500 cây xanh và dọn rác ven sông cùng cộng đồng địa phương.',
        requiredSkills: ['s9', 's6'],
        status: 'open',
        moderation: 'approved',
        createdAt: now
      },
      {
        id: 'p2',
        orgId: 'o1',
        title: 'Lớp học tiếng Anh cho trẻ em vùng cao',
        categoryId: 'c1',
        location: 'Trực tuyến + Trường Tiểu học Y Tý',
        description: 'Dạy tiếng Anh giao tiếp cơ bản cho học sinh tiểu học qua video.',
        requiredSkills: ['s1', 's8'],
        status: 'open',
        moderation: 'approved',
        createdAt: now
      },
      {
        id: 'p3',
        orgId: 'o2',
        title: 'Bữa cơm yêu thương cuối tuần',
        categoryId: 'c4',
        location: 'Bếp ăn 25 Lý Thường Kiệt, Hoàn Kiếm',
        description: 'Nấu và phát 300 suất ăn cho người lao động nghèo và người vô gia cư.',
        requiredSkills: ['s4', 's5'],
        status: 'open',
        moderation: 'approved',
        createdAt: now
      },
      {
        id: 'p4',
        orgId: 'o2',
        title: 'Chiến dịch truyền thông gây quỹ',
        categoryId: 'c4',
        location: 'Làm việc từ xa',
        description: 'Thiết kế ấn phẩm và viết bài cho chiến dịch gây quỹ cuối năm.',
        requiredSkills: ['s3', 's7'],
        status: 'open',
        moderation: 'pending',
        createdAt: now
      },
      {
        id: 'p5',
        orgId: 'o1',
        title: 'Ngày hội đổi sách cũ',
        categoryId: 'c1',
        location: 'Công viên Thống Nhất',
        description: 'Tổ chức gian hàng đổi sách và đọc sách cho trẻ em.',
        requiredSkills: ['s6', 's3'],
        status: 'closed',
        moderation: 'approved',
        createdAt: now
      },
      {
        id: 'p6',
        orgId: 'o2',
        title: 'Quyên góp quần áo mùa đông (nháp)',
        categoryId: 'c4',
        location: 'Hà Nội',
        description: 'Phân loại và đóng gói quần áo ấm.',
        requiredSkills: ['s9'],
        status: 'draft',
        moderation: 'rejected',
        rejectReason: 'Thiếu địa điểm cụ thể và thời gian dự kiến.',
        createdAt: now
      }
    ],
    shifts: [
      {
        id: 'sh1',
        oppId: 'p1',
        date: D(3),
        start: '07:00',
        end: '11:00',
        capacity: 20,
        requiredSkills: ['s9'],
        status: 'open'
      },
      {
        id: 'sh2',
        oppId: 'p1',
        date: D(10),
        start: '07:00',
        end: '11:00',
        capacity: 20,
        requiredSkills: ['s9', 's6'],
        status: 'open'
      },
      {
        id: 'sh3',
        oppId: 'p2',
        date: D(4),
        start: '19:00',
        end: '20:30',
        capacity: 6,
        requiredSkills: ['s1', 's8'],
        status: 'open'
      },
      {
        id: 'sh4',
        oppId: 'p2',
        date: D(11),
        start: '19:00',
        end: '20:30',
        capacity: 6,
        requiredSkills: ['s1', 's8'],
        status: 'open'
      },
      {
        id: 'sh5',
        oppId: 'p3',
        date: D(5),
        start: '08:00',
        end: '12:00',
        capacity: 8,
        requiredSkills: ['s4'],
        status: 'open'
      },
      {
        id: 'sh6',
        oppId: 'p3',
        date: D(6),
        start: '08:00',
        end: '12:00',
        capacity: 8,
        requiredSkills: ['s4', 's5'],
        status: 'open'
      },
      {
        id: 'sh7',
        oppId: 'p3',
        date: D(-7),
        start: '08:00',
        end: '12:00',
        capacity: 8,
        requiredSkills: ['s4'],
        status: 'done'
      },
      {
        id: 'sh8',
        oppId: 'p5',
        date: D(-14),
        start: '09:00',
        end: '15:00',
        capacity: 10,
        requiredSkills: ['s6'],
        status: 'done'
      },
      {
        id: 'sh9',
        oppId: 'p1',
        date: D(-20),
        start: '07:00',
        end: '11:00',
        capacity: 15,
        requiredSkills: ['s9'],
        status: 'done'
      },
      {
        id: 'sh10',
        oppId: 'p3',
        date: D(2),
        start: '15:00',
        end: '18:00',
        capacity: 4,
        requiredSkills: ['s5'],
        status: 'open'
      }
    ],
    registrations: [
      {
        id: 'r1',
        shiftId: 'sh1',
        volunteerId: 'v1',
        status: 'confirmed',
        hours: 0,
        note: '',
        createdAt: now
      },
      {
        id: 'r2',
        shiftId: 'sh3',
        volunteerId: 'v1',
        status: 'pending',
        hours: 0,
        note: 'Có thể dạy lớp nhỏ',
        createdAt: now
      },
      {
        id: 'r3',
        shiftId: 'sh9',
        volunteerId: 'v1',
        status: 'completed',
        hours: 4,
        note: '',
        createdAt: now
      },
      {
        id: 'r4',
        shiftId: 'sh7',
        volunteerId: 'v1',
        status: 'completed',
        hours: 4,
        note: '',
        createdAt: now
      },
      {
        id: 'r5',
        shiftId: 'sh1',
        volunteerId: 'v2',
        status: 'confirmed',
        hours: 0,
        note: '',
        createdAt: now
      },
      {
        id: 'r6',
        shiftId: 'sh1',
        volunteerId: 'v3',
        status: 'pending',
        hours: 0,
        note: '',
        createdAt: now
      },
      {
        id: 'r7',
        shiftId: 'sh5',
        volunteerId: 'v3',
        status: 'confirmed',
        hours: 0,
        note: '',
        createdAt: now
      },
      {
        id: 'r8',
        shiftId: 'sh7',
        volunteerId: 'v3',
        status: 'completed',
        hours: 4,
        note: '',
        createdAt: now
      },
      {
        id: 'r9',
        shiftId: 'sh7',
        volunteerId: 'v2',
        status: 'no_show',
        hours: 0,
        note: '',
        createdAt: now
      },
      {
        id: 'r10',
        shiftId: 'sh8',
        volunteerId: 'v2',
        status: 'completed',
        hours: 6,
        note: '',
        createdAt: now
      },
      {
        id: 'r11',
        shiftId: 'sh9',
        volunteerId: 'v2',
        status: 'completed',
        hours: 4,
        note: '',
        createdAt: now
      },
      {
        id: 'r12',
        shiftId: 'sh6',
        volunteerId: 'v2',
        status: 'rejected',
        hours: 0,
        note: '',
        rejectReason: 'Ca đã đủ tài xế.',
        createdAt: now
      },
      {
        id: 'r13',
        shiftId: 'sh2',
        volunteerId: 'v1',
        status: 'cancelled',
        hours: 0,
        note: 'Trùng lịch thi',
        createdAt: now
      }
    ],
    reports: [
      {
        id: 'rp1',
        type: 'opportunity',
        targetId: 'p1',
        reason: 'Nội dung ghi sai địa điểm tập trung.',
        reporter: 'Phạm Quang Minh',
        status: 'open',
        createdAt: now
      },
      {
        id: 'rp2',
        type: 'user',
        targetId: 'u7',
        reason: 'Tài khoản bị tố cáo vắng mặt nhiều lần không báo.',
        reporter: 'Quỹ Hạt Giống Xanh',
        status: 'open',
        createdAt: now
      },
      {
        id: 'rp3',
        type: 'opportunity',
        targetId: 'p3',
        reason: 'Báo nhầm – đã kiểm tra lại.',
        reporter: 'Vũ Anh Đức',
        status: 'dismissed',
        createdAt: now
      }
    ],
    notifications: [
      {
        id: 'n1',
        userId: 'u1',
        text: 'Đăng ký ca "Trồng cây ven sông Hồng" đã được xác nhận.',
        link: 'volunteer-my-shifts',
        read: false,
        at: now
      },
      {
        id: 'n2',
        userId: 'u1',
        text: 'Ca "Lớp học tiếng Anh" đang chờ tổ chức duyệt.',
        link: 'volunteer-my-shifts',
        read: true,
        at: now
      },
      {
        id: 'n3',
        userId: 'u2',
        text: 'Có 1 đăng ký mới chờ duyệt cho ca trồng cây.',
        link: 'organization-volunteer-roster',
        read: false,
        at: now
      },
      {
        id: 'n4',
        userId: 'u3',
        text: 'AI cảnh báo: ca "Lớp học tiếng Anh" có nguy cơ thiếu người.',
        link: 'coordinator-shortage-alerts',
        read: false,
        at: now
      },
      {
        id: 'n5',
        userId: 'u4',
        text: 'Có 1 hoạt động mới chờ kiểm duyệt.',
        link: 'admin-moderation',
        read: false,
        at: now
      }
    ],
    impactSummaries: [
      {
        id: 'im1',
        oppId: 'p5',
        tone: 'trang-trong',
        text: 'Ngày hội đổi sách cũ đã hoàn thành với 1 ca, ghi nhận 0 giờ tình nguyện đã xác nhận. Cần cập nhật số liệu điểm danh.',
        status: 'saved',
        createdAt: now
      }
    ],
    auditLog: [
      {
        id: 'a1',
        at: now,
        actor: 'Quản trị hệ thống',
        action: 'Khởi tạo dữ liệu demo',
        target: 'Hệ thống'
      }
    ]
  };
};
