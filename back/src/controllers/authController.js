const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 12;

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, pseudo: user.pseudo, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  const { pseudo, password } = req.body;

  if (!pseudo || !password) {
    return res.status(400).json({ message: 'Pseudo et mot de passe requis.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const existing = await User.findOne({ where: { pseudo } });
  if (existing) {
    return res.status(409).json({ message: 'Ce pseudo est déjà utilisé.' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ pseudo, password: hashedPassword });

  const token = generateToken(user);

  return res.status(201).json({
    message: 'Inscription réussie.',
    token,
    user: { id: user.id, pseudo: user.pseudo, balance: user.balance, isAdmin: user.isAdmin },
  });
};

const login = async (req, res) => {
  const { pseudo, password } = req.body;

  if (!pseudo || !password) {
    return res.status(400).json({ message: 'Pseudo et mot de passe requis.' });
  }

  const user = await User.findOne({ where: { pseudo } });
  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides.' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: 'Identifiants invalides.' });
  }

  const token = generateToken(user);

  return res.json({
    message: 'Connexion réussie.',
    token,
    user: { id: user.id, pseudo: user.pseudo, balance: user.balance, isAdmin: user.isAdmin },
  });
};

const me = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'pseudo', 'balance', 'isAdmin', 'createdAt'],
  });

  if (!user) {
    return res.status(404).json({ message: 'Utilisateur introuvable.' });
  }

  return res.json({ user });
};

module.exports = { register, login, me };
