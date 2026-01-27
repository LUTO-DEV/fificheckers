const User = require('../models/User');
const AuthService = require('../services/auth.service');
const RankingService = require('../services/ranking.service');

exports.authenticate = async (req, res) => {
    try {
        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({ error: 'initData is required' });
        }

        const { user, token } = await AuthService.authenticateUser(initData);

        res.json({
            success: true,
            token,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                coins: user.coins,
                wins: user.wins,
                losses: user.losses,
                winStreak: user.winStreak,
                bestWinStreak: user.bestWinStreak,
                rank: user.rank,
                rankProgress: RankingService.getRankProgress(user.rank, user.wins),
                winsToNextRank: RankingService.getWinsToNextRank(user.rank, user.wins),
                gamesPlayed: user.gamesPlayed,
                canClaimDaily: user.canClaimDaily()
            }
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = req.user;

        res.json({
            success: true,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                coins: user.coins,
                wins: user.wins,
                losses: user.losses,
                winStreak: user.winStreak,
                bestWinStreak: user.bestWinStreak,
                rank: user.rank,
                rankProgress: RankingService.getRankProgress(user.rank, user.wins),
                winsToNextRank: RankingService.getWinsToNextRank(user.rank, user.wins),
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                canClaimDaily: user.canClaimDaily(),
                friends: user.friends,
                friendRequests: user.friendRequests
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
};

exports.claimDailyReward = async (req, res) => {
    try {
        const user = req.user;

        if (!user.canClaimDaily()) {
            const nextClaim = new Date(user.lastDailyClaim);
            nextClaim.setHours(nextClaim.getHours() + 24);

            return res.status(400).json({
                error: 'Daily reward not available yet',
                nextClaimAt: nextClaim
            });
        }

        user.claimDailyReward();
        await user.save();

        res.json({
            success: true,
            coinsAwarded: 20,
            newBalance: user.coins
        });
    } catch (error) {
        console.error('Daily reward error:', error);
        res.status(500).json({ error: 'Failed to claim daily reward' });
    }
};

exports.sendFriendRequest = async (req, res) => {
    try {
        const { targetTelegramId } = req.body;
        const user = req.user;

        if (targetTelegramId === user.telegramId) {
            return res.status(400).json({ error: 'Cannot add yourself' });
        }

        if (user.friends.includes(targetTelegramId)) {
            return res.status(400).json({ error: 'Already friends' });
        }

        const targetUser = await User.findOne({ telegramId: targetTelegramId });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if request already sent
        const existingRequest = targetUser.friendRequests.find(
            r => r.from === user.telegramId
        );
        if (existingRequest) {
            return res.status(400).json({ error: 'Request already sent' });
        }

        targetUser.friendRequests.push({
            from: user.telegramId,
            username: user.username
        });
        await targetUser.save();

        res.json({ success: true, message: 'Friend request sent' });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
    }
};

exports.acceptFriendRequest = async (req, res) => {
    try {
        const { fromTelegramId } = req.body;
        const user = req.user;

        const requestIndex = user.friendRequests.findIndex(
            r => r.from === fromTelegramId
        );

        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        // Remove request
        user.friendRequests.splice(requestIndex, 1);

        // Add to friends
        user.friends.push(fromTelegramId);
        await user.save();

        // Add to sender's friends
        const sender = await User.findOne({ telegramId: fromTelegramId });
        if (sender) {
            sender.friends.push(user.telegramId);
            await sender.save();
        }
        res.json({
            success: true,
            message: 'Friend request accepted',
            newFriend: {
                telegramId: sender.telegramId,
                username: sender.username
            }
        });
    } catch (error) {
        console.error('Accept friend error:', error);
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
};

exports.rejectFriendRequest = async (req, res) => {
    try {
        const { fromTelegramId } = req.body;
        const user = req.user;

        const requestIndex = user.friendRequests.findIndex(
            r => r.from === fromTelegramId
        );

        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        user.friendRequests.splice(requestIndex, 1);
        await user.save();

        res.json({ success: true, message: 'Friend request rejected' });
    } catch (error) {
        console.error('Reject friend error:', error);
        res.status(500).json({ error: 'Failed to reject friend request' });
    }
};

exports.removeFriend = async (req, res) => {
    try {
        const { friendTelegramId } = req.body;
        const user = req.user;

        const friendIndex = user.friends.indexOf(friendTelegramId);
        if (friendIndex === -1) {
            return res.status(404).json({ error: 'Friend not found' });
        }

        user.friends.splice(friendIndex, 1);
        await user.save();

        // Remove from friend's list too
        const friend = await User.findOne({ telegramId: friendTelegramId });
        if (friend) {
            const userIndex = friend.friends.indexOf(user.telegramId);
            if (userIndex !== -1) {
                friend.friends.splice(userIndex, 1);
                await friend.save();
            }
        }

        res.json({ success: true, message: 'Friend removed' });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const user = req.user;

        const friends = await User.find(
            { telegramId: { $in: user.friends } },
            'telegramId username avatarUrl rank wins coins'
        );

        res.json({
            success: true,
            friends: friends.map(f => ({
                telegramId: f.telegramId,
                username: f.username,
                avatarUrl: f.avatarUrl,
                rank: f.rank,
                wins: f.wins,
                isOnline: false // Will be updated via socket
            })),
            pendingRequests: user.friendRequests
        });
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Failed to get friends' });
    }
};

exports.searchUser = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Query too short' });
        }

        const users = await User.find(
            {
                $or: [
                    { username: { $regex: query, $options: 'i' } },
                    { telegramId: query }
                ]
            },
            'telegramId username avatarUrl rank wins'
        ).limit(20);

        res.json({
            success: true,
            users: users.map(u => ({
                telegramId: u.telegramId,
                username: u.username,
                avatarUrl: u.avatarUrl,
                rank: u.rank,
                wins: u.wins
            }))
        });
    } catch (error) {
        console.error('Search user error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};