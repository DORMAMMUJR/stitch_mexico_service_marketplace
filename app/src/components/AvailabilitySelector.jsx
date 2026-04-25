import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function AvailabilitySelector({ professionalId, availability = [] }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Generar próximos 7 días
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1); // Empezar mañana
    return d;
  });

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedDate || !selectedTime) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const appointmentDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          professionalId,
          date: appointmentDate.toISOString(),
          notes: 'Cita agendada desde el perfil profesional.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agendar');

      setMessage({ type: 'success', text: '¡Cita agendada con éxito!' });
      setSelectedTime(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00'];

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Agendar Consulta</h3>
      
      {/* Date Picker (Horizontal Scroll) */}
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        {days.map(d => {
          const isSelected = selectedDate?.toDateString() === d.toDateString();
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDate(d)}
              style={{
                minWidth: '70px',
                padding: '0.75rem',
                borderRadius: 'var(--radius-lg)',
                border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--outline-variant)',
                background: isSelected ? 'var(--secondary-container)' : 'transparent',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: isSelected ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 700 }}>
                {d.toLocaleString('es-MX', { weekday: 'short' })}
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: isSelected ? 'var(--secondary)' : 'var(--primary)' }}>
                {d.getDate()}
              </p>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Horarios Disponibles</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: '2rem' }}>
            {timeSlots.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: selectedTime === t ? 'none' : '1px solid var(--outline-variant)',
                  background: selectedTime === t ? 'var(--primary)' : 'transparent',
                  color: selectedTime === t ? 'var(--on-primary)' : 'var(--primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {message && (
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: 'var(--radius-md)', 
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          fontSize: '0.8125rem',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          {message.text}
        </div>
      )}

      <button 
        onClick={handleBooking}
        disabled={!selectedTime || isLoading}
        className="btn btn-primary" 
        style={{ width: '100%', justifyContent: 'center', opacity: selectedTime ? 1 : 0.5 }}
      >
        {isLoading ? 'Procesando...' : isAuthenticated ? 'Confirmar Cita' : 'Inicia Sesión para Agendar'}
      </button>
      
      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '1rem' }}>
        Al agendar, el profesional recibirá una notificación inmediata.
      </p>
    </div>
  );
}
