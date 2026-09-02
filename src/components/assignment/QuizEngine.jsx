// src/components/assignment/QuizEngine.jsx
// Engine làm bài: hỗ trợ multiple_choice, fill_in, dictation
// Timer tính từ startedAt — không dùng setInterval đơn thuần

import { useState, useEffect, useRef } from 'react';
import { PASSING_SCORE } from '@/constants/scoring';

export default function QuizEngine({
  assignment,
  questions,
  startedAt,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}) {
  // answers map: questionId → student_answer (string)
  const [answers, setAnswers] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef(null);

  // Timer — tính từ startedAt
  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [startedAt]);

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k]?.trim().length > 0
  ).length;
  const totalCount = questions.length;
  const allAnswered = answeredCount === totalCount;

  const handleSubmitClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirm(false);
    const answersArr = questions.map((q) => ({
      question_id: q.id,
      student_answer: answers[q.id] || '',
    }));
    onSubmit(answersArr);
  };

  return (
    <div>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(253,246,236,0.97)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #EFE6D6',
        padding: '10px 0 10px',
        marginBottom: 20,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#332C35', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {assignment.title}
              </p>
              <p style={{ fontSize: 12, color: '#8A7F72', margin: '2px 0 0' }}>
                Đã trả lời {answeredCount}/{totalCount} câu
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ flex: 2, minWidth: 120, maxWidth: 200 }}>
              <div style={{ height: 6, background: '#EFE6D6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #566B58, #768E78)',
                  borderRadius: 99,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            {/* Timer */}
            <TimerDisplay seconds={elapsed} />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id] || ''}
            onChange={(val) => handleAnswer(q.id, val)}
          />
        ))}
      </div>

      {/* Submit button */}
      {submitError && (
        <div style={{
          background: '#FEE2E2', color: '#C24949', borderRadius: 10,
          padding: '12px 16px', fontSize: 13.5, marginBottom: 16,
          border: '1px solid #FECACA',
        }}>
          ⚠️ {submitError}
        </div>
      )}

      <button
        onClick={handleSubmitClick}
        disabled={submitting}
        style={{
          width: '100%', padding: '14px', fontSize: 15.5, fontWeight: 700,
          background: submitting ? '#ccc' : 'linear-gradient(135deg, #566B58, #768E78)',
          color: '#fff', border: 'none', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: '0 3px 12px rgba(86,107,88,0.25)',
        }}
      >
        {submitting ? 'Đang nộp bài...' : `✅ Hoàn thành bài tập`}
      </button>

      {!allAnswered && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#B97A5A', marginTop: 8 }}>
          ⚠️ Còn {totalCount - answeredCount} câu chưa trả lời
        </p>
      )}

      <button
        onClick={onCancel}
        disabled={submitting}
        style={{
          display: 'block', margin: '12px auto 0', padding: '8px 20px',
          background: 'transparent', border: '1px solid #EFE6D6',
          borderRadius: 10, fontSize: 13, color: '#8A7F72',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        ← Quay lại
      </button>

      {/* Confirm dialog */}
      {showConfirm && (
        <ConfirmSubmitDialog
          answeredCount={answeredCount}
          totalCount={totalCount}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function TimerDisplay({ seconds }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <div style={{
      background: '#566B58', color: '#fff',
      padding: '5px 14px', borderRadius: 20,
      fontSize: 14, fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      flexShrink: 0,
      minWidth: 72, textAlign: 'center',
    }}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}

// ─── Helper: strip phần "A. B. C. D." nhúng trong câu hỏi ───────────────────
function stripOptionsFromQuestion(text) {
  // Cắt tại vị trí đầu tiên xuất hiện " A. " hoặc " A) " (có khoảng trắng trước)
  return text.replace(/\s+[A-D][.)]\s+.+$/s, '').trim();
}

// ─── Question Card ────────────────────────────────────────────────────────────
// Schema column names: question (text), options (jsonb), correct (text), question_type (text)
function QuestionCard({ question, index, answer, onChange }) {
  const type = question.question_type || 'multiple_choice';
  // Schema: column tên là "question" (không phải question_text)
  const rawQuestion = question.question || question.question_text || '';
  const questionText = stripOptionsFromQuestion(rawQuestion);

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid #EFE6D6',
      padding: '18px 20px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    }}>
      {/* Question text */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <span style={{
          background: '#F5EDE0', color: '#8A7F72',
          fontSize: 12, fontWeight: 800,
          width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {index + 1}
        </span>
        <p style={{ fontSize: 14.5, color: '#332C35', margin: 0, lineHeight: 1.6 }}>
          {questionText}
        </p>
      </div>

      {/* Audio hint for listening */}
      {question.audio_url && (
        <audio
          controls
          src={question.audio_url}
          style={{ width: '100%', marginBottom: 12, height: 36 }}
        />
      )}

      {/* Answer input */}
      {type === 'multiple_choice' ? (
        <MultipleChoice
          options={parseOptions(question.options)}
          selected={answer}
          onChange={onChange}
        />
      ) : (
        <FillIn
          value={answer}
          onChange={onChange}
          placeholder={type === 'dictation' ? 'Điền tối đa 2 từ...' : 'Nhập câu trả lời...'}
        />
      )}
    </div>
  );
}

function parseOptions(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw); } catch { return []; } })();
  // Strip leading "A. " / "A) " prefix if all options already have it — prevents "A. A. work" double prefix
  const prefixRe = /^[A-Da-d][.)] /;
  const allHavePrefix = arr.length > 0 && arr.every(o => prefixRe.test(typeof o === 'string' ? o : (o.text || '')));
  if (allHavePrefix) return arr.map(o => (typeof o === 'string' ? o : (o.text || '')).replace(prefixRe, '').trim());
  return arr;
}

