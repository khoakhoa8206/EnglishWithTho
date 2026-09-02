// src/pages/student/HomePage.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentHomeService } from '../../services/studentHomeService';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import { STUDENT_ROUTES } from '@/constants/routes';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
const GRID_STYLE = `
  @media (max-width: 540px)  { .mochi-home-grid { grid-template-columns: 1fr !important; } }
  @media (min-width: 541px) and (max-width: 860px) { .mochi-home-grid { grid-template-columns: 1fr 1fr !important; } }
`;

if (typeof document !== 'undefined' && !document.getElementById('mochi-home-grid-css')) {
  const s = document.createElement('style');
  s.id = 'mochi-home-grid-css';
  s.textContent = GRID_STYLE;
  document.head.appendChild(s);
}

export default function HomePage() {
  const { profile } = useAuth();
  const studentId = profile?.id;
  const navigate = useNavigate();

  const fetchFn = useCallback(
    () => studentHomeService.getStudentDashboard(studentId),
    [studentId]
  );

  const { data: dashboardData, loading, error, refetch } = useAsyncData(
    fetchFn,
    [studentId],
    { skip: !studentId }
  );

  const streak = dashboardData?.streakCount || 0;
  // Dùng local day-of-week để highlight đúng ngày trong tuần (tránh lệch múi giờ)
  const localDay = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
  // DAYS = ['T2','T3','T4','T5','T6','T7','CN'] → Mon=0, Tue=1, ..., Sun=6
  const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const todayIdx = dayMap[localDay] ?? (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const streakStart = Math.max(0, todayIdx - streak + 1);

  if (loading) return <Loading fullPage text="Đang tải trang chủ..." />;

  if (error) {
    return (
      <div style={{ padding: '80px 20px' }}>
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div style={{ background: '#FDF6EC', minHeight: '100vh' }}>

      {/* STREAK */}
      <section style={{
        background: 'linear-gradient(180deg, #E7EEE6 0%, #FDF6EC 100%)',
        borderBottom: '1px solid #EFE6D6',
        padding: '34px 0 30px',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
          <div style={{
            background: '#768E78', borderRadius: 24,
            padding: '28px 24px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            gap: 16, overflow: 'hidden',
            boxShadow: '0 10px 26px rgba(86,107,88,0.28)',
            flexWrap: 'wrap',
            position: 'relative',
          }}>
            {/* ── Lửa bên TRÁI ── */}
            <FlameDecor streak={streak} />

            {/* ── Nội dung giữa ── */}
            <div style={{ color: '#fff', zIndex: 2, flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#DCEBDC', marginBottom: 6 }}>
                Chuỗi học tập
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
                  {streak}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, opacity: .92 }}>ngày liên tiếp</span>
              </div>
              <p style={{ marginTop: 10, fontSize: 14, color: '#EAF2EA', lineHeight: 1.55 }}>
                {streak >= 3
                  ? `Tuyệt vời! Em đã học liên tục ${streak} ngày rồi.`
                  : 'Hãy bắt đầu học hôm nay để xây dựng thói quen nhé!'}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {DAYS.map((d, i) => (
                  <div key={d} style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: (i >= streakStart && i <= todayIdx) ? '#FCC88A' : 'rgba(255,255,255,0.18)',
                    color: (i >= streakStart && i <= todayIdx) ? '#A9701C' : '#fff',
                    outline: i === todayIdx ? '2px solid #fff' : 'none',
                    outlineOffset: 2,
                  }}>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Con rắn bên PHẢI ── */}
            <SnakeDecor streak={streak} />
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#4A3F35', margin: '0 0 4px' }}>
            Không gian học của em
          </h2>
          <p style={{ fontSize: 14, color: '#8A7F72', margin: 0 }}>Chọn một mục để bắt đầu buổi học hôm nay.</p>
        </div>

        <div
          className="mochi-home-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
        >
          <NavCard color="#F3F1E6" borderColor="#C6C09C" textColor="#8C8560"
            icon="📘" title="Bài tập về nhà"
            desc="Xem và nộp bài tập được giao trong tuần."
            link="Vào làm bài →"
            onClick={() => navigate(STUDENT_ROUTES.HOMEWORK)}
          />
          <NavCard color="#FAF4E7" borderColor="#EBDEC0" textColor="#9C7E42"
            icon="📚" title="Từ vựng theo chủ đề"
            desc="Học và ôn từ vựng theo từng chủ đề cụ thể."
            link="Ôn từ vựng →"
            onClick={() => navigate(STUDENT_ROUTES.VOCABULARY)}
          />
          <NavCard color="#FBEBEB" borderColor="#E79897" textColor="#A94E4E"
            icon="✍️" title="Ngữ pháp"
            desc="Bài giảng và bài luyện tập các điểm ngữ pháp trọng tâm."
            link="Luyện ngữ pháp →"
            onClick={() => navigate(STUDENT_ROUTES.GRAMMAR)}
          />

          {/* Tổng kết — span 2 cols */}
          <div
            onClick={() => navigate(STUDENT_ROUTES.SUMMARY)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(STUDENT_ROUTES.SUMMARY)}
            style={{
              gridColumn: 'span 2',
              background: '#FEF0E7', border: '1px solid #FCAC85',
              borderRadius: 16, padding: '22px',
              cursor: 'pointer',
              transition: 'transform .18s, box-shadow .18s',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: 160,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(118,142,120,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>📊</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#B45B2E', margin: '0 0 6px' }}>Tổng kết tiến độ</h3>
                <p style={{ fontSize: 13.5, color: '#B45B2E', opacity: .88, margin: 0, lineHeight: 1.5 }}>
                  Theo dõi chuỗi học tập và bài tập về nhà trong một chỗ.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <b style={{ display: 'block', fontSize: 22, color: '#B45B2E' }}>{streak}</b>
                  <span style={{ fontSize: 12, color: '#B45B2E', opacity: .85 }}>ngày chuỗi</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <b style={{ display: 'block', fontSize: 22, color: '#B45B2E' }}>
                    {dashboardData?.pendingAssignments?.length ?? '—'}
                  </b>
                  <span style={{ fontSize: 12, color: '#B45B2E', opacity: .85 }}>BTVN chờ nộp</span>
                </div>
              </div>
            </div>
            <span style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: '#B45B2E' }}>
              Xem tổng kết →
            </span>
          </div>

          <NavCard color="#FEF3E4" borderColor="#FCC88A" textColor="#A9701C"
            icon="⭐" title="Tài liệu"
            desc="Tài liệu bổ sung và mẹo học tập từ giáo viên."
            link="Khám phá →"
            onClick={() => navigate(STUDENT_ROUTES.DOCUMENTS)}
          />
        </div>

        {/* Pending assignments */}
        {(dashboardData?.pendingAssignments?.length > 0) && (
          <div style={{ marginTop: 28, background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4A3F35', margin: '0 0 14px' }}>
              Bài tập cần nộp 📝
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dashboardData.pendingAssignments.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', borderRadius: 10,
                  border: '1px solid #EFE6D6', background: '#FDFAF5',
                  flexWrap: 'wrap', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#E7EEE6', color: '#566B58', padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: '#4A3F35' }}>{item.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#8A7F72' }}>Hạn: {item.dueDate}</span>
                    <button
                      onClick={() => navigate(`/student/assignment/${item.id}`)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#768E78', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Làm bài
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavCard({ color, borderColor, textColor, icon, title, desc, link, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: color, border: `1px solid ${borderColor}`,
        borderRadius: 16, padding: '20px',
        minHeight: 160, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        transform: hovered ? 'translateY(-3px)' : '',
        boxShadow: hovered ? '0 6px 18px rgba(118,142,120,0.14)' : '',
        transition: 'transform .18s, box-shadow .18s',
      }}
    >
      <div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>{icon}</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: textColor, margin: '0 0 6px' }}>{title}</h3>
        <p style={{ fontSize: 13, color: textColor, opacity: .88, margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <span style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: textColor }}>{link}</span>
    </div>
  );
}

/** ── FlameDecor (bên TRÁI) — SVG campfire logs + CSS flame/smoke ── */
/** ── FlameDecor (bên TRÁI) — ảnh lửa cute / tro buồn với hiệu ứng lúc lắc ── */
function FlameDecor({ streak }) {
  const isActive = streak > 0;
  return (
    <div style={{
      flexShrink: 0,
      width: 120,
      height: 155,
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      marginLeft: -4,
    }}>
      <style>{`
        @keyframes flameBob {
          0%,100% { transform: translateY(0px) rotate(-3deg) scale(1.00); }
          30%      { transform: translateY(-8px) rotate(3deg) scale(1.04); }
          60%      { transform: translateY(-4px) rotate(-2deg) scale(1.02); }
        }
        @keyframes flameGlowActive {
          0%,100% { opacity: 0.55; transform: translateX(-50%) scaleX(1); }
          50%      { opacity: 0.85; transform: translateX(-50%) scaleX(1.15); }
        }
        @keyframes ashDrift {
          0%,100% { transform: translateY(0px) rotate(-1deg); opacity: 0.6; }
          50%      { transform: translateY(-4px) rotate(1deg); opacity: 0.9; }
        }
        @keyframes ashGlow {
          0%,100% { opacity: 0.3; transform: translateX(-50%) scaleX(1); }
          50%      { opacity: 0.15; transform: translateX(-50%) scaleX(0.7); }
        }
      `}</style>

      <img
        src={isActive ? '/images/happy.png' : '/images/sad.png'}
        alt={isActive ? 'Ngọn lửa học tập' : 'Lửa đã tắt'}
        style={{
          width: isActive ? 140 : 155,
          height: isActive ? 140 : 155,
          objectFit: 'contain',
          position: 'relative',
          zIndex: 2,
          filter: isActive
            ? 'drop-shadow(0 0 12px rgba(255,100,0,0.65)) drop-shadow(0 6px 10px rgba(0,0,0,0.20))'
            : 'drop-shadow(0 0 5px rgba(80,80,80,0.30)) drop-shadow(0 5px 10px rgba(0,0,0,0.15)) grayscale(0.2)',
          animation: isActive
            ? 'flameBob 2s ease-in-out infinite'
            : 'ashDrift 3s ease-in-out infinite',
          transformOrigin: 'bottom center',
        }}
      />

      {/* Glow dưới chân */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        width: 90,
        height: 18,
        background: isActive
          ? 'radial-gradient(ellipse at 50% 100%, rgba(255,110,0,0.40) 0%, transparent 70%)'
          : 'radial-gradient(ellipse at 50% 100%, rgba(100,100,100,0.25) 0%, transparent 70%)',
        filter: 'blur(5px)',
        animation: isActive
          ? 'flameGlowActive 2s ease-in-out infinite'
          : 'ashGlow 3s ease-in-out infinite',
      }} />
    </div>
  );
}

/** ── SnakeDecor (bên PHẢI) ── */
function SnakeDecor({ streak }) {
  const isActive = streak > 0;
  return (
    <div style={{
      flexShrink: 0,
      width: 150,
      height: 155,
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      marginRight: -8,
    }}>
      <style>{`
        @keyframes snakeBob {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50%      { transform: translateY(-7px) rotate(2deg); }
        }
        @keyframes snakeGlowPulse {
          0%,100% { opacity: 0.32; transform: translateX(-50%) scaleX(1); }
          50%      { opacity: 0.14; transform: translateX(-50%) scaleX(0.75); }
        }
      `}</style>

      {/* ── Ảnh rắn to, fit khung ── */}
      <img
        src={isActive ? '/images/love.png' : '/images/angry.png'}
        alt={isActive ? 'Rắn đang học' : 'Rắn nghỉ'}
        style={{
          width: 188,
          height: 188,
          objectFit: 'contain',
          position: 'relative',
          zIndex: 2,
          filter: isActive
            ? 'drop-shadow(0 0 10px rgba(255,140,0,0.55)) drop-shadow(0 5px 8px rgba(0,0,0,0.22))'
            : 'drop-shadow(0 0 4px rgba(80,40,0,0.28)) drop-shadow(0 5px 10px rgba(0,0,0,0.18))',
          animation: isActive ? 'snakeBob 2.2s ease-in-out infinite' : 'none',
          transformOrigin: 'bottom center',
        }}
      />

      {/* Glow dưới chân (chỉ khi streak active) */}
      {isActive && (
        <div style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 100, height: 16,
          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,110,0,0.32) 0%, transparent 70%)',
          filter: 'blur(5px)',
          animation: 'snakeGlowPulse 2s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}