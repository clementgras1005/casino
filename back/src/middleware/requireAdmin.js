const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }
  next();
};

module.exports = requireAdmin;