function MultipleChoice({ options, selected, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((opt, i) => {
        const label = typeof opt === 'string' ? opt : opt.text || opt;
        const val = label;
        const isSelected = selected === val;
        return (
          <button
            key={i}
            onClick={() => onChange(val)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', border: `2px solid ${isSelected ? '#566B58' : '#EFE6D6'}`,
              borderRadius: 10, background: isSelected ? '#EDF3ED' : '#FDFAF5',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            aria-pressed={isSelected}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `2px solid ${isSelected ? '#566B58' : '#C6BDB0'}`,
              background: isSelected ? '#566B58' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }} />}
            </span>
            <span style={{
              fontSize: 14, color: isSelected ? '#3A5040' : '#4A3F35', fontWeight: isSelected ? 600 : 400,
            }}>
              {String.fromCharCode(65 + i)}. {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FillIn({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px', fontSize: 14,
        border: `2px solid ${value?.trim() ? '#566B58' : '#EFE6D6'}`,
        borderRadius: 10, outline: 'none', fontFamily: 'inherit',
        background: '#FDFAF5', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}
    />
  );
}

// ─── Confirm Submit ───────────────────────────────────────────────────────────
function ConfirmSubmitDialog({ answeredCount, totalCount, onConfirm, onCancel }) {
  const missing = totalCount - answeredCount;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: '28px 28px',
        maxWidth: 380, width: '100%', textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#332C35', margin: '0 0 8px' }}>
          Nộp bài?
        </h3>
        {missing > 0 ? (
          <p style={{ fontSize: 13.5, color: '#C24949', margin: '0 0 20px' }}>
            Còn <b>{missing}</b> câu chưa trả lời. Bạn có chắc muốn nộp không?
          </p>
        ) : (
          <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '0 0 20px' }}>
            Bạn đã trả lời đủ {totalCount} câu. Xác nhận nộp bài?
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', background: '#F5EDE0',
              border: 'none', borderRadius: 10, fontSize: 13.5,
              fontWeight: 600, color: '#8A7F72', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Làm tiếp
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px',
              background: 'linear-gradient(135deg, #566B58, #768E78)',
              border: 'none', borderRadius: 10, fontSize: 13.5,
              fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  );
}