// src/services/dashboardService.js
import { supabase } from '../lib/supabase';

export const dashboardService = {
  async getDashboardStats(teacherId) {
    // 1. Tổng số học sinh thuộc các lớp do giáo viên quản lý
    const { data: teacherClasses, error: classErr } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', teacherId);

    if (classErr) throw classErr;
    const classIds = (teacherClasses || []).map((c) => c.id);

    let totalStudents = 0;
    if (classIds.length > 0) {
      const { count, error: studentError } = await supabase
        .from('class_students')
        .select('student_id', { count: 'exact', head: true })
        .in('class_id', classIds);
      if (studentError) throw studentError;
      totalStudents = count || 0;
    }

    // 2. Số assignment còn hạn (deadline null hoặc deadline > now)
    // Không có column status — dùng deadline để xác định "đang mở"
    const now = new Date().toISOString();
    const { count: activeAssignments, error: assignmentError } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .or(`deadline.is.null,deadline.gt.${now}`);

    if (assignmentError) throw assignmentError;

    return {
      totalStudents,
      activeAssignments: activeAssignments || 0,
    };
  },

  async getStudentResults(teacherId, { classId = 'all', searchQuery = '' } = {}) {
    // Lấy class ids của teacher trước
    let targetClassIds;
    if (classId !== 'all') {
      targetClassIds = [classId];
    } else {
      const { data: teacherClasses, error: classErr } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', teacherId);
      if (classErr) throw classErr;
      targetClassIds = (teacherClasses || []).map((c) => c.id);
    }

    if (targetClassIds.length === 0) return [];

    // Lấy assignment_ids thuộc các lớp này
    const { data: assignmentRows, error: aErr } = await supabase
      .from('assignments')
      .select('id, title, class_id, classes!class_id ( name )')
      .in('class_id', targetClassIds);
    if (aErr) throw aErr;

    const assignmentIds = (assignmentRows || []).map((a) => a.id);
    if (assignmentIds.length === 0) return [];

    const assignmentMap = new Map(
      (assignmentRows || []).map((a) => [a.id, a])
    );

    // Lấy attempts — KHÔNG có column status trong assignment_attempts
    const { data, error } = await supabase
      .from('assignment_attempts')
      .select(`
        id,
        assignment_id,
        student_id,
        score,
        correct_count,
        total_questions,
        duration_seconds,
        passed,
        completed_at,
        student:profiles!student_id ( id, full_name )
      `)
      .in('assignment_id', assignmentIds)
      .order('completed_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    let results = (data || []).map((item) => {
      const assignment = assignmentMap.get(item.assignment_id);
      return {
        id: item.id,
        studentName: item.student?.full_name || 'Học sinh',
        className: assignment?.classes?.name || '—',
        classId: assignment?.class_id,
        assignmentTitle: assignment?.title || 'Bài tập',
        score: item.score,
        passed: item.passed,
        correctCount: item.correct_count,
        totalQuestions: item.total_questions,
        duration: item.duration_seconds
          ? `${Math.ceil(item.duration_seconds / 60)} phút`
          : '—',
        completedAt: item.completed_at
          ? new Date(item.completed_at).toLocaleDateString('vi-VN')
          : '—',
        status: item.completed_at ? 'Hoàn thành' : 'Chưa làm',
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter((r) => r.studentName.toLowerCase().includes(q));
    }

    return results;
  },
};