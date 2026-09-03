// src/pages/teacher/VocabularyReviewPage.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
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
    setWordLoading(true);
    try {
      const { data, error } = await supabase
        .from('vocabularies')
        .select('id, word, meaning_vi, example, ipa')
        .eq('topic_id', set.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setWords(data || []);
      // MỤC 3E: tính tổng số bài nhỏ
      const totalWords = data?.length || 0;
      const totalLessons = Math.ceil(totalWords / WORDS_PER_LESSON);
      setSelected(s => s ? { ...s, totalWords, totalLessons } : s);
    } catch { setWords([]); }
    finally { setWordLoading(false); }
  };

  const filtered = search.trim()
    ? sets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sets;

  if (loading) return <Loading fullPage />;
  if (error)   return <ErrorState message={error} onRetry={loadSets} />;

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
              <button className="t-btn t-btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--t-muted)', margin: '0 0 12px' }}>
              {selected.totalWords || words.length} từ · {selected.totalLessons || Math.ceil((selected.totalWords || words.length) / WORDS_PER_LESSON)} bài
            </p>
            {wordLoading ? <Loading /> : words.length === 0
              ? <EmptyState icon="📭" title="Chưa có từ nào" />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
                  {words.map(w => (
                    <div key={w.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--t-hover)', border: '1px solid var(--t-border)' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
                        {w.word}{' '}
                        {w.ipa && <span style={{ fontWeight: 400, color: 'var(--t-muted)', fontSize: 13 }}>{w.ipa}</span>}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#444' }}>{w.meaning_vi}</p>
                      {w.example && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--t-muted)', fontStyle: 'italic' }}>{w.example}</p>}
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