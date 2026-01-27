const User = require('../models/User');
const MatchService = require('./match.service');
const { RANK_MATCH_RANGE, COIN_MATCH_RANGE, MATCHMAKING_TIMEOUT } = require('../utils/constants');

class MatchmakingService {
    constructor() {
        this.queue = new Map(); // telegramId -> queueEntry
        this.friendRooms = new Map(); // roomCode -> roomData
    }

    async joinQueue(playerData, betAmount, timerMode) {
        const { telegramId, username, socketId } = playerData;

        // Check if already in queue or match
        if (this.queue.has(telegramId)) {
            return { success: false, error: 'Already in queue' };
        }

        if (MatchService.getMatchByPlayer(telegramId)) {
            return { success: false, error: 'Already in a match' };
        }

        // Get user data
        const user = await User.findOne({ telegramId });
        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // Validate bet
        if (betAmount > user.coins) {
            return { success: false, error: 'Insufficient coins' };
        }

        if (user.coins === 0 && betAmount > 0) {
            return { success: false, error: 'No coins available, can only play free matches' };
        }

        // Deduct bet amount
        if (betAmount > 0) {
            user.coins -= betAmount;
            await user.save();
        }

        const queueEntry = {
            telegramId,
            username,
            socketId,
            betAmount,
            timerMode,
            rank: user.rank,
            coins: user.coins,
            joinedAt: Date.now()
        };

        // Try to find a match
        const opponent = this.findMatch(queueEntry);

        if (opponent) {
            this.queue.delete(opponent.telegramId);

            const match = MatchService.createMatch(
                opponent,
                { telegramId, username, socketId },
                betAmount,
                timerMode
            );

            return {
                success: true,
                matched: true,
                match,
                opponent
            };
        }

        // No match found, add to queue
        this.queue.set(telegramId, queueEntry);

        // Set timeout
        setTimeout(() => {
            this.handleQueueTimeout(telegramId, betAmount);
        }, MATCHMAKING_TIMEOUT);

        return {
            success: true,
            matched: false,
            position: this.queue.size
        };
    }

    findMatch(entry) {
        const RANK_ORDER = ['Wood', 'Bronze', 'Silver', 'Gold', 'Diamond'];
        const entryRankIndex = RANK_ORDER.indexOf(entry.rank);

        for (const [telegramId, candidate] of this.queue) {
            if (telegramId === entry.telegramId) continue;

            // Must have same bet amount and timer mode
            if (candidate.betAmount !== entry.betAmount) continue;
            if (candidate.timerMode !== entry.timerMode) continue;

            // Check rank proximity
            const candidateRankIndex = RANK_ORDER.indexOf(candidate.rank);
            if (Math.abs(entryRankIndex - candidateRankIndex) <= RANK_MATCH_RANGE) {
                return candidate;
            }
        }

        // If no rank match, find anyone with same bet/timer after 10 seconds
        for (const [telegramId, candidate] of this.queue) {
            if (telegramId === entry.telegramId) continue;
            if (candidate.betAmount !== entry.betAmount) continue;
            if (candidate.timerMode !== entry.timerMode) continue;

            if (Date.now() - candidate.joinedAt > 10000) {
                return candidate;
            }
        }

        return null;
    }

    async leaveQueue(telegramId) {
        const entry = this.queue.get(telegramId);
        if (!entry) {
            return { success: false, error: 'Not in queue' };
        }

        this.queue.delete(telegramId);

        // Refund bet
        if (entry.betAmount > 0) {
            const user = await User.findOne({ telegramId });
            if (user) {
                user.coins += entry.betAmount;
                await user.save();
            }
        }

        return { success: true };
    }

    async handleQueueTimeout(telegramId, betAmount) {
        const entry = this.queue.get(telegramId);
        if (!entry) return null; // Already matched or left

        this.queue.delete(telegramId);

        // Refund bet
        if (betAmount > 0) {
            const user = await User.findOne({ telegramId });
            if (user) {
                user.coins += betAmount;
                await user.save();
            }
        }

        return { telegramId, timeout: true };
    }

    getQueuePosition(telegramId) {
        if (!this.queue.has(telegramId)) return -1;

        let position = 1;
        for (const [id] of this.queue) {
            if (id === telegramId) return position;
            position++;
        }
        return -1;
    }

    getQueueSize() {
        return this.queue.size;
    }

    // Friend room methods
    createFriendRoom(hostData, betAmount, timerMode) {
        const roomCode = this.generateRoomCode();

        const room = {
            code: roomCode,
            host: {
                telegramId: hostData.telegramId,
                username: hostData.username,
                socketId: hostData.socketId
            },
            guest: null,
            betAmount,
            timerMode,
            createdAt: Date.now()
        };

        this.friendRooms.set(roomCode, room);

        // Auto-expire after 5 minutes
        setTimeout(() => {
            if (this.friendRooms.has(roomCode) && !this.friendRooms.get(roomCode).guest) {
                this.friendRooms.delete(roomCode);
            }
        }, 300000);

        return { success: true, roomCode, room };
    }

    async joinFriendRoom(roomCode, guestData) {
        const room = this.friendRooms.get(roomCode);

        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.guest) {
            return { success: false, error: 'Room is full' };
        }

        if (room.host.telegramId === guestData.telegramId) {
            return { success: false, error: 'Cannot join your own room' };
        }

        // Check if guest has enough coins
        const guestUser = await User.findOne({ telegramId: guestData.telegramId });
        if (!guestUser || guestUser.coins < room.betAmount) {
            return { success: false, error: 'Insufficient coins' };
        }

        // Deduct coins from both players
        if (room.betAmount > 0) {
            const hostUser = await User.findOne({ telegramId: room.host.telegramId });
            if (!hostUser || hostUser.coins < room.betAmount) {
                this.friendRooms.delete(roomCode);
                return { success: false, error: 'Host has insufficient coins' };
            }

            hostUser.coins -= room.betAmount;
            guestUser.coins -= room.betAmount;
            await hostUser.save();
            await guestUser.save();
        }

        room.guest = {
            telegramId: guestData.telegramId,
            username: guestData.username,
            socketId: guestData.socketId
        };

        // Create match
        const match = MatchService.createMatch(
            room.host,
            room.guest,
            room.betAmount,
            room.timerMode
        );

        this.friendRooms.delete(roomCode);

        return { success: true, match, room };
    }

    getFriendRoom(roomCode) {
        return this.friendRooms.get(roomCode);
    }

    closeFriendRoom(roomCode, telegramId) {
        const room = this.friendRooms.get(roomCode);
        if (!room) return { success: false, error: 'Room not found' };
        if (room.host.telegramId !== telegramId) {
            return { success: false, error: 'Only host can close room' };
        }

        this.friendRooms.delete(roomCode);
        return { success: true };
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Bot match
    async createBotMatch(playerData, betAmount, timerMode) {
        const user = await User.findOne({ telegramId: playerData.telegramId });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        if (betAmount > user.coins) {
            return { success: false, error: 'Insufficient coins' };
        }

        // Deduct bet
        if (betAmount > 0) {
            user.coins -= betAmount;
            await user.save();
        }

        const match = MatchService.createMatch(
            playerData,
            null,
            betAmount,
            timerMode,
            true // isBot
        );

        return { success: true, match };
    }
}

module.exports = new MatchmakingService();