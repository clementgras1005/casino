'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import AuthGuard from '@/components/AuthGuard';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

const SOCKET_URL    = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '');
const BETS_CLOSE_AT = 12;
const ANIM_MS       = 5500;
const BET_MIN       = 150;
const BET_MAX = { rouge: 40000, noir: 40000, ng: 25000, vert: 15000 };

// Aucune couleur identique adjacente, 0 au centre, 1 et 12 voisins du 0
const WHEEL_ORDER = [7, 8, 9, 10, 11, 12, 0, 1, 2, 3, 4, 5, 6];
const SEG_COUNT   = WHEEL_ORDER.length;
const SEG_ANGLE   = 360 / SEG_COUNT;

const NUM_COLOR = {
  0: 'green',
  1: 'red',  2: 'black', 3: 'red',  4: 'black',
  5: 'red',  6: 'black', 7: 'red',  8: 'black',
  9: 'red', 10: 'black', 11: 'red', 12: 'black',
};

const SEG_COLORS = {
  green: { fill: '#0a3d1f', stroke: '#1a7a3d', text: '#5ddb8a' },
  red:   { fill: '#3d0a0a', stroke: '#b52020', text: '#ff8080' },
  black: { fill: '#0a0a1f', stroke: '#2d2d60', text: '#9090cc' },
};

const BET_TYPES = [
  { value: 'rouge', label: 'Rouge',      sub: 'x2',  fill: '#3d0a0a', border: '#c0392b' },
  { value: 'noir',  label: 'Noir',       sub: 'x2',  fill: '#0a0a1f', border: '#4a4aaa' },
  { value: 'ng',    label: 'NG (1 & 12)', sub: 'x7', fill: '#1a0d2e', border: '#c9a84c', special: true },
  { value: 'vert',  label: 'Vert',       sub: 'x12', fill: '#0a3d1f', border: '#1a9e4a' },
];

const BET_LABELS = {
  rouge: 'Rouge', noir: 'Noir', ng: 'NG (1 & 12)', vert: 'Vert',
};

// ─── SVG ─────────────────────────────────────────────────────────────────────

const polar = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const donutPath = (cx, cy, oR, iR, a0, a1) => {
  const os = polar(cx, cy, oR, a0), oe = polar(cx, cy, oR, a1);
  const is_ = polar(cx, cy, iR, a0), ie = polar(cx, cy, iR, a1);
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M${os.x} ${os.y} A${oR} ${oR} 0 ${lg} 1 ${oe.x} ${oe.y} L${ie.x} ${ie.y} A${iR} ${iR} 0 ${lg} 0 ${is_.x} ${is_.y}Z`;
};

// ─── Wheel ────────────────────────────────────────────────────────────────────

function RouletteWheel({ wheelRef, winnerNumber }) {
  const CX = 150, CY = 150, OR = 128, IR = 52;

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}>
      {/* Anneaux décoratifs */}
      <circle cx={CX} cy={CY} r={OR + 16} fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.45" />
      <circle cx={CX} cy={CY} r={OR + 10} fill="#0d0d18" stroke="#a8882e" strokeWidth="1" />

      {/* Roue tournante */}
      <g ref={wheelRef} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
        {WHEEL_ORDER.map((num, idx) => {
          const a0  = idx * SEG_ANGLE;
          const a1  = (idx + 1) * SEG_ANGLE;
          const mid = a0 + SEG_ANGLE / 2;
          const c   = SEG_COLORS[NUM_COLOR[num]];
          const isWin = winnerNumber === num;
          const isSpe = num === 1 || num === 12;

          const tPos  = polar(CX, CY, (OR + IR) / 2 + 6, mid);
          const ngPos = polar(CX, CY, IR + 14, mid);

          return (
            <g key={num}>
              <path
                d={donutPath(CX, CY, OR, IR, a0, a1)}
                fill={isWin ? c.stroke : c.fill}
                stroke="#060610"
                strokeWidth="1"
              />
              <text
                x={tPos.x} y={tPos.y}
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${mid},${tPos.x},${tPos.y})`}
                fill={isWin ? '#c9a84c' : c.text}
                fontSize={num >= 10 ? '8' : '9.5'}
                fontWeight="bold"
                fontFamily="sans-serif"
              >{num}</text>
              {isSpe && (
                <g transform={`rotate(${mid},${ngPos.x},${ngPos.y})`}>
                  <circle cx={ngPos.x} cy={ngPos.y} r={6.5} fill="#c9a84c" />
                  <text x={ngPos.x} y={ngPos.y} textAnchor="middle" dominantBaseline="middle"
                    fill="#0a0a0f" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif">NG</text>
                </g>
              )}
            </g>
          );
        })}
        {WHEEL_ORDER.map((_, idx) => {
          const p1 = polar(CX, CY, IR, idx * SEG_ANGLE);
          const p2 = polar(CX, CY, OR, idx * SEG_ANGLE);
          return <line key={idx} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#060610" strokeWidth="1.5" />;
        })}
      </g>

      {/* Hub central */}
      <circle cx={CX} cy={CY} r={IR - 1} fill="#08080f" stroke="#252535" strokeWidth="2" />
      <circle cx={CX} cy={CY} r={12} fill="#c9a84c" opacity="0.9" />
      <circle cx={CX} cy={CY} r={6}  fill="#f5e08a" />

      {/* Flèche indicatrice sobre (fixe, ne tourne pas) */}
      <polygon
        points={`${CX},${CY - OR + 8} ${CX - 8},${CY - OR - 12} ${CX + 8},${CY - OR - 12}`}
        fill="#c9a84c"
        stroke="#0a0a0f"
        strokeWidth="1"
      />
    </svg>
  );
}

