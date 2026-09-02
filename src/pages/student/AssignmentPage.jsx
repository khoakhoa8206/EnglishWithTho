// src/pages/student/AssignmentPage.jsx
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { assignmentService } from '@/services/assignment/assignmentService';
import { useAsyncData } from '@/hooks/useAsyncData';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import QuizEngine from '@/components/assignment/QuizEngine';
import ResultPanel from '@/components/assignment/ResultPanel';
import BackButton from '@/components/common/BackButton';
import ListeningDictationEngine from '@/components/assignment/ListeningDictationEngine';
import { listeningService } from '@/services/listeningService';
// BUG FIX: lấy IPA và full word list từ vocabularies table
import { studentVocabularyService } from '@/services/studentVocabularyService';

// Shuffle helper
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function AssignmentPage() {
  const { id: assignmentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const studentId = profile?.id;

  // phase: 'intro' | 'preview' | 'part1' | 'part1_review' | 'part2' | 'part3' | 'part4_doing' | 'result'
  const [phase, setPhase] = useState('intro');
  const [unknownWords, setUnknownWords] = useState([]);
  const [result, setResult] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fetchFn = useCallback(
    () => assignmentService.getById(assignmentId),
    [assignmentId]
  );

  const {
    data: assignment,
    loading,
    error,
    refetch,
  } = useAsyncData(fetchFn, [assignmentId], { skip: !assignmentId });

  const fetchAttempts = useCallback(
    () => (studentId && assignmentId
      ? assignmentService.getAttempts(assignmentId, studentId)
      : Promise.resolve([])),
    [assignmentId, studentId]
  );
  const { data: prevAttempts = [], refetch: refetchAttempts } = useAsyncData(
    fetchAttempts,
    [assignmentId, studentId],
    { skip: !studentId || !assignmentId, initial: [] }
  );

  const hasPrevAttempt = prevAttempts.length > 0;
  const isVocab = assignment?.assignment_type === 'vocabulary';
  const isListening = assignment?.assignment_type === 'listening';

  const fetchMaterial = useCallback(() => {
    if (assignment?.listening_material_id) {
      return listeningService.getFullById(assignment.listening_material_id);
    }
    return Promise.resolve(null);
  }, [assignment?.listening_material_id]);

  const { data: listeningMaterial } = useAsyncData(fetchMaterial, [assignment?.listening_material_id], {
    skip: !assignment?.listening_material_id,
  });

  // BUG FIX: fetch full vocab (có IPA, example) trực tiếp từ vocabularies table
  const fetchVocabFull = useCallback(() => {
    if (assignment?.vocab_topic_id) {
      return studentVocabularyService.getVocabularies(assignment.vocab_topic_id);
    }
    return Promise.resolve([]);
  }, [assignment?.vocab_topic_id]);

  const { data: vocabFull = [] } = useAsyncData(fetchVocabFull, [assignment?.vocab_topic_id], {
    skip: !assignment?.vocab_topic_id,
    initial: [],
  });

  // Fetch bài tập Part 4: quiz từ file riêng giáo viên upload (vocab_exercise_files)
  const fetchVocabExercise = useCallback(() => {
    if (assignment?.vocab_topic_id && isVocab) {
      return studentVocabularyService.getVocabExercises(assignment.vocab_topic_id);
    }
    return Promise.resolve([]);
  }, [assignment?.vocab_topic_id, isVocab]);

  const { data: vocabExercises = [] } = useAsyncData(fetchVocabExercise, [assignment?.vocab_topic_id], {
    skip: !assignment?.vocab_topic_id || !isVocab,
    initial: [],
  });

  // BUG FIX: chỉ lấy file exercise MỚI NHẤT (vocabExercises đã được sắp xếp
  // created_at desc ở service), không flatMap tất cả các file — nếu giáo viên
  // upload lại (tạo record mới) thì các file cũ vẫn còn trong DB và flatMap
  // sẽ cộng dồn câu hỏi (vd: 30 câu cũ + 30 câu mới = lặp 60 câu).
  const latestVocabExercise = vocabExercises[0];
  const vocabExerciseQuestions = latestVocabExercise
    ? (() => {
        const qs = Array.isArray(latestVocabExercise.questions)
          ? latestVocabExercise.questions
          : (() => { try { return JSON.parse(latestVocabExercise.questions); } catch { return []; } })();
        return qs.map((q, i) => ({
          id: q.id || `${latestVocabExercise.id}_${i}`,
          question: q.question || q.question_text || '',
          options: q.options || [],
          correct: q.correct || '',
          question_type: q.question_type || 'multiple_choice',
          hint: q.hint || '',
        }));
      })()
    : [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Học lại từ đầu (→ preview nếu vocab, → part4 nếu không phải vocab)
  const handleStartFresh = () => {
    setSubmitError(null);
    if (isVocab) {
      setPhase('preview');
    } else {
      setStartedAt(new Date().toISOString());
      setPhase('part4_doing');
    }
  };

  // Làm lại bài 4 (bỏ qua preview và part 1-3)
  const handleRetakePart4 = () => {
    setStartedAt(new Date().toISOString());
    setSubmitError(null);
    setPhase('part4_doing');
  };

  // Preview → Part 1
  const handlePreviewReady = () => setPhase('part1');

  // Part 1 xong
  const handlePart1Done = (unknowns) => {
    setUnknownWords(unknowns);
    setPhase(unknowns.length > 0 ? 'part1_review' : 'part2');
  };

  // Part 1 review xong
  const handlePart1ReviewDone = () => setPhase('part2');

  // Part 2 xong
  const handlePart2Done = () => setPhase('part3');

  // Part 3 xong
  const handlePart3Done = () => {
    setStartedAt(new Date().toISOString());
    setPhase('part4_doing');
  };

  // Submit quiz
  const handleSubmit = async (answers) => {
    if (!studentId || !assignmentId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await assignmentService.submitAttempt({
        studentId,
        assignmentId,
        startedAt,
        answers,
      });
      setResult(res);
      setPhase('result');
      refetchAttempts();
    } catch (e) {
      setSubmitError(e.message || 'Có lỗi khi nộp bài. Thử lại nhé.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setPhase('intro');
    setResult(null);
    setStartedAt(null);
    setUnknownWords([]);
    setSubmitError(null);
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!studentId) {
    return <EmptyState icon="🔒" title="Vui lòng đăng nhập" message="Bạn cần đăng nhập để làm bài." />;
  }
  if (loading) return <Loading fullPage text="Đang tải bài tập..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!assignment) return <EmptyState icon="📭" title="Không tìm thấy bài tập" />;

  const questions = assignment.assignment_questions || [];

  // BUG FIX: ưu tiên vocabFull (từ bảng vocabularies, có đủ IPA/example/part_of_speech)
  // Fallback về extractVocabWords nếu không có vocab_topic_id (assignment cũ)
  // Dùng cho Part 1 (Flashcard) - học toàn bộ từ vựng của topic.
  const vocabWords = vocabFull.length > 0 ? vocabFull : extractVocabWords(questions);

  // BUG FIX: assignment_questions chỉ chứa đúng các câu hỏi nghĩa mà giáo viên
  // đã CHỌN khi tạo bài (selectedVocabIds), không phải toàn bộ từ của topic.
  // Part 2 (Matching) và Part 3 (Fill) phải dùng đúng danh sách đã chọn này,
  // không được dùng vocabWords/vocabFull (toàn bộ từ trong topic).
  const selectedWordsRaw = extractVocabWords(questions);
  const selectedWords = vocabFull.length > 0
    ? selectedWordsRaw
        .map(sw => vocabFull.find(
          vf => vf.word.trim().toLowerCase() === sw.word.trim().toLowerCase()
        ) || sw)
    : selectedWordsRaw;

  return (
    <div style={phase === 'part4_doing' && isListening ? { minHeight: '100vh' } : { padding: '24px 20px', maxWidth: 860, margin: '0 auto', minHeight: '100vh' }}>
      {phase !== 'part4_doing' && <BackButton to="/student/homework" />}

      {/* INTRO */}
      {phase === 'intro' && (
        <IntroPanel
          assignment={assignment}
          questions={questions}
          part4Count={isVocab ? vocabExerciseQuestions.length : questions.length}
          prevAttempts={prevAttempts}
          hasPrevAttempt={hasPrevAttempt}
          isVocab={isVocab}
          onStartFresh={handleStartFresh}
          onRetakePart4={handleRetakePart4}
        />
      )}

      {/* PREVIEW (vocab only) */}
      {phase === 'preview' && (
        <PreviewPanel
          assignment={assignment}
          words={vocabWords}
          questions={questions}
          onReady={handlePreviewReady}
          onBack={() => setPhase('intro')}
        />
      )}

      {/* PART 1 — Flashcard */}
      {phase === 'part1' && vocabWords.length > 0 && (
        <PartWrapper title="Phần 1: Flashcard" step={1} total={4}>
          <Part1Flashcard
            words={vocabWords}
            onDone={handlePart1Done}
          />
        </PartWrapper>
      )}

      {/* PART 1 REVIEW */}
      {phase === 'part1_review' && (
        <PartWrapper title="Ôn lại từ chưa thuộc" step={1} total={4} subtitle="Ôn lại các từ bạn chưa nhớ">
          <Part1Flashcard
            words={unknownWords}
            onDone={handlePart1ReviewDone}
            reviewMode
          />
        </PartWrapper>
      )}

      {/* PART 2 — Matching */}
      {phase === 'part2' && (
        <PartWrapper title="Phần 2: Nối từ" step={2} total={4}>
          <Part2Matching
            words={selectedWords}
            onDone={handlePart2Done}
          />
        </PartWrapper>
      )}

      {/* PART 3 — Input */}
      {phase === 'part3' && selectedWords.length > 0 && (
        <PartWrapper title="Phần 3: Điền từ" step={3} total={4}>
          <Part3Input
            words={selectedWords}
            onDone={handlePart3Done}
          />
        </PartWrapper>
      )}

      {/* PART 4 — Quiz / Listening */}
      {phase === 'part4_doing' && (
        isListening ? (
          <ListeningDictationEngine
            assignment={assignment}
            questions={questions || []}
            listeningMaterial={listeningMaterial}
            startedAt={startedAt}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
            onCancel={() => setPhase('intro')}
          />
        ) : (
          <QuizEngine
            assignment={assignment}
            questions={isVocab && vocabExerciseQuestions.length > 0 ? vocabExerciseQuestions : questions}
            startedAt={startedAt}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
            onCancel={() => setPhase('intro')}
          />
        )
      )}

      {/* RESULT */}
      {phase === 'result' && result && (
        <ResultPanel
          assignment={assignment}
          result={result}
          studentId={studentId}
          onRetry={handleRetry}
          onBack={() => navigate('/student/homework')}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract danh sách từ từ assignment_questions để dùng ở Part 1-3 */
function extractVocabWords(questions) {
  const vocabQ = questions.filter(q => q.question_type === 'multiple_choice');

  return vocabQ
    .map((q, idx) => {
      // Chỉ xử lý câu dạng vocab chuẩn: '"word" có nghĩa là gì?'
      const match = (q.question || '').match(/^\s*["""]?(.*?)["""]?\s+có nghĩa là gì\?\s*$/i);
      if (!match) return null; // bỏ qua fill_in_blank, listening, grammar

      return {
        id:             q.id || idx,
        word:           match[1].trim(),
        meaning_vi:     (q.correct || '').trim(),
        ipa:            '',
        example:        q.explanation || '',
        part_of_speech: q.hint || '',
      };
    })
    .filter(Boolean)
    .filter(w => w.word && w.meaning_vi);
}
// ─── Wrapper ─────────────────────────────────────────────────────────────────

function PartWrapper({ title, subtitle, step, total, children }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #EFE6D6',
      borderRadius: 18,
      padding: '28px 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: i < step ? '#566B58' : '#EFE6D6',
          }} />
        ))}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#332C35', margin: '0 0 4px' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: '#8A7F72', margin: '0 0 20px' }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 20 }} />}
      {children}
    </div>
  );
}

// ─── Intro Panel ──────────────────────────────────────────────────────────────

function IntroPanel({ assignment, questions, part4Count, prevAttempts, hasPrevAttempt, isVocab, onStartFresh, onRetakePart4 }) {
  const bestAttempt = prevAttempts.length > 0
    ? prevAttempts.reduce((b, c) => (c.score > b.score ? c : b), prevAttempts[0])
    : null;

  const TYPE_EMOJI = { vocabulary: '📚', grammar: '✏️', listening: '🎧', review: '🔄' };
  const emoji = TYPE_EMOJI[assignment.assignment_type] || '📝';

  return (
    <div>
      <div style={{
        background: '#fff',
        border: '1px solid #EFE6D6',
        borderRadius: 18,
        padding: '32px 28px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        marginBottom: 20,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>{emoji}</span>
          <div>
            <span style={{
              display: 'inline-block',
              background: '#F5EDE0', color: '#8A7F72',
              fontSize: 11.5, fontWeight: 700, padding: '3px 10px',
              borderRadius: 20, marginBottom: 8,
            }}>
              {assignment.assignment_type || 'Bài tập'}
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#332C35', margin: 0 }}>
              {assignment.title}
            </h1>
            {assignment.deadline && (
              <p style={{ fontSize: 12.5, color: '#8A7F72', margin: '6px 0 0' }}>
                Hạn nộp: {new Date(assignment.deadline).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        </div>

        {/* Thông tin */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}>
          <InfoCard icon="❓" label="Số câu" value={part4Count ?? questions.length} />
          <InfoCard icon="🎯" label="Điều kiện đạt" value="≥ 80%" />
          <InfoCard icon="🔄" label="Lần đã làm" value={prevAttempts.length} />
          {bestAttempt && (
            <InfoCard
              icon="⭐"
              label="Điểm cao nhất"
              value={`${bestAttempt.score}%`}
              highlight={bestAttempt.passed}
            />
          )}
        </div>

        {/* Lịch sử */}
        {prevAttempts.length > 0 && (
          <div style={{
            background: '#FDFAF5', borderRadius: 12,
            border: '1px solid #EFE6D6', padding: '14px 16px',
            marginBottom: 24,
          }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: '#8A7F72', margin: '0 0 10px' }}>
              Lịch sử làm bài
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {prevAttempts.map((a) => (
                <div key={a.id} style={{
                  display: 'flex', gap: 12, flexWrap: 'wrap',
                  fontSize: 12.5, color: '#4A3F35',
                  padding: '6px 10px', background: '#fff',
                  borderRadius: 8, border: '1px solid #EFE6D6',
                }}>
                  <span style={{ fontWeight: 700 }}>Lần {a.attempt_number}</span>
                  <span>Điểm: <b style={{ color: a.passed ? '#2E9767' : '#C24949' }}>{a.score}%</b></span>
                  <span>Đúng: {a.correct_count}/{a.total_questions}</span>
                  <span>TG: {a.duration_seconds
                    ? `${Math.floor(a.duration_seconds / 60)}p${a.duration_seconds % 60}s`
                    : '—'}
                  </span>
                  <span style={{ color: '#8A7F72', marginLeft: 'auto' }}>
                    {a.completed_at ? new Date(a.completed_at).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nút bắt đầu */}
        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#8A7F72', fontSize: 14 }}>
            ⚠️ Bài tập chưa có câu hỏi. Vui lòng chờ giáo viên cập nhật.
          </div>
        ) : hasPrevAttempt && isVocab ? (
          /* Đã làm + vocab: hiện 2 nút */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={onStartFresh}
              style={{
                width: '100%', padding: '13px', fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #566B58, #768E78)',
                color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              📚 Học lại từ đầu (Part 1 → 4)
            </button>
            <button
              onClick={onRetakePart4}
              style={{
                width: '100%', padding: '13px', fontSize: 15, fontWeight: 700,
                background: '#fff', color: '#566B58',
                border: '2px solid #566B58', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              🔄 Làm lại bài 4 (Quiz)
            </button>
          </div>
        ) : (
          <button
            onClick={onStartFresh}
            style={{
              width: '100%', padding: '14px', fontSize: 15.5, fontWeight: 700,
              background: 'linear-gradient(135deg, #566B58, #768E78)',
              color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: 0.3,
              boxShadow: '0 3px 12px rgba(86,107,88,0.3)',
            }}
          >
            {isVocab ? '📚 Bắt đầu học' : '▶ Bắt đầu làm bài'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({ assignment, words, questions, onReady, onBack }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div style={{
      background: '#FDF6EC',
      borderRadius: 18,
      padding: '0 0 24px',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        border: '1px solid #EFE6D6',
        borderRadius: 18,
        padding: '24px 24px 20px',
        marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>📖</span>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#332C35', margin: 0 }}>
            Ôn tập trước khi làm bài
          </h2>
        </div>
        <p style={{ fontSize: 13.5, color: '#8A7F72', margin: 0 }}>
          Đọc qua danh sách từ vựng bên dưới trước khi bắt đầu nhé.
        </p>
      </div>

      {/* Word list */}
      <div style={{
        background: '#fff',
        border: '1px solid #EFE6D6',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        {words.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#8A7F72' }}>
            Không có từ vựng để hiển thị.
          </div>
        ) : isMobile ? (
          /* Mobile: card layout */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {words.map((w, i) => (
              <div key={w.id} style={{
                padding: '14px 18px',
                borderBottom: i < words.length - 1 ? '1px solid #F5EDE0' : 'none',
                background: i % 2 === 0 ? '#fff' : '#FDFAF5',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#332C35', marginBottom: 2 }}>{w.word}</div>
                {w.ipa && <div style={{ fontSize: 12, color: '#9C8D7E', fontStyle: 'italic', marginBottom: 4 }}>{w.ipa}</div>}
                <div style={{ fontSize: 14, color: '#566B58', fontWeight: 600 }}>{w.meaning_vi}</div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: table layout */
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#EBDEC0' }}>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#4A3F35' }}>Từ</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#4A3F35' }}>IPA</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#4A3F35' }}>Nghĩa</th>
              </tr>
            </thead>
            <tbody>
              {words.map((w, i) => (
                <tr key={w.id} style={{ background: i % 2 === 0 ? '#fff' : '#FDFAF5' }}>
                  <td style={{ padding: '11px 18px', fontSize: 15, fontWeight: 700, color: '#332C35' }}>{w.word}</td>
                  <td style={{ padding: '11px 18px', fontSize: 13, color: '#9C8D7E', fontStyle: 'italic' }}>{w.ipa || '—'}</td>
                  <td style={{ padding: '11px 18px', fontSize: 14, color: '#566B58', fontWeight: 600 }}>{w.meaning_vi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <button
          onClick={onReady}
          style={{
            width: '100%', maxWidth: 360,
            padding: '14px 32px', fontSize: 16, fontWeight: 700,
            background: '#566B58', color: '#fff',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 3px 12px rgba(86,107,88,0.28)',
          }}
        >
          Sẵn sàng làm bài ✓
        </button>
        <button
          onClick={onBack}
          style={{
            display: 'block', margin: '10px auto 0',
            background: 'none', border: 'none', color: '#8A7F72',
            fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ← Quay lại
        </button>
      </div>
    </div>
  );
}

// ─── Part 1: Flashcard ────────────────────────────────────────────────────────

function Part1Flashcard({ words, onDone, reviewMode = false }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownWords, setKnownWords] = useState([]);
  const [unknownWords, setUnknownWords] = useState([]);

  const word = words[idx];

  const handleKnown = () => {
    const newKnown = [...knownWords, word];
    const newIdx = idx + 1;
    if (newIdx >= words.length) {
      // Done
      if (reviewMode) {
        onDone(); // review mode: luôn sang part 2
      } else {
        onDone(unknownWords); // truyền unknowns để quyết định có review không
      }
    } else {
      setKnownWords(newKnown);
      setIdx(newIdx);
      setFlipped(false);
    }
  };

  const handleUnknown = () => {
    const newUnknown = [...unknownWords, word];
    const newIdx = idx + 1;
    if (newIdx >= words.length) {
      if (reviewMode) {
        // Trong review mode vẫn truyền unknowns — component cha sẽ quyết định
        onDone();
      } else {
        onDone(newUnknown);
      }
    } else {
      setUnknownWords(newUnknown);
      setIdx(newIdx);
      setFlipped(false);
    }
  };

  const speak = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#8A7F72' }}>{idx + 1} / {words.length}</span>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
        style={{
          minHeight: 180, borderRadius: 14, border: '2px solid #EFE6D6',
          background: flipped ? '#EDF3ED' : '#FDFAF5',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, cursor: 'pointer', transition: 'background 0.2s', marginBottom: 20,
        }}
      >
        {!flipped ? (
          <>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#332C35', margin: '0 0 8px', textAlign: 'center' }}>{word.word}</p>
            {word.ipa && <p style={{ fontSize: 14, color: '#8A7F72', margin: '0 0 6px', fontStyle: 'italic' }}>{word.ipa}</p>}
            {word.part_of_speech && <span style={{ fontSize: 12, background: '#F5EDE0', color: '#8A7F72', padding: '2px 10px', borderRadius: 20 }}>{word.part_of_speech}</span>}
            <button onClick={(e) => { e.stopPropagation(); speak(word.word); }} title="Nghe phát âm" style={{ marginTop: 12, background: 'none', border: '1px solid #C6BDB0', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>🔊</button>
            <p style={{ fontSize: 12, color: '#B0A8A0', marginTop: 16 }}>Nhấn để xem nghĩa</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#332C35', margin: '0 0 4px', textAlign: 'center' }}>{word.word}</p>
            {word.ipa && <p style={{ fontSize: 13, color: '#8A7F72', fontStyle: 'italic', margin: '0 0 8px', textAlign: 'center' }}>{word.ipa}</p>}
            <p style={{ fontSize: 20, fontWeight: 700, color: '#2E7D32', margin: '0 0 10px', textAlign: 'center' }}>{word.meaning_vi}</p>
            {word.example && <p style={{ fontSize: 13, color: '#566B58', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>"{word.example}"</p>}
          </>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleUnknown}
          style={{
            flex: 1, padding: '11px 10px', borderRadius: 10,
            border: '2px solid #FBD5D5', background: '#FEF3F3',
            color: '#C24949', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ← Chưa thuộc
        </button>
        <button
          onClick={handleKnown}
          style={{
            flex: 1, padding: '11px 10px', borderRadius: 10,
            border: 'none', background: '#566B58',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Đã thuộc →
        </button>
      </div>
    </div>
  );
}

// ─── Part 2: Matching ─────────────────────────────────────────────────────────

// BUG 4 FIX: Bỏ toàn bộ selector "Số cặp" — học sinh không có quyền chọn
// Dùng tất cả từ (tối đa 15 để tránh quá dài)
function Part2Matching({ words, onDone }) {
  const MAX_PAIRS = 15;

  // Guard: chờ words load xong
  if (!words || words.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#8A7F72' }}>
        ⏳ Đang tải từ vựng...
      </div>
    );
  }

  if (words.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ color: '#C24949' }}>Cần ít nhất 2 từ để chơi ghép nối.</p>
        <button onClick={onDone} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#566B58', color: '#fff', cursor: 'pointer', marginTop: 10 }}>Bỏ qua</button>
      </div>
    );
  }

  // Bắt đầu ngay, không cần màn hình chọn số lượng
  const count = Math.min(MAX_PAIRS, words.length);
  return <Part2MatchingInner words={words} count={count} onDone={onDone} />;
}

function Part2MatchingInner({ words, count, onDone }) {
  const pool = React.useMemo(() => shuffle([...words]).slice(0, count), [words, count]);
  // FIX CRASH: dùng useMemo thay vì useState để leftItems/rightItems cập nhật cùng pool
  const leftItems  = React.useMemo(() => shuffle([...pool]), [pool]);
  const rightItems = React.useMemo(() => shuffle([...pool]), [pool]);
  const [selected, setSelected] = useState({ left: null, right: null });
  const [matched, setMatched] = useState(new Set());
  const [wrongPair, setWrongPair] = useState(null);

  // Reset khi pool thay đổi (words load xong)
  React.useEffect(() => {
    setSelected({ left: null, right: null });
    setMatched(new Set());
    setWrongPair(null);
  }, [pool]);

  const handleLeft = (id) => {
    if (matched.has(id)) return;
    setSelected(s => ({ ...s, left: id }));
    tryMatch({ ...selected, left: id });
  };

  const handleRight = (id) => {
    if (matched.has(id)) return;
    setSelected(s => ({ ...s, right: id }));
    tryMatch({ ...selected, right: id });
  };

  const tryMatch = ({ left, right }) => {
    if (left == null || right == null) return;
    if (left === right) {
      const newMatched = new Set(matched);
      newMatched.add(left);
      setMatched(newMatched);
      setSelected({ left: null, right: null });
      setWrongPair(null);
    } else {
      setWrongPair({ left, right });
      setTimeout(() => {
        setWrongPair(null);
        setSelected({ left: null, right: null });
      }, 700);
    }
  };

  const allDone = matched.size === pool.length;

  const getBtnStyle = (id, side) => {
    const isMatched = matched.has(id);
    const isSelected = selected[side] === id;
    const isWrong = wrongPair && wrongPair[side] === id;
    if (isMatched) return { background: '#EDF3ED', border: '2px solid #A7C5A9', color: '#2E7D32' };
    if (isWrong) return { background: '#FEF3F3', border: '2px solid #FBD5D5', color: '#C24949' };
    if (isSelected) return { background: '#E8F0E9', border: '2px solid #566B58', color: '#332C35' };
    return { background: '#FDFAF5', border: '2px solid #EFE6D6', color: '#4A3F35' };
  };

  if (allDone) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#2E7D32', marginBottom: 16 }}>Hoàn thành! Nối đúng hết {pool.length} cặp.</p>
        <button onClick={onDone} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Tiếp tục →
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {/* Left: words */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, color: '#8A7F72', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Từ tiếng Anh</p>
        {leftItems.map(w => (
          <button
            key={w.id}
            onClick={() => handleLeft(w.id)}
            disabled={matched.has(w.id)}
            style={{
              padding: '10px 12px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: matched.has(w.id) ? 'default' : 'pointer',
              fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
              ...getBtnStyle(w.id, 'left'),
            }}
          >
            {w.word}
          </button>
        ))}
      </div>
      {/* Right: meanings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, color: '#8A7F72', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Nghĩa</p>
        {rightItems.map(w => (
          <button
            key={w.id}
            onClick={() => handleRight(w.id)}
            disabled={matched.has(w.id)}
            style={{
              padding: '10px 12px', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: matched.has(w.id) ? 'default' : 'pointer',
              fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
              ...getBtnStyle(w.id, 'right'),
            }}
          >
            {w.meaning_vi}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Part 3: Input ────────────────────────────────────────────────────────────

function Part3Input({ words, onDone }) {
  const questions = words.map(w => ({
    word: w,
    prompt: w.example
      ? w.example.replace(new RegExp(`\\b${w.word}\\b`, 'gi'), '___')
      : `___ (nghĩa: ${w.meaning_vi})`,
  }));

  const [answers, setAnswers] = useState(() => Object.fromEntries(
    questions.map((_, index) => [index, { value: '', status: 'idle' }])
  ));
  const [submitted, setSubmitted] = useState(false);
  const correctCount = Object.values(answers).filter(answer => answer.status === 'correct').length;

  const checkAnswer = (index) => {
    const value = answers[index].value.trim();
    if (!value) return;
    const isCorrect = value.toLowerCase() === questions[index].word.word.toLowerCase();
    setAnswers(previous => ({ ...previous, [index]: { value: isCorrect ? value : '', status: isCorrect ? 'correct' : 'wrong' } }));
  };
  const changeAnswer = (index, value) => setAnswers(previous => ({ ...previous, [index]: { value, status: 'idle' } }));
  const submitPart = () => setSubmitted(true);

  if (submitted) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>{pct >= 70 ? '🎉' : '💪'}</div>
        <p style={{ fontSize: 22, fontWeight: 800, color: pct >= 70 ? '#2E7D32' : '#C24949' }}>{pct}%</p>
        <p style={{ fontSize: 14, color: '#8A7F72', marginBottom: 20 }}>Đúng {correctCount}/{questions.length} câu</p>
        <button onClick={onDone} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Tiếp tục →
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#8A7F72', marginBottom: 16 }}>Đúng: {correctCount}/{questions.length} câu — làm lần lượt hoặc cuộn xuống để làm tiếp.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {questions.map((question, index) => {
          const answer = answers[index];
          const correct = answer.status === 'correct';
          const wrong = answer.status === 'wrong';
          return <div key={question.word.id} style={{ padding: '14px 16px', borderRadius: 12, background: correct ? '#EDF3ED' : wrong ? '#FEF3F3' : '#FDFAF5', border: `2px solid ${correct ? '#A7C5A9' : wrong ? '#FBD5D5' : '#EFE6D6'}` }}>
            <p style={{ fontSize: 15, color: '#332C35', margin: '0 0 8px', lineHeight: 1.6, fontStyle: 'italic' }}>{index + 1}. “{question.prompt}”</p>
            <p style={{ fontSize: 12.5, color: '#8A7F72', margin: '0 0 10px' }}>Gợi ý nghĩa: <b>{question.word.meaning_vi}</b></p>
            {correct ? <b style={{ color: '#2E7D32' }}>✓ {answer.value}</b> : <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={answer.value} onChange={event => changeAnswer(index, event.target.value)} onKeyDown={event => event.key === 'Enter' && checkAnswer(index)} placeholder={wrong ? '❌ Sai rồi, thử lại...' : 'Nhập từ tiếng Anh...'} aria-label={`Điền từ câu ${index + 1}`} style={{ flex: 1, minWidth: 0, padding: '9px 12px', fontSize: 14, borderRadius: 8, border: `2px solid ${wrong ? '#FBD5D5' : '#EFE6D6'}`, background: wrong ? '#FFF5F5' : '#fff', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={() => checkAnswer(index)} disabled={!answer.value.trim()} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: answer.value.trim() ? '#566B58' : '#ccc', color: '#fff', fontWeight: 700, cursor: answer.value.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Kiểm tra</button>
            </div>}
            {wrong && <p style={{ color: '#C24949', fontSize: 12.5, margin: '7px 0 0' }}>❌ Chưa đúng. Hãy thử lại!</p>}
          </div>;
        })}
      </div>
      <button onClick={submitPart} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Hoàn thành Phần 3 →</button>
    </div>
  );
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────

function InfoCard({ icon, label, value, highlight }) {
  return (
    <div style={{
      background: '#FDFAF5', borderRadius: 10,
      border: '1px solid #EFE6D6', padding: '10px 14px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: 16, fontWeight: 800,
        color: highlight ? '#2E9767' : '#332C35',
      }}>{value}</div>
      <div style={{ fontSize: 11, color: '#8A7F72', marginTop: 2 }}>{label}</div>
    </div>
  );
}