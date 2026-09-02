// src/services/assignment/assignmentService.js
import { supabase } from '@/lib/supabase';
import { PASSING_SCORE } from '@/constants/scoring';

export const assignmentService = {
  async generateVocabularyApplicationQuestions({ words, difficulty = 'A1', questionCount }) {
    const sourceWords = (words || []).slice(0, questionCount).map(word => ({ word: word.word, meaning_vi: word.meaning_vi, part_of_speech: word.part_of_speech || '', example: word.example || '' }));
    if (sourceWords.length === 0) throw new Error('Chưa có từ vựng để soạn bài.');
    const prompt = `Bạn là giáo viên tiếng Anh. Soạn ${sourceWords.length} câu trắc nghiệm VẬN DỤNG từ vựng ở trình độ CEFR ${difficulty}.\n\nTừ vựng cần kiểm tra: ${JSON.stringify(sourceWords)}\n\nYêu cầu bắt buộc:\n- Mỗi câu là ngữ cảnh tiếng Anh tự nhiên có một chỗ trống ___; học sinh chọn từ hoặc dạng từ đúng để hoàn thành.\n- TUYỆT ĐỐI không hỏi kiểu "X có nghĩa là gì?" và không cho đáp án là nghĩa tiếng Việt.\n- Mỗi câu có đúng 4 lựa chọn tiếng Anh, một đáp án đúng; đáp án đúng phải xuất hiện nguyên văn trong options.\n- Dùng các từ trong danh sách, ưu tiên một từ cho mỗi câu. Distractor hợp lý, cùng loại từ/dạng từ khi cần.\n- Phù hợp mức ${difficulty}; không dùng từ/cấu trúc vượt quá mức này nếu không nằm trong danh sách.\n- Viết hint ngắn và explanation giải thích đáp án bằng tiếng Việt.\n\nChỉ trả về JSON array hợp lệ, không markdown:\n[{"question":"After a long day, I need to ___.","options":["relaxed","relaxing","relaxation","relax"],"correct":"relax","question_type":"multiple_choice","hint":"thư giãn","explanation":"Sau need to dùng động từ nguyên mẫu: relax."}]`;
    const { data, error } = await supabase.functions.invoke('ai-proxy', { body: { prompt, max_tokens: Math.min(16000, 700 + sourceWords.length * 350) } });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    const parsed = parseAiQuestionArray(data?.content || '');
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('AI chưa tạo được câu hỏi.');
    return parsed.slice(0, sourceWords.length).map((question, index) => {
      const options = Array.isArray(question.options) ? question.options.map(option => String(option).trim()).filter(Boolean).slice(0, 4) : [];
      const correct = String(question.correct || '').trim();
      if (!question.question || options.length !== 4 || !options.includes(correct)) throw new Error(`Câu ${index + 1} do AI tạo chưa đúng định dạng. Hãy thử soạn lại.`);
      return { question: question.question.trim(), options, correct, question_type: 'multiple_choice', hint: question.hint || '', explanation: question.explanation || '' };
    });
  },

  async getByClass(classId) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*, assignment_questions(*)')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

async getById(assignmentId) {
  const { data, error } = await supabase
    .from('assignments')
    // ✅ FIX BUG-02: explicit select thay vì wildcard *
    .select('id, title, assignment_type, class_id, deadline, vocab_topic_id, grammar_topic_id, listening_material_id, assignment_questions(*)')
    .eq('id', assignmentId)
    .single();
  if (error) throw error;
  return data;
},

  async create(payload) {
    const { data, error } = await supabase
      .from('assignments')
      .insert({ status: 'published', ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Chuyển draft → published hoặc ngược lại
  async setStatus(assignmentId, status) {
    const { data, error } = await supabase
      .from('assignments')
      .update({ status })
      .eq('id', assignmentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateMeta(assignmentId, { title, deadline }) {
    const { data, error } = await supabase
      .from('assignments')
      .update({ title, deadline: deadline || null })
      .eq('id', assignmentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createWithQuestions(teacherId, opts) {
    const {
      title, assignment_type, classId, deadline,
      vocab_topic_id, grammar_topic_id, listening_material_id,
      selectedVocabIds,
      questions: manualQuestions,
      status = 'published',
    } = opts;

    // 1. Tạo assignment record
    const assignmentPayload = {
      teacher_id: teacherId, title, assignment_type,
      class_id: classId, deadline: deadline || null,
      status,
    };
    if (vocab_topic_id)        assignmentPayload.vocab_topic_id = vocab_topic_id;
    if (grammar_topic_id)      assignmentPayload.grammar_topic_id = grammar_topic_id;
    if (listening_material_id) assignmentPayload.listening_material_id = listening_material_id;

    const { data: assignment, error: ae } = await supabase
      .from('assignments').insert(assignmentPayload).select().single();
    if (ae) throw ae;

    // 2. Build questions
    let questionsToInsert = [];

    if (manualQuestions && manualQuestions.length > 0) {
      questionsToInsert = manualQuestions.map((q, idx) => ({
        assignment_id: assignment.id,
        question:      q.question,
        options:       q.options ?? null,
        correct:       q.correct,
        question_type: q.question_type || 'multiple_choice',
        difficulty:    q.difficulty    || null,
        sort_order:    q.sort_order    ?? idx,
        hint:          q.hint          || null,
        explanation:   q.explanation   || null,
      }));
    } else if (assignment_type === 'vocabulary' && vocab_topic_id) {
      const { data: words, error: we } = await supabase
        .from('vocabularies')
        .select('id, word, meaning_vi, part_of_speech, ipa, example')
        .eq('topic_id', vocab_topic_id)
        .order('sort_order', { ascending: true });
      if (we) throw we;

      const selectedIds = new Set(selectedVocabIds || []);
      const selectedWords = selectedIds.size > 0
        ? (words || []).filter(word => selectedIds.has(word.id))
        : (words || []);

      selectedWords.forEach((w, idx) => {
        const wrongWords = words.filter(x => x.id !== w.id);
        const distractors = _shuffle(wrongWords).slice(0, 3).map(x => x.meaning_vi);
        const options = _shuffle([w.meaning_vi, ...distractors]);

        questionsToInsert.push({
          assignment_id: assignment.id,
          question:      `"${w.word}" có nghĩa là gì?`,
          options:       JSON.stringify(options),
          correct:       w.meaning_vi,
          question_type: 'multiple_choice',
          difficulty:    null,
          sort_order:    idx,
          hint:          w.part_of_speech || null,
          explanation:   w.example        || null,
        });

      });
    } else if (assignment_type === 'grammar' && grammar_topic_id) {
      const { data: gqs, error: ge } = await supabase
        .from('grammar_questions')
        .select('id, question, options, correct, question_type, difficulty')
        .eq('topic_id', grammar_topic_id)
        .order('difficulty');
      if (ge) throw ge;

      questionsToInsert = (gqs || []).map((q, idx) => ({
        assignment_id: assignment.id,
        question:      q.question,
        options:       q.options,
        correct:       q.correct,
        question_type: q.question_type || 'multiple_choice',
        difficulty:    q.difficulty    || null,
        sort_order:    idx,
        hint:          null,
        explanation:   null,
      }));
    } else if (assignment_type === 'listening' && listening_material_id) {
      // Fetch script → AI generate questions
      const { data: mat, error: me } = await supabase
        .from('listening_materials')
        .select('script')
        .eq('id', listening_material_id)
        .single();
      if (me) throw me;

      if (mat?.script) {
        try {
          // ✅ FIX Bug #4: gọi qua Edge Function thay vì Anthropic trực tiếp
          // (Anthropic API bị CORS block từ browser, và không nên lộ API key)
          const prompt = `Đọc tài liệu listening/bài tập mẫu dưới đây và CHỈ chuyển các câu hỏi đã có thành JSON để giao học sinh. Không tự tạo thêm câu hỏi, không đổi nội dung hay thêm câu ngoài tài liệu. Với trắc nghiệm, giữ đủ 4 lựa chọn và đáp án đúng; với điền từ dùng options: null.\n\nTài liệu:\n${mat.script}\n\nTrả về JSON array ONLY (không markdown, không preamble):\n[{"question":"...","question_type":"multiple_choice","options":["A","B","C","D"],"correct":"đáp án đúng"},{"question":"...","question_type":"dictation","options":null,"correct":"từ ngắn"}]`;
          const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-proxy', {
            body: { prompt, max_tokens: 1000 },
          });
          if (aiError) throw new Error(aiError.message);
          if (aiData?.error) throw new Error(aiData.error);
          const text = aiData?.content || '';
          const parsed = parseAiQuestionArray(text);
          questionsToInsert = parsed.map((q, idx) => ({
            assignment_id: assignment.id,
            question:      q.question,
            options:       q.options ? JSON.stringify(q.options) : null,
            correct:       q.correct,
            question_type: q.question_type || 'multiple_choice',
            difficulty:    null,
            sort_order:    idx,
            hint:          null,
            explanation:   null,
          }));
        } catch (_) {
          // AI thất bại → assignment tạo không có câu hỏi, teacher tự thêm sau
        }
      }
    }

    // 3. Insert questions
    if (questionsToInsert.length > 0) {
      const { error: qe } = await supabase
        .from('assignment_questions')
        .insert(questionsToInsert);
      if (qe) throw qe;
    }

    return { ...assignment, questionCount: questionsToInsert.length };
  },

  async delete(assignmentId) {
    const { error } = await supabase
      .from('assignments').delete().eq('id', assignmentId);
    if (error) throw error;
    return true;
  },

  async submitAttempt({ studentId, assignmentId, startedAt, answers }) {
    const { data: questions, error: qErr } = await supabase
      .from('assignment_questions')
      .select('id, correct')
      .eq('assignment_id', assignmentId);
    if (qErr) throw qErr;

    const { count: existingCount } = await supabase
      .from('assignment_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId);
    const attemptNumber = (parseInt(existingCount, 10) || 0) + 1;

    const questionMap = new Map((questions || []).map(q => [q.id, q.correct]));
    const totalQuestions = questionMap.size;

    let correctCount = 0;
    const scoredAnswers = (answers || []).map(a => {
      const correctAnswer = questionMap.get(a.question_id);
      const isCorrect =
        correctAnswer !== undefined &&
        _normalizeAnswer(a.student_answer) === _normalizeAnswer(correctAnswer);
      if (isCorrect) correctCount++;
      return {
        question_id:    a.question_id,
        student_answer: a.student_answer,
        correct_answer: correctAnswer || '',
        is_correct:     isCorrect,
      };
    });

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= PASSING_SCORE;
    const completedAt = new Date().toISOString();
    const durationSeconds = startedAt
      ? Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
      : null;

    const { data: attempt, error: ae } = await supabase
      .from('assignment_attempts')
      .insert({
        assignment_id: assignmentId, student_id: studentId,
        attempt_number: attemptNumber,
        score, correct_count: correctCount,
        wrong_count: totalQuestions - correctCount,
        total_questions: totalQuestions,
        started_at: startedAt, completed_at: completedAt,
        duration_seconds: durationSeconds, passed,
      })
      .select().single();
    if (ae) throw ae;

    const answersToInsert = scoredAnswers.map(a => ({
      attempt_id:     attempt.id,
      question_id:    a.question_id,
      student_answer: a.student_answer,
      is_correct:     a.is_correct,
    }));
    if (answersToInsert.length > 0) {
      const { error: ansErr } = await supabase
        .from('assignment_answers').insert(answersToInsert);
      if (ansErr) throw ansErr;
    }

    await this._updateStreak(studentId);

    return { ...attempt, scoredAnswers, passed };
  },

  async getAttempts(assignmentId, studentId) {
    const { data, error } = await supabase
      .from('assignment_attempts')
      .select('*, assignment_answers(*)')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getLeaderboard(assignmentId, classId) {
    const { data, error } = await supabase
      .rpc('get_leaderboard', { p_assignment_id: assignmentId });

    if (error) {
      const { data: fallback, error: fbErr } = await supabase
        .from('assignment_attempts')
        .select('id, student_id, score, correct_count, total_questions, duration_seconds, attempt_number, profiles!inner ( full_name )')
        .eq('assignment_id', assignmentId)
        .eq('passed', true)
        .order('correct_count', { ascending: false })
        .order('duration_seconds', { ascending: true });
      if (fbErr) throw fbErr;

      const classCheck = await supabase
        .from('class_students').select('student_id').eq('class_id', classId);
      const classStudentIds = new Set((classCheck.data || []).map(r => r.student_id));

      return (fallback || [])
        .filter(r => classStudentIds.has(r.student_id))
        .map((row, i) => ({
          rank:             i + 1,
          studentName:      row.profiles?.full_name || 'Học sinh',
          score:            row.score,
          correctCount:     row.correct_count,
          totalQuestions:   row.total_questions,
          durationSeconds:  row.duration_seconds,
          durationFormatted: row.duration_seconds
            ? `${Math.floor(row.duration_seconds / 60)}p${row.duration_seconds % 60}s`
            : '—',
        }));
    }

    return (data || []).map(row => ({
      rank:             Number(row.rank),
      studentName:      row.student_name || 'Học sinh',
      correctCount:     row.correct_count,
      totalQuestions:   null,
      durationSeconds:  row.duration_seconds,
      durationFormatted: row.duration_seconds
        ? `${Math.floor(row.duration_seconds / 60)}p${row.duration_seconds % 60}s`
        : '—',
    }));
  },

  async _updateStreak(studentId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: streak } = await supabase
        .from('streaks')
        .select('id, current_streak, last_active_date')
        .eq('student_id', studentId)
        .maybeSingle();

      if (!streak) {
        await supabase.from('streaks').insert({
          student_id: studentId, current_streak: 1,
          longest_streak: 1, last_active_date: today,
        });
        return;
      }

      const last = streak.last_active_date;
      if (last === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = last === yesterdayStr ? streak.current_streak + 1 : 1;

      await supabase.from('streaks').update({
        current_streak:   newStreak,
        longest_streak:   Math.max(newStreak, streak.current_streak),
        last_active_date: today,
      }).eq('id', streak.id);
    } catch (e) {
      console.error('Streak update failed:', e);
    }
  },

  async getAssignments(teacherId, { classId = 'all', searchQuery = '' } = {}) {
    let query = supabase
      .from('assignments')
      .select('id, title, assignment_type, status, deadline, created_at, class:classes!class_id(id,name,teacher_id), attempts:assignment_attempts(count)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (classId !== 'all') query = query.eq('class_id', classId);

    const { data, error } = await query;
    if (error) throw error;

    let records = (data || []).map(item => {
      const deadline = item.deadline ? new Date(item.deadline) : null;
      const isExpired = deadline ? new Date() > deadline : false;
      return {
        id: item.id, title: item.title,
        type: item.assignment_type || 'vocabulary',
        className: item.class?.name || '—', classId: item.class?.id,
        submissionCount: item.attempts?.[0]?.count || 0,
        deadline: deadline ? deadline.toLocaleDateString('vi-VN') : '—',
        status: item.status === 'draft' ? 'draft' : (isExpired ? 'Đã hết hạn' : 'Đang mở'),
        createdAt: new Date(item.created_at).toLocaleDateString('vi-VN'),
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter(r => r.title.toLowerCase().includes(q));
    }
    return records;
  },
};

/**
 * Normalize answer for comparison:
 * - trim + lowercase
 * - collapse multiple spaces
 * - remove trailing punctuation (. , ; : ! ?)
 * - for multiple_choice options like "A. text" → keep as-is (already full text)
 */
function _normalizeAnswer(raw) {
  if (!raw) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '')
    .trim();
}

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Gemini đôi khi bọc JSON bằng markdown hoặc thêm phần mở đầu; chỉ giữ JSON array. */
function parseAiQuestionArray(content) {
  const clean = String(content).replace(/```(?:json)?\s*/gi, '').trim();
  const start = clean.indexOf('[');
  if (start === -1) throw new Error('AI chưa trả về danh sách câu hỏi. Hãy thử soạn lại.');

  const end = clean.lastIndexOf(']');
  const candidate = clean.slice(start, end >= start ? end + 1 : clean.length).replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(candidate);
  } catch {
    // JSON bị cắt giữa chừng → collect tất cả object hoàn chỉnh, không chỉ object cuối
    const matches = [...candidate.matchAll(/\{(?:[^{}]|\{[^{}]*\})*\}/g)].map(m => m[0]);
    if (matches.length === 0) throw new Error('AI trả về dữ liệu không hợp lệ. Hãy thử soạn lại.');
    try {
      return JSON.parse('[' + matches.join(',') + ']');
    } catch {
      throw new Error('AI trả về dữ liệu không hợp lệ. Hãy thử soạn lại.');
    }
  }
}