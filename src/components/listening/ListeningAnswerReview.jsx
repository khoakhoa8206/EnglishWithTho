// src/components/listening/ListeningAnswerReview.jsx
import React, { useState } from 'react';

/**
 * Props:
 *   exercises  — từ ListeningDocxUploader
 *   onConfirm(exercises) — exercises với correct_answer đã điền
 *   onBack()
 */
const ListeningAnswerReview = ({ exercises: initial, onConfirm, onBack }) => {
  const [exercises, setExercises] = useState(initial);

  const updateAnswer = (exNumber, qNumber, value) => {
    setExercises(exs => exs.map(ex =>
      ex.number === exNumber
        ? { ...ex, questions: ex.questions.map(q => q.number === qNumber ? { ...q, correct_answer: value } : q) }
        : ex
    ));
  };

  const totalQ    = exercises.reduce((s, ex) => s + ex.questions.length, 0);
  const answered  = exercises.reduce((s, ex) => s + ex.questions.filter(q => q.correct_answer?.trim()).length, 0);
  const allDone   = answered === totalQ && totalQ > 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px' }}>Điền đáp án cho bài nghe</h3>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--t-muted)' }}>
          Nhập đáp án đúng cho từng chỗ trống trong script.
        </p>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, background: '#2E9767',
            width: `${totalQ ? (answered / totalQ) * 100 : 0}%`,
            transition: 'width .3s',
          }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--t-muted)', margin: '4px 0 0' }}>
          {answered}/{totalQ} câu đã điền đáp án
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 480, overflowY: 'auto', marginBottom: 16 }}>
        {exercises.map(ex => (
          <div key={ex.number}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: 14 }}>Exercise {ex.number}</strong>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 10,
                background: '#E8F0FF', color: '#3355AA', fontWeight: 600,
              }}>
                {ex.type}
              </span>
            </div>
            {ex.instruction && (
              <p style={{ fontSize: 12, color: 'var(--t-muted)', margin: '0 0 10px', fontStyle: 'italic' }}>
                {ex.instruction}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ex.questions.map(q => (
                <div key={q.number} style={{
                  background: q.correct_answer?.trim() ? '#EDF3ED' : 'var(--t-hover)',
                  border: `1px solid ${q.correct_answer?.trim() ? '#A7C5A9' : 'var(--t-border)'}`,
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#555', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700, color: '#333' }}>({q.number})</span>{' '}
                    {q.context.slice(0, 120)}{q.context.length > 120 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Đáp án:
                    </label>
                    <input
                      type="text"
                      value={q.correct_answer || ''}
                      onChange={e => updateAnswer(ex.number, q.number, e.target.value)}
                      placeholder="Nhập đáp án..."
                      style={{
                        flex: 1, fontSize: 13, padding: '5px 10px',
                        borderRadius: 6, border: '1px solid var(--t-border)',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="t-modal-foot">
        <button className="t-btn" onClick={onBack}>← Quay lại</button>
        <button
          className="t-btn t-btn-primary"
          onClick={() => onConfirm(exercises)}
          disabled={!allDone}
        >
          {allDone ? `Xác nhận ${totalQ} câu →` : `Còn ${totalQ - answered} câu chưa điền`}
        </button>
      </div>
    </div>
  );
};

export default ListeningAnswerReview;