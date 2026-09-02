// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { authService } from '@/services/supabase/authService';

export function useAuth() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Đọc session lần đầu
    const session = authService.getSession();
    setProfile(session);
    setLoading(false);

    // ✅ FIX Bug #6: lắng nghe thay đổi localStorage từ tab khác
    // (VD: user logout ở tab khác → tab này tự redirect về login)
    function handleStorageChange(e) {
      if (e.key === 'mochi_user') {
        const updated = authService.getSession();
        setProfile(updated);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (profile) => {
    authService.saveSession(profile);
    setProfile(profile);
  };

  const logout = () => {
    authService.signOut();
    setProfile(null);
  };

  return { profile, loading, login, logout };
}