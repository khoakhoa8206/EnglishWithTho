// src/services/studentSummaryService.js
import { supabase } from '../lib/supabase';

export const studentSummaryService = {
  async getStudentSummary(studentId) {
    if (!studentId) throw new Error('Thiếu studentId');

    // 1. Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', studentId)
      .maybeSingle();
    if (profileError) throw profileError;

    // 2. Streak
    const { data: streakData } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak, last_active_date')
      .eq('student_id', studentId)
      .maybeSingle();

    // 3. Tất cả attempts
    const { data: allAttempts } = await supabase
      .from('assignment_attempts')
      .select('id, score, correct_count, total_questions, passed, completed_at, assignments!inner ( assignment_type, vocab_topic_id, grammar_topic_id )')
      .eq('student_id', studentId);

    const all = allAttempts || [];

    // 4. Vocab topics — số từ
    const { data: vocabTopics } = await supabase
      .from('vocab_topics')
      .select('id, vocabularies ( count )');

    const totalVocabWords = (vocabTopics || []).reduce((s, t) => s + (t.vocabularies?.[0]?.count || 0), 0);
    const topicWordMap = new Map(
      (vocabTopics || []).map(t => [t.id, t.vocabularies?.[0]?.count || 0])
    );
    // Phân loại theo type
    const byType = {
      vocabulary: { count: 0, correct: 0 },
      grammar:    { count: 0, correct: 0 },
      listening:  { count: 0, correct: 0 },
      review:     { count: 0, correct: 0 },
    };

    const passedVocabTopics = new Set();
    const passedGrammarTopics = new Set();

    all.forEach(a => {
      const t = a.assignments?.assignment_type || 'review';
      if (byType[t]) {
        byType[t].count++;
        byType[t].correct += a.correct_count || 0;
      }
      if (a.passed) {
        if (a.assignments?.vocab_topic_id) passedVocabTopics.add(a.assignments.vocab_topic_id);
        if (a.assignments?.grammar_topic_id) passedGrammarTopics.add(a.assignments.grammar_topic_id);
      }
    });

    const totalPassed  = all.filter(a => a.passed).length;
    const totalCorrect = all.reduce((s, a) => s + (a.correct_count || 0), 0);
    const totalQs      = all.reduce((s, a) => s + (a.total_questions || 0), 0);
    const avgScore     = all.length > 0 ? Math.round(all.reduce((s, a) => s + (a.score || 0), 0) / all.length) : 0;

    return {
      studentName:               profile?.full_name || 'Học sinh',
      streakCount:               streakData?.current_streak  || 0,
      longestStreak:             streakData?.longest_streak  || 0,
      lastActiveDate:            streakData?.last_active_date || null,

      // Fields SummaryPage cần
      wordsMastered: [...passedVocabTopics].reduce((s, id) => s + (topicWordMap.get(id) || 0), 0), // ✅
      wordsLearning: totalVocabWords,
      completedAssignments:      totalPassed,
      avgScore,
      completedGrammarLessons:   passedGrammarTopics.size,

      totalAttempts:             all.length,
      totalCorrect,
      totalPassed,

      byType,
    };
  },
};