'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';

function Section({ title, color = 'var(--gold)', children }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', marginBottom: '1.5rem',
    }}>
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
      }}>
        <h2 style={{ color, fontSize: '1rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  );
}

function Step({ number, text }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid var(--gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.8rem',
      }}>{number}</div>
      <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>{text}</p>
    </div>
  );
}

function Note({ children }) {
  return (
    <div style={{
      marginTop: '1.2rem', padding: '0.8rem 1rem', borderRadius: 6,
      backgroundColor: 'rgba(224,156,85,0.08)', border: '1px solid rgba(224,156,85,0.3)',
      color: '#e09c55', fontSize: '0.82rem', lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

export default function AidePage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <Header />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => router.back()} style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase',
            padding: '0.3rem 0.8rem', borderRadius: 4,
          }}>← Retour</button>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Aide
          </h1>
        </div>

        {/* Dépôt */}
        <Section title="💰 Comment faire un dépôt ?" color="#4caf85">
          <Step number="1" text="Clique sur ton pseudo en haut à droite du site." />
          <Step number="2" text={"Dans le menu qui s'affiche, clique sur \"Déposer de l'argent\"."} />
          <Step number="3" text="Entre le montant que tu souhaites déposer sur ton compte casino." />
          <Step number="4" text={`Effectue le paiement in-game NationsGlory au pseudo : So_Famouuus`} />
          <Step number="5" text="Prends un screenshot daté de ton paiement en cas de litige — conserve-le jusqu'à la validation." />
          <Step number="6" text="Ta demande est envoyée. Patiente le temps que l'administrateur vérifie ton paiement et crédite ton solde." />

          <Note>
            ⏳ Il peut y avoir un délai entre ton paiement in-game et le crédit de ton solde. Ne fais pas plusieurs demandes pour le même paiement. En cas de problème, contacte l'admin avec ton screenshot.
          </Note>
        </Section>

        {/* Retrait */}
        <Section title="💸 Comment faire un retrait ?" color="var(--gold)">
          <Step number="1" text="Assure-toi d'être connecté in-game sur NationsGlory." />
          <Step number="2" text="Clique sur ton pseudo en haut à droite du site." />
          <Step number="3" text={"Dans le menu qui s'affiche, clique sur \"Retirer de l'argent\"."} />
          <Step number="4" text="Entre le montant que tu souhaites retirer. Il est débité immédiatement de ton solde casino." />
          <Step number="5" text="Patiente in-game — l'administrateur t'enverra la somme directement sur NationsGlory." />

          <Note>
            ⚠️ Le retrait est immédiat et irréversible : ton solde est débité dès la confirmation. La demande ne peut pas être annulée. Assure-toi que ton pseudo NationsGlory est correct avant de soumettre.
          </Note>
        </Section>

        {/* Général */}
        <Section title="ℹ️ Informations générales" color="var(--text-muted)">
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.65, margin: '0 0 0.8rem' }}>
            Le casino utilise de l'argent fictif basé sur la monnaie in-game de <strong>NationsGlory</strong>. Tous les échanges se font via le jeu.
          </p>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
            Ton pseudo sur ce site doit être <strong>identique à ton pseudo NationsGlory</strong> (majuscules comprises) — c'est ce pseudo qui est utilisé pour identifier les paiements.
          </p>
        </Section>

      </main>
    </AuthGuard>
  );
}
