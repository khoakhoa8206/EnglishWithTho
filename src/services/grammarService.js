// src/services/grammarService.js
import { supabase } from '../lib/supabase';

export const grammarService = {
  async getGrammarLessons(teacherId) {
    const { data, error } = await supabase
      .from('grammar_topics')
      .select('id, name, structure, explanation, published, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => ({
      id:          item.id,
      title:       item.name,
      structure:   item.structure   || '',
      explanation: item.explanation || 'Không có mô tả',
      published:   item.published   || false,
      createdAt:   new Date(item.created_at).toLocaleDateString('vi-VN'),
    }));
  },


  // Lưu tài liệu ngữ pháp dạng HTML thuần (Mammoth, không qua AI)
  async createGrammarDoc(teacherId, { title, html_content }) {
    const { data, error } = await supabase
      .from('grammar_topics')
      .insert([{ teacher_id: teacherId, name: title, html_content }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createGrammarLesson(teacherId, { title, structure, explanation, examples }) {
    const { data, error } = await supabase
      .from('grammar_topics')
      .insert([{ teacher_id: teacherId, name: title, structure, explanation, examples, published: false }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // FIX: alias để UploadGrammarModal dùng addGrammarLesson() không bị crash
  addGrammarLesson(teacherId, fields) {
    return this.createGrammarLesson(teacherId, fields);
  },

  async updateGrammarLesson(topicId, fields) {
    const { data, error } = await supabase
      .from('grammar_topics')
      .update(fields)
      .eq('id', topicId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setPublished(topicId, published) {
    return this.updateGrammarLesson(topicId, { published });
  },

  async deleteGrammarLesson(topicId) {
    const { error } = await supabase
      .from('grammar_topics')
      .delete()
      .eq('id', topicId);
    if (error) throw error;
    return true;
  },

  // ─── Grammar Questions ────────────────────────────────────────────────────

  async getGrammarQuestions(topicId) {
    const { data, error } = await supabase
      .from('grammar_questions')
      .select('id, question, options, correct, difficulty, question_type, created_at')
      .eq('topic_id', topicId)
      .order('difficulty')
      .order('created_at');
    if (error) throw error;
    return (data || []).map(q => ({
      ...q,
      options: _parseOptions(q.options),
    }));
  },

  async addGrammarQuestion(topicId, { question, options, correct, difficulty, question_type }) {
    const { data, error } = await supabase
      .from('grammar_questions')
      .insert([{
        topic_id:      topicId,
        question,
        options:       JSON.stringify(options),
        correct,
        difficulty:    difficulty    || 'nhan_biet',
        question_type: question_type || 'multiple_choice',
      }])
      .select()
      .single();
    if (error) throw error;
    return { ...data, options: _parseOptions(data.options) };
  },

  async bulkAddGrammarQuestions(topicId, questions) {
  // Map CEFR level → difficulty enum của DB
  const difficultyMap = {
    A1: 'nhan_biet', A2: 'nhan_biet',
    B1: 'van_dung',  B2: 'van_dung',
    C1: 'van_dung_cao', C2: 'van_dung_cao',
  };

  const payload = questions.map(question => ({
    topic_id:      topicId,
    question:      question.question,
    options:       JSON.stringify(question.options || []),
    correct:       question.correct,
    question_type: question.question_type || 'multiple_choice',
    difficulty:    difficultyMap[question.difficulty]
                   || (['nhan_biet', 'van_dung', 'van_dung_cao'].includes(question.difficulty)
                       ? question.difficulty : 'nhan_biet'),
  }));

  const { data, error } = await supabase.from('grammar_questions').insert(payload).select();
  if (error) throw error;
  return (data || []).map(question => ({ ...question, options: _parseOptions(question.options) }));
},

  async deleteGrammarQuestion(questionId) {
    const { error } = await supabase
      .from('grammar_questions')
      .delete()
      .eq('id', questionId);
    if (error) throw error;
    return true;
  },
};

function _parseOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}
