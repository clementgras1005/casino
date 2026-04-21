const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');

const createWithdrawal = async (req, res) => {
  const parsedAmount = parseFloat(req.body.amount);

  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Montant invalide.' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    if (parseFloat(user.balance) < parsedAmount) {
      return res.status(400).json({ message: 'Solde insuffisant.' });
    }

    await user.decrement('balance', { by: parsedAmount });

    const withdrawal = await Withdrawal.create({
      userId: user.id,
      pseudo: user.pseudo,
      amount: parsedAmount,
    });

    const updated = await User.findByPk(user.id, { attributes: ['balance'] });

    return res.status(201).json({
      withdrawal,
      balance: parseFloat(updated.balance),
    });
  } catch (err) {
    console.error('Withdrawal error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = { createWithdrawal };
