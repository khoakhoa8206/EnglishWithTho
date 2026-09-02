// src/services/supabase/authService.js
import { supabase } from '@/lib/supabase';

export const authService = {
  // Tìm profile theo tên — không phân biệt hoa/thường, trim khoảng trắng
  async findByName(fullName) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, start_date, monthly_fee, created_at')
      .ilike('full_name', fullName.trim())
      .maybeSingle();
    if (error) return null;
    return data;
  },

  // Lưu session vào localStorage — chỉ id, full_name, role
  saveSession(profile) {
    const session = {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
    };
    localStorage.setItem('mochi_user', JSON.stringify(session));
  },

  // Lấy session hiện tại
  getSession() {
    const raw = localStorage.getItem('mochi_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  // Đăng xuất
  signOut() {
    localStorage.removeItem('mochi_user');
  },
};