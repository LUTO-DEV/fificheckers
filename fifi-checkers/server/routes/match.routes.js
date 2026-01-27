const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/active', authMiddleware, matchController.getActiveMatch);
router.get('/history', authMiddleware, matchController.getMatchHistory);
router.get('/stats', authMiddleware, matchController.getStats);

module.exports = router;