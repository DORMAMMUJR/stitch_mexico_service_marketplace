/**
 * app/src/components/AvailabilitySelector.jsx
 *
 * Cambios respecto a la versión anterior:
 * - Usa api.post() centralizado en lugar de fetch manual con localStorage
 * - Los time slots se derivan de la disponibilidad real del profesional
 * - El campo enviado al backend es scheduledAt (ISO string) en lugar de date + time
 * - Si el profesional no tiene disponibilidad ese día, se muestra mensaje claro
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAvailability } from '../hooks/useAvailability';

export function AvailabilitySelector({ professionalId }) {
  const [selectedDate, setSelectedDate]   = useState(null);
  const [selectedSlot, setSelectedSlot]   = useState(null); // ISO string completo
  const [isLoading, setIsLoading]         = useState(false);
  const [message, setMessage]             = useState(null);
  const [bookedSlots, setBookedSlots]     = useState(new Set()); // Slots ya agendados en esta sesión

  const { isAuthenticated } = useAuth();
  const navigate            = useNavigate();

  // Disponibilidad real del profesional desde el backend
  const { data: availability, isLoading: availLoading } = useAvailability(professionalId);

  // Generar los próximos 14 días (sin incluir hoy)
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, []);

  /**
   * Dado un Date seleccionado, genera slots horarios cada 60 minutos
   * dentro del rango startTime–endTime de la disponibilidad configurada.
   * Devuelve array de objetos { label: "09:00", iso: "2025-06-16T09:00:00.000Z" }
   */
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !availability?.length) return [];

    const dayOfWeek = selectedDate.getDay(); // 0=Dom, 1=Lun, ...
    const block = availability.find(a => a.dayOfWeek === dayOfWeek);

    if (!block) return [];

    const [startHour, startMin] = block.startTime.split(':').map(Number);
    const [endHour, endMin]     = block.endTime.split(':').map(Number);

    const slots = [];
    let current = new Date(selectedDate);
    current.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, endMin, 0, 0);

    while (current < endTime) {
      // Excluir slots que ya pasaron (por si selectedDate es hoy — aunque
      // los días generados empiezan mañana, es una salvaguarda extra)
      if (current > new Date()) {
        slots.push({
          label: current.toLocaleTimeString('es-MX', {
            hour:   '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          iso: current.toISOString(),
        });
      }
      current = new Date(current.getTime() + 60 * 60 * 1000); // +1 hora
    }

    return slots;
  }, [selectedDate, availability]);

  // Si el día seleccionado no tiene disponibilidad configurada
  const selectedDayHasAvailability = useMemo(() => {
    if (!selectedDate || !availability?.length) return false;
    const dayOfWeek = selectedDate.getDay();
    return availability.some(a => a.dayOfWeek === dayOfWeek);
  }, [selectedDate, availability]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Limpiar slot al cambiar de día
    setMessage(null);
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedSlot) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await api.post('/appointments', {
        professionalId,
        scheduledAt: selectedSlot,
        notes: 'Cita agendada desde el perfil profesional.',
      });

      // Marcar el slot como ocupado localmente para que desaparezca del grid
      // sin necesidad de recargar la página ni llamar al backend de nuevo
      setBookedSlots(prev => new Set([...prev, selectedSlot]));
      setMessage({ type: 'success', text: '¡Cita agendada con éxito! Revisa Mis Citas.' });
      setSelectedSlot(null);
      // No reseteamos selectedDate para que el usuario vea el día actualizado
      // (el slot desaparece del grid porque ya está en bookedSlots)
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h3
        style={{
          fontFamily:   'Manrope',
          fontWeight:   700,
          fontSize:     '1.25rem',
          color:        'var(--primary)',
          marginBottom: '1.5rem',
        }}
      >
        Agendar Consulta
      </h3>

      {/* ── Selector de fecha (scroll horizontal) ── */}
      <div
        style={{
          display:       'flex',
          gap:           '0.75rem',
          overflowX:     'auto',
          paddingBottom: '1rem',
          marginBottom:  '1.5rem',
        }}
      >
        {availLoading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Cargando disponibilidad...
          </p>
        ) : (
          days.map(d => {
            const dayOfWeek   = d.getDay();
            const hasAvail    = availability?.some(a => a.dayOfWeek === dayOfWeek);
            const isSelected  = selectedDate?.toDateString() === d.toDateString();

            return (
              <button
                key={d.toISOString()}
                onClick={() => hasAvail && handleDateSelect(d)}
                disabled={!hasAvail}
                style={{
                  minWidth:   '70px',
                  padding:    '0.75rem',
                  borderRadius: 'var(--radius-lg)',
                  border:     isSelected
                    ? '2px solid var(--secondary)'
                    : '1px solid var(--outline-variant)',
                  background: isSelected
                    ? 'var(--secondary-container)'
                    : 'transparent',
                  textAlign:  'center',
                  cursor:     hasAvail ? 'pointer' : 'not-allowed',
                  opacity:    hasAvail ? 1 : 0.35,
                  transition: 'all 0.2s',
                }}
              >
                <p
                  style={{
                    fontSize:        '0.625rem',
                    textTransform:   'uppercase',
                    color:           isSelected ? 'var(--secondary)' : 'var(--on-surface-variant)',
                    fontWeight:      700,
                  }}
                >
                  {d.toLocaleString('es-MX', { weekday: 'short' })}
                </p>
                <p
                  style={{
                    fontSize:   '1.125rem',
                    fontWeight: 700,
                    color:      isSelected ? 'var(--secondary)' : 'var(--primary)',
                  }}
                >
                  {d.getDate()}
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* ── Slots horarios ── */}
      {selectedDate && (
        <>
          {!selectedDayHasAvailability ? (
            <p
              style={{
                fontSize:     '0.875rem',
                color:        'var(--on-surface-variant)',
                marginBottom: '1.5rem',
                textAlign:    'center',
              }}
            >
              El profesional no tiene horarios disponibles este día.
            </p>
          ) : slotsForSelectedDate.length === 0 ? (
            <p
              style={{
                fontSize:     '0.875rem',
                color:        'var(--on-surface-variant)',
                marginBottom: '1.5rem',
                textAlign:    'center',
              }}
            >
              No hay horarios disponibles para este día.
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize:       '0.8125rem',
                  fontWeight:     600,
                  color:          'var(--on-surface-variant)',
                  textTransform:  'uppercase',
                  marginBottom:   '0.75rem',
                }}
              >
                Horarios Disponibles
              </p>
              <div
                style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap:                 '0.5rem',
                  marginBottom:        '2rem',
                }}
              >
                {slotsForSelectedDate
                  .filter(slot => !bookedSlots.has(slot.iso)) // Ocultar slots ya agendados en esta sesión
                  .map(slot => {
                    const isSelected = selectedSlot === slot.iso;
                    return (
                      <button
                        key={slot.iso}
                        onClick={() => setSelectedSlot(slot.iso)}
                        style={{
                          padding:      '0.5rem',
                          borderRadius: 'var(--radius-md)',
                          border:       isSelected ? 'none' : '1px solid var(--outline-variant)',
                          background:   isSelected ? 'var(--primary)' : 'transparent',
                          color:        isSelected ? 'var(--on-primary)' : 'var(--primary)',
                          fontSize:     '0.875rem',
                          fontWeight:   600,
                          cursor:       'pointer',
                          transition:   'all 0.2s',
                        }}
                      >
                        {slot.label}
                      </button>
                    );
                  })
                }
                {/* Si todos los slots del día fueron agendados en esta sesión */}
                {slotsForSelectedDate.length > 0 &&
                  slotsForSelectedDate.every(slot => bookedSlots.has(slot.iso)) && (
                  <p style={{ gridColumn: '1 / -1', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', textAlign: 'center', padding: '0.75rem 0' }}>
                    Todos los horarios de este día han sido agendados.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Mensaje de resultado ── */}
      {message && (
        <div
          style={{
            padding:      '0.75rem',
            borderRadius: 'var(--radius-md)',
            background:   message.type === 'success'
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(239,68,68,0.1)',
            color:        message.type === 'success' ? '#10b981' : '#ef4444',
            fontSize:     '0.8125rem',
            marginBottom: '1rem',
            textAlign:    'center',
          }}
        >
          {message.text}
        </div>
      )}

      {/* ── Botón de confirmación ── */}
      <button
        onClick={handleBooking}
        disabled={!selectedSlot || isLoading}
        className="btn btn-primary"
        style={{
          width:           '100%',
          justifyContent:  'center',
          opacity:         selectedSlot && !isLoading ? 1 : 0.5,
        }}
      >
        {isLoading
          ? 'Procesando...'
          : isAuthenticated
            ? 'Confirmar Cita'
            : 'Inicia Sesión para Agendar'}
      </button>

      <p
        style={{
          fontSize:   '0.75rem',
          color:      'var(--on-surface-variant)',
          textAlign:  'center',
          marginTop:  '1rem',
        }}
      >
        Al agendar, el profesional recibirá una notificación inmediata.
      </p>
    </div>
  );
}
