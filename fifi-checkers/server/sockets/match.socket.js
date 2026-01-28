const MatchService = require('../services/match.service');

module.exports = (io, socket) => {

    socket.on('move:make', async (data) => {
        try {
            const { matchId, move } = data;

            console.log('');
            console.log('📥 ===== MOVE FROM CLIENT =====');
            console.log('Socket:', socket.id);
            console.log('Player:', socket.telegramId);
            console.log('Match:', matchId?.slice(0, 8));
            console.log('Move:', JSON.stringify(move));
            console.log('===============================');

            const result = MatchService.validateAndExecuteMove(matchId, socket.telegramId, move);

            if (!result.success) {
                console.log('❌ Move rejected:', result.error);
                socket.emit('move:error', { error: result.error });
                return;
            }

            if (result.winner) {
                console.log('📡 Emitting match:end');
                io.to(`match:${matchId}`).emit('match:end', result);
                return;
            }

            const moveData = {
                board: result.board,
                move: move,
                isCapture: result.isCapture || false,
                multiCapture: result.multiCapture || false,
                availableCaptures: result.availableCaptures || [],
                turnEnded: result.turnEnded !== false,
                nextPlayer: result.nextPlayer,
                timerState: result.timerState
            };

            console.log('📡 Emitting move:result | Next:', result.nextPlayer);
            io.to(`match:${matchId}`).emit('move:result', moveData);

            const match = MatchService.getMatch(matchId);

            if (match && match.player2.isBot && result.turnEnded && match.currentPlayer === 2) {
                console.log('🤖 Triggering bot move...');

                setTimeout(async () => {
                    try {
                        const botResult = await MatchService.executeBotMove(matchId);

                        if (!botResult) {
                            console.log('❌ Bot returned null');
                            return;
                        }

                        if (botResult.winner) {
                            console.log('📡 Bot won - emitting match:end');
                            io.to(`match:${matchId}`).emit('match:end', botResult);
                        } else {
                            const botData = {
                                board: botResult.board,
                                move: botResult.move,
                                isBot: true,
                                isCapture: botResult.isCapture || false,
                                multiCapture: false,
                                turnEnded: true,
                                nextPlayer: 1,
                                timerState: botResult.timerState
                            };

                            console.log('📡 Emitting bot move:result');
                            io.to(`match:${matchId}`).emit('move:result', botData);
                        }
                    } catch (err) {
                        console.error('❌ Bot error:', err);
                    }
                }, 100);
            }

        } catch (error) {
            console.error('❌ Move handler error:', error);
            socket.emit('move:error', { error: 'Server error' });
        }
    });

    socket.on('match:resign', async (data) => {
        try {
            const { matchId } = data;
            console.log('🏳️ Resign:', socket.telegramId);

            const result = await MatchService.handleResign(matchId, socket.telegramId);
            if (result) {
                io.to(`match:${matchId}`).emit('match:end', result);
            }
        } catch (error) {
            console.error('Resign error:', error);
        }
    });

    socket.on('timer:sync', (data) => {
        try {
            const { matchId } = data;
            const timerState = MatchService.getTimerState(matchId);
            if (timerState) {
                socket.emit('timer:update', timerState);
            }
        } catch (error) {
            console.error('Timer sync error:', error);
        }
    });
};