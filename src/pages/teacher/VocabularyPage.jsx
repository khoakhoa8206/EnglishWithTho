// src/pages/teacher/VocabularyPage.jsx
import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { vocabularyService } from '../../services/vocabularyService';
import { convertDocxToHtml, parseVocabExerciseHtml } from '../../services/docxParserService';
import { aiVocabularyService } from '../../services/ai/aiService';
import { useAuth } from '@/hooks/useAuth';
import ErrorState from '@/components/common/ErrorState';
// BUG 6: import thêm
import VocabPart4Preview from '@/components/vocabulary/VocabPart4Preview';

// ─── Modal tạo topic ──────────────────────────────────────────────────────────
function CreateSetModal({ open, onClose, onSave }) {
  const [title, setTitle]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { if (open) { setTitle(''); setError(''); } }, [open]);
  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) { setError('Vui lòng nhập tên bộ từ.'); return; }
    setSaving(true); setError('');
    try { await onSave({ title: title.trim() }); onClose(); }
    catch (e) { setError(e.message || 'Có lỗi xảy ra.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal">
        <h3>📚 Tạo bộ từ vựng mới</h3>
        <div className="t-field">
          <label>Tên bộ từ *</label>
          <input
            type="text" value={title} placeholder="VD: Unit 1 - Family & Friends"
            onChange={e => setTitle(e.target.value)} autoFocus
          />
        </div>
        {error && <div className="t-error">⚠️ {error}</div>}
        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn t-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang tạo...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Đọc nội dung file ────────────────────────────────────────────────────────
async function readFileAsText(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt') {
    return await file.text();
  }

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (!result.value || !result.value.trim()) {
      throw new Error('File .docx không có nội dung text. Vui lòng kiểm tra lại file.');
    }
    return result.value;
  }

  if (ext === 'doc') {
    throw new Error('File .doc (Word cũ) chưa được hỗ trợ đọc trực tiếp. Vui lòng lưu lại dưới dạng .docx hoặc dùng tab "Dán nội dung".');
  }

  return null;
}

