const router = require('express').Router();
const authenticate  = require('../middleware/authenticate');
const requireAdmin  = require('../middleware/requireAdmin');
const { getUsers, getWithdrawals, validateWithdrawal, refuseWithdrawal, getDeposits, validateDeposit, refuseDeposit, getStats } = require('../controllers/adminController');

router.get('/stats',                          authenticate, requireAdmin, getStats);
router.get('/users',                          authenticate, requireAdmin, getUsers);
router.get('/withdrawals',                    authenticate, requireAdmin, getWithdrawals);
router.patch('/withdrawals/:id/validate',     authenticate, requireAdmin, validateWithdrawal);
router.patch('/withdrawals/:id/refuse',       authenticate, requireAdmin, refuseWithdrawal);
router.get('/deposits',                       authenticate, requireAdmin, getDeposits);
router.patch('/deposits/:id/validate',        authenticate, requireAdmin, validateDeposit);
router.patch('/deposits/:id/refuse',          authenticate, requireAdmin, refuseDeposit);

module.exports = router;
