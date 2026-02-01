const { v4: uuidv4 } = require('uuid');
const { createInitialBoard } = require('../utils/board.utils');
const CheckersLogic = require('../utils/checkers.logic');
const TimerService = require('./timer.service');
const BotService = require('./bot.service');
const User = require('../models/User');
const Match = require('../models/Match');
const { MATCH_STATUS } = require('../utils/constants');

class MatchService {
    constructor() {
        this.activeMatches = new Map();
        this.playerMatches = new Map();
        this.io = null;
    }

    setIO(io) {
        this.io = io;
        console.log('✅ MatchService IO initialized');
    }

    createMatch(player1Data, player2Data, betAmount, timerMode, isBot = false) {
        const matchId = uuidv4();

        console.log('');
        console.log('🎮 ========== CREATING MATCH ==========');
        console.log('Match ID:', matchId);
        console.log('Player 1:', player1Data.username);
        console.log('Player 2:', isBot ? 'BOT' : player2Data?.username);
        console.log('Bet:', betAmount, '| Timer:', timerMode);
        console.log('=======================================');

        const match = {
            matchId,
            player1: {
                telegramId: player1Data.telegramId,
                username: player1Data.username,
                socketId: player1Data.socketId,
                color: 'white'
            },
            player2: {
                telegramId: isBot ? 'BOT' : player2Data.telegramId,
                username: isBot ? '🤖 FiFi Bot' : player2Data.username,
                socketId: isBot ? null : player2Data.socketId,
                color: 'black',
                isBot
            },
            boardState: createInitialBoard(),
            turn: 'white',
            currentPlayer: 1,
            betAmount,
            timerMode,
            moveHistory: [],
            chatHistory: [],
            status: MATCH_STATUS.ACTIVE,
            createdAt: Date.now(),
            lastMoveAt: null,
            multiCaptureState: null
        };

        this.activeMatches.set(matchId, match);
        this.playerMatches.set(player1Data.telegramId, matchId);
        if (!isBot) {
            this.playerMatches.set(player2Data.telegramId, matchId);
        }

        // Create timer with timeout callback
        const self = this;
        TimerService.createTimer(matchId, timerMode, async (timedOutPlayer) => {
            console.log('');
            console.log('⏱️ ========== TIMEOUT TRIGGERED ==========');
            console.log('⏱️ Match:', matchId.slice(0, 8));
            console.log('⏱️ Timed out player:', timedOutPlayer);
            console.log('⏱️ =========================================');

            try {
                // Determine winner (opponent of timed out player)
                const winnerNum = timedOutPlayer === 1 ? 2 : 1;

                // End the match
                const result = await self.endMatch(matchId, winnerNum, 'timeout');

                if (result && self.io) {
                    console.log('⏱️ Emitting match:end to room');
                    self.io.to(`match:${matchId}`).emit('match:end', result);
                } else {
                    console.log('⏱️ No result or no IO to emit');
                }
            } catch (err) {
                console.error('⏱️ Timeout handler error:', err);
            }
        });

        // Start player 1's timer
        TimerService.startTimer(matchId, 1);

        console.log('✅ Match created and timer started');

        return match;
    }

    getMatch(matchId) {
        return this.activeMatches.get(matchId);
    }

    getMatchByPlayer(telegramId) {
        const matchId = this.playerMatches.get(telegramId);
        if (!matchId) return null;
        return this.activeMatches.get(matchId);
    }

