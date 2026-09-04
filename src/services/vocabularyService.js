// src/services/vocabularyService.js
import { supabase } from '../lib/supabase';

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
      // Bỏ gán: xóa record nếu có
      await supabase
        .from('vocab_topic_assignments')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('topic_id', topicId);
      return;
    }
    // Upsert
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