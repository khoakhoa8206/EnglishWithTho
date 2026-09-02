// src/pages/teacher/TuitionPage.jsx
import { useState, useEffect } from 'react';
import { tuitionService } from '../../services/tuitionService';
import { studentService } from '../../services/student/studentService';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

function getInitials(name = '') {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || 'HS';
}

function fmtVND(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}
// ─── AddYearButton ────────────────────────────────────────────────────────────
function AddYearButton({ teacherId, onAdded }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear]         = useState(currentYear);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const handle = async () => {
    setLoading(true); setError('');
    try {
      const count = await tuitionService.addFullYear(teacherId, year);
      setShowPicker(false);
      onAdded();
      alert(`✅ Đã tạo học phí năm ${year} (${count} bản ghi)`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="t-btn t-btn-primary" onClick={() => setShowPicker(true)}>
        📅 Thêm năm
      </button>

      {showPicker && (
        <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && setShowPicker(false)}>
          <div className="t-modal" style={{ maxWidth: 360 }}>
            <h3>📅 Thêm học phí theo năm</h3>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
              Chọn năm → tự tạo 12 tháng cho tất cả học sinh hiện tại.
            </p>
            <div className="t-field">
              <label>Năm học</label>
              <select value={year} onChange={e => setYear(+e.target.value)}>
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} style={{
                  background: '#EDF3ED', border: '1px solid #A7C5A9',
                  borderRadius: 8, padding: '3px 10px', fontSize: 12, color: '#2E7D32',
                }}>
                  T{i + 1}/{year}
                </span>
              ))}
            </div>

            {error && <div className="t-error">⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setShowPicker(false)}>Hủy</button>
              <button className="t-btn t-btn-primary" onClick={handle} disabled={loading}>
                {loading ? 'Đang tạo...' : `✅ Tạo 12 tháng năm ${year}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default function TuitionPage() {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [students, setStudents]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [classFilter, setClassFilter]   = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null); // student object
  const [showFeeModal, setShowFeeModal] = useState(false);


  useEffect(() => { if (teacherId) loadData(); }, [teacherId]);

  const loadData = async (opts = {}) => {
    try {
      setLoading(true); setError(null);
      const [studentList, classList] = await Promise.all([
        tuitionService.getStudentList(teacherId, {
          classId: opts.classId ?? classFilter,
          searchQuery: opts.searchQuery ?? searchQuery,
        }),
        tuitionService.getClassesWithFee(teacherId),
      ]);
      setStudents(studentList);
      setClasses(classList);
      // Nếu đang xem chi tiết 1 học sinh → refresh lại
      if (selectedStudent) {
        const updated = studentList.find(s => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (e) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (key, val) => {
    const next = key === 'class' ? val : classFilter;
    const q    = key === 'q'    ? val : searchQuery;
    if (key === 'class') setClassFilter(val);
    if (key === 'q')     setSearchQuery(val);
    loadData({ classId: next, searchQuery: q });
  };

  // Tính tổng đã đóng / chưa đóng trong tháng hiện tại
  const currentMonth = new Date().getUTCMonth(); // 0-11
  const currentYear  = new Date().getUTCFullYear();
  let totalPaid = 0, totalUnpaid = 0;
  students.forEach(s => {
    const yearRecords = s.recordsByYear[currentYear] || [];
    const rec = yearRecords.find(r => new Date(r.month).getUTCMonth() === currentMonth);
    if (rec?.paid) totalPaid++; else totalUnpaid++;
  });

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Học phí</h1>
          <p>Quản lý học phí từng học sinh theo tháng</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <AddYearButton teacherId={teacherId} onAdded={loadData} />
          <button className="t-btn t-btn-outline" onClick={() => setShowFeeModal(true)}>
            ⚙️ Học phí theo lớp
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="t-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginBottom: 16 }}>
        <div className="t-stat-card">
          <div className="t-stat-top">
            <span className="t-stat-label">Đã đóng tháng này</span>
            <div className="t-stat-icon" style={{ background: 'var(--t-mint-100)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2E9767" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
          </div>
          <p className="t-stat-value">{totalPaid}</p>
          <span className="t-stat-sub">học sinh</span>
        </div>
        <div className="t-stat-card">
          <div className="t-stat-top">
            <span className="t-stat-label">Chưa đóng tháng này</span>
            <div className="t-stat-icon" style={{ background: 'var(--t-amber-100)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#B8842A" strokeWidth="2">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
              </svg>
            </div>
          </div>
          <p className="t-stat-value">{totalUnpaid}</p>
          <span className="t-stat-sub">học sinh</span>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadData} compact />}

      {/* Filter */}
      <div className="t-card">
        <div className="t-filter-bar">
          <select value={classFilter} onChange={e => handleFilter('class', e.target.value)}>
            <option value="all">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="t-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm học sinh..."
              value={searchQuery}
              onChange={e => handleFilter('q', e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <Loading text="Đang tải..." />
        ) : students.length === 0 ? (
          <EmptyState icon="💳" title="Chưa có học sinh" message="Thêm học sinh vào lớp để quản lý học phí." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {students.map(s => (
              <StudentTuitionRow
                key={s.id}
                student={s}
                onSelect={() => setSelectedStudent(s)}
                currentYear={currentYear}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedStudent && (
        <StudentDetailPanel
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSaved={loadData}
        />
      )}

      {showFeeModal && (
        <ClassFeeModal
          classes={classes}
          onClose={() => setShowFeeModal(false)}
          onSaved={() => { setShowFeeModal(false); loadData(); }}
        />
      )}

    </div>
  );
}

// ─── Row tóm tắt 1 học sinh ──────────────────────────────────────────────────
function StudentTuitionRow({ student, onSelect, currentYear }) {
  const yearRecords = student.recordsByYear[currentYear] || [];
  const paidCount   = yearRecords.filter(r => r.paid).length;

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 18px', borderRadius: 12,
        border: '1px solid #EFE6D6', background: '#fff',
        cursor: 'pointer', transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: '#768E78', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14, flexShrink: 0,
      }}>
        {getInitials(student.fullName)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#4A3F35' }}>{student.fullName}</div>
        <div style={{ fontSize: 12, color: '#8A7F72', marginTop: 2 }}>
          {student.className} · {fmtVND(student.monthlyFee)}/tháng
        </div>
      </div>

      {/* Mini grid 12 tháng */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {MONTHS.map((label, i) => {
          const rec = yearRecords.find(r => new Date(r.month).getUTCMonth() === i);
          return (
            <div key={i} title={`${label}/${currentYear}`} style={{
              width: 18, height: 18, borderRadius: 4,
              background: rec?.paid ? '#4CAF50' : rec ? '#EFE6D6' : '#F5F5F5',
              border: `1px solid ${rec?.paid ? '#388E3C' : '#DDD'}`,
            }} />
          );
        })}
      </div>

      {/* Tiến độ */}
      <div style={{ fontSize: 12, color: '#8A7F72', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
        {paidCount}/{yearRecords.length} tháng
      </div>

      <span style={{ color: '#B0A8A0', fontSize: 14 }}>›</span>
    </div>
  );
}

// ─── Panel chi tiết + chỉnh sửa ──────────────────────────────────────────────
function StudentDetailPanel({ student, onClose, onSaved }) {
  const years = Object.keys(student.recordsByYear).map(Number).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getUTCFullYear());
  const [pending, setPending]   = useState({}); // { [id]: paid }
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');

  const yearRecords = student.recordsByYear[selectedYear] || [];

  const toggleCell = (rec) => {
    setPending(prev => ({
      ...prev,
      [rec.id]: prev[rec.id] !== undefined ? !prev[rec.id] : !rec.paid,
    }));
  };

  const isPaid = (rec) => pending[rec.id] !== undefined ? pending[rec.id] : rec.paid;

  const hasChanges = Object.keys(pending).length > 0;

  const handleSave = async () => {
    setSaving(true); setSaveError('');
    try {
      const changes = Object.entries(pending).map(([id, paid]) => ({ id, paid }));
      await tuitionService.batchUpdate(changes);
      setPending({});
      onSaved();
    } catch (e) {
      setSaveError('Lưu thất bại: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid #EFE6D6',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: '#768E78', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16,
          }}>
            {getInitials(student.fullName)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#4A3F35' }}>{student.fullName}</div>
            <div style={{ fontSize: 13, color: '#8A7F72' }}>
              {student.className} · {fmtVND(student.monthlyFee)}/tháng
              {student.startDate && ` · Bắt đầu: ${new Date(student.startDate).toLocaleDateString('vi-VN')}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: '#F5EFE6', cursor: 'pointer', fontSize: 16, color: '#8A7F72',
          }}>×</button>
        </div>

        {/* Chọn năm */}
        <div style={{ padding: '16px 28px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#8A7F72', fontWeight: 600 }}>Năm học:</span>
          {years.length === 0 ? (
            <span style={{ fontSize: 13, color: '#B0A8A0' }}>Chưa có dữ liệu</span>
          ) : years.map(y => (
            <button key={y} onClick={() => { setSelectedYear(y); setPending({}); }} style={{
              padding: '4px 14px', borderRadius: 20, border: '1.5px solid',
              borderColor: selectedYear === y ? '#566B58' : '#DDD',
              background: selectedYear === y ? '#566B58' : '#fff',
              color: selectedYear === y ? '#fff' : '#4A3F35',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>{y}</button>
          ))}
        </div>

        {/* Bảng 12 ô */}
        <div style={{ padding: '20px 28px' }}>
          {yearRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#B0A8A0', fontSize: 14 }}>
              Chưa có tháng học phí nào cho năm {selectedYear}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#8A7F72', marginBottom: 12 }}>
                Click vào ô để đánh dấu đóng / chưa đóng, sau đó nhấn <b>Xác nhận</b>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 10,
              }}>
                {MONTHS.map((label, i) => {
                  const rec = yearRecords.find(r => new Date(r.month).getUTCMonth() === i);
                  if (!rec) {
                    return (
                      <div key={i} style={{
                        aspectRatio: '1', borderRadius: 12,
                        background: '#F5F5F5', border: '2px dashed #E0E0E0',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: 0.4,
                      }}>
                        <span style={{ fontSize: 13, color: '#B0A8A0', fontWeight: 600 }}>{label}</span>
                      </div>
                    );
                  }
                  const paid = isPaid(rec);
                  const changed = pending[rec.id] !== undefined;
                  return (
                    <button
                      key={i}
                      onClick={() => toggleCell(rec)}
                      style={{
                        aspectRatio: '1', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${paid ? '#388E3C' : changed ? '#B8842A' : '#DDD'}`,
                        background: paid ? '#E8F5E9' : '#fff',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all 0.15s',
                        outline: changed ? '2px solid #F4A224' : 'none',
                        outlineOffset: 2,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: paid ? '#2E7D32' : '#4A3F35' }}>
                        {label}
                      </span>
                      {paid && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: '#8A7F72' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: '#E8F5E9', border: '2px solid #388E3C', display: 'inline-block' }} />
                  Đã đóng
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: '#fff', border: '2px solid #DDD', display: 'inline-block' }} />
                  Chưa đóng
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: '#fff', border: '2px solid #B8842A', outline: '2px solid #F4A224', outlineOffset: 2, display: 'inline-block' }} />
                  Đang thay đổi
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px', borderTop: '1px solid #EFE6D6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {saveError && <span style={{ fontSize: 13, color: '#A94E4E' }}>⚠️ {saveError}</span>}
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <button className="t-btn" onClick={() => { setPending({}); onClose(); }}>Đóng</button>
            <button
              className="t-btn t-btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{ opacity: !hasChanges ? 0.5 : 1 }}
            >
              {saving ? 'Đang lưu...' : `Xác nhận${hasChanges ? ` (${Object.keys(pending).length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal cài học phí theo lớp ──────────────────────────────────────────────
function ClassFeeModal({ classes, onClose, onSaved }) {
  const [fees, setFees]     = useState(
    Object.fromEntries(classes.map(c => [c.id, c.monthly_fee || 0]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await Promise.all(
        classes.map(c => tuitionService.updateClassFee(c.id, Number(fees[c.id]) || 0))
      );
      onSaved();
    } catch (e) {
      setError('Lưu thất bại: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 440 }}>
        <h3>⚙️ Học phí theo lớp</h3>
        <p style={{ fontSize: 13, color: '#8A7F72', margin: '0 0 16px' }}>
          Nhập học phí hàng tháng cho từng lớp (VND).
        </p>
        {classes.length === 0 ? (
          <div style={{ color: '#B0A8A0', fontSize: 14, textAlign: 'center', padding: 20 }}>
            Chưa có lớp nào.
          </div>
        ) : classes.map(c => (
          <div key={c.id} className="t-field">
            <label>{c.name}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="0"
                step="10000"
                value={fees[c.id]}
                onChange={e => setFees(prev => ({ ...prev, [c.id]: e.target.value }))}
                style={{ flex: 1 }}
                placeholder="VD: 500000"
              />
              <span style={{ fontSize: 13, color: '#8A7F72', whiteSpace: 'nowrap' }}>đ/tháng</span>
            </div>
          </div>
        ))}
        {error && <div className="t-error">⚠️ {error}</div>}
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose} disabled={saving}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal thêm tháng ─────────────────────────────────────────────────────────
function AddMonthModal({ teacherId, students: studentsProp, onClose, onDone }) {
  // Mode: 'generate' = tạo lại tất cả từ start_date | 'single' = thêm 1 tháng cụ thể
  const [mode, setMode]           = useState('generate');
  const [students, setStudents]   = useState(studentsProp || []);
  const [studentId, setStudentId] = useState(studentsProp?.[0]?.id || '');
  // Cho mode 'single': chọn tháng + năm cụ thể
  const [month, setMonth]         = useState(String(new Date().getMonth() + 1)); // '1'...'12'
  const [year, setYear]           = useState(String(new Date().getFullYear()));
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (studentsProp && studentsProp.length > 0) {
      setStudents(studentsProp);
      setStudentId(studentsProp[0].id);
    } else {
      studentService.getStudents(teacherId)
        .then(data => {
          const valid = data.filter(s => s.id && s.fullName);
          setStudents(valid);
          if (valid.length > 0) setStudentId(valid[0].id);
        })
        .catch(() => setError('Không thể tải danh sách học sinh.'));
    }
  }, [teacherId, studentsProp]);

  const MONTH_LABELS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  const currentYear = new Date().getFullYear();
  // Cho phép chọn năm trong khoảng 2 năm trước đến 1 năm sau
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handleSave = async () => {
    if (!studentId) { setError('Vui lòng chọn học sinh.'); return; }
    setSaving(true); setError('');
    try {
      if (mode === 'generate') {
        // Tạo tất cả tháng từ start_date → nay
        await tuitionService.generateMonths(studentId);
      } else {
        // Thêm đúng 1 tháng cụ thể
        const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
        await tuitionService.addSingleMonth(studentId, monthDate);
      }
      onDone();
      onClose();
    } catch (e) {
      setError((mode === 'generate' ? 'Tạo tháng' : 'Thêm tháng') + ' thất bại: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 440 }}>
        <h3>📅 Thêm tháng học phí</h3>

        {/* Tab chọn mode */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#F5EFE6', borderRadius: 10, padding: 4 }}>
          <button
            onClick={() => setMode('generate')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: mode === 'generate' ? '#566B58' : 'transparent',
              color: mode === 'generate' ? '#fff' : '#8A7F72',
              fontWeight: 600, fontSize: 13, transition: 'all .15s',
            }}
          >
            🔄 Tạo lại tất cả
          </button>
          <button
            onClick={() => setMode('single')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: mode === 'single' ? '#566B58' : 'transparent',
              color: mode === 'single' ? '#fff' : '#8A7F72',
              fontWeight: 600, fontSize: 13, transition: 'all .15s',
            }}
          >
            ➕ Thêm 1 tháng
          </button>
        </div>

        {/* Mô tả mode */}
        <p style={{ fontSize: 13, color: '#8A7F72', margin: '0 0 16px', lineHeight: 1.55 }}>
          {mode === 'generate'
            ? 'Tự động tạo tất cả tháng học phí từ ngày bắt đầu học đến tháng hiện tại. Các tháng đã có sẽ được giữ nguyên.'
            : 'Thêm đúng 1 tháng học phí cụ thể cho học sinh (ví dụ: thêm tháng tương lai hoặc tháng bị thiếu).'}
        </p>

        {/* Chọn học sinh */}
        <div className="t-field">
          <label>Học sinh *</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)}>
            {students.length === 0
              ? <option value="">Đang tải...</option>
              : students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)
            }
          </select>
        </div>

        {/* Chọn tháng/năm (chỉ hiển thị ở mode 'single') */}
        {mode === 'single' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="t-field" style={{ flex: 1 }}>
              <label>Tháng *</label>
              <select value={month} onChange={e => setMonth(e.target.value)}>
                {MONTH_LABELS.map((label, i) => (
                  <option key={i} value={String(i + 1)}>{label}</option>
                ))}
              </select>
            </div>
            <div className="t-field" style={{ flex: 1 }}>
              <label>Năm *</label>
              <select value={year} onChange={e => setYear(e.target.value)}>
                {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>
        )}

        {error && <div className="t-error">⚠️ {error}</div>}

        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose} disabled={saving}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={handleSave} disabled={saving || !studentId}>
            {saving ? 'Đang xử lý...' : mode === 'generate' ? 'Tạo tất cả tháng' : 'Thêm tháng này'}
          </button>
        </div>
      </div>
    </div>
  );
}