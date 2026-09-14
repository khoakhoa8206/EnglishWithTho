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

    // Lấy streaks của tất cả student xuất hiện trong kết quả
    const studentIdsInResults = [...new Set((data || []).map(item => item.student_id))];
    let streakMap = {};
    if (studentIdsInResults.length > 0) {
      const { data: streaks } = await supabase
        .from('streaks')
        .select('student_id, current_streak, longest_streak')
        .in('student_id', studentIdsInResults);
      (streaks || []).forEach(s => {
        streakMap[s.student_id] = {
          currentStreak: s.current_streak ?? 0,
          longestStreak: s.longest_streak ?? 0,
        };
      });
    }

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
        currentStreak: streakMap[item.student_id]?.currentStreak ?? 0,
        longestStreak: streakMap[item.student_id]?.longestStreak ?? 0,
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter((r) => r.studentName.toLowerCase().includes(q));
    }

    return results;
  },

  // Ma trận học sinh × bài tập cho dashboard giáo viên (theo thiết kế dashboard.html)
  async getStudentAssignmentMatrix(teacherId) {
    // 1. Lớp của giáo viên
    const { data: teacherClasses, error: classErr } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', teacherId);
    if (classErr) throw classErr;
    const classIds = (teacherClasses || []).map((c) => c.id);
    if (classIds.length === 0) return [];

    // 2. Assignments trong các lớp đó (kèm tên lớp)
    const { data: assignments, error: aErr } = await supabase
      .from('assignments')
      .select('id, title, deadline, class_id, classes!class_id ( name )')
      .in('class_id', classIds);
    if (aErr) throw aErr;
    const assignmentMap = new Map((assignments || []).map(a => [a.id, a]));
    const assignmentIds = (assignments || []).map(a => a.id);

    // 3. Lấy toàn bộ học sinh trong các lớp (kể cả chưa nộp bài)
    const classNameMap = new Map((teacherClasses || []).map(c => [c.id, c.name]));
    const { data: classStudents, error: csErr } = await supabase
      .from('class_students')
      .select('student_id, class_id, student:profiles!student_id ( id, full_name )')
      .in('class_id', classIds);
    if (csErr) throw csErr;

    // Khởi tạo studentMap với TẤT CẢ học sinh, assignments rỗng
    const studentMap = new Map();
    for (const cs of classStudents || []) {
      const sid = cs.student_id;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          id: sid,
          name: cs.student?.full_name || 'Học sinh',
          class: classNameMap.get(cs.class_id) || '',
          classId: cs.class_id,          // thêm để filter lớp sau này
          assignments: [],
        });
      }
    }

    // 4. Attempts (giữ nguyên logic cũ)
    if (assignmentIds.length > 0) {
      const { data: attempts, error: tErr } = await supabase
        .from('assignment_attempts')
        .select(`
          id, score, passed, duration_seconds, completed_at,
          student_id, assignment_id, reset_count,
          student:profiles!student_id ( id, full_name )
        `)
        .in('assignment_id', assignmentIds)
        .order('completed_at', { ascending: false })
        .limit(2000);
      if (tErr) throw tErr;

      for (const a of attempts || []) {
        const sid = a.student_id;
        const assignment = assignmentMap.get(a.assignment_id);
        // Học sinh ngoài lớp (edge case) — bỏ qua
        if (!studentMap.has(sid)) continue;
        const student = studentMap.get(sid);
        const existing = student.assignments.find(x => x.id === a.assignment_id);
        if (!existing) {
          // Bỏ qua bài chưa có completed_at (học sinh chưa nộp)
          if (!a.completed_at) continue;

          const status = a.passed
            ? 'hoan_thanh'
            : (a.score !== null && a.score !== undefined && a.score < 80)
              ? 'chua_dat'
              : 'chua_lam';
          student.assignments.push({
            id: a.assignment_id,
            title: assignment?.title || 'Bài tập',
            date: a.completed_at,
            status,
            score: a.score,
            duration: a.duration_seconds ? Math.round(a.duration_seconds / 60) : null,
            resetCount: a.reset_count ?? 0,
          });
        }
      }
    }

    // Lấy streak từ DB cho tất cả học sinh trong matrix
    const allStudentIds = [...studentMap.keys()];
    if (allStudentIds.length > 0) {
      const { data: streaks } = await supabase
        .from('streaks')
        .select('student_id, current_streak, longest_streak')
        .in('student_id', allStudentIds);
      (streaks || []).forEach(s => {
        const student = studentMap.get(s.student_id);
        if (student) {
          student.currentStreak = s.current_streak ?? 0;
          student.longestStreak = s.longest_streak ?? 0;
        }
      });
    }
    // Đảm bảo học sinh không có record streak vẫn có giá trị mặc định
    // Tổng hợp reset_count từ tất cả assignments
    for (const student of studentMap.values()) {
      if (student.currentStreak === undefined) student.currentStreak = 0;
      if (student.longestStreak === undefined) student.longestStreak = 0;
      student.totalResets = student.assignments.reduce((sum, a) => sum + (a.resetCount ?? 0), 0);
    }

    return Array.from(studentMap.values());
  },

  // Hàm tính tier cho một học sinh
  computeStudentTier(student) {
    const total = student.assignments.length;
    if (total === 0) return 'red';
    const notGood = student.assignments.filter(a => a.status !== 'hoan_thanh').length;
    const pct = (notGood / total) * 100;
    return pct <= 10 ? 'green' : pct <= 50 ? 'yellow' : 'red';
  },
};