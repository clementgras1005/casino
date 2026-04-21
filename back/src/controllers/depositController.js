const User = require('../models/User');
const Deposit = require('../models/Deposit');

const createDeposit = async (req, res) => {
  const parsedAmount = parseFloat(req.body.amount);

  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Montant invalide.' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const deposit = await Deposit.create({
      userId: user.id,
      pseudo: user.pseudo,
      amount: parsedAmount,
    });

    return res.status(201).json({ deposit });
  } catch (err) {
    console.error('Deposit error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = { createDeposit };
