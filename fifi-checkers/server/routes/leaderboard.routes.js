const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.get('/global', leaderboardController.getGlobalLeaderboard);
router.get('/friends', authMiddleware, leaderboardController.getFriendsLeaderboard);
router.get('/my-rank', authMiddleware, leaderboardController.getMyRank);

module.exports = router;