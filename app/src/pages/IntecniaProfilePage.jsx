import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { ChatWidget } from '../components/ChatWidget';
import { AvailabilitySelector } from '../components/AvailabilitySelector';
import { useProfile } from '../hooks/useProfile';
import { useReviews } from '../hooks/useReviews';
import { useAuth } from '../hooks/useAuth';

export function IntecniaProfilePage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const chatRef = useRef(null);
  const profileRef = useRef(null);
  const bookingRef = useRef(null);

  const guestId = localStorage.getItem('guest_id') || undefined;
  const { data: profile, isLoading, error } = useProfile(id, user?.id, guestId);
  const { data: dbReviews } = useReviews(id);

  const [bookingBanner, setBookingBanner] = useState('');

  useEffect(() => {
    if (!bookingBanner) return;
    const t = setTimeout(() => setBookingBanner(''), 4200);
    return () => clearTimeout(t);
  }, [bookingBanner]);

  const reviews = useMemo(() => {
    if (!Array.isArray(dbReviews) || dbReviews.length === 0) return [];
    return dbReviews.map((r) => ({
      name: r.name,
      date: new Date(r.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }),
      rating: r.rating,
      comment: r.comment,
    }));
  }, [dbReviews]);

  const protectPrivateAction = (e) => {
    if (isAuthenticated) return;
    e.stopPropagation();
    e.preventDefault();
    sessionStorage.setItem('redirectTo', `${window.location.pathname}${window.location.search}${window.location.hash}`);
    navigate('/login');
  };

  const scrollToChat = () => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToProfile = () => profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToBooking = () => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (isLoading) {
    return (
      <>
        <NavbarIntecnia />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', display: 'block', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p style={{ color: 'var(--on-surface-variant)', fontFamily: 'Manrope', fontWeight: 600 }}>Cargando perfil profesional...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <NavbarIntecnia />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '460px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '42px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>person_off</span>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>Perfil no disponible</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '1rem' }}>No encontramos este perfil o no está público en este momento.</p>
            <a href="/directory" className="btn btn-primary">Volver al directorio</a>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const prof = profile;

  return (
    <>
      <NavbarIntecnia activePage="directory" />

      {bookingBanner && (
        <div style={{ position: 'fixed', top: '5.25rem', right: '1rem', zIndex: 1200, maxWidth: 'min(420px, calc(100vw - 2rem))' }}>
          <div className="card glass-card" style={{ padding: '0.875rem 1rem', borderColor: 'rgba(16,185,129,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--secondary)', fontSize: '20px' }}>check_circle</span>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', fontWeight: 600 }}>{bookingBanner}</p>
            </div>
          </div>
        </div>
      )}

      <div className="container layout-profile profile-pro-grid pb-32 max-md:pb-36" style={{ paddingTop: '1.5rem', paddingBottom: '8rem' }}>
        <div className="profile-mobile-quicknav">
          <button type="button" className="btn btn-outline profile-mobile-quicknav-btn" onClick={scrollToProfile}>Perfil</button>
          <button type="button" className="btn btn-outline profile-mobile-quicknav-btn" onClick={scrollToBooking}>Agenda</button>
          <button type="button" className="btn btn-primary profile-mobile-quicknav-btn" onClick={scrollToChat}>Chat</button>
        </div>

        <section ref={profileRef}>
          <article className="card glass-card profile-hero-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <img src={prof.avatarUrl} alt={prof.name} style={{ width: '7rem', height: '7rem', borderRadius: '1rem', objectFit: 'cover' }} />
                {prof.isVerified && (
                  <span style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '1.8rem', height: '1.8rem', borderRadius: '50%', background: 'var(--surface)', display: 'grid', placeItems: 'center', border: '2px solid rgba(16,185,129,0.35)' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified</span>
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: '250px' }}>
                <h1 style={{ fontFamily: 'Manrope', fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.15rem' }}>{prof.name}</h1>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.95rem', marginBottom: '0.45rem' }}>{prof.title || 'Especialista profesional'}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {prof.category && <span className="badge">{String(prof.category).replaceAll('_', ' ')}</span>}
                  {prof.isVerified && <span className="badge badge-green">Verificado</span>}
                  {prof.biometricDone && <span className="badge">Biometría</span>}
                  {prof.satVerifiedAt && <span className="badge">SAT</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <p style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '0.95rem' }}>
                    {prof.hourlyRate ? `Desde $${Number(prof.hourlyRate).toLocaleString('es-MX')} ${prof.currency || 'MXN'} / hora` : 'Tarifa por confirmar'}
                  </p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                    {prof.rating ? `⭐ ${prof.rating} (${prof.reviewCount || reviews.length} reseñas)` : 'Sin reseñas aún'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <button onClick={scrollToChat} className="btn btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>forum</span>
                    Hablar con asistente
                  </button>
                  {prof.meetLink && (
                    <a href={prof.meetLink} target="_blank" rel="noreferrer" className="btn btn-outline">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>videocam</span>
                      Link Meet
                    </a>
                  )}
                </div>
              </div>
            </div>
          </article>

          <article className="card glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Descripción profesional</h2>
            <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7, fontSize: '0.925rem' }}>
              {prof.bio || 'Este profesional aún no agregó una descripción detallada de sus servicios.'}
            </p>
          </article>

          <article className="card glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Reseñas</h2>
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>Aún no hay reseñas públicas para este perfil.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {reviews.slice(0, 6).map((r, idx) => (
                  <div key={`${r.name}-${idx}`} className="review-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{r.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{r.date}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '0.35rem' }}>
                      {Array.from({ length: Math.max(1, Number(r.rating || 0)) }).map((_, starIdx) => (
                        <span key={starIdx} className="material-symbols-outlined icon-filled" style={{ fontSize: '13px', color: '#f59e0b' }}>star</span>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <aside className="profile-side-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          <div className="profile-sticky-panel" style={{ display: 'grid', gap: '1rem', minWidth: 0 }}>
            <div ref={bookingRef} onClickCapture={protectPrivateAction}>
              <AvailabilitySelector
                professionalId={id}
                onBooked={(text) => setBookingBanner(text)}
              />
            </div>

            <div ref={chatRef} onClickCapture={protectPrivateAction}>
              <ChatWidget professionalName={prof.name} professionalId={prof.userId} />
            </div>
          </div>
        </aside>
      </div>

      <Footer />
    </>
  );
}


