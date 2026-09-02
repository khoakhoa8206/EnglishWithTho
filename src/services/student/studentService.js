// src/services/student/studentService.js
import { supabase } from '@/lib/supabase';
import { tuitionService } from '../tuitionService';

export const studentService = {

  // Lấy danh sách lớp của giáo viên
  async getTeacherClasses(teacherId) {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', teacherId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // Thêm lớp mới
  async createClass(teacherId, className) {
    const { data, error } = await supabase
      .from('classes')
      .insert({ name: className.trim(), teacher_id: teacherId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Xóa lớp
  async deleteClass(classId) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);
    if (error) throw error;
  },

  // Lấy danh sách học sinh (lọc theo lớp + tìm kiếm tên)
  async getStudents(teacherId, { classId = 'all', searchQuery = '' } = {}) {
    let query = supabase
      .from('class_students')
      .select(`
        student_id,
        class_id,
        classes(id, name, teacher_id),
        profiles!class_students_student_id_fkey(
          id, full_name, start_date, created_at
        )
      `);

    if (classId !== 'all') {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;
    if (error) throw error;

    let result = (data || [])
      .filter((row) => row.classes?.teacher_id === teacherId)
      .map((row) => ({
        id: row.profiles?.id,
        fullName: row.profiles?.full_name,
        startDate: row.profiles?.start_date,
        joinedAt: row.profiles?.created_at
          ? new Date(row.profiles.created_at).toLocaleDateString('vi-VN')
          : '—',
        classId: row.class_id,
        className: row.classes?.name || '—',
      }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.fullName?.toLowerCase().includes(q)
      );
    }

    return result;
  },

  // Kiểm tra tên trùng trước khi tạo/sửa
  async checkNameExists(fullName, excludeId = null) {
    let query = supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', fullName.trim());
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    const { data } = await query;
    return (data || []).length > 0;
  },

  // Thêm học sinh mới
  async createStudent({ fullName, classId, startDate }) {
    // Kiểm tra tên trùng
    const exists = await this.checkNameExists(fullName);
    if (exists) throw new Error(`Đã có học sinh tên "${fullName}" trong hệ thống.`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        full_name: fullName.trim(),
        role: 'student',
        start_date: startDate || null,
      })
      .select()
      .single();
    if (profileError) throw profileError;

    if (classId) {
      const { error: classError } = await supabase
        .from('class_students')
        .insert({ class_id: classId, student_id: profile.id });
      if (classError) throw classError;
    }

    // Tự động tạo 12 tháng học phí cho năm hiện tại
    if (classId) {
      const currentYear = new Date().getFullYear();
      try {
        await tuitionService.addFullYearForStudent(profile.id, classId, currentYear);
      } catch (e) {
        // Không throw — tạo học sinh vẫn thành công kể cả khi sinh tuition thất bại
        console.warn('Auto-generate tuition failed:', e.message);
      }
    }

    return profile;
  },

  // Cập nhật học sinh
  async updateStudent(studentId, { fullName, classId, startDate }) {
    // Kiểm tra tên trùng (bỏ qua chính mình)
    const exists = await this.checkNameExists(fullName, studentId);
    if (exists) throw new Error(`Đã có học sinh tên "${fullName}" trong hệ thống.`);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), start_date: startDate || null })
      .eq('id', studentId);
    if (error) throw error;

    if (classId) {
      await supabase.from('class_students').delete().eq('student_id', studentId);
      await supabase.from('class_students').insert({ class_id: classId, student_id: studentId });
    }
  },

  // Xóa học sinh
  async deleteStudent(studentId) {
    const { error } = await supabase.from('profiles').delete().eq('id', studentId);
    if (error) throw error;
  },
};