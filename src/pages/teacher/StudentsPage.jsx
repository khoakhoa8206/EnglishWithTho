// src/pages/teacher/StudentsPage.jsx
import React, { useEffect, useState } from 'react';
import { studentService } from '@/services/student/studentService';
import { useAuth } from '@/hooks/useAuth';
import ErrorState from '@/components/common/ErrorState';
const AVATAR_COLORS = ['#C9D4F5','#C6ECD9','#FDE8C8','#F5C9D4','#D4C9F5'];
const AVATAR_TEXT   = ['#5F73C4','#2E9767','#B45B2E','#C94874','#7B5FC4'];

function getInitials(name = '') {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || 'HS';
}

function MiniAvatar({ name, index = 0 }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      color: AVATAR_TEXT[index % AVATAR_TEXT.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700,
    }}>
      {getInitials(name)}
    </div>
  );
}


function AddClassModal({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setName(''); setError(''); } }, [open]);
  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) { setError('Vui lòng nhập tên lớp.'); return; }
    setSaving(true); setError('');
    try { await onSave(name.trim()); onClose(); }
    catch (e) { setError(e.message || 'Có lỗi xảy ra.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal t-modal-sm">
        <h3>🏫 Thêm lớp mới</h3>
        <div className="t-field">
          <label>Tên lớp *</label>
          <input type="text" value={name} placeholder=" "
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
        </div>
        {error && <div className="t-error">⚠️ {error}</div>}
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Thêm lớp'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ open, onClose, onSave, classes, initial }) {
  const [fullName, setFullName] = useState('');
  const [classId, setClassId]   = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (open) {
      setFullName(initial?.fullName || '');
      setClassId(initial?.classId || classes[0]?.id || '');
      setStartDate(initial?.startDate || '');
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSave = async () => {
    if (!fullName.trim()) { setError('Vui lòng nhập tên học sinh.'); return; }
    if (!classId) { setError('Vui lòng chọn lớp.'); return; }
    // CLEAN-04: validate startDate nếu có nhập
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setError('Ngày bắt đầu không hợp lệ (định dạng YYYY-MM-DD).'); return;
    }
    setSaving(true); setError('');
    try { await onSave({ fullName: fullName.trim(), classId, startDate }); onClose(); }
    catch (e) { setError(e.message || 'Có lỗi xảy ra.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal">
        <h3>{initial ? '✏️ Sửa học sinh' : '➕ Thêm học sinh'}</h3>
        <div className="t-field">
          <label>Họ và tên *</label>
          <input type="text" value={fullName} placeholder=" "
            onChange={e => setFullName(e.target.value)} autoFocus />
        </div>
        <div className="t-field-row">
          <div className="t-field">
            <label>Lớp *</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">-- Chọn lớp --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="t-field">
            <label>Ngày bắt đầu học</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
        </div>
        {error && <div className="t-error">⚠️ {error}</div>}
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : (initial ? 'Lưu thay đổi' : 'Thêm học sinh')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ open, name, onClose, onConfirm, deleting }) {
  if (!open) return null;
  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal t-modal-sm" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ margin: '0 0 8px' }}>Xóa học sinh?</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--t-muted)' }}>
          Bạn chắc chắn muốn xóa <b>{name}</b>? Hành động này không thể hoàn tác.
        </p>
        <div className="t-modal-foot" style={{ justifyContent: 'center' }}>
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const StudentsPage = () => {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [classes, setClasses]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [classFilter, setClassFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  useEffect(() => { if (teacherId) initData(); }, [teacherId]);

  const initData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [classList, studentList] = await Promise.all([
        studentService.getTeacherClasses(teacherId),
        studentService.getStudents(teacherId, {}),
      ]);
      setClasses(classList);
      setStudents(studentList);
    } catch (e) {
      setError('Không thể tải dữ liệu học sinh. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const reloadStudents = async () => {
    try {
      setLoading(true);
      const list = await studentService.getStudents(teacherId, { classId: classFilter, searchQuery });
      setStudents(list);
    } catch (e) {
      setError('Làm mới danh sách thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (newClass, newQuery) => {
    try {
      setLoading(true);
      const list = await studentService.getStudents(teacherId, { classId: newClass, searchQuery: newQuery });
      setStudents(list);
    } catch (e) {
      setError('Lọc dữ liệu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStudent = async (payload) => {
    if (editTarget) await studentService.updateStudent(editTarget.id, payload);
    else await studentService.createStudent(payload);
    await reloadStudents();
  };

  const handleSaveClass = async (name) => {
    await studentService.createClass(teacherId, name);
    const classList = await studentService.getTeacherClasses(teacherId);
    setClasses(classList);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      setDeleteError(null);
      await studentService.deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      await reloadStudents();
    } catch (e) {
      setDeleteError('Xóa học sinh thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const classCounts = classes.map(c => ({
    ...c,
    count: students.filter(s => s.classId === c.id).length,
  }));

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Quản lý học sinh</h1>
          <p>{students.length} học sinh · {classes.length} lớp</p>
        </div>
        <div className="t-gap8">
          <button className="t-btn t-btn-outline" onClick={() => setClassModalOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Thêm lớp
          </button>
          <button className="t-btn t-btn-primary" onClick={() => { setEditTarget(null); setStudentModalOpen(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="14" height="14">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Thêm học sinh
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={initData} compact />}
      {deleteError && <ErrorState message={deleteError} onRetry={() => setDeleteError(null)} compact />}

      {classCounts.length > 0 && (
        <div className="t-stat-grid" style={{ marginBottom: 16 }}>
          {classCounts.map(c => (
            <div className="t-stat-card" key={c.id}>
              <div className="t-stat-top"><span className="t-stat-label">{c.name}</span></div>
              <p className="t-stat-value">{c.count}
                <span style={{ fontSize: 13, color: 'var(--t-muted)', fontWeight: 400 }}> học sinh</span>
              </p>
            </div>
          ))}
          <div className="t-stat-card" style={{ background: 'var(--t-pink-50)', border: '1px dashed var(--t-border)' }}>
            <div className="t-stat-top"><span className="t-stat-label">Tổng cộng</span></div>
            <p className="t-stat-value">{students.length}
              <span style={{ fontSize: 13, color: 'var(--t-muted)', fontWeight: 400 }}> học sinh</span>
            </p>
          </div>
        </div>
      )}

      <div className="t-card">
        <div className="t-card-title">
          Danh sách học sinh
          <small>({students.length} học sinh)</small>
        </div>

        <div className="t-filter-bar">
          <select value={classFilter}
            onChange={e => { setClassFilter(e.target.value); handleFilter(e.target.value, searchQuery); }}>
            <option value="all">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="t-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input type="text" placeholder="Tìm học sinh..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); handleFilter(classFilter, e.target.value); }} />
          </div>
        </div>

        <div className="t-overflow-x">
          <table className="t-table">
            <thead>
              <tr>
                <th>Học sinh</th><th>Lớp</th><th>Ngày bắt đầu</th>
                <th>Ngày tham gia</th><th className="t-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--t-muted)' }}>Đang tải...</td></tr>
              ) : error ? (
                <tr><td colSpan={5}><div className="t-empty">Không thể tải dữ liệu.</div></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5}><div className="t-empty">Chưa có học sinh nào.</div></td></tr>
              ) : students.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <div className="t-name-cell">
                      <MiniAvatar name={s.fullName} index={i} />
                      <span style={{ fontWeight: 500 }}>{s.fullName}</span>
                    </div>
                  </td>
                  <td><span className="t-class-pill">{s.className}</span></td>
                  <td style={{ color: 'var(--t-muted)' }}>
                    {s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td style={{ color: 'var(--t-muted)' }}>{s.joinedAt}</td>
                  <td className="t-right">
                    <div className="t-actions">
                      <button className="t-btn t-btn-sm t-btn-outline"
                        onClick={() => { setEditTarget(s); setStudentModalOpen(true); }}>Sửa</button>
                      <button className="t-btn t-btn-sm t-btn-danger t-btn-icon"
                        aria-label="Xóa học sinh" onClick={() => setDeleteTarget(s)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddClassModal open={classModalOpen} onClose={() => setClassModalOpen(false)} onSave={handleSaveClass} />
      <StudentModal open={studentModalOpen} onClose={() => setStudentModalOpen(false)}
        onSave={handleSaveStudent} classes={classes} initial={editTarget} />
      <ConfirmDeleteModal open={!!deleteTarget} name={deleteTarget?.fullName}
        onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} deleting={deleting} />
    </div>
  );
};

export default StudentsPage;