// src/services/tuitionService.js
import { supabase } from '../lib/supabase';

export const tuitionService = {


  // ─── Tạo 12 tháng cho 1 năm, cho TẤT CẢ học sinh của teacher ───────────────
  async addFullYear(teacherId, year) {
    const { data: teacherClasses, error: ce } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', teacherId);
    if (ce) throw ce;
    if (!teacherClasses?.length) throw new Error('Chưa có lớp nào.');

    const classIds = teacherClasses.map(c => c.id);
    const { data: classStudents, error: cse } = await supabase
      .from('class_students')
      .select('student_id, class_id, classes(monthly_fee)')
      .in('class_id', classIds);
    if (cse) throw cse;
    if (!classStudents?.length) throw new Error('Chưa có học sinh nào.');

    const records = [];
    for (const cs of classStudents) {
      const fee = cs.classes?.monthly_fee || 0;
      for (let m = 1; m <= 12; m++) {
        const month = `${year}-${String(m).padStart(2, '0')}-01`;
        records.push({ student_id: cs.student_id, month, paid: false, amount: fee });
      }
    }

    const { error } = await supabase
      .from('tuition_records')
      .upsert(records, { onConflict: 'student_id,month', ignoreDuplicates: true });
    if (error) throw error;
    return records.length;
  },

  // ─── Tạo 12 tháng cho 1 học sinh cụ thể (dùng khi tạo học sinh mới) ─────────
  async addFullYearForStudent(studentId, classId, year) {
    // Lấy monthly_fee của lớp
    const { data: cls, error: ce } = await supabase
      .from('classes')
      .select('monthly_fee')
      .eq('id', classId)
      .single();
    if (ce) throw ce;

    const fee = cls?.monthly_fee || 0;
    const records = [];
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, '0')}-01`;
      records.push({ student_id: studentId, month, paid: false, amount: fee });
    }

    const { error } = await supabase
      .from('tuition_records')
      .upsert(records, { onConflict: 'student_id,month', ignoreDuplicates: true });
    if (error) throw error;
    return records.length;
  },

  // ─── Lấy danh sách học sinh + tuition_records, nhóm theo học sinh ───────────
  async getStudentList(teacherId, { classId = 'all', searchQuery = '' } = {}) {
    // Lấy lớp của teacher
    const { data: teacherClasses, error: classError } = await supabase
      .from('classes')
      .select('id, name, monthly_fee')
      .eq('teacher_id', teacherId);
    if (classError) throw classError;

    const teacherClassMap = Object.fromEntries(
      (teacherClasses || []).map(c => [c.id, c])
    );
    const teacherClassIds = Object.keys(teacherClassMap);
    if (teacherClassIds.length === 0) return [];

    // Lấy học sinh thuộc lớp
    const filterIds = classId !== 'all' ? [classId] : teacherClassIds;
    const { data: classStudents, error: csError } = await supabase
      .from('class_students')
      .select('student_id, class_id')
      .in('class_id', filterIds);
    if (csError) throw csError;

    const studentClassMap = {};
    (classStudents || []).forEach(cs => {
      studentClassMap[cs.student_id] = cs.class_id;
    });
    const studentIds = Object.keys(studentClassMap);
    if (studentIds.length === 0) return [];

    // Lấy profiles
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, full_name, start_date')
      .in('id', studentIds);
    if (pError) throw pError;

    // Lấy tất cả tuition_records
    const { data: records, error: rError } = await supabase
      .from('tuition_records')
      .select('id, student_id, month, paid, paid_at, amount')
      .in('student_id', studentIds)
      .order('month', { ascending: true });
    if (rError) throw rError;

    // Nhóm records theo student_id
    const recordsByStudent = {};
    (records || []).forEach(r => {
      if (!recordsByStudent[r.student_id]) recordsByStudent[r.student_id] = [];
      recordsByStudent[r.student_id].push(r);
    });

    // Ghép lại
    let result = (profiles || []).map(p => {
      const classId_ = studentClassMap[p.id];
      const cls = teacherClassMap[classId_] || {};
      const studentRecords = recordsByStudent[p.id] || [];

      // Nhóm theo năm
      const byYear = {};
      studentRecords.forEach(r => {
        const year = r.month ? new Date(r.month).getUTCFullYear() : 0;
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(r);
      });

      return {
        id: p.id,
        fullName: p.full_name || 'Học sinh',
        startDate: p.start_date,
        classId: classId_,
        className: cls.name || '—',
        monthlyFee: cls.monthly_fee || 0,
        recordsByYear: byYear,
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.fullName.toLowerCase().includes(q));
    }

    return result;
  },

  // ─── Lấy tuition_records của 1 học sinh (dùng cho student view) ─────────────
  async getStudentTuitionByYear(studentId) {
    // Lấy lớp và monthly_fee
    const { data: cs } = await supabase
      .from('class_students')
      .select('class_id, classes(name, monthly_fee)')
      .eq('student_id', studentId)
      .maybeSingle();

    const monthlyFee = cs?.classes?.monthly_fee || 0;
    const className  = cs?.classes?.name || '—';

    // Lấy profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('start_date, full_name')
      .eq('id', studentId)
      .maybeSingle();

    // Lấy records
    const { data: records, error } = await supabase
      .from('tuition_records')
      .select('id, month, paid, paid_at, amount')
      .eq('student_id', studentId)
      .order('month', { ascending: true });
    if (error) throw error;

    // Nhóm theo năm
    const byYear = {};
    (records || []).forEach(r => {
      const year = r.month ? new Date(r.month).getUTCFullYear() : 0;
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(r);
    });

    return {
      fullName:   profile?.full_name || '',
      startDate:  profile?.start_date || null,
      monthlyFee,
      className,
      recordsByYear: byYear,
    };
  },

  // ─── Toggle paid cho 1 record ────────────────────────────────────────────────
  async togglePaid(tuitionId, paid) {
    const { data, error } = await supabase
      .from('tuition_records')
      .update({
        paid,
        paid_at: paid ? new Date().toISOString() : null,
      })
      .eq('id', tuitionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Batch toggle: lưu nhiều thay đổi cùng lúc ──────────────────────────────
  async batchUpdate(changes) {
    // changes = [{ id, paid }]
    const promises = changes.map(({ id, paid }) =>
      supabase
        .from('tuition_records')
        .update({ paid, paid_at: paid ? new Date().toISOString() : null })
        .eq('id', id)
    );
    const results = await Promise.all(promises);
    const failed = results.find(r => r.error);
    if (failed) throw failed.error;
  },

  // ─── Cập nhật học phí theo lớp ──────────────────────────────────────────────
  async updateClassFee(classId, monthlyFee) {
    const { error } = await supabase
      .from('classes')
      .update({ monthly_fee: monthlyFee })
      .eq('id', classId);
    if (error) throw error;
  },

  // ─── Lấy danh sách lớp kèm monthly_fee ─────────────────────────────────────
  async getClassesWithFee(teacherId) {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, monthly_fee')
      .eq('teacher_id', teacherId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // ─── Sinh tháng học phí cho học sinh ────────────────────────────────────────
  async generateMonths(studentId) {
    const { error } = await supabase
      .rpc('generate_tuition_months', { p_student_id: studentId });
    if (error) throw error;
  },

  // ─── Thêm đúng 1 tháng học phí cụ thể ──────────────────────────────────────
  async addSingleMonth(studentId, monthDate) {
    // monthDate format: 'YYYY-MM-01'
    // Lấy monthly_fee hiện tại của học sinh
    const { data: cs } = await supabase
      .from('class_students')
      .select('class_id, classes(monthly_fee)')
      .eq('student_id', studentId)
      .maybeSingle();

    const amount = cs?.classes?.monthly_fee || 0;

    // upsert với ignoreDuplicates:true → safe gọi nhiều lần, không throw nếu tháng đã tồn tại
    const { error } = await supabase
      .from('tuition_records')
      .upsert(
        [{ student_id: studentId, month: monthDate, paid: false, amount }],
        { onConflict: 'student_id,month', ignoreDuplicates: true }
      );

    if (error) throw error;
  },


  // ─── (legacy — giữ lại để không break nơi khác nếu có) ─────────────────────
  async getTuitionList(teacherId, opts) {
    return this.getStudentList(teacherId, opts);
  },
};

// Helper dùng nội bộ
export function formatMonthShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `T${d.getUTCMonth() + 1}`;   // "T1", "T2", ...
}

export function getMonthIndex(dateStr) {
  if (!dateStr) return -1;
  return new Date(dateStr).getUTCMonth(); // 0–11
}