// src/services/studentVocabularyService.js
import { supabase } from '../lib/supabase';

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

  // Lấy bài tập Part 4 (từ file giáo viên upload) theo vocab_topic_id
  async getVocabExercises(topicId) {
    const { data, error } = await supabase
      .from('vocab_exercise_files')
      .select('id, title, questions, created_at')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
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