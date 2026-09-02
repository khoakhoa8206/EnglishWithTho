// src/services/studentDocumentService.js
import { supabase } from '../lib/supabase';

export const studentDocumentService = {
  async getStudentDocuments(studentId, { searchQuery = '' } = {}) {
    if (!studentId) throw new Error('Thiếu studentId');

    // 1. Lấy danh sách lớp học mà học sinh tham gia
    const { data: classMembers, error: classError } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentId);

    if (classError) throw classError;
    const classIds = (classMembers || []).map((c) => c.class_id);
    // 2. Lấy tài liệu: tài liệu chung (class_id = null) + tài liệu của các lớp học sinh tham gia
    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        file_url,
        file_type,
        file_size,
        created_at,
        class:classes!class_id ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (classIds.length > 0) {
      // Lấy tài liệu chung (null) HOẶC thuộc lớp của học sinh
      query = query.or(`class_id.is.null,class_id.in.(${classIds.join(',')})`);
    } else {
      // Học sinh chưa thuộc lớp nào → chỉ lấy tài liệu chung
      query = query.is('class_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;

    let records = (data || []).map((item) => ({
      id: item.id,
      title: item.title,
      fileUrl: item.file_url || '#',
      fileType: item.file_type || 'PDF',
      fileSize: item.file_size || null,
      className: item.class?.name || 'Chung',
      createdAt: new Date(item.created_at).toLocaleDateString('vi-VN'),
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter((r) => r.title.toLowerCase().includes(q));
    }

    return records;
  },
};