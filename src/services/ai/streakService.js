// src/services/ai/streakService.js
import { supabase } from '@/lib/supabase';

export const streakService = {
  async getStreak(studentId) {
    const { data, error } = await supabase
      .from('streaks').select('*').eq('student_id', studentId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ?? { current_streak: 0, longest_streak: 0, last_active_date: null };
  },
  async recordActivity(studentId) {
    // Dùng local date (múi giờ VN UTC+7) thay vì UTC để tránh streak bị lệch ngày
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const today = localDate.toISOString().split('T')[0];
    const { error } = await supabase.rpc('update_streak', { p_student_id: studentId, p_date: today });
    if (error) throw error;
  },
};
