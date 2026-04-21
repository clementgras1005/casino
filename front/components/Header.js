'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function Modal({ title, subtitle, warning, confirmLabel, confirmColor = 'var(--gold)', confirmTextColor = '#0a0a0f', onClose, onConfirm, submitting, amount, setAmount, error, success }) {
  return (
    <div onClick={() => !submitting && onClose()} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, padding: '1rem',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '2rem', width: '100%', maxWidth: 420,
      }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0.3rem' }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 1.2rem' }}>{subtitle}</p>}

        {warning && (
          <div style={{
            backgroundColor: 'rgba(224,156,85,0.08)', border: '1px solid rgba(224,156,85,0.3)',
            borderRadius: 6, padding: '0.7rem 0.9rem', marginBottom: '1.2rem',
            color: '#e09c55', fontSize: '0.78rem', lineHeight: 1.5,
          }}>{warning}</div>
        )}

        <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
          Montant ($)
        </label>
        <input
          type="number" min={1} value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm()}
          placeholder="Ex : 1000"
          style={{
            width: '100%', padding: '0.65rem 0.9rem', borderRadius: 4, boxSizing: 'border-box',
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', marginBottom: '1rem',
          }}
        />

        {error   && <div style={{ padding: '0.55rem 0.8rem', borderRadius: 4, marginBottom: '0.8rem', backgroundColor: 'rgba(224,85,85,0.1)',   border: '1px solid rgba(224,85,85,0.3)',  color: 'var(--error)', fontSize: '0.82rem' }}>{error}</div>}
        {success && <div style={{ padding: '0.55rem 0.8rem', borderRadius: 4, marginBottom: '0.8rem', backgroundColor: 'rgba(76,175,85,0.08)',  border: '1px solid rgba(76,175,85,0.3)', color: '#4caf85',      fontSize: '0.82rem' }}>{success}</div>}

        <div style={{ display: 'flex', gap: '0.7rem' }}>
          <button onClick={onClose} disabled={submitting} style={{
            flex: 1, padding: '0.75rem', borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
          }}>Annuler</button>
          <button onClick={onConfirm} disabled={submitting || !amount} style={{
            flex: 2, padding: '0.75rem', borderRadius: 6, border: 'none',
            backgroundColor: submitting || !amount ? 'var(--bg-surface)' : confirmColor,
            color: submitting || !amount ? 'var(--text-muted)' : confirmTextColor,
            cursor: submitting || !amount ? 'not-allowed' : 'pointer',
            fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            {submitting ? 'Envoi…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const { user, logout, updateBalance } = useAuth();
  const router = useRouter();
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [modal,          setModal]          = useState(null); // 'withdrawal' | 'deposit' | null
  const [amount,         setAmount]         = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openModal = (type) => {
    setDropdownOpen(false);
    setAmount('');
    setError('');
    setSuccess('');
    setModal(type);
  };

  const closeModal = () => { if (!submitting) setModal(null); };

  const resetMessages = () => { setError(''); setSuccess(''); };

  const submitWithdrawal = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return setError('Montant invalide.');
    if (parsed > parseFloat(user.balance)) return setError('Solde insuffisant.');
    setSubmitting(true); resetMessages();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Erreur serveur.');
      updateBalance(data.balance);
      setSuccess(`Demande de retrait de ${parsed.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ soumise.`);
      setAmount('');
    } catch { setError('Serveur inaccessible.'); }
    finally { setSubmitting(false); }
  };

  const submitDeposit = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return setError('Montant invalide.');
    setSubmitting(true); resetMessages();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Erreur serveur.');
      setSuccess(`Demande de dépôt de ${parsed.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ envoyée. En attente de validation.`);
      setAmount('');
    } catch { setError('Serveur inaccessible.'); }
    finally { setSubmitting(false); }
  };

  if (!user) return null;

  return (
    <>
      <header style={{
        backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        padding: '0 2rem', height: '64px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ color: 'var(--gold)', fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
          ♠ Casino
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>

            {/* Pseudo + dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => !user.isAdmin && setDropdownOpen(o => !o)} style={{
                background: 'none', border: 'none', cursor: user.isAdmin ? 'default' : 'pointer',
                textAlign: 'right', padding: 0,
              }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                  {user.isAdmin ? 'Administrateur' : 'Joueur'}
                </p>
                <p style={{
                  color: dropdownOpen ? 'var(--gold)' : 'var(--text-primary)',
                  fontWeight: 'bold', margin: 0, fontSize: '0.95rem', transition: 'color 0.15s',
                  textDecoration: user.isAdmin ? 'none' : 'underline dotted', textUnderlineOffset: 3,
                }}>{user.pseudo}</p>
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 6, minWidth: 190, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 200,
                  overflow: 'hidden',
                }}>
                  {[
                    { icon: '💰', label: 'Déposer de l\'argent', action: () => openModal('deposit') },
                    { icon: '💸', label: 'Retirer de l\'argent',  action: () => openModal('withdrawal') },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none',
                      color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                      fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--border)' }} />

            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Solde</p>
              <p style={{ color: 'var(--gold)', fontWeight: 'bold', margin: 0, fontSize: '0.95rem' }}>
                {Number(user.balance).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </p>
            </div>
          </div>

          <button onClick={() => router.push('/aide')} style={{
            backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
            padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer',
            fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >Aide</button>

          {user.isAdmin && (
            <button onClick={() => router.push('/admin')} style={{
              backgroundColor: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)',
              padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase',
            }}>Admin</button>
          )}

          <button onClick={() => { logout(); router.push('/auth'); }} style={{
            backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
            padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer',
            fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >Déconnexion</button>
        </div>
      </header>

      {/* Modal dépôt */}
      {modal === 'deposit' && (
        <Modal
          title="Demande de dépôt"
          subtitle="Votre solde sera crédité après validation par un administrateur."
          warning="⏳ Le dépôt n'est pas immédiat. Il sera traité manuellement."
          confirmLabel="Envoyer la demande"
          confirmColor="#4caf85"
          confirmTextColor="#fff"
          onClose={closeModal}
          onConfirm={submitDeposit}
          submitting={submitting}
          amount={amount}
          setAmount={(v) => { setAmount(v); resetMessages(); }}
          error={error}
          success={success}
        />
      )}

      {/* Modal retrait */}
      {modal === 'withdrawal' && (
        <Modal
          title="Demande de retrait"
          subtitle={`Solde disponible : ${Number(user.balance).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $`}
          warning="⚠️ Le montant est débité immédiatement. La demande ne peut pas être annulée."
          confirmLabel="Confirmer le retrait"
          onClose={closeModal}
          onConfirm={submitWithdrawal}
          submitting={submitting}
          amount={amount}
          setAmount={(v) => { setAmount(v); resetMessages(); }}
          error={error}
          success={success}
        />
      )}
    </>
  );
}
