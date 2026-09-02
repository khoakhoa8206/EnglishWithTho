// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/supabase/authService';
import { useAuth } from '@/hooks/useAuth';
import { ROLE } from '@/constants/roles';
import { TEACHER_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFindName = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Vui lòng nhập tên của em.'); return; }
    setError(null);
    setLoading(true);
    try {
      const profile = await authService.findByName(name.trim());
      if (!profile) {
        setError('Không tìm thấy tên này. Kiểm tra lại hoặc liên hệ giáo viên nhé.');
        return;
      }
      login(profile);
      if (profile.role === ROLE.TEACHER) {
        navigate(TEACHER_ROUTES.DASHBOARD, { replace: true });
      } else {
        navigate(STUDENT_ROUTES.HOME, { replace: true });
      }
    } catch {
      setError('Có lỗi xảy ra, thử lại nhé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <div className={styles.mascot}>
            <svg width="110" height="110" viewBox="0 0 120 120" fill="none">
              <ellipse cx="60" cy="100" rx="34" ry="14" fill="rgba(0,0,0,0.06)"/>
              <path d="M40 30 C34 10,30 4,34 2 C40 0,46 14,48 26Z" fill="#FDF6EC"/>
              <path d="M80 30 C86 10,90 4,86 2 C80 0,74 14,72 26Z" fill="#FDF6EC"/>
              <path d="M42 28 C38 14,36 10,38 8 C42 7,46 16,47 26Z" fill="#F3C7C6"/>
              <path d="M78 28 C82 14,84 10,82 8 C78 7,74 16,73 26Z" fill="#F3C7C6"/>
              <ellipse cx="60" cy="66" rx="38" ry="34" fill="#FDF6EC"/>
              <ellipse cx="46" cy="62" rx="4.5" ry="6" fill="#4A3F35"/>
              <ellipse cx="74" cy="62" rx="4.5" ry="6" fill="#4A3F35"/>
              <ellipse cx="60" cy="72" rx="5" ry="3.5" fill="#F3A79E"/>
              <path d="M52 80 Q60 86 68 80" stroke="#4A3F35" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
              <ellipse cx="34" cy="74" rx="6" ry="4" fill="#FBD8D5"/>
              <ellipse cx="86" cy="74" rx="6" ry="4" fill="#FBD8D5"/>
            </svg>
          </div>
          <h1 className={styles.brand}>Hoàng Thơ English</h1>
          <p className={styles.tagline}>Đồng hành cùng em<br/>trên hành trình chinh phục môn Tiếng Anh 🎯</p>
          <div className={styles.dots}>
            <span className={styles.dot} style={{ background: '#FCC88A' }}/>
            <span className={styles.dot} style={{ background: '#E79897' }}/>
            <span className={styles.dot} style={{ background: '#FCAC85' }}/>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <span className={styles.formEmoji}>👋</span>
            <h2 className={styles.formTitle}>Xin chào!</h2>
            <p className={styles.formSub}>Nhập tên của em để bắt đầu học nhé</p>
          </div>
          <form className={styles.form} onSubmit={handleFindName} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Họ và tên</label>
              <input
                id="name"
                className={styles.input}
                type="text"
                placeholder=" "
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={loading}
              />
            </div>
            {error && <div className={styles.error} role="alert">⚠️ {error}</div>}
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? <span className={styles.spinner}/> : 'Tiếp tục →'}
            </button>
          </form>
          <p className={styles.hint}>Không tìm thấy tên? Liên hệ giáo viên để được thêm vào hệ thống.</p>
        </div>
      </div>
    </div>
  );
}