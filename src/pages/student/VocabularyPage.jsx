// src/pages/student/VocabularyPage.jsx
// Chỉ sửa handleOpenTopic — thêm loading + error state
// Dòng 1 của file (sửa import)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { studentVocabularyService, enrichWordsWithIPA } from '../../services/studentVocabularyService';
import { assignmentService } from '@/services/assignment/assignmentService';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import BackButton from '@/components/common/BackButton';
import { getAttemptCount, incrementAttemptCount, isAttemptLimitReached, MAX_ATTEMPTS } from '@/utils/attemptCounter';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WORDS_PER_LESSON = 20; // Cố định 20 từ/bài để đồng bộ với bài tập


function chunkWords(words, size = WORDS_PER_LESSON) {
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size));
  }
  return chunks;
}

function LessonList({ topicLessons, onSelectLesson, onBack, studentId }) {
  const { topic, lessons } = topicLessons;
  return (
    <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#566B58', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 16, fontFamily: 'inherit' }}>
        ← Danh sách chủ đề
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#332C35', marginBottom: 6 }}>{topic.title}</h2>
      <p style={{ fontSize: 13, color: '#8A7F72', marginBottom: 20 }}>
        {lessons.length} bài · {lessons.reduce((s, l) => s + l.length, 0)} từ · mỗi bài được làm tối đa {MAX_ATTEMPTS} lần
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lessons.map((lessonWords, idx) => {
          const count = getAttemptCount('vocab', studentId, topic.id, idx);
          const reached = count >= MAX_ATTEMPTS;
          return (
            <div key={idx} style={{ border: '1px solid #EFE6D6', borderRadius: 12, padding: '14px 18px', background: '#FDFAF5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#332C35' }}>Bài {idx + 1}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#8A7F72' }}>{lessonWords.length} từ · 5 dạng bài</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: reached ? '#C24949' : '#8A7F72', fontWeight: reached ? 700 : 500 }}>
                  {reached ? '⛔ Hết lượt làm bài (3/3)' : `Đã làm ${count}/${MAX_ATTEMPTS} lần`}
                </p>
              </div>
              {reached ? (
                <button
                  onClick={() => onSelectLesson({ topic, words: lessonWords, lessonIndex: idx, totalLessons: lessons.length, previewOnly: true })}
                  style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #EFE6D6', background: '#fff', color: '#8A7F72', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  👁 Xem danh sách từ
                </button>
              ) : (
                <button
                  onClick={() => onSelectLesson({ topic, words: lessonWords, lessonIndex: idx, totalLessons: lessons.length })}
                  style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Học →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VocabularyPage() {
  const { profile } = useAuth();
  const studentId = profile?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [learningTopic, setLearningTopic] = useState(null);
  const [learningPart, setLearningPart]   = useState(null);
  const [topicLoading, setTopicLoading]   = useState(false);
  const [topicError, setTopicError]       = useState(null);
  const [topicLessons, setTopicLessons]   = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  // Upload ID của bài tập được giáo viên gán cho chủ đề
  const [topicAssignmentMap, setTopicAssignmentMap] = useState({}); // { [topicId]: uploadId }

  const fetchFn = useCallback(
    () => studentVocabularyService.getVocabularySets(studentId),
    [studentId]
  );

  const { data: sets = [], loading, error, refetch } = useAsyncData(
    fetchFn, [studentId], { skip: !studentId, initial: [] }
  );

  // Load assignment map: { topicId → uploadId } từ vocab_topic_assignments
  useEffect(() => {
    if (!studentId) return;
    studentVocabularyService.getTopicAssignments().then(map => {
      setTopicAssignmentMap(map);
    }).catch(() => {});
  }, [studentId]);

  const filtered = searchQuery.trim()
    ? sets.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sets;

  const handleOpenTopic = async (topic) => {
    setTopicLoading(true);
    setTopicError(null);
    try {
      let words = await studentVocabularyService.getVocabularies(topic.id);
      if (!words || words.length === 0) {
        setTopicError('Bộ từ vựng này chưa có từ nào.');
        return;
      }
      words = await enrichWordsWithIPA(words);
      const lessons = chunkWords(words);
      setTopicLessons({ topic, lessons });
    } catch (e) {
      setTopicError(e.message || 'Không thể tải từ vựng.');
    } finally {
      setTopicLoading(false);
    }
  };

  if (!studentId) return <EmptyState icon="🔒" title="Vui lòng đăng nhập" />;

  // Đang xem bài nhỏ → vào LearnPart
  if (selectedLesson) {
    return (
      <LearnPart
        topic={selectedLesson.topic}
        words={selectedLesson.words}
        lessonIndex={selectedLesson.lessonIndex}
        totalLessons={selectedLesson.totalLessons}
        part={learningPart}
        studentId={studentId}
        previewOnly={selectedLesson.previewOnly}
        onNextPart={(p) => setLearningPart(p)}
        onBack={() => { setSelectedLesson(null); setLearningPart(null); }}
        onFinishLesson={() => { setSelectedLesson(null); setLearningPart(null); }}
      />
    );
  }

  // Đang xem danh sách bài nhỏ của chủ đề
  if (topicLessons) {
    return (
      <LessonList
        topicLessons={topicLessons}
        studentId={studentId}
        onSelectLesson={(lesson) => { setSelectedLesson(lesson); setLearningPart(0); }}
        onBack={() => setTopicLessons(null)}
      />
    );
  }

  // Danh sách chủ đề

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1180, margin: '0 auto' }}>
      <BackButton to="/student/home" />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#332C35', margin: 0 }}>Học Từ vựng 📚</h1>
        <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '4px 0 0' }}>
          Tổng hợp tất cả chủ đề từ vựng — chọn chủ đề bạn muốn ôn tập
        </p>
      </div>

      {topicError && (
        <div style={{
          background: '#FEE2E2', color: '#C24949', borderRadius: 10,
          padding: '12px 16px', fontSize: 13.5, marginBottom: 16,
          border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {topicError}</span>
          <button onClick={() => setTopicError(null)} style={{ background: 'none', border: 'none', color: '#C24949', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Tìm kiếm bộ từ vựng..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Tìm bộ từ vựng"
            style={{ width: '100%', maxWidth: 320, padding: '8px 14px', fontSize: 13.5, borderRadius: 10, border: '1px solid #EFE6D6', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {loading ? (
          <Loading text="Đang tải bộ từ vựng..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📭" title="Chưa có bộ từ vựng" message="Giáo viên sẽ thêm bộ từ vựng tại đây." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {filtered.map(item => (
              <div key={item.id} style={{ border: '1px solid #EFE6D6', borderRadius: 12, padding: 16, background: '#FDFAF5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#332C35', margin: 0, wordBreak: 'break-word' }}>{item.title}</h3>
                    {item.passed && (
                      <span style={{ fontSize: 11, background: '#EDF3ED', color: '#2E7D32', padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>✓ Đạt</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: '#8A7F72', margin: '0 0 14px' }}>
                    {item.wordCount > 0 ? `${item.wordCount} từ vựng` : 'Chưa có từ nào'}
                  </p>
                </div>
                {topicAssignmentMap[item.id] && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, background: '#FFF3CD', color: '#856404', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                      📋 Có bài tập được giao
                    </span>
                  </div>
                )}
                <button
                  onClick={() => handleOpenTopic(item)}
                  disabled={topicLoading || item.wordCount === 0}
                  style={{
                    width: '100%', padding: 9, borderRadius: 8, border: 'none',
                    background: item.wordCount === 0
                      ? '#ccc'
                      : 'linear-gradient(135deg, #566B58, #768E78)',
                    color: '#fff', fontSize: 12.5, fontWeight: 700,
                    cursor: (topicLoading || item.wordCount === 0) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: item.wordCount === 0 ? 0.6 : 1,
                  }}
                >
                  {topicLoading ? '⏳ Đang tải...' : item.wordCount === 0 ? '📭 Chưa có từ' : item.passed ? '🔄 Ôn lại' : '▶ Bắt đầu học'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 4 Parts Learning Engine — giữ nguyên toàn bộ từ file gốc ───────────────
const PART_INFO = {
  0: { label: 'Preview', title: 'Danh sách từ',      desc: 'Xem toàn bộ từ vựng trước khi học', icon: '📋' },
  1: { label: 'Phần 1', title: 'Flashcard',         desc: 'Xem và ghi nhớ từng từ',            icon: '📖' },
  2: { label: 'Phần 2', title: 'Ghép cặp',           desc: 'Nối từ tiếng Anh với nghĩa đúng',   icon: '🔗' },
  3: { label: 'Phần 3', title: 'Điền từ',            desc: 'Điền từ vào chỗ trống',             icon: '✍️' },
  4: { label: 'Phần 4', title: 'Kiểm tra tổng hợp', desc: 'Bài kiểm tra có tính giờ',          icon: '⏱️' },
};

function LearnPart({ topic, words, lessonIndex, totalLessons, part, studentId, previewOnly, onNextPart, onBack, onFinishLesson }) {
  const isLastLesson = totalLessons !== undefined && lessonIndex === totalLessons - 1;

  if (!words || words.length === 0) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#566B58', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 16, fontFamily: 'inherit' }}>
          ← Quay lại
        </button>
        <EmptyState icon="📭" title="Bộ từ này chưa có từ vựng" />
      </div>
    );
  }

  // Chế độ xem trước: chỉ hiện danh sách từ, ẩn các phần luyện/kiểm tra
  if (previewOnly) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#566B58', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 16, fontFamily: 'inherit' }}>
          ← {topic.title}
        </button>
        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#332C35', margin: '0 0 4px' }}>Danh sách từ</h2>
            <p style={{ fontSize: 13, color: '#8A7F72', margin: 0 }}>
              Bạn đã hết lượt làm bài. Chỉ xem được danh sách từ.
            </p>
          </div>
          <PreviewPart words={words} onNext={onBack} />
        </div>
      </div>
    );
  }

  const partInfo = PART_INFO[part];
  return (
    <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#566B58', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 16, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        ← {topic.title}
      </button>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[0, 1, 2, 3, 4].map(p => (
          <button key={p} onClick={() => onNextPart(p)} style={{
            padding: '7px 14px', borderRadius: 20,
            border: `2px solid ${part === p ? '#566B58' : '#EFE6D6'}`,
            background: part === p ? '#566B58' : '#fff',
            color: part === p ? '#fff' : '#8A7F72',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>
            {PART_INFO[p].label}
          </button>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{partInfo.icon}</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#332C35', margin: '0 0 4px' }}>{partInfo.title}</h2>
          <p style={{ fontSize: 13, color: '#8A7F72', margin: 0 }}>{partInfo.desc}</p>
        </div>
        {part === 0 && <PreviewPart words={words} onNext={() => onNextPart(1)} />}
        {part === 1 && <FlashcardPart words={words} onNext={() => onNextPart(2)} />}
        {part === 2 && <MatchingPart words={words} onNext={() => onNextPart(3)} />}
        {part === 3 && <FillBlankPart words={words} onNext={() => onNextPart(4)} />}
        {part === 4 && <TimedTestPart words={words} topicId={topic.id} studentId={studentId} lessonIndex={lessonIndex} onDone={onBack} onFinishLesson={onFinishLesson} isLastLesson={isLastLesson} />}
      </div>
    </div>
  );
}

function PreviewPart({ words, onNext }) {
  return (
    <div>
      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: 'inherit' }}>
          <thead>
            <tr style={{ background: '#F5EDE0' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #EFE6D6', fontWeight: 700, color: '#332C35' }}>Từ</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #EFE6D6', fontWeight: 700, color: '#332C35' }}>Phiên âm</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #EFE6D6', fontWeight: 700, color: '#332C35' }}>Từ loại</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #EFE6D6', fontWeight: 700, color: '#332C35' }}>Nghĩa</th>
            </tr>
          </thead>
          <tbody>
            {words.map((w, i) => (
              <tr key={w.id || i} style={{ background: i % 2 === 0 ? '#FDFAF5' : '#fff' }}>
                <td style={{ padding: '9px 12px', border: '1px solid #EFE6D6', fontWeight: 700, color: '#332C35' }}>{w.word}</td>
                <td style={{ padding: '9px 12px', border: '1px solid #EFE6D6', color: '#8A7F72', fontStyle: 'italic' }}>{w.ipa || '—'}</td>
                <td style={{ padding: '9px 12px', border: '1px solid #EFE6D6', color: '#8A7F72' }}>{w.part_of_speech || '—'}</td>
                <td style={{ padding: '9px 12px', border: '1px solid #EFE6D6', color: '#4A3F35' }}>{w.meaning_vi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={onNext}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(86,107,88,0.2)' }}
      >
        Bắt đầu học →
      </button>
    </div>
  );
}

function FlashcardPart({ words, onNext }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const word = words[idx];

  // Web Speech API — phát âm từ tiếng Anh
  const speak = (text, e) => {
    e?.stopPropagation();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#8A7F72' }}>{idx + 1} / {words.length}</span>
      </div>
      <div
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setFlipped(f => !f)}
        aria-label={flipped ? 'Nhấn để xem từ' : 'Nhấn để xem nghĩa'}
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
            <p style={{ fontSize: 12, color: '#B0A8A0', marginTop: 16 }}>Nhấn để xem nghĩa</p>
          </>
        ) : (
          <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#332C35', margin: '0 0 4px', textAlign: 'center' }}>{word.word}</p>
            {word.ipa && <p style={{ fontSize: 13, color: '#8A7F72', fontStyle: 'italic', margin: '0 0 8px' }}>{word.ipa}</p>}
            <p style={{ fontSize: 20, fontWeight: 700, color: '#2E7D32', margin: '0 0 10px', textAlign: 'center' }}>
              {word.meaning_vi}
            </p>
            {word.example && (
              <p style={{ fontSize: 13, color: '#566B58', fontStyle: 'italic', textAlign: 'center', margin: '0 0 8px' }}>
                "{word.example}"
              </p>
            )}
            {word.audio_url && (
              <audio controls src={word.audio_url} style={{ marginTop: 8, height: 32 }} />
            )}
            <button
              onClick={(e) => speak(word.word, e)}
              title={`Phát âm: ${word.word}`}
              style={{
                position: 'absolute', bottom: -8, right: -8,
                width: 36, height: 36, borderRadius: '50%',
                background: '#566B58', color: '#fff', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              🔊
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          disabled={idx === 0}
          onClick={() => { setIdx(i => i - 1); setFlipped(false); }}
          style={{ flex: 1, padding: 10, border: '1px solid #EFE6D6', borderRadius: 10, background: '#fff', color: '#8A7F72', fontSize: 13.5, fontWeight: 600, cursor: idx === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: idx === 0 ? 0.5 : 1 }}
        >← Trước</button>
        {idx < words.length - 1 ? (
          <button onClick={() => { setIdx(i => i + 1); setFlipped(false); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Tiếp →</button>
        ) : (
          <button onClick={onNext} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sang Phần 2 →</button>
        )}
      </div>
    </div>
  );
}

function MatchingRound({ words, onDone }) {
  const [leftOrder] = useState(() => shuffle(words));
  const [rightOrder] = useState(() => shuffle(words));
  const [selectedLeft, setSelectedLeft] = useState(null); // word.id
  const [selectedRight, setSelectedRight] = useState(null); // meaning_vi
  const [matchedLeft, setMatchedLeft] = useState(() => new Set());
  const [matchedRight, setMatchedRight] = useState(() => new Set());
  const [wrongIds, setWrongIds] = useState(() => new Set());
  const [score, setScore] = useState({ done: false, correct: 0 });

  const isMatched = (wid) => matchedLeft.has(wid);

  const handleClick = (side, id, meaning) => {
    // Nếu đã ghép đúng thì bỏ qua
    if (side === 'left' && matchedLeft.has(id)) return;
    if (side === 'right' && matchedRight.has(meaning)) return;

    if (side === 'left') {
      setSelectedLeft(sel => (sel === id ? null : id));
      setWrongIds(new Set());
      return;
    }

    // side === 'right'
    if (selectedLeft == null) {
      setSelectedRight(sel => (sel === meaning ? null : meaning));
      return;
    }

    const leftWord = words.find(w => w.id === selectedLeft);
    const isCorrect = leftWord && leftWord.meaning_vi === meaning;

    if (isCorrect) {
      const nextLeft = new Set(matchedLeft).add(selectedLeft);
      const nextRight = new Set(matchedRight).add(meaning);
      const nextScore = { done: false, correct: score.correct + 1 };
      setMatchedLeft(nextLeft);
      setMatchedRight(nextRight);
      setSelectedLeft(null);
      setSelectedRight(null);
      if (nextLeft.size === words.length) {
        nextScore.done = true;
        setScore(nextScore);
      } else {
        setScore(nextScore);
      }
    } else {
      // Sai → flash đỏ rồi reset lựa chọn
      setWrongIds(new Set([selectedLeft]));
      setSelectedRight(null);
      setTimeout(() => {
        setSelectedLeft(null);
        setWrongIds(new Set());
      }, 500);
    }
  };

  if (score.done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#2E7D32' }}>Hoàn thành!</p>
        <p style={{ fontSize: 14, color: '#8A7F72' }}>Bạn đã ghép đúng toàn bộ cặp.</p>
        <button onClick={onDone} style={{ marginTop: 16, padding: '11px 28px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sang Phần 3 →
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: '#8A7F72', textAlign: 'center', marginBottom: 16 }}>
        Nhấn một từ bên trái, rồi nhấn nghĩa tương ứng bên phải. Đã ghép: {matchedLeft.size}/{words.length}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leftOrder.map(w => {
            const active = selectedLeft === w.id;
            const hit = matchedLeft.has(w.id);
            const isWrong = wrongIds.has(w.id);
            return (
              <button
                key={w.id}
                onClick={() => handleClick('left', w.id)}
                disabled={hit}
                style={{
                  padding: '10px 12px', borderRadius: 9,
                  border: `2px solid ${hit ? '#A7C5A9' : isWrong ? '#FBD5D5' : active ? '#566B58' : '#EFE6D6'}`,
                  background: hit ? '#EDF3ED' : isWrong ? '#FEF3F3' : active ? '#F5EFE4' : '#fff',
                  color: hit ? '#2E7D32' : '#332C35',
                  fontSize: 14, fontWeight: 700, cursor: hit ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                {hit ? '✓ ' : ''}{w.word}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rightOrder.map(w => {
            const hit = matchedRight.has(w.meaning_vi);
            const active = selectedRight === w.meaning_vi;
            return (
              <button
                key={w.id}
                onClick={() => handleClick('right', w.id, w.meaning_vi)}
                disabled={hit}
                style={{
                  padding: '10px 12px', borderRadius: 9,
                  border: `2px solid ${hit ? '#A7C5A9' : active ? '#566B58' : '#EFE6D6'}`,
                  background: hit ? '#EDF3ED' : active ? '#F5EFE4' : '#fff',
                  color: hit ? '#2E7D32' : '#4A3F35',
                  fontSize: 13.5, fontWeight: 500, cursor: hit ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                {hit ? '✓ ' : ''}{w.meaning_vi}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchingPart({ words, onNext }) {
  const BATCH = 20;
  const [started, setStarted] = useState(false);
  const [batchIdx, setBatchIdx] = useState(0);

  if (!started) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Phần 2: Ghép cặp</p>
        <p style={{ fontSize: 13, color: '#8A7F72', marginBottom: 20 }}>
          Nối từ tiếng Anh với nghĩa tiếng Việt tương ứng. Mỗi lần {BATCH} từ.
        </p>
        <button
          onClick={() => setStarted(true)}
          style={{
            padding: '11px 32px', borderRadius: 10, border: 'none',
            background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Bắt đầu →
        </button>
      </div>
    );
  }

  const batches = [];
  for (let i = 0; i < words.length; i += BATCH) {
    batches.push(words.slice(i, i + BATCH));
  }

  if (batchIdx < batches.length) {
    return (
      <MatchingRound
        key={batchIdx}
        words={batches[batchIdx]}
        onDone={() => setBatchIdx(b => b + 1)}
      />
    );
  }

  // Hoàn thành toàn bộ
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
      <p style={{ fontSize: 22, fontWeight: 800, color: '#2E7D32' }}>Hoàn thành!</p>
      <p style={{ fontSize: 14, color: '#8A7F72' }}>Bạn đã ghép xong toàn bộ từ vựng.</p>
      <button onClick={onNext} style={{ marginTop: 16, padding: '11px 28px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Sang Phần 3 →
      </button>
    </div>
  );
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Chuyển câu hỏi từ question_bank_items ({question, options, correct, ...})
// sang định dạng TimedTestPart quen thuộc ({ word: {id, word, meaning_vi}, options })
function parseOpts(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw); } catch { return []; } })();
  // Bóc prefix "A. " / "A) " nếu option đã nhúng sẵn để tránh lặp ký hiệu
  return arr.map(o => {
    let label = typeof o === 'string' ? o : (o.text || '');
    label = label.replace(/^[A-Da-d][.)]\s*/, '').trim();
    return label;
  }).filter(Boolean);
}

// Bóc prefix "A. " / "A) " khỏi nhãn đáp án khi render (tránh hiển thị "A. A. xxx")
function stripOptionPrefix(label) {
  if (typeof label !== 'string') return label;
  return label.replace(/^[A-Da-d][.)]\s*/, '').trim();
}

function convertBankToTimed(q) {
  if (!q) return null;
  const options = parseOpts(q.options);
  // Bóc prefix "A. "/"B) " ở đáp án đúng cho khớp với giá trị trong options (đã bóc prefix)
  const correct = (q.correct || '').toString().trim()
    .replace(/^[A-Da-d][.)]\s*/, '')
    .trim();
  if (options.length === 0 || !correct) return null;
  // Giải nén từ từ câu hỏi dạng: "word" có nghĩa là gì? / "word" nghĩa là gì?
  let word = (q.question || '').replace(/^\s*["""]?(.*?)["""]?\s+có nghĩa là gì\?\s*$/i, '$1')
    .replace(/^\s*["""]?(.*?)["""]?\s+nghĩa là gì\?\s*$/i, '$1')
    .trim();
  if (!word) {
    // Fallback: tách từ đầu tiên trước dấu cách / nháy
    const m = (q.question || '').match(/["""]([^"""]+)["""]/);
    word = (m ? m[1] : (q.question || '').split(' ')[0]).trim();
  }
  if (!word) return null;
  return {
    word: {
      id: q.id || `${word}-${correct}`,
      word,
      meaning_vi: correct,
    },
    options: shuffle(options),
  };
}

function FillBlankInner({ words, count, onNext }) {
  // Giữ nguyên thứ tự words (không shuffle), đồng bộ với Preview và các phần trước
  const questions = useMemo(() => {
    const withEx = words.filter(w => w.example && w.example.trim());
    return withEx.length > 0
      ? withEx.map(w => ({ word: w, blank: w.example.replace(new RegExp(`\\b${escapeRegex(w.word)}\\b`, 'gi'), '___') }))
      : words.map(w => ({ word: w, blank: `___ (${w.meaning_vi})` }));
  }, [words]);

  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(questions.map((_, index) => [index, { value: '', status: 'idle' }]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const correctCount = Object.values(answers).filter(answer => answer.status === 'correct').length;
  const allDone = Object.values(answers).every(answer => answer.status === 'correct');

  if (!questions || questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#332C35', marginBottom: 8 }}>Chưa có câu hỏi để làm.</p>
        <p style={{ fontSize: 13, color: '#8A7F72', marginBottom: 20 }}>Phần này cần có câu ví dụ hoặc từ vựng. Bạn có thể chuyển sang phần kiểm tra tổng hợp.</p>
        <button onClick={onNext} style={{ padding: '11px 32px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sang Phần 4 →
        </button>
      </div>
    );
  }

  const handleChange = (index, value) => {
    setAnswers(previous => ({ ...previous, [index]: { value, status: 'idle' } }));
  };

  const checkOne = (index) => {
    const value = answers[index].value.trim();
    if (!value) return;
    const isCorrect = value.toLowerCase() === questions[index].word.word.toLowerCase();
    setAnswers(previous => ({
      ...previous,
      [index]: { value: isCorrect ? value : '', status: isCorrect ? 'correct' : 'wrong' },
    }));
  };

  const handleSubmitAll = () => {
    const nextAnswers = { ...answers };
    questions.forEach((question, index) => {
      if (nextAnswers[index].status === 'correct') return;
      const value = nextAnswers[index].value.trim();
      const isCorrect = value.toLowerCase() === question.word.word.toLowerCase();
      nextAnswers[index] = { value: isCorrect ? value : '', status: isCorrect ? 'correct' : (value ? 'wrong' : 'idle') };
    });
    setAnswers(nextAnswers);
    const correct = Object.values(nextAnswers).filter(answer => answer.status === 'correct').length;
    setScore({ correct, total: questions.length, pct: Math.round((correct / questions.length) * 100) });
    setSubmitted(true);
  };

  if (submitted && score) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>{score.pct >= 80 ? '🎉' : '💪'}</div>
        <p style={{ fontSize: 22, fontWeight: 800, color: score.pct >= 80 ? '#2E7D32' : '#C24949' }}>{score.pct}%</p>
        <p style={{ fontSize: 14, color: '#8A7F72' }}>Đúng {score.correct}/{score.total} câu</p>
        <button onClick={onNext} style={{ marginTop: 16, padding: '11px 28px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sang Phần 4 →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#8A7F72' }}>Đúng: {correctCount}/{questions.length}</span>
        <span style={{ fontSize: 13, color: '#8A7F72' }}>{questions.length} câu</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {questions.map((question, index) => {
          const answer = answers[index];
          const isCorrect = answer.status === 'correct';
          const isWrong = answer.status === 'wrong';
          return (
            <div key={question.word.id || index} style={{ background: isCorrect ? '#EDF3ED' : isWrong ? '#FEF3F3' : '#FDFAF5', border: `2px solid ${isCorrect ? '#A7C5A9' : isWrong ? '#FBD5D5' : '#EFE6D6'}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 15, color: '#332C35', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.6 }}>{index + 1}. "{question.blank}"</p>
              <p style={{ fontSize: 12, color: '#8A7F72', marginBottom: 10 }}>Gợi ý: <b>{question.word.meaning_vi}</b></p>
              {isCorrect ? (
                <span style={{ fontSize: 15, fontWeight: 700, color: '#2E7D32' }}>✓ {answer.value}</span>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={answer.value} onChange={e => handleChange(index, e.target.value)} onKeyDown={e => e.key === 'Enter' && checkOne(index)} placeholder={isWrong ? '❌ Sai rồi, thử lại...' : 'Nhập từ vào đây...'} style={{ flex: 1, padding: '9px 12px', fontSize: 14, borderRadius: 8, border: `2px solid ${isWrong ? '#FBD5D5' : '#EFE6D6'}`, background: isWrong ? '#FFF5F5' : '#fff', outline: 'none', fontFamily: 'inherit', color: isWrong ? '#C24949' : '#332C35', boxSizing: 'border-box' }} />
                  <button onClick={() => checkOne(index)} disabled={!answer.value.trim()} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: answer.value.trim() ? '#566B58' : '#ccc', color: '#fff', fontSize: 13, fontWeight: 700, cursor: answer.value.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Kiểm tra</button>
                </div>
              )}
              {isWrong && <p style={{ fontSize: 12.5, color: '#C24949', marginTop: 6, marginBottom: 0 }}>❌ Chưa đúng. Hãy thử lại!</p>}
            </div>
          );
        })}
      </div>
      <button onClick={handleSubmitAll} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(86,107,88,0.2)' }}>
        {allDone ? '✅ Hoàn thành! Sang Phần 4 →' : `Nộp bài (${correctCount}/${questions.length} đúng)`}
      </button>
    </div>
  );
}

function FillBlankPart({ words, onNext }) {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Phần 3: Điền từ</p>
        <p style={{ fontSize: 13, color: '#8A7F72', marginBottom: 20 }}>Điền từ tiếng Anh vào chỗ trống</p>
        <button
          onClick={() => setStarted(true)}
          style={{
            padding: '11px 32px', borderRadius: 10, border: 'none',
            background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Bắt đầu →
        </button>
      </div>
    );
  }

  return <FillBlankInner words={words} count={words.length} onNext={onNext} />;
}

function TimedTestPart({ words, onDone, onFinishLesson, isLastLesson, topicId, studentId, lessonIndex }) {
  const { profile } = useAuth();
  const studentIdAuth = profile?.id;
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [uploadedQuestions, setUploadedQuestions] = useState(null);
  const [loadingExercise, setLoadingExercise] = useState(false);
  const [exerciseError, setExerciseError] = useState(null);

  // BUG1: Câu hỏi tự sinh chỉ tính một lần khi mount → không đổi đáp án khi re-render
  const generatedQuestions = useMemo(() => {
    return words.map(w => {
      const wrong = shuffle(words.filter(x => x.id !== w.id)).slice(0, 3);
      return { word: w, options: shuffle([w.meaning_vi, ...wrong.map(x => x.meaning_vi)]) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questions = uploadedQuestions || generatedQuestions;

  // BUG1/BUG3: Lấy câu hỏi từ bài tập giáo viên giao (ưu tiên), ngược lại dùng câu hỏi tự sinh
  // getVocabExercises trả về [ { id, title, questions: [bankItems...] } ] → cần bóc lớp `questions`
  // và chuyển định dạng từ question bank ({question, options, correct}) sang định dạng
  // TimedTestPart quen thuộc ({ word: {id, word, meaning_vi}, options: [meaning...] })
  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    setLoadingExercise(true);
    setExerciseError(null);
    studentVocabularyService.getVocabExercises(topicId)
      .then(qs => {
        if (cancelled) return;
        const exerciseItems = (qs && qs.length > 0 && Array.isArray(qs[0].questions))
          ? qs[0].questions
          : [];
        if (exerciseItems.length > 0) {
          const converted = exerciseItems
            .slice(0, 20)
            .map((q) => convertBankToTimed(q))
            .filter(Boolean);
          if (converted.length > 0) {
            setUploadedQuestions(shuffle(converted));
            return;
          }
        }
        // Không có bài tập khả dụng → dùng câu hỏi tự sinh (đã có sẵn ở generatedQuestions)
        setExerciseError('Không tải được bài tập từ giáo viên. Dùng câu hỏi tự sinh.');
      })
      .catch(() => {
        if (!cancelled) setExerciseError('Không tải được bài tập từ giáo viên. Dùng câu hỏi tự sinh.');
      })
      .finally(() => {
        if (!cancelled) setLoadingExercise(false);
      });
    return () => { cancelled = true; };
  }, [topicId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!started || submitted) return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [started, submitted]);

  // MỤC 3D: Streak chỉ tính sau khi hoàn thành bài nhỏ cuối cùng
  useEffect(() => {
    if (submitted && score && isLastLesson && studentIdAuth) {
      assignmentService._updateStreak(studentIdAuth).catch(() => {});
    }
  }, [submitted, score, isLastLesson, studentIdAuth]);

  const startTimer = () => {
    setStarted(true);
    setElapsed(0);
    // YC6: Tăng số lần làm bài khi bắt đầu
    if (studentId) incrementAttemptCount('vocab', studentId, topicId, lessonIndex);
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.word.id] === q.word.meaning_vi) correctCount++;
    });
    setScore({
      correct: correctCount,
      total: questions.length,
      pct: Math.round((correctCount / questions.length) * 100),
      elapsed,
    });
    setSubmitted(true);
  };

  if (loadingExercise) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ fontSize: 14, color: '#8A7F72' }}>⏳ Đang tải bài tập...</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#8A7F72', marginBottom: 12 }}>
          {uploadedQuestions && uploadedQuestions.length > 0
            ? `${uploadedQuestions.length} câu hỏi do giáo viên giao. Có tính giờ. Chỉ chấm sau khi nhấn Nộp bài.`
            : `${words.length} câu hỏi trắc nghiệm tổng hợp. Có tính giờ. Chỉ chấm sau khi nhấn Nộp bài.`}
        </p>
        {exerciseError && (
          <p style={{ fontSize: 12, color: '#C24949', marginBottom: 12 }}>{exerciseError}</p>
        )}
        <button
          onClick={startTimer}
          style={{ padding: '12px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ▶ Bắt đầu
        </button>
      </div>
    );
  }

  if (submitted && score) {
    const m = Math.floor(score.elapsed / 60), s = score.elapsed % 60;
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>{score.pct >= 80 ? '🎉' : '💪'}</div>
        <p style={{ fontSize: 26, fontWeight: 900, color: score.pct >= 80 ? '#2E7D32' : '#C24949' }}>{score.pct}%</p>
        <p style={{ fontSize: 14, color: '#8A7F72' }}>Đúng {score.correct}/{score.total} câu · Thời gian: {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</p>
        <p style={{ fontSize: 13.5, color: score.pct >= 80 ? '#2E7D32' : '#C24949', fontWeight: 600, margin: '8px 0 20px' }}>
          {score.pct >= 80 ? '✅ Đạt! (≥ 80%)' : '❌ Chưa đạt. Cần ≥ 80% để đạt.'}
        </p>
        <button onClick={onDone} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Về danh sách
        </button>
      </div>
    );
  }

  const m = Math.floor(elapsed / 60), s = elapsed % 60;
  const answered = Object.keys(answers).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#8A7F72' }}>Đã trả lời {answered}/{questions.length}</span>
        <span style={{ background: '#566B58', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {questions.map((q, i) => (
          <div key={q.word.id} style={{ background: '#FDFAF5', borderRadius: 12, border: '1px solid #EFE6D6', padding: '14px 16px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#332C35', margin: '0 0 10px' }}>{i + 1}. "{q.word.word}"</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {q.options.map((opt, j) => {
                const sel = answers[q.word.id] === opt;
                return (
                  <button key={j} onClick={() => setAnswers(a => ({ ...a, [q.word.id]: opt }))}
                    aria-pressed={sel}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `2px solid ${sel ? '#566B58' : '#EFE6D6'}`, borderRadius: 9, background: sel ? '#EDF3ED' : '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? '#566B58' : '#C6BDB0'}`, background: sel ? '#566B58' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {sel && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                    </span>
                    <span style={{ fontSize: 13.5, color: sel ? '#3A5040' : '#4A3F35', fontWeight: sel ? 600 : 400 }}>{String.fromCharCode(65 + j)}. {stripOptionPrefix(opt)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #566B58, #768E78)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(86,107,88,0.25)' }}
      >
        ✅ Nộp bài
      </button>
    </div>
  );
}
