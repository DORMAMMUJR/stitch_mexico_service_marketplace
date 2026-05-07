import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAvailability } from '../hooks/useAvailability';

export function AvailabilitySelector({ professionalId, onBooked }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStep, setBookingStep] = useState('select_slot');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [bookedSlots, setBookedSlots] = useState(new Set());

  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [transferReference, setTransferReference] = useState('');
  const [transferProofFile, setTransferProofFile] = useState(null);
  const [transferProofUrl, setTransferProofUrl] = useState('');
  const [transferProofUploading, setTransferProofUploading] = useState(false);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: availability, isLoading: availLoading, refetch: refetchAvailability } = useAvailability(professionalId);

  useEffect(() => {
    let mounted = true;
    async function loadPricing() {
      setPricingLoading(true);
      try {
        const data = await api.get(`/appointments/pricing/${professionalId}`);
        if (mounted) setPricing(data);
      } catch (err) {
        if (mounted) setMessage({ type: 'error', text: err.message || 'No se pudo cargar el precio del servicio.' });
      } finally {
        if (mounted) setPricingLoading(false);
      }
    }
    if (professionalId) loadPricing();
    return () => {
      mounted = false;
    };
  }, [professionalId]);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, []);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !availability?.length) return [];

    const dayOfWeek = selectedDate.getDay();
    const block = availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (!block) return [];

    const [startHour, startMin] = block.startTime.split(':').map(Number);
    const [endHour, endMin] = block.endTime.split(':').map(Number);

    const slots = [];
    let current = new Date(selectedDate);
    current.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, endMin, 0, 0);

    while (current < endTime) {
      if (current > new Date()) {
        const label = current.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        if (!(Array.isArray(block.bookedTimes) && block.bookedTimes.includes(label))) {
          slots.push({ label, iso: current.toISOString() });
        }
      }
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return slots;
  }, [selectedDate, availability]);

  const selectedDayHasAvailability = useMemo(() => {
    if (!selectedDate || !availability?.length) return false;
    const dayOfWeek = selectedDate.getDay();
    return availability.some((a) => a.dayOfWeek === dayOfWeek);
  }, [selectedDate, availability]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setBookingStep('select_slot');
    setMessage(null);
  };

  const handleSlotSelect = (slotIso) => {
    setSelectedSlot(slotIso);
    setBookingStep('payment_transfer');
    setMessage(null);
  };

  const handleConfirmTransferStep = () => {
    if (!transferReference.trim()) {
      setMessage({ type: 'error', text: 'Ingresa la referencia de transferencia.' });
      return;
    }
    if (!transferProofFile) {
      setMessage({ type: 'error', text: 'Sube la foto del comprobante de transferencia.' });
      return;
    }
    setMessage(null);
    setBookingStep('confirm_submit');
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedSlot) return;
    if (!pricing) {
      setMessage({ type: 'error', text: 'No se pudo validar el precio. Intenta de nuevo.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      let proofUrl = transferProofUrl;
      if (!proofUrl && transferProofFile) {
        setTransferProofUploading(true);
        const form = new FormData();
        form.append('proof', transferProofFile);
        const uploadResponse = await api.upload('/appointments/upload-transfer-proof', form);
        proofUrl = uploadResponse?.proofUrl || '';
        setTransferProofUrl(proofUrl);
      }

      if (!proofUrl) {
        throw new Error('No se pudo validar el comprobante de transferencia.');
      }

      await api.post('/appointments', {
        professionalId,
        scheduledAt: selectedSlot,
        notes: 'Cita agendada desde el perfil profesional.',
        paymentMethod: 'BANK_TRANSFER',
        transferReference: transferReference.trim(),
        transferProofUrl: proofUrl,
        paymentTotal: pricing.total,
      });

      setBookedSlots((prev) => new Set([...prev, selectedSlot]));
      setMessage({ type: 'success', text: 'Solicitud registrada con pago pendiente de validación.' });
      onBooked?.(
        `Tu solicitud quedó registrada para ${new Date(selectedSlot).toLocaleDateString('es-MX', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })} a las ${new Date(selectedSlot).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}. Estado inicial: pending_payment.`
      );

      setSelectedSlot(null);
      setTransferReference('');
      setTransferProofFile(null);
      setTransferProofUrl('');
      setBookingStep('select_slot');
      refetchAvailability();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTransferProofUploading(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="card glass-card profile-booking-card" style={{ padding: '1.25rem' }}>
      <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>
        Agendar Consulta
      </h3>

      <div className="profile-booking-days" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        {availLoading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Cargando disponibilidad...</p>
        ) : (
          days.map((d) => {
            const dayOfWeek = d.getDay();
            const hasAvail = availability?.some((a) => a.dayOfWeek === dayOfWeek);
            const isSelected = selectedDate?.toDateString() === d.toDateString();

            return (
              <button
                key={d.toISOString()}
                onClick={() => hasAvail && handleDateSelect(d)}
                disabled={!hasAvail}
                style={{
                  minWidth: '70px',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-lg)',
                  border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--outline-variant)',
                  background: isSelected ? 'var(--secondary-container)' : 'transparent',
                  textAlign: 'center',
                  cursor: hasAvail ? 'pointer' : 'not-allowed',
                  opacity: hasAvail ? 1 : 0.35,
                  transition: 'all 0.2s',
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
          })
        )}
      </div>

      {selectedDate && (
        <>
          {!selectedDayHasAvailability ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem', textAlign: 'center' }}>
              El profesional no tiene horarios disponibles este día.
            </p>
          ) : slotsForSelectedDate.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem', textAlign: 'center' }}>
              No hay horarios disponibles para este día.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Horarios Disponibles
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                {slotsForSelectedDate
                  .filter((slot) => !bookedSlots.has(slot.iso))
                  .map((slot) => {
                    const isSelected = selectedSlot === slot.iso;
                    return (
                      <button
                        key={slot.iso}
                        onClick={() => handleSlotSelect(slot.iso)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? 'none' : '1px solid var(--outline-variant)',
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          color: isSelected ? 'var(--on-primary)' : 'var(--primary)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </>
      )}

      {selectedSlot && bookingStep === 'payment_transfer' && (
        <div className="transfer-proof-card" style={{ marginBottom: '1rem', padding: '0.875rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-container-lowest)' }}>
          {pricingLoading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Cargando costos...</p>
          ) : pricing ? (
            <div style={{ marginBottom: '0.75rem', padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', fontWeight: 700 }}>Pago por transferencia bancaria</p>
              <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                <p><strong>Servicio:</strong> ${Number(pricing.basePrice).toLocaleString('es-MX')} {pricing.currency}</p>
                <p><strong>Comisión plataforma (10%):</strong> ${Number(pricing.commission).toLocaleString('es-MX')} {pricing.currency}</p>
                <p style={{ fontWeight: 800, color: 'var(--primary)' }}><strong>Total a transferir:</strong> ${Number(pricing.total).toLocaleString('es-MX')} {pricing.currency}</p>
              </div>
            </div>
          ) : null}
          <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.625rem', color: 'var(--primary)' }}>
            Paso 2: Pago por Transferencia
          </p>
          <input className="input-field" placeholder="Referencia de transferencia" value={transferReference} onChange={(e) => setTransferReference(e.target.value)} style={{ marginBottom: '0.5rem' }} />
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setTransferProofFile(e.target.files?.[0] || null)} style={{ marginBottom: '0.5rem', width: '100%' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>Sube foto del comprobante (PNG/JPG/WEBP). Este archivo es obligatorio.</p>
          {transferProofFile && <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Archivo listo: {transferProofFile.name}</p>}
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleConfirmTransferStep}>Ya transferí</button>
        </div>
      )}

      {selectedSlot && bookingStep === 'confirm_submit' && (
        <div className="transfer-proof-card" style={{ marginBottom: '1rem', padding: '0.875rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-container-lowest)' }}>
          {pricing && (
            <div style={{ marginBottom: '0.75rem', padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', fontWeight: 700 }}>Pago por transferencia bancaria</p>
              <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                <p><strong>Servicio:</strong> ${Number(pricing.basePrice).toLocaleString('es-MX')} {pricing.currency}</p>
                <p><strong>Comisión plataforma (10%):</strong> ${Number(pricing.commission).toLocaleString('es-MX')} {pricing.currency}</p>
                <p style={{ fontWeight: 800, color: 'var(--primary)' }}><strong>Total a transferir:</strong> ${Number(pricing.total).toLocaleString('es-MX')} {pricing.currency}</p>
              </div>
            </div>
          )}
          <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Paso 3: Confirmar solicitud</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
            Horario: {new Date(selectedSlot).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
            Estado inicial: <strong>PENDING_PAYMENT</strong>
          </p>
        </div>
      )}

      {message && (
        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: message.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.8125rem', marginBottom: '1rem', textAlign: 'center' }}>
          {message.text}
        </div>
      )}

      <button
        onClick={handleBooking}
        disabled={bookingStep !== 'confirm_submit' || isLoading || pricingLoading || transferProofUploading}
        className="btn btn-primary profile-booking-submit"
        style={{ width: '100%', justifyContent: 'center', opacity: bookingStep === 'confirm_submit' && !isLoading ? 1 : 0.5 }}
      >
        {isLoading || transferProofUploading ? 'Procesando...' : isAuthenticated ? 'Confirmar y crear cita' : 'Inicia Sesión para Agendar'}
      </button>

      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '1rem' }}>
        La cita se guarda solo después de confirmar "Ya transferí".
      </p>
    </div>
  );
}

