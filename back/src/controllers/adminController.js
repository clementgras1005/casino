const { Op } = require('sequelize');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Deposit = require('../models/Deposit');

const getUsers = async (req, res) => {
  const { search = '', sort = 'balance', order = 'DESC' } = req.query;

  const validSorts  = ['balance', 'pseudo', 'createdAt'];
  const validOrders = ['ASC', 'DESC'];
  const sortField = validSorts.includes(sort) ? sort : 'balance';
  const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

  const where = { isAdmin: false };
  if (search.trim()) where.pseudo = { [Op.like]: `%${search.trim()}%` };

  try {
    const users = await User.findAll({
      where,
      attributes: ['id', 'pseudo', 'balance', 'createdAt'],
      order: [[sortField, sortOrder]],
    });
    return res.json({ users });
  } catch (err) {
    console.error('Admin getUsers error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.findAll({
      order: [['createdAt', 'DESC']],
    });
    return res.json({ withdrawals });
  } catch (err) {
    console.error('Admin getWithdrawals error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const validateWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findByPk(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Demande introuvable.' });
    if (withdrawal.status === 'processed') {
      return res.status(400).json({ message: 'Déjà traitée.' });
    }
    await withdrawal.update({ status: 'processed' });
    return res.json({ withdrawal });
  } catch (err) {
    console.error('Admin validateWithdrawal error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const refuseWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findByPk(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Demande introuvable.' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ message: 'Demande déjà traitée.' });

    await withdrawal.update({ status: 'refused' });

    // Rembourse le joueur (le montant avait été débité immédiatement)
    const user = await User.findByPk(withdrawal.userId);
    if (user) await user.increment('balance', { by: parseFloat(withdrawal.amount) });

    return res.json({ withdrawal });
  } catch (err) {
    console.error('Admin refuseWithdrawal error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const refuseDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findByPk(req.params.id);
    if (!deposit) return res.status(404).json({ message: 'Demande introuvable.' });
    if (deposit.status !== 'pending') return res.status(400).json({ message: 'Demande déjà traitée.' });

    await deposit.update({ status: 'refused' });

    return res.json({ deposit });
  } catch (err) {
    console.error('Admin refuseDeposit error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const getDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.findAll({ order: [['createdAt', 'DESC']] });
    return res.json({ deposits });
  } catch (err) {
    console.error('Admin getDeposits error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const validateDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findByPk(req.params.id);
    if (!deposit) return res.status(404).json({ message: 'Demande introuvable.' });
    if (deposit.status === 'processed') return res.status(400).json({ message: 'Déjà traitée.' });

    await deposit.update({ status: 'processed' });

    const user = await User.findByPk(deposit.userId);
    if (user) await user.increment('balance', { by: parseFloat(deposit.amount) });

    return res.json({ deposit });
  } catch (err) {
    console.error('Admin validateDeposit error:', err.message);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = { getUsers, getWithdrawals, validateWithdrawal, refuseWithdrawal, getDeposits, validateDeposit, refuseDeposit };
