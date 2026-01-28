const MatchService = require('../services/match.service');

module.exports = (io, socket) => {

    socket.on('chat:send', (data) => {
        try {
            const { matchId, message, isQuickChat } = data;

            if (!matchId || !message) {
                console.log('❌ Chat: missing data');
                return;
            }

            console.log('💬 Chat from', socket.telegramId, ':', message);

            const chatMessage = MatchService.addChatMessage(matchId, socket.telegramId, message);

            if (chatMessage) {
                // Broadcast to everyone in the match room
                io.to(`match:${matchId}`).emit('chat:message', {
                    ...chatMessage,
                    isQuickChat: isQuickChat || false
                });
                console.log('💬 Chat broadcasted to match:', matchId.slice(0, 8));
            }

        } catch (error) {
            console.error('Chat error:', error);
        }
    });

};