// src/components/common/ErrorState.jsx

export default function ErrorState({
  message = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  onRetry,
  compact = false,
  icon = '⚠️',
}) {
  const retryBtn = onRetry && (
    <button
      onClick={onRetry}
      style={{
        marginTop: compact ? 0 : 12,
        marginLeft: compact ? 12 : 0,
        padding: '6px 18px',
        borderRadius: 8,
        background: '#566B58',
        color: '#fff',
        border: 'none',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
    >
      {'Thử lại'}
    </button>
  );

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '20px 16px',
        fontSize: 13.5,
        color: '#A83232',
      }}>
        <span>{icon}</span>
        <span>{message}</span>
        {retryBtn}
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
      gap: 8,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#4A3F35' }}>{'Có lỗi xảy ra'}</p>
      <p style={{ margin: 0, fontSize: 13.5, color: '#A83232', maxWidth: 320 }}>{message}</p>
      {retryBtn}
    </div>
  );
}