import React, { useState } from 'react';
import ListeningDictation from './ListeningDictation';
import ListeningMCQ from './ListeningMCQ';

export default function ListeningDictationEngine({ assignment, questions, listeningMaterial, ...rest }) {
  const dictationQs = questions?.filter(q => q.question_type === 'fill_in_blank' || q.question_type === 'dictation') || [];
  const mcqQs = questions?.filter(q => q.question_type === 'multiple_choice') || [];

  const hasBoth = dictationQs.length > 0 && mcqQs.length > 0;
  const [tab, setTab] = useState(dictationQs.length > 0 ? 'dictation' : 'mcq');

  if (!questions || questions.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8A7F72', background: '#fff', borderRadius: 16, border: '1px solid #EFE6D6' }}>
        <p style={{ fontSize: 32, margin: '0 0 10px' }}>📭</p>
        <p style={{ fontSize: 16 }}>Giáo viên chưa cập nhật bài tập cho phần nghe này.</p>
        <button onClick={rest.onCancel} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, border: '1px solid #EFE6D6', background: '#FDFAF5', color: '#8A7F72', cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {hasBoth && (
        <div style={{ display: 'flex', gap: 8, padding: '16px 20px', borderBottom: '1px solid #EFE6D6', background: '#fff', borderRadius: '16px 16px 0 0' }}>
          {[
            { key: 'dictation', label: '✏️ Điền từ' },
            { key: 'mcq', label: '🎯 Trắc nghiệm' }
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '8px 20px', borderRadius: 20,
                border: `2px solid ${tab === t.key ? '#566B58' : '#EFE6D6'}`,
                background: tab === t.key ? '#566B58' : '#fff',
                color: tab === t.key ? '#fff' : '#8A7F72',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'dictation' && dictationQs.length > 0 && (
        <ListeningDictation listeningMaterial={listeningMaterial} questions={dictationQs} {...rest} />
      )}
      {tab === 'mcq' && mcqQs.length > 0 && (
        <ListeningMCQ listeningMaterial={listeningMaterial} questions={mcqQs} {...rest} />
      )}
    </div>
  );
}
