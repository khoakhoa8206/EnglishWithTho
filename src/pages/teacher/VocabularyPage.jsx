// src/pages/teacher/VocabularyPage.jsx
import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { vocabularyService } from '../../services/vocabularyService';
import { convertDocxToHtml, parseVocabExerciseHtml } from '../../services/docxParserService';
import { aiVocabularyService } from '../../services/ai/aiService';
import { questionBankService } from '../../services/questionBankService';
import { useAuth } from '@/hooks/useAuth';
import ErrorState from '@/components/common/ErrorState';
import { fileArchiveService } from '../../services/fileArchiveService';
import FileArchiveDrawer from '../../components/common/FileArchiveDrawer';
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

// Component chọn nguồn câu hỏi — đặt bên ngoài VocabularyPage
function QbSourceSelector({ teacherId, uploads }) {
  const [selectedIds, setSelectedIds] = useState([]); // [] = tất cả
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleId = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const qs = await questionBankService.getQuestions(teacherId, 'vocab', {
        selectedUploadIds: selectedIds,
      });
      setQuestions(qs);
    } catch (e) {
      alert('Tải câu hỏi thất bại: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderTop: '1px solid var(--t-border)', paddingTop: 12, marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', margin: '0 0 8px' }}>
        CHỌN TỪ NGUỒN ĐỂ XEM / ÔN TẬP
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => setSelectedIds([])}
          style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `2px solid ${selectedIds.length === 0 ? 'var(--t-primary)' : 'var(--t-border)'}`,
            background: selectedIds.length === 0 ? 'var(--t-primary)' : '#fff',
            color: selectedIds.length === 0 ? '#fff' : 'var(--t-ink)',
            fontFamily: 'inherit',
          }}
        >
          Tổng tất cả ({uploads.reduce((s, u) => s + u.question_count, 0)} câu)
        </button>
        {uploads.map(u => (
          <button
            key={u.id}
            onClick={() => toggleId(u.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${selectedIds.includes(u.id) ? 'var(--t-primary)' : 'var(--t-border)'}`,
              background: selectedIds.includes(u.id) ? 'var(--t-primary)' : '#fff',
              color: selectedIds.includes(u.id) ? '#fff' : 'var(--t-ink)',
              fontFamily: 'inherit',
            }}
          >
            {u.upload_label} ({u.question_count})
          </button>
        ))}
      </div>
      <button
        onClick={handlePreview}
        disabled={loading}
        style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#566B58', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {loading ? 'Đang tải...' : `👁️ Xem ${selectedIds.length === 0 ? 'tất cả' : selectedIds.length + ' file'}`}
      </button>
      {questions.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 6 }}>
          Đang hiển thị {questions.length} câu hỏi
        </p>
      )}
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
  // BUG 6: state preview bài Part 4
  const [previewVocabAssignment, setPreviewVocabAssignment] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [qbUploads, setQbUploads] = useState([]);
  const [showQbUpload, setShowQbUpload] = useState(false);
  const [qbUploadLabel, setQbUploadLabel] = useState('');
  const [qbUploadQuestions, setQbUploadQuestions] = useState([]);
  const [qbUploading, setQbUploading] = useState(false);
  const [qbUploadFile, setQbUploadFile] = useState(null); // lưu file object để upload Storage
  // State cho modal gán bài tập vào chủ đề
  const [assignBtTarget, setAssignBtTarget] = useState(null); // { id, title }
  const [assignBtUploads, setAssignBtUploads] = useState([]); // danh sách upload trong ngân hàng
  const [assignBtSelectedId, setAssignBtSelectedId] = useState('');
  const [assignBtSaving, setAssignBtSaving] = useState(false);
  const [topicAssignmentMap, setTopicAssignmentMap] = useState({}); // { topicId → uploadId }
  // State cho modal gán Bài 4 từ ngân hàng
  const [assignEx4Target, setAssignEx4Target] = useState(null);   // { id, title }
  const [assignEx4Uploads, setAssignEx4Uploads] = useState([]);
  const [assignEx4SelectedId, setAssignEx4SelectedId] = useState('');
  const [assignEx4Saving, setAssignEx4Saving] = useState(false);
  const [topicEx4Map, setTopicEx4Map] = useState({});             // { topicId → uploadId }

  useEffect(() => {
    if (teacherId) {
      fetchSets();
      loadTopicAssignments();
      loadTopicEx4Assignments();   // <-- thêm dòng này
    }
  }, [teacherId]);

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

  const loadQbUploads = async () => {
    try {
      const uploads = await questionBankService.getUploads(teacherId, 'vocab');
      setQbUploads(uploads);
    } catch (e) { console.error('QB load failed:', e); }
  };

  const handleQbUpload = async (questions) => {
    if (!qbUploadLabel.trim()) { alert('Vui lòng nhập tên batch.'); return; }
    if (!qbUploadFile) { alert('Vui lòng chọn file.'); return; }
    setQbUploading(true);
    try {
      // 1. Upload file gốc lên Storage
      const fileUrl = await vocabularyService.uploadVocabFile(teacherId, qbUploadFile);

      // 2. Lưu vào ngân hàng câu hỏi (giữ nguyên)
      const upload = await questionBankService.uploadBatch(teacherId, {
        subjectType: 'vocab',
        topicRefId: null,
        uploadLabel: qbUploadLabel.trim(),
        questions,
        fileUrl, // truyền thêm fileUrl để lưu vào ngân hàng
      });

      // 3. Tự động lưu vào Kho lưu trữ
      await fileArchiveService.addFile(teacherId, {
        section: 'vocab',
        displayName: qbUploadLabel.trim(),
        title: qbUploadLabel.trim(),
        fileUrl,
        fileType: qbUploadFile.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: qbUploadFile.size,
        uploadId: upload.id, // liên kết với ngân hàng
      });

      await loadQbUploads();
      setShowQbUpload(false);
      setQbUploadLabel('');
      setQbUploadQuestions([]);
      setQbUploadFile(null);
    } catch (e) {
      alert('Upload thất bại: ' + e.message);
    } finally {
      setQbUploading(false);
    }
  };

  const handleQbDeleteUpload = async (uploadId) => {
    if (!window.confirm('Xóa lần upload này và toàn bộ câu hỏi?')) return;
    try {
      await questionBankService.deleteUpload(uploadId);
      setQbUploads(prev => prev.filter(u => u.id !== uploadId));
    } catch (e) {
      alert('Xóa thất bại: ' + e.message);
    }
  };

  // Load danh sách assignment hiện tại cho tất cả topics
  const loadTopicAssignments = async () => {
    try {
      const data = await vocabularyService.getTopicAssignments(teacherId);
      const map = {};
      data.forEach(row => { map[row.topic_id] = row.upload_id; });
      setTopicAssignmentMap(map);
    } catch (e) { console.error('Load assignments failed:', e); }
  };

  // Mở modal gán bài tập
  const handleOpenAssignBt = async (item) => {
    setAssignBtTarget(item);
    setAssignBtSelectedId(topicAssignmentMap[item.id] || '');
    try {
      const uploads = await questionBankService.getUploads(teacherId, 'vocab');
      setAssignBtUploads(uploads);
    } catch (e) { alert('Không tải được ngân hàng: ' + e.message); }
  };

  // Lưu assignment
  const handleSaveAssignBt = async () => {
    if (!assignBtTarget) return;
    setAssignBtSaving(true);
    try {
      await vocabularyService.saveTopicAssignment(teacherId, assignBtTarget.id, assignBtSelectedId || null);
      await loadTopicAssignments();
      setAssignBtTarget(null);
    } catch (e) {
      alert('Lưu thất bại: ' + e.message);
    } finally {
      setAssignBtSaving(false);
    }
  };

  // Load assignment Bài 4 cho tất cả topics
  const loadTopicEx4Assignments = async () => {
    try {
      const data = await vocabularyService.getTopicEx4Assignments(teacherId);
      const map = {};
      data.forEach(row => { map[row.topic_id] = row.upload_id; });
      setTopicEx4Map(map);
    } catch (e) { console.error('Load ex4 assignments failed:', e); }
  };

  // Mở modal gán Bài 4
  const handleOpenAssignEx4 = async (item) => {
    setAssignEx4Target(item);
    setAssignEx4SelectedId(topicEx4Map[item.id] || '');
    try {
      const uploads = await questionBankService.getUploads(teacherId, 'vocab');
      setAssignEx4Uploads(uploads);
    } catch (e) { alert('Không tải được ngân hàng: ' + e.message); }
  };

  // Lưu assignment Bài 4
  const handleSaveAssignEx4 = async () => {
    if (!assignEx4Target) return;
    setAssignEx4Saving(true);
    try {
      await vocabularyService.saveTopicEx4Assignment(teacherId, assignEx4Target.id, assignEx4SelectedId || null);
      await loadTopicEx4Assignments();
      setAssignEx4Target(null);
    } catch (e) {
      alert('Lưu thất bại: ' + e.message);
    } finally {
      setAssignEx4Saving(false);
    }
  };

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Bài tập từ vựng</h1>
          <p>Quản lý và tạo các bộ từ vựng giao cho học sinh luyện tập</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setShowArchive(true); }}
            style={{
              padding: '9px 18px', borderRadius: 10,
              border: '1px solid #566B58', background: '#fff',
              color: '#566B58', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🗂️ Kho lưu trữ
          </button>
          <button
            onClick={() => { setShowQbUpload(true); loadQbUploads(); }}
            style={{
              padding: '9px 18px', borderRadius: 10,
              border: '1px solid var(--t-border)', background: '#fff',
              color: 'var(--t-ink)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            📋 Ngân hàng câu hỏi
          </button>
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
                  <div className="t-item-card-foot-meta">
                    <span>Tạo: {item.createdAt}</span>
                  </div>
                  <div className="t-item-card-foot-actions">
                    <button
                      className="t-btn t-btn-sm t-btn-primary"
                      onClick={() => setUploadTarget({ id: item.id, title: item.title })}
                    >
                      📤 Upload từ
                    </button>
                    <button
                      className="t-btn t-btn-sm"
                      style={{ background: topicEx4Map[item.id] ? '#E8F5E9' : undefined, color: topicEx4Map[item.id] ? '#2E7D32' : undefined }}
                      onClick={() => handleOpenAssignEx4(item)}
                      title="Gán bài tập vận dụng (Bài 4) từ ngân hàng câu hỏi"
                    >
                      📎 Bài 4
                    </button>
                    <button
                      className="t-btn t-btn-sm"
                      style={{ background: topicAssignmentMap[item.id] ? '#FFF3CD' : undefined, color: topicAssignmentMap[item.id] ? '#856404' : undefined }}
                      onClick={() => handleOpenAssignBt(item)}
                      title="Gán bài tập từ ngân hàng câu hỏi cho học sinh"
                    >
                      📋 BT
                    </button>
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

      {/* Modal gán Bài 4 từ ngân hàng */}
      {assignEx4Target && (
        <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && setAssignEx4Target(null)}>
          <div className="t-modal" style={{ maxWidth: 480 }}>
            <h3>📎 Gán Bài tập vận dụng (Bài 4) — {assignEx4Target.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
              Chọn file bài tập vận dụng từ ngân hàng câu hỏi. Học sinh sẽ làm bài theo đúng file này.
            </p>

            {assignEx4Uploads.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
                ⚠️ Chưa có file nào trong ngân hàng câu hỏi. Hãy upload vào "Ngân hàng câu hỏi" trước.
              </p>
            ) : (
              <div className="t-field">
                <label>Chọn file bài tập vận dụng *</label>
                <select
                  value={assignEx4SelectedId}
                  onChange={e => setAssignEx4SelectedId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--t-border)', fontSize: 14, fontFamily: 'inherit' }}
                >
                  <option value="">— Không gán —</option>
                  {assignEx4Uploads.map(u => (
                    <option key={u.id} value={u.id}>{u.upload_label} ({u.question_count} câu)</option>
                  ))}
                </select>
              </div>
            )}

            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setAssignEx4Target(null)}>Hủy</button>
              <button className="t-btn t-btn-primary" onClick={handleSaveAssignEx4} disabled={assignEx4Saving}>
                {assignEx4Saving ? 'Đang lưu...' : '💾 Lưu'}
              </button>
            </div>
          </div>
        </div>
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

      {showArchive && (
        <>
          <div
            onClick={() => setShowArchive(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }}
          />
          <FileArchiveDrawer
            teacherId={teacherId}
            section="vocab"
            onClose={() => setShowArchive(false)}
          />
        </>
      )}

      {/* MỤC 4C: Modal ngân hàng câu hỏi */}
      {showQbUpload && (
        <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && setShowQbUpload(false)}>
          <div className="t-modal" style={{ maxWidth: 600 }}>
            <h3>📋 Ngân hàng câu hỏi từ vựng</h3>

            {/* Danh sách các lần upload */}
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', margin: '0 0 8px' }}>
              CÁC LẦN UPLOAD ({qbUploads.length})
            </p>
            {qbUploads.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--t-muted)', margin: '0 0 16px' }}>Chưa có lần upload nào.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {qbUploads.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--t-hover)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{u.upload_label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--t-muted)' }}>{u.question_count} câu · {new Date(u.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <button className="t-btn t-btn-sm t-btn-danger t-btn-icon" onClick={() => handleQbDeleteUpload(u.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Chọn từ nguồn — preview câu hỏi */}
            {qbUploads.length > 0 && (
              <QbSourceSelector teacherId={teacherId} uploads={qbUploads} />
            )}

            <div style={{ borderTop: '1px solid var(--t-border)', paddingTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', margin: '0 0 8px' }}>UPLOAD MỚI</p>
              <div className="t-field">
                <label>Tên batch *</label>
                <input type="text" value={qbUploadLabel} onChange={e => setQbUploadLabel(e.target.value)} placeholder="VD: File 1 - Unit 1" />
              </div>
              <div className="t-field">
                <label>Upload file câu hỏi (.docx)</label>
                <input type="file" accept=".docx" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !file.name.endsWith('.docx')) return;
                  setQbUploadFile(file); // lưu file object
                  try {
                    const html = await convertDocxToHtml(file);
                    const parsed = parseVocabExerciseHtml(html);
                    if (parsed.length === 0) { alert('Không tìm thấy câu hỏi trong file.'); return; }
                    setQbUploadQuestions(parsed);
                    if (!qbUploadLabel) setQbUploadLabel(file.name.replace(/\.[^.]+$/, ''));
                  } catch (err) { alert('Đọc file thất bại: ' + err.message); }
                }} />
                {qbUploadQuestions.length > 0 && (
                  <p style={{ fontSize: 12, color: '#2E7D32', marginTop: 4 }}>✅ {qbUploadQuestions.length} câu hỏi đã sẵn sàng.</p>
                )}
              </div>
            </div>

            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => { setShowQbUpload(false); setQbUploadLabel(''); setQbUploadQuestions([]); setQbUploadFile(null); }}>Đóng</button>
              <button className="t-btn t-btn-primary" onClick={() => handleQbUpload(qbUploadQuestions)} disabled={qbUploading || !qbUploadLabel.trim() || qbUploadQuestions.length === 0}>
                {qbUploading ? 'Đang lưu...' : `Lưu ${qbUploadQuestions.length} câu`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gán bài tập từ ngân hàng */}
      {assignBtTarget && (
        <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && setAssignBtTarget(null)}>
          <div className="t-modal" style={{ maxWidth: 480 }}>
            <h3>📋 Gán bài tập — {assignBtTarget.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
              Chọn file bài tập từ ngân hàng câu hỏi. Học sinh sẽ ôn tập theo đúng file này.
            </p>

            {assignBtUploads.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 16 }}>
                ⚠️ Chưa có file nào trong ngân hàng câu hỏi. Hãy upload vào "Ngân hàng câu hỏi" trước.
              </p>
            ) : (
              <div className="t-field">
                <label>Chọn file bài tập *</label>
                <select
                  value={assignBtSelectedId}
                  onChange={e => setAssignBtSelectedId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--t-border)', fontSize: 14, fontFamily: 'inherit' }}
                >
                  <option value="">— Không gán (học tự do) —</option>
                  {assignBtUploads.map(u => (
                    <option key={u.id} value={u.id}>{u.upload_label} ({u.question_count} câu)</option>
                  ))}
                </select>
              </div>
            )}

            <div className="t-modal-foot">
              <button className="t-btn" onClick={() => setAssignBtTarget(null)}>Hủy</button>
              <button className="t-btn t-btn-primary" onClick={handleSaveAssignBt} disabled={assignBtSaving}>
                {assignBtSaving ? 'Đang lưu...' : '💾 Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularyPage;