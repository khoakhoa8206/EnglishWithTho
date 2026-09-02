// src/pages/student/HomeworkPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentHomeworkService } from '../../services/studentHomeworkService';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import BackButton from '@/components/common/BackButton';

export default function HomeworkPage() {
  const { profile } = useAuth();
  const studentId = profile?.id;

  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery]   = useState('');

  // Include searchQuery in deps so service-side filter runs too
  const fetchFn = useCallback(
    () => studentHomeworkService.getHomeworkList(studentId, { status: statusFilter, searchQuery }),
    [studentId, statusFilter, searchQuery]
  );

  const { data: homeworkList = [], loading, error, refetch } = useAsyncData(
    fetchFn,
    [studentId, statusFilter, searchQuery],
    { skip: !studentId, initial: [] }
  );

  if (!studentId) {
    return <EmptyState icon="🔒" title="Vui lòng đăng nhập" message="Bạn cần đăng nhập để xem bài tập." />;
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1180, margin: '0 auto' }}>
      <BackButton to="/student/home" />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#332C35', margin: 0 }}>Bài tập về nhà 📚</h1>
        <p style={{ fontSize: 13.5, color: '#8E8492', margin: '4px 0 0' }}>
          Danh sách các bài tập được giao từ giáo viên bộ môn
        </p>
      </div>

      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #EFE6D6',
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#F5EDE0', padding: 4, borderRadius: 10, border: '1px solid #EFE6D6' }}>
            {[
              { value: 'pending',   label: 'Cần làm' },
              { value: 'completed', label: 'Đã hoàn thành' },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                aria-pressed={statusFilter === s.value}
                style={{
                  padding: '6px 14px', border: 'none', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  background: statusFilter === s.value ? '#566B58' : 'transparent',
                  color: statusFilter === s.value ? '#fff' : '#8A7F72',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên bài tập..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm bài tập"
            style={{
              flex: 1, minWidth: 180, padding: '8px 14px', fontSize: 13.5,
              borderRadius: 10, border: '1px solid #EFE6D6', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <Loading text="Đang tải danh sách bài tập..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : homeworkList.length === 0 ? (
          <EmptyState
            icon={statusFilter === 'pending' ? '🎉' : '📭'}
            title={statusFilter === 'pending' ? 'Bạn đã hoàn thành tất cả bài tập!' : 'Chưa có bài tập nào đã hoàn thành.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {homeworkList.map((item) => (
              <HomeworkCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HomeworkCard({ item }) {
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ borderRadius: 12, border: '1px solid #EFE6D6', background: '#FDFAF5', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: 16, flexWrap: 'wrap', gap: 12,
      }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Badge variant="info" size="sm">{item.assignment_type || 'Bài tập'}</Badge>
            <span style={{ fontSize: 12, color: '#8A7F72' }}>Lớp: {item.className}</span>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#332C35', margin: 0, wordBreak: 'break-word' }}>
            {item.title}
          </h3>
          {!item.isSubmitted && (
            <p style={{ fontSize: 12, color: '#8A7F72', margin: '4px 0 0' }}>Hạn: {item.deadline}</p>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          {item.isSubmitted ? (
            <>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: item.passed ? '#2E9767' : '#C24949', display: 'block' }}>
                  {item.bestScore !== null ? `${item.bestScore}%` : '—'}
                </span>
                <span style={{ fontSize: 11, color: '#8A7F72' }}>Lần {item.attemptCount}</span>
              </div>
              <Badge variant={item.passed ? 'success' : 'danger'} size="sm">
                {item.passed ? '✓ Đạt' : '✗ Chưa đạt'}
              </Badge>
              <button
                onClick={() => setShowHistory(v => !v)}
                aria-expanded={showHistory}
                style={{
                  padding: '5px 12px', background: 'transparent',
                  border: '1px solid #EFE6D6', borderRadius: 8,
                  fontSize: 12, color: '#8A7F72', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {showHistory ? 'Ẩn' : 'Lịch sử'}
              </button>
              <button
                onClick={() => navigate(`/student/assignment/${item.id}`)}
                style={{
                  padding: '6px 14px',
                  background: 'linear-gradient(135deg, #566B58, #768E78)',
                  border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                🔄 Làm lại
              </button>
            </>
          ) : (
            <>
              <Badge variant="warning" size="sm">Chưa làm</Badge>
              <button
                onClick={() => navigate(`/student/assignment/${item.id}`)}
                style={{
                  padding: '7px 16px',
                  background: 'linear-gradient(135deg, #566B58, #768E78)',
                  border: 'none', borderRadius: 8,
                  fontSize: 12.5, fontWeight: 700, color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(86,107,88,0.25)',
                }}
              >
                ▶ Làm bài
              </button>
            </>
          )}
        </div>
      </div>

      {/* History panel */}
      {showHistory && item.attempts?.length > 0 && (
        <div style={{ borderTop: '1px solid #EFE6D6', padding: '12px 16px', background: '#fff' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F72', margin: '0 0 8px' }}>Lịch sử làm bài:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {item.attempts.map((a) => (
              <div key={a.id} style={{
                display: 'flex', gap: 12, flexWrap: 'wrap',
                fontSize: 12.5, color: '#4A3F35',
                padding: '6px 10px', background: '#FDFAF5', borderRadius: 8,
              }}>
                <span style={{ fontWeight: 700 }}>Lần {a.attempt_number}</span>
                <span>Điểm: <b style={{ color: a.passed ? '#2E9767' : '#C24949' }}>{a.score}%</b></span>
                <span>Đúng: {a.correct_count}/{a.total_questions}</span>
                <span>
                  TG: {a.duration_seconds
                    ? `${Math.floor(a.duration_seconds / 60)}p${a.duration_seconds % 60}s`
                    : '—'}
                </span>
                <span style={{ color: '#8A7F72', marginLeft: 'auto' }}>
                  {a.completed_at ? new Date(a.completed_at).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}