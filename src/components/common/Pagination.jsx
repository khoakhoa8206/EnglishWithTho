// src/components/common/Pagination.jsx

/**
 * Pagination — phân trang cơ bản
 * Props:
 *   page      {number}  — trang hiện tại (1-indexed)
 *   totalPages {number}
 *   onPageChange {fn}   — (newPage) => void
 *   compact   {boolean} — ẩn số trang, chỉ giữ Prev/Next
 */
export default function Pagination({ page, totalPages, onPageChange, compact = false }) {
  if (!totalPages || totalPages <= 1) return null;

  const btn = (label, target, disabled, isActive = false) => (
    <button
      key={label}
      onClick={() => !disabled && onPageChange(target)}
      disabled={disabled}
      aria-label={`Trang ${target}`}
      aria-current={isActive ? 'page' : undefined}
      style={{
        minWidth: 34, height: 34, padding: '0 10px',
        borderRadius: 8, border: '1.5px solid',
        borderColor: isActive ? '#566B58' : '#DDD8D0',
        background: isActive ? '#566B58' : '#fff',
        color: isActive ? '#fff' : disabled ? '#C4BAB0' : '#4A3F35',
        fontWeight: isActive ? 700 : 400,
        fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );

  // Tính range trang hiển thị (tối đa 5 trang)
  const range = () => {
    const delta = 2;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    const pages = [];
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '12px 0' }}>
      {btn('‹', page - 1, page <= 1)}

      {!compact && range().map(p => btn(p, p, false, p === page))}

      {btn('›', page + 1, page >= totalPages)}

      {!compact && (
        <span style={{ fontSize: 12, color: '#8A7F72', marginLeft: 4 }}>
          {page} / {totalPages}
        </span>
      )}
    </div>
  );
}