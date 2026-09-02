// src/components/common/Card.jsx

/**
 * Card — khung nội dung cơ bản, theo visual của Teacher dashboard
 * Props:
 *   title    {string}   — tiêu đề card
 *   subtitle {string}   — dòng phụ bên cạnh tiêu đề
 *   action   {node}     — nút hành động góc phải tiêu đề
 *   padding  {number}   — px (default 24)
 *   style    {object}
 *   children {node}
 */
export default function Card({ title, subtitle, action, padding = 24, style = {}, children }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #EFE6D6',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${padding}px ${padding}px ${padding * 0.6}px`,
          borderBottom: '1px solid #F5EDE0',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#4A3F35' }}>{title}</h3>
            )}
            {subtitle && (
              <span style={{ fontSize: 12, color: '#8A7F72', fontWeight: 400 }}>{subtitle}</span>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}