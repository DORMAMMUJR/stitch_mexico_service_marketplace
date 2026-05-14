import React from 'react';

export function VideoCallModal({ session, onClose }) {
  if (!session?.joinUrl) return null;

  const src = session.token
    ? `${session.joinUrl}${session.joinUrl.includes('?') ? '&' : '?'}jwt=${encodeURIComponent(session.token)}`
    : session.joinUrl;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar videollamada"
        style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.72)', cursor: 'pointer' }}
      />
      <div className="glass-card" style={{ position: 'relative', width: 'min(1100px, 100vw - 1rem)', height: 'min(85vh, 860px)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem' }}>Videollamada en curso</p>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
        <iframe
          title="Sala de videollamada"
          src={src}
          allow="camera; microphone; display-capture; autoplay; fullscreen"
          style={{ width: '100%', height: 'calc(100% - 52px)', border: 0, background: '#000' }}
        />
      </div>
    </div>
  );
}
