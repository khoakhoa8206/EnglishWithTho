// src/components/assignment/ResultPanel.jsx
import { useState, useEffect, useCallback } from 'react';
import { assignmentService } from '@/services/assignment/assignmentService';
import { PASSING_SCORE } from '@/constants/scoring';

export default function ResultPanel({ assignment, result, studentId, onRetry, onBack }) {
  const passed = result.passed;
  const score = result.score;

  const [tab, setTab] = useState('result'); // result | review | leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    if (!assignment?.class_id) return;
    setLbLoading(true);
    try {
      const data = await assignmentService.getLeaderboard(assignment.id, assignment.class_id);
      setLeaderboard(data);
    } catch {
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
  }, [assignment]);

  useEffect(() => {
    if (tab === 'leaderboard') loadLeaderboard();
  }, [tab, loadLeaderboard]);

  const durationFormatted = result.duration_seconds
    ? `${Math.floor(result.duration_seconds / 60)}p ${result.duration_seconds % 60}s`
    : '—';

  return (
    <div>
      {/* Score Hero */}
      <div style={{
        background: passed
          ? 'linear-gradient(135deg, #566B58, #768E78)'
          : 'linear-gradient(135deg, #A0522D, #C27B5A)',
        borderRadius: 18,
        padding: '32px 28px',
        textAlign: 'center',
        color: '#fff',
        marginBottom: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>
          {passed ? '🎉' : '💪'}
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>
          {score}%
        </h2>
        <p style={{ fontSize: 16, margin: '0 0 16px', opacity: 0.9 }}>
          {passed ? 'Xuất sắc! Bạn đã đạt!' : 'Chưa đạt — Cố lên nào!'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Stat label="Đúng" value={`${result.correct_count}/${result.total_questions}`} />
          <Stat label="Thời gian" value={durationFormatted} />
          <Stat label="Lần làm" value={`#${result.attempt_number}`} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['result', 'review', 'leaderboard'].map((t) => {
          const labels = { result: '📊 Kết quả', review: '🔍 Xem lại', leaderboard: '🏆 Bảng xếp hạng' };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 4px', fontSize: 12.5, fontWeight: 700,
                border: '2px solid',
                borderColor: tab === t ? '#566B58' : '#EFE6D6',
                borderRadius: 10,
                background: tab === t ? '#EDF3ED' : '#fff',
                color: tab === t ? '#3A5040' : '#8A7F72',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{
        background: '#fff', border: '1px solid #EFE6D6',
        borderRadius: 14, padding: '18px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: 20,
      }}>
        {tab === 'result' && <ResultStats result={result} passed={passed} />}
        {tab === 'review' && <ReviewList scoredAnswers={result.scoredAnswers || []} passed={passed} />}
        {tab === 'leaderboard' && (
          <LeaderboardTab
            leaderboard={leaderboard}
            loading={lbLoading}
            studentId={studentId}
          />
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: '12px', fontSize: 14, fontWeight: 600,
            background: '#F5EDE0', border: 'none', borderRadius: 12,
            color: '#8A7F72', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ← Về danh sách
        </button>
        <button
          onClick={onRetry}
          style={{
            flex: 1, padding: '12px', fontSize: 14, fontWeight: 700,
            background: 'linear-gradient(135deg, #566B58, #768E78)',
            border: 'none', borderRadius: 12,
            color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          🔄 Làm lại
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Result Stats ─────────────────────────────────────────────────────────────
function ResultStats({ result, passed }) {
  return (
    <div>
      <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '0 0 16px' }}>
        Tổng quan kết quả làm bài
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatCard label="Điểm số" value={`${result.score}%`} color={passed ? '#2E9767' : '#C24949'} />
        <StatCard label="Câu đúng" value={`${result.correct_count}/${result.total_questions}`} color="#566B58" />
        <StatCard label="Câu sai" value={`${result.wrong_count}/${result.total_questions}`} color="#C24949" />
        <StatCard label="Thời gian" value={result.duration_seconds
          ? `${Math.floor(result.duration_seconds / 60)}p${result.duration_seconds % 60}s`
          : '—'} color="#8A7F72"
        />
      </div>
      <div style={{
        marginTop: 16, padding: '12px 16px',
        background: passed ? '#EDF3ED' : '#FEF3F3',
        border: `1px solid ${passed ? '#A7C5A9' : '#FBD5D5'}`,
        borderRadius: 10, fontSize: 13.5,
        color: passed ? '#2E7D32' : '#C24949',
        fontWeight: 600, textAlign: 'center',
      }}>
        {passed
          ? `✅ Đạt! (>= ${PASSING_SCORE}%)`
          : `❌ Chưa đạt. Cần >= ${PASSING_SCORE}% để đạt.`}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#FDFAF5', borderRadius: 10,
      border: '1px solid #EFE6D6', padding: '12px 14px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#8A7F72', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Review List ──────────────────────────────────────────────────────────────
function ReviewList({ scoredAnswers, passed }) {
  if (!scoredAnswers || scoredAnswers.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: '#8A7F72', textAlign: 'center', padding: '20px 0' }}>
        Không có dữ liệu để hiển thị.
      </p>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '0 0 14px' }}>
        Chi tiết từng câu hỏi
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scoredAnswers.map((a, i) => (
          <div key={a.question_id || i} style={{
            padding: '12px 14px', borderRadius: 10,
            border: `2px solid ${a.is_correct ? '#A7C5A9' : '#FBD5D5'}`,
            background: a.is_correct ? '#EDF3ED' : '#FEF3F3',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                fontSize: 16, flexShrink: 0, marginTop: 1,
              }}>
                {a.is_correct ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#332C35', margin: '0 0 6px' }}>
                  Câu {i + 1}
                </p>
                <p style={{ fontSize: 12.5, color: '#4A3F35', margin: '0 0 4px' }}>
                  Bạn chọn:{' '}
                  <b style={{ color: a.is_correct ? '#2E9767' : '#C24949' }}>
                    {a.student_answer || '(bỏ trống)'}
                  </b>
                </p>
                {!a.is_correct && passed && (
                  <p style={{ fontSize: 12.5, color: '#2E7D32', margin: 0 }}>
                    Đáp án đúng: <b style={{ color: '#2E9767' }}>{a.correct_answer}</b>
                  </p>
                )}
                {!a.is_correct && !passed && (
                  <p style={{ fontSize: 12.5, color: '#C24949', margin: 0 }}>
                    Hãy xem lại và làm bài tiếp để xem đáp án.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function LeaderboardTab({ leaderboard, loading, studentId }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#8A7F72', fontSize: 13.5 }}>
        Đang tải bảng xếp hạng...
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
        <p style={{ fontSize: 13.5, color: '#8A7F72', margin: 0 }}>
          Chưa có học sinh nào đạt bài này.
        </p>
      </div>
    );
  }

  const RANK_STYLES = {
    1: { bg: '#FFF8E7', border: '#FCC88A', badge: '🥇' },
    2: { bg: '#F5F5F5', border: '#C0C0C0', badge: '🥈' },
    3: { bg: '#FFF0E6', border: '#CD7F32', badge: '🥉' },
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#8A7F72', margin: '0 0 14px' }}>
        Xếp hạng theo câu đúng (từ cao đến thấp), thời gian làm (từ ít đến nhiều)
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {leaderboard.map((entry) => {
          const style = RANK_STYLES[entry.rank] || { bg: '#FDFAF5', border: '#EFE6D6', badge: `#${entry.rank}` };
          return (
            <div
              key={entry.rank}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                border: `1.5px solid ${style.border}`,
                background: style.bg,
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, minWidth: 28, textAlign: 'center' }}>
                {style.badge}
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#332C35', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.studentName}
              </span>
              <span style={{ fontSize: 12.5, color: '#2E9767', fontWeight: 700, flexShrink: 0 }}>
                {entry.correctCount}/{entry.totalQuestions}
              </span>
              <span style={{ fontSize: 12, color: '#8A7F72', flexShrink: 0 }}>
                {entry.durationFormatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}