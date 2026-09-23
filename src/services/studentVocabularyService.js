// src/services/studentVocabularyService.js
import { supabase } from '../lib/supabase';
import { ASSIGN_ALL_FILES, NO_TOPIC_TAG, parseAssignAllInTag } from './vocabularyService';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const studentVocabularyService = {
  async getVocabularySets(studentId) {
    // Lấy tất cả vocabulary sets, không lọc theo lớp (theo thiết kế hiện tại)
    const { data, error } = await supabase
      .from('vocab_topics')
      .select('id, name, created_at, vocabularies ( count )')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => {
      // BUG FIX: Supabase aggregate trả về array hoặc [{count: N}]
      // Cần handle cả 2 trường hợp an toàn
      const vocabArr = item.vocabularies;
      let wordCount = 0;
      if (Array.isArray(vocabArr) && vocabArr.length > 0) {
        wordCount = Number(vocabArr[0]?.count) || 0;
      } else if (vocabArr && typeof vocabArr === 'object') {
        wordCount = Number(vocabArr.count) || 0;
      }

      return {
        id:        item.id,
        title:     item.name,
        wordCount,
        passed:    false,
      };
    });
  },

  // Lấy bài tập Part 4 — đúng nguồn:
  // 1. vocab_topic_ex4_assignments → question_bank_items (Bài 4 chuyên đề)
  // 2. Fallback: vocab_topic_assignments → question_bank_items (BT chung)
  async getVocabExercises(topicId) {
    // 1. Tìm upload_id theo vocab_topic_ex4_assignments trước
    let uploadId = null;
    const { data: ex4, error: e0 } = await supabase
      .from('vocab_topic_ex4_assignments')
      .select('upload_id')
      .eq('topic_id', topicId)
      .maybeSingle();
    if (!e0 && ex4?.upload_id) uploadId = ex4.upload_id;

    // 2. Nếu chưa có, thử vocab_topic_assignments
    if (!uploadId) {
      const { data: bt, error: e1 } = await supabase
        .from('vocab_topic_assignments')
        .select('upload_id')
        .eq('topic_id', topicId)
        .maybeSingle();
      if (!e1 && bt?.upload_id) uploadId = bt.upload_id;
    }

    if (!uploadId) return [];

    // 3. Lấy câu hỏi từ question_bank_items
    let q = supabase
      .from('question_bank_items')
      .select('id, question, options, correct, question_type, hint, sort_order');

    const allInTag = parseAssignAllInTag(uploadId);
    const isRandom = uploadId === ASSIGN_ALL_FILES || !!allInTag;

    if (isRandom) {
      const { data: topicRow, error: trErr } = await supabase
        .from('vocab_topics')
        .select('teacher_id')
        .eq('id', topicId)
        .maybeSingle();
      if (trErr) throw trErr;
      const teacherId = topicRow?.teacher_id;

      if (allInTag) {
        // Random câu hỏi từ các file trong chủ đề — ưu tiên danh sách file hiện tại
        // (gồm cả file thêm sau khi gán), không đọc được thì dùng danh sách lúc gán
        let uploadIds = allInTag.uploadIds;
        if (teacherId) {
          let uq = supabase
            .from('question_bank_uploads')
            .select('id')
            .eq('teacher_id', teacherId)
            .eq('subject_type', 'vocab');
          uq = allInTag.tag === NO_TOPIC_TAG ? uq.is('topic_tag', null) : uq.eq('topic_tag', allInTag.tag);
          const { data: uploads } = await uq;
          if (uploads?.length) uploadIds = uploads.map(u => u.id);
        }
        if (uploadIds.length === 0) return [];
        q = q.in('upload_id', uploadIds);
      } else if (teacherId) {
        // __ALL__ (cách gán cũ) → lấy tất cả câu hỏi của teacher (random câu hỏi từ mọi file)
        q = q.eq('teacher_id', teacherId);
      }
    } else {
      q = q.eq('upload_id', uploadId);
    }

    const { data: items, error: e2 } = await q.order('sort_order', { ascending: true });
    if (e2) throw e2;

    // 4. Trả về dạng tương thích với code hiện tại
    return [{
      id: uploadId,
      title: 'Bài tập 4',
      questions: isRandom ? shuffleArray(items || []) : (items || []),
      created_at: new Date().toISOString(),
    }];
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
  // Lấy map { topicId → uploadId } từ bảng vocab_topic_assignments
  async getTopicAssignments() {
    const { data, error } = await supabase
      .from('vocab_topic_assignments')
      .select('topic_id, upload_id');
    if (error) return {};
    const map = {};
    (data || []).forEach(row => { map[row.topic_id] = row.upload_id; });
    return map;
  },
};

export async function fetchIPA(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const phonetic = data[0]?.phonetics?.find(p => p.text)?.text
      || data[0]?.phonetic
      || null;
    return phonetic;
  } catch {
    return null;
  }
}

export async function enrichWordsWithIPA(words) {
  return Promise.all(
    words.map(async (w) => {
      if (w.ipa) return w;
      const ipa = await fetchIPA(w.word);
      return { ...w, ipa: ipa || '' };
    })
  );
}