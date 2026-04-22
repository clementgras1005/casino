const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ROUND_DURATION        = 30;
const BETS_CLOSE_AT         = 12;  // ferme quand il reste 12s (18s de mises)
const SPIN_AT               = 8;   // spin quand il reste 8s (4s de fermeture)
const RESULT_PHASE_DURATION = 6000; // ms — pause après timer=0 avant nouveau round

// Aucune couleur identique adjacente, 0 au centre, 1 et 12 voisins du 0
const WHEEL_ORDER = [7, 8, 9, 10, 11, 12, 0, 1, 2, 3, 4, 5, 6];

const NUMBER_COLOR = {
  0: 'green',
  1: 'red',  2: 'black', 3: 'red',  4: 'black', 5: 'red',  6: 'black',
  7: 'red',  8: 'black', 9: 'red', 10: 'black', 11: 'red', 12: 'black',
};

const BET_CONFIG = {
  rouge: { numbers: [1, 3, 5, 7, 9, 11], multiplier: 2,  maxBet: 40000 },
  noir:  { numbers: [2, 4, 6, 8, 10, 12], multiplier: 2, maxBet: 40000 },
  ng:    { numbers: [1, 12],              multiplier: 7,  maxBet: 25000 },
  vert:  { numbers: [0],                  multiplier: 12, maxBet: 15000 },
};

const getMultiplier = (number, betType) => {
  const cfg = BET_CONFIG[betType];
  return cfg?.numbers.includes(number) ? cfg.multiplier : 0;
};

function registerRoulette(io) {
  let bets          = {};   // { [userId]: { pseudo, amounts: { betType: amount } } }
  let betsOpen      = true;
  let secondsLeft   = ROUND_DURATION;
  let currentResult = null;
  let spun          = false;
  let locked        = false; // true pendant la pause résultat
  let history       = [];    // 10 derniers résultats

  const getPublicBets = () => {
    const list = [];
    for (const { pseudo, amounts } of Object.values(bets)) {
      for (const [betType, amount] of Object.entries(amounts)) {
        list.push({ pseudo, betType, amount });
      }
    }
    return list;
  };

  const broadcastState = () => {
    io.to('roulette').emit('roulette:state', { secondsLeft, betsOpen, currentResult });
  };

  const startNewRound = () => {
    locked        = false;
    secondsLeft   = ROUND_DURATION;
    betsOpen      = true;
    currentResult = null;
    spun          = false;
    io.to('roulette').emit('roulette:new_round');
    broadcastState();
  };

  const spinWheel = async () => {
    const number  = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
    currentResult = { number, color: NUMBER_COLOR[number], isSpecial: number === 1 || number === 12 };

    // Historique (max 10)
    history = [currentResult, ...history].slice(0, 10);

    const winners = [];
    for (const [userId, userBets] of Object.entries(bets)) {
      let totalGain = 0;
      for (const [betType, amount] of Object.entries(userBets.amounts)) {
        totalGain += amount * getMultiplier(number, betType);
      }
      try {
        const user = await User.findByPk(userId);
        if (user) {
          if (totalGain > 0) await user.increment('balance', { by: totalGain });
          winners.push({ pseudo: userBets.pseudo, amounts: userBets.amounts, gain: totalGain });
        }
      } catch (err) {
        console.error('Payout error:', err.message);
      }
    }

    bets = {};
    io.to('roulette').emit('roulette:result', { result: currentResult, winners, history });

    try {
      const sockets = await io.in('roulette').fetchSockets();
      for (const s of sockets) {
        if (s.userId) {
          const user = await User.findByPk(s.userId, { attributes: ['balance'] });
          if (user) s.emit('balance:update', { balance: parseFloat(user.balance) });
        }
      }
    } catch (err) {
      console.error('Balance broadcast error:', err.message);
    }
  };

  const tick = async () => {
    if (locked) return; // pause résultat en cours

    secondsLeft--;

    if (secondsLeft === BETS_CLOSE_AT && betsOpen) {
      betsOpen = false;
      io.to('roulette').emit('roulette:bets_closed');
    }

    if (secondsLeft === SPIN_AT && !spun) {
      spun = true;
      await spinWheel();
    }

    if (secondsLeft <= 0) {
      locked = true;
      io.to('roulette').emit('roulette:timer_end', { result: currentResult });
      broadcastState(); // secondsLeft=0
      setTimeout(startNewRound, RESULT_PHASE_DURATION);
      return;
    }

    broadcastState();
  };

  setInterval(tick, 1000);

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload     = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId     = payload.id;
        socket.userPseudo = payload.pseudo;
      } catch {}
    }

    socket.on('roulette:join', () => {
      socket.join('roulette');
      socket.emit('roulette:state',        { secondsLeft, betsOpen, currentResult, history });
      socket.emit('roulette:current_bets', getPublicBets());
    });

    socket.on('roulette:bet', async ({ betType, amount }) => {
      if (!socket.userId)
        return socket.emit('roulette:error', { message: 'Non authentifié.' });
      if (!betsOpen)
        return socket.emit('roulette:error', { message: 'Les mises sont clôturées.' });
      if (!BET_CONFIG[betType])
        return socket.emit('roulette:error', { message: 'Type de mise invalide.' });

      const parsedAmount = parseInt(amount, 10);
      const maxBet = BET_CONFIG[betType].maxBet;
      if (!parsedAmount || parsedAmount < 150)
        return socket.emit('roulette:error', { message: 'Mise minimum : 150 $.' });
      if (parsedAmount > maxBet)
        return socket.emit('roulette:error', { message: `Mise maximum : ${maxBet.toLocaleString('fr-FR')} $.` });

      if (!bets[socket.userId])
        bets[socket.userId] = { pseudo: socket.userPseudo, amounts: {} };

      const existingOnType = bets[socket.userId].amounts[betType] || 0;
      if (existingOnType + parsedAmount > maxBet)
        return socket.emit('roulette:error', { message: `Mise maximum atteinte sur ce type (${maxBet.toLocaleString('fr-FR')} $). Déjà misé : ${existingOnType} $.` });

      // Verrouille le slot avant les await pour bloquer les requêtes concurrentes
      bets[socket.userId].amounts[betType] = existingOnType + parsedAmount;

      try {
        const user = await User.findByPk(socket.userId);
        if (!user) {
          bets[socket.userId].amounts[betType] = existingOnType;
          return socket.emit('roulette:error', { message: 'Utilisateur introuvable.' });
        }
        if (parseFloat(user.balance) < parsedAmount) {
          bets[socket.userId].amounts[betType] = existingOnType;
          return socket.emit('roulette:error', { message: 'Solde insuffisant.' });
        }

        await user.decrement('balance', { by: parsedAmount });

        socket.emit('balance:update', { balance: parseFloat(user.balance) - parsedAmount });
        socket.emit('roulette:bet_confirmed', {
          betType,
          amount: parsedAmount,
          myBets: bets[socket.userId].amounts,
        });

        io.to('roulette').emit('roulette:new_bet', {
          pseudo: socket.userPseudo, betType, amount: parsedAmount,
        });
      } catch (err) {
        bets[socket.userId].amounts[betType] = existingOnType;
        console.error('Bet error:', err.message);
        socket.emit('roulette:error', { message: 'Erreur serveur.' });
      }
    });
  });
}

module.exports = registerRoulette;
