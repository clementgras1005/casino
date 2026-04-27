'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/AdminGuard';
import Header from '@/components/Header';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function AdminPage() {
  const router = useRouter();

  const [users,       setUsers]       = useState([]);
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState('balance');
  const [order,       setOrder]       = useState('DESC');
  const [usersLoading, setUsersLoading] = useState(false);

  const [withdrawals, setWithdrawals] = useState([]);
  const [wLoading,    setWLoading]    = useState(false);
  const [validating,  setValidating]  = useState(null);
  const [refusing,    setRefusing]    = useState(null);

  const [deposits,    setDeposits]    = useState([]);
  const [dLoading,    setDLoading]    = useState(false);
  const [validatingD, setValidatingD] = useState(null);
  const [refusingD,   setRefusingD]   = useState(null);

  const [stats,       setStats]       = useState(null);
  const [showStats,   setShowStats]   = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ search, sort, order });
      const res  = await fetch(`${API}/admin/users?${params}`, { headers: authHeaders() });
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setUsersLoading(false);
    }
  }, [search, sort, order]);

  const fetchWithdrawals = useCallback(async () => {
    setWLoading(true);
    try {
      const res  = await fetch(`${API}/admin/withdrawals`, { headers: authHeaders() });
      const data = await res.json();
      setWithdrawals(data.withdrawals || []);
    } finally {
      setWLoading(false);
    }
  }, []);

  const fetchDeposits = useCallback(async () => {
    setDLoading(true);
    try {
      const res  = await fetch(`${API}/admin/deposits`, { headers: authHeaders() });
      const data = await res.json();
      setDeposits(data.deposits || []);
    } finally {
      setDLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
      const data = await res.json();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); },       [fetchUsers]);
  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);
  useEffect(() => { fetchDeposits(); },    [fetchDeposits]);
  useEffect(() => { fetchStats(); },       [fetchStats]);

  const toggleOrder = (field) => {
    if (sort === field) setOrder(o => o === 'DESC' ? 'ASC' : 'DESC');
    else { setSort(field); setOrder('DESC'); }
  };

  const validate = async (id) => {
    setValidating(id);
    try {
      const res = await fetch(`${API}/admin/withdrawals/${id}/validate`, { method: 'PATCH', headers: authHeaders() });
      if (res.ok) setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'processed' } : w));
    } finally { setValidating(null); }
  };

  const refuse = async (id) => {
    setRefusing(id);
    try {
      const res = await fetch(`${API}/admin/withdrawals/${id}/refuse`, { method: 'PATCH', headers: authHeaders() });
      if (res.ok) setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'refused' } : w));
    } finally { setRefusing(null); }
  };

  const validateDep = async (id) => {
    setValidatingD(id);
    try {
      const res = await fetch(`${API}/admin/deposits/${id}/validate`, { method: 'PATCH', headers: authHeaders() });
      if (res.ok) setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'processed' } : d));
    } finally { setValidatingD(null); }
  };

  const refuseDep = async (id) => {
    setRefusingD(id);
    try {
      const res = await fetch(`${API}/admin/deposits/${id}/refuse`, { method: 'PATCH', headers: authHeaders() });
      if (res.ok) setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'refused' } : d));
    } finally { setRefusingD(null); }
  };

  const SortIcon = ({ field }) => {
    if (sort !== field) return <span style={{ color: 'var(--text-subtle)', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: 'var(--gold)', marginLeft: 4 }}>{order === 'DESC' ? '↓' : '↑'}</span>;
  };

  const totalBalance      = users.reduce((s, u) => s + parseFloat(u.balance), 0);
  const pendingList       = withdrawals.filter(w => w.status === 'pending');
  const closedWithdrawals = withdrawals.filter(w => w.status !== 'pending');
  const pendingDeposits   = deposits.filter(d => d.status === 'pending');
  const closedDeposits    = deposits.filter(d => d.status !== 'pending');

  return (
    <AdminGuard>
      <Header />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

        {/* Titre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase',
            padding: '0.3rem 0.8rem', borderRadius: 4,
          }}>← Lobby</button>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Administration
          </h1>
        </div>

        {/* Stats joueurs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Joueurs', value: users.length },
            { label: 'Solde total en jeu', value: `${totalBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $` },
            { label: 'Retraits en attente', value: pendingList.length },
          ].map(s => (
            <div key={s.label} style={{
              backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '1rem 1.2rem',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.3rem' }}>{s.label}</p>
              <p style={{ color: 'var(--gold)', fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Bénéfice casino */}
        {stats && (
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.2rem', marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showStats ? '1rem' : 0 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Finances casino</p>
              <button onClick={() => setShowStats(s => !s)} style={{
                background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.72rem', padding: '0.2rem 0.7rem', borderRadius: 4,
                letterSpacing: '0.5px',
              }}>{showStats ? 'Masquer' : 'Afficher'}</button>
            </div>
            {showStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.3rem' }}>Dépôts validés</p>
                  <p style={{ color: '#4caf85', fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>+{stats.totalDeposits.toLocaleString('fr-FR')} $</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.3rem' }}>Retraits validés</p>
                  <p style={{ color: '#e05555', fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>-{stats.totalWithdrawals.toLocaleString('fr-FR')} $</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.3rem' }}>Bénéfice net</p>
                  <p style={{ color: stats.profit >= 0 ? 'var(--gold)' : '#e05555', fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>
                    {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString('fr-FR')} $
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Retraits en attente ── */}
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.8rem', letterSpacing: '0.5px' }}>
          Demandes de retrait en attente
          {pendingList.length > 0 && (
            <span style={{
              marginLeft: 10, padding: '0.15rem 0.55rem', borderRadius: 12,
              backgroundColor: 'rgba(224,156,85,0.15)', border: '1px solid rgba(224,156,85,0.4)',
              color: '#e09c55', fontSize: '0.72rem', fontWeight: 'bold',
            }}>{pendingList.length}</span>
          )}
        </h2>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1.5rem' }}>
          {wLoading ? (
            <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Chargement…</p>
          ) : pendingList.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Aucune demande en attente.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Joueur', 'Montant', 'Date', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingList.map((w, i) => (
                  <tr key={w.id} style={{ borderBottom: i < pendingList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{w.pseudo}</td>
                    <td style={{ padding: '0.85rem 1.2rem', color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(w.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
                    </td>
                    <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(w.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.85rem 1.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => validate(w.id)} disabled={validating === w.id || refusing === w.id} style={{
                          padding: '0.4rem 0.8rem', borderRadius: 4, border: 'none',
                          backgroundColor: validating === w.id ? 'var(--bg-surface)' : '#4caf85',
                          color: validating === w.id ? 'var(--text-muted)' : '#fff',
                          cursor: validating === w.id ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.78rem',
                        }}>
                          {validating === w.id ? '…' : '✓ Valider'}
                        </button>
                        <button onClick={() => refuse(w.id)} disabled={refusing === w.id || validating === w.id} style={{
                          padding: '0.4rem 0.8rem', borderRadius: 4, border: '1px solid rgba(224,85,85,0.5)',
                          backgroundColor: 'transparent',
                          color: refusing === w.id ? 'var(--text-muted)' : 'var(--error)',
                          cursor: refusing === w.id ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.78rem',
                        }}>
                          {refusing === w.id ? '…' : '✕ Refuser'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Retraits traités/refusés ── */}
        {closedWithdrawals.length > 0 && (
          <>
            <h2 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.8rem', letterSpacing: '0.5px' }}>
              Retraits clôturés ({closedWithdrawals.length})
            </h2>
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {closedWithdrawals.map((w, i) => (
                    <tr key={w.id} style={{ borderBottom: i < closedWithdrawals.length - 1 ? '1px solid var(--border)' : 'none', opacity: 0.7 }}>
                      <td style={{ padding: '0.7rem 1.2rem', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 'bold' }}>{w.pseudo}</td>
                      <td style={{ padding: '0.7rem 1.2rem', color: 'var(--gold)', fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                        {Number(w.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
                      </td>
                      <td style={{ padding: '0.7rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(w.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.7rem 1.2rem' }}>
                        {w.status === 'processed'
                          ? <span style={{ padding: '0.2rem 0.6rem', borderRadius: 4, backgroundColor: 'rgba(76,175,85,0.1)', border: '1px solid rgba(76,175,85,0.3)', color: '#4caf85', fontSize: '0.72rem', fontWeight: 'bold' }}>Traité</span>
                          : <span style={{ padding: '0.2rem 0.6rem', borderRadius: 4, backgroundColor: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', color: 'var(--error)', fontSize: '0.72rem', fontWeight: 'bold' }}>Refusé</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Dépôts en attente ── */}
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.8rem', letterSpacing: '0.5px' }}>
          Demandes de dépôt en attente
          {pendingDeposits.length > 0 && (
            <span style={{
              marginLeft: 10, padding: '0.15rem 0.55rem', borderRadius: 12,
              backgroundColor: 'rgba(76,175,85,0.15)', border: '1px solid rgba(76,175,85,0.4)',
              color: '#4caf85', fontSize: '0.72rem', fontWeight: 'bold',
            }}>{pendingDeposits.length}</span>
          )}
        </h2>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1.5rem' }}>
          {dLoading ? (
            <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Chargement…</p>
          ) : pendingDeposits.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Aucune demande en attente.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Joueur', 'Montant', 'Date', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.2rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingDeposits.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: i < pendingDeposits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{d.pseudo}</td>
                    <td style={{ padding: '0.85rem 1.2rem', color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(d.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
                    </td>
                    <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.85rem 1.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => validateDep(d.id)} disabled={validatingD === d.id || refusingD === d.id} style={{
                          padding: '0.4rem 0.8rem', borderRadius: 4, border: 'none',
                          backgroundColor: validatingD === d.id ? 'var(--bg-surface)' : '#4caf85',
                          color: validatingD === d.id ? 'var(--text-muted)' : '#fff',
                          cursor: validatingD === d.id ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.78rem',
                        }}>
                          {validatingD === d.id ? '…' : '✓ Valider'}
                        </button>
                        <button onClick={() => refuseDep(d.id)} disabled={refusingD === d.id || validatingD === d.id} style={{
                          padding: '0.4rem 0.8rem', borderRadius: 4, border: '1px solid rgba(224,85,85,0.5)',
                          backgroundColor: 'transparent',
                          color: refusingD === d.id ? 'var(--text-muted)' : 'var(--error)',
                          cursor: refusingD === d.id ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '0.78rem',
                        }}>
                          {refusingD === d.id ? '…' : '✕ Refuser'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Dépôts traités/refusés ── */}
        {closedDeposits.length > 0 && (
          <>
            <h2 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.8rem', letterSpacing: '0.5px' }}>
              Dépôts clôturés ({closedDeposits.length})
            </h2>
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {closedDeposits.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: i < closedDeposits.length - 1 ? '1px solid var(--border)' : 'none', opacity: 0.7 }}>
                      <td style={{ padding: '0.7rem 1.2rem', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 'bold' }}>{d.pseudo}</td>
                      <td style={{ padding: '0.7rem 1.2rem', color: 'var(--gold)', fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                        {Number(d.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
                      </td>
                      <td style={{ padding: '0.7rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.7rem 1.2rem' }}>
                        {d.status === 'processed'
                          ? <span style={{ padding: '0.2rem 0.6rem', borderRadius: 4, backgroundColor: 'rgba(76,175,85,0.1)', border: '1px solid rgba(76,175,85,0.3)', color: '#4caf85', fontSize: '0.72rem', fontWeight: 'bold' }}>Traité</span>
                          : <span style={{ padding: '0.2rem 0.6rem', borderRadius: 4, backgroundColor: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', color: 'var(--error)', fontSize: '0.72rem', fontWeight: 'bold' }}>Refusé</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Joueurs ── */}
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.8rem', letterSpacing: '0.5px' }}>
          Joueurs
        </h2>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.2rem', marginBottom: '1rem' }}>
          <input
            type="text" placeholder="Rechercher par pseudo…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.6rem 0.9rem', borderRadius: 4, boxSizing: 'border-box',
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
            }}
          />
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  { field: 'pseudo',    label: 'Pseudo' },
                  { field: 'balance',   label: 'Solde' },
                  { field: 'createdAt', label: 'Inscription' },
                ].map(col => (
                  <th key={col.field} onClick={() => toggleOrder(col.field)} style={{
                    padding: '0.85rem 1.2rem', textAlign: 'left',
                    color: sort === col.field ? 'var(--gold)' : 'var(--text-muted)',
                    fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px',
                    cursor: 'pointer', userSelect: 'none', fontWeight: 'bold',
                  }}>
                    {col.label}<SortIcon field={col.field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chargement…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun joueur trouvé.</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} style={{
                  borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}>
                  <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{u.pseudo}</td>
                  <td style={{ padding: '0.85rem 1.2rem', color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                    {Number(u.balance).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
                  </td>
                  <td style={{ padding: '0.85rem 1.2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </AdminGuard>
  );
}
