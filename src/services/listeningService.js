// src/services/listeningService.js
import { supabase } from '../lib/supabase';

export const listeningService = {
  async getListeningLessons(teacherId) {
    const { data, error } = await supabase
      .from('listening_materials')
      .select('id, title, audio_url, script, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => ({
      id:        item.id,
      title:     item.title,
      audioUrl:  item.audio_url || '',
      hasScript: !!item.script,
      createdAt: new Date(item.created_at).toLocaleDateString('vi-VN'),
    }));
  },

  async createListeningLesson(teacherId, { title, audioUrl, script }) {
    // Bước 1: tạo listening_material
    const { data: material, error: matErr } = await supabase
      .from('listening_materials')
      .insert([{ teacher_id: teacherId, title, audio_url: audioUrl, script }])
      .select()
      .single();
    if (matErr) throw matErr;

    return material;
  },

  async deleteListeningLesson(materialId) {
    const { error } = await supabase
      .from('listening_materials')
      .delete()
      .eq('id', materialId);
    if (error) throw error;
    return true;
  },

  async getFullById(id) {
    const { data, error } = await supabase
      .from('listening_materials')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getAssignmentQuestions(materialId, teacherId) {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, title, assignment_questions(*)')
      .eq('listening_material_id', materialId)
      .eq('teacher_id', teacherId);
    if (error) throw error;
    return (data || []).flatMap(a =>
      (a.assignment_questions || []).map(q => ({ ...q, assignmentTitle: a.title }))
    );
  },

  async uploadAudio(teacherId, file) {
    const ext  = file.name.split('.').pop();
    const path = `listening/${teacherId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('materials').upload(path, file);
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('materials').getPublicUrl(path);
    return urlData.publicUrl;
  },

  // BUG FIX: hàm lưu questions vào assignment hiện có (dùng từ ListeningDetail)
  async saveGeneratedQuestions(materialId, teacherId, title, questions, classId, status = 'published') {
    // Kiểm tra đã có assignment chưa
    const { data: existing } = await supabase
      .from('assignments')
      .select('id')
      .eq('listening_material_id', materialId)
      .eq('teacher_id', teacherId)
      .single();

    let assignmentId;
    if (existing?.id) {
      assignmentId = existing.id;
      // Xóa câu hỏi cũ trước khi insert mới
      await supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId);
      // Update status & classId cho assignment cũ
      await supabase.from('assignments').update({ class_id: classId, status }).eq('id', assignmentId);
    } else {
      const { data: newAssignment, error: aErr } = await supabase
        .from('assignments')
        .insert([{
          teacher_id:            teacherId,
          class_id:              classId,
          title:                 title,
          assignment_type:       'listening',
          listening_material_id: materialId,
          status:                status,
        }])
        .select()
        .single();
      if (aErr) throw aErr;
      assignmentId = newAssignment.id;
    }

    const payload = questions.map((q, idx) => ({
      assignment_id:  assignmentId,
      question:       q.question,
      question_type:  q.question_type || 'multiple_choice',
      options:        JSON.stringify(q.options || []),
      correct:        q.correct,
      sort_order:     idx,
    }));
    const { error: qErr } = await supabase
      .from('assignment_questions')
      .insert(payload);
    if (qErr) throw qErr;
    return assignmentId;
  },
    // ─── Mammoth Docx: lưu gap-fill questions từ parse không qua AI ──────────
  // exercises: [{number, type, questions: [{number, context, correct_answer}]}]
  async saveListeningQuestionsFromDocx(materialId, teacherId, title, exercises, classId) {
    // Tìm hoặc tạo assignment
    const { data: existing } = await supabase
      .from('assignments')
      .select('id')
      .eq('listening_material_id', materialId)
      .eq('teacher_id', teacherId)
      .maybeSingle();

    let assignmentId;
    if (existing?.id) {
      assignmentId = existing.id;
      await supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId);
    } else {
      const { data: newAss, error: aErr } = await supabase
        .from('assignments')
        .insert([{
          teacher_id:            teacherId,
          class_id:              classId,
          title,
          assignment_type:       'listening',
          listening_material_id: materialId,
        }])
        .select()
        .single();
      if (aErr) throw aErr;
      assignmentId = newAss.id;
    }

    // Flatten tất cả câu hỏi
    // QUAN TRỌNG: sort_order = q.number (số câu thật trong script, vd 1-50)
    // để component biết câu nào map vào vị trí (N)____ nào trong script
    const payload = [];
    for (const ex of exercises) {
      for (const q of ex.questions) {
        payload.push({
          assignment_id:  assignmentId,
          question:       q.context,                      // context làm question text
          question_type:  'fill_in_blank',
          options:        JSON.stringify([]),
          correct:        q.correct_answer || '',
          sort_order:     q.number,                       // FIX: dùng số câu thật
        });
      }
    }

    const { error: qErr } = await supabase.from('assignment_questions').insert(payload);
    if (qErr) throw qErr;
    return assignmentId;
  },
};