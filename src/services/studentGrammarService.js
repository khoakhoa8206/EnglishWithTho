// src/services/studentGrammarService.js
import { supabase } from '../lib/supabase';

export const studentGrammarService = {
  async getGrammarLessons(studentId, { searchQuery = '' } = {}) {
    const { data: topics, error } = await supabase
      .from('grammar_topics')
      .select('id, name, structure, explanation, examples, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Kiểm tra student đã pass assignment grammar nào chưa
    const { data: attempts } = await supabase
      .from('assignment_attempts')
      .select('passed, assignments!inner ( grammar_topic_id )')
      .eq('student_id', studentId);

    const passedTopics = new Set();
    (attempts || []).forEach(a => {
      if (a.passed && a.assignments?.grammar_topic_id) {
        passedTopics.add(a.assignments.grammar_topic_id);
      }
    });

    let records = (topics || []).map((item) => ({
      id:          item.id,
      title:       item.name,
      structure:   item.structure   || '',
      explanation: item.explanation || '',
      examples:    item.examples    || '',
      isCompleted: passedTopics.has(item.id),
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter(r => r.title.toLowerCase().includes(q));
    }

    return records;
  },
};

// ─── Thêm vào cho GrammarQuizButton và GrammarQuiz (CLEAN-02) ──────────────

// Đếm số câu hỏi của một topic (để GrammarQuizButton biết có hiện nút không)
export async function getGrammarQuestionCount(topicId) {
  const { count, error } = await supabase
    .from('grammar_questions')
    .select('id', { count: 'exact', head: true })
    .eq('topic_id', topicId);
  if (error) throw error;
  return count || 0;
}

// Lấy câu hỏi để làm quiz
export async function getGrammarQuestions(topicId) {
  const { data, error } = await supabase
    .from('grammar_questions')
    .select('id, question, options, correct, question_type, difficulty')
    .eq('topic_id', topicId)
    .order('difficulty');
  if (error) throw error;
  return data || [];
}
