// src/components/common/Modal.jsx
import { useEffect } from 'react';

/**
 * Modal — overlay chứa nội dung tuỳ chọn
 * Props:
 *   open     {boolean}
 *   onClose  {fn}       — gọi khi click overlay hoặc nút X
 *   title    {string}
 *   size     {'sm'|'md'|'lg'}  — default 'md'
 *   children {node}
 *   footer   {node}     — row nút bên dưới
 */
export default function Modal({ open, onClose, title, size = 'md', children, footer }) {
  // Khoá scroll body khi modal mở
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const widths = { sm: 360, md: 520, lg: 720 };
  const maxW = widths[size] || 520;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: maxW,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px 14px',
          borderBottom: '1px solid #F0E8DC',
        }}>
          {title && (
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#4A3F35' }}>{title}</h2>
          )}
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              marginLeft: 'auto',
              width: 32, height: 32, borderRadius: '50%',
              background: '#F5EDE0', border: 'none',
              cursor: 'pointer', fontSize: 16, color: '#8A7F72',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid #F0E8DC',
            display: 'flex', gap: 10, justifyContent: 'flex-end',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}