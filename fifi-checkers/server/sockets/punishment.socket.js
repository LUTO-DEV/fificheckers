const MatchService = require('../services/match.service');
const { PUNISHMENTS } = require('../utils/constants');

module.exports = (io, socket) => {
    // Trigger punishment animation
    socket.on('punishment:trigger', (data) => {
        try {
            const { matchId, punishmentId } = data;

            // Verify match exists and user is the winner
            const match = MatchService.getMatch(matchId);
            if (!match) return;

            // Find punishment
            const punishment = PUNISHMENTS.find(p => p.id === punishmentId);
            if (!punishment) return;

            // Emit to both players
            io.to(`match:${matchId}`).emit('punishment:show', {
                punishmentId,
                punishment,
                triggeredBy: socket.telegramId
            });
        } catch (error) {
            console.error('Punishment error:', error);
        }
    });

    // Get available punishments
    socket.on('punishment:list', () => {
        socket.emit('punishment:list', { punishments: PUNISHMENTS });
    });
};