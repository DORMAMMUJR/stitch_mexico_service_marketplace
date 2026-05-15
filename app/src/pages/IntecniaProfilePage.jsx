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
  const { data: dbReviews, refetch: refetchReviews } = useReviews(id);

  const [bookingBanner, setBookingBanner] = useState('');
  const [reviewEligibility, setReviewEligibility] = useState({ canReview: false, reasons: [], completedAppointmentsAvailable: [] });
  const [reviewEligibilityLoading, setReviewEligibilityLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ appointmentId: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    if (!bookingBanner) return;
    const t = setTimeout(() => setBookingBanner(''), 4200);
    return () => clearTimeout(t);
  }, [bookingBanner]);

  useEffect(() => {
    const shouldCheck = Boolean(id && isAuthenticated && user?.role === 'CLIENT');
    if (!shouldCheck) {
      setReviewEligibility({ canReview: false, reasons: [], completedAppointmentsAvailable: [] });
      setReviewForm((prev) => ({ ...prev, appointmentId: '' }));
      return;
    }

    let active = true;
    const fetchEligibility = async () => {
      setReviewEligibilityLoading(true);
      setReviewFeedback('');
      try {
        const res = await fetch(`/api/professionals/${id}/review-eligibility`, { credentials: 'include' });
        const data = await res.json().catch(() => ({ canReview: false, reasons: ['No se pudo validar elegibilidad'], completedAppointmentsAvailable: [] }));
        if (!active) return;
        const available = Array.isArray(data.completedAppointmentsAvailable) ? data.completedAppointmentsAvailable : [];
        setReviewEligibility({
          canReview: Boolean(data.canReview),
          reasons: Array.isArray(data.reasons) ? data.reasons : [],
          completedAppointmentsAvailable: available,
        });
        setReviewForm((prev) => ({
          ...prev,
          appointmentId: prev.appointmentId || available[0]?.id || '',
        }));
      } catch {
        if (!active) return;
        setReviewEligibility({ canReview: false, reasons: ['No se pudo validar elegibilidad'], completedAppointmentsAvailable: [] });
      } finally {
        if (active) setReviewEligibilityLoading(false);
      }
    };

    fetchEligibility();
    return () => {
      active = false;
    };
  }, [id, isAuthenticated, user?.role]);

  const reviews = useMemo(() => {
    if (!Array.isArray(dbReviews) || dbReviews.length === 0) return [];
    return dbReviews.map((r) => ({
      name: r.name,
      date: new Date(r.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }),
      rating: r.rating,
      comment: r.comment,
    }));
  }, [dbReviews]);
  const specialtyCards = useMemo(() => {
    if (!profile) return [];
    const cards = [];
    if (profile.category) {
      cards.push({
        title: 'Categoria principal',
        value: String(profile.category).replaceAll('_', ' '),
      });
    }
    if (profile.yearsExp) {
      cards.push({
        title: 'Experiencia',
        value: `${profile.yearsExp} anos activos`,
      });
    }
    if (profile.successRate) {
      cards.push({
        title: 'Tasa de exito',
        value: profile.successRate,
      });
    }
    if (profile.projectsCount) {
      cards.push({
        title: 'Proyectos completados',
        value: profile.projectsCount,
      });
    }
    return cards.length ? cards : [{ title: 'Especialidad', value: 'Atencion profesional personalizada' }];
  }, [profile]);
  const coverImage = useMemo(() => {
    if (!Array.isArray(profile?.portfolioItems) || profile.portfolioItems.length === 0) return '';
    return profile.portfolioItems[0]?.imageUrl || '';
  }, [profile]);

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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.appointmentId) {
      setReviewFeedback('Selecciona una cita completada para publicar la reseña.');
      return;
    }

    setSubmittingReview(true);
    setReviewFeedback('');
    try {
      const res = await fetch(`/api/professionals/${id}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: reviewForm.appointmentId,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviewFeedback(data.error || 'No se pudo publicar la reseña.');
        return;
      }

      setReviewFeedback('Reseña publicada correctamente.');
      setReviewForm({ appointmentId: '', rating: 5, comment: '' });
      await refetchReviews();
      const eligibilityRes = await fetch(`/api/professionals/${id}/review-eligibility`, { credentials: 'include' });
      const eligibilityData = await eligibilityRes.json().catch(() => null);
      if (eligibilityData) {
        const available = Array.isArray(eligibilityData.completedAppointmentsAvailable) ? eligibilityData.completedAppointmentsAvailable : [];
        setReviewEligibility({
          canReview: Boolean(eligibilityData.canReview),
          reasons: Array.isArray(eligibilityData.reasons) ? eligibilityData.reasons : [],
          completedAppointmentsAvailable: available,
        });
        setReviewForm((prev) => ({ ...prev, appointmentId: available[0]?.id || '' }));
      }
    } catch {
      setReviewFeedback('Error de red al publicar la reseña.');
    } finally {
      setSubmittingReview(false);
    }
  };

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

      <div className="container profile-page-shell">
        <div className="profile-mobile-quicknav">
          <button type="button" className="btn btn-outline profile-mobile-quicknav-btn" onClick={scrollToProfile}>Perfil</button>
          <button type="button" className="btn btn-outline profile-mobile-quicknav-btn" onClick={scrollToBooking}>Agenda</button>
          <button type="button" className="btn btn-primary profile-mobile-quicknav-btn" onClick={scrollToChat}>Chat</button>
        </div>

        <div className="layout-profile profile-pro-grid pb-32 max-md:pb-36">
          <section ref={profileRef} className="profile-main-col">
            <article className="card glass-card profile-hero-card">
              <div
                className="profile-cover-banner"
                style={coverImage ? { backgroundImage: `linear-gradient(120deg, rgba(10,14,21,0.45), rgba(10,14,21,0.12)), url(${coverImage})` } : undefined}
              />
              <div className="profile-hero-content">
                <div className="profile-avatar-float">
                  <img src={prof.avatarUrl} alt={prof.name} className="profile-avatar-image" />
                  {prof.isVerified && (
                    <span className="profile-avatar-badge">
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified</span>
                    </span>
                  )}
                </div>

                <div className="profile-identity">
                  <h1>{prof.name}</h1>
                  <p className="profile-identity-title">{prof.title || 'Especialista profesional'}</p>

                  <div className="profile-hero-badges">
                    {prof.category && <span className="badge">{String(prof.category).replaceAll('_', ' ')}</span>}
                    {prof.isVerified && <span className="badge badge-green">Verificado</span>}
                    {prof.biometricDone && <span className="badge">Biometria</span>}
                    {prof.satVerifiedAt && <span className="badge">SAT</span>}
                  </div>

                  <div className="profile-hero-meta">
                    <p className="profile-rate">
                      {prof.hourlyRate ? `Desde $${Number(prof.hourlyRate).toLocaleString('es-MX')} ${prof.currency || 'MXN'} / hora` : 'Tarifa por confirmar'}
                    </p>
                    <p className="profile-rating">
                      {prof.rating ? `⭐ ${prof.rating} (${prof.reviewCount || reviews.length} resenas)` : 'Sin resenas aun'}
                    </p>
                  </div>

                  <div className="profile-hero-actions">
                    <button onClick={scrollToChat} className="btn btn-primary profile-msg-btn">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>forum</span>
                      Mensaje
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <div className="profile-main-stack">
              <article className="card glass-card" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Bio</h2>
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7, fontSize: '0.925rem' }}>
                  {prof.bio || 'Este profesional aun no agrego una descripcion detallada de sus servicios.'}
                </p>
              </article>

              <article className="card glass-card" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.875rem' }}>Especialidades</h2>
                <div className="profile-specialties-grid">
                  {specialtyCards.map((card) => (
                    <div key={card.title} className="profile-specialty-card">
                      <p className="profile-specialty-label">{card.title}</p>
                      <p className="profile-specialty-value">{card.value}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card glass-card" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Reseñas</h2>
                {isAuthenticated && user?.role === 'CLIENT' && (
                  <div style={{ marginBottom: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', background: 'var(--surface-container-low)' }}>
                    {reviewEligibilityLoading ? (
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.825rem', margin: 0 }}>Validando elegibilidad para reseña...</p>
                    ) : reviewEligibility.canReview ? (
                      <form onSubmit={handleSubmitReview} style={{ display: 'grid', gap: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--secondary)', fontWeight: 700 }}>Reseña verificada por cita completada</p>
                        <select
                          className="input-field"
                          value={reviewForm.appointmentId}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, appointmentId: e.target.value }))}
                          required
                        >
                          <option value="">Selecciona la cita completada</option>
                          {reviewEligibility.completedAppointmentsAvailable.map((appt) => (
                            <option key={appt.id} value={appt.id}>
                              {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : appt.id}
                            </option>
                          ))}
                        </select>
                        <select
                          className="input-field"
                          value={reviewForm.rating}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                        >
                          {[5, 4, 3, 2, 1].map((value) => (
                            <option key={value} value={value}>
                              {value} estrella{value !== 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className="input-field"
                          rows={3}
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                          placeholder="Comparte tu experiencia"
                        />
                        <button type="submit" className="btn btn-primary" disabled={submittingReview} style={{ justifySelf: 'start' }}>
                          {submittingReview ? 'Publicando...' : 'Publicar reseña'}
                        </button>
                      </form>
                    ) : (
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.825rem', margin: 0 }}>
                        {reviewEligibility.reasons.length > 0 ? reviewEligibility.reasons.join(' · ') : 'Solo clientes con cita completada pueden reseñar.'}
                      </p>
                    )}
                    {reviewFeedback && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: reviewFeedback.toLowerCase().includes('correctamente') ? 'var(--secondary)' : '#f59e0b' }}>
                        {reviewFeedback}
                      </p>
                    )}
                  </div>
                )}
                {reviews.length === 0 ? (
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>Aun no hay resenas publicas para este perfil.</p>
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
            </div>
          </section>

          <aside className="profile-side-col">
            <div className="profile-sticky-panel">
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
      </div>

      <Footer />
    </>
  );
}


