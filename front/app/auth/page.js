'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const inputStyle = {
  width: '100%',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  padding: '0.7rem 1rem',
  color: 'var(--text-primary)',
  fontSize: '1rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  color: 'var(--text-muted)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '0.4rem',
};

export default function AuthPage() {
  const [mode,     setMode]     = useState('login');
  const [pseudo,   setPseudo]   = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setConfirm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirm) {
      return setError('Les mots de passe ne correspondent pas.');
    }

    setLoading(true);
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Une erreur est survenue.');
      login(data.token, data.user);
      router.push('/');
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem', letterSpacing: '4px' }}>
          ♠ ♥ ♦ ♣
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>
          Sofa Casino
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.85rem', letterSpacing: '1px' }}>
          NationsGlory casino
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '2.5rem', width: '100%', maxWidth: '420px',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '2rem', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
          {[['login', 'Connexion'], ['register', 'Inscription']].map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: '0.65rem', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s',
              backgroundColor: mode === m ? 'var(--gold)' : 'transparent',
              color: mode === m ? '#0a0a0f' : 'var(--text-muted)',
              fontWeight: mode === m ? 'bold' : 'normal',
            }}>{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Pseudo */}
          <div>
            <label style={labelStyle}>Pseudo NationsGlory</label>
            <input
              type="text" value={pseudo} onChange={e => setPseudo(e.target.value)}
              required autoComplete="username"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {mode === 'register' && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                ⚠️ Utilise exactement ton pseudo <strong style={{ color: 'var(--text-primary)' }}>NationsGlory</strong> (respecte les majuscules). Il sera utilisé pour les paiements in-game.
              </p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Confirmation mot de passe (inscription uniquement) */}
          {mode === 'register' && (
            <div>
              <label style={labelStyle}>Confirmer le mot de passe</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required autoComplete="new-password"
                style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password ? 'var(--error)' : 'var(--border)',
                }}
                onFocus={e => e.target.style.borderColor = confirm !== password ? 'var(--error)' : 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? 'var(--error)' : 'var(--border)'}
              />
              {confirm && confirm !== password && (
                <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>
          )}

          {error && (
            <p style={{
              color: 'var(--error)', fontSize: '0.85rem', margin: 0,
              padding: '0.6rem 0.8rem', backgroundColor: 'rgba(224,85,85,0.1)',
              borderRadius: '4px', border: '1px solid rgba(224,85,85,0.3)',
            }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: '0.5rem', padding: '0.8rem',
            backgroundColor: loading ? 'var(--gold-dark)' : 'var(--gold)',
            color: '#0a0a0f', border: 'none', borderRadius: '4px',
            fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '2px',
            textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} style={{
            background: 'none', border: 'none', color: 'var(--gold)',
            cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0,
          }}>
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </main>
  );
}
