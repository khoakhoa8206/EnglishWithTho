// src/components/common/ConfirmDialog.jsx

/**
 * ConfirmDialog — hộp thoại xác nhận hành động nguy hiểm
 * Props:
 *   open      {boolean}
 *   title     {string}
 *   message   {string|node}
 *   confirmLabel {string}   — default 'Xác nhận'
 *   cancelLabel  {string}   — default 'Hủy'
 *   dangerous {boolean}     — nút confirm màu đỏ
 *   loading   {boolean}     — đang xử lý
 *   onConfirm {fn}
 *   onCancel  {fn}
 */
export default function ConfirmDialog({
  open,
  title = 'Xác nhận',
  message,
  icon = '⚠️',
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  dangerous = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCancel?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="alertdialog"
        style={{
          background: '#fff',
          borderRadius: 18,
          width: '100%',
          maxWidth: 380,
          padding: '28px 24px 22px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          textAlign: 'center',
        }}
      >
        {icon && <div style={{ fontSize: 38, marginBottom: 12 }}>{icon}</div>}
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#4A3F35' }}>{title}</h3>
        {message && (
          <p style={{ margin: '0 0 22px', fontSize: 13.5, color: '#8A7F72', lineHeight: 1.5 }}>{message}</p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 22px', borderRadius: 8, fontWeight: 600, fontSize: 13.5,
              background: '#F5EDE0', color: '#5A5149', border: '1.5px solid #DDD8D0',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 22px', borderRadius: 8, fontWeight: 600, fontSize: 13.5,
              background: dangerous ? '#C0392B' : '#566B58',
              color: '#fff', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}