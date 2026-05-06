import React from 'react';

export function NotifBanner({ text = '¡Cita confirmada! Revisa los detalles en tu panel de citas.' }) {
  const [isVisible, setIsVisible] = React.useState(true);
  React.useEffect(() => { setIsVisible(true); }, [text]);

  if (!isVisible) return null;

  return (
    <div className="notif-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--secondary)', fontSize: '20px' }}>check_circle</span>
        <span>{text}</span>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        style={{ padding: '0.25rem', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.2s' }} 
        onMouseOver={(e) => e.currentTarget.style.background='rgba(0,0,0,0.05)'} 
        onMouseOut={(e) => e.currentTarget.style.background='transparent'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
      </button>
    </div>
  );
}
