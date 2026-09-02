// src/pages/teacher/AssignmentsPage.jsx
import React, { useEffect, useState } from 'react';
import { assignmentService } from '@/services/assignment/assignmentService';
import { studentService }    from '@/services/student/studentService';
import { vocabularyService } from '@/services/vocabularyService';
import { grammarService }    from '@/services/grammarService';
import { listeningService }  from '@/services/listeningService';
import { useAuth }           from '@/hooks/useAuth';
import ErrorState            from '@/components/common/ErrorState';
import Loading               from '@/components/common/Loading';

const TYPE_OPTS = [
  { value: 'vocabulary', label: 'Từ vựng'  },
  { value: 'grammar',    label: 'Ngữ pháp' },
  { value: 'listening',  label: 'Listening' },
  { value: 'review',     label: 'Ôn tập'   },
];
const TYPE_LABEL = Object.fromEntries(TYPE_OPTS.map(t => [t.value, t.label]));

function hwBadge(status) {
  return status === 'Đang mở'
    ? <span className="badge badge-mint">Đang mở</span>
    : <span className="badge badge-red">Đã đóng</span>;
}

function typeBadge(assignment_type) {
  const map = { vocabulary: 'badge-pink', grammar: 'badge-lav', listening: 'badge-amber', review: 'badge-mint' };
  return (
    <span className={`badge ${map[assignment_type] || 'badge-lav'}`}>
      {TYPE_LABEL[assignment_type] || assignment_type}
    </span>
  );
}

