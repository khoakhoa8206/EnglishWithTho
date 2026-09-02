// src/services/studentHomeworkService.js
import { supabase } from '../lib/supabase';

export const studentHomeworkService = {
  async getHomeworkList(studentId, { status = 'all', searchQuery = '' } = {}) {
    // 1. Lấy class_id của học sinh
    const { data: classMembers, error: classError } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentId);

    if (classError) throw classError;
    const classIds = (classMembers || []).map((c) => c.class_id);
    if (classIds.length === 0) return [];

    // 2. Lấy assignments — dùng assignment_type + deadline (schema chuẩn)
    const { data: assignments, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        id, title, assignment_type, deadline, created_at,
        class:classes!class_id ( id, name )
      `)
      .in('class_id', classIds)
      .eq('status', 'published')
      .order('deadline', { ascending: true, nullsFirst: false });

    if (assignmentError) throw assignmentError;
    if (!assignments || assignments.length === 0) return [];

    // 3. Lấy tất cả attempts của học sinh này
    const assignmentIds = assignments.map((a) => a.id);
    const { data: attempts, error: attemptError } = await supabase
      .from('assignment_attempts')
      .select('id, assignment_id, attempt_number, score, correct_count, total_questions, duration_seconds, passed, completed_at, started_at')
      .eq('student_id', studentId)
      .in('assignment_id', assignmentIds)
      .order('attempt_number', { ascending: true });

    if (attemptError) throw attemptError;

    // Group attempts by assignment_id
    const attemptsMap = new Map();
    (attempts || []).forEach((a) => {
      if (!attemptsMap.has(a.assignment_id)) attemptsMap.set(a.assignment_id, []);
      attemptsMap.get(a.assignment_id).push(a);
    });

    // 4. Map dữ liệu
    let records = assignments.map((item) => {
      const itemAttempts = attemptsMap.get(item.id) || [];
      const isSubmitted = itemAttempts.length > 0;
      const bestAttempt = isSubmitted
        ? itemAttempts.reduce((best, cur) => (cur.score > best.score ? cur : best), itemAttempts[0])
        : null;
      const passed = bestAttempt?.passed || false;

      return {
        id: item.id,
        title: item.title,
        assignment_type: item.assignment_type || 'vocabulary',
        className: item.class?.name || '—',
        deadline: item.deadline
          ? new Date(item.deadline).toLocaleDateString('vi-VN')
          : 'Không có hạn',
        isSubmitted,
        passed,
        bestScore: bestAttempt?.score ?? null,
        attemptCount: itemAttempts.length,
        attempts: itemAttempts,
      };
    });

      if (status === 'pending') {
      // Cần làm = chưa nộp HOẶC đã nộp nhưng chưa đạt
      records = records.filter((r) => !r.passed);
    } else if (status === 'completed') {
      // Hoàn thành = đã nộp VÀ đã đạt điểm (passed = true)
      records = records.filter((r) => r.passed);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter((r) => r.title.toLowerCase().includes(q));
    }

    return records;
  },
};