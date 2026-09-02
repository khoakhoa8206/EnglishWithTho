// src/components/common/Badge.jsx

const VARIANTS = {
  success:  { bg: '#D4EDDA', color: '#1E6B3C', border: '#A3D9B1' },
  warning:  { bg: '#FFF3CD', color: '#856404', border: '#FFDF7E' },
  danger:   { bg: '#F8D7DA', color: '#842029', border: '#F5C2C7' },
  info:     { bg: '#D0E8FF', color: '#0A4C8C', border: '#9EC9F5' },
  neutral:  { bg: '#F3F0EC', color: '#5A5149', border: '#DDD8D0' },
  primary:  { bg: '#E7EEE6', color: '#3A5C3C', border: '#B3CAAE' },
  peony:    { bg: '#FDEAEA', color: '#A83232', border: '#F5C0C0' },
  honey:    { bg: '#FFF5E0', color: '#7A4D00', border: '#FFDD99' },
};

/**
 * Badge — nhãn trạng thái nhỏ
 * Props:
 *   variant  {'success'|'warning'|'danger'|'info'|'neutral'|'primary'|'peony'|'honey'}
 *   children {node}
 *   size     {'sm'|'md'}  — default 'md'
 */
export default function Badge({ variant = 'neutral', children, size = 'md' }) {
  const s = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: size === 'sm' ? '2px 8px' : '3px 10px',
      borderRadius: 999,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
      lineHeight: 1.5,
    }}>
      {children}
    </span>
  );
}