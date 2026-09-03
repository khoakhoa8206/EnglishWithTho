// src/services/fileArchiveService.js
import { supabase } from '../lib/supabase';


export const fileArchiveService = {
  async getFiles(teacherId, section) {
    const { data, error } = await supabase
      .from('file_archive')
      .select('id, display_name, title, file_url, file_type, file_size, uploaded_at')
      .eq('teacher_id', teacherId)
      .eq('section', section)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => ({
      id:          item.id,
      displayName: item.display_name,
      title:       item.title,
      fileUrl:     item.file_url,
      fileType:    item.file_type,
      fileSize:    item.file_size,
      uploadedAt:  new Date(item.uploaded_at).toLocaleDateString('vi-VN'),
    }));
  },


  async addFile(teacherId, { section, displayName, title, fileUrl, fileType, fileSize }) {
    const { data, error } = await supabase
      .from('file_archive')
      .insert({
        teacher_id:   teacherId,
        section,
        display_name: displayName,
        title,
        file_url:     fileUrl,
        file_type:    fileType || null,
        file_size:    fileSize || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },


  async deleteFile(fileId) {
    const { error } = await supabase
      .from('file_archive')
      .delete()
      .eq('id', fileId);
    if (error) throw error;
    return true;
  },
};