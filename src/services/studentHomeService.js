// src/services/studentHomeService.js
import { supabase } from '../lib/supabase';

export const studentHomeService = {
  /**
   * Lấy dữ liệu trang chủ học sinh:
   * - streak hiện tại
   * - danh sách bài tập chưa nộp (pending)
   */
  async getStudentDashboard(studentId) {
    if (!studentId) throw new Error('Thiếu studentId');

    // 1. Streak
    const { data: streakData } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak, last_active_date')
      .eq('student_id', studentId)
      .maybeSingle();

    const streakCount = streakData?.current_streak || 0;

    // 2. Lớp học của học sinh
    const { data: classMembers, error: classError } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentId);

    if (classError) throw classError;
    const classIds = (classMembers || []).map((c) => c.class_id);

    let pendingAssignments = [];

    if (classIds.length > 0) {
      // 3. Bài tập thuộc các lớp đó
      const { data: assignments, error: aErr } = await supabase
        .from('assignments')
        .select('id, title, assignment_type, deadline, class_id')
        .in('class_id', classIds)
        .eq('status', 'published')
        .order('deadline', { ascending: true, nullsFirst: false });

      if (aErr) throw aErr;

      if (assignments && assignments.length > 0) {
        // 4. Attempts đã có của học sinh
        const assignmentIds = assignments.map((a) => a.id);
        const { data: attempts } = await supabase
          .from('assignment_attempts')
          .select('assignment_id')
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds);

        const submittedIds = new Set((attempts || []).map((a) => a.assignment_id));

        // 5. Chỉ lấy bài chưa nộp
        pendingAssignments = assignments
          .filter((a) => !submittedIds.has(a.id))
          .map((a) => ({
            id: a.id,
            title: a.title,
            type: a.assignment_type || 'vocabulary',
            dueDate: a.deadline
              ? new Date(a.deadline).toLocaleDateString('vi-VN')
              : 'Không có hạn',
          }));
      }
    }

    return {
      streakCount,
      pendingAssignments,
    };
  },
};