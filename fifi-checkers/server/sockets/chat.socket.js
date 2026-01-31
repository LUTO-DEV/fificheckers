const MatchService = require('../services/match.service');
const { QUICK_CHAT_MESSAGES, MAX_CHAT_LENGTH } = require('../utils/constants');

// Simple sanitize if validation.utils doesn't exist
function sanitizeMessage(message) {
    if (!message || typeof message !== 'string') return null;
    return message.trim().slice(0, 120).replace(/<[^>]*>/g, '');
}

module.exports = (io, socket) => {

    socket.on('chat:send', (data) => {
        try {
            const { matchId, message, isQuickChat } = data;

            console.log('');
            console.log('💬 ========== CHAT ==========');
            console.log('From:', socket.telegramId);
            console.log('Match:', matchId?.slice(0, 8));
            console.log('Message:', message);

            if (!matchId || !message) {
                console.log('❌ Missing matchId or message');
                return socket.emit('chat:error', { error: 'Missing data' });
            }

            // CRITICAL: Join the match room if not already in it
            const roomName = `match:${matchId}`;
            if (!socket.rooms.has(roomName)) {
                socket.join(roomName);
                console.log('📍 Joined room:', roomName);
            }

            // Log current rooms
            console.log('📍 Socket rooms:', Array.from(socket.rooms));

            // Sanitize
            const sanitized = sanitizeMessage(message);
            if (!sanitized) {
                console.log('❌ Empty after sanitize');
                return socket.emit('chat:error', { error: 'Empty message' });
            }

            // Add to match
            const chatMessage = MatchService.addChatMessage(matchId, socket.telegramId, sanitized);

            if (chatMessage) {
                console.log('✅ Broadcasting chat to:', roomName);
                io.to(roomName).emit('chat:message', chatMessage);
                console.log('✅ Chat sent!');
            } else {
                console.log('❌ addChatMessage returned null');
                socket.emit('chat:error', { error: 'Could not send' });
            }

            console.log('=============================');

        } catch (error) {
            console.error('❌ Chat error:', error);
        }
    });

    socket.on('chat:quickOptions', () => {
        socket.emit('chat:quickOptions', { messages: QUICK_CHAT_MESSAGES || [] });
    });
};