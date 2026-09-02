// src/components/grammar/GrammarQuestionReview.jsx
import React, { useState } from 'react';

const DIFF_OPTS = [
  { value: 'nhan_biet',    label: 'Nhận biết'    },
  { value: 'van_dung',     label: 'Vận dụng'     },
  { value: 'van_dung_cao', label: 'Vận dụng cao' },
];

/**
 * Props:
 *   questions  — từ GrammarDocxUploader (options là array "A. text")
 *   onConfirm(reviewedQuestions) — trả về câu hỏi đã chọn đáp án
 *   onBack()
 */
const GrammarQuestionReview = ({ questions: initial, onConfirm, onBack }) => {
  const [questions, setQuestions] = useState(
    initial.map(q => ({ ...q, correct: q.correct ?? null }))
  );

  const setCorrect = (number, correct) =>
    setQuestions(qs => qs.map(q => q.number === number ? { ...q, correct } : q));

  const setDifficulty = (number, difficulty) =>
    setQuestions(qs => qs.map(q => q.number === number ? { ...q, difficulty } : q));

  const deleteQ = (number) =>
    setQuestions(qs => qs.filter(q => q.number !== number));

  const answered  = questions.filter(q => q.correct !== null).length;
  const isReady   = questions.length > 0 && answered === questions.length;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px' }}>Review câu hỏi ngữ pháp</h3>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--t-muted)' }}>
          Chọn đáp án đúng cho từng câu trước khi lưu.
        </p>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, background: '#2E9767',
            width: `${questions.length ? (answered / questions.length) * 100 : 0}%`,
            transition: 'width .3s',
          }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--t-muted)', margin: '4px 0 0' }}>
          {answered}/{questions.length} câu đã chọn đáp án
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto', marginBottom: 16 }}>
        {questions.map(q => (
          <div key={q.number} style={{
            background: q.correct ? '#EDF3ED' : 'var(--t-hover)',
            border: `1px solid ${q.correct ? '#A7C5A9' : 'var(--t-border)'}`,
            borderRadius: 10, padding: '12px 14px',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>Câu {q.number}</span>
              <select
                value={q.difficulty}
                onChange={e => setDifficulty(q.number, e.target.value)}
                style={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--t-border)', padding: '2px 6px' }}
              >
                {DIFF_OPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <button
                className="t-btn t-btn-sm t-btn-danger t-btn-icon"
                onClick={() => deleteQ(q.number)}
                title="Xóa câu này"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>
                </svg>
              </button>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: 13.5 }}>{q.question}</p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map((opt, i) => {
                const isSelected = q.correct === opt;
                return (
                  <button
                    key={i}
                    onClick={() => setCorrect(q.number, opt)}
                    style={{
                      textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${isSelected ? '#2E9767' : 'var(--t-border)'}`,
                      background: isSelected ? '#EDF3ED' : '#fff',
                      fontWeight: isSelected ? 700 : 400,
                      color: isSelected ? '#1B5E20' : 'inherit',
                      cursor: 'pointer', fontSize: 13,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <span>{opt}</span>
                    {isSelected && <span style={{ color: '#2E9767' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="t-modal-foot">
        <button className="t-btn" onClick={onBack}>← Quay lại</button>
        <button
          className="t-btn t-btn-primary"
          onClick={() => onConfirm(questions)}
          disabled={!isReady}
        >
          {isReady
            ? `Xác nhận ${questions.length} câu hỏi →`
            : `Còn ${questions.length - answered} câu chưa chọn đáp án`
          }
        </button>
      </div>
    </div>
  );
};

export default GrammarQuestionReview;