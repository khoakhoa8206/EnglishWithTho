// src/pages/student/ProfilePage.jsx
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useStreak } from '@/hooks/useStreak';

export default function ProfilePage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { streak, longestStreak } = useStreak(profile?.id);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const startDate = profile?.start_date
    ? new Date(profile.start_date).toLocaleDateString('vi-VN')
    : '—';

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'HS';

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 20px' }}>
      {/* Avatar + tên */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #EFE6D6',
        padding: 32, textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#768E78', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 28, margin: '0 auto 16px',
        }}>
          {initials}
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#4A3F35' }}>
          {profile?.full_name || 'Học sinh'}
        </h2>
        <p style={{ margin: '4px 0 0', color: '#8A7F72', fontSize: 14 }}>
          Học sinh
        </p>
      </div>

      {/* Thông tin */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #EFE6D6',
        padding: 24, marginBottom: 20,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#566B58' }}>
          Thông tin tài khoản
        </h3>
        <InfoRow icon="👤" label="Họ và tên" value={profile?.full_name || '—'} />
        <InfoRow icon="📅" label="Ngày bắt đầu học" value={startDate} />
        <InfoRow icon="🔥" label="Streak hiện tại" value={`${streak ?? 0} ngày`} />
        <InfoRow icon="🏆" label="Streak dài nhất" value={`${longestStreak ?? 0} ngày`} />
        {profile?.class_name && (
          <InfoRow icon="🏫" label="Lớp học" value={profile.class_name} />
        )}
      </div>

      {/* Đăng xuất */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: '14px 0',
          background: '#FFF0F0', border: '1.5px solid #E8AAAA',
          borderRadius: 12, color: '#A94E4E',
          fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}
      >
        ↩ Đăng xuất
      </button>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid #F5EFE6',
    }}>
      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, color: '#8A7F72' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#4A3F35' }}>{value}</span>
    </div>
  );
}