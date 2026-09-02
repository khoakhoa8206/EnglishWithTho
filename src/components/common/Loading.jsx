// src/components/common/Loading.jsx

const spinKeyframes = `
@keyframes mochi-spin {
  to { transform: rotate(360deg); }
}`;

// Inject keyframes một lần vào <head>
if (typeof document !== 'undefined' && !document.getElementById('mochi-spin')) {
  const s = document.createElement('style');
  s.id = 'mochi-spin';
  s.textContent = spinKeyframes;
  document.head.appendChild(s);
}

/**
 * Loading — spinner toàn trang hoặc inline
 * Props:
 *   fullPage  {boolean}  — chiếm toàn viewport (dùng cho route guard)
 *   text      {string}   — tuỳ chọn, mô tả đang làm gì
 *   size      {number}   — px của spinner (default 36)
 */
export default function Loading({ fullPage = false, text = 'Đang tải...', size = 36 }) {
  const spinner = (
    <div
      role="status"
      aria-label={text}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid #EFE6D6',
        borderTopColor: '#768E78',
        animation: 'mochi-spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );

  if (fullPage) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', gap: 14,
      }}>
        {spinner}
        {text && <p style={{ margin: 0, fontSize: 14, color: '#8A7F72' }}>{text}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
      {spinner}
      {text && <span style={{ fontSize: 13, color: '#8A7F72' }}>{text}</span>}
    </div>
  );
}