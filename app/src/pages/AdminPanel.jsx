import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function AdminPanel() {
  const [pendingDocs, setPendingDocs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocs = fetch('/api/admin/verifications/pending', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      if (res.status === 401 || res.status === 403) {
        navigate('/');
        throw new Error('No autorizado');
      }
      return res.json();
    });

    const fetchDisputes = fetch('/api/orders/admin/disputes', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.ok ? res.json() : []);

    Promise.all([fetchDocs, fetchDisputes])
    .then(([docsData, disputesData]) => {
      setPendingDocs(docsData);
      setDisputes(disputesData);
      setLoading(false);
    })
    .catch(console.error);
  }, [navigate]);

  const handleApprove = async (docId) => {
    const res = await fetch(`/api/admin/verifications/${docId}/approve`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ adminId: 'current-admin' })
    });

    if (res.ok) {
      setPendingDocs(prev => prev.filter(d => d.id !== docId));
      alert('¡Documento aprobado y profesional verificado!');
    } else {
      alert('Error al aprobar el documento.');
    }
  };

  const handleResolveDispute = async (orderId, resolution) => {
    if (!window.confirm(`¿Estás seguro de resolver esta disputa con: ${resolution}?`)) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/resolve`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ resolution })
      });

      if (res.ok) {
        setDisputes(prev => prev.filter(d => d.id !== orderId));
        alert('Disputa resuelta exitosamente.');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al resolver la disputa.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  return (
    <>
      <NavbarIntecnia />
      <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '60vh' }}>
        <h1 style={{ fontFamily: 'Manrope', color: 'var(--primary)', marginBottom: '2rem', fontSize: '2rem', fontWeight: 700 }}>Panel de Control: Verificaciones</h1>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '1rem' }}>progress_activity</span>
            Cargando documentos pendientes...
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead style={{ background: 'var(--surface-container-low)' }}>
                  <tr>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profesional</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo Doc</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Archivo</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDocs.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--surface-container)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{doc.professional?.user?.name || 'Usuario'}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{doc.professional?.user?.email || doc.professionalId}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ background: 'var(--surface-container-high)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                          {doc.type === 'SAT_CONSTANCIA' ? 'Constancia SAT' : doc.type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', gap: '0.25rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span> Ver PDF
                        </a>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                        <button onClick={() => handleApprove(doc.id)} className="btn btn-primary" style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem', display: 'inline-flex', gap: '0.25rem', margin: '0 auto' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Aprobar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingDocs.length === 0 && !loading && (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--surface-container-highest)', display: 'block', marginBottom: '1rem' }}>task</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>Todo al día</p>
                <p style={{ fontSize: '0.875rem' }}>No hay documentos pendientes de revisión.</p>
              </div>
            )}
          </div>
        )}

        {/* Sección de Disputas */}
        <h2 style={{ fontFamily: 'Manrope', color: 'var(--primary)', marginBottom: '1.5rem', marginTop: '4rem', fontSize: '1.5rem', fontWeight: 700 }}>Disputas Activas</h2>
        
        {!loading && disputes.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--surface-container-highest)', display: 'block', marginBottom: '1rem' }}>gavel</span>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>Sin Disputas</p>
            <p style={{ fontSize: '0.875rem' }}>No hay órdenes en estado de disputa actualmente.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {disputes.map(dispute => (
              <div key={dispute.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--error)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                      Orden #{dispute.id.slice(0, 8).toUpperCase()} - ${dispute.agreedPrice} {dispute.currency}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                      <strong>Cliente:</strong> {dispute.client?.name} ({dispute.client?.email})
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
                      <strong>Profesional:</strong> {dispute.professional?.user?.name} ({dispute.professional?.user?.email})
                    </p>
                    <div style={{ background: 'var(--surface-container-lowest)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Motivo de la disputa:</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{dispute.disputeReason || 'No especificado'}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
                    <button 
                      onClick={() => handleResolveDispute(dispute.id, 'FAVOR_CLIENT')}
                      className="btn btn-outline" style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.8125rem', width: '100%', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>undo</span>
                      Reembolsar a Cliente
                    </button>
                    <button 
                      onClick={() => handleResolveDispute(dispute.id, 'FAVOR_PROFESSIONAL')}
                      className="btn btn-primary" style={{ fontSize: '0.8125rem', width: '100%', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>
                      Pagar a Profesional
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
