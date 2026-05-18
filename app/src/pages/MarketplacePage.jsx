import React from 'react';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function MarketplacePage() {
  const demoProducts = [
    { id: 1, name: 'Diario de bienestar', price: '$390 MXN', tag: 'Bienestar', stock: 'Disponible' },
    { id: 2, name: 'Agenda terapeutica 2026', price: '$420 MXN', tag: 'Salud', stock: 'Disponible' },
    { id: 3, name: 'Guia de preparacion medica', price: '$290 MXN', tag: 'Medicina', stock: 'Disponible' },
    { id: 4, name: 'Plan de seguimiento psicologico', price: '$520 MXN', tag: 'Psicologia', stock: 'Disponible' },
  ];

  return (
    <>
      <NavbarIntecnia activePage="marketplace" />
      <main className="container" style={{ padding: '2rem 1rem 3rem' }}>
        <section className="card glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>
            Marketplace
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
            Explora productos recomendados por profesionales. Compra rÃ¡rapida y clara.
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {demoProducts.map((p) => (
            <article key={p.id} className="card glass-card" style={{ padding: '1rem' }}>
              <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 700, marginBottom: '0.25rem' }}>{p.tag}</p>
              <h2 style={{ fontFamily: 'Manrope', fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.35rem' }}>{p.name}</h2>
              <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>{p.price}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>{p.stock}</p>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Ver producto</button>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