// ─── Modal Upload Word → AI extract → Review → Save ──────────────────────────
function UploadWordModal({ open, onClose, teacherId, topicId, topicTitle, onSaved }) {
  const [phase, setPhase]             = useState('upload'); // upload | previewing | preview | extracting | review | saving
  const [error, setError]             = useState('');
  const [words, setWords]             = useState([]);
  const [uploadTab, setUploadTab]     = useState('file');   // 'file' | 'paste'
  const [previewText, setPreviewText] = useState('');
  const [pendingText, setPendingText] = useState('');

  // FIX #3: reset đầy đủ khi modal mở lại, kể cả previewText
  useEffect(() => {
    if (open) {
      setPhase('upload');
      setError('');
      setWords([]);
      setPendingText('');
      setPreviewText('');
    }
  }, [open]);

  if (!open) return null;

  // ── Lấy text từ UI hiện tại ──
  // FIX #2: tab='file' → dùng pendingText (đã đọc qua handleFile)
  const getInputText = () => {
    if (uploadTab === 'paste') {
      return document.getElementById('vocab-paste-area')?.value?.trim() || '';
    }
    return pendingText;
  };

  // ── Xử lý chọn file ──
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'doc', 'docx'].includes(ext)) {
      setError('Chỉ chấp nhận file .txt, .doc, .docx'); return;
    }
    setError('');
    setPhase('previewing');
    try {
      const text = await readFileAsText(file);
      if (!text || !text.trim()) {
        setError('Không đọc được nội dung file. Hãy dùng tab "Dán nội dung" và paste thủ công.');
        setPhase('upload');
        return;
      }
      setPendingText(text);
      const summary = await aiVocabularyService.previewDocument(text);
      setPreviewText(summary);
      setPhase('preview');
    } catch (e) {
      setError(e.message || 'Đọc file thất bại.');
      setPhase('upload');
    }
  };

  // ── Gọi AI extract ──
  const extractWithAI = async (text) => {
    if (!text) { setError('Không có nội dung để phân tích.'); return; }
    setPhase('extracting'); setError('');
    try {
      const parsed = await aiVocabularyService.extractVocabulary(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI không tìm thấy từ vựng nào trong tài liệu.');
      }
      setWords(parsed.map((w, i) => ({ ...w, _id: i, _keep: true })));
      setPhase('review');
    } catch (e) {
      setError('AI trích xuất thất bại: ' + e.message);
      setPhase('upload');
    }
  };

  // ── Xem bài trước ──
  const handlePreview = async () => {
    const text = getInputText();
    // FIX #2: thông báo rõ theo từng tab
    if (!text) {
      setError(uploadTab === 'file'
        ? 'Vui lòng chọn file và chờ đọc xong trước.'
        : 'Vui lòng paste nội dung trước.');
      return;
    }
    setPhase('previewing'); setError('');
    try {
      const summary = await aiVocabularyService.previewDocument(text);
      setPreviewText(summary);
      setPendingText(text);
      setPhase('preview');
    } catch (e) {
      setError('Không thể xem trước: ' + e.message);
      setPhase('upload');
    }
  };

  // ── Lưu từ vựng ──
  const handleSave = async () => {
    const toSave = words.filter(w => w._keep && w.word?.trim() && w.meaning_vi?.trim());
    if (toSave.length === 0) { setError('Không có từ nào hợp lệ để lưu.'); return; }
    setPhase('saving');
    try {
      await vocabularyService.bulkInsertWords(topicId, toSave);
      onSaved(toSave.length);
      onClose();
    } catch (e) {
      setError(e.message); setPhase('review');
    }
  };

  const updateWord = (id, field, val) =>
    setWords(ws => ws.map(w => w._id === id ? { ...w, [field]: val } : w));

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 660 }}>
        <h3>📤 Upload từ vựng — {topicTitle}</h3>

        {/* ── UPLOAD ── */}
        {phase === 'upload' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
              Upload file <b>.txt</b> hoặc paste nội dung. AI sẽ trích xuất danh sách từ vựng tự động.
            </p>

            {/* Tab chọn cách nhập */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ key: 'file', label: '📁 Chọn file' }, { key: 'paste', label: '📋 Paste nội dung' }].map(t => (
                <button key={t.key} onClick={() => { setUploadTab(t.key); setError(''); setPendingText(''); }}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: `2px solid ${uploadTab === t.key ? 'var(--t-primary)' : 'var(--t-border)'}`,
                    background: uploadTab === t.key ? 'var(--t-primary)' : '#fff',
                    color: uploadTab === t.key ? '#fff' : 'var(--t-muted)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >{t.label}</button>
              ))}
            </div>

            {uploadTab === 'file' ? (
              <div className="t-field">
                <label>Chọn file (.txt, .docx)</label>
                <input type="file" accept=".txt,.doc,.docx" onChange={handleFile} />
                <span style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 4, display: 'block' }}>
                  💡 File <b>.docx</b> sẽ được đọc tự động. File <b>.doc</b> (Word cũ): lưu lại dưới dạng .docx hoặc dùng tab "Dán nội dung".
                </span>
                {/* FIX #2: hiển thị trạng thái đã đọc file thành công */}
                {pendingText && (
                  <span style={{ fontSize: 12, color: '#2E7D32', marginTop: 4, display: 'block' }}>
                    ✅ Đã đọc file ({pendingText.length.toLocaleString()} ký tự). Nhấn "Trích xuất từ vựng" để tiếp tục.
                  </span>
                )}
              </div>
            ) : (
              <div className="t-field">
                <label>Paste nội dung từ vựng</label>
                <textarea
                  rows={8} id="vocab-paste-area"
                  placeholder={`VD:\nanimal - noun - /ˈænɪməl/ - động vật - The animal ran fast.\nbook - noun - sách\n\nHoặc paste nguyên văn từ Word, PDF...`}
                  style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                />
              </div>
            )}

            <div style={{ background: '#F5EDE0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#8A7F72' }}>
              💡 <b>Xem bài trước:</b> Nhờ AI tóm tắt nội dung tài liệu trước khi trích từ vựng
            </div>

            {error && <div className="t-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>}

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="t-btn" style={{ flex: 1 }} onClick={handlePreview}>
                👁️ Xem bài trước
              </button>
              {/* FIX #2: guard trước khi gọi extractWithAI */}
              <button className="t-btn t-btn-primary" style={{ flex: 2 }} onClick={() => {
                const text = getInputText();
                if (!text) {
                  setError(uploadTab === 'file'
                    ? 'Vui lòng chọn file và chờ đọc xong trước.'
                    : 'Vui lòng paste nội dung trước.');
                  return;
                }
                extractWithAI(text);
              }}>
                ✨ Trích xuất từ vựng
              </button>
            </div>

            <div className="t-modal-foot">
              <button className="t-btn" onClick={onClose}>Hủy</button>
            </div>
          </>
        )}

        {/* ── PREVIEWING ── */}
        {phase === 'previewing' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, color: 'var(--t-muted)' }}>AI đang đọc tài liệu...</p>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {phase === 'preview' && (
          <>
            <div style={{ background: '#EDF3ED', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2E7D32', margin: '0 0 8px' }}>📋 Tóm tắt tài liệu</p>
              <p style={{ fontSize: 13.5, color: '#4A3F35', margin: 0, lineHeight: 1.7 }}>{previewText}</p>
            </div>
            {error && <div className="t-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setPhase('upload')}>← Quay lại</button>
              <button className="t-btn t-btn-primary" onClick={() => extractWithAI(pendingText)}>
                ✨ Trích xuất từ vựng
              </button>
            </div>
          </>
        )}

        {/* ── EXTRACTING ── */}
        {phase === 'extracting' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ fontSize: 14, color: 'var(--t-muted)' }}>AI đang phân tích và trích xuất từ vựng...</p>
          </div>
        )}

        {/* ── REVIEW ── */}
        {phase === 'review' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 12 }}>
              AI tìm thấy <b>{words.length}</b> từ. Bỏ tick để loại bỏ, chỉnh sửa nếu cần rồi nhấn Lưu.
            </p>
            {error && <div className="t-error" style={{ marginBottom: 10 }}>⚠️ {error}</div>}
            <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--t-border)', borderRadius: 10, marginBottom: 16 }}>
              {words.map(w => (
                <div key={w._id} style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 80px 100px 1.5fr 1.5fr', gap: 8,
                  padding: '8px 12px', borderBottom: '1px solid var(--t-border)',
                  background: w._keep ? '#fff' : '#FFF5F5', alignItems: 'center',
                }}>
                  <input type="checkbox" checked={w._keep} onChange={e => updateWord(w._id, '_keep', e.target.checked)} />
                  <input
                    value={w.word || ''} onChange={e => updateWord(w._id, 'word', e.target.value)}
                    placeholder="Từ vựng"
                    style={{ fontSize: 12.5, padding: '3px 8px', border: '1px solid var(--t-border)', borderRadius: 6, fontWeight: 600 }}
                  />
                  <input
                    value={w.part_of_speech || ''} onChange={e => updateWord(w._id, 'part_of_speech', e.target.value)}
                    placeholder="Loại từ (n/v...)"
                    style={{ fontSize: 12, padding: '3px 8px', border: '1px solid var(--t-border)', borderRadius: 6, color: 'var(--t-muted)' }}
                  />
                  <input
                    value={w.ipa || ''} onChange={e => updateWord(w._id, 'ipa', e.target.value)}
                    placeholder="Phiên âm"
                    style={{ fontSize: 12, padding: '3px 8px', border: '1px solid var(--t-border)', borderRadius: 6, color: 'var(--t-muted)' }}
                  />
                  <input
                    value={w.meaning_vi || ''} onChange={e => updateWord(w._id, 'meaning_vi', e.target.value)}
                    placeholder="Nghĩa tiếng Việt"
                    style={{ fontSize: 12.5, padding: '3px 8px', border: '1px solid var(--t-border)', borderRadius: 6 }}
                  />
                  <input
                    value={w.example || ''} onChange={e => updateWord(w._id, 'example', e.target.value)}
                    placeholder="Ví dụ (tiếng Anh)"
                    style={{ fontSize: 12.5, padding: '3px 8px', border: '1px solid var(--t-border)', borderRadius: 6 }}
                  />
                </div>
              ))}
            </div>
            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setPhase('upload')}>← Làm lại</button>
              <button className="t-btn t-btn-primary" onClick={handleSave}>
                💾 Lưu {words.filter(w => w._keep).length} từ
              </button>
            </div>
          </>
        )}

        {/* ── SAVING ── */}
        {phase === 'saving' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💾</div>
            <p style={{ fontSize: 14, color: 'var(--t-muted)' }}>Đang lưu từ vựng vào database...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Upload Bài tập vận dụng (Bài 4) ──────────────────────────────────

function UploadEx4Modal({ open, onClose, teacherId, topicId, topicTitle, onSaved }) {
  const [phase, setPhase]       = useState('upload');
  const [questions, setQuestions] = useState([]);
  const [title, setTitle]       = useState('');
  const [error, setError]       = useState('');

  useEffect(() => { if (open) { setPhase('upload'); setError(''); setQuestions([]); setTitle(''); } }, [open]);
  if (!open) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.docx')) { setError('Chỉ nhận file .docx'); return; }
    try {
      const html = await convertDocxToHtml(file);
      const parsed = parseVocabExerciseHtml(html);
      if (parsed.length === 0) { setError('Không tìm thấy câu hỏi trong file.'); return; }
      setTitle(file.name.replace(/\.[^.]+$/, ''));
      setQuestions(parsed);
      setPhase('preview');
    } catch (e) {
      setError('Đọc file thất bại: ' + e.message);
    }
  };

  const handleSave = async () => {
    try {
      await vocabularyService.saveVocabExercise(teacherId, topicId, { title, questions });
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 560 }}>
        <h3>📎 Upload Bài tập vận dụng — {topicTitle}</h3>
        <p style={{ fontSize: 13, color: 'var(--t-muted)' }}>
          File .docx có câu hỏi + đáp án cuối trang. Tự đọc, không qua AI.
        </p>

        {/* LỖI 7 FIX: hướng dẫn định dạng file */}
        <details style={{ marginBottom: 16, fontSize: 13, color: '#4A3F35' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#566B58' }}>
            📋 Hướng dẫn định dạng file Word (click để xem)
          </summary>
          <div style={{ marginTop: 10, background: '#F5EDE0', borderRadius: 8, padding: '12px 14px', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 6px' }}><b>Phần câu hỏi:</b> Mỗi câu ghi theo dạng:</p>
            <code style={{ display: 'block', background: '#fff', padding: '8px 10px', borderRadius: 6, marginBottom: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>{'1. Many families have a _____ of gathering during Tet.\nA. privilege   B. custom   C. fate   D. dismissal'}</code>
            <p style={{ margin: '0 0 6px' }}><b>Phần đáp án:</b> Viết tiêu đề <b>ĐÁP ÁN</b> hoặc <b>Đáp án</b> hoặc <b>Answer Key</b> trên một dòng riêng, sau đó liệt kê:</p>
            <code style={{ display: 'block', background: '#fff', padding: '8px 10px', borderRadius: 6, marginBottom: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>{'ĐÁP ÁN \n 1. B   2. C   3. A   4. D'}</code>
            <p style={{ color: '#C24949', margin: 0 }}>⚠️ Tiêu đề <b>ĐÁP ÁN</b> phải đứng riêng một dòng, không viết liền với câu số 1.</p>
          </div>
        </details>

        {phase === 'upload' && (
          <>
            <input type="file" accept=".docx" onChange={handleFile} />
            {error && <div className="t-error">⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={onClose}>Hủy</button>
            </div>
          </>
        )}

        {phase === 'preview' && (
          <>
            <div className="t-field">
              <label>Tên bài tập</label>
              <input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--t-muted)', margin: '8px 0' }}>
              Tìm thấy <b>{questions.length}</b> câu —{' '}
              {questions.filter(q => q.correct).length} câu đã có đáp án tự động
            </p>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {questions.slice(0, 5).map((q, i) => (
                <div key={i} style={{ background: 'var(--t-hover)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                  <b>{q.number}.</b> {q.question}
                  {q.correct && <span style={{ color: '#2E7D32', marginLeft: 8 }}>✓ {q.correct}</span>}
                </div>
              ))}
              {questions.length > 5 && (
                <p style={{ fontSize: 12, color: 'var(--t-muted)', textAlign: 'center' }}>
                  ... và {questions.length - 5} câu nữa
                </p>
              )}
            </div>
            {error && <div className="t-error">⚠️ {error}</div>}
            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setPhase('upload')}>← Chọn lại</button>
              <button className="t-btn t-btn-primary" onClick={handleSave}>💾 Lưu bài tập</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const VocabularyPage = () => {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [sets, setSets]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [uploadTarget, setUploadTarget]     = useState(null);
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const [pickedSetId, setPickedSetId] = useState('');
  const [uploadEx4Target, setUploadEx4Target] = useState(null); // { id, title }
  // BUG 6: state preview bài Part 4
  const [previewVocabAssignment, setPreviewVocabAssignment] = useState(null);

  useEffect(() => { if (teacherId) fetchSets(); }, [teacherId]);

  const fetchSets = async () => {
    try { setLoading(true); setError(null); setSets(await vocabularyService.getVocabularySets(teacherId)); }
    catch { setError('Không thể tải bộ từ vựng. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (payload) => {
    await vocabularyService.createVocabularySet(teacherId, payload);
    await fetchSets();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bộ từ vựng này và toàn bộ từ bên trong?')) return;
    try {
      setDeleteError(null);
      await vocabularyService.deleteVocabularySet(id);
      setSets(prev => prev.filter(s => s.id !== id));
    } catch { setDeleteError('Xóa bộ từ vựng thất bại. Vui lòng thử lại.'); }
  };

  // BUG 6: handler xem bài Part 4 — lấy exercise từ vocab_exercise_files
  const handlePreviewVocabPart4 = async (topicId, topicTitle) => {
    try {
      const exercises = await vocabularyService.getVocabExercises(topicId);
      if (!exercises || exercises.length === 0) {
        alert('Chưa có bài tập Part 4 nào cho bộ từ này.');
        return;
      }
      // Lấy bài mới nhất
      const ex = exercises[0];
      // questions trong vocab_exercise_files là array JSON
      const questions = Array.isArray(ex.questions) ? ex.questions : [];
      setPreviewVocabAssignment({ title: ex.title || topicTitle, questions });
    } catch (e) {
      alert('Không thể tải bài tập: ' + (e.message || 'Lỗi không xác định'));
    }
  };

  const handleTopbarUpload = () => {
    setPickedSetId(sets[0]?.id || '');
    setShowUploadPicker(true);
  };

  const handlePickerConfirm = () => {
    if (!pickedSetId) return;
    const set = sets.find(s => s.id === pickedSetId);
    if (!set) return;
    setShowUploadPicker(false);
    setUploadTarget({ id: set.id, title: set.title });
  };

  const filtered = sets.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Bài tập từ vựng</h1>
          <p>Quản lý và tạo các bộ từ vựng giao cho học sinh luyện tập</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="t-btn" onClick={handleTopbarUpload}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload từ vựng
          </button>
          <button className="t-btn t-btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="14" height="14">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tạo bộ từ mới
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchSets} compact />}
      {deleteError && <ErrorState message={deleteError} onRetry={() => setDeleteError(null)} compact />}

      <div className="t-card">
        <div className="t-filter-bar">
          <div className="t-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input type="text" placeholder="Tìm bộ từ vựng..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="t-empty">Đang tải bộ từ vựng...</div>
        ) : filtered.length === 0 ? (
          <div className="t-empty">Chưa có bộ từ vựng nào.</div>
        ) : (
          <div className="t-card-grid">
            {filtered.map(item => (
              <div key={item.id} className="t-item-card">
                <div className="t-item-card-head">
                  <h3 className="t-item-card-title">{item.title}</h3>
                  <span className="badge badge-pink">{item.totalWords} từ</span>
                </div>
                <div className="t-item-card-foot">
                  <span>Tạo: {item.createdAt}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="t-btn t-btn-sm t-btn-primary"
                      onClick={() => setUploadTarget({ id: item.id, title: item.title })}
                    >
                      📤 Upload từ
                    </button>
                    <button
                      className="t-btn t-btn-sm"
                      onClick={() => setUploadEx4Target({ id: item.id, title: item.title })}
                    >
                      📎 Bài 4
                    </button>
                    {/* BUG 6: nút xem bài Part 4 đã upload */}
                    <button
                      className="t-btn t-btn-sm"
                      onClick={() => handlePreviewVocabPart4(item.id, item.title)}
                      title="Xem bài tập Part 4 đã upload"
                    >
                      👁 Xem bài
                    </button>
                    <button className="t-btn t-btn-sm t-btn-danger" onClick={() => handleDelete(item.id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateSetModal open={showModal} onClose={() => setShowModal(false)} onSave={handleCreate} />

      {showUploadPicker && (
        <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && setShowUploadPicker(false)}>
          <div className="t-modal" style={{ maxWidth: 440 }}>
            <h3>📤 Upload từ vựng</h3>
            {sets.length === 0 ? (
              <>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                  <p style={{ fontSize: 14, color: 'var(--t-muted)', marginBottom: 20 }}>
                    Chưa có bộ từ vựng nào.<br/>Hãy tạo bộ từ trước rồi quay lại upload nhé!
                  </p>
                  <button className="t-btn t-btn-primary" onClick={() => { setShowUploadPicker(false); setShowModal(true); }}>
                    + Tạo bộ từ mới
                  </button>
                </div>
                <div className="t-modal-foot">
                  <button className="t-btn" onClick={() => setShowUploadPicker(false)}>Đóng</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
                  Chọn bộ từ vựng muốn thêm từ vào:
                </p>
                <div className="t-field">
                  <label>Bộ từ vựng *</label>
                  <select
                    value={pickedSetId}
                    onChange={e => setPickedSetId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--t-border)', fontSize: 14, fontFamily: 'inherit' }}
                  >
                    {sets.map(s => (
                      <option key={s.id} value={s.id}>{s.title} ({s.totalWords} từ)</option>
                    ))}
                  </select>
                </div>
                <div className="t-modal-foot">
                  <button className="t-btn" onClick={() => setShowUploadPicker(false)}>Hủy</button>
                  <button className="t-btn t-btn-primary" onClick={handlePickerConfirm} disabled={!pickedSetId}>
                    Tiếp tục →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {uploadEx4Target && (
        <UploadEx4Modal
          open={!!uploadEx4Target}
          onClose={() => setUploadEx4Target(null)}
          teacherId={teacherId}
          topicId={uploadEx4Target.id}
          topicTitle={uploadEx4Target.title}
          onSaved={() => { setUploadEx4Target(null); }}
        />
      )}

      {/* BUG 6: Modal xem bài Part 4 */}
      {previewVocabAssignment && (
        <VocabPart4Preview
          data={previewVocabAssignment}
          onClose={() => setPreviewVocabAssignment(null)}
        />
      )}

      {uploadTarget && (
        <UploadWordModal
          open={!!uploadTarget}
          onClose={() => setUploadTarget(null)}
          teacherId={teacherId}
          topicId={uploadTarget.id}
          topicTitle={uploadTarget.title}
          onSaved={(count) => {
            fetchSets();
            alert(`✅ Đã lưu ${count} từ vựng vào bộ "${uploadTarget.title}"`);
          }}
        />
      )}
    </div>
  );
};

export default VocabularyPage;