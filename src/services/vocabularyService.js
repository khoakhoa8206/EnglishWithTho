// src/services/vocabularyService.js
import { supabase } from '../lib/supabase';

// Giá trị đặc biệt: gán tất cả file (random câu hỏi từ mọi file trong ngân hàng)
export const ASSIGN_ALL_FILES = '__ALL__';

export const vocabularyService = {
  async getVocabularySets(teacherId) {
    const { data, error } = await supabase
      .from('vocab_topics')
      .select('id, name, created_at, vocabularies ( count )')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map((item) => {
      const vocabArr = item.vocabularies;
      let totalWords = 0;
      if (Array.isArray(vocabArr) && vocabArr.length > 0) {
        totalWords = Number(vocabArr[0]?.count) || 0;
      } else if (vocabArr && typeof vocabArr === 'object') {
        totalWords = Number(vocabArr.count) || 0;
      }
      return {
        id:         item.id,
        title:      item.name,
        totalWords,
        createdAt:  new Date(item.created_at).toLocaleDateString('vi-VN'),
      };
    });
  },

  async createVocabularySet(teacherId, { title }) {
    const { data, error } = await supabase
      .from('vocab_topics')
      .insert([{ teacher_id: teacherId, name: title }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteVocabularySet(topicId) {
    const { error } = await supabase
      .from('vocab_topics')
      .delete()
      .eq('id', topicId);
    if (error) throw error;
    return true;
  },

  async getVocabularies(topicId) {
    const { data, error } = await supabase
      .from('vocabularies')
      .select('id, word, part_of_speech, ipa, meaning_vi, example, audio_url, sort_order')
      .eq('topic_id', topicId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Cập nhật từ trong kho từ vựng + đồng bộ xuống các assignment đã giao
  async updateWord(wordId, fields) {
    const patch = {};
    if (fields.word !== undefined) patch.word = fields.word;
    if (fields.meaning_vi !== undefined) patch.meaning_vi = fields.meaning_vi;
    if (fields.ipa !== undefined) patch.ipa = fields.ipa;
    if (fields.example !== undefined) patch.example = fields.example;
    if (Object.keys(patch).length === 0) return null;

    const { data, error } = await supabase
      .from('vocabularies')
      .update(patch)
      .eq('id', wordId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Đồng bộ thay đổi từ xuống các question_bank_items đang tham chiếu câu hỏi từ vựng
  async syncWordToAssignments(wordId, { word, meaning_vi } = {}) {
    if (!wordId) return;
    const { data: qbItems, error: qbErr } = await supabase
      .from('question_bank_items')
      .select('id, question, options, correct')
      .eq('source_type', 'vocab')
      .eq('source_id', wordId);
    if (qbErr) return;

    const requests = (qbItems || []).map(async (item) => {
      const patch = {};
      if (word) {
        const cleanWord = word.trim();
        if (cleanWord) {
          patch.question = `"${cleanWord}" có nghĩa là gì?`;
        }
      }
      if (meaning_vi) {
        const cleanMeaning = meaning_vi.trim();
        if (cleanMeaning) {
          // Cập nhật đáp án đúng trong options và correct (khớp theo text sau khi bóc prefix)
          let options = [];
          try {
            options = Array.isArray(item.options) ? item.options : JSON.parse(item.options || '[]');
          } catch { options = []; }
          const oldCorrect = (item.correct || '').toString().replace(/^[A-Da-d][.)]\s*/, '').trim();
          const clean = (opt) => (typeof opt === 'string' ? opt : (opt.text || ''))
            .replace(/^[A-Da-d][.)]\s*/, '').trim();
          let replaced = false;
          options = options.map(o => {
            if (!replaced && clean(o) === oldCorrect) {
              replaced = true;
              if (typeof o === 'string') return o.replace(o, cleanMeaning);
              return { ...o, text: cleanMeaning };
            }
            return o;
          });
          if (!replaced) options = [...options, cleanMeaning];
          patch.correct = cleanMeaning;
          patch.options = options;
        }
      }
      if (Object.keys(patch).length > 0) {
        await supabase.from('question_bank_items').update(patch).eq('id', item.id);
      }
    });

    await Promise.all(requests);
  },

  async uploadVocabFile(teacherId, file) {
    const path = `vocab-uploads/${teacherId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('materials').upload(path, file);
    if (upErr) throw new Error('Upload thất bại: ' + upErr.message);
    const { data: urlData } = supabase.storage.from('materials').getPublicUrl(path);
    return urlData.publicUrl;
  },

  async bulkInsertWords(topicId, words) {
    if (!words || words.length === 0) return;

    const payload = words.map((w, idx) => ({
      topic_id:       topicId,
      word:           w.word.trim(),
      part_of_speech: w.part_of_speech || null,
      ipa:            w.ipa            || null,
      meaning_vi:     w.meaning_vi.trim(),
      example:        w.example        || null,
      sort_order:     idx,
    }));

    // Dùng upsert với onConflict (yêu cầu unique constraint vocabularies_topic_word_unique trên DB)
    const { error } = await supabase
      .from('vocabularies')
      .upsert(payload, {
        onConflict: 'topic_id,word',
        ignoreDuplicates: true,
      });

    if (error) {
      // Fallback: nếu constraint chưa có, dùng insert và bỏ qua lỗi duplicate
      if (error.message?.includes('no unique or exclusion constraint')) {
        const { error: insertError } = await supabase
          .from('vocabularies')
          .insert(payload);
        // Bỏ qua lỗi unique violation (23505) — từ trùng sẽ không được thêm
        if (insertError && insertError.code !== '23505') throw insertError;
        return;
      }
      throw error;
    }
  },

  // ─── Vocab Bài 4 (bài tập vận dụng) ────────────────────────────────────────

  async getVocabExercises(topicId) {
    const { data, error } = await supabase
      .from('vocab_exercise_files')
      .select('id, title, questions, created_at')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveVocabExercise(teacherId, topicId, { title, questions }) {
    // Xóa bản ghi exercise cũ cho cùng topic để không chồng lên nhau
    // (chỉ giữ 1 file mới nhất, tránh bài cũ/cũ lẫn lộn khi lấy dữ liệu)
    await supabase
      .from('vocab_exercise_files')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('topic_id', topicId);

    const { data, error } = await supabase
      .from('vocab_exercise_files')
      .insert([{ teacher_id: teacherId, topic_id: topicId, title, questions }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteVocabExercise(exerciseId) {
    const { error } = await supabase
      .from('vocab_exercise_files')
      .delete()
      .eq('id', exerciseId);
    if (error) throw error;
  },

  // Lấy danh sách assignment (topic → upload)
  async getTopicAssignments(teacherId) {
    const { data, error } = await supabase
      .from('vocab_topic_assignments')
      .select('topic_id, upload_id')
      .eq('teacher_id', teacherId);
    if (error) throw error;
    return data || [];
  },

  // Gán hoặc bỏ gán bài tập cho một topic
  async saveTopicAssignment(teacherId, topicId, uploadId) {
    if (!uploadId) {
      // Bỏ gán hoàn toàn: xóa record
      await supabase
        .from('vocab_topic_assignments')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('topic_id', topicId);
      return;
    }
    // uploadId = '__ALL__' → gán tất cả file; uploadId = UUID → gán file cụ thể
    // Cột upload_id là TEXT hoặc UUID; với '__ALL__' cần lưu dạng TEXT
    // Nếu DB đang là UUID type, cần thêm cột riêng hoặc đổi kiểu cột (xem lưu ý bên dưới)
    const { error } = await supabase
      .from('vocab_topic_assignments')
      .upsert(
        { teacher_id: teacherId, topic_id: topicId, upload_id: uploadId },
        { onConflict: 'teacher_id,topic_id' }
      );
    if (error) throw error;
  },

  // Lấy danh sách assignment Bài 4 cho tất cả topics của teacher
  async getTopicEx4Assignments(teacherId) {
    const { data, error } = await supabase
      .from('vocab_topic_ex4_assignments')
      .select('topic_id, upload_id')
      .eq('teacher_id', teacherId);
    if (error) throw error;
    return data || [];
  },

  // Sửa 1 câu hỏi trong question_bank_items (dùng từ EditAnswersModal)
  async updateBankQuestion(questionId, fields) {
    const patch = {};
    if (fields.question !== undefined) patch.question = fields.question;
    if (fields.options !== undefined) patch.options = JSON.stringify(fields.options);
    if (fields.correct !== undefined) patch.correct = fields.correct;
    if (Object.keys(patch).length === 0) return null;
    const { data, error } = await supabase
      .from('question_bank_items')
      .update(patch)
      .eq('id', questionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Sửa câu hỏi đã chép vào assignment_questions (bản copy trong assignment)
  async updateAssignmentQuestion(assignmentQuestionId, fields) {
    const patch = {};
    if (fields.question !== undefined) patch.question = fields.question;
    if (fields.options !== undefined) patch.options = JSON.stringify(fields.options);
    if (fields.correct !== undefined) patch.correct = fields.correct;
    if (Object.keys(patch).length === 0) return null;
    const { data, error } = await supabase
      .from('assignment_questions')
      .update(patch)
      .eq('id', assignmentQuestionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Gán hoặc bỏ gán Bài 4 cho một topic
  async saveTopicEx4Assignment(teacherId, topicId, uploadId) {
    if (!uploadId) {
      await supabase
        .from('vocab_topic_ex4_assignments')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('topic_id', topicId);
      return;
    }
    const { error } = await supabase
      .from('vocab_topic_ex4_assignments')
      .upsert(
        { teacher_id: teacherId, topic_id: topicId, upload_id: uploadId },
        { onConflict: 'teacher_id,topic_id' }
      );
    if (error) throw error;
  },

};