// ─── Badge NG ─────────────────────────────────────────────────────────────────

function NGBadge({ size = 16 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      backgroundColor: '#c9a84c', color: '#0a0a0f',
      fontSize: size * 0.5, fontWeight: 'bold', flexShrink: 0,
    }}>NG</span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoulettePage() {
  const { updateBalance } = useAuth();
  const router            = useRouter();
  const socketRef         = useRef(null);
  const wheelRef          = useRef(null);
  const angleRef          = useRef(0);
  const spinMode          = useRef('idle');
  const resultClearRef    = useRef(null);
  const spinningRef       = useRef(false); // true pendant l'animation, bloque les mises à jour d'historique
  const pendingBalanceRef = useRef(null);  // solde reçu pendant l'animation, appliqué après

  const [secondsLeft,  setSecondsLeft]  = useState(20);
  const [betsOpen,     setBetsOpen]     = useState(true);
  const [result,       setResult]       = useState(null);
  const [winnerNum,    setWinnerNum]    = useState(null);
  const [winners,      setWinners]      = useState([]);
  const [timerEnded,   setTimerEnded]   = useState(false);
  const [history,      setHistory]      = useState([]);
  const [allBets,      setAllBets]      = useState({});
  const [myBets,       setMyBets]       = useState({});
  const [betType,      setBetType]      = useState('rouge');
  const [betAmount,    setBetAmount]    = useState(BET_MIN);
  const [error,        setError]        = useState('');
  const [notice,       setNotice]       = useState('');

  const flash = useCallback((msg, isErr = false) => {
    if (isErr) { setError(msg);  setTimeout(() => setError(''),  3500); }
    else        { setNotice(msg); setTimeout(() => setNotice(''), 3500); }
  }, []);

  // rAF
  useEffect(() => {
    let raf;
    const loop = () => {
      if (spinMode.current !== 'landing' && wheelRef.current) {
        angleRef.current += spinMode.current === 'fast' ? 4.5 : 0.15;
        wheelRef.current.style.transform = `rotate(${angleRef.current}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const landOnNumber = useCallback((number) => {
    const idx       = WHEEL_ORDER.indexOf(number);
    const segCenter = idx * SEG_ANGLE + SEG_ANGLE / 2;
    const targetMod = (360 - (segCenter % 360)) % 360;
    const currentMod = ((angleRef.current % 360) + 360) % 360;
    let diff = targetMod - currentMod;
    if (diff < 0) diff += 360;

    const targetAngle = angleRef.current + diff + 6 * 360;
    spinMode.current = 'landing';
    angleRef.current = targetAngle;

    requestAnimationFrame(() => {
      if (!wheelRef.current) return;
      wheelRef.current.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.05, 0, 0.08, 1)`;
      wheelRef.current.style.transform  = `rotate(${targetAngle}deg)`;
    });

    setTimeout(() => {
      if (wheelRef.current) wheelRef.current.style.transition = 'none';
      spinMode.current = 'idle';
    }, ANIM_MS + 100);
  }, []);

  // Socket
  useEffect(() => {
    const token  = localStorage.getItem('token');
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect',       () => socket.emit('roulette:join'));
    socket.on('connect_error', e  => flash('Serveur inaccessible : ' + e.message, true));

    socket.on('roulette:state', ({ secondsLeft: sl, betsOpen: bo, history: h }) => {
      setSecondsLeft(sl);
      setBetsOpen(bo);
      if (h) setHistory(h); // présent uniquement au join initial, jamais pendant le spin
    });

    socket.on('roulette:bets_closed', () => {
      setBetsOpen(false);
      spinMode.current = 'fast';
      flash('Mises clôturées — la roue tourne !');
    });

    socket.on('roulette:result', ({ result: r, winners: w, history: h }) => {
      spinningRef.current = true;
      landOnNumber(r.number);
      // Affiche résultat et historique après animation
      setTimeout(() => {
        spinningRef.current = false;
        if (pendingBalanceRef.current !== null) {
          updateBalance(pendingBalanceRef.current);
          pendingBalanceRef.current = null;
        }
        setResult(r);
        setWinnerNum(r.number);
        setWinners(w);
        if (h) setHistory(h);
      }, ANIM_MS + 200);
    });

    socket.on('roulette:timer_end', () => {
      setTimerEnded(true);
      setSecondsLeft(0);
    });

    socket.on('roulette:new_round', () => {
      setMyBets({});
      setAllBets({});
      setBetsOpen(true);
      setTimerEnded(false);
      if (spinMode.current !== 'landing') spinMode.current = 'idle';
      // Garde le résultat visible encore 5s puis efface
      if (resultClearRef.current) clearTimeout(resultClearRef.current);
      resultClearRef.current = setTimeout(() => {
        setResult(null);
        setWinnerNum(null);
        setWinners([]);
      }, 5000);
    });

    socket.on('roulette:current_bets', (bets) => {
      const map = {};
      for (const b of bets) {
        const key = `${b.pseudo}_${b.betType}`;
        map[key] = { ...b };
      }
      setAllBets(map);
    });

    socket.on('roulette:new_bet', ({ pseudo, betType: bt, amount }) => {
      setAllBets(prev => {
        const key = `${pseudo}_${bt}`;
        return { ...prev, [key]: { pseudo, betType: bt, amount: (prev[key]?.amount || 0) + amount } };
      });
    });

    socket.on('roulette:bet_confirmed', ({ betType: bt, amount, myBets: mb }) => {
      setMyBets(mb);
      flash(`+${amount} $ sur ${BET_LABELS[bt]}`);
    });

    socket.on('roulette:error',   ({ message }) => flash(message, true));
    socket.on('balance:update', ({ balance }) => {
      if (spinningRef.current) {
        pendingBalanceRef.current = balance;
      } else {
        updateBalance(balance);
      }
    });

    return () => {
      socket.disconnect();
      if (resultClearRef.current) clearTimeout(resultClearRef.current);
    };
  }, [flash, landOnNumber, updateBalance]);

  const placeBet = () => {
    if (!socketRef.current?.connected) return flash('Non connecté.', true);
    socketRef.current.emit('roulette:bet', { betType, amount: betAmount });
  };

  const currentMax = BET_MAX[betType] ?? 40000;
  const betAmountError = !betAmount
    ? ''
    : betAmount < BET_MIN ? `Mise minimum : ${BET_MIN.toLocaleString('fr-FR')} $`
    : betAmount > currentMax ? `Mise maximum : ${currentMax.toLocaleString('fr-FR')} $`
    : '';

  const timerColor  = secondsLeft <= 5 ? '#e05555' : secondsLeft <= BETS_CLOSE_AT ? '#e09c55' : '#c9a84c';
  const allBetsList = Object.values(allBets);
  const myBetsTotal = Object.values(myBets).reduce((s, v) => s + v, 0);
  const betTotals   = BET_TYPES.reduce((acc, bt) => {
    acc[bt.value] = allBetsList.filter(b => b.betType === bt.value).reduce((s, b) => s + b.amount, 0);
    return acc;
  }, {});

  return (
    <AuthGuard>
      <Header />

      <style>{`
        @keyframes glow-pulse {
          0%,100% { box-shadow: 0 0 10px rgba(201,168,76,0.3); }
          50%      { box-shadow: 0 0 28px rgba(201,168,76,0.8); }
        }
        @keyframes result-in {
          from { opacity:0; transform: scale(0.92); }
          to   { opacity:1; transform: scale(1); }
        }
        .result-card { animation: result-in 0.4s ease-out, glow-pulse 2s ease-in-out 0.4s infinite; }
        @keyframes timer-end-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
        .timer-end { animation: timer-end-pulse 0.8s ease-in-out infinite; }
      `}</style>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

        {/* Titre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase',
            padding: '0.3rem 0.8rem', borderRadius: 4,
          }}>← Lobby</button>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            Roulette
          </h1>
          <NGBadge size={22} />
        </div>

        {/* Timer bar */}
        <div style={{
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '1rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap',
        }}>
          <span className={timerEnded ? 'timer-end' : ''} style={{
            color: timerEnded ? '#c9a84c' : timerColor,
            fontSize: '2rem', fontWeight: 'bold',
            fontVariantNumeric: 'tabular-nums', minWidth: 60,
          }}>
            {String(secondsLeft).padStart(2, '0')}s
          </span>

          <div style={{ flex: 1, minWidth: 100, height: 4, backgroundColor: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: timerEnded ? '0%' : `${(secondsLeft / 30) * 100}%`,
              backgroundColor: timerColor,
              transition: 'width 1s linear, background-color 0.3s',
            }} />
          </div>

          <span style={{
            padding: '0.3rem 0.9rem', borderRadius: 4,
            fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase',
            backgroundColor: betsOpen ? 'rgba(76,175,85,0.12)' : 'rgba(224,85,85,0.12)',
            color: betsOpen ? '#4caf85' : '#e05555',
            border: `1px solid ${betsOpen ? '#4caf85' : '#e05555'}`,
          }}>
            {betsOpen ? 'Mises ouvertes' : 'Mises clôturées'}
          </span>
        </div>

        {/* Historique des 10 derniers résultats */}
        {history.length > 0 && (
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.9rem 1.2rem', marginBottom: '1.5rem',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.7rem' }}>
              Historique ({history.length} derniers)
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {history.map((h, i) => {
                const c = SEG_COLORS[h.color];
                const isLatest = i === 0;
                return (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: 5, flexShrink: 0,
                    backgroundColor: c.fill,
                    border: `${isLatest ? 2 : 1}px solid ${isLatest ? '#c9a84c' : c.stroke}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: isLatest ? '#c9a84c' : c.text,
                    fontWeight: 'bold', fontSize: '0.85rem',
                    position: 'relative',
                    opacity: 0.4 + (1 - i / history.length) * 0.6,
                  }}>
                    {h.number}
                    {h.isSpecial && (
                      <span style={{ fontSize: '0.35rem', color: '#c9a84c', letterSpacing: 0.5, lineHeight: 1 }}>NG</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pause résultat — plein écran sobre */}
        {timerEnded && result && (
          <div className="result-card" style={{
            backgroundColor: `${SEG_COLORS[result.color].fill}`,
            border: `2px solid #c9a84c`,
            borderRadius: 10, padding: '1.5rem 2rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '2rem', flexWrap: 'wrap',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 12,
              backgroundColor: SEG_COLORS[result.color].stroke,
              border: '3px solid #c9a84c',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem', fontWeight: 'bold', color: '#fff', gap: 4,
            }}>
              {result.number}
              {result.isSpecial && <span style={{ fontSize: '0.6rem', color: '#c9a84c', letterSpacing: 1 }}>NG</span>}
            </div>
            <div>
              <p style={{ color: '#c9a84c', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 0.3rem' }}>
                Numéro gagnant
              </p>
              <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.4rem' }}>
                {result.color === 'green' ? 'Vert' : result.color === 'red' ? 'Rouge' : 'Noir'}
                {result.isSpecial ? ' — NationsGlory' : ''}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', margin: 0 }}>
                {winners.filter(w => w.gain > 0).length === 0
                  ? 'Aucun gagnant ce round.'
                  : winners.filter(w => w.gain > 0).map(w => `${w.pseudo} +${w.gain} $`).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Résultat compact (nouveau round, résultat encore visible) */}
        {!timerEnded && result && (
          <div style={{
            backgroundColor: `${SEG_COLORS[result.color].stroke}18`,
            border: `1px solid ${SEG_COLORS[result.color].stroke}`,
            borderRadius: 8, padding: '0.8rem 1.2rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 6, flexShrink: 0,
              backgroundColor: SEG_COLORS[result.color].fill,
              border: `1px solid ${SEG_COLORS[result.color].stroke}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', fontWeight: 'bold', color: SEG_COLORS[result.color].text, gap: 2,
            }}>
              {result.number}
              {result.isSpecial && <span style={{ fontSize: '0.4rem', color: '#c9a84c' }}>NG</span>}
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem', margin: '0 0 0.2rem' }}>
                Dernier résultat : {result.number} — {result.color === 'green' ? 'Vert' : result.color === 'red' ? 'Rouge' : 'Noir'}{result.isSpecial ? ' NationsGlory' : ''}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
                {winners.filter(w => w.gain > 0).map(w => `${w.pseudo} +${w.gain} $`).join(' · ') || 'Aucun gagnant'}
              </p>
            </div>
          </div>
        )}

        {/* Roue + Mises */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RouletteWheel wheelRef={wheelRef} winnerNumber={winnerNum} />
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              Mises du round ({allBetsList.length})
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {BET_TYPES.map(bt => betTotals[bt.value] > 0 && (
                <span key={bt.value} style={{
                  padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.72rem',
                  backgroundColor: `${bt.fill}cc`, border: `1px solid ${bt.border}`, color: '#ddd',
                }}>
                  {bt.label} : {betTotals[bt.value]} $
                </span>
              ))}
              {allBetsList.length === 0 && (
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Aucune mise…</span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {[...allBetsList].reverse().map((b, i) => {
                const bt = BET_TYPES.find(x => x.value === b.betType);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.35rem 0.6rem', borderRadius: 4,
                    backgroundColor: 'var(--bg-surface)', fontSize: '0.78rem',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, backgroundColor: bt?.border || '#555' }} />
                    <span style={{ color: 'var(--text-muted)', flex: 1 }}>{b.pseudo}</span>
                    <span style={{ color: bt?.border || '#aaa', fontWeight: 'bold' }}>{bt?.label}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{b.amount} $</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel de mise */}
        <div style={{
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '1.5rem',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1rem' }}>
            Placer une mise
          </p>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            {BET_TYPES.map(bt => {
              const active = betType === bt.value;
              return (
                <button key={bt.value} onClick={() => betsOpen && setBetType(bt.value)} style={{
                  flex: '1 1 110px', padding: '0.7rem 0.4rem', borderRadius: 6,
                  border: `2px solid ${active ? bt.border : 'var(--border)'}`,
                  backgroundColor: active ? `${bt.fill}ee` : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                  cursor: !betsOpen ? 'not-allowed' : 'pointer',
                  opacity: !betsOpen ? 0.55 : 1, transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 'bold', fontSize: '0.82rem', marginBottom: 3 }}>
                    {bt.special && <NGBadge size={13} />}
                    {bt.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: active ? '#bbb' : 'var(--text-subtle)' }}>{bt.sub}</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>
                Montant ($)
              </label>
              <input type="number" min={1} value={betAmount}
                onChange={e => setBetAmount(parseInt(e.target.value) || '')}
                disabled={!betsOpen}
                style={{
                  width: '100%', padding: '0.55rem 0.8rem', borderRadius: 4,
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
                }}
              />
            </div>
            {[150, 500, 1000, 5000, 15000, 25000, 40000].filter(v => v <= currentMax).map(v => (
              <button key={v} onClick={() => setBetAmount(v)} disabled={!betsOpen} style={{
                padding: '0.55rem 0.8rem', borderRadius: 4,
                border: `1px solid ${betAmount === v ? 'var(--gold)' : 'var(--border)'}`,
                backgroundColor: betAmount === v ? 'rgba(201,168,76,0.12)' : 'transparent',
                color: betAmount === v ? 'var(--gold)' : 'var(--text-muted)',
                cursor: !betsOpen ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
              }}>{v >= 1000 ? `${v / 1000}k` : v}$</button>
            ))}
          </div>

          {myBetsTotal > 0 && (
            <div style={{
              padding: '0.6rem 0.9rem', borderRadius: 4, marginBottom: '0.8rem',
              backgroundColor: 'rgba(76,175,85,0.08)', border: '1px solid rgba(76,175,85,0.3)',
              color: '#4caf85', fontSize: '0.82rem', display: 'flex', gap: '1rem', flexWrap: 'wrap',
            }}>
              {Object.entries(myBets).map(([bt, amt]) => (
                <span key={bt}>✓ {BET_LABELS[bt]} — <strong>{amt} $</strong></span>
              ))}
              <span style={{ marginLeft: 'auto', color: '#6dcf9e' }}>Total : {myBetsTotal} $</span>
            </div>
          )}

          <button onClick={placeBet} disabled={!betsOpen || !!betAmountError || !betAmount} style={{
            width: '100%', padding: '0.85rem',
            backgroundColor: !betsOpen || betAmountError || !betAmount ? 'var(--bg-surface)' : 'var(--gold)',
            color: !betsOpen || betAmountError || !betAmount ? 'var(--text-muted)' : '#0a0a0f',
            border: 'none', borderRadius: 6,
            fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase',
            fontSize: '0.85rem', cursor: !betsOpen || betAmountError || !betAmount ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}>
            {!betsOpen ? 'Mises clôturées' : 'Miser'}
          </button>

          {betAmountError && <div style={{ padding: '0.6rem 0.9rem', borderRadius: 4, marginTop: '0.8rem', backgroundColor: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', color: 'var(--error)', fontSize: '0.82rem' }}>{betAmountError}</div>}
          {error   && <div style={{ padding: '0.6rem 0.9rem', borderRadius: 4, marginTop: '0.8rem', backgroundColor: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', color: 'var(--error)', fontSize: '0.82rem' }}>{error}</div>}
          {notice && !error && <div style={{ padding: '0.6rem 0.9rem', borderRadius: 4, marginTop: '0.8rem', backgroundColor: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontSize: '0.82rem' }}>{notice}</div>}
        </div>

      </main>
    </AuthGuard>
  );
}
