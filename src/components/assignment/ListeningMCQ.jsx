import React, { useState, useRef } from 'react';

export default function ListeningMCQ({ listeningMaterial, questions, onSubmit, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef(null);

  const answeredCount = Object.keys(answers).length;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleSpeedChange = (s) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const parseOptionLetter = (optStr) => {
    const match = optStr.match(/^([A-D])[.)]/i);
    return match ? match[1].toUpperCase() : optStr.charAt(0).toUpperCase();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: 24, maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ position: isMobile ? 'relative' : 'sticky', top: isMobile ? 0 : 80, height: 'fit-content', zIndex: 10 }}>
        <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#332C35', margin: '0 0 12px' }}>
            🎧 {listeningMaterial?.title || 'Bài nghe'}
          </p>
          {listeningMaterial?.audio_url ? (
            <>
              <audio ref={audioRef} src={listeningMaterial.audio_url} controls style={{ width: '100%', marginBottom: 12, borderRadius: 8 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[0.75, 1, 1.25].map(s => (
                  <button key={s} onClick={() => handleSpeedChange(s)}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `2px solid ${speed === s ? '#566B58' : '#EFE6D6'}`, background: speed === s ? '#566B58' : '#fff', color: speed === s ? '#fff' : '#8A7F72', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {s === 0.75 ? '🐢 0.75x' : s === 1 ? '▶ 1x' : '⚡ 1.25x'}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: '#C24949', fontSize: 13 }}>⚠️ Chưa có file audio.</p>
          )}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #EFE6D6' }}>
            <p style={{ fontSize: 12, color: '#8A7F72', margin: '0 0 6px' }}>Đã trả lời: {answeredCount}/{questions.length}</p>
            <div style={{ height: 6, background: '#EFE6D6', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #566B58, #768E78)', width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
          <button onClick={() => onSubmit(questions.map(q => ({ question_id: q.id, student_answer: answers[q.id] || '' })))}
            style={{ width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 10, border: 'none', background: '#566B58', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Nộp bài ({answeredCount}/{questions.length})
          </button>
          <button onClick={onCancel} style={{ width: '100%', marginTop: 8, padding: '9px 0', borderRadius: 10, border: '1px solid #EFE6D6', background: '#fff', color: '#8A7F72', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Hủy</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.length === 0 ? (
          <p style={{ color: '#8A7F72', fontStyle: 'italic', fontFamily: 'sans-serif', fontSize: 14 }}>Không có câu hỏi trắc nghiệm nào.</p>
        ) : (
          [...questions].sort((a, b) => {
                const pa = a.sort_order ?? a.position ?? 0;
                const pb = b.sort_order ?? b.position ?? 0;
                return pa - pb;
              }).map((q, idx) => (
            <div key={q.id} style={{ background: '#fff', border: `2px solid ${answers[q.id] ? '#A7C5A9' : '#EFE6D6'}`, borderRadius: 14, padding: '16px 20px', transition: 'border-color 0.2s' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#332C35', margin: '0 0 12px', lineHeight: 1.5 }}>
                {q.position ?? idx + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Array.isArray(q.options) ? q.options : []).map((opt, i) => {
                  const letter = parseOptionLetter(opt) || String.fromCharCode(65 + i);
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button key={i} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: isSelected ? 700 : 400, border: `2px solid ${isSelected ? '#566B58' : '#EFE6D6'}`, background: isSelected ? '#EDF3ED' : '#FDFAF5', color: isSelected ? '#2E7D32' : '#4A3F35', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: isSelected ? '#566B58' : '#EFE6D6', color: isSelected ? '#fff' : '#8A7F72', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {letter}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
