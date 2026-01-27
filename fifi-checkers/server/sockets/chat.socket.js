const MatchService = require('../services/match.service');
const { sanitizeMessage } = require('../utils/validation.utils');
const { QUICK_CHAT_MESSAGES, MAX_CHAT_LENGTH } = require('../utils/constants');

module.exports = (io, socket) => {
    // Send chat message
    socket.on('chat:send', (data) => {
        try {
            const { matchId, message, isQuickChat } = data;

            // Validate quick chat
            if (isQuickChat && !QUICK_CHAT_MESSAGES.includes(message)) {
                return socket.emit('chat:error', { error: 'Invalid quick chat message' });
            }

            // Sanitize message
            const sanitized = sanitizeMessage(message);
            if (!sanitized) {
                return socket.emit('chat:error', { error: 'Empty message' });
            }

            // Add message to match
            const chatMessage = MatchService.addChatMessage(
                matchId,
                socket.telegramId,
                sanitized
            );

            if (chatMessage) {
                io.to(`match:${matchId}`).emit('chat:message', chatMessage);
            }
        } catch (error) {
            console.error('Chat error:', error);
        }
    });

    // Get quick chat options
    socket.on('chat:quickOptions', () => {
        socket.emit('chat:quickOptions', { messages: QUICK_CHAT_MESSAGES });
    });
};