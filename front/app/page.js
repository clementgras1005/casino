'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';

const GAMES = [
  { icon: '🎡', name: 'Roulette', desc: 'Rouge, noir ou NationsGlory — la roue tourne toutes les 15 secondes', href: '/roulette', soon: false },
  { icon: '♠', name: 'Blackjack', desc: 'Battez le croupier sans dépasser 21', soon: true },
  { icon: '🎰', name: 'Machine à sous', desc: 'Tentez votre chance sur les rouleaux', soon: true },
  { icon: '♦', name: 'Poker', desc: 'La stratégie avant tout', soon: true },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <Header />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: 'var(--gold)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '3px', margin: '0 0 0.5rem' }}>
            Bienvenue
          </h2>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>
            Choisissez votre jeu
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {GAMES.map(game => (
            <div
              key={game.name}
              onClick={() => !game.soon && router.push(game.href)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: `1px solid ${game.soon ? 'var(--border)' : 'var(--gold)'}`,
                borderRadius: '8px',
                padding: '2rem',
                position: 'relative',
                opacity: game.soon ? 0.5 : 1,
                cursor: game.soon ? 'default' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={e => { if (!game.soon) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
              onMouseLeave={e => { if (!game.soon) e.currentTarget.style.backgroundColor = 'var(--bg-card)'; }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{game.icon}</div>
              <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.4rem', fontSize: '1.1rem' }}>{game.name}</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem', lineHeight: '1.5' }}>{game.desc}</p>
              {game.soon && (
                <span style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                  color: 'var(--text-subtle)', fontSize: '0.65rem', letterSpacing: '1px',
                  textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '3px',
                }}>Bientôt</span>
              )}
              {!game.soon && (
                <span style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid var(--gold)',
                  color: 'var(--gold)', fontSize: '0.65rem', letterSpacing: '1px',
                  textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '3px',
                }}>En ligne</span>
              )}
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
