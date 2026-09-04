// src/pages/student/GrammarPage.jsx
import { useState, useCallback, useEffect } from 'react';
import { studentGrammarService, getGrammarQuestionCount, getGrammarQuestions, getGrammarExerciseBatches } from '../../services/studentGrammarService';
import { getAttemptCount, isAttemptLimitReached, MAX_ATTEMPTS, incrementAttemptCount } from '@/utils/attemptCounter';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import BackButton from '@/components/common/BackButton';

export default function GrammarPage() {
  const { profile } = useAuth();
  const studentId = profile?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [exerciseMode, setExerciseMode] = useState(null); // { topic, batch, batchIdx } khi làm bài nhỏ
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseBatches, setExerciseBatches] = useState([]);

  const fetchFn = useCallback(
    () => studentGrammarService.getGrammarLessons(studentId),
    [studentId]
  );

  const { data: lessons = [], loading, error, refetch } = useAsyncData(
    fetchFn, [studentId], { skip: !studentId, initial: [] }
  );

  const filtered = searchQuery.trim()
    ? lessons.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : lessons;

  const parseOptions = (raw) => {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw); } catch { return []; } })();
    const prefixRe = /^[A-Da-d][.)] /;
    const allHavePrefix = arr.length > 0 && arr.every(o => prefixRe.test(typeof o === 'string' ? o : (o.text || '')));
    if (allHavePrefix) return arr.map(o => (typeof o === 'string' ? o : (o.text || '')).replace(prefixRe, '').trim());
    return arr;
  };

  // Chọn topic → fetch các batch bài tập nhỏ
  const handleSelectTopic = async (topic) => {
    setExerciseMode(null);
    setExerciseBatches([]);
    setQuizMode(false);
    setSelected(topic);
    setExerciseLoading(true);
    try {
      const batches = await getGrammarExerciseBatches(topic.id);
      setExerciseBatches(batches);
    } catch {
      setExerciseBatches([]);
    } finally {
      setExerciseLoading(false);
    }
  };

  if (!studentId) return <EmptyState icon="🔒" title="Vui lòng đăng nhập" />;

  // Làm bài tập nhỏ theo batch
  if (exerciseMode) {
    return (
      <GrammarTimedQuiz
        topic={exerciseMode.topic}
        batch={exerciseMode.batch}
        batchIdx={exerciseMode.batchIdx}
        studentId={studentId}
        parseOptions={parseOptions}
        onBack={() => { setExerciseMode(null); }}
        onDone={() => { setExerciseMode(null); refetch(); }}
      />
    );
  }

  // Quiz full
  if (selected && quizMode) {
    return (
      <GrammarQuiz
        topic={selected}
        studentId={studentId}
        onBack={() => setQuizMode(false)}
        onDone={() => { setQuizMode(false); refetch(); }}
      />
    );
  }

  // Detail view: nội dung + danh sách bài tập nhỏ + nút quiz full
  if (selected) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#566B58',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            padding: '6px 0', marginBottom: 20, fontFamily: 'inherit',
          }}
        >
          ← Quay lại danh sách
        </button>

        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '28px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
            <span style={{ fontSize: 32 }}>📖</span>
            <div>
              {selected.isCompleted && (
                <span style={{ display: 'inline-block', background: '#EDF3ED', color: '#2E7D32', fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, marginBottom: 6 }}>
                  ✓ Đã hoàn thành
                </span>
              )}
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#332C35', margin: 0 }}>{selected.title}</h1>
            </div>
          </div>

          {selected.structure && (
            <div style={{ background: '#F5EDE0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F72', margin: '0 0 4px' }}>CẤU TRÚC</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#332C35', margin: 0, fontFamily: 'monospace' }}>{selected.structure}</p>
            </div>
          )}

          {selected.explanation && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F72', margin: '0 0 8px' }}>GIẢI THÍCH</p>
              <p style={{ fontSize: 14, color: '#4A3F35', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.explanation}</p>
            </div>
          )}

          {selected.examples && (
            <div style={{ background: '#FDFAF5', border: '1px solid #EFE6D6', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8A7F72', margin: '0 0 8px' }}>VÍ DỤ</p>
              <p style={{ fontSize: 13.5, color: '#4A3F35', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{selected.examples}</p>
            </div>
          )}
        </div>

        <GrammarExerciseList
          topic={selected}
          studentId={studentId}
          loading={exerciseLoading}
          batches={exerciseBatches}
          onPick={(batch, batchIdx) => setExerciseMode({ topic: selected, batch, batchIdx })}
        />

        <div style={{ marginTop: 16 }}>
          <GrammarQuizButton topicId={selected.id} onStart={() => setQuizMode(true)} />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div style={{ padding: '24px 20px', maxWidth: 1180, margin: '0 auto' }}>
      <BackButton to="/student/home" />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#332C35', margin: 0 }}>Học Ngữ pháp 📖</h1>
        <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '4px 0 0' }}>
          Tra cứu cấu trúc ngữ pháp và luyện tập qua bài quiz
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Tìm kiếm chủ đề ngữ pháp..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm ngữ pháp"
            style={{ width: '100%', maxWidth: 360, padding: '8px 14px', fontSize: 13.5, borderRadius: 10, border: '1px solid #EFE6D6', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {loading ? (
          <Loading text="Đang tải bài học ngữ pháp..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📖" title="Chưa có bài học ngữ pháp" message="Giáo viên sẽ thêm bài học tại đây." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map(item => (
              <div
                key={item.id}
                style={{ border: '1px solid #EFE6D6', borderRadius: 12, padding: 16, background: '#FDFAF5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onClick={() => handleSelectTopic(item)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleSelectTopic(item)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#332C35', margin: 0, wordBreak: 'break-word' }}>{item.title}</h3>
                    {item.isCompleted && (
                      <span style={{ flexShrink: 0, fontSize: 11, background: '#EDF3ED', color: '#2E7D32', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>✓ Đạt</span>
                    )}
                  </div>
                  {item.structure && (
                    <p style={{ fontSize: 12.5, color: '#566B58', margin: '0 0 6px', fontFamily: 'monospace', background: '#F5EDE0', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>{item.structure}</p>
                  )}
                  <p style={{ fontSize: 12.5, color: '#8A7F72', margin: '6px 0 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.explanation || 'Nhấn để xem chi tiết'}
                  </p>
                </div>
                <div style={{ marginTop: 14, fontSize: 12.5, color: '#566B58', fontWeight: 600, textAlign: 'right' }}>
                  Xem chi tiết →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Danh sách bài tập nhỏ của một chủ đề ngữ pháp
function GrammarExerciseList({ topic, studentId, loading, batches, onPick }) {
  if (loading) {
    return (
      <div style={{ background: '#FDFAF5', border: '1px solid #EFE6D6', borderRadius: 12, padding: '18px', textAlign: 'center', fontSize: 13.5, color: '#8A7F72' }}>
        ⏳ Đang tải bài tập nhỏ...
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: '#332C35', margin: '0 0 4px' }}>📝 Bài tập nhỏ</p>
      <p style={{ fontSize: 12.5, color: '#8A7F72', margin: '0 0 16px' }}>
        Câu hỏi được chia thành các bài nhỏ. Mỗi bài được làm tối đa {MAX_ATTEMPTS} lần.
      </p>
      {batches.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A7F72', textAlign: 'center' }}>
          Chủ đề này chưa có bài tập nhỏ. Giáo viên sẽ thêm sau.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {batches.map((batch, idx) => {
            const count = getAttemptCount('grammar', studentId, topic.id, idx);
            const reached = count >= MAX_ATTEMPTS;
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #EFE6D6', borderRadius: 12, padding: '12px 16px', background: '#FDFAF5' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#332C35' }}>Bài tập {idx + 1}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: reached ? '#C24949' : '#8A7F72', fontWeight: reached ? 700 : 500 }}>
                    {reached ? '⛔ Hết lượt làm bài (3/3)' : `${batch.length} câu · Đã làm ${count}/${MAX_ATTEMPTS} lần`}
                  </p>
                </div>
                {reached ? (
                  <span style={{ fontSize: 12, background: '#F5EDE0', color: '#8A7F72', padding: '7px 14px', borderRadius: 8, fontWeight: 700 }}>Đã hết lượt</span>
                ) : (
                  <button onClick={() => onPick(batch, idx)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Làm bài →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Bài tập nhỏ có tính giờ
function GrammarTimedQuiz({ topic, batch, batchIdx, studentId, parseOptions, onBack, onDone }) {
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!started || submitted) return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [started, submitted]);

  const handleStart = () => {
    if (studentId) incrementAttemptCount('grammar', studentId, topic.id, batchIdx);
    setStarted(true);
    setElapsed(0);
  };

  const handleSubmit = () => {
    let correct = 0;
    const prefixRe = /^[A-Da-d][.)]\s*/;
    const scored = batch.map(q => {
      const userAns  = (answers[q.id] || '').trim().toLowerCase().replace(prefixRe, '');
      const rightAns = (q.correct || '').trim().toLowerCase().replace(prefixRe, '');
      const isCorrect = userAns !== '' && userAns === rightAns;
      if (isCorrect) correct++;
      return { ...q, userAnswer: answers[q.id] || '', isCorrect };
    });
    const pct = batch.length > 0 ? Math.round((correct / batch.length) * 100) : 0;
    setResult({ correct, total: batch.length, pct, passed: pct >= 80, scored, elapsed });
    setSubmitted(true);
  };

  if (!started) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#566B58', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 24, fontFamily: 'inherit' }}>
          ← {topic.title}
        </button>
        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: '#332C35', margin: '0 0 6px' }}>Bài tập {batchIdx + 1} · {topic.title}</h2>
          <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '0 0 20px' }}>
            {batch.length} câu hỏi trắc nghiệm, có tính giờ. Chỉ chấm sau khi nhấn Nộp bài.
          </p>
          <button
            onClick={handleStart}
            style={{ padding: '12px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(86,107,88,0.25)' }}
          >
            ▶ Bắt đầu
          </button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    const m = Math.floor(result.elapsed / 60), s = result.elapsed % 60;
    return (
      <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{result.passed ? '🎉' : '💪'}</div>
          <p style={{ fontSize: 30, fontWeight: 900, color: result.passed ? '#2E7D32' : '#C24949', margin: '0 0 6px' }}>{result.pct}%</p>
          <p style={{ fontSize: 14, color: '#8A7F72', margin: '0 0 4px' }}>Đúng {result.correct}/{result.total} câu · Thời gian: {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</p>
          <p style={{ fontSize: 13.5, color: result.passed ? '#2E7D32' : '#C24949', fontWeight: 700, margin: '8px 0 0' }}>
            {result.passed ? '✅ Đạt! (≥ 80%)' : '❌ Chưa đạt. Cần ≥ 80% để đạt.'}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#4A3F35', margin: '0 0 14px' }}>📋 Chi tiết từng câu</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.scored.map((q, i) => (
              <div key={q.id} style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${q.isCorrect ? '#A7C5A9' : '#FBD5D5'}`, background: q.isCorrect ? '#EDF3ED' : '#FEF3F3' }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#332C35', margin: '0 0 6px' }}>
                  {q.isCorrect ? '✅' : '❌'} Câu {i + 1}: {q.question}
                </p>
                <p style={{ fontSize: 12.5, color: '#4A3F35', margin: '0 0 2px' }}>
                  Bạn chọn: <b style={{ color: q.isCorrect ? '#2E9767' : '#C24949' }}>{q.userAnswer || '(bỏ trống)'}</b>
                </p>
                {!q.isCorrect && result.passed && (
                  <p style={{ fontSize: 12.5, color: '#2E7D32', margin: 0 }}>Đáp án đúng: <b>{q.correct}</b></p>
                )}
                {!q.isCorrect && !result.passed && (
                  <p style={{ fontSize: 12.5, color: '#C24949', margin: 0 }}>Hãy xem lại và làm bài tiếp để xem đáp án.</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onBack} style={{ flex: 1, padding: 12, background: '#F5EDE0', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#8A7F72', cursor: 'pointer', fontFamily: 'inherit' }}>← Xem bài học</button>
          <button onClick={onDone} style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #566B58, #768E78)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Về danh sách</button>
        </div>
      </div>
    );
  }

  const m = Math.floor(elapsed / 60), s = elapsed % 60;
  return (
    <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#566B58', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 20, fontFamily: 'inherit' }}>
        ← {topic.title}
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#332C35', margin: '0 0 4px' }}>📝 Bài tập {batchIdx + 1}</h2>
          <p style={{ fontSize: 13, color: '#8A7F72', margin: 0 }}>{batch.length} câu — Trả lời hết rồi nộp bài</p>
        </div>
        <span style={{ background: '#566B58', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {batch.map((q, i) => {
          const opts = parseOptions(q.options);
          const isMultiple = q.question_type === 'multiple_choice' && opts.length > 0;
          const userAns = answers[q.id];
          return (
            <div key={q.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #EFE6D6', padding: '18px 20px' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span style={{ background: '#F5EDE0', color: '#8A7F72', fontSize: 12, fontWeight: 800, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <p style={{ fontSize: 14.5, color: '#332C35', margin: 0, lineHeight: 1.6 }}>{q.question}</p>
              </div>
              {q.difficulty && (
                <span style={{ fontSize: 11, background: '#F5EDE0', color: '#8A7F72', padding: '2px 8px', borderRadius: 20, marginBottom: 10, display: 'inline-block' }}>
                  {q.difficulty === 'nhan_biet' ? 'Nhận biết' : q.difficulty === 'van_dung' ? 'Vận dụng' : 'Vận dụng cao'}
                </span>
              )}
              {isMultiple ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {opts.map((opt, j) => {
                    const label = typeof opt === 'string' ? opt : opt.text || opt;
                    const sel = answers[q.id] === label;
                    return (
                      <button key={j} onClick={() => setAnswers(a => ({ ...a, [q.id]: label }))}
                        aria-pressed={sel}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `2px solid ${sel ? '#566B58' : '#EFE6D6'}`, borderRadius: 10, background: sel ? '#EDF3ED' : '#FDFAF5', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${sel ? '#566B58' : '#C6BDB0'}`, background: sel ? '#566B58' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                        </span>
                        <span style={{ fontSize: 14, color: sel ? '#3A5040' : '#4A3F35', fontWeight: sel ? 600 : 400 }}>{String.fromCharCode(65 + j)}. {String(label).replace(/^[A-Da-d][.)]\s*/, '')}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={userAns || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Nhập câu trả lời..."
                  aria-label={`Câu trả lời câu ${i + 1}`}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 10, border: `2px solid ${userAns ? '#566B58' : '#EFE6D6'}`, outline: 'none', fontFamily: 'inherit', background: '#FDFAF5', boxSizing: 'border-box' }}
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(86,107,88,0.25)' }}
      >
        ✅ Nộp bài kiểm tra
      </button>
    </div>
  );
}

// Nút kiểm tra — chỉ hiện nếu topic có câu hỏi
function GrammarQuizButton({ topicId, onStart }) {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check số câu hỏi (CLEAN-02: dùng service thay vì supabase trực tiếp)
  useEffect(() => {
    getGrammarQuestionCount(topicId)
      .then(c => { setCount(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, [topicId]);

  if (loading) return null;
  if (!count || count === 0) {
    return (
      <div style={{ background: '#FDFAF5', border: '1px solid #EFE6D6', borderRadius: 12, padding: '14px 18px', fontSize: 13.5, color: '#8A7F72', textAlign: 'center' }}>
        📝 Chủ đề này chưa có bài kiểm tra. Giáo viên sẽ thêm sau.
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      style={{
        width: '100%', padding: '13px', fontSize: 15, fontWeight: 700,
        background: 'linear-gradient(135deg, #566B58, #768E78)',
        color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
        fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(86,107,88,0.25)',
      }}
    >
      ✏️ Làm bài kiểm tra ({count} câu)
    </button>
  );
}

// Quiz component cho grammar
function GrammarQuiz({ topic, studentId, onBack, onDone }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [answers, setAnswers]     = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]       = useState(null);

  // CLEAN-02: dùng service thay vì supabase trực tiếp
  useEffect(() => {
    getGrammarQuestions(topic.id)
      .then(data => { setQuestions(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [topic.id]);

  const handleSubmit = () => {
    let correct = 0;
    const prefixRe = /^[A-Da-d][.)]\s*/;
    const scored = questions.map(q => {
      const userAns  = (answers[q.id] || '').trim().toLowerCase().replace(prefixRe, '');
      const rightAns = (q.correct || '').trim().toLowerCase().replace(prefixRe, '');
      const isCorrect = userAns !== '' && userAns === rightAns;
      if (isCorrect) correct++;
      return { ...q, userAnswer: answers[q.id] || '', isCorrect };
    });
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setResult({ correct, total: questions.length, pct, passed: pct >= 80, scored });
    setSubmitted(true);
  };

  const parseOptions = (raw) => {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw); } catch { return []; } })();
    // Nếu options đã có prefix "A. " / "A) " thì bóc ra, tránh render "A. A. work"
    const prefixRe = /^[A-Da-d][.)] /;
    const allHavePrefix = arr.length > 0 && arr.every(o => prefixRe.test(typeof o === 'string' ? o : (o.text || '')));
    if (allHavePrefix) return arr.map(o => (typeof o === 'string' ? o : (o.text || '')).replace(prefixRe, '').trim());
    return arr;
  };

  if (loading) return <div style={{ padding: '60px 20px', textAlign: 'center' }}><Loading text="Đang tải câu hỏi..." /></div>;
  if (error) return <div style={{ padding: 20 }}><ErrorState message={error} onRetry={onBack} /></div>;
  if (!questions.length) return (
    <div style={{ padding: 20 }}>
      <EmptyState icon="📝" title="Chưa có câu hỏi" message="Giáo viên chưa thêm câu hỏi cho chủ đề này." />
      <button onClick={onBack} style={{ display: 'block', margin: '16px auto', padding: '10px 24px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Quay lại</button>
    </div>
  );

  if (submitted && result) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          background: result.passed ? 'linear-gradient(135deg, #566B58, #768E78)' : 'linear-gradient(135deg, #A0522D, #C27B5A)',
          borderRadius: 18, padding: '28px', textAlign: 'center', color: '#fff', marginBottom: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{result.passed ? '🎉' : '💪'}</div>
          <p style={{ fontSize: 28, fontWeight: 900, margin: '0 0 6px' }}>{result.pct}%</p>
          <p style={{ fontSize: 15, margin: '0 0 12px', opacity: 0.9 }}>{result.passed ? 'Xuất sắc! Bạn đã đạt!' : 'Cố lên! Hãy ôn lại bài nhé.'}</p>
          <p style={{ fontSize: 13.5, opacity: 0.85, margin: 0 }}>Đúng {result.correct}/{result.total} câu</p>
        </div>

        {/* Review */}
        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#4A3F35', margin: '0 0 14px' }}>📋 Chi tiết từng câu</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.scored.map((q, i) => (
              <div key={q.id} style={{
                padding: '12px 14px', borderRadius: 10,
                border: `2px solid ${q.isCorrect ? '#A7C5A9' : '#FBD5D5'}`,
                background: q.isCorrect ? '#EDF3ED' : '#FEF3F3',
              }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#332C35', margin: '0 0 6px' }}>
                  {q.isCorrect ? '✅' : '❌'} Câu {i + 1}: {q.question}
                </p>
                <p style={{ fontSize: 12.5, color: '#4A3F35', margin: '0 0 2px' }}>
                  Bạn chọn: <b style={{ color: q.isCorrect ? '#2E9767' : '#C24949' }}>{q.userAnswer || '(bỏ trống)'}</b>
                </p>
                {!q.isCorrect && result.passed && (
                  <p style={{ fontSize: 12.5, color: '#2E7D32', margin: 0 }}>Đáp án đúng: <b>{q.correct}</b></p>
                )}
                {!q.isCorrect && !result.passed && (
                  <p style={{ fontSize: 12.5, color: '#C24949', margin: 0 }}>Hãy xem lại và làm bài tiếp để xem đáp án.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onBack} style={{ flex: 1, padding: 12, background: '#F5EDE0', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#8A7F72', cursor: 'pointer', fontFamily: 'inherit' }}>← Xem bài học</button>
          <button onClick={onDone} style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #566B58, #768E78)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Về danh sách</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#566B58', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 20, fontFamily: 'inherit' }}>
        ← {topic.title}
      </button>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#332C35', margin: '0 0 4px' }}>✏️ Bài kiểm tra ngữ pháp</h2>
        <p style={{ fontSize: 13, color: '#8A7F72', margin: 0 }}>{questions.length} câu — Trả lời hết rồi nộp bài</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {questions.map((q, i) => {
          const opts = parseOptions(q.options);
          const isMultiple = q.question_type === 'multiple_choice' && opts.length > 0;
          return (
            <div key={q.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #EFE6D6', padding: '18px 20px' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span style={{ background: '#F5EDE0', color: '#8A7F72', fontSize: 12, fontWeight: 800, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <p style={{ fontSize: 14.5, color: '#332C35', margin: 0, lineHeight: 1.6 }}>{q.question}</p>
              </div>
              {q.difficulty && (
                <span style={{ fontSize: 11, background: '#F5EDE0', color: '#8A7F72', padding: '2px 8px', borderRadius: 20, marginBottom: 10, display: 'inline-block' }}>
                  {q.difficulty === 'nhan_biet' ? 'Nhận biết' : q.difficulty === 'van_dung' ? 'Vận dụng' : 'Vận dụng cao'}
                </span>
              )}
              {isMultiple ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {opts.map((opt, j) => {
                    const label = typeof opt === 'string' ? opt : opt.text || opt;
                    const sel = answers[q.id] === label;
                    return (
                      <button key={j} onClick={() => setAnswers(a => ({ ...a, [q.id]: label }))}
                        aria-pressed={sel}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `2px solid ${sel ? '#566B58' : '#EFE6D6'}`, borderRadius: 10, background: sel ? '#EDF3ED' : '#FDFAF5', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${sel ? '#566B58' : '#C6BDB0'}`, background: sel ? '#566B58' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                        </span>
                        <span style={{ fontSize: 14, color: sel ? '#3A5040' : '#4A3F35', fontWeight: sel ? 600 : 400 }}>{String.fromCharCode(65 + j)}. {String(label).replace(/^[A-Da-d][.)]\s*/, '')}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Nhập câu trả lời..."
                  aria-label={`Câu trả lời câu ${i + 1}`}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 10, border: `2px solid ${answers[q.id] ? '#566B58' : '#EFE6D6'}`, outline: 'none', fontFamily: 'inherit', background: '#FDFAF5', boxSizing: 'border-box' }}
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(86,107,88,0.25)' }}
      >
        ✅ Nộp bài kiểm tra
      </button>
    </div>
  );
}
