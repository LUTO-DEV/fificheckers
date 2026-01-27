const MatchService = require('../services/match.service');
const Match = require('../models/Match');

exports.getActiveMatch = async (req, res) => {
    try {
        const match = MatchService.getMatchByPlayer(req.telegramId);

        if (!match) {
            return res.json({ success: true, match: null });
        }

        res.json({
            success: true,
            match: {
                matchId: match.matchId,
                player1: {
                    username: match.player1.username,
                    color: match.player1.color
                },
                player2: {
                    username: match.player2.username,
                    color: match.player2.color,
                    isBot: match.player2.isBot
                },
                boardState: match.boardState,
                turn: match.turn,
                currentPlayer: match.currentPlayer,
                betAmount: match.betAmount,
                timerMode: match.timerMode,
                status: match.status,
                timerState: MatchService.getTimerState(match.matchId)
            }
        });
    } catch (error) {
        console.error('Get active match error:', error);
        res.status(500).json({ error: 'Failed to get match' });
    }
};

exports.getMatchHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const telegramId = req.telegramId;

        const matches = await Match.find({
            $or: [
                { 'player1.telegramId': telegramId },
                { 'player2.telegramId': telegramId }
            ]
        })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Match.countDocuments({
            $or: [
                { 'player1.telegramId': telegramId },
                { 'player2.telegramId': telegramId }
            ]
        });

        res.json({
            success: true,
            matches: matches.map(m => ({
                matchId: m.matchId,
                opponent: m.player1.telegramId === telegramId
                    ? m.player2.username
                    : m.player1.username,
                won: m.winner.telegramId === telegramId,
                betAmount: m.betAmount,
                timerMode: m.timerMode,
                endReason: m.endReason,
                totalMoves: m.totalMoves,
                duration: m.duration,
                createdAt: m.createdAt
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get match history error:', error);
        res.status(500).json({ error: 'Failed to get match history' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const telegramId = req.telegramId;

        const totalMatches = await Match.countDocuments({
            $or: [
                { 'player1.telegramId': telegramId },
                { 'player2.telegramId': telegramId }
            ]
        });

        const wins = await Match.countDocuments({
            'winner.telegramId': telegramId
        });

        const losses = totalMatches - wins;

        const recentMatches = await Match.find({
            $or: [
                { 'player1.telegramId': telegramId },
                { 'player2.telegramId': telegramId }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(10);

        const recentForm = recentMatches.map(m =>
            m.winner.telegramId === telegramId ? 'W' : 'L'
        );

        res.json({
            success: true,
            stats: {
                totalMatches,
                wins,
                losses,
                winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
                recentForm
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};