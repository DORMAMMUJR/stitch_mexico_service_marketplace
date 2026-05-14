import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAvailability } from '../hooks/useAvailability';

export function AvailabilitySelector({ professionalId, onBooked }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [bookedSlots, setBookedSlots] = useState(new Set());

  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
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
        if (mounted) {
          setPricing(data);
          if (Array.isArray(data?.paymentMethods) && data.paymentMethods.includes('BANK_TRANSFER')) {
            setPaymentMethod('BANK_TRANSFER');
          }
        }
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
    const slotIntervalMinutes = Number(block.slotIntervalMinutes) || 30;

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
      current = new Date(current.getTime() + slotIntervalMinutes * 60 * 1000);
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
    setMessage(null);
  };

  const handleSlotSelect = (slotIso) => {
    setSelectedSlot(slotIso);
    setTransferReference('');
    setTransferProofFile(null);
    setTransferProofUrl('');
    setPaymentMethod('BANK_TRANSFER');
    setMessage(null);
  };

  const ensureAuthenticated = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleTransferBooking = async () => {
    if (!ensureAuthenticated()) return;
    if (!selectedSlot) return;

    if (!pricing) {
      setMessage({ type: 'error', text: 'No se pudo validar el precio. Intenta de nuevo.' });
      return;
    }

    if (!transferReference.trim()) {
      setMessage({ type: 'error', text: 'Ingresa la referencia de transferencia.' });
      return;
    }

    if (!transferProofFile && !transferProofUrl) {
      setMessage({ type: 'error', text: 'Sube la foto del comprobante de transferencia.' });
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
        notes: 'Solicitud desde perfil profesional (transferencia).',
        paymentMethod: 'BANK_TRANSFER',
        transferReference: transferReference.trim(),
        transferProofUrl: proofUrl,
        paymentTotal: pricing.total,
      });

      setBookedSlots((prev) => new Set([...prev, selectedSlot]));
      setMessage({ type: 'success', text: 'Solicitud enviada. La cita se confirma cuando el profesional valide el pago.' });
      onBooked?.(
        `Solicitud enviada para ${new Date(selectedSlot).toLocaleDateString('es-MX', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })} a las ${new Date(selectedSlot).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}. Estado inicial: pending_payment.`
      );

      setSelectedSlot(null);
      setTransferReference('');
      setTransferProofFile(null);
      setTransferProofUrl('');
      refetchAvailability();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTransferProofUploading(false);
      setIsLoading(false);
    }
  };

  const handleCardCheckout = async () => {
    if (!ensureAuthenticated()) return;
    if (!selectedSlot) return;

    if (!pricing) {
      setMessage({ type: 'error', text: 'No se pudo validar el precio. Intenta de nuevo.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const checkout = await api.post('/appointments/checkout', {
        professionalId,
        scheduledAt: selectedSlot,
        notes: 'Solicitud desde perfil profesional (tarjeta).',
        pricingSnapshot: {
          total: pricing.total,
          currency: pricing.currency,
        },
      });

      if (!checkout?.checkoutUrl) {
        throw new Error('No fue posible iniciar el pago con tarjeta.');
      }

      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setIsLoading(false);
    }
  };

  const canSubmitTransfer = Boolean(transferReference.trim()) && Boolean(transferProofFile || transferProofUrl);

  return (
    <div className="card glass-card profile-booking-card" style={{ padding: '1.25rem', width: '100%', minWidth: 0 }}>
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
              El profesional no tiene horarios disponibles este dia.
            </p>
          ) : slotsForSelectedDate.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem', textAlign: 'center' }}>
              No hay horarios disponibles para este dia.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Horarios Disponibles
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: '0.5rem', marginBottom: '1rem', width: '100%' }}>
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

      {selectedSlot && (
        <div className="transfer-proof-card" style={{ marginBottom: '1rem', padding: '0.875rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-container-lowest)' }}>
          {pricingLoading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Cargando costos...</p>
          ) : pricing ? (
            <div style={{ marginBottom: '0.75rem', padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', fontWeight: 700 }}>Resumen de pago</p>
              <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                <p><strong>Servicio:</strong> ${Number(pricing.basePrice).toLocaleString('es-MX')} {pricing.currency}</p>
                <p><strong>Comision plataforma (10%):</strong> ${Number(pricing.commission).toLocaleString('es-MX')} {pricing.currency}</p>
                <p style={{ fontWeight: 800, color: 'var(--primary)' }}><strong>Total:</strong> ${Number(pricing.total).toLocaleString('es-MX')} {pricing.currency}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  Garantía de asistencia: {pricing?.paymentGuarantee?.requiredPercent || 100}% pagado al agendar.
                </p>
              </div>
            </div>
          ) : null}

          <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Metodo de pago</p>
          <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr', marginBottom: '0.75rem' }}>
            <button
              type="button"
              className={`btn ${paymentMethod === 'BANK_TRANSFER' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('BANK_TRANSFER')}
              disabled={isLoading}
              style={{ justifyContent: 'center' }}
            >
              Transferencia
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'STRIPE_CARD' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPaymentMethod('STRIPE_CARD')}
              disabled={isLoading}
              style={{ justifyContent: 'center' }}
            >
              Tarjeta
            </button>
          </div>

          {paymentMethod === 'BANK_TRANSFER' ? (
            <>
              <input className="input-field" placeholder="Referencia de transferencia" value={transferReference} onChange={(e) => setTransferReference(e.target.value)} style={{ marginBottom: '0.5rem' }} />
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setTransferProofFile(e.target.files?.[0] || null)} style={{ marginBottom: '0.5rem', width: '100%' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>Sube foto del comprobante (PNG/JPG/WEBP). Este archivo es obligatorio.</p>
              {transferProofFile && <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Archivo listo: {transferProofFile.name}</p>}
              <button
                onClick={handleTransferBooking}
                disabled={!canSubmitTransfer || isLoading || pricingLoading || transferProofUploading}
                className="btn btn-primary profile-booking-submit"
                style={{ width: '100%', justifyContent: 'center', opacity: canSubmitTransfer && !isLoading ? 1 : 0.5 }}
              >
                {isLoading || transferProofUploading ? 'Procesando...' : isAuthenticated ? 'Enviar comprobante y solicitar cita' : 'Inicia sesion para agendar'}
              </button>
            </>
          ) : (
            <button
              onClick={handleCardCheckout}
              disabled={isLoading || pricingLoading}
              className="btn btn-primary profile-booking-submit"
              style={{ width: '100%', justifyContent: 'center', opacity: !isLoading ? 1 : 0.6 }}
            >
              {isLoading ? 'Redirigiendo a pago...' : isAuthenticated ? 'Pagar y confirmar (tarjeta)' : 'Inicia sesion para pagar'}
            </button>
          )}
        </div>
      )}

      {message && (
        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: message.type === 'success' ? '#10b981' : '#ef4444', fontSize: '0.8125rem', marginBottom: '1rem', textAlign: 'center' }}>
          {message.text}
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '0.75rem', lineHeight: 1.35, whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%' }}>
        La cita se confirma solo al pago exitoso.
      </p>
    </div>
  );
}
