import React, { useState, useRef, useEffect, useMemo } from 'react';

// ─── Sticky Audio Bar ──────────────────────────────────────────────────────────
function StickyAudioBar({ audioRef, title, audioUrl, speed, onSpeedChange, filledCount, total, onSubmit, onCancel }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime  = () => setCurrentTime(audio.currentTime);
    const onMeta  = () => setDuration(audio.duration || 0);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd   = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioRef]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play();
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const fillPct = total > 0 ? (filledCount / total) * 100 : 0;

  return (
    <div style={{
      position: 'fixed', top: 64, left: 0, right: 0, zIndex: 40,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #EFE6D6',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        maxWidth: 1180, margin: '0 auto',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        {/* Title */}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#332C35', whiteSpace: 'nowrap', flexShrink: 0 }}>
          🎧 {title || 'Bài nghe'}
        </span>

        {audioUrl ? (
          <>
            {/* Hidden real audio element */}
            <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />

            {/* Play/Pause button */}
            <button
              onClick={togglePlay}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                background: '#566B58', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}
            >
              {playing ? '⏸' : '▶'}
            </button>

            {/* Time */}
            <span style={{ fontSize: 12, color: '#8A7F72', whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(currentTime)} / {fmt(duration)}
            </span>

            {/* Progress bar */}
            <div
              ref={progressRef}
              onClick={seek}
              style={{
                flex: 1, minWidth: 80, height: 6, background: '#EFE6D6',
                borderRadius: 99, cursor: 'pointer', position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${pct}%`, borderRadius: 99,
                background: 'linear-gradient(90deg, #566B58, #768E78)',
                transition: 'width 0.1s',
              }} />
            </div>

            {/* Speed buttons */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {[0.75, 1, 1.25].map(s => (
                <button key={s} onClick={() => onSpeedChange(s)} style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  border: `2px solid ${speed === s ? '#566B58' : '#EFE6D6'}`,
                  background: speed === s ? '#566B58' : '#fff',
                  color: speed === s ? '#fff' : '#8A7F72',
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}>
                  {s === 0.75 ? '🐢 0.75x' : s === 1 ? '1x' : '⚡ 1.25x'}
                </button>
              ))}
            </div>
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#C24949' }}>⚠️ Chưa có file audio</span>
        )}

        {/* Progress count */}
        <span style={{ fontSize: 12, color: '#8A7F72', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{
            display: 'inline-block', width: 60, height: 5, borderRadius: 99,
            background: '#EFE6D6', verticalAlign: 'middle', marginRight: 6, overflow: 'hidden', position: 'relative',
          }}>
            <span style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${fillPct}%`, background: '#566B58', borderRadius: 99, transition: 'width 0.3s',
            }} />
          </span>
          {filledCount}/{total}
        </span>

        {/* Submit */}
        <button
          onClick={onSubmit}
          style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', flexShrink: 0,
            background: '#566B58', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          Nộp bài
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          style={{
            padding: '7px 12px', borderRadius: 8, flexShrink: 0,
            border: '1px solid #EFE6D6', background: '#fff', color: '#8A7F72',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          ← Hủy
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ListeningDictation({ listeningMaterial, questions, onSubmit, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [speed, setSpeed]     = useState(1);
  const audioRef = useRef(null);

  const handleSpeedChange = (s) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const filledCount = questions.filter(q => answers[q.id]?.trim()).length;

  const handleSubmit = () =>
    onSubmit(questions.map(q => ({ question_id: q.id, student_answer: answers[q.id] || '' })));

  return (
    <>
      {/* Sticky audio bar — sits just below the 64px navbar */}
      <StickyAudioBar
        audioRef={audioRef}
        title={listeningMaterial?.title}
        audioUrl={listeningMaterial?.audio_url}
        speed={speed}
        onSpeedChange={handleSpeedChange}
        filledCount={filledCount}
        total={questions.length}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />

      {/* Spacer: navbar (64px) + sticky bar (~62px) */}
      <div style={{ height: 62 }} />

      {/* Script area — full width, no side panel */}
      <div style={{
        maxWidth: 820,
        margin: '24px auto 48px',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid #E0D3C0',
          borderRadius: 16,
          padding: 'clamp(20px, 5vw, 48px) clamp(16px, 6vw, 56px)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          fontFamily: '"Times New Roman", Times, serif',
          lineHeight: 2.2,
          fontSize: 'clamp(15px, 2vw, 17px)',
          color: '#1a1a1a',
        }}>
          {questions.length === 0 ? (
            <p style={{ color: '#8A7F72', fontStyle: 'italic', fontFamily: 'sans-serif', fontSize: 14 }}>
              Không có câu hỏi điền từ nào.
            </p>
          ) : (
            <InlineDictationScript
              questions={questions}
              listeningMaterial={listeningMaterial}
              answers={answers}
              onChange={(qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── InlineDictationScript ─────────────────────────────────────────────────────
function InlineDictationScript({ questions, listeningMaterial, answers, onChange }) {
  const qByNumber = useMemo(() => {
    const map = {};
    questions.forEach(q => {
      const num = q.sort_order ?? q.number ?? q.position ?? null;
      if (num !== null) map[String(num)] = q;
    });
    return map;
  }, [questions]);

  const rawScript = listeningMaterial?.script || '';
  const segments  = useMemo(() => buildSegments(rawScript, qByNumber), [rawScript, qByNumber]);

  if (segments.length === 0) {
    return <FallbackDictation questions={questions} answers={answers} onChange={onChange} />;
  }

  return (
    <div>
      {segments.map((seg, segIdx) => (
        <p key={segIdx} style={{ margin: '0 0 0', display: 'block' }}>
          {seg.map((part, partIdx) => {
            if (part.type === 'html') {
              return <span key={partIdx} dangerouslySetInnerHTML={{ __html: part.html }} />;
            }
            const q        = part.question;
            const answered = answers[q.id]?.trim().length > 0;
            return (
              <span key={partIdx} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, verticalAlign: 'middle', margin: '0 4px' }}>
                <span style={{ fontSize: 12, color: '#555', fontFamily: 'sans-serif', userSelect: 'none', fontWeight: 600 }}>({part.num})</span>
                <input
                  value={answers[q.id] || ''}
                  onChange={e => onChange(q.id, e.target.value)}
                  placeholder="..."
                  style={{
                    display: 'inline-block', minWidth: 100, maxWidth: 180,
                    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                    borderBottom: `2px solid ${answered ? '#566B58' : '#ccc'}`,
                    background: answered ? '#F0F7F0' : 'transparent',
                    fontSize: 'inherit',
                    fontFamily: '"Times New Roman", Times, serif',
                    padding: '0 4px', outline: 'none', textAlign: 'center',
                    color: '#2E7D32', transition: 'border-color 0.2s',
                  }}
                />
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

// ─── stripAnswerKey: cắt bỏ phần đáp án ở cuối script (sau dòng kẻ ngang) ────
function stripAnswerKey(rawScript) {
  if (!rawScript) return rawScript;
  // Tách dựa trên dòng chứa ≥10 ký tự gạch ngang (—, ─, -, _) hoặc <hr>
  // Đây là separator giữa bài nghe và danh sách đáp án
  const separatorRe = /^[\s\S]*?(?=(?:[-─—_]{10,}|<hr\s*\/?>))/i;
  // Tìm vị trí dòng separator
  const lines = rawScript.split('\n');
  const separatorIdx = lines.findIndex(line => {
    const plain = line.replace(/<[^>]*>/g, '').trim();
    return plain.length >= 10 && /^[-─—_]{10,}$/.test(plain);
  });
  if (separatorIdx === -1) return rawScript; // Không tìm thấy separator → giữ nguyên
  return lines.slice(0, separatorIdx).join('\n');
}

// ─── buildSegments (unchanged logic) ──────────────────────────────────────────
function buildSegments(rawScript, qByNumber) {
  if (!rawScript.trim()) return [];
  // Lọc bỏ phần đáp án cuối bài trước khi render cho học sinh
  const script = stripAnswerKey(rawScript);
  const lines = script.split('\n').filter(l => l.trim());
  const segments = [];

  for (const lineHtml of lines) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = lineHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    const gapPattern = /\((\d+)\)\s*[_*]{2,}/g;
    const hasGap = gapPattern.test(plainText);

    if (!hasGap) {
      segments.push([{ type: 'html', html: lineHtml }]);
      continue;
    }

    const SLOT_RE            = /\((\d+)\)\s*[_*]{2,}/g;
    const PLACEHOLDER_PREFIX = '___SLOT___';
    let workingHtml = lineHtml;
    const slots = [];
    let m;
    SLOT_RE.lastIndex = 0;
    while ((m = SLOT_RE.exec(plainText)) !== null) slots.push({ num: m[1] });
    if (slots.length === 0) { segments.push([{ type: 'html', html: lineHtml }]); continue; }

    const SLOT_HTML_RE = /\((\d+)\)\s*[_*]{2,}/g;
    workingHtml = workingHtml.replace(SLOT_HTML_RE, (match, num) => `${PLACEHOLDER_PREFIX}${num}${PLACEHOLDER_PREFIX}`);
    const splitParts = workingHtml.split(new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_PREFIX}`));

    const segParts = [];
    for (let i = 0; i < splitParts.length; i++) {
      if (i % 2 === 0) {
        if (splitParts[i]) segParts.push({ type: 'html', html: splitParts[i] });
      } else {
        const num = splitParts[i];
        const q   = qByNumber[num];
        if (q) {
          segParts.push({ type: 'input', num, question: q });
        } else {
          segParts.push({ type: 'html', html: `<span style="border-bottom:2px solid #ccc;display:inline-block;min-width:80px;margin:0 4px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>` });
        }
      }
    }
    segments.push(segParts);
  }
  return segments;
}

// ─── FallbackDictation (unchanged) ────────────────────────────────────────────
function FallbackDictation({ questions, answers, onChange }) {
  const sorted = [...questions].sort((a, b) => (a.sort_order ?? a.number ?? 0) - (b.sort_order ?? b.number ?? 0));
  return (
    <div>
      {sorted.map((q, idx) => {
        const num      = q.sort_order ?? q.number ?? (idx + 1);
        const answered = answers[q.id]?.trim().length > 0;
        const context  = q.question || q.context || '';
        const SLOT_RE  = new RegExp(`\\(${num}\\)\\s*[_*]{2,}`, 'g');
        const PH       = `___SLOT_${num}___`;
        let html = context.replace(SLOT_RE, PH).replace(/_{4,}/g, PH);
        const parts = html.split(PH);
        return (
          <p key={q.id} style={{ margin: '0 0 8px', display: 'block' }}>
            <span dangerouslySetInnerHTML={{ __html: parts[0] || '' }} />
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, verticalAlign: 'middle', margin: '0 4px' }}>
              <span style={{ fontSize: 12, color: '#555', fontFamily: 'sans-serif', userSelect: 'none', fontWeight: 600 }}>({num})</span>
              <input
                value={answers[q.id] || ''}
                onChange={e => onChange(q.id, e.target.value)}
                placeholder="..."
                style={{
                  display: 'inline-block', minWidth: 100, maxWidth: 180,
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: `2px solid ${answered ? '#566B58' : '#ccc'}`,
                  background: answered ? '#F0F7F0' : 'transparent', fontSize: 'inherit',
                  fontFamily: '"Times New Roman", Times, serif', padding: '0 4px',
                  outline: 'none', textAlign: 'center', color: '#2E7D32', transition: 'border-color 0.2s',
                }}
              />
            </span>
            {parts[1] !== undefined && <span dangerouslySetInnerHTML={{ __html: parts[1] }} />}
          </p>
        );
      })}
    </div>
  );
}