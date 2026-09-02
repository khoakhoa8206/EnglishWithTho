// src/components/common/AudioPlayer.jsx
import { useRef, useState, useEffect } from 'react';

const SPEEDS = [0.75, 1, 1.25];

function formatTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * AudioPlayer — trình phát audio với speed control
 * Theo spec §43: 0.75x / 1x / 1.25x, Play/Pause/Seek/Progress drag
 *
 * Props:
 *   src      {string}  — URL file audio
 *   title    {string}  — tên bài nghe (tuỳ chọn)
 *   compact  {boolean} — layout nhỏ gọn (không hiện title)
 */
export default function AudioPlayer({ src, title, compact = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying]     = useState(false);
  const [current, setCurrent]     = useState(0);
  const [duration, setDuration]   = useState(0);
  const [speed, setSpeed]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  // Sync speed to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => setError(true)); }
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  const cycleSpeed = () => {
    const idx = (SPEEDS.indexOf(speed) + 1) % SPEEDS.length;
    setSpeed(SPEEDS[idx]);
  };

  const progress = duration ? current / duration : 0;

  if (!src) return (
    <div style={{ padding: 16, borderRadius: 12, background: '#F5EDE0', fontSize: 13, color: '#8A7F72', textAlign: 'center' }}>
      Chưa có file audio
    </div>
  );

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #EFE6D6',
      borderRadius: 14,
      padding: compact ? '12px 16px' : '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => { setDuration(audioRef.current?.duration || 0); setLoading(false); }}
        onEnded={() => setPlaying(false)}
        onError={() => { setError(true); setLoading(false); }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        preload="metadata"
      />

      {/* Title */}
      {!compact && title && (
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#4A3F35', display: 'flex', alignItems: 'center', gap: 6 }}>
          🎧 {title}
        </div>
      )}

      {error ? (
        <div style={{ fontSize: 12.5, color: '#A83232', padding: '8px 0' }}>⚠️ Không thể tải file audio</div>
      ) : (
        <>
          {/* Progress bar */}
          <div
            onClick={seek}
            onTouchStart={seek}
            style={{
              height: 6, borderRadius: 999,
              background: '#F0E8DC',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <div style={{
              height: '100%', borderRadius: 999,
              background: 'linear-gradient(90deg, #768E78, #566B58)',
              width: `${progress * 100}%`,
              transition: 'width 0.1s',
            }} />
            {/* Thumb */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${progress * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14, borderRadius: '50%',
              background: '#566B58',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Play/Pause */}
            <button
              onClick={toggle}
              disabled={loading && !duration}
              aria-label={playing ? 'Tạm dừng' : 'Phát'}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#566B58', border: 'none', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}
            >
              {loading && !duration ? '⋯' : playing ? '⏸' : '▶'}
            </button>

            {/* Time */}
            <span style={{ fontSize: 12, color: '#8A7F72', fontVariantNumeric: 'tabular-nums', minWidth: 80 }}>
              {formatTime(current)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Speed */}
            <button
              onClick={cycleSpeed}
              aria-label={`Tốc độ ${speed}x`}
              style={{
                padding: '4px 10px', borderRadius: 999,
                background: '#F0E8DC', border: '1px solid #DDD8D0',
                fontSize: 12, fontWeight: 700, color: '#566B58',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {speed}x
            </button>
          </div>
        </>
      )}
    </div>
  );
}