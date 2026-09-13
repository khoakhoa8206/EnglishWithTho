// src/pages/teacher/VocabularyReviewPage.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { vocabularyService } from '../../services/vocabularyService';
import { useAuth } from '@/hooks/useAuth';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

const WORDS_PER_LESSON = 25;

export const VocabularyReviewPage = () => {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  const [sets, setSets]               = useState([]);
  const [selected, setSelected]       = useState(null);
  const [words, setWords]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [wordLoading, setWordLoading] = useState(false);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [draft, setDraft]             = useState({ word: '', meaning_vi: '', example: '' });
  const [saving, setSaving]           = useState(false);

  useEffect(() => { if (teacherId) loadSets(); }, [teacherId]);

  const loadSets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vocab_topics')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSets(data || []);
    } catch (e) {
      setError('Không thể tải danh sách chủ đề.');
    } finally {
      setLoading(false);
    }
  };

  const openSet = async (set) => {
    setSelected(set);
    setEditingId(null);
    setWordLoading(true);
    try {
      const { data, error } = await supabase
        .from('vocabularies')
        .select('id, word, meaning_vi, example, ipa')
        .eq('topic_id', set.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setWords(data || []);
      const totalWords = data?.length || 0;
      const totalLessons = Math.ceil(totalWords / WORDS_PER_LESSON);
      setSelected(s => s ? { ...s, totalWords, totalLessons } : s);
    } catch { setWords([]); }
    finally { setWordLoading(false); }
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setDraft({ word: w.word, meaning_vi: w.meaning_vi, example: w.example || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ word: '', meaning_vi: '', example: '' });
  };

  const saveEdit = async (w) => {
    if (!draft.word.trim() || !draft.meaning_vi.trim()) {
      alert('Từ và nghĩa không được để trống.');
      return;
    }
    setSaving(true);
    try {
      const fields = {
        word: draft.word.trim(),
        meaning_vi: draft.meaning_vi.trim(),
        example: draft.example.trim() || null,
      };
      await vocabularyService.updateWord(w.id, fields);
      // Đồng bộ xuống các câu hỏi đã giao
      await vocabularyService.syncWordToAssignments(w.id, fields).catch(() => {});
      setWords(prev => prev.map(x => x.id === w.id ? { ...x, ...fields } : x));
      setEditingId(null);
      setDraft({ word: '', meaning_vi: '', example: '' });
    } catch (e) {
      alert('Lưu thất bại: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = search.trim()
    ? sets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sets;

  if (loading) return <Loading fullPage />;
  if (error)   return <ErrorState message={error} onRetry={loadSets} />;

  const inputStyle = {
    width: '100%', padding: '6px 10px', borderRadius: 8,
    border: '1px solid var(--t-border)', fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div className="t-page">
      <div className="t-topbar">
        <div>
          <h1>📚 Kho từ vựng</h1>
          <p>Tổng hợp tất cả chủ đề từ vựng đã upload</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.6fr' : '1fr', gap: 20 }}>
        {/* Danh sách chủ đề */}
        <div className="t-card" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--t-border)' }}>
            <input
              type="text" placeholder="Tìm chủ đề..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--t-border)', fontSize: 13 }}
            />
          </div>
          {filtered.length === 0
            ? <EmptyState icon="📚" title="Chưa có chủ đề nào" message="Upload từ vựng ở trang Từ vựng." />
            : filtered.map(s => (
              <div key={s.id}
                onClick={() => openSet(s)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  background: selected?.id === s.id ? 'var(--t-hover)' : 'transparent',
                  borderBottom: '1px solid var(--t-border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                <span style={{ fontSize: 20 }}>📖</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--t-muted)' }}>
                    {new Date(s.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Chi tiết từ vựng */}
        {selected && (
          <div className="t-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <button className="t-btn t-btn-sm" onClick={() => { setSelected(null); cancelEdit(); }}>✕</button>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--t-muted)', margin: '0 0 12px' }}>
              {selected.totalWords || words.length} từ · {selected.totalLessons || Math.ceil((selected.totalWords || words.length) / WORDS_PER_LESSON)} bài
              {' '}· <span style={{ color: 'var(--t-muted)' }}>(bấm ✏️ để sửa từ)</span>
            </p>
            {wordLoading ? <Loading /> : words.length === 0
              ? <EmptyState icon="📭" title="Chưa có từ nào" />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
                  {words.map(w => (
                    <div key={w.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--t-hover)', border: '1px solid var(--t-border)' }}>
                      {editingId === w.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="text" value={draft.word}
                              onChange={e => setDraft(d => ({ ...d, word: e.target.value }))}
                              placeholder="Từ tiếng Anh..." style={{ ...inputStyle, flex: 1 }}
                            />
                            {w.ipa && <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--t-muted)' }}>{w.ipa}</span>}
                          </div>
                          <input
                            type="text" value={draft.meaning_vi}
                            onChange={e => setDraft(d => ({ ...d, meaning_vi: e.target.value }))}
                            placeholder="Nghĩa tiếng Việt..." style={inputStyle}
                          />
                          <textarea
                            rows="2" value={draft.example}
                            onChange={e => setDraft(d => ({ ...d, example: e.target.value }))}
                            placeholder="Ví dụ..." style={inputStyle}
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="t-btn t-btn-sm" onClick={cancelEdit} disabled={saving}>Hủy</button>
                            <button className="t-btn t-btn-sm t-btn-primary" onClick={() => saveEdit(w)} disabled={saving}>
                              {saving ? 'Đang lưu...' : '💾 Lưu'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
                              {w.word}{' '}
                              {w.ipa && <span style={{ fontWeight: 400, color: 'var(--t-muted)', fontSize: 13 }}>{w.ipa}</span>}
                            </p>
                            <button
                              className="t-btn t-btn-sm"
                              onClick={() => startEdit(w)}
                              title="Sửa từ"
                              style={{ padding: '2px 8px' }}
                            >✏️</button>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#444' }}>{w.meaning_vi}</p>
                          {w.example && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--t-muted)', fontStyle: 'italic' }}>{w.example}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabularyReviewPage;