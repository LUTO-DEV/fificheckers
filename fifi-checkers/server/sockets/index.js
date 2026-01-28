const { socketAuthMiddleware } = require('../middleware/auth.middleware');
const matchmakingSocket = require('./matchmaking.socket');
const matchSocket = require('./match.socket');
const chatSocket = require('./chat.socket');
const punishmentSocket = require('./punishment.socket');
const MatchService = require('../services/match.service'); // ADD THIS

// Track online users
const onlineUsers = new Map();

function initializeSockets(io) {
    // Set IO on MatchService for timeout emissions
    MatchService.setIO(io); // ADD THIS

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
        punishmentSocket(io, socket);

        // Handle disconnection - BUT with a delay!
        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${socket.telegramId} (reason: ${reason})`);

            // Don't immediately end match - give time to reconnect
            setTimeout(() => {
                // Check if user reconnected
                const currentSocketId = onlineUsers.get(socket.telegramId);

                if (currentSocketId === socket.id) {
                    // Still disconnected, remove from online
                    onlineUsers.delete(socket.telegramId);

                    // Only handle match disconnect if truly gone for 10 seconds
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
                    }, 10000); // 10 second grace period
                }
            }, 2000); // 2 second initial delay

            // Leave queue immediately (that's fine)
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