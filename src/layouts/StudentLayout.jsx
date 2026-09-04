// src/layouts/StudentLayout.jsx
import { Outlet, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { STUDENT_ROUTES } from '@/constants/routes';

// Inject bottom-nav CSS một lần
if (typeof document !== 'undefined' && !document.getElementById('mochi-student-nav-css')) {
  const s = document.createElement('style');
  s.id = 'mochi-student-nav-css';
  s.textContent = `
    .mochi-bottom-nav { display: none; }
    @media (max-width: 768px) {
      .mochi-bottom-nav { display: flex; }
      .mochi-main-content { padding-bottom: 72px; }
      .mochi-desktop-nav { display: none !important; }
      .mochi-brand-full { display: none !important; }
      .mochi-user-name { display: none !important; }
      .mochi-header-inner { padding: 0 16px !important; height: 52px !important; }
      .mochi-user-btn { padding: 5px 10px 5px 5px !important; }
    }
  `;
  document.head.appendChild(s);
}

const NAV_ITEMS = [
  { to: STUDENT_ROUTES.HOME,       icon: '🏠', label: 'Trang chủ' },
  { to: STUDENT_ROUTES.HOMEWORK,   icon: '📚', label: 'Bài tập' },
  { to: STUDENT_ROUTES.VOCABULARY, icon: '📖', label: 'Từ vựng' },
  { to: STUDENT_ROUTES.GRAMMAR,    icon: '✍️', label: 'Ngữ pháp' },
];

// CLEAN-03: Extra links accessible via "Thêm" drawer on mobile
const DRAWER_ITEMS = [
  { to: STUDENT_ROUTES.SUMMARY,   icon: '📊', label: 'Tổng kết' },
  { to: STUDENT_ROUTES.DOCUMENTS, icon: '📄', label: 'Tài liệu' },
  { to: STUDENT_ROUTES.TUITION,   icon: '💳', label: 'Học phí' },
];

export default function StudentLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDrawer, setShowDrawer]     = useState(false); // CLEAN-03: mobile "Thêm" drawer

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'HS';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #FDF6EC)', fontFamily: "'Be Vietnam Pro', sans-serif" }}>

      {/* NAVBAR — desktop */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #EFE6D6',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div className="mochi-header-inner" style={{
          maxWidth: 1180, margin: '0 auto', padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, gap: 16,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Baloo 2', sans-serif", fontSize: 20, fontWeight: 700, color: '#566B58' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#E7EEE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🐰</span>
            <span className="mochi-brand-full">English with Hoagtho</span>
          </div>

          {/* Desktop nav links */}
          <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}
            className="mochi-desktop-nav">
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8,
                    fontSize: 13.5, fontWeight: active ? 700 : 500,
                    color: active ? '#566B58' : '#8A7F72',
                    background: active ? '#E7EEE6' : 'transparent',
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: student info + dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="mochi-user-btn"
              onClick={() => setShowDropdown(v => !v)}
              aria-expanded={showDropdown}
              aria-label="Menu người dùng"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 16px 6px 6px', borderRadius: 999,
                background: '#E7EEE6', border: '1.5px solid #768E78',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#768E78', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15,
              }}>
                {initials}
              </div>
              <div className="mochi-user-name" style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#566B58', lineHeight: 1.2 }}>
                  {profile?.full_name || 'Học sinh'}
                </div>
                <div style={{ fontSize: 11, color: '#8A7F72' }}>Học sinh</div>
              </div>
              <span style={{ fontSize: 10, color: '#8A7F72', marginLeft: 2 }}>▼</span>
            </button>

            {showDropdown && (
              <>
                {/* Overlay để đóng dropdown */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  onClick={() => setShowDropdown(false)}
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#fff', border: '1px solid #EFE6D6', borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 160, zIndex: 100,
                  overflow: 'hidden',
                }}>
                  <Link
                    to={STUDENT_ROUTES.TUITION}
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: 'block', padding: '12px 18px',
                      fontSize: 14, fontWeight: 600, color: '#4A3F35',
                      borderBottom: '1px solid #EFE6D6',
                      textDecoration: 'none',
                    }}
                  >
                    💳 Học phí
                  </Link>
                  <Link
                    to={STUDENT_ROUTES.DOCUMENTS}
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: 'block', padding: '12px 18px',
                      fontSize: 14, fontWeight: 600, color: '#4A3F35',
                      borderBottom: '1px solid #EFE6D6',
                      textDecoration: 'none',
                    }}
                  >
                    📄 Tài liệu
                  </Link>
                   <Link
                      to={STUDENT_ROUTES.PROFILE}
                      onClick={() => setShowDropdown(false)}
                      style={{
                        display: 'block', padding: '12px 18px',
                        fontSize: 14, fontWeight: 600, color: '#4A3F35',
                        borderBottom: '1px solid #EFE6D6',
                        textDecoration: 'none',
                      }}
                    >
                      👤 Hồ sơ
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'block', width: '100%', padding: '12px 18px',
                      fontSize: 14, fontWeight: 600, color: '#A94E4E',
                      background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    ↩ Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="mochi-main-content">
        <Outlet />
      </div>

      {/* BOTTOM NAV — mobile only */}
      <nav
        className="mochi-bottom-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#fff', borderTop: '1px solid #EFE6D6',
          height: 64, alignItems: 'stretch', justifyContent: 'space-around',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        }}
        aria-label="Điều hướng chính"
      >
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setShowDrawer(false)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                flex: 1, gap: 2, textDecoration: 'none',
                color: active ? '#566B58' : '#B0A8A0',
                fontSize: 10, fontWeight: active ? 700 : 500,
                borderTop: active ? '2px solid #566B58' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* CLEAN-03: "Thêm" button mở drawer chứa Tổng kết / Tài liệu / Học phí */}
        <button
          onClick={() => setShowDrawer(d => !d)}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flex: 1, gap: 2, background: 'none', border: 'none', cursor: 'pointer',
            color: showDrawer ? '#566B58' : '#B0A8A0',
            fontSize: 10, fontWeight: showDrawer ? 700 : 500,
            borderTop: showDrawer ? '2px solid #566B58' : '2px solid transparent',
            padding: 0,
          }}
          aria-expanded={showDrawer}
          aria-label="Xem thêm"
        >
          <span style={{ fontSize: 20 }}>☰</span>
          Thêm
        </button>
      </nav>

      {/* CLEAN-03: Drawer panel — hiện khi "Thêm" được nhấn */}
      {showDrawer && (
        <div
          style={{
            position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 49,
            background: '#fff', borderTop: '1px solid #EFE6D6',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
            display: 'flex', flexDirection: 'column',
          }}
          className="mochi-bottom-nav"
        >
          {DRAWER_ITEMS.map(item => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setShowDrawer(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 24px', textDecoration: 'none',
                  color: active ? '#566B58' : '#5C5042',
                  fontWeight: active ? 700 : 500, fontSize: 15,
                  borderLeft: active ? '3px solid #566B58' : '3px solid transparent',
                  background: active ? '#F4F8F4' : 'transparent',
                }}
              >
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}