    validateAndExecuteMove(matchId, telegramId, move) {
        const match = this.activeMatches.get(matchId);

        console.log('');
        console.log('♟️ ========== PROCESSING MOVE ==========');
        console.log('Match:', matchId?.slice(0, 8));
        console.log('Player:', telegramId);
        console.log('Move:', JSON.stringify(move));

        if (!match) {
            console.log('❌ Match not found');
            return { success: false, error: 'Match not found' };
        }

        // Allow the final winning move even if status just changed
        if (match.status !== MATCH_STATUS.ACTIVE) {
            // If match just finished, return success with current board
            if (match.status === MATCH_STATUS.FINISHED) {
                console.log('⚠️ Match already finished');
                return {
                    success: true,
                    board: match.boardState,
                    turnEnded: true,
                    gameEnded: true
                };
            }
            console.log('❌ Match not active:', match.status);
            return { success: false, error: 'Match is not active' };
        }

        const playerNum = match.player1.telegramId === telegramId ? 1 :
            match.player2.telegramId === telegramId ? 2 : 0;

        if (playerNum === 0) {
            console.log('❌ Player not in match');
            return { success: false, error: 'You are not in this match' };
        }

        const playerColor = playerNum === 1 ? 'white' : 'black';

        console.log('Player Num:', playerNum, '| Color:', playerColor);
        console.log('Current Player:', match.currentPlayer);

        if (match.currentPlayer !== playerNum) {
            console.log('❌ Not your turn');
            return { success: false, error: 'Not your turn' };
        }

        // Check multi-capture state
        if (match.multiCaptureState) {
            if (move.from.row !== match.multiCaptureState.row ||
                move.from.col !== match.multiCaptureState.col) {
                console.log('❌ Must continue with same piece');
                return { success: false, error: 'Must continue capturing with the same piece' };
            }
        }

        const validation = CheckersLogic.validateMove(match.boardState, move, playerColor);

        if (!validation.valid) {
            console.log('❌ Invalid move:', validation.error);
            return { success: false, error: validation.error };
        }

        console.log('✅ Move valid | Capture:', validation.isCapture);

        // Execute move
        const newBoard = CheckersLogic.executeMove(match.boardState, validation.move, validation.isCapture);
        match.boardState = newBoard;
        match.lastMoveAt = Date.now();

        match.moveHistory.push({
            player: playerNum,
            move,
            isCapture: validation.isCapture,
            timestamp: Date.now()
        });

        // Check for multi-capture FIRST
        if (validation.isCapture) {
            const furtherCaptures = CheckersLogic.getMultiCaptures(newBoard, move.to.row, move.to.col);
            console.log('Further captures available:', furtherCaptures.length);

            if (furtherCaptures.length > 0) {
                match.multiCaptureState = { row: move.to.row, col: move.to.col };
                console.log('🔄 Multi-capture! Player continues...');
                console.log('=========================================');

                return {
                    success: true,
                    board: newBoard,
                    isCapture: true,
                    multiCapture: true,
                    availableCaptures: furtherCaptures,
                    turnEnded: false,
                    nextPlayer: playerNum,
                    timerState: TimerService.getTimerState(matchId)
                };
            }
        }

        // Clear multi-capture state
        match.multiCaptureState = null;

        // Check game end AFTER move is complete
        const gameEnd = CheckersLogic.checkGameEnd(newBoard, playerColor);

        if (gameEnd.ended) {
            console.log('🏁 Game ended! Winner:', gameEnd.winner, 'Reason:', gameEnd.reason);

            // DON'T call endMatch here - return the move result with gameEnded flag
            // The socket handler will send the move first, then end the match
            return {
                success: true,
                board: newBoard,
                isCapture: validation.isCapture,
                multiCapture: false,
                turnEnded: true,
                nextPlayer: playerNum === 1 ? 2 : 1,
                timerState: TimerService.getTimerState(matchId),
                gameEnded: true,
                winnerNum: playerNum,
                endReason: gameEnd.reason
            };
        }

        // Switch turn
        match.turn = playerColor === 'white' ? 'black' : 'white';
        match.currentPlayer = playerNum === 1 ? 2 : 1;

        // Switch timer
        const timerState = TimerService.switchTimer(matchId, match.currentPlayer);

        console.log('✅ Turn complete. Next player:', match.currentPlayer);
        console.log('=========================================');

        return {
            success: true,
            board: newBoard,
            isCapture: validation.isCapture,
            multiCapture: false,
            turnEnded: true,
            nextPlayer: match.currentPlayer,
            timerState
        };
    }
    async executeBotMove(matchId) {
        const match = this.activeMatches.get(matchId);

        console.log('');
        console.log('🤖 ========== BOT TURN ==========');

        if (!match) {
            console.log('❌ Match not found');
            return null;
        }

        if (match.currentPlayer !== 2) {
            console.log('❌ Not bot turn. Current:', match.currentPlayer);
            return null;
        }

        if (!match.player2.isBot) {
            console.log('❌ Player 2 is not bot');
            return null;
        }

        if (match.status !== MATCH_STATUS.ACTIVE) {
            console.log('❌ Match not active:', match.status);
            return null;
        }

        // Simulate thinking
        await new Promise(r => setTimeout(r, 600 + Math.random() * 600));

        if (match.status !== MATCH_STATUS.ACTIVE) {
            console.log('❌ Match ended while bot was thinking');
            return null;
        }

        try {
            const bestMove = BotService.getBestMove(match.boardState, 'black');

            if (!bestMove) {
                console.log('🤖 No valid moves - Player wins!');
                return this.endMatch(matchId, 1, 'no_moves');
            }

            console.log('🤖 Best move:', JSON.stringify(bestMove));

            const validation = CheckersLogic.validateMove(match.boardState, bestMove, 'black');

            if (!validation.valid) {
                console.log('❌ Bot move invalid:', validation.error);
                return null;
            }

            let newBoard = CheckersLogic.executeMove(match.boardState, validation.move, validation.isCapture);

            match.moveHistory.push({
                player: 2,
                move: bestMove,
                isCapture: validation.isCapture,
                timestamp: Date.now()
            });

            // Handle chain captures
            if (validation.isCapture) {
                let currentRow = bestMove.to.row;
                let currentCol = bestMove.to.col;
                let chainCount = 0;

                while (chainCount < 12) {
                    const furtherCaptures = CheckersLogic.getMultiCaptures(newBoard, currentRow, currentCol);

                    if (furtherCaptures.length === 0) break;

                    console.log('🤖 Chain capture', chainCount + 1);

                    const nextCapture = furtherCaptures[0];
                    newBoard = CheckersLogic.executeMove(newBoard, nextCapture, true);

                    currentRow = nextCapture.to.row;
                    currentCol = nextCapture.to.col;

                    match.moveHistory.push({
                        player: 2,
                        move: nextCapture,
                        isCapture: true,
                        timestamp: Date.now()
                    });

                    chainCount++;
                }
            }

            match.boardState = newBoard;
            match.lastMoveAt = Date.now();

            // Check game end
            const gameEnd = CheckersLogic.checkGameEnd(newBoard, 'black');
            if (gameEnd.ended) {
                console.log('🤖 Bot won!');
                return this.endMatch(matchId, 2, gameEnd.reason);
            }

            // Switch turn back to player
            match.turn = 'white';
            match.currentPlayer = 1;
            match.multiCaptureState = null;

            const timerState = TimerService.switchTimer(matchId, 1);

            console.log('🤖 Bot done. Player 1 turn');
            console.log('=================================');

            return {
                success: true,
                board: newBoard,
                move: bestMove,
                isCapture: validation.isCapture,
                turnEnded: true,
                nextPlayer: 1,
                timerState
            };

        } catch (error) {
            console.error('❌ Bot error:', error.message);
            return null;
        }
    }

