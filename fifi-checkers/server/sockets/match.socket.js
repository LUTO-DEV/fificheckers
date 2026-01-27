const MatchService = require('../services/match.service');

module.exports = (io, socket) => {
    // Make a move
    socket.on('move:make', async (data) => {
        try {
            const { matchId, move } = data;

            const result = MatchService.validateAndExecuteMove(
                matchId,
                socket.telegramId,
                move
            );

            if (!result.success) {
                return socket.emit('move:error', { error: result.error });
            }

            // If match ended
            if (result.winner) {
                io.to(`match:${matchId}`).emit('match:end', result);
                return;
            }

            // Emit move result
            io.to(`match:${matchId}`).emit('move:result', {
                board: result.board,
                move,
                isCapture: result.isCapture,
                multiCapture: result.multiCapture,
                availableCaptures: result.availableCaptures,
                turnEnded: result.turnEnded,
                nextPlayer: result.nextPlayer,
                timerState: result.timerState
            });

            // If playing against bot and turn ended, execute bot move
            const match = MatchService.getMatch(matchId);
            if (match && match.player2.isBot && result.turnEnded && match.currentPlayer === 2) {
                const botResult = await MatchService.executeBotMove(matchId);

                if (botResult) {
                    if (botResult.winner) {
                        io.to(`match:${matchId}`).emit('match:end', botResult);
                    } else {
                        io.to(`match:${matchId}`).emit('move:result', {
                            board: botResult.board,
                            move: botResult.move,
                            isBot: true,
                            turnEnded: botResult.turnEnded,
                            nextPlayer: botResult.nextPlayer,
                            timerState: botResult.timerState
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Move error:', error);
            socket.emit('move:error', { error: 'Failed to make move' });
        }
    });

    // Resign
    socket.on('match:resign', async (data) => {
        try {
            const { matchId } = data;

            const result = await MatchService.handleResign(matchId, socket.telegramId);

            if (result) {
                io.to(`match:${matchId}`).emit('match:end', result);
            }
        } catch (error) {
            console.error('Resign error:', error);
        }
    });

    // Request timer state
    socket.on('timer:get', (data) => {
        try {
            const { matchId } = data;
            const timerState = MatchService.getTimerState(matchId);

            if (timerState) {
                socket.emit('timer:update', timerState);
            }
        } catch (error) {
            console.error('Timer get error:', error);
        }
    });

    // Periodic timer sync
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