// src/components/listening/ListeningDocxUploader.jsx
import React, { useState, useCallback } from 'react';
import { convertDocxToHtml, parseListeningHtml } from '../../services/docxParserService';

/**
 * Props:
 *   onExercisesGenerated({ exercises, fileName, source })
 *   onScriptExtracted(scriptText) — optional, lưu script vào form.script
 */
const ListeningDocxUploader = ({ onExercisesGenerated, onScriptExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error,        setError]        = useState(null);
  const [preview,      setPreview]      = useState(null);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    setError(null);
    setPreview(null);

    if (!file || !file.name.toLowerCase().endsWith('.docx')) {
      setError('Chỉ chấp nhận file .docx');
      return;
    }

    setIsProcessing(true);
    try {
      const html      = await convertDocxToHtml(file);
      const exercises = parseListeningHtml(html);
      const total     = exercises.reduce((s, ex) => s + ex.questions.length, 0);

      if (total === 0) {
        setError(
          'Không tìm thấy câu hỏi. Đảm bảo file có dạng: (1) _____ hoặc **(1)_______**'
        );
        return;
      }

      setPreview({ exercises, totalQuestions: total, fileName: file.name });
    } catch (err) {
      setError('Không thể đọc file: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleConfirm = () => {
    if (!preview) return;
    onExercisesGenerated({
      exercises: preview.exercises,
      fileName:  preview.fileName,
      source:    'docx_mammoth',
    });
    if (onScriptExtracted) {
      const script = preview.exercises.map(ex => ex.script).join('\n\n');
      onScriptExtracted(script);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="t-field">
        <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
          📝 Upload file script bài nghe (.docx)
        </label>
        <input
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        <small style={{ color: 'var(--t-muted)' }}>
          Câu hỏi phải có dạng <code>(1) ____</code> trong script. Hỗ trợ nhiều Exercise.
        </small>
      </div>

      {isProcessing && (
        <p style={{ color: 'var(--t-muted)', fontSize: 13 }}>⏳ Đang phân tích script...</p>
      )}

      {error && <div className="t-error">⚠️ {error}</div>}

      {preview && !isProcessing && (
        <div style={{ background: 'var(--t-hover)', borderRadius: 10, padding: 16 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>
            ✅ {preview.exercises.length} Exercise — {preview.totalQuestions} câu hỏi — {preview.fileName}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', marginBottom: 14 }}>
            {preview.exercises.map(ex => (
              <div key={ex.number} style={{
                background: '#fff', borderRadius: 8, padding: '10px 12px',
                border: '1px solid var(--t-border)',
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>Exercise {ex.number}</strong>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 10,
                    background: '#E8F0FF', color: '#3355AA', fontWeight: 600,
                  }}>
                    {ex.type}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>{ex.questions.length} câu</span>
                </div>
                {ex.questions.slice(0, 3).map(q => (
                  <div key={q.number} style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>({q.number})</span>{' '}
                    {q.context.slice(0, 80)}{q.context.length > 80 ? '...' : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="t-btn" onClick={() => setPreview(null)}>Chọn file khác</button>
            <button className="t-btn t-btn-primary" onClick={handleConfirm}>
              Dùng {preview.totalQuestions} câu hỏi →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListeningDocxUploader;