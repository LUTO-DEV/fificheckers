const MatchmakingService = require('../services/matchmaking.service');
const User = require('../models/User');

module.exports = (io, socket) => {
    // Join matchmaking queue
    socket.on('queue:join', async (data) => {
        try {
            const { betAmount = 0, timerMode = 'BLITZ' } = data;

            const user = await User.findOne({ telegramId: socket.telegramId });
            if (!user) {
                return socket.emit('queue:error', { error: 'User not found' });
            }

            const result = await MatchmakingService.joinQueue(
                {
                    telegramId: socket.telegramId,
                    username: socket.username,
                    socketId: socket.id
                },
                betAmount,
                timerMode
            );

            if (!result.success) {
                return socket.emit('queue:error', { error: result.error });
            }

            if (result.matched) {
                // Both players join match room
                const matchRoom = `match:${result.match.matchId}`;
                socket.join(matchRoom);

                const opponentSocket = io.sockets.sockets.get(result.opponent.socketId);
                if (opponentSocket) {
                    opponentSocket.join(matchRoom);
                }

                // Notify both players
                io.to(matchRoom).emit('match:start', {
                    matchId: result.match.matchId,
                    player1: {
                        telegramId: result.match.player1.telegramId,
                        username: result.match.player1.username,
                        color: 'white'
                    },
                    player2: {
                        telegramId: result.match.player2.telegramId,
                        username: result.match.player2.username,
                        color: 'black'
                    },
                    boardState: result.match.boardState,
                    turn: 'white',
                    betAmount: result.match.betAmount,
                    timerMode: result.match.timerMode
                });
            } else {
                socket.emit('queue:joined', {
                    position: result.position,
                    betAmount,
                    timerMode
                });
            }
        } catch (error) {
            console.error('Queue join error:', error);
            socket.emit('queue:error', { error: 'Failed to join queue' });
        }
    });

    // Leave queue
    socket.on('queue:leave', async () => {
        try {
            const result = await MatchmakingService.leaveQueue(socket.telegramId);

            if (result.success) {
                socket.emit('queue:left', { refunded: true });
            } else {
                socket.emit('queue:error', { error: result.error });
            }
        } catch (error) {
            console.error('Queue leave error:', error);
            socket.emit('queue:error', { error: 'Failed to leave queue' });
        }
    });

    // Create friend room
    socket.on('room:create', async (data) => {
        try {
            const { betAmount = 0, timerMode = 'BLITZ' } = data;

            const result = MatchmakingService.createFriendRoom(
                {
                    telegramId: socket.telegramId,
                    username: socket.username,
                    socketId: socket.id
                },
                betAmount,
                timerMode
            );

            if (result.success) {
                socket.join(`room:${result.roomCode}`);
                socket.emit('room:created', {
                    roomCode: result.roomCode,
                    betAmount,
                    timerMode
                });
            }
        } catch (error) {
            console.error('Room create error:', error);
            socket.emit('room:error', { error: 'Failed to create room' });
        }
    });

    // Join friend room
    socket.on('room:join', async (data) => {
        try {
            const { roomCode } = data;

            const result = await MatchmakingService.joinFriendRoom(roomCode, {
                telegramId: socket.telegramId,
                username: socket.username,
                socketId: socket.id
            });

            if (!result.success) {
                return socket.emit('room:error', { error: result.error });
            }

            const matchRoom = `match:${result.match.matchId}`;
            socket.join(matchRoom);

            const hostSocket = io.sockets.sockets.get(result.room.host.socketId);
            if (hostSocket) {
                hostSocket.leave(`room:${roomCode}`);
                hostSocket.join(matchRoom);
            }

            io.to(matchRoom).emit('match:start', {
                matchId: result.match.matchId,
                player1: {
                    telegramId: result.match.player1.telegramId,
                    username: result.match.player1.username,
                    color: 'white'
                },
                player2: {
                    telegramId: result.match.player2.telegramId,
                    username: result.match.player2.username,
                    color: 'black'
                },
                boardState: result.match.boardState,
                turn: 'white',
                betAmount: result.match.betAmount,
                timerMode: result.match.timerMode
            });
        } catch (error) {
            console.error('Room join error:', error);
            socket.emit('room:error', { error: 'Failed to join room' });
        }
    });

    // Close friend room
    socket.on('room:close', (data) => {
        try {
            const { roomCode } = data;
            const result = MatchmakingService.closeFriendRoom(roomCode, socket.telegramId);

            if (result.success) {
                socket.leave(`room:${roomCode}`);
                socket.emit('room:closed');
            }
        } catch (error) {
            console.error('Room close error:', error);
        }
    });

    // Start bot match
    socket.on('bot:start', async (data) => {
        try {
            const { betAmount = 0, timerMode = 'BLITZ' } = data;

            const result = await MatchmakingService.createBotMatch(
                {
                    telegramId: socket.telegramId,
                    username: socket.username,
                    socketId: socket.id
                },
                betAmount,
                timerMode
            );

            if (!result.success) {
                return socket.emit('bot:error', { error: result.error });
            }

            const matchRoom = `match:${result.match.matchId}`;
            socket.join(matchRoom);

            socket.emit('match:start', {
                matchId: result.match.matchId,
                player1: {
                    telegramId: result.match.player1.telegramId,
                    username: result.match.player1.username,
                    color: 'white'
                },
                player2: {
                    telegramId: 'BOT',
                    username: '🤖 FiFi Bot',
                    color: 'black',
                    isBot: true
                },
                boardState: result.match.boardState,
                turn: 'white',
                betAmount: result.match.betAmount,
                timerMode: result.match.timerMode,
                isBot: true
            });
        } catch (error) {
            console.error('Bot start error:', error);
            socket.emit('bot:error', { error: 'Failed to start bot match' });
        }
    });
};