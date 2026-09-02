// src/components/common/Button.jsx

const VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, #768E78 0%, #566B58 100%)',
    color: '#fff',
    border: 'none',
    hoverOpacity: 0.9,
  },
  outline: {
    background: '#fff',
    color: '#566B58',
    border: '1.5px solid #B8C9B3',
  },
  danger: {
    background: '#fff',
    color: '#A83232',
    border: '1.5px solid #F5C0C0',
  },
  ghost: {
    background: 'transparent',
    color: '#5A5149',
    border: 'none',
  },
};

const SIZES = {
  sm: { padding: '5px 12px', fontSize: 12 },
  md: { padding: '8px 18px', fontSize: 13.5 },
  lg: { padding: '11px 26px', fontSize: 15 },
};

/**
 * Button — nút bấm dùng chung
 * Props:
 *   variant  {'primary'|'outline'|'danger'|'ghost'}
 *   size     {'sm'|'md'|'lg'}
 *   loading  {boolean}
 *   disabled {boolean}
 *   icon     {node}     — icon trước text
 *   fullWidth {boolean}
 *   onClick  {fn}
 *   type     {string}   — 'button'|'submit'
 *   children {node}
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  onClick,
  type = 'button',
  children,
  style = {},
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 8,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'opacity 0.15s',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        ...v,
        ...s,
        ...style,
      }}
    >
      {loading ? (
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite',
          display: 'inline-block',
        }} />
      ) : icon}
      {children}
    </button>
  );
}