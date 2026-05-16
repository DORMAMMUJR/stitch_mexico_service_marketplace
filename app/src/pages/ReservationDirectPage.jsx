import React from 'react';
import { useParams } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { AvailabilitySelector } from '../components/AvailabilitySelector';
import { useProfile } from '../hooks/useProfile';

export function ReservationDirectPage() {
  const { id } = useParams();
  const guestId = localStorage.getItem('guest_id') || undefined;
  const { data: profile, isLoading, error } = useProfile(id, guestId);

  return (
    <>
      <NavbarIntecnia activePage="directory" />
      <div className="container pb-32 max-md:pb-36" style={{ paddingTop: '1.5rem', paddingBottom: '8rem' }}>
        {isLoading && (
          <div className="card glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            Cargando especialista...
          </div>
        )}

        {!isLoading && (error || !profile) && (
          <div className="card glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            No encontramos este especialista.
          </div>
        )}

        {!isLoading && profile && (
          <div style={{ width: '100%', maxWidth: 'min(980px, 100%)', margin: '0 auto' }}>
            <div className="card glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <h1 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                Reserva con {profile.name}
              </h1>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                Selecciona horario y completa el pago por transferencia o tarjeta. La cita se confirma al pago exitoso.
              </p>
            </div>
            <AvailabilitySelector professionalId={id} />
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

