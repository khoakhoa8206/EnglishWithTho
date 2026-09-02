// src/pages/teacher/ListeningPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { listeningService } from '../../services/listeningService';
import { useAuth }          from '@/hooks/useAuth';
import Loading    from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import AudioPlayer from '@/components/common/AudioPlayer';
import { studentService } from '../../services/student/studentService';
import { convertDocxToHtml, parseListeningHtml, extractAnswerKey } from '../../services/docxParserService';

// ─── Inline: ListeningDocxUploader ───────────────────────────────────────────
function ListeningDocxUploader({ onExercisesGenerated, onScriptExtracted }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error,        setError]        = useState(null);
  const [preview,      setPreview]      = useState(null);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    setError(null);
    setPreview(null);
    if (!file || !file.name.toLowerCase().endsWith('.docx')) {
      setError('Chỉ chấp nhận file .docx');
      return;
    }
    setIsProcessing(true);
    try {
      const html      = await convertDocxToHtml(file);
      const exercises = parseListeningHtml(html);
      const answerKey = extractAnswerKey(html); // [CHANGE-03]

      // Tự fill đáp án vào từng câu hỏi
      const exercisesWithAnswers = exercises.map(ex => ({
        ...ex,
        questions: ex.questions.map(q => ({
          ...q,
          correct_answer: answerKey[String(q.number)] || q.correct_answer || '',
          _auto_filled: !!answerKey[String(q.number)],
        })),
      }));

      const total     = exercisesWithAnswers.reduce((s, ex) => s + ex.questions.length, 0);
      const filled    = exercisesWithAnswers.reduce((s, ex) => s + ex.questions.filter(q => q._auto_filled).length, 0);
      if (total === 0) {
        setError('Không tìm thấy câu hỏi. Đảm bảo file có dạng: (1) _____ trong script.');
        return;
      }
      // Nếu tất cả câu có đáp án → tự xác nhận, không cần review
      if (filled === total && total > 0) {
        onExercisesGenerated({ exercises: exercisesWithAnswers, fileName: file.name, autoFilled: true });
      } else {
        setPreview({ exercises: exercisesWithAnswers, totalQuestions: total, fileName: file.name });
      }
    } catch (err) {
      setError('Không thể đọc file: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleConfirm = () => {
    if (!preview) return;
    onExercisesGenerated({ exercises: preview.exercises, fileName: preview.fileName, autoFilled: false });
    if (onScriptExtracted) {
      onScriptExtracted(preview.exercises.map(ex => ex.script).join('\n\n'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        disabled={isProcessing}
      />
      <small style={{ color: 'var(--t-muted)' }}>
        {isProcessing
          ? '⏳ Đang phân tích script...'
          : 'Câu hỏi phải có dạng (1) ____ trong script. Không cần AI.'}
      </small>
      {error && <div className="t-error">⚠️ {error}</div>}

      {preview && !isProcessing && (
        <div style={{ background: '#EDF3ED', border: '1px solid #A7C5A9', borderRadius: 8, padding: '10px 12px' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: '#1B5E20' }}>
            ✅ {preview.exercises.length} Exercise — {preview.totalQuestions} câu — {preview.fileName}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="t-btn t-btn-sm" onClick={() => setPreview(null)}>Chọn lại</button>
            <button className="t-btn t-btn-sm" style={{ background: '#2E9767', color: '#fff' }} onClick={handleConfirm}>
              Dùng {preview.totalQuestions} câu →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline: ListeningAnswerReview ────────────────────────────────────────────
function ListeningAnswerReview({ exercises: initial, onConfirm, onBack }) {
  const [exercises, setExercises] = useState(initial);

  const updateAnswer = (exNumber, qNumber, value) =>
    setExercises(exs => exs.map(ex =>
      ex.number === exNumber
        ? { ...ex, questions: ex.questions.map(q => q.number === qNumber ? { ...q, correct_answer: value } : q) }
        : ex
    ));

  const totalQ   = exercises.reduce((s, ex) => s + ex.questions.length, 0);
  const answered = exercises.reduce((s, ex) => s + ex.questions.filter(q => q.correct_answer?.trim()).length, 0);
  const allDone  = answered === totalQ && totalQ > 0;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600 }}>
          Điền đáp án cho từng chỗ trống
        </p>
        <div style={{ height: 5, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, background: '#2E9767',
            width: `${totalQ ? (answered / totalQ) * 100 : 0}%`, transition: 'width .3s',
          }} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--t-muted)', margin: '3px 0 0' }}>
          {answered}/{totalQ} câu đã điền
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 400, overflowY: 'auto', marginBottom: 14 }}>
        {exercises.map(ex => (
          <div key={ex.number}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13 }}>Exercise {ex.number}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ex.questions.map(q => (
                <div key={q.number} style={{
                  background: q.correct_answer?.trim() ? '#EDF3ED' : 'var(--t-hover)',
                  border: `1px solid ${q.correct_answer?.trim() ? '#A7C5A9' : 'var(--t-border)'}`,
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                    <b>({q.number})</b> {q.context.slice(0, 120)}{q.context.length > 120 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Đáp án:</label>
                    <input
                      type="text"
                      value={q.correct_answer || ''}
                      onChange={e => updateAnswer(ex.number, q.number, e.target.value)}
                      placeholder="Nhập đáp án..."
                      style={{
                        flex: 1, fontSize: 13, padding: '5px 10px',
                        borderRadius: 6, border: '1px solid var(--t-border)',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="t-modal-foot">
        <button className="t-btn" onClick={onBack}>← Quay lại</button>
        <button
          className="t-btn t-btn-primary"
          onClick={() => onConfirm(exercises)}
          disabled={!allDone}
        >
          {allDone ? `Xác nhận ${totalQ} câu →` : `Còn ${totalQ - answered} câu chưa điền`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ListeningPage() {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [materials, setMaterials] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);

  useEffect(() => { if (teacherId) loadMaterials(); }, [teacherId]);

  const loadMaterials = async () => {
    try {
      setLoading(true); setError(null);
      const data = await listeningService.getListeningLessons(teacherId);
      setMaterials(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa tài liệu nghe này?')) return;
    await listeningService.deleteListeningLesson(id);
    setMaterials(m => m.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const openMaterial = async (item) => {
    try {
      const data = await listeningService.getFullById(item.id);
      setSelected(data);
    } catch { /* giữ nguyên selected nếu lỗi */ }
  };

  if (loading) return <Loading fullPage />;
  if (error)   return <ErrorState message={error} onRetry={loadMaterials} />;

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Listening</h1>
          <p>Upload MP3 và script để tạo bài nghe cho học sinh</p>
        </div>
        <button className="t-btn t-btn-primary" onClick={() => setShowAdd(true)}>+ Upload tài liệu</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.8fr' : '1fr', gap: 20 }}>
        {/* Danh sách */}
        <div className="t-card" style={{ padding: 0 }}>
          {materials.length === 0 ? (
            <EmptyState icon="🎧" title="Chưa có tài liệu" message='Nhấn "+ Upload tài liệu" để bắt đầu.' />
          ) : (
            materials.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px', borderBottom: '1px solid var(--t-border)',
                background: selected?.id === m.id ? 'var(--t-hover)' : 'transparent',
                cursor: 'pointer',
              }} onClick={() => openMaterial(m)}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>🎧</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--t-muted)' }}>
                    {m.hasScript ? '📄 Có script' : '❌ Chưa có script'} · {m.createdAt}
                  </p>
                </div>
                <button className="t-btn t-btn-sm t-btn-danger t-btn-icon"
                  onClick={e => { e.stopPropagation(); handleDelete(m.id); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Chi tiết */}
        {selected && (
          <ListeningDetail
            material={selected}
            teacherId={teacherId}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {showAdd && (
        <AddMaterialModal
          teacherId={teacherId}
          onClose={() => setShowAdd(false)}
          onSave={async (form) => {
            const data = await listeningService.createListeningLesson(teacherId, {
              title: form.title,
              audioUrl: form.audioUrl,
              script: form.script,
            });
            
            if (form.questions && form.questions.length > 0) {
              await listeningService.saveGeneratedQuestions(
                data.id, teacherId, form.title, form.questions, form.classId || null, 'draft'
              );
              alert(`✅ Đã lưu nháp ${form.questions.length} câu hỏi. Hãy vào tab "Bài tập" (Assignments) để kiểm tra và Publish cho học sinh nhé!`);
            }
            
            setMaterials(m => [{
              id: data.id, title: data.title,
              audioUrl: data.audio_url || '',
              hasScript: !!data.script,
              createdAt: new Date(data.created_at).toLocaleDateString('vi-VN'),
            }, ...m]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

// ─── ListeningDetail ──────────────────────────────────────────────────────────
function ListeningDetail({ material, teacherId, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loadingQ,  setLoadingQ]  = useState(true);
  const [classId,   setClassId]   = useState('');
  const [classes,   setClasses]   = useState([]);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    listeningService.getAssignmentQuestions(material.id, teacherId)
      .then(allQ => setQuestions(allQ))
      .finally(() => setLoadingQ(false));
    studentService.getTeacherClasses(teacherId).then(setClasses).catch(() => {});
  }, [material.id, teacherId]);

  const handleSaveQuestions = async (flatQuestions) => {
    if (!classId) { setSaveError('Vui lòng chọn lớp trước khi lưu.'); return; }
    try {
      await listeningService.saveGeneratedQuestions(
        material.id, teacherId, material.title, flatQuestions, classId
      );
      const saved = await listeningService.getAssignmentQuestions(material.id, teacherId);
      setQuestions(saved);
      alert('✅ Đã lưu và publish bài tập cho học sinh!');
    } catch (e) {
      setSaveError('Lưu thất bại: ' + e.message);
    }
  };

  return (
    <div className="t-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{material.title}</h3>
        <button className="t-btn t-btn-sm" onClick={onClose}>✕ Đóng</button>
      </div>

      {material.audio_url && (
        <div style={{ marginBottom: 16 }}>
          <AudioPlayer src={material.audio_url} title={material.title} />
        </div>
      )}

      {material.script && (
        <div style={{ background: 'var(--t-hover)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, maxHeight: 140, overflowY: 'auto' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--t-muted)' }}>NỘI DUNG SCRIPT</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{material.script}</p>
        </div>
      )}

      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--t-muted)' }}>
        CÂU HỎI ({questions.length})
      </p>

      {saveError && <div className="t-error" style={{ marginBottom: 10 }}>⚠️ {saveError}</div>}

      {loadingQ ? <Loading /> : questions.length === 0 ? (
        <EmptyState icon="❓" title="Chưa có câu hỏi"
          message={material.script ? 'Upload file bài tập mới để tạo câu hỏi.' : 'Thêm script trước.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.some(q => q._new) && (
            <>
              <div style={{
                background: '#FFF8E6', border: '1px solid #F0D080',
                borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#7A5C00',
              }}>
                👁️ <b>Xem trước.</b> Chọn lớp và lưu để giao bài cho học sinh.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={classId}
                  onChange={e => setClassId(e.target.value)}
                  style={{ fontSize: 12.5, borderRadius: 8, border: '1px solid var(--t-border)', padding: '4px 8px', flex: 1 }}
                >
                  <option value="">— Chọn lớp —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  className="t-btn t-btn-sm"
                  style={{ background: '#2E9767', color: '#fff' }}
                  onClick={() => handleSaveQuestions(questions)}
                >
                  💾 Lưu & Publish
                </button>
              </div>
            </>
          )}

          {questions.map((q, i) => (
            <div key={q.id || i} style={{
              background: q._new ? '#EDF3ED' : 'var(--t-hover)',
              borderRadius: 10, padding: '12px 14px',
              border: `1px solid ${q._new ? '#A7C5A9' : 'var(--t-border)'}`,
            }}>
              {q._new && (
                <span style={{ fontSize: 10, background: '#2E9767', color: '#fff', padding: '1px 8px', borderRadius: 10, marginBottom: 6, display: 'inline-block' }}>
                  XEM TRƯỚC
                </span>
              )}
              <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 600 }}>
                {i + 1}. {q.question}
              </p>
              {q.question_type === 'multiple_choice' && (() => {
                const opts = Array.isArray(q.options) ? q.options : (() => { try { return JSON.parse(q.options); } catch { return []; } })();
                return opts.map((opt, j) => (
                  <span key={j} style={{
                    display: 'inline-block', fontSize: 12, margin: '2px 6px 2px 0',
                    padding: '2px 10px', borderRadius: 20,
                    background: opt === q.correct ? '#EDF3ED' : '#F5EDE0',
                    border: `1px solid ${opt === q.correct ? '#A7C5A9' : '#E0D3C0'}`,
                    fontWeight: opt === q.correct ? 700 : 400,
                  }}>
                    {opt === q.correct ? '✓ ' : ''}{opt}
                  </span>
                ));
              })()}
              {(q.question_type === 'fill_in_blank' || q.question_type === 'dictation') && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#2E9767' }}>
                  Đáp án: <b>{q.correct}</b>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AddMaterialModal ─────────────────────────────────────────────────────────
function AddMaterialModal({ teacherId, onClose, onSave }) {
  const [form, setForm]                   = useState({ title: '', audioUrl: '', script: '' });
  const [saving, setSaving]               = useState(false);
  const [error,  setError]                = useState('');
  const [uploading, setUploading]         = useState(false);
  const [classId, setClassId]             = useState('');
  const [classes, setClasses]             = useState([]);
  // Mammoth flow
  const [docxExercises, setDocxExercises] = useState(null);
  const [reviewStep,    setReviewStep]    = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    studentService.getTeacherClasses(teacherId).then(setClasses).catch(() => {});
  }, [teacherId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setError('Chỉ chấp nhận file audio.'); return; }
    if (file.size > 50 * 1024 * 1024) {
      setError(`File quá lớn. Tối đa 50MB (hiện tại: ${(file.size / 1024 / 1024).toFixed(1)}MB).`);
      return;
    }
    setUploading(true); setError('');
    try {
      const publicUrl = await listeningService.uploadAudio(teacherId, file);
      set('audioUrl', publicUrl);
    } catch (e) {
      setError('Upload thất bại: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  // Mammoth: nhận exercises từ ListeningDocxUploader
  // Nếu autoFilled=true (tất cả đã có đáp án) → bỏ qua review, flatten luôn
  const handleExercisesGenerated = ({ exercises, autoFilled }) => {
    if (autoFilled) {
      // Flatten thẳng, không cần review
      const questions = [];
      let order = 0;
      for (const ex of exercises) {
        for (const q of ex.questions) {
          questions.push({
            question:      q.context,
            question_type: 'fill_in_blank',
            options:       [],
            correct:       q.correct_answer || '',
            sort_order:    order++,
          });
        }
      }
      setPreviewQuestions(questions);
      const script = exercises.map(ex => ex.script).join('\n\n');
      if (script.trim()) set('script', script);
    } else {
      setDocxExercises(exercises);
      setReviewStep(true);
      setPreviewQuestions([]);
    }
  };

  // Mammoth: sau khi teacher điền đáp án → flatten thành previewQuestions
  const handleAnswerReviewConfirmed = (reviewedExercises) => {
    const questions = [];
    let order = 0;
    for (const ex of reviewedExercises) {
      for (const q of ex.questions) {
        questions.push({
          question:      q.context,
          question_type: 'fill_in_blank',
          options:       [],
          correct:       q.correct_answer || '',
          sort_order:    order++,
        });
      }
    }
    setPreviewQuestions(questions);
    setReviewStep(false);
    setDocxExercises(null);
    // Lưu script từ exercises
    const script = reviewedExercises.map(ex => ex.script).join('\n\n');
    if (script.trim()) set('script', script);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    if (previewQuestions.length > 0 && !classId) {
      setError('Vui lòng chọn lớp để giao bài tập cho học sinh.'); return;
    }
    setSaving(true); setError('');
    try { await onSave({ ...form, questions: previewQuestions, classId: classId || null }); }
    catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 540 }}>
        <h3>🎧 Upload tài liệu nghe</h3>

        {/* Tiêu đề */}
        <div className="t-field">
          <label>Tiêu đề *</label>
          <input
            type="text" value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus placeholder="VD: Listening Test - Unit 5"
          />
        </div>

        {/* Upload MP3 */}
        <div className="t-field">
          <label>File MP3</label>
          <input type="file" accept="audio/*" onChange={handleUpload} disabled={uploading} />
          {uploading && <small style={{ color: 'var(--t-muted)' }}>Đang upload...</small>}
          {form.audioUrl && <small style={{ color: '#2E9767' }}>✓ Upload thành công</small>}
        </div>

        {/* URL audio */}
        <div className="t-field">
          <label>{form.audioUrl ? 'Hoặc nhập URL audio' : 'URL audio (nếu không upload)'}</label>
          <input
            type="url" value={form.audioUrl}
            onChange={e => set('audioUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Chọn lớp */}
        <div className="t-field">
          <label>Giao cho lớp</label>
          <select value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">— Chọn lớp (bắt buộc nếu có bài tập) —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Upload file bài tập — Mammoth flow */}
        {!reviewStep ? (
          <div className="t-field">
            <label>📋 Upload file bài tập (.docx) — không cần AI</label>
            <ListeningDocxUploader
              onExercisesGenerated={handleExercisesGenerated}
              onScriptExtracted={(script) => { if (script.trim()) set('script', script); }}
            />
            {previewQuestions.length > 0 && (
              <small style={{ color: '#2E9767', display: 'block', marginTop: 6 }}>
                ✓ {previewQuestions.length} câu hỏi đã sẵn sàng — xem trước bên dưới.
              </small>
            )}
          </div>
        ) : docxExercises && (
          <div style={{ border: '1px solid var(--t-border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13 }}>
              📝 Điền đáp án cho bài tập
            </p>
            <ListeningAnswerReview
              exercises={docxExercises}
              onConfirm={handleAnswerReviewConfirmed}
              onBack={() => { setReviewStep(false); setDocxExercises(null); }}
            />
          </div>
        )}

        {/* Preview câu hỏi đã xác nhận */}
        {previewQuestions.length > 0 && !reviewStep && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--t-muted)' }}>
              XEM TRƯỚC CÂU HỎI ({previewQuestions.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {previewQuestions.map((q, i) => (
                <div key={i} style={{
                  background: '#EDF3ED', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid #A7C5A9', fontSize: 13,
                }}>
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 10, marginBottom: 5,
                    display: 'inline-block', fontWeight: 700,
                    background: '#E8F0FF', color: '#3355AA',
                  }}>
                    ✏️ Điền vào chỗ trống
                  </span>
                  <p style={{ margin: '4px 0', fontWeight: 600 }}>{i + 1}. {q.question}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#2E9767' }}>
                    Đáp án: <b>{q.correct}</b>
                  </p>
                </div>
              ))}
            </div>
            <button
              className="t-btn t-btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => { setPreviewQuestions([]); setDocxExercises(null); }}
            >
              Xóa và chọn file khác
            </button>
          </div>
        )}

        {/* Script thủ công */}
        <div className="t-field">
          <label>Nội dung bài/script</label>
          <textarea
            rows={4} value={form.script}
            onChange={e => set('script', e.target.value)}
            placeholder="Dán script bài nghe vào đây (hoặc tự động điền khi upload file)..."
          />
        </div>

        {error && <div className="t-error">⚠️ {error}</div>}
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button
            className="t-btn t-btn-primary"
            onClick={handleSave}
            disabled={saving || uploading || reviewStep}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}