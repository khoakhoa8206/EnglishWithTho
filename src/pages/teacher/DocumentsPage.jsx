// src/pages/teacher/DocumentsPage.jsx
import { useState, useEffect } from 'react';
import { studentService } from '../../services/student/studentService';
import { teacherDocumentService } from '../../services/teacherDocumentService';
import { fileArchiveService } from '../../services/fileArchiveService';
import FileArchiveDrawer from '../../components/common/FileArchiveDrawer';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝',
  mp3: '🎵', wav: '🎵', m4a: '🎵',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
};
const getIcon = (ext) => FILE_ICONS[ext?.toLowerCase()] || '📎';
const fmtSize = (bytes) => bytes < 1024 * 1024
  ? `${(bytes / 1024).toFixed(0)} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4',
  'image/jpeg', 'image/png', 'image/webp',
];
const MAX_SIZE_MB = 20;

export default function TeacherDocumentsPage() {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null); // { name, htmlContent }
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => { if (teacherId) loadDocs(); }, [teacherId]);

  const loadDocs = async () => {
    try {
      setLoading(true); setError(null);
      const data = await teacherDocumentService.getDocuments(teacherId);
      setDocs(data);
    } catch (e) {
      setError('Không thể tải danh sách tài liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Xóa tài liệu "${doc.title}"?`)) return;
    try {
      await teacherDocumentService.deleteDocument(doc.id, doc.fileUrl);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (e) {
      alert('Xóa thất bại: ' + e.message);
    }
  };

  const handlePreviewWord = async (doc) => {
    try {
      const res = await fetch(doc.fileUrl);
      const buf = await res.arrayBuffer();
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.convertToHtml({ arrayBuffer: buf });
      setPreviewDoc({ name: doc.title, htmlContent: result.value });
    } catch (e) {
      console.error('Không thể đọc Word:', e);
      alert('Không thể preview file này.');
    }
  };

  if (loading) return <Loading fullPage />;
  if (error)   return <ErrorState message={error} onRetry={loadDocs} />;

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Tài liệu</h1>
          <p>Upload PDF, Word, MP3, ảnh để chia sẻ với học sinh</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowArchive(true)}
            style={{
              padding: '9px 18px', borderRadius: 10,
              border: '1px solid #566B58', background: '#fff',
              color: '#566B58', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🗂️ Kho lưu trữ
          </button>
          <button className="t-btn t-btn-primary" onClick={() => setShowModal(true)}>
            + Upload tài liệu
          </button>
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon="📁"
          title="Chưa có tài liệu"
          message='Nhấn "+ Upload tài liệu" để bắt đầu.'
        />
      ) : (
        <div className="t-card" style={{ padding: 0 }}>
          <table className="t-table">
            <thead>
              <tr>
                <th>Tài liệu</th>
                <th>Loại</th>
                <th>Ngày upload</th>
                <th className="t-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{getIcon(doc.fileType)}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{doc.title}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 10, background: 'var(--t-hover)',
                      color: 'var(--t-muted)', textTransform: 'uppercase',
                    }}>
                      {doc.fileType || '—'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--t-muted)' }}>{doc.createdAt}</td>
                  <td className="t-right" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {doc.fileType === 'docx' && (
                      <button
                        className="t-btn t-btn-sm"
                        onClick={() => handlePreviewWord(doc)}
                      >
                        👁️ Xem
                      </button>
                    )}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="t-btn t-btn-sm t-btn-outline"
                    >
                      Tải về
                    </a>
                    <button
                      className="t-btn t-btn-sm t-btn-danger"
                      onClick={() => handleDelete(doc)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewDoc && (
        <div className="t-card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>📄 Preview: {previewDoc.name}</h3>
            <button className="t-btn t-btn-sm" onClick={() => setPreviewDoc(null)}>✕ Đóng</button>
          </div>
          <div
            style={{ maxHeight: 500, overflowY: 'auto', fontSize: 14, lineHeight: 1.7, padding: '8px 4px' }}
            dangerouslySetInnerHTML={{ __html: previewDoc.htmlContent }}
          />
        </div>
      )}

      {showModal && (
        <UploadModal
          teacherId={teacherId}
          onClose={() => setShowModal(false)}
          onSave={(newDoc) => {
            setDocs(prev => [{
              id:        newDoc.id,
              title:     newDoc.title,
              fileUrl:   newDoc.file_url,
              fileType:  newDoc.file_type,
              createdAt: new Date(newDoc.created_at).toLocaleDateString('vi-VN'),
            }, ...prev]);
            setShowModal(false);
          }}
        />
      )}

      {showArchive && (
        <>
          <div
            onClick={() => setShowArchive(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }}
          />
          <FileArchiveDrawer
            teacherId={teacherId}
            section="document"
            onClose={() => setShowArchive(false)}
          />
        </>
      )}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ teacherId, onClose, onSave }) {
  const [title, setTitle]     = useState('');
  const [file, setFile]       = useState(null);
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    studentService.getTeacherClasses(teacherId)
      .then(setClasses)
      .catch(() => {});
  }, [teacherId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Chỉ chấp nhận PDF, Word, MP3, WAV, JPG, PNG.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File tối đa ${MAX_SIZE_MB}MB.`);
      return;
    }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSave = async () => {
    if (!file)         { setError('Vui lòng chọn file.'); return; }
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    setSaving(true); setError('');
    try {
      const data = await teacherDocumentService.uploadDocument(teacherId, {
        title: title.trim(), file, classId: classId || null,
      });
      // MỤC 5C: tự động lưu vào kho lưu trữ
      try {
        await fileArchiveService.addFile(teacherId, {
          section: 'document',
          displayName: file.name,
          title: title.trim(),
          fileUrl: data.file_url,
          fileType: data.file_type || file.name.split('.').pop().toLowerCase(),
          fileSize: file.size,
        });
      } catch (archiveErr) {
        console.error('Archive save failed:', archiveErr);
      }
      onSave(data);
    } catch (e) {
      setError('Upload thất bại: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 480 }}>
        <h3>📁 Upload tài liệu</h3>

        <div className="t-field">
          <label>File *</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.mp3,.wav,.m4a,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
          />
          <small style={{ color: 'var(--t-muted)' }}>
            PDF, Word, MP3, WAV, JPG, PNG — tối đa {MAX_SIZE_MB}MB
          </small>
        </div>

        <div className="t-field">
          <label>Tiêu đề *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="VD: Bài đọc Unit 3"
            autoFocus
          />
        </div>

        <div className="t-field">
          <label>Chia sẻ với lớp</label>
          <select value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">— Tất cả lớp —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {error && <div className="t-error">⚠️ {error}</div>}

        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose} disabled={saving}>Hủy</button>
          <button
            className="t-btn t-btn-primary"
            onClick={handleSave}
            disabled={saving || !file}
          >
            {saving ? 'Đang upload...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}