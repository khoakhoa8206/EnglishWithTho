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
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const today = localDate.toISOString().split('T')[0];
    const { error } = await supabase.rpc('update_streak', { p_student_id: studentId, p_date: today });
    if (error) throw error;
    // Ghi log ngày hoạt động để giáo viên xem được trên trang Quản lý Streak
    await supabase
      .from('streak_activity_log')
      .upsert(
        { student_id: studentId, activity_date: today, source: 'system' },
        { onConflict: 'student_id,activity_date' }
      );
  },

  // Lấy danh sách ngày có streak của một học sinh trong khoảng thời gian
  async getStreakDays(studentId, fromDate, toDate) {
    const { data, error } = await supabase
      .from('streak_activity_log')
      .select('activity_date')
      .eq('student_id', studentId)
      .gte('activity_date', fromDate)
      .lte('activity_date', toDate);
    if (error) throw error;
    return (data || []).map(r => r.activity_date); // ['2025-09-01', '2025-09-03', ...]
  },

  // Giáo viên ghi thêm ngày hoạt động thủ công (khôi phục streak)
  // Sau khi insert ngày → recalculate current_streak và longest_streak
  async manualSetStreakDays(studentId, datesToAdd) {
    // 1. Upsert từng ngày vào streak_activity_log
    const rows = datesToAdd.map(d => ({
      student_id: studentId,
      activity_date: d,
      source: 'manual_teacher',
    }));
    const { error: insertError } = await supabase
      .from('streak_activity_log')
      .upsert(rows, { onConflict: 'student_id,activity_date' });
    if (insertError) throw insertError;

    // 2. Lấy toàn bộ ngày đã có của học sinh để tính lại streak
    const { data: allDays, error: fetchError } = await supabase
      .from('streak_activity_log')
      .select('activity_date')
      .eq('student_id', studentId)
      .order('activity_date', { ascending: true });
    if (fetchError) throw fetchError;

    const sortedDates = (allDays || []).map(r => r.activity_date).sort();

    // 3. Tính current_streak (đếm từ hôm nay lùi dần liên tiếp)
    const todayStr = new Date().toISOString().split('T')[0];
    let currentStreak = 0;
    let checkDate = new Date(todayStr);
    while (true) {
      const ds = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(ds)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 4. Tính longest_streak (chuỗi dài nhất bất kỳ)
    let longestStreak = 0;
    let runLength = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        runLength = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.round((curr - prev) / 86400000);
        runLength = diffDays === 1 ? runLength + 1 : 1;
      }
      if (runLength > longestStreak) longestStreak = runLength;
    }

    // 5. Upsert vào bảng streaks
    const lastActiveDate = sortedDates[sortedDates.length - 1] || todayStr;
    const { error: upsertError } = await supabase
      .from('streaks')
      .upsert(
        {
          student_id: studentId,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_active_date: lastActiveDate,
        },
        { onConflict: 'student_id' }
      );
    if (upsertError) throw upsertError;

    return { currentStreak, longestStreak };
  },

  // Xóa ngày hoạt động (giáo viên bỏ tick)
  async removeStreakDay(studentId, date) {
    const { error } = await supabase
      .from('streak_activity_log')
      .delete()
      .eq('student_id', studentId)
      .eq('activity_date', date);
    if (error) throw error;
  },
};
