// src/pages/teacher/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '@/hooks/useAuth';
import ErrorState from '@/components/common/ErrorState';

function ProgressRing({ pct = 0 }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  const color = pct >= 80 ? '#4FB784' : pct >= 40 ? '#E0A93C' : '#DD6B6B';
  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <svg width="40" height="40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r={r} stroke="#F1DDE8" strokeWidth="4" fill="none" />
        <circle cx="20" cy="20" r={r} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '10.5px', fontWeight: 700, color: '#332C35',
      }}>{pct}%</div>
    </div>
  );
}

function initials(name = '') {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
}

function StatusBadge({ passed }) {
  return passed
    ? <span className="badge badge-mint">Đạt</span>
    : <span className="badge badge-red">Chưa đạt</span>;
}

const DashboardPage = () => {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [stats, setStats]           = useState({ totalStudents: 0, activeAssignments: 0 });
  const [results, setResults]       = useState([]);
  const [classes, setClasses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [filterError, setFilterError] = useState(null);
  const [classFilter, setClassFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { if (teacherId) fetchDashboardData(); }, [teacherId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, resultsData] = await Promise.all([
        dashboardService.getDashboardStats(teacherId),
        dashboardService.getStudentResults(teacherId, { classId: 'all', searchQuery: '' }),
      ]);
      setStats(statsData);
      setResults(resultsData);
      const uniqueClasses = [...new Map(
        resultsData
          .filter(r => r.classId)
          .map(r => [r.classId, { id: r.classId, name: r.className }])
      ).values()];
      setClasses(uniqueClasses);
    } catch (err) {
      setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (newClass, newQuery) => {
    try {
      setFilterError(null);
      const data = await dashboardService.getStudentResults(teacherId, {
        classId: newClass, searchQuery: newQuery,
      });
      setResults(data);
    } catch {
      setFilterError('Lọc dữ liệu thất bại. Vui lòng thử lại.');
    }
  };

  const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const passedCount = results.filter(r => r.passed).length;
  const completionRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

  // Greeting theo giờ
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

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

      <div className="t-card">
        <div className="t-card-title">
          Kết quả làm bài của học sinh
          <small>{results.length} lần nộp</small>
        </div>

        {filterError && (
          <ErrorState
            message={filterError}
            onRetry={() => handleFilterChange(classFilter, searchQuery)}
            compact
          />
        )}

        <div className="t-filter-bar">
          <select value={classFilter} onChange={(e) => {
            setClassFilter(e.target.value);
            handleFilterChange(e.target.value, searchQuery);
          }}>
            <option value="all">Tất cả lớp</option>
            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
          <div className="t-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm tên học sinh..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange(classFilter, e.target.value);
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="t-table">
            <thead>
              <tr>
                <th>Học sinh</th><th>Lớp</th><th>Bài tập</th>
                <th>Điểm</th><th>Thời gian</th>
                <th>Mức độ</th><th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--t-muted)' }}>Đang tải dữ liệu...</td></tr>
              ) : error ? (
                <tr><td colSpan="7"><div className="t-empty">Không thể tải dữ liệu.</div></td></tr>
              ) : results.length === 0 ? (
                <tr><td colSpan="7"><div className="t-empty">Không có dữ liệu phù hợp.</div></td></tr>
              ) : results.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="t-name-cell">
                      <div className="t-mini-avatar">{initials(row.studentName)}</div>
                      {row.studentName}
                    </div>
                  </td>
                  <td>{row.className}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.assignmentTitle}
                  </td>
                  <td style={{ fontWeight: 600, color: row.passed ? '#2E9767' : '#C24949' }}>
                    {row.score !== null && row.score !== undefined ? `${row.score}%` : '—'}
                  </td>
                  <td>{row.duration || '—'}</td>
                  <td>
                    <ProgressRing pct={row.score ?? 0} />
                  </td>
                  <td><StatusBadge passed={row.passed} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;