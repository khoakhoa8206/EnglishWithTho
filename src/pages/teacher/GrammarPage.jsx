// src/pages/teacher/GrammarPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import mammoth from 'mammoth';
import { grammarService } from '../../services/grammarService';
import { aiGrammarService } from '../../services/ai/aiService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Loading    from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import GrammarDocxUploader    from '../../components/grammar/GrammarDocxUploader';
import GrammarQuestionReview  from '../../components/grammar/GrammarQuestionReview';

// ─── Đọc nội dung file ────────────────────────────────────────────────────────
async function readDocumentText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') return await file.text();
  if (ext === 'docx') {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    if (!result.value?.trim()) throw new Error('File .docx rỗng hoặc không có text.');
    return result.value;
  }
  throw new Error('File .doc (Word cũ) chưa được hỗ trợ. Vui lòng lưu dưới dạng .docx.');
}

// ─── Modal: Upload tài liệu ngữ pháp — Mammoth → HTML → render y chang ────────
function GrammarDocModal({ open, onClose, teacherId, onSaved }) {
  const [phase, setPhase]   = useState('upload');
  const [error, setError]   = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [title, setTitle]   = useState('');

  useEffect(() => {
    if (open) { setPhase('upload'); setError(''); setHtmlContent(''); setTitle(''); }
  }, [open]);

  if (!open) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['docx', 'txt'].includes(ext)) {
      setError('Chỉ chấp nhận .docx hoặc .txt'); return;
    }
    setError('');
    try {
      let html = '';
      if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default;
        const buf = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        html = result.value;
      } else {
        const text = await file.text();
        html = text.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('');
      }
      if (!html.trim()) { setError('File không có nội dung.'); return; }
      setTitle(file.name.replace(/\.[^.]+$/, ''));
      setHtmlContent(html);
      setPhase('preview');
    } catch (e) {
      setError('Đọc file thất bại: ' + e.message);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Vui lòng nhập tên tài liệu.'); return; }
    setPhase('saving');
    try {
      await grammarService.createGrammarDoc(teacherId, { title, html_content: htmlContent });
      onSaved();
    } catch (e) {
      setError(e.message); setPhase('preview');
    }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 700 }}>
        <h3>📖 Upload tài liệu ngữ pháp</h3>
        <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
          File được đọc bằng Mammoth và hiển thị y chang — không qua AI.
        </p>

        {phase === 'upload' && (
          <>
            <div className="t-field">
              <label>Chọn file (.docx hoặc .txt)</label>
              <input type="file" accept=".docx,.txt" onChange={handleFile} />
            </div>
            {error && <div className="t-error">⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={onClose}>Hủy</button>
            </div>
          </>
        )}

        {phase === 'preview' && (
          <>
            <div className="t-field">
              <label>Tên tài liệu</label>
              <input
                type="text" value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Unit 5 - Present Perfect"
              />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', margin: '0 0 8px' }}>
              XEM TRƯỚC NỘI DUNG
            </p>
            <div style={{
              border: '1px solid var(--t-border)', borderRadius: 10,
              padding: '14px 16px', maxHeight: 380, overflowY: 'auto',
              fontSize: 13.5, lineHeight: 1.8, marginBottom: 16,
            }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
            {error && <div className="t-error">⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setPhase('upload')}>← Chọn lại</button>
              <button className="t-btn t-btn-primary" onClick={handleSave}>💾 Lưu tài liệu</button>
            </div>
          </>
        )}

        {phase === 'saving' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--t-muted)' }}>Đang lưu...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Upload file cấu trúc ngữ pháp → AI đọc + ghi lại ─────────────────
function UploadGrammarModal({ open, onClose, teacherId, onSaved }) {
  const [phase, setPhase]     = useState('upload');
  const [error, setError]     = useState('');
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    if (open) { setPhase('upload'); setError(''); setLessons([]); }
  }, [open]);

  if (!open) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'docx', 'doc'].includes(ext)) {
      setError('Chỉ chấp nhận file .txt, .doc, .docx');
      return;
    }
    setError('');
    try {
      const text = await readDocumentText(file);
      await extractWithAI(text);
    } catch (e) {
      setError(e.message);
      setPhase('upload');
    }
  };

  const extractWithAI = async (text) => {
    if (!text) { setError('Không có nội dung để phân tích.'); return; }
    setPhase('extracting'); setError('');
    try {
      const parsed = await aiGrammarService.extractGrammarLessons(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI không tìm thấy điểm ngữ pháp nào trong tài liệu.');
      }
      setLessons(parsed.map((l, i) => ({ ...l, _id: i, _keep: true })));
      setPhase('review');
    } catch (e) {
      setError('AI trích xuất thất bại: ' + e.message);
      setPhase('upload');
    }
  };

  const handleSave = async () => {
    const toSave = lessons.filter(l => l._keep && l.title?.trim());
    if (toSave.length === 0) { setError('Không có bài nào để lưu.'); return; }
    setPhase('saving');
    try {
      for (const lesson of toSave) {
        await grammarService.createGrammarLesson(teacherId, {
          title:       lesson.title,
          structure:   lesson.structure   || '',
          explanation: lesson.explanation || '',
          examples:    lesson.examples    || '',
        });
      }
      onSaved(toSave.length);
      onClose();
    } catch (e) {
      setError(e.message); setPhase('review');
    }
  };

  const updateLesson = (id, field, val) =>
    setLessons(ls => ls.map(l => l._id === id ? { ...l, [field]: val } : l));

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 660 }}>
        <h3>📖 Upload cấu trúc ngữ pháp</h3>

        {phase === 'upload' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
              Upload file cấu trúc ngữ pháp (<b>.txt</b> hoặc <b>.docx</b>). AI sẽ đọc và ghi lại <b>y chang nội dung trong file</b>.
            </p>
            <div className="t-field">
              <label>Chọn file (.txt, .doc, .docx)</label>
              <input type="file" accept=".txt,.doc,.docx" onChange={handleFile} />
            </div>
            <div className="t-field">
              <label>Hoặc paste nội dung trực tiếp</label>
              <textarea
                rows={8} id="grammar-paste-area"
                placeholder={`VD:\nPresent Simple: S + V(s/es)\nDùng để diễn tả thói quen...`}
                style={{ fontFamily: 'monospace', fontSize: 12.5 }}
              />
            </div>
            {error && <div className="t-error">⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={onClose}>Hủy</button>
              <button className="t-btn t-btn-primary" onClick={() => {
                const text = document.getElementById('grammar-paste-area')?.value?.trim();
                if (!text) { setError('Vui lòng chọn file hoặc paste nội dung.'); return; }
                extractWithAI(text);
              }}>
                ✨ Phân tích bằng AI
              </button>
            </div>
          </>
        )}

        {phase === 'extracting' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
            <p style={{ fontSize: 14, color: 'var(--t-muted)' }}>AI đang phân tích tài liệu ngữ pháp...</p>
          </div>
        )}

        {phase === 'review' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 12 }}>
              AI tìm thấy <b>{lessons.length}</b> điểm ngữ pháp. Bỏ tick những bài không muốn lưu:
            </p>
            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {lessons.map(l => (
                <div key={l._id} style={{
                  border: `1px solid ${l._keep ? 'var(--t-border)' : '#eee'}`,
                  borderRadius: 10, padding: '12px 14px',
                  background: l._keep ? '#fff' : '#fafafa', opacity: l._keep ? 1 : 0.5,
                }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 8 }}>
                    <input type="checkbox" checked={l._keep}
                      onChange={e => updateLesson(l._id, '_keep', e.target.checked)}
                      style={{ marginTop: 3, flexShrink: 0 }} />
                    <input
                      value={l.title}
                      onChange={e => updateLesson(l._id, 'title', e.target.value)}
                      style={{ flex: 1, fontWeight: 700, fontSize: 14, border: 'none', borderBottom: '1px solid #eee', outline: 'none', background: 'transparent', fontFamily: 'inherit' }}
                    />
                  </label>
                  {l.structure && (
                    <p style={{ fontSize: 12.5, color: '#566B58', fontFamily: 'monospace', background: '#F5EDE0', padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 6 }}>
                      {l.structure}
                    </p>
                  )}
                  <p style={{ fontSize: 12.5, color: 'var(--t-muted)', margin: 0, lineHeight: 1.5 }}>
                    {l.explanation}
                  </p>
                </div>
              ))}
            </div>
            {error && <div className="t-error">⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setPhase('upload')}>← Thử lại</button>
              <button className="t-btn t-btn-primary" onClick={handleSave}>
                💾 Lưu {lessons.filter(l => l._keep).length} bài
              </button>
            </div>
          </>
        )}

        {phase === 'saving' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
            <p style={{ fontSize: 14, color: 'var(--t-muted)' }}>Đang lưu bài ngữ pháp...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF_OPTS = [
  { value: 'nhan_biet',    label: 'Nhận biết'    },
  { value: 'van_dung',     label: 'Vận dụng'     },
  { value: 'van_dung_cao', label: 'Vận dụng cao' },
];
const DIFF_LABEL = Object.fromEntries(DIFF_OPTS.map(d => [d.value, d.label]));

// ─── Modal Upload bài tập đã soạn sẵn ────────────────────────────────────────
// BUG FIX: toàn bộ component bị syntax error — viết lại đúng cấu trúc
function UploadSampleExerciseModal({ topics, onClose, onSaved }) {
  const [topicId,  setTopicId]  = useState('');
  const [step,     setStep]     = useState('upload'); // 'upload' | 'review'
  const [parsed,   setParsed]   = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleQuestionsGenerated = ({ questions, fileName }) => {
    setParsed({ questions, fileName });
    setUploadedFileName(fileName);
    setStep('review');
  };

  const handleReviewConfirmed = async (reviewedQuestions) => {
    if (!topicId) { setError('Chọn chủ đề ngữ pháp để lưu câu hỏi.'); return; }
    setLoading(true); setError('');
    try {
      await grammarService.bulkAddGrammarQuestions(topicId, reviewedQuestions);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể lưu câu hỏi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 640 }}>
        <h3>📋 Upload bài tập đã soạn sẵn</h3>
        <p style={{ fontSize: 13, color: 'var(--t-muted)' }}>
          File Word được đọc trực tiếp bằng Mammoth — không qua AI. Câu hỏi phải đánh số <b>1.</b> và có đáp án <b>A. B. C. D.</b>
        </p>

        {step === 'upload' && (
          <>
            <div className="t-field">
              <label>Chủ đề ngữ pháp để lưu *</label>
              <select value={topicId} onChange={e => setTopicId(e.target.value)}>
                <option value="">-- Chọn chủ đề --</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <GrammarDocxUploader onQuestionsGenerated={handleQuestionsGenerated} />
            {uploadedFileName && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#EDF3ED', border: '1px solid #A7C5A9',
                borderRadius: 8, padding: '8px 14px', marginTop: 12,
                fontSize: 13, color: '#2E7D32',
              }}>
                <span>✅</span>
                <span>Đã nhận file: <b>{uploadedFileName}</b></span>
                <button
                  onClick={() => { setParsed(null); setUploadedFileName(null); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#8A7F72', fontSize: 16 }}
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}

        {step === 'review' && parsed && (
          <GrammarQuestionReview
            questions={parsed.questions}
            onConfirm={handleReviewConfirmed}
            onBack={() => { setStep('upload'); setParsed(null); }}
          />
        )}

        {error && <div className="t-error" style={{ marginTop: 10 }}>⚠️ {error}</div>}
        {loading && <p style={{ textAlign: 'center', color: 'var(--t-muted)' }}>💾 Đang lưu...</p>}

        {step === 'upload' && (
          <div className="t-modal-foot">
            <button className="t-btn" onClick={onClose}>Hủy</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal giao bài tập mới ───────────────────────────────────────────────────
// BUG 5 FIX: Bỏ selector số câu và độ khó — giáo viên chỉ chọn bài là giao, AI tự quyết định
function NewAssignmentModal({ lesson, onClose, onSave }) {
  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 420 }}>
        <h3>✏️ Giao bài tập — {lesson?.title}</h3>
        <p style={{ fontSize: 13, color: 'var(--t-muted)', margin: '0 0 20px' }}>
          Bài tập sẽ được giao với toàn bộ câu hỏi trong chủ đề này. Học sinh sẽ làm theo thứ tự ngẫu nhiên.
        </p>
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn t-btn-primary"
            onClick={() => onSave({ lessonId: lesson?.id })}>
            Giao bài
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GrammarPage() {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [lessons,     setLessons]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showAddQ,    setShowAddQ]    = useState(false);
  const [showDocUpload,      setShowDocUpload]      = useState(false);
  const [showExerciseUpload, setShowExerciseUpload] = useState(false);
  const [showNewAssignment, setShowNewAssignment] = useState(false);

  useEffect(() => { if (teacherId) loadLessons(); }, [teacherId]);

  const loadLessons = async () => {
    try {
      setLoading(true); setError(null);
      const data = await grammarService.getGrammarLessons(teacherId);
      setLessons(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openTopic = async (lesson) => {
    const questions = await grammarService.getGrammarQuestions(lesson.id);
    setSelected({ ...lesson, questions });
  };

  const handlePublish = async (topicId, current) => {
    await grammarService.setPublished(topicId, !current);
    if (selected?.id === topicId) setSelected(s => ({ ...s, published: !current }));
    setLessons(ls => ls.map(l => l.id === topicId ? { ...l, published: !current } : l));
  };

  const handleDeleteLesson = async (topicId) => {
    if (!window.confirm('Xóa chủ đề ngữ pháp này?')) return;
    await grammarService.deleteGrammarLesson(topicId);
    setLessons(ls => ls.filter(l => l.id !== topicId));
    if (selected?.id === topicId) setSelected(null);
  };

  const handleDeleteQ = async (qId) => {
    if (!window.confirm('Xóa câu hỏi này?')) return;
    await grammarService.deleteGrammarQuestion(qId);
    setSelected(s => ({ ...s, questions: s.questions.filter(q => q.id !== qId) }));
  };

  const handleAddQ = async (form) => {
    const q = await grammarService.addGrammarQuestion(selected.id, form);
    setSelected(s => ({ ...s, questions: [...(s.questions || []), q] }));
  };

  const handleAssignExistingExercise = (ex) => {
    alert(`Giao bài: ${ex.title || 'Bài tập'} (kết nối AssignmentsPage với exercise id: ${ex.id})`);
  };

  if (loading) return <Loading fullPage />;
  if (error)   return <ErrorState message={error} onRetry={loadLessons} />;

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Ngữ pháp</h1>
          <p>Quản lý chủ đề và câu hỏi ngữ pháp</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="t-btn t-btn-primary" onClick={() => setShowAdd(true)}>
            + Thêm chủ đề
          </button>
          <button className="t-btn" onClick={() => setShowDocUpload(true)}>
            📖 Tài liệu
          </button>
          <button className="t-btn t-btn-primary" onClick={() => setShowExerciseUpload(true)}>
            📋 Bài tập
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.6fr' : '1fr', gap: 20 }}>
        {/* Danh sách chủ đề */}
        <div className="t-card" style={{ padding: 0 }}>
          {lessons.length === 0 ? (
            <EmptyState icon="✏️" title="Chưa có chủ đề" message="Thêm chủ đề ngữ pháp đầu tiên." />
          ) : (
            <div>
              {lessons.map(l => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--t-border)',
                  background: selected?.id === l.id ? 'var(--t-hover)' : 'transparent',
                  cursor: 'pointer',
                }} onClick={() => openTopic(l)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{l.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--t-muted)' }}>{l.structure || 'Chưa có cấu trúc'}</p>
                  </div>
                  <span className={`badge ${l.published ? 'badge-mint' : 'badge-lav'}`}>
                    {l.published ? 'Published' : 'Draft'}
                  </span>
                  <button className="t-btn t-btn-sm" style={{ flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); handlePublish(l.id, l.published); }}>
                    {l.published ? 'Ẩn' : 'Publish'}
                  </button>
                  <button className="t-btn t-btn-sm t-btn-danger t-btn-icon"
                    onClick={e => { e.stopPropagation(); handleDeleteLesson(l.id); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chi tiết + câu hỏi */}
        {selected && (
          <div className="t-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>{selected.title}</h3>
                {selected.structure && <p style={{ fontSize: 13, color: 'var(--t-muted)', margin: '4px 0 0' }}>Cấu trúc: {selected.structure}</p>}
              </div>
              <button className="t-btn t-btn-primary t-btn-sm" onClick={() => setShowAddQ(true)}>+ Thêm câu hỏi</button>
            </div>

            {selected.explanation && (
              <p style={{ fontSize: 13.5, color: 'var(--t-text)', background: 'var(--t-hover)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                {selected.explanation}
              </p>
            )}

            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', margin: '0 0 10px' }}>
              DANH SÁCH CÂU HỎI ({(selected.questions || []).length})
            </p>

            {(selected.questions || []).length === 0 ? (
              <EmptyState icon="❓" title="Chưa có câu hỏi" message='Nhấn "+ Thêm câu hỏi" để bắt đầu.' />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.questions.map((q, i) => (
                  <div key={q.id} style={{
                    background: 'var(--t-hover)', borderRadius: 10,
                    padding: '12px 14px', border: '1px solid var(--t-border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, flex: 1 }}>
                        {i + 1}. {q.question}
                      </p>
                      <button className="t-btn t-btn-sm t-btn-danger t-btn-icon"
                        onClick={() => handleDeleteQ(q.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>
                        </svg>
                      </button>
                    </div>
                    {q.options.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {q.options.map((opt, j) => (
                          <span key={j} style={{
                            fontSize: 12, padding: '3px 10px', borderRadius: 20,
                            background: opt === q.correct ? '#EDF3ED' : '#F5EDE0',
                            border: `1px solid ${opt === q.correct ? '#A7C5A9' : '#E0D3C0'}`,
                            color: opt === q.correct ? '#2E7D32' : '#4A3F35',
                            fontWeight: opt === q.correct ? 700 : 400,
                          }}>
                            {opt === q.correct ? '✓ ' : ''}{opt}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <span className={`badge ${q.question_type === 'multiple_choice' ? 'badge-lav' : 'badge-amber'}`} style={{ fontSize: 11 }}>
                        {q.question_type}
                      </span>
                      <span className="badge badge-pink" style={{ fontSize: 11 }}>
                        {DIFF_LABEL[q.difficulty] || q.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, borderTop: '1px solid var(--t-border)', paddingTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', marginBottom: 8 }}>GIAO BÀI TẬP</p>
              {selected?.exercises?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 4 }}>Chọn từ bài tập đã có:</p>
                  {selected.exercises.map((ex, idx) => (
                    <button key={idx} className="t-btn t-btn-sm" style={{ marginRight: 6, marginBottom: 6 }}
                      onClick={() => handleAssignExistingExercise(ex)}>
                      📄 {ex.title || `Bài tập ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
              <button className="t-btn t-btn-primary t-btn-sm" onClick={() => setShowNewAssignment(true)}>
                ✏️ Giao bài tập mới
              </button>
            </div>
          </div>
        )}
      </div>

      {showDocUpload && (
        <GrammarDocModal
          open={showDocUpload}
          onClose={() => setShowDocUpload(false)}
          teacherId={teacherId}
          onSaved={() => { loadLessons(); setShowDocUpload(false); }}
        />
      )}

      {showExerciseUpload && (
        <UploadSampleExerciseModal
          topics={lessons}
          onClose={() => setShowExerciseUpload(false)}
          onSaved={() => { selected && openTopic(selected); setShowExerciseUpload(false); }}
        />
      )}

      {showAdd && (
        <AddLessonModal
          onClose={() => setShowAdd(false)}
          onSave={async (form) => {
            const data = await grammarService.createGrammarLesson(teacherId, form);
            setLessons(ls => [{
              id:          data.id,
              title:       data.name,
              structure:   data.structure   || '',
              explanation: data.explanation || '',
              published:   false,
              createdAt:   new Date(data.created_at).toLocaleDateString('vi-VN'),
            }, ...ls]);
            setShowAdd(false);
          }}
        />
      )}

      {showAddQ && selected && (
        <AddQuestionModal
          onClose={() => setShowAddQ(false)}
          onSave={async (form) => { await handleAddQ(form); setShowAddQ(false); }}
        />
      )}

      {showNewAssignment && selected && (
        <NewAssignmentModal
          lesson={selected}
          onClose={() => setShowNewAssignment(false)}
          onSave={(data) => {
            alert(`Đã giao bài tập cho chủ đề: ${selected?.title}`);
            setShowNewAssignment(false);
          }}
        />
      )}
    </div>
  );
}

// ─── AddLessonModal ───────────────────────────────────────────────────────────
function AddLessonModal({ onClose, onSave }) {
  const [form, setForm]     = useState({ title: '', structure: '', explanation: '', examples: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Vui lòng nhập tên chủ đề.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); }
    catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal">
        <h3>✏️ Thêm chủ đề ngữ pháp</h3>
        <div className="t-field">
          <label>Tên chủ đề *</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} autoFocus placeholder="VD: Present Simple" />
        </div>
        <div className="t-field">
          <label>Cấu trúc</label>
          <input type="text" value={form.structure} onChange={e => set('structure', e.target.value)} placeholder="VD: S + V(s/es) + O" />
        </div>
        <div className="t-field">
          <label>Giải thích</label>
          <textarea rows={3} value={form.explanation} onChange={e => set('explanation', e.target.value)} placeholder="Mô tả ngắn về chủ đề..." />
        </div>
        <div className="t-field">
          <label>Ví dụ</label>
          <textarea rows={2} value={form.examples} onChange={e => set('examples', e.target.value)} placeholder="VD: She goes to school every day." />
        </div>
        {error && <div className="t-error">⚠️ {error}</div>}
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddQuestionModal ─────────────────────────────────────────────────────────
function AddQuestionModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    question: '', options: ['', '', '', ''], correct: '',
    difficulty: 'nhan_biet', question_type: 'multiple_choice',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setOpt = (i, v) => setForm(f => {
    const opts = [...f.options]; opts[i] = v; return { ...f, options: opts };
  });

  const handleSave = async () => {
    if (!form.question.trim()) { setError('Vui lòng nhập câu hỏi.'); return; }
    const validOpts = form.options.filter(o => o.trim());
    if (form.question_type === 'multiple_choice') {
      if (validOpts.length < 2) { setError('Cần ít nhất 2 đáp án.'); return; }
      if (!form.correct.trim()) { setError('Vui lòng chọn đáp án đúng.'); return; }
      if (!validOpts.includes(form.correct)) { setError('Đáp án đúng phải nằm trong danh sách.'); return; }
    }
    setSaving(true); setError('');
    try { await onSave({ ...form, options: validOpts }); }
    catch (e) { setError(e.message); setSaving(false); }
  };

  const isMultiple = form.question_type === 'multiple_choice';

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 520 }}>
        <h3>❓ Thêm câu hỏi</h3>
        <div className="t-field-row">
          <div className="t-field">
            <label>Loại câu hỏi</label>
            <select value={form.question_type} onChange={e => setForm(f => ({ ...f, question_type: e.target.value, correct: '' }))}>
              <option value="multiple_choice">Trắc nghiệm</option>
              <option value="fill_in_blank">Điền từ</option>
            </select>
          </div>
          <div className="t-field">
            <label>Độ khó</label>
            <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
              {DIFF_OPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <div className="t-field">
          <label>Câu hỏi *</label>
          <textarea rows={2} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} autoFocus placeholder="Nhập câu hỏi..." />
        </div>
        {isMultiple && (
          <>
            <div className="t-field">
              <label>Các đáp án (tối thiểu 2)</label>
              {form.options.map((opt, i) => (
                <input key={i} type="text" value={opt}
                  onChange={e => setOpt(i, e.target.value)}
                  placeholder={`Đáp án ${i + 1}`}
                  style={{ marginBottom: 6 }} />
              ))}
            </div>
            <div className="t-field">
              <label>Đáp án đúng *</label>
              <select value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))}>
                <option value="">-- Chọn đáp án đúng --</option>
                {form.options.filter(o => o.trim()).map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {!isMultiple && (
          <div className="t-field">
            <label>Đáp án đúng *</label>
            <input type="text" value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))} placeholder="Nhập đáp án đúng..." />
          </div>
        )}
        {error && <div className="t-error">⚠️ {error}</div>}
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Thêm câu hỏi'}
          </button>
        </div>
      </div>
    </div>
  );
}