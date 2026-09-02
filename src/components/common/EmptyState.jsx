// src/components/common/EmptyState.jsx

/**
 * EmptyState — hiển thị khi không có dữ liệu
 * Props:
 *   icon     {string}   — emoji hoặc ký tự icon (default '📭')
 *   title    {string}   — dòng chính
 *   message  {string}   — mô tả phụ
 *   action   {node}     — nút hành động tuỳ chọn (VD: <button>Thêm mới</button>)
 *   compact  {boolean}  — layout nhỏ gọn (cho dùng trong table row)
 */
export default function EmptyState({
  icon = '📭',
  title = 'Không có dữ liệu',
  message,
  action,
  compact = false,
}) {
  if (compact) {
    return (
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        color: '#8A7F72',
        fontSize: 13.5,
      }}>
        <span style={{ marginRight: 6 }}>{icon}</span>
        {message || title}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 42, lineHeight: 1 }}>{icon}</div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#4A3F35' }}>{title}</p>
      {message && (
        <p style={{ margin: 0, fontSize: 13.5, color: '#8A7F72', maxWidth: 320 }}>{message}</p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}