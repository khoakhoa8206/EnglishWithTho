// src/components/vocabulary/VocabPart4Preview.jsx
// BUG 6 FIX: Component xem trước bài tập Part 4 (Quiz) cho giáo viên
import React from 'react';

function _parseOptions(options) {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  try { return JSON.parse(options); } catch { return []; }
}

export default function VocabPart4Preview({ data, onClose }) {
  const questions = data?.assignment_questions ?? data?.questions ?? [];

  return (
    <div
      className="t-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="t-modal"
        style={{ maxWidth: 700, maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>📋 Xem bài Part 4: {data?.title || 'Bài tập'}</h3>
          <button className="t-btn t-btn-sm" onClick={onClose}>✕ Đóng</button>
        </div>

        {questions.length === 0 && (
          <p style={{ color: 'var(--t-muted)', textAlign: 'center', padding: '20px 0' }}>
            📭 Chưa có câu hỏi nào trong bài tập này.
          </p>
        )}

        {questions.map((q, idx) => {
          const opts = _parseOptions(q.options);
          return (
            <div
              key={q.id || idx}
              style={{
                background: 'var(--t-hover)',
                borderRadius: 10,
                padding: 14,
                marginBottom: 12,
                border: '1px solid var(--t-border)',
              }}
            >
              <p style={{ fontWeight: 600, margin: '0 0 10px', fontSize: 13.5 }}>
                {idx + 1}. {q.question}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {opts.map((opt, i) => {
                  const isCorrect =
                    opt === q.correct ||
                    (q.correct &&
                      (opt.startsWith(q.correct + '.') ||
                        opt.startsWith(q.correct + ')')));
                  return (
                    <li
                      key={i}
                      style={{
                        color: isCorrect ? '#2E9767' : 'inherit',
                        fontWeight: isCorrect ? 700 : 400,
                        fontSize: 13,
                      }}
                    >
                      {isCorrect ? '✓ ' : ''}{opt}
                    </li>
                  );
                })}
              </ul>
              {q.difficulty && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#888' }}>
                  Độ khó: {q.difficulty}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
