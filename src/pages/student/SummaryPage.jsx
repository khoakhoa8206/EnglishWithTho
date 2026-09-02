// src/pages/student/SummaryPage.jsx
import { useCallback } from 'react';
import { studentSummaryService } from '../../services/studentSummaryService';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import BackButton from '@/components/common/BackButton';

const TYPE_SECTIONS = [
  { key: 'vocabulary', label: 'Từ vựng',  icon: '📚', color: '#1E6B3C', bg: '#EDFBF1' },
  { key: 'grammar',    label: 'Ngữ pháp',  icon: '📖', color: '#0A4C8C', bg: '#D0E8FF' },
  { key: 'listening',  label: 'Listening', icon: '🎧', color: '#856404', bg: '#FFF3CD' },
  { key: 'review',     label: 'Ôn tập',    icon: '🔄', color: '#5B2D8E', bg: '#EDE0FF' },
];

export default function SummaryPage() {
  const { profile } = useAuth();
  const studentId = profile?.id;

  const fetchFn = useCallback(
    () => studentSummaryService.getStudentSummary(studentId),
    [studentId]
  );

  const { data: summary, loading, error, refetch } = useAsyncData(
    fetchFn, [studentId], { skip: !studentId }
  );

  if (!studentId) return <EmptyState icon="🔒" title="Vui lòng đăng nhập" />;
  if (loading) return <Loading fullPage text="Đang tải báo cáo..." />;
  if (error) return (
    <div style={{ padding: '24px 20px' }}>
      <BackButton to="/student/home" />
      <ErrorState message={error} onRetry={refetch} />
    </div>
  );
  if (!summary) return (
    <div style={{ padding: '24px 20px' }}>
      <BackButton to="/student/home" />
      <EmptyState icon="📊" title="Chưa có dữ liệu" message="Hãy hoàn thành bài tập để xem tổng kết." />
    </div>
  );

  const STATS = [
    { icon: '🔄', value: summary.totalAttempts,           label: 'Lượt làm bài',      color: '#566B58' },
    { icon: '✅', value: summary.totalPassed,             label: 'Lần đạt (≥ 80%)',    color: '#2E7D32' },
    { icon: '🎯', value: summary.avgScore > 0 ? `${summary.avgScore}%` : '—', label: 'Điểm trung bình', color: '#D97706' },
    { icon: '📚', value: summary.wordsMastered > 0 ? `~${summary.wordsMastered}` : '—', label: 'Từ vựng đã học', color: '#1E6B3C' },
    { icon: '💡', value: summary.completedGrammarLessons, label: 'Ngữ pháp đạt',       color: '#7C3AED' },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1180, margin: '0 auto' }}>
      <BackButton to="/student/home" />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#332C35', margin: 0 }}>Tổng kết Học tập 📊</h1>
        <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '4px 0 0' }}>Xem chi tiết báo cáo và đánh giá quá trình rèn luyện</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header card */}
        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#332C35', margin: '0 0 4px' }}>{summary.studentName}</h2>
            <p style={{ fontSize: 13, color: '#8A7F72', margin: 0 }}>Báo cáo tích lũy học tập</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FDF6EC', border: '1px solid #EFE6D6', padding: '8px 16px', borderRadius: 999 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#E07B39' }}>{summary.streakCount}</span>
              <span style={{ fontSize: 13, color: '#8A7F72', marginLeft: 4 }}>ngày liên tiếp</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
          {STATS.map(card => (
            <div key={card.label} style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 12, padding: 16, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 11.5, color: '#8A7F72', marginTop: 6 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Phân loại theo type */}
        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4A3F35', margin: '0 0 16px' }}>Phân loại bài tập đã làm</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {TYPE_SECTIONS.map(t => (
              <div key={t.key} style={{ background: t.bg, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: t.color }}>{summary.byType?.[t.key]?.count ?? 0}</div>
                  <div style={{ fontSize: 12, color: t.color, opacity: 0.85 }}>{t.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streak detail */}
        {summary.longestStreak > 0 && (
          <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4A3F35', margin: '0 0 14px' }}>🔥 Streak học tập</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Hiện tại',       value: summary.streakCount },
                { label: 'Kỷ lục',         value: summary.longestStreak },
              ].map(s => (
                <div key={s.label} style={{ background: '#FFF8F0', border: '1px solid #EFE6D6', borderRadius: 12, padding: '12px 20px', textAlign: 'center', flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#E07B39' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#8A7F72' }}>{s.label}</div>
                </div>
              ))}
              {summary.lastActiveDate && (
                <div style={{ background: '#FFF8F0', border: '1px solid #EFE6D6', borderRadius: 12, padding: '12px 20px', textAlign: 'center', flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#8A7F72' }}>
                    {new Date(summary.lastActiveDate).toLocaleDateString('vi-VN')}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A7F72' }}>Hoạt động cuối</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state nếu chưa có dữ liệu */}
        {summary.totalAttempts === 0 && (
          <div style={{ background: '#FDFAF5', border: '1px solid #EFE6D6', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#4A3F35', margin: '0 0 6px' }}>Chưa có bài nào được nộp</p>
            <p style={{ fontSize: 13.5, color: '#8A7F72', margin: 0 }}>Hoàn thành bài tập về nhà để dữ liệu hiển thị ở đây.</p>
          </div>
        )}
      </div>
    </div>
  );
}