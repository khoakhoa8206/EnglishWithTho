// src/services/questionBankService.js
import { supabase } from '../lib/supabase';


export const questionBankService = {
  // Lấy danh sách các lần upload (để render dropdown "Chọn từ nguồn")
  async getUploads(teacherId, subjectType) {
    const { data, error } = await supabase
      .from('question_bank_uploads')
      .select('id, upload_label, question_count, created_at, topic_tag')
      .eq('teacher_id', teacherId)
      .eq('subject_type', subjectType)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },


  // Upload một batch câu hỏi mới vào ngân hàng
  async uploadBatch(teacherId, { subjectType, topicRefId, uploadLabel, questions, fileUrl, topicTag }) {
    // 1. Tạo upload record
    const { data: upload, error: ue } = await supabase
      .from('question_bank_uploads')
      .insert({
        teacher_id: teacherId,
        subject_type: subjectType,
        topic_ref_id: topicRefId || null,
        upload_label: uploadLabel,
        question_count: questions.length,
        file_url: fileUrl || null, // URL file gốc trên Storage
        topic_tag: topicTag || null,
      })
      .select()
      .single();
    if (ue) throw ue;


    // 2. Insert câu hỏi
    const items = questions.map((q, idx) => ({
      upload_id:    upload.id,
      teacher_id:   teacherId,
      subject_type: subjectType,
      question:     q.question,
      options:      q.options ? q.options : null,
      correct:      q.correct ?? q.correct_answer ?? '',
      question_type: q.question_type || 'multiple_choice',
      difficulty:   q.difficulty || null,
      hint:         q.hint || null,
      explanation:  q.explanation || null,
      sort_order:   idx,
    }));


    const { error: ie } = await supabase
      .from('question_bank_items')
      .insert(items);
    if (ie) throw ie;


    return upload;
  },

  // Gán / sửa chủ đề cho một lần upload (không cần upload lại)
  async updateTopicTag(uploadId, topicTag) {
    const { error } = await supabase
      .from('question_bank_uploads')
      .update({ topic_tag: String(topicTag || '').trim() || null })
      .eq('id', uploadId);
    if (error) throw error;
  },

  // Lấy danh sách chủ đề duy nhất
  async getTopicTags(teacherId, subjectType) {
    const { data, error } = await supabase
      .from('question_bank_uploads')
      .select('topic_tag')
      .eq('teacher_id', teacherId)
      .eq('subject_type', subjectType)
      .not('topic_tag', 'is', null);
    if (error) throw error;
    const tags = [...new Set((data || []).map(r => r.topic_tag).filter(Boolean))];
    return tags.sort();
  },

  // Lấy câu hỏi từ nhiều uploads (merge nhiều file lại)
  async getQuestionsFromMultiple(uploadIds, teacherId) {
    if (!uploadIds || uploadIds.length === 0) return [];
    let query = supabase
      .from('question_bank_items')
      .select('id, upload_id, question, options, correct, question_type, difficulty, hint, explanation, sort_order')
      .in('upload_id', uploadIds);
    if (teacherId) query = query.eq('teacher_id', teacherId);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },


  // Lấy câu hỏi từ một hoặc nhiều upload (selectedUploadIds = [] nghĩa là lấy tất cả)
  async getQuestions(teacherId, subjectType, { selectedUploadIds = [], limit } = {}) {
    let query = supabase
      .from('question_bank_items')
      .select('id, upload_id, question, options, correct, question_type, difficulty, hint, explanation')
      .eq('teacher_id', teacherId)
      .eq('subject_type', subjectType)
      .order('sort_order', { ascending: true });


    if (selectedUploadIds.length > 0) {
      query = query.in('upload_id', selectedUploadIds);
    }
    if (limit) {
      query = query.limit(limit);
    }


    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },


  // Xóa một lần upload (cascade xóa câu hỏi)
  async deleteUpload(uploadId) {
    const { error } = await supabase
      .from('question_bank_uploads')
      .delete()
      .eq('id', uploadId);
    if (error) throw error;
    return true;
  },

  // Sửa một câu hỏi trong ngân hàng
  async updateQuestion(questionId, updates) {
    const { error } = await supabase
      .from('question_bank_items')
      .update({
        question:      updates.question,
        options:       updates.options || null,
        correct:       updates.correct,
        question_type: updates.question_type,
        difficulty:    updates.difficulty || null,
        hint:          updates.hint || null,
        explanation:   updates.explanation || null,
      })
      .eq('id', questionId);
    if (error) throw error;
  },

  // Xóa một câu hỏi trong ngân hàng
  async deleteQuestion(questionId) {
    const { error } = await supabase
      .from('question_bank_items')
      .delete()
      .eq('id', questionId);
    if (error) throw error;
  },
};