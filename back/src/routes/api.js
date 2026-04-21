const router = require('express').Router();
const authRouter        = require('./auth');
const adminRouter       = require('./admin');
const withdrawalsRouter = require('./withdrawals');
const depositsRouter    = require('./deposits');

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth',        authRouter);
router.use('/admin',       adminRouter);
router.use('/withdrawals', withdrawalsRouter);
router.use('/deposits',    depositsRouter);

module.exports = router;
