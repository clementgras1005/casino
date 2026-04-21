const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const { createWithdrawal } = require('../controllers/withdrawalController');

router.post('/', authenticate, createWithdrawal);

module.exports = router;
