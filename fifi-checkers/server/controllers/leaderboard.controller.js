const User = require('../models/User');

exports.getGlobalLeaderboard = async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const users = await User.find({})
            .sort({ wins: -1, winStreak: -1 })
            .limit(parseInt(limit))
            .select('telegramId username avatarUrl rank wins losses winStreak');

        res.json({
            success: true,
            leaderboard: users.map((user, index) => ({
                position: index + 1,
                telegramId: user.telegramId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                rank: user.rank,
                wins: user.wins,
                losses: user.losses,
                winStreak: user.winStreak,
                winRate: user.wins + user.losses > 0
                    ? Math.round((user.wins / (user.wins + user.losses)) * 100)
                    : 0
            }))
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
};

exports.getFriendsLeaderboard = async (req, res) => {
    try {
        const user = req.user;
        const friendIds = [...user.friends, user.telegramId];

        const friends = await User.find({ telegramId: { $in: friendIds } })
            .sort({ wins: -1, winStreak: -1 })
            .select('telegramId username avatarUrl rank wins losses winStreak');

        res.json({
            success: true,
            leaderboard: friends.map((friend, index) => ({
                position: index + 1,
                telegramId: friend.telegramId,
                username: friend.username,
                avatarUrl: friend.avatarUrl,
                rank: friend.rank,
                wins: friend.wins,
                losses: friend.losses,
                winStreak: friend.winStreak,
                isMe: friend.telegramId === user.telegramId,
                winRate: friend.wins + friend.losses > 0
                    ? Math.round((friend.wins / (friend.wins + friend.losses)) * 100)
                    : 0
            }))
        });
    } catch (error) {
        console.error('Friends leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get friends leaderboard' });
    }
};

exports.getMyRank = async (req, res) => {
    try {
        const user = req.user;

        const higherRanked = await User.countDocuments({
            wins: { $gt: user.wins }
        });

        const sameWinsHigherStreak = await User.countDocuments({
            wins: user.wins,
            winStreak: { $gt: user.winStreak }
        });

        const position = higherRanked + sameWinsHigherStreak + 1;
        const totalPlayers = await User.countDocuments({});

        res.json({
            success: true,
            position,
            totalPlayers,
            percentile: Math.round(((totalPlayers - position) / totalPlayers) * 100)
        });
    } catch (error) {
        console.error('Get my rank error:', error);
        res.status(500).json({ error: 'Failed to get rank' });
    }
};