const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Public routes
router.post('/auth', userController.authenticate);

// Protected routes
router.get('/profile', authMiddleware, userController.getProfile);
router.post('/daily-reward', authMiddleware, userController.claimDailyReward);
router.get('/friends', authMiddleware, userController.getFriends);
router.post('/friends/request', authMiddleware, userController.sendFriendRequest);
router.post('/friends/accept', authMiddleware, userController.acceptFriendRequest);
router.post('/friends/reject', authMiddleware, userController.rejectFriendRequest);
router.post('/friends/remove', authMiddleware, userController.removeFriend);
router.get('/search', authMiddleware, userController.searchUser);

module.exports = router;