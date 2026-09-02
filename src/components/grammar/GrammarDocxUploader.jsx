// src/components/grammar/GrammarDocxUploader.jsx
import React, { useState, useCallback } from 'react';
import { convertDocxToHtml, parseGrammarHtml, extractAnswerKey } from '../../services/docxParserService';

/**
 * Props:
 *   onQuestionsGenerated({ questions, fileName, source }) — callback khi parse xong
 */
const GrammarDocxUploader = ({ onQuestionsGenerated }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error,        setError]        = useState(null);
  const [preview,      setPreview]      = useState(null);

  const validateFile = (f) => {
    if (!f) return 'Vui lòng chọn file.';
    if (!f.name.toLowerCase().endsWith('.docx')) return 'Chỉ chấp nhận file .docx';
    if (f.size > 10 * 1024 * 1024) return 'File tối đa 10MB.';
    return null;
  };

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    setError(null);
    setPreview(null);

    const err = validateFile(file);
    if (err) { setError(err); return; }

    setIsProcessing(true);
    try {
      const html      = await convertDocxToHtml(file);
      const questions = parseGrammarHtml(html);
      const answerKey = extractAnswerKey(html); // [CHANGE-01]

      // Tự điền đáp án
      const questionsWithAnswers = questions.map(q => {
        const ans = answerKey[String(q.number)];
        if (ans && Array.isArray(q.options) && q.options.length > 0) {
          const matched = q.options.find(opt =>
            opt.startsWith(ans + '.') || opt.startsWith(ans + ')')
          );
          if (matched) return { ...q, correct: matched, _auto_filled: true };
        }
        return q;
      });

      if (questionsWithAnswers.length === 0) {
        setError(
          'Không tìm thấy câu hỏi. Kiểm tra định dạng: câu hỏi bắt đầu bằng "1. " và có đáp án A. B. C. D.'
        );
        return;
      }
      setPreview({ questions: questionsWithAnswers, fileName: file.name });
    } catch (err) {
      setError('Không thể đọc file. Đảm bảo file là .docx hợp lệ. (' + err.message + ')');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleConfirm = () => {
    if (!preview) return;
    onQuestionsGenerated({
      questions: preview.questions,
      fileName:  preview.fileName,
      source:    'docx_mammoth',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload zone */}
      <div className="t-field">
        <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
          📄 Upload file Word bài tập ngữ pháp (.docx)
        </label>
        <input
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        <small style={{ color: 'var(--t-muted)' }}>
          Tối đa 10MB — câu hỏi phải đánh số <code>1.</code> và có đáp án <code>A. B. C. D.</code>
        </small>
      </div>

      {isProcessing && (
        <p style={{ color: 'var(--t-muted)', fontSize: 13 }}>⏳ Đang đọc file...</p>
      )}

      {error && (
        <div className="t-error">⚠️ {error}</div>
      )}

      {preview && !isProcessing && (() => {
        const autoCount = preview.questions.filter(q => q._auto_filled).length;
        return (
          <div style={{ background: 'var(--t-hover)', borderRadius: 10, padding: 16 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14 }}>
              ✅ Tìm thấy {preview.questions.length} câu hỏi — {preview.fileName}
            </p>
            {autoCount > 0 && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#3355AA' }}>
                ✓ Tự điền được {autoCount}/{preview.questions.length} đáp án từ cuối file
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', marginBottom: 14 }}>
              {preview.questions.slice(0, 5).map(q => (
                <div key={q.number} style={{
                  background: '#fff', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid var(--t-border)',
                }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 13 }}>
                    {q.number}. {q.question}
                    {q._auto_filled && (
                      <span style={{
                        fontSize: 10, background: '#E8F0FF', color: '#3355AA',
                        padding: '1px 7px', borderRadius: 10, marginLeft: 8,
                      }}>✓ Tự điền</span>
                    )}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {q.options.map((opt, i) => (
                      <span key={i} style={{
                        fontSize: 12, padding: '2px 10px', borderRadius: 20,
                        background: opt === q.correct ? '#EDF3ED' : '#F5EDE0',
                        border: `1px solid ${opt === q.correct ? '#A7C5A9' : '#E0D3C0'}`,
                        color: opt === q.correct ? '#2E7D32' : '#4A3F35',
                        fontWeight: opt === q.correct ? 700 : 400,
                      }}>
                        {opt === q.correct ? '✓ ' : ''}{opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {preview.questions.length > 5 && (
                <p style={{ fontSize: 12, color: 'var(--t-muted)', margin: 0 }}>
                  ... và {preview.questions.length - 5} câu nữa
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="t-btn" onClick={() => { setPreview(null); }}>
                Chọn file khác
              </button>
              <button className="t-btn t-btn-primary" onClick={handleConfirm}>
                Dùng {preview.questions.length} câu hỏi này →
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default GrammarDocxUploader;