// ─── Modal tạo bài tập ────────────────────────────────────────────────────────
function AssignModal({ open, onClose, onSave, classes, teacherId }) {
  const [form, setForm] = useState({
    title: '', assignment_type: 'vocabulary',
    classId: '', deadline: '',
    vocab_topic_id: '', grammar_topic_id: '', listening_material_id: '',
  });
  const [vocabTopics,   setVocabTopics]   = useState([]);
  const [grammarTopics, setGrammarTopics] = useState([]);
  const [listenMats,    setListenMats]    = useState([]);
  const [topicWords,    setTopicWords]    = useState([]);
  const [selectedVocabIds, setSelectedVocabIds] = useState([]);
  const [grammarQuestions, setGrammarQuestions] = useState([]);
  const [selectedGrammarIds, setSelectedGrammarIds] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [loadRes, setLoadRes] = useState(false);

  useEffect(() => {
    if (!open || !teacherId) return;
    setForm({ title: '', assignment_type: 'vocabulary', classId: classes[0]?.id || '', deadline: '', vocab_topic_id: '', grammar_topic_id: '', listening_material_id: '', selectedVocabIds: [] });
    setTopicWords([]);
    setSelectedVocabIds([]);
    setGrammarQuestions([]);
    setSelectedGrammarIds([]);
    setError('');
    // Pre-load tất cả resources
    setLoadRes(true);
    Promise.all([
      vocabularyService.getVocabularySets(teacherId),
      grammarService.getGrammarLessons(teacherId),
      listeningService.getListeningLessons(teacherId),
    ]).then(([v, g, l]) => {
      setVocabTopics(v || []);
      setGrammarTopics(g || []);
      setListenMats(l || []);
    }).catch(() => {}).finally(() => setLoadRes(false));
  }, [open, teacherId]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleVocabTopicChange = async (topicId) => {
    set('vocab_topic_id', topicId);
    setTopicWords([]);
    setSelectedVocabIds([]);
    if (!topicId) return;
    try {
      const words = await vocabularyService.getVocabularies(topicId);
      setTopicWords(words);
      setSelectedVocabIds(words.slice(0, Math.min(10, words.length)).map(word => word.id));
    } catch {
      setError('Không thể tải các từ của chủ đề này.');
    }
  };

  const chooseQuestionCount = (count) => {
    setSelectedVocabIds(topicWords.slice(0, count).map(word => word.id));
  };

  const handleGrammarTopicChange = async (topicId) => {
    set('grammar_topic_id', topicId);
    setGrammarQuestions([]); setSelectedGrammarIds([]);
    if (!topicId) return;
    try {
      const questions = await grammarService.getGrammarQuestions(topicId);
      setGrammarQuestions(questions);
      setSelectedGrammarIds(questions.slice(0, Math.min(10, questions.length)).map(question => question.id));
    } catch { setError('Không thể tải câu hỏi ngữ pháp.'); }
  };
  const chooseGrammarQuestionCount = (count) => setSelectedGrammarIds(grammarQuestions.slice(0, count).map(question => question.id));



  const handleSave = async (status = 'published') => {
    if (!form.title.trim())  { setError('Vui lòng nhập tên bài tập.'); return; }
    if (!form.classId)        { setError('Vui lòng chọn lớp.'); return; }
    if (form.assignment_type === 'vocabulary' && !form.vocab_topic_id)
      { setError('Vui lòng chọn chủ đề từ vựng.'); return; }
    if (form.assignment_type === 'vocabulary' && selectedVocabIds.length === 0)
      { setError('Vui lòng chọn số câu cần giao.'); return; }
    if (form.assignment_type === 'grammar' && !form.grammar_topic_id)
      { setError('Vui lòng chọn chủ đề ngữ pháp.'); return; }
    if (form.assignment_type === 'grammar' && selectedGrammarIds.length === 0)
      { setError('Chủ đề này chưa có câu hỏi để giao.'); return; }
    if (form.assignment_type === 'listening' && !form.listening_material_id)
      { setError('Vui lòng chọn tài liệu nghe.'); return; }
    // CLEAN-04: deadline không được ở quá khứ
    if (form.deadline && new Date(form.deadline) < new Date()) {
      setError('Hạn nộp không được là thời điểm trong quá khứ.'); return;
    }

    setSaving(true); setError('');
    try {
      const selectedGrammarQuestions = grammarQuestions.filter(question => selectedGrammarIds.includes(question.id)).map(question => ({ ...question }));
      await onSave({ ...form, status, selectedVocabIds, questions: form.assignment_type === 'grammar' ? selectedGrammarQuestions : undefined });
      onClose();
    } catch (e) {
      setError(e.message || 'Có lỗi xảy ra khi tạo bài tập.');
    } finally {
      setSaving(false);
    }
  };

  const type = form.assignment_type;

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal" style={{ maxWidth: 520 }}>
        <h3>📝 Giao bài tập mới</h3>

        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 8 }}>

          {loadRes && <div style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 8 }}>Đang tải tài nguyên...</div>}

          <div className="t-field">
            <label>Tên bài tập *</label>
            <input type="text" value={form.title}
              placeholder="VD: Từ vựng Animals - Tuần 1"
              onChange={e => set('title', e.target.value)} autoFocus />
          </div>

          <div className="t-field-row">
            <div className="t-field">
              <label>Loại bài tập *</label>
              <select value={type} onChange={e => set('assignment_type', e.target.value)}>
                {TYPE_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="t-field">
              <label>Lớp giao *</label>
              <select value={form.classId} onChange={e => set('classId', e.target.value)}>
                <option value="">-- Chọn lớp --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {type === 'vocabulary' && (
            <div className="t-field">
              <label>Chủ đề từ vựng *</label>
              <select value={form.vocab_topic_id} onChange={e => handleVocabTopicChange(e.target.value)}>
                <option value="">-- Chọn chủ đề --</option>
                {vocabTopics.map(v => (
                  <option key={v.id} value={v.id}>{v.title} ({v.totalWords} từ)</option>
                ))}
              </select>
              {vocabTopics.length === 0 && !loadRes && (
                <small style={{ color: 'var(--t-muted)' }}>Chưa có chủ đề từ vựng. Tạo ở mục Từ vựng trước.</small>
              )}
            </div>
          )}

          {type === 'vocabulary' && form.vocab_topic_id && (
            <div className="t-field">
              <label>Số câu giao cho học sinh *</label>
              {topicWords.length === 0 ? (
                <small style={{ color: 'var(--t-muted)' }}>Đang tải danh sách từ...</small>
              ) : (
                <>
                  <input
                    type="number"
                    min={1}
                    max={topicWords.length}
                    value={selectedVocabIds.length || ''}
                    onChange={e => {
                      const n = Math.min(Math.max(1, parseInt(e.target.value) || 1), topicWords.length);
                      chooseQuestionCount(n);
                    }}
                    placeholder={`1 – ${topicWords.length}`}
                    style={{ width: 90, padding: '7px 10px', borderRadius: 8, border: '2px solid var(--t-border)', fontSize: 14, fontFamily: 'inherit' }}
                  />
                  <small style={{ color: 'var(--t-muted)' }}>
                    Đã chọn {selectedVocabIds.length}/{topicWords.length} câu
                  </small>
                </>
              )}
            </div>
          )}

          {type === 'grammar' && (
            <div className="t-field">
              <label>Chủ đề ngữ pháp *</label>
              <select value={form.grammar_topic_id} onChange={e => handleGrammarTopicChange(e.target.value)}>
                <option value="">-- Chọn chủ đề --</option>
                {grammarTopics.map(g => (
                  <option key={g.id} value={g.id}>{g.title} {g.published ? '' : '(draft)'}</option>
                ))}
              </select>
              {grammarTopics.length === 0 && !loadRes && (
                <small style={{ color: 'var(--t-muted)' }}>Chưa có chủ đề ngữ pháp.</small>
              )}
            </div>
          )}

          {type === 'grammar' && form.grammar_topic_id && (
            <>
              <div className="t-field"><label>Số câu giao cho học sinh *</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{[5, 10, 15, 20, 30].filter(count => count <= grammarQuestions.length).map(count => <button key={count} type="button" onClick={() => chooseGrammarQuestionCount(count)} style={{ padding: '7px 13px', borderRadius: 8, border: `2px solid ${selectedGrammarIds.length === count ? 'var(--t-primary)' : 'var(--t-border)'}`, background: selectedGrammarIds.length === count ? 'var(--t-primary)' : '#fff', color: selectedGrammarIds.length === count ? '#fff' : 'var(--t-primary)', fontWeight: 700, cursor: 'pointer' }}>{count} câu</button>)}{grammarQuestions.length > 0 && <button type="button" onClick={() => chooseGrammarQuestionCount(grammarQuestions.length)} style={{ padding: '7px 13px', borderRadius: 8, border: '2px solid var(--t-primary)', background: selectedGrammarIds.length === grammarQuestions.length ? 'var(--t-primary)' : '#fff', color: selectedGrammarIds.length === grammarQuestions.length ? '#fff' : 'var(--t-primary)', fontWeight: 700, cursor: 'pointer' }}>Tất cả ({grammarQuestions.length})</button>}</div><small style={{ color: 'var(--t-muted)' }}>{grammarQuestions.length ? `Đã chọn ${selectedGrammarIds.length}/${grammarQuestions.length} câu.` : 'Chủ đề này chưa có câu hỏi.'}</small></div>
            </>
          )}

          {type === 'listening' && (
            <div className="t-field">
              <label>Tài liệu nghe *</label>
              <select value={form.listening_material_id} onChange={e => set('listening_material_id', e.target.value)}>
                <option value="">-- Chọn tài liệu --</option>
                {listenMats.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
              {listenMats.length === 0 && !loadRes && (
                <small style={{ color: 'var(--t-muted)' }}>Chưa có tài liệu nghe.</small>
              )}
            </div>
          )}

          {type === 'review' && (
            <div style={{ background: '#FFF8E7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8A7F72', marginBottom: 8 }}>
              ℹ️ Bài ôn tập — câu hỏi sẽ được thêm thủ công sau khi tạo.
            </div>
          )}

          <div className="t-field">
            <label>Hạn nộp bài</label>
            <input type="datetime-local" value={form.deadline}
              onChange={e => set('deadline', e.target.value)} />
          </div>

          {error && <div className="t-error">⚠️ {error}</div>}

        </div>{/* end scrollable body */}

        <div className="t-modal-foot">
          <button className="t-btn" onClick={onClose}>Hủy</button>
          <button className="t-btn" onClick={() => handleSave('draft')} disabled={saving || loadRes}>
            📝 Lưu nháp
          </button>
          <button className="t-btn t-btn-primary" onClick={() => handleSave('published')} disabled={saving || loadRes}>
            {saving ? 'Đang tạo...' : 'Xác nhận giao bài'}
          </button>
        </div>
      </div>
    </div>
  );}
