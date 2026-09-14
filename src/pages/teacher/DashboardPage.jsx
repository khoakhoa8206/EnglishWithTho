// src/pages/teacher/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '@/hooks/useAuth';
import ErrorState from '@/components/common/ErrorState';

function initials(name = '') {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
}

const STATUS_META = {
  hoan_thanh: { label: 'Hoàn thành', color: '#3F6B4F', bg: '#EEF4EE' },
  chua_dat:   { label: 'Chưa đạt',   color: '#A6790A', bg: '#FBF3E2' },
  chua_lam:   { label: 'Chưa làm',   color: '#A23B32', bg: '#FAEBE9' },
};

const TIER_META = {
  green:  { label: 'Đạt tiến độ tốt', bar: '#3F6B4F', tint: '#EEF4EE', text: '#2C4A34', order: 0 },
  yellow: { label: 'Cần theo sát',    bar: '#A6790A', tint: '#FBF3E2', text: '#7A5806', order: 1 },
  red:    { label: 'Cần can thiệp',   bar: '#A23B32', tint: '#FAEBE9', text: '#7C2C25', order: 2 },
};

const DashboardPage = () => {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [stats, setStats]           = useState({ totalStudents: 0, activeAssignments: 0 });
  const [matrix, setMatrix]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [statusFilter, setStatusFilter] = useState(null); // null | 'hoan_thanh' | 'chua_dat' | 'chua_lam'
  const [expandedId, setExpandedId] = useState(null);     // student id đang expand
  const [progressClassFilter, setProgressClassFilter] = useState('all');
  const [progressClasses, setProgressClasses]         = useState([]);

  useEffect(() => { if (teacherId) fetchDashboardData(); }, [teacherId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, matrixData] = await Promise.all([
        dashboardService.getDashboardStats(teacherId),
        dashboardService.getStudentAssignmentMatrix(teacherId),
      ]);
      setStats(statsData);
      setMatrix(matrixData);
      // Trích xuất danh sách lớp unique từ matrix
      const uniqueClasses = [...new Map(
        matrixData
          .filter(s => s.classId)
          .map(s => [s.classId, { id: s.classId, name: s.class }])
      ).values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      setProgressClasses(uniqueClasses);
    } catch (err) {
      setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const allAssignments = matrix.flatMap(s => s.assignments);
  const passedCount = allAssignments.filter(a => a.status === 'hoan_thanh').length;
  const completionRate = allAssignments.length > 0
    ? Math.round((passedCount / allAssignments.length) * 100)
    : 0;

  // Greeting theo giờ
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // Học sinh theo lớp (matrix dùng tên lớp để lọc)
  const filteredMatrix = matrix.filter(s =>
    progressClassFilter === 'all' || s.classId === progressClassFilter
  );

  const computeOverview = (students) => {
    let hoanThanh = 0, chuaDat = 0, chuaLam = 0, longestStreak = 0;
    for (const s of students) {
      for (const a of s.assignments) {
        if (a.status === 'hoan_thanh') hoanThanh++;
        else if (a.status === 'chua_dat') chuaDat++;
        else chuaLam++;
      }
      // Dùng longestStreak từ DB thay vì tự tính
      longestStreak = Math.max(longestStreak, s.longestStreak ?? 0);
    }
    return { hoanThanh, chuaDat, chuaLam, longestStreak };
  };

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>{greeting}, Thơ xinh 👋</h1>
          <p>Tổng quan tiến độ và kết quả bài tập — cập nhật hôm nay, {today}</p>
        </div>
        <div className="t-teacher-chip">
          <div className="t-avatar">{profile?.full_name ? initials(profile.full_name) : 'GV'}</div>
          <span>Cô Thơ</span>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchDashboardData} compact />}

      <div className="t-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="t-stat-card">
          <div className="t-stat-top">
            <span className="t-stat-label">Tổng học sinh</span>
            <div className="t-stat-icon" style={{ background: 'var(--t-pink-100)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#C94874" strokeWidth="2">
                <circle cx="9" cy="8" r="3.2"/>
                <path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6"/>
                <circle cx="17.5" cy="8.5" r="2.4"/>
                <path d="M15 14.2c2.1.3 4.5 1.9 4.5 5.8"/>
              </svg>
            </div>
          </div>
          <p className="t-stat-value">{stats.totalStudents}</p>
          <span className="t-stat-sub">Học sinh đang theo học</span>
        </div>

        <div className="t-stat-card">
          <div className="t-stat-top">
            <span className="t-stat-label">Bài tập đang giao</span>
            <div className="t-stat-icon" style={{ background: 'var(--t-lav-50)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#5F73C4" strokeWidth="2">
                <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                <path d="M9 12h6M9 16h6M9 8h3"/>
              </svg>
            </div>
          </div>
          <p className="t-stat-value">{stats.activeAssignments}</p>
          <span className="t-stat-sub">Bài tập chưa hết hạn</span>
        </div>

        <div className="t-stat-card">
          <div className="t-stat-top">
            <span className="t-stat-label">Tỷ lệ đạt</span>
            <div className="t-stat-icon" style={{ background: 'var(--t-mint-100)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2E9767" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </div>
          <p className="t-stat-value">{completionRate}%</p>
          <span className="t-stat-sub">Lần nộp đạt ≥ 80%</span>
        </div>
      </div>

      {/* ── Stat cards theo trạng thái nộp bài ── */}
      {!loading && !error && (() => {
        const ov = computeOverview(filteredMatrix);
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr) 1.4fr',
            gap: 1,
            background: 'var(--t-border)',
            border: '1px solid var(--t-border)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 20,
          }}>
            {[
              { key: 'hoan_thanh', val: ov.hoanThanh },
              { key: 'chua_dat',   val: ov.chuaDat },
              { key: 'chua_lam',   val: ov.chuaLam },
            ].map(({ key, val }) => {
              const meta = STATUS_META[key];
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(f => f === key ? null : key)}
                  style={{
                    background: active ? meta.bg : '#fff',
                    border: 'none',
                    padding: '20px 22px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    outline: active ? `2px solid ${meta.color}` : 'none',
                    outlineOffset: -2,
                  }}
                >
                  <div style={{ fontSize: 32, fontFamily: 'Georgia, serif', color: meta.color, fontWeight: 400 }}>{val}</div>
                  <div style={{ fontSize: 13, color: 'var(--t-muted)', marginTop: 6 }}>{meta.label}</div>
                </button>
              );
            })}
            <div style={{ background: '#fff', padding: '20px 22px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 32, fontFamily: 'Georgia, serif', color: 'var(--t-primary)', fontWeight: 400 }}>{ov.longestStreak}</span>
              <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>ngày — chuỗi dài nhất trong lớp</span>
            </div>
          </div>
        );
      })()}

      {/* ── Detail panel khi bấm stat card ── */}
      {statusFilter && (() => {
        const meta = STATUS_META[statusFilter];
        const list = [];
        for (const s of filteredMatrix) {
          for (const a of s.assignments) {
            if (a.status === statusFilter) list.push({ ...a, studentName: s.name, studentClass: s.class });
          }
        }
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        return (
          <div className="t-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
              <span style={{ fontWeight: 600 }}>
                Danh sách bài — {meta.label.toLowerCase()}{' '}
                <span style={{ fontWeight: 400, color: '#8A8270' }}>({list.length} bài)</span>
              </span>
              <button onClick={() => setStatusFilter(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#8A8270' }}>✕</button>
            </div>
            {list.length === 0
              ? <div style={{ color: '#8A8270', fontSize: 14 }}>Không có bài nào.</div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Ngày nộp</th><th>Học sinh</th><th>Lớp</th><th>Tên bài</th>
                        <th style={{ textAlign: 'right' }}>Thời gian làm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((a, i) => (
                        <tr key={i}>
                          <td>{a.date ? new Date(a.date).toLocaleDateString('vi-VN') : '—'}</td>
                          <td>{a.studentName}</td>
                          <td>{a.studentClass}</td>
                          <td>{a.title}</td>
                          <td style={{ textAlign: 'right' }}>{a.duration != null ? `${a.duration} phút` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        );
      })()}

      {/* ── Bảng theo dõi tiến độ học sinh (giống dashboard.html) ── */}
      {!loading && !error && matrix.length > 0 && (() => {
        const filteredStudents = filteredMatrix
          .map(s => {
            const hoanThanh = s.assignments.filter(a => a.status === 'hoan_thanh').length;
            const chuaDat   = s.assignments.filter(a => a.status === 'chua_dat').length;
            const chuaLam   = s.assignments.filter(a => a.status === 'chua_lam').length;

            // Streak lấy thẳng từ DB (đã được service join vào)
            const currentStreak = s.currentStreak ?? 0;
            const longestStreak = s.longestStreak ?? 0;

            const withDur = s.assignments.filter(a => a.duration != null);
            const avgDuration = withDur.length > 0
              ? withDur.reduce((acc, a) => acc + a.duration, 0) / withDur.length
              : 0;

            const total = s.assignments.length;
            const notGoodPct = total ? ((chuaDat + chuaLam) / total) * 100 : 100;
            const tier = notGoodPct <= 10 ? 'green' : notGoodPct <= 50 ? 'yellow' : 'red';

            const totalResets = s.totalResets ?? 0;
            return { ...s, hoanThanh, chuaDat, chuaLam, currentStreak, longestStreak, avgDuration, notGoodPct, tier, totalResets };
          })
          .sort((a, b) => {
            const td = TIER_META[a.tier].order - TIER_META[b.tier].order;
            return td !== 0 ? td : (b.currentStreak + b.hoanThanh) - (a.currentStreak + a.hoanThanh);
          });

        return (
          <div className="t-card">
            <div className="t-card-title" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span>Bảng theo dõi tiến độ học sinh</span>

              <select
                value={progressClassFilter}
                onChange={(e) => setProgressClassFilter(e.target.value)}
                style={{ marginLeft: 'auto', marginRight: 8 }}
              >
                <option value="all">Tất cả lớp</option>
                {progressClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                {Object.entries(TIER_META).map(([k, v]) => (
                  <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, color: v.text }}>
                    <span style={{ width: 10, height: 10, background: v.bar, borderRadius: 2, display: 'inline-block' }} />
                    {v.label}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="t-table">
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>#</th>
                    <th>Học sinh</th>
                    <th>Lớp</th>
                    <th style={{ textAlign: 'right' }}>Hoàn thành</th>
                    <th style={{ textAlign: 'right' }}>Chưa đạt</th>
                    <th style={{ textAlign: 'right' }}>Chưa làm</th>
                    <th style={{ textAlign: 'right' }}>Chuỗi HT</th>
                    <th style={{ textAlign: 'right' }}>Chuỗi dài nhất</th>
                    <th style={{ textAlign: 'right' }}>TG làm TB</th>
                    <th style={{ textAlign: 'right' }}>Gian lận 🚨</th>
                    <th style={{ textAlign: 'right' }}>% chưa tốt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => {
                    const meta = TIER_META[s.tier];
                    const isOpen = expandedId === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => setExpandedId(id => id === s.id ? null : s.id)}
                          style={{
                            background: meta.tint,
                            borderLeft: `4px solid ${meta.bar}`,
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ textAlign: 'center', fontWeight: 600, color: meta.text }}>{idx + 1}</td>
                          <td>
                            <span style={{ fontWeight: 600, color: meta.text }}>{s.name}</span>
                            <span style={{
                              marginLeft: 8, color: '#8A8270',
                              display: 'inline-block',
                              transition: 'transform 0.12s',
                              transform: isOpen ? 'rotate(90deg)' : 'none',
                            }}>›</span>
                          </td>
                          <td>{s.class}</td>
                          <td style={{ textAlign: 'right' }}>{s.hoanThanh}</td>
                          <td style={{ textAlign: 'right' }}>{s.chuaDat}</td>
                          <td style={{ textAlign: 'right' }}>{s.chuaLam}</td>
                          <td style={{ textAlign: 'right' }}>{s.currentStreak > 0 ? `🔥 ${s.currentStreak}` : s.currentStreak}</td>
                          <td style={{ textAlign: 'right' }}>{s.longestStreak}</td>
                          <td style={{ textAlign: 'right' }}>{s.avgDuration ? `${Math.round(s.avgDuration)} phút` : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: s.totalResets > 0 ? 700 : 400, color: s.totalResets > 0 ? '#A23B32' : '#8A8270' }}>
                            {s.totalResets > 0 ? `🚨 ${s.totalResets}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: meta.text }}>{s.notGoodPct.toFixed(0)}%</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={10} style={{ padding: 0, background: '#fff' }}>
                              <div style={{ padding: '12px 24px 16px 40px' }}>
                                <table className="t-table" style={{ fontSize: 13 }}>
                                  <thead>
                                    <tr>
                                      <th>Ngày nộp</th>
                                      <th>Tên bài</th>
                                      <th>Trạng thái</th>
                                      <th style={{ textAlign: 'right' }}>Điểm</th>
                                      <th style={{ textAlign: 'right' }}>Thời gian</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...s.assignments]
                                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                                      .map((a, i) => {
                                        const sm = STATUS_META[a.status] || { label: a.status, color: '#8A8270' };
                                        return (
                                          <tr key={i}>
                                            <td>{a.date ? new Date(a.date).toLocaleDateString('vi-VN') : '—'}</td>
                                            <td>{a.title}</td>
                                            <td><span style={{ color: sm.color, fontWeight: 600 }}>{sm.label}</span></td>
                                            <td style={{ textAlign: 'right' }}>{a.score != null ? `${a.score}%` : '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{a.duration != null ? `${a.duration} phút` : '—'}</td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DashboardPage;