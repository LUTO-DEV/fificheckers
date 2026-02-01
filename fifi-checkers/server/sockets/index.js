const { socketAuthMiddleware } = require('../middleware/auth.middleware');
const matchmakingSocket = require('./matchmaking.socket');
const matchSocket = require('./match.socket');
const chatSocket = require('./chat.socket');
const punishmentSocket = require('./punishment.socket');
const MatchService = require('../services/match.service');

// Track online users
const onlineUsers = new Map();

function initializeSockets(io) {
    // CRITICAL: Set IO on MatchService for timeout emissions
    MatchService.setIO(io);
    console.log('✅ Socket IO initialized and passed to MatchService');

    // Authentication middleware
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.telegramId}`);

        // Track online status
        onlineUsers.set(socket.telegramId, socket.id);

        // Join personal room for direct messages
        socket.join(`user:${socket.telegramId}`);

        // Initialize all socket handlers
        matchmakingSocket(io, socket);
        matchSocket(io, socket);
        chatSocket(io, socket);
        if (punishmentSocket) punishmentSocket(io, socket);

        // Handle disconnection with delay
        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${socket.telegramId} (reason: ${reason})`);

            setTimeout(() => {
                const currentSocketId = onlineUsers.get(socket.telegramId);

                if (currentSocketId === socket.id) {
                    onlineUsers.delete(socket.telegramId);

                    setTimeout(() => {
                        const stillGone = !onlineUsers.has(socket.telegramId);
                        if (stillGone) {
                            console.log(`📴 User ${socket.telegramId} truly disconnected, ending match...`);
                            MatchService.handleDisconnect(socket.telegramId).then(result => {
                                if (result) {
                                    io.to(`match:${result.matchId}`).emit('match:end', result);
                                }
                            });
                        }
                    }, 10000);
                }
            }, 2000);

            // Leave queue immediately
            const MatchmakingService = require('../services/matchmaking.service');
            MatchmakingService.leaveQueue(socket.telegramId);
        });

        // Ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong');
        });
    });

    return { onlineUsers };
}

module.exports = { initializeSockets, onlineUsers };