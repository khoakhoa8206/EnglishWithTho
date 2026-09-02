// src/services/teacherDocumentService.js
import { supabase } from '../lib/supabase';

export const teacherDocumentService = {
  async getDocuments(teacherId) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, file_url, file_type, file_size, created_at, class:classes!class_id(id, name)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => ({
      id:        item.id,
      title:     item.title,
      fileUrl:   item.file_url,
      fileType:  item.file_type,
      fileSize:  item.file_size,
      classId:   item.class?.id || null,
      className: item.class?.name || '—',
      createdAt: new Date(item.created_at).toLocaleDateString('vi-VN'),
    }));
  },

  async uploadDocument(teacherId, { title, file, classId }) {
    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `documents/${teacherId}/${Date.now()}_${file.name}`;

    const { error: upErr } = await supabase.storage
      .from('materials')
      .upload(path, file);
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage
      .from('materials')
      .getPublicUrl(path);

    // ✅ thêm class_id và file_size
    const { data, error } = await supabase
      .from('documents')
      .insert({
        teacher_id: teacherId,
        title:      title || file.name,
        file_url:   urlData.publicUrl,
        file_type:  ext,
        file_size:  file.size,
        class_id:   classId || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteDocument(documentId, fileUrl) {
    if (fileUrl) {
      const path = fileUrl.split('/materials/')[1];
      if (path) await supabase.storage.from('materials').remove([path]);
    }
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    if (error) throw error;
    return true;
  },
};