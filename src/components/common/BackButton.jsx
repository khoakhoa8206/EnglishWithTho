import { useNavigate } from 'react-router-dom';

export default function BackButton({ to, label = 'Về trang chủ' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <button
      onClick={handleBack}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 16px', borderRadius: 999,
        fontSize: 13, fontWeight: 600,
        background: '#E7EEE6', color: '#566B58',
        border: '1.5px solid #768E78', cursor: 'pointer',
        marginBottom: 20, transition: 'background .15s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#d4e2d4'}
      onMouseLeave={e => e.currentTarget.style.background = '#E7EEE6'}
    >
      ← {label}
    </button>
  );
}