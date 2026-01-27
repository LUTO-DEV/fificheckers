const { socketAuthMiddleware } = require('../middleware/auth.middleware');
const matchmakingSocket = require('./matchmaking.socket');
const matchSocket = require('./match.socket');
const chatSocket = require('./chat.socket');
const punishmentSocket = require('./punishment.socket');

// Track online users
const onlineUsers = new Map();

function initializeSockets(io) {
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

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.telegramId}`);
            onlineUsers.delete(socket.telegramId);

            // Handle disconnect from match
            const MatchService = require('../services/match.service');
            MatchService.handleDisconnect(socket.telegramId).then(result => {
                if (result) {
                    io.to(`match:${result.matchId}`).emit('match:end', result);
                }
            });

            // Leave queue if in it
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