    async handleDisconnect(telegramId) {
        const matchId = this.playerMatches.get(telegramId);
        if (!matchId) return null;

        const match = this.activeMatches.get(matchId);
        if (!match || match.status !== MATCH_STATUS.ACTIVE) return null;

        const playerNum = match.player1.telegramId === telegramId ? 1 : 2;
        const winnerNum = playerNum === 1 ? 2 : 1;

        console.log('📴 Ending match due to disconnect. Winner: Player', winnerNum);

        return this.endMatch(matchId, winnerNum, 'disconnect');
    }

    async handleResign(matchId, telegramId) {
        const match = this.activeMatches.get(matchId);
        if (!match) return null;

        const playerNum = match.player1.telegramId === telegramId ? 1 : 2;
        const winnerNum = playerNum === 1 ? 2 : 1;

        console.log('🏳️ Player', playerNum, 'resigned');

        return this.endMatch(matchId, winnerNum, 'resign');
    }

    async endMatch(matchId, winnerNum, reason) {
        const match = this.activeMatches.get(matchId);
        if (!match) return null;

        if (match.status === MATCH_STATUS.FINISHED) {
            console.log('⚠️ Match already finished');
            return null;
        }

        match.status = MATCH_STATUS.FINISHED;
        TimerService.stopTimer(matchId);

        const winner = winnerNum === 1 ? match.player1 : match.player2;
        const loser = winnerNum === 1 ? match.player2 : match.player1;

        console.log('');
        console.log('🏁 ========== MATCH ENDED ==========');
        console.log('Match ID:', matchId.slice(0, 8));
        console.log('Winner:', winner.username, '(Player', winnerNum + ')');
        console.log('Loser:', loser.username);
        console.log('Reason:', reason);
        console.log('====================================');

        const result = {
            matchId,
            winner: {
                telegramId: winner.telegramId,
                username: winner.username,
                playerNum: winnerNum
            },
            loser: {
                telegramId: loser.telegramId,
                username: loser.username,
                playerNum: winnerNum === 1 ? 2 : 1
            },
            reason,
            betAmount: match.betAmount,
            coinsWon: match.betAmount * 2,
            totalMoves: match.moveHistory.length,
            duration: Math.floor((Date.now() - match.createdAt) / 1000)
        };

        // Update winner stats
        if (!winner.isBot && winner.telegramId !== 'BOT') {
            try {
                const winnerUser = await User.findOne({ telegramId: winner.telegramId });
                if (winnerUser) {
                    winnerUser.addWin(match.betAmount * 2);
                    await winnerUser.save();
                    result.winner.newStats = {
                        coins: winnerUser.coins,
                        wins: winnerUser.wins,
                        winStreak: winnerUser.winStreak,
                        rank: winnerUser.rank
                    };
                    console.log('✅ Winner stats updated:', winnerUser.username);
                }
            } catch (err) {
                console.error('Winner update error:', err);
            }
        }

        // Update loser stats
        if (!loser.isBot && loser.telegramId !== 'BOT') {
            try {
                const loserUser = await User.findOne({ telegramId: loser.telegramId });
                if (loserUser) {
                    loserUser.addLoss();
                    await loserUser.save();
                    result.loser.newStats = {
                        coins: loserUser.coins,
                        losses: loserUser.losses,
                        winStreak: 0,
                        rank: loserUser.rank
                    };
                    console.log('✅ Loser stats updated:', loserUser.username);
                }
            } catch (err) {
                console.error('Loser update error:', err);
            }
        }

        // Save match to database
        try {
            await Match.create({
                matchId,
                player1: { telegramId: match.player1.telegramId, username: match.player1.username },
                player2: { telegramId: match.player2.telegramId, username: match.player2.username },
                winner: { telegramId: winner.telegramId, username: winner.username },
                betAmount: match.betAmount,
                timerMode: match.timerMode,
                endReason: reason,
                totalMoves: match.moveHistory.length,
                duration: result.duration
            });
            console.log('✅ Match saved to database');
        } catch (err) {
            console.error('Match save error:', err);
        }

        // Cleanup player mappings
        this.playerMatches.delete(match.player1.telegramId);
        if (!match.player2.isBot) {
            this.playerMatches.delete(match.player2.telegramId);
        }

        // Remove from memory after 1 minute
        setTimeout(() => {
            this.activeMatches.delete(matchId);
            console.log('🗑️ Match removed from memory:', matchId.slice(0, 8));
        }, 60000);

        return result;
    }

    addChatMessage(matchId, telegramId, message) {
        const match = this.activeMatches.get(matchId);
        if (!match) {
            console.log('❌ Chat: Match not found');
            return null;
        }

        const playerNum = match.player1.telegramId === telegramId ? 1 :
            match.player2.telegramId === telegramId ? 2 : 0;

        if (playerNum === 0) {
            console.log('❌ Chat: Player not in match');
            return null;
        }

        const username = playerNum === 1 ? match.player1.username : match.player2.username;

        const chatMessage = {
            player: playerNum,
            username,
            message: message.slice(0, 120),
            timestamp: Date.now()
        };

        match.chatHistory.push(chatMessage);

        if (match.chatHistory.length > 50) {
            match.chatHistory.shift();
        }

        return chatMessage;
    }

    getTimerState(matchId) {
        return TimerService.getTimerState(matchId);
    }
}

module.exports = new MatchService();