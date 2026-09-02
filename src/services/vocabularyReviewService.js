// src/services/vocabularyReviewService.js
import { supabase } from '../lib/supabase';

export const vocabularyReviewService = {
  async getReviewProgress(teacherId, { classId = 'all', searchQuery = '' } = {}) {
    // 1. Lấy class_ids của teacher
    const { data: teacherClasses, error: classErr } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', teacherId);
    if (classErr) throw classErr;

    let targetClassIds = (teacherClasses || []).map(c => c.id);
    if (classId !== 'all') targetClassIds = targetClassIds.filter(id => id === classId);
    if (targetClassIds.length === 0) return [];

    // 2. Lấy students trong các lớp đó
    const { data: classStudents, error: csErr } = await supabase
      .from('class_students')
      .select('student_id, class_id')
      .in('class_id', targetClassIds);
    if (csErr) throw csErr;

    const studentIds = [...new Set((classStudents || []).map(cs => cs.student_id))];
    if (studentIds.length === 0) return [];

    // Map student → class
    const studentClassMap = new Map();
    (classStudents || []).forEach(cs => studentClassMap.set(cs.student_id, cs.class_id));
    const classNameMap = new Map((teacherClasses || []).map(c => [c.id, c.name]));

    // 3. Lấy profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);
    if (pErr) throw pErr;

    // 4. Chỉ lấy chủ đề do chính giáo viên này tạo.
    const { data: vocabTopics, error: vtErr } = await supabase
      .from('vocab_topics')
      .select('id, name, vocabularies ( count )')
      .eq('teacher_id', teacherId);
    if (vtErr) throw vtErr;

    if (!vocabTopics || vocabTopics.length === 0) return [];

    // 5. Lấy attempts vocabulary của các students này
    const { data: attempts, error: aErr } = await supabase
      .from('assignment_attempts')
      .select('student_id, score, passed, completed_at, assignments!inner ( vocab_topic_id )')
      .in('student_id', studentIds)
      .not('assignments.vocab_topic_id', 'is', null);
    if (aErr) throw aErr;

    // Build kết quả: mỗi (student, topic) là 1 dòng
    const rows = [];
    (profiles || []).forEach(p => {
      vocabTopics.forEach(t => {
        const topicAttempts = (attempts || []).filter(
          a => a.student_id === p.id && a.assignments?.vocab_topic_id === t.id
        );
        if (topicAttempts.length === 0) return; // chỉ hiện student đã làm

        const bestAttempt = topicAttempts.reduce((best, current) => (
          (current.score ?? 0) > (best.score ?? 0) ? current : best
        ), topicAttempts[0]);
        const classId_ = studentClassMap.get(p.id);
        const className = classNameMap.get(classId_) || '—';
        const totalWords = t.vocabularies?.[0]?.count || 0;

        rows.push({
          id:             `${p.id}-${t.id}`,
          studentName:    p.full_name || 'Học sinh',
          className,
          topicName:      t.name,
          totalWords,
          learnedCount:   totalWords,
          retentionPct:   bestAttempt.score || 0,
          lastScore:      bestAttempt.score,
          lastReviewedAt: bestAttempt.completed_at
            ? new Date(bestAttempt.completed_at).toLocaleDateString('vi-VN')
            : null,
        });
      });
    });

    let filtered = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = rows.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.topicName.toLowerCase().includes(q)
      );
    }

    return filtered;
  },
};
