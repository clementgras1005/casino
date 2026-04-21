const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const { createDeposit } = require('../controllers/depositController');

router.post('/', authenticate, createDeposit);

module.exports = router;
