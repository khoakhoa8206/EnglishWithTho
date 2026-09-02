// src/layouts/TeacherLayout.jsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { TEACHER_ROUTES } from '@/constants/routes';
import { authService } from '@/services/supabase/authService';
import styles from './TeacherLayout.module.css';
import './teacher.css';

const NAV_ITEMS = [
  { to: TEACHER_ROUTES.DASHBOARD, label: 'Dashboard', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/>
      <rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.STUDENTS, label: 'Quản lý học sinh', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6"/>
      <circle cx="17.5" cy="8.5" r="2.4"/><path d="M15 14.2c2.1.3 4.5 1.9 4.5 5.8"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.TUITION, label: 'Học phí', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 14h4M14 14h4"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.ASSIGNMENTS, label: 'Quản lý bài tập', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
      <path d="M9 12h6M9 16h6M9 8h3"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.VOCABULARY, label: 'Bài tập từ vựng', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <path d="M9 7h7M9 11h5"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.VOCABULARY_REVIEW, label: 'Ôn tập từ vựng', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.GRAMMAR, label: 'Ngữ pháp', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.LISTENING, label: 'Listening', icon: (
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  )},
  { to: TEACHER_ROUTES.DOCUMENTS, label: 'Tài liệu', icon: (  // ← THÊM MỤC NÀY
    <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )},
];

export default function TeacherLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await authService.signOut();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.layout}>
      {sidebarOpen && (
        <div className={`${styles.overlay} ${styles.overlayVisible}`} onClick={closeSidebar} />
      )}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          English with Hoagtho
        </div>

        <nav>
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/teacher/dashboard'}
              className={({ isActive }) => isActive ? styles.activeLink : styles.link}
              onClick={closeSidebar}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Đăng xuất
        </button>
      </aside>

      <main className={styles.main}>
        <div className={styles.mobileTopbar}>
          <button className={styles.hamburger} onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className={styles.mobileTitle}>English with Hoagtho</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}