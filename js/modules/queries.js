/* Truy vấn ghép bảng dùng lại giữa các vai trò (join mô phỏng) */
window.VL = window.VL || {};

VL.q = (function() {
  const S = VL.store;

  const shiftView = (s) => {
    const opp = S.find('opportunities', s.oppId) || {},
      org = S.find('organizations', opp.orgId) || {},
      cat = S.find('categories', opp.categoryId) || {};

    const regs = S.where('registrations', (r) => r.shiftId === s.id);
    return Object.assign(
      {},
      s,
      {
        opp,
        org,
        cat,
        filled: regs.filter((r) => ['confirmed', 'completed'].includes(r.status)).length,
        pending: regs.filter((r) => r.status === 'pending').length
      }
    );
  };

  const regView = (r) => {
    const shift = S.find('shifts', r.shiftId) || {};
    const sv = shift.id ? shiftView(shift) : { opp: {}, org: {} };
    return Object.assign(
      {},
      r,
      { shift: sv, vol: S.find('volunteers', r.volunteerId) || { name: '(đã xóa)' } }
    );
  };

  const active = (list) => list.filter((x) => x.status === 'active');
  const myOrgId = () => VL.session && VL.session.refId;

  // Số chỗ trống và tự đồng bộ trạng thái ca (open/full) theo số đã xác nhận
  const syncShift = (id) => {
    const s = S.find('shifts', id);
    if (!s || ['cancelled', 'done'].includes(s.status)) return;
    const full = S.filled(id) >= s.capacity;
    if (full && s.status === 'open') S.update('shifts', id, { status: 'full' });
    if (!full && s.status === 'full') S.update('shifts', id, { status: 'open' });
  };

  const fmtShift = (s) => VL.util.fmtDate(s.date) + ' · ' + s.start + '–' + s.end;
  return { shiftView, regView, active, myOrgId, syncShift, fmtShift };
})();