// ─── Main page ────────────────────────────────────────────────────────────────
export const AssignmentsPage = () => {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [classes,     setClasses]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [classFilter, setClassFilter] = useState('all');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { if (teacherId) initData(); }, [teacherId]);

// src/pages/teacher/AssignmentsPage.jsx — phần thay đổi
// (Chỉ show phần hàm cần thay, giữ nguyên phần còn lại)

// Thay toàn bộ _fetchAssignments + initData + applyFilters bằng:

  const initData = async () => {
    try {
      setLoading(true); setError(null);
      const [classList, records] = await Promise.all([
        studentService.getTeacherClasses(teacherId),
        assignmentService.getAssignments(teacherId, { classId: 'all', searchQuery: '' }),
      ]);
      setClasses(classList);
      setAssignments(records);
    } catch {
      setError('Không thể tải danh sách bài tập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async (newClass, newType, newQuery) => {
    try {
      setLoading(true);
      let records = await assignmentService.getAssignments(teacherId, {
        classId: newClass,
        searchQuery: newQuery,
      });
      if (newType !== 'all') {
        records = records.filter(r => r.type === newType);
      }
      setAssignments(records);
    } catch {
      setError('Lọc dữ liệu thất bại.');
    } finally {
      setLoading(false);
    }
  };
  const handleCreate = async (form) => {
    await assignmentService.createWithQuestions(teacherId, form);
    await initData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bài tập này?')) return;
    try {
      setDeleteError(null);
      await assignmentService.delete(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch {
      setDeleteError('Xóa bài tập thất bại. Vui lòng thử lại.');
    }
  };

  const f = (key, val, setter) => {
    setter(val);
    const c = key === 'class' ? val : classFilter;
    const t = key === 'type'  ? val : typeFilter;
    const q = key === 'query' ? val : searchQuery;
    applyFilters(c, t, q);
  };

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>Quản lý bài tập</h1>
          <p>Giao bài, chỉnh sửa hoặc xóa bài tập đã tạo</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--t-hover)', padding: 4, borderRadius: 10, alignItems: 'center' }}>
          {[['all', 'Tất cả'], ['published', 'Đã publish'], ['draft', 'Nháp']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: statusFilter === v ? 700 : 400, cursor: 'pointer', background: statusFilter === v ? '#566B58' : 'transparent', color: statusFilter === v ? '#fff' : 'var(--t-muted)' }}>{l}</button>
          ))}
        </div>
        <button className="t-btn t-btn-primary" onClick={() => setShowModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="14" height="14">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Giao bài tập mới
        </button>
      </div>

      {error       && <ErrorState message={error}       onRetry={initData}                     compact />}
      {deleteError && <ErrorState message={deleteError} onRetry={() => setDeleteError(null)}   compact />}

      <div className="t-card">
        <div className="t-filter-bar">
          <select value={classFilter} onChange={e => f('class', e.target.value, setClassFilter)}>
            <option value="all">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => f('type', e.target.value, setTypeFilter)}>
            <option value="all">Tất cả loại</option>
            {TYPE_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="t-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input type="text" placeholder="Tìm bài tập..."
              value={searchQuery} onChange={e => f('query', e.target.value, setSearchQuery)} />
          </div>
        </div>

        <div className="t-overflow-x">
          <table className="t-table">
            <thead>
              <tr>
                <th>Tên bài tập</th><th>Loại</th><th>Lớp giao</th>
                <th>Ngày giao</th><th>Hạn nộp</th><th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28 }}><Loading /></td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan={7}><div className="t-empty">Chưa có bài tập nào được giao.</div></td></tr>
              ) : assignments.filter(a => statusFilter === 'all' || (statusFilter === 'draft' ? a.status === 'draft' : a.status !== 'draft')).map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td>{typeBadge(item.type)}</td>
                  <td>{item.className}</td>
                  <td style={{ color: 'var(--t-muted)' }}>{item.createdAt}</td>
                  <td style={{ color: 'var(--t-muted)' }}>{item.deadline || '—'}</td>
                  <td>{hwBadge(item.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="t-actions">
                      {item.status === 'draft' && (
                        <button className="t-btn t-btn-sm t-btn-primary"
                          onClick={async () => { await assignmentService.setStatus(item.id, 'published'); initData(); }}
                          title="Publish bài tập này">
                          🚀 Publish
                        </button>
                      )}
                      <button className="t-btn t-btn-sm t-btn-danger t-btn-icon"
                        onClick={() => handleDelete(item.id)}>
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

      <AssignModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleCreate}
        classes={classes}
        teacherId={teacherId}
      />
    </div>
  );
};

export default AssignmentsPage;
