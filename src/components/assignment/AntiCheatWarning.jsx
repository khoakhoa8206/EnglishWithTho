// src/components/assignment/AntiCheatWarning.jsx
// Popup cảnh báo khi học sinh out tab/app khi làm bài

import React from 'react';

const MAX_VIOLATIONS = 5;

export default function AntiCheatWarning({ violationCount, isResetting, onDismiss }) {
  if (!violationCount) return null;

  const remaining = MAX_VIOLATIONS - violationCount;

  return (
    // Overlay toàn màn hình
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '36px 28px',
        maxWidth: 380,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        animation: 'antiCheatPop 0.2s ease-out',
      }}>
        {/* Icon giận dữ */}
        <div style={{ fontSize: 64, marginBottom: 12, lineHeight: 1 }}>😡</div>

        <h2 style={{
          fontSize: 20, fontWeight: 800,
          color: '#A23B32', margin: '0 0 10px',
        }}>
          {isResetting ? 'Bị reset bài!' : 'Cảnh báo gian lận!'}
        </h2>

        <p style={{
          fontSize: 14.5, color: '#4A3F35',
          lineHeight: 1.6, margin: '0 0 20px',
        }}>
          {isResetting
            ? 'Bạn đã ra khỏi bài làm quá nhiều lần. Bài sẽ được làm lại từ đầu.'
            : `Không được sử dụng phần mềm khác khi đang làm bài!\nLần vi phạm: ${violationCount}/${MAX_VIOLATIONS} — còn ${remaining} lần trước khi bị reset.`
          }
        </p>

        {/* Badge đếm lần */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8,
          marginBottom: 24,
        }}>
          {Array.from({ length: MAX_VIOLATIONS }, (_, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < violationCount ? '#A23B32' : '#EFE6D6',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '13px',
            fontSize: 15, fontWeight: 700,
            background: isResetting
              ? 'linear-gradient(135deg, #A23B32, #C4534A)'
              : 'linear-gradient(135deg, #566B58, #768E78)',
            color: '#fff', border: 'none',
            borderRadius: 12, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isResetting ? '🔄 Làm lại từ đầu' : '✓ Tôi hiểu, tiếp tục làm bài'}
        </button>
      </div>

      {/* Animation keyframe inline */}
      <style>{`
        @keyframes antiCheatPop {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}