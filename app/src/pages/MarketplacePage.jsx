import React from 'react';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function MarketplacePage() {
  const demoProducts = [
    { id: 1, name: 'Kit de Herramientas Pro', price: '$1,890 MXN', tag: 'Hogar', stock: 'Disponible' },
    { id: 2, name: 'Agenda Terapéutica 2026', price: '$420 MXN', tag: 'Salud', stock: 'Disponible' },
    { id: 3, name: 'Plantilla Legal Express', price: '$790 MXN', tag: 'Legal', stock: 'Últimas piezas' },
    { id: 4, name: 'Pack Branding Freelancer', price: '$1,250 MXN', tag: 'Digital', stock: 'Disponible' },
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
            Explora productos recomendados por profesionales. Compra rápida y clara.
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
