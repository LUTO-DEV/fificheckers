const MatchService = require('../services/match.service');
const TimerService = require('../services/timer.service');

module.exports = (io, socket) => {
    // Make a move
    socket.on('move:make', async (data) => {
        try {
            const { matchId, move } = data;

            console.log(`♟️ Move received from ${socket.telegramId}:`, move);

            const result = MatchService.validateAndExecuteMove(
                matchId,
                socket.telegramId,
                move
            );

            if (!result.success) {
                console.log(`❌ Move rejected: ${result.error}`);
                return socket.emit('move:error', { error: result.error });
            }

            // If match ended
            if (result.winner) {
                io.to(`match:${matchId}`).emit('match:end', result);
                return;
            }

            // Emit move result to all players in match
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
                // Small delay before bot moves
                setTimeout(async () => {
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
                }, 500);
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

            console.log(`🏳️ Player ${socket.telegramId} resigning from ${matchId}`);

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

    // Periodic timer sync - THIS IS IMPORTANT!
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

    // Join match room (for reconnection)
    socket.on('match:join', (data) => {
        try {
            const { matchId } = data;
            socket.join(`match:${matchId}`);

            const match = MatchService.getMatch(matchId);
            const timerState = MatchService.getTimerState(matchId);

            if (match) {
                socket.emit('match:state', {
                    matchId: match.matchId,
                    boardState: match.boardState,
                    turn: match.turn,
                    currentPlayer: match.currentPlayer,
                    player1: match.player1,
                    player2: match.player2,
                    betAmount: match.betAmount,
                    timerMode: match.timerMode,
                    status: match.status,
                    timerState
                });
            }
        } catch (error) {
            console.error('Match join error:', error);
        }
    });
};