// src/pages/teacher/StreakManagerPage.jsx
// Trang quản lý Streak cho giáo viên:
// - Chọn học sinh → xem bảng ngày trong tháng
// - Click ngày để toggle (thêm/xóa streak)
// - Nhấn "Xác nhận" để lưu vào DB và recalculate streak

import { useState, useEffect, useCallback } from 'react';
import { streakService } from '@/services/ai/streakService';
import { studentService } from '@/services/student/studentService';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';

// ─── Helper: số ngày trong tháng ─────────────────────────────────────────────
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Helper: format YYYY-MM-DD ───────────────────────────────────────────────
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Helper: tên tháng tiếng Việt ────────────────────────────────────────────
const MONTH_LABELS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export default function StreakManagerPage() {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-based
  const [students, setStudents]   = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentsError, setStudentsError]     = useState(null);

  // Ngày có streak (đã lưu trong DB)
  const [activeDates, setActiveDates] = useState(new Set()); // Set of 'YYYY-MM-DD'
  // Ngày đang chọn để thay đổi (pending, chưa lưu)
  const [pendingAdd, setPendingAdd]   = useState(new Set()); // ngày sẽ thêm
  const [pendingRemove, setPendingRemove] = useState(new Set()); // ngày sẽ xóa

  const [loadingDays, setLoadingDays] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveResult, setSaveResult]   = useState(null); // { currentStreak, longestStreak }

  // ── Load danh sách học sinh ───────────────────────────────────────────────
  useEffect(() => {
    if (!teacherId) return;
    setLoadingStudents(true);
    studentService.getStudents(teacherId)
      .then(list => {
        setStudents(list || []);
        if (list && list.length > 0) setSelectedStudent(list[0]);
      })
      .catch(e => setStudentsError(e.message))
      .finally(() => setLoadingStudents(false));
  }, [teacherId]);

  // ── Load streak days khi đổi học sinh hoặc đổi tháng ────────────────────
  const loadDays = useCallback(async () => {
    if (!selectedStudent) return;
    setLoadingDays(true);
    setPendingAdd(new Set());
    setPendingRemove(new Set());
    setSaveResult(null);
    try {
      const from = toDateStr(viewYear, viewMonth, 1);
      const daysInMonth = getDaysInMonth(viewYear, viewMonth);
      const to = toDateStr(viewYear, viewMonth, daysInMonth);
      const days = await streakService.getStreakDays(selectedStudent.id, from, to);
      setActiveDates(new Set(days));
    } catch (e) {
      alert('Không tải được dữ liệu streak: ' + e.message);
    } finally {
      setLoadingDays(false);
    }
  }, [selectedStudent, viewYear, viewMonth]);

  useEffect(() => { loadDays(); }, [loadDays]);

  // ── Toggle một ô ngày ────────────────────────────────────────────────────
  const toggleDay = (dateStr) => {
    const isActive = activeDates.has(dateStr);
    const isPendingAdd = pendingAdd.has(dateStr);
    const isPendingRemove = pendingRemove.has(dateStr);

    if (isActive) {
      // Đang có trong DB: click lần 1 → đánh dấu xóa, click lần 2 → bỏ đánh dấu xóa
      setPendingRemove(prev => {
        const next = new Set(prev);
        if (isPendingRemove) next.delete(dateStr); else next.add(dateStr);
        return next;
      });
    } else {
      // Chưa có trong DB: click lần 1 → đánh dấu thêm, click lần 2 → bỏ đánh dấu thêm
      setPendingAdd(prev => {
        const next = new Set(prev);
        if (isPendingAdd) next.delete(dateStr); else next.add(dateStr);
        return next;
      });
    }
  };

  const hasChanges = pendingAdd.size > 0 || pendingRemove.size > 0;

  // ── Lưu thay đổi ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedStudent || !hasChanges) return;
    setSaving(true);
    setSaveResult(null);
    try {
      // 1. Xóa các ngày bị bỏ tick
      for (const dateStr of pendingRemove) {
        await streakService.removeStreakDay(selectedStudent.id, dateStr);
      }
      // 2. Thêm các ngày mới
      if (pendingAdd.size > 0) {
        const result = await streakService.manualSetStreakDays(
          selectedStudent.id,
          Array.from(pendingAdd)
        );
        setSaveResult(result);
      }
      await loadDays(); // reload để hiện trạng thái mới
    } catch (e) {
      alert('Lưu thất bại: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Điều hướng tháng ─────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loadingStudents) return <Loading fullPage text="Đang tải danh sách học sinh..." />;
  if (studentsError) return <ErrorState message={studentsError} />;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>🔥 Quản lý Streak</h1>
          <p>Xem và khôi phục chuỗi học liên tiếp của học sinh</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
        {/* ── Sidebar chọn học sinh ─────────────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0,
          background: '#fff', borderRadius: 14,
          border: '1px solid var(--t-border)',
          padding: 16, maxHeight: 600, overflowY: 'auto',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', margin: '0 0 10px' }}>
            HỌC SINH
          </p>
          {students.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--t-muted)' }}>Chưa có học sinh nào.</p>
          ) : students.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStudent(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 10px', borderRadius: 10,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: selectedStudent?.id === s.id ? 'var(--t-primary-soft, #EDF3ED)' : 'transparent',
                color: selectedStudent?.id === s.id ? 'var(--t-primary)' : 'var(--t-ink)',
                fontFamily: 'inherit', fontWeight: selectedStudent?.id === s.id ? 700 : 400,
                marginBottom: 2,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--t-primary)',
                color: '#fff', fontWeight: 700, fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {(s.fullName || s.full_name || '?').split(' ').slice(-1)[0][0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.fullName || s.full_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t-muted)' }}>{s.className || s.class_name || ''}</div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Bảng ngày trong tháng ─────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 320 }}>
          {!selectedStudent ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-muted)', fontSize: 14 }}>
              Chọn một học sinh để xem streak
            </div>
          ) : (
            <div style={{
              background: '#fff', borderRadius: 14,
              border: '1px solid var(--t-border)', padding: '20px 24px',
            }}>
              {/* Header tháng + mũi tên */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <button
                  onClick={prevMonth}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--t-border)',
                    background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >‹</button>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--t-ink)' }}>
                    {MONTH_LABELS[viewMonth]} {viewYear}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>
                    {selectedStudent.fullName || selectedStudent.full_name}
                    {saveResult && (
                      <span style={{ color: '#2E7D32', fontWeight: 700, marginLeft: 8 }}>
                        ✅ Đã lưu — Chuỗi hiện tại: {saveResult.currentStreak} ngày | Dài nhất: {saveResult.longestStreak} ngày
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={nextMonth}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--t-border)',
                    background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >›</button>
              </div>

              {/* Chú thích */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { color: '#FF8C00', bg: '#FFF3E0', border: '#FF8C00', label: 'Đã có streak' },
                  { color: '#4CAF50', bg: '#E8F5E9', border: '#4CAF50', label: 'Sẽ thêm (chờ lưu)' },
                  { color: '#A23B32', bg: '#FDECEA', border: '#A23B32', label: 'Sẽ xóa (chờ lưu)' },
                  { color: '#8A7F72', bg: '#F5F5F5', border: '#DDD', label: 'Không có' },
                ].map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t-muted)' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: c.bg, border: `2px solid ${c.border}` }} />
                    {c.label}
                  </div>
                ))}
              </div>

              {/* Lưới các ô ngày */}
              {loadingDays ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t-muted)' }}>Đang tải...</div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 8,
                }}>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = toDateStr(viewYear, viewMonth, day);
                    const isActive = activeDates.has(dateStr);
                    const isPendingAdd = pendingAdd.has(dateStr);
                    const isPendingRemove = pendingRemove.has(dateStr);
                    const isToday = dateStr === today;

                    // Xác định màu sắc ô
                    let bg = '#fff';
                    let borderColor = '#DDD';
                    let textColor = 'var(--t-ink)';
                    let emoji = null;

                    if (isPendingRemove) {
                      bg = '#FDECEA'; borderColor = '#A23B32'; textColor = '#A23B32';
                      emoji = '✕';
                    } else if (isPendingAdd) {
                      bg = '#E8F5E9'; borderColor = '#4CAF50'; textColor = '#2E7D32';
                      emoji = '+';
                    } else if (isActive) {
                      bg = '#FFF3E0'; borderColor = '#FF8C00'; textColor = '#E65100';
                      emoji = '🔥';
                    }

                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(dateStr)}
                        title={dateStr}
                        style={{
                          aspectRatio: '1',
                          borderRadius: 10,
                          border: `2px solid ${borderColor}`,
                          background: bg,
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 2,
                          transition: 'all 0.12s',
                          outline: isToday ? '3px solid #566B58' : 'none',
                          outlineOffset: 1,
                          fontFamily: 'inherit',
                          padding: 2,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1 }}>
                          {day}
                        </span>
                        {emoji && (
                          <span style={{ fontSize: emoji === '🔥' ? 12 : 11, lineHeight: 1 }}>{emoji}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Nút xác nhận */}
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                {hasChanges && (
                  <span style={{ fontSize: 13, color: 'var(--t-muted)', flex: 1 }}>
                    Thêm: <b style={{ color: '#2E7D32' }}>{pendingAdd.size} ngày</b>
                    {pendingRemove.size > 0 && (
                      <> · Xóa: <b style={{ color: '#A23B32' }}>{pendingRemove.size} ngày</b></>
                    )}
                  </span>
                )}
                <button
                  className="t-btn"
                  onClick={() => { setPendingAdd(new Set()); setPendingRemove(new Set()); }}
                  disabled={!hasChanges || saving}
                >
                  Hủy
                </button>
                <button
                  className="t-btn t-btn-primary"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? 'Đang lưu...' : `✅ Xác nhận (${pendingAdd.size + pendingRemove.size} thay đổi)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}