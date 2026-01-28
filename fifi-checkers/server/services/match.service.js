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
    }

    createMatch(player1Data, player2Data, betAmount, timerMode, isBot = false) {
        const matchId = uuidv4();

        console.log(`🎮 Creating match ${matchId}`);
        console.log(`   Player 1: ${player1Data.username} (${player1Data.telegramId})`);
        console.log(`   Player 2: ${isBot ? 'BOT' : player2Data.username}`);
        console.log(`   Bet: ${betAmount}, Timer: ${timerMode}`);

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

        // Create and start timer
        TimerService.createTimer(matchId, timerMode, (player) => {
            console.log(`⏱️ Timeout callback for player ${player}`);
            this.handleTimeout(matchId, player);
        });

        // Start timer for white (player1)
        TimerService.startTimer(matchId, 1);

        console.log(`✅ Match ${matchId} created and timer started`);

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

        if (!match) {
            console.error(`❌ Match ${matchId} not found`);
            return { success: false, error: 'Match not found' };
        }

        if (match.status !== MATCH_STATUS.ACTIVE) {
            console.error(`❌ Match ${matchId} is ${match.status}, not active`);
            return { success: false, error: 'Match is not active' };
        }

        // Determine player number
        const playerNum = match.player1.telegramId === telegramId ? 1 :
            match.player2.telegramId === telegramId ? 2 : 0;

        if (playerNum === 0) {
            return { success: false, error: 'You are not in this match' };
        }

        const playerColor = playerNum === 1 ? 'white' : 'black';

        // Check if it's this player's turn
        if (match.currentPlayer !== playerNum) {
            return { success: false, error: 'Not your turn' };
        }

        // Handle multi-capture continuation
        if (match.multiCaptureState) {
            if (move.from.row !== match.multiCaptureState.row ||
                move.from.col !== match.multiCaptureState.col) {
                return { success: false, error: 'Must continue capturing with the same piece' };
            }

            // Validate this is a valid capture from the multi-capture position
            const availableCaptures = CheckersLogic.getMultiCaptures(
                match.boardState,
                match.multiCaptureState.row,
                match.multiCaptureState.col
            );

            const validCapture = availableCaptures.find(c =>
                c.to.row === move.to.row && c.to.col === move.to.col
            );

            if (!validCapture) {
                return { success: false, error: 'Invalid capture' };
            }

            // Execute the capture
            const newBoard = CheckersLogic.executeMove(match.boardState, validCapture, true);
            match.boardState = newBoard;
            match.lastMoveAt = Date.now();

            match.moveHistory.push({
                player: playerNum,
                move,
                isCapture: true,
                isChainCapture: true,
                timestamp: Date.now()
            });

            // Check for more captures
            const furtherCaptures = CheckersLogic.getMultiCaptures(newBoard, move.to.row, move.to.col);

            if (furtherCaptures.length > 0) {
                match.multiCaptureState = { row: move.to.row, col: move.to.col };
                return {
                    success: true,
                    board: newBoard,
                    isCapture: true,
                    multiCapture: true,
                    availableCaptures: furtherCaptures,
                    turnEnded: false,
                    timerState: TimerService.getTimerState(matchId)
                };
            }

            // No more captures, end turn
            match.multiCaptureState = null;

            // Check for game end
            const gameEnd = CheckersLogic.checkGameEnd(newBoard, playerColor);
            if (gameEnd.ended) {
                return this.endMatch(matchId, playerNum, gameEnd.reason);
            }

            // Switch turn
            match.turn = playerColor === 'white' ? 'black' : 'white';
            match.currentPlayer = playerNum === 1 ? 2 : 1;

            const timerState = TimerService.switchTimer(matchId, match.currentPlayer);

            return {
                success: true,
                board: newBoard,
                isCapture: true,
                multiCapture: false,
                turnEnded: true,
                nextPlayer: match.currentPlayer,
                timerState
            };
        }

        // Normal move validation
        const validation = CheckersLogic.validateMove(match.boardState, move, playerColor);
        if (!validation.valid) {
            console.error(`❌ Invalid move:`, validation.error);
            return { success: false, error: validation.error };
        }

        // Execute move
        const newBoard = CheckersLogic.executeMove(match.boardState, validation.move, validation.isCapture);
        match.boardState = newBoard;
        match.lastMoveAt = Date.now();

        // Record move
        match.moveHistory.push({
            player: playerNum,
            move,
            isCapture: validation.isCapture,
            timestamp: Date.now()
        });

        console.log(`♟️ Move executed: ${JSON.stringify(move)}`);

        // Check for multi-capture
        if (validation.isCapture) {
            const furtherCaptures = CheckersLogic.getMultiCaptures(newBoard, move.to.row, move.to.col);
            if (furtherCaptures.length > 0) {
                match.multiCaptureState = { row: move.to.row, col: move.to.col };
                return {
                    success: true,
                    board: newBoard,
                    isCapture: true,
                    multiCapture: true,
                    availableCaptures: furtherCaptures,
                    turnEnded: false,
                    timerState: TimerService.getTimerState(matchId)
                };
            }
        }

        // Clear multi-capture state
        match.multiCaptureState = null;

        // Check for game end
        const gameEnd = CheckersLogic.checkGameEnd(newBoard, playerColor);
        if (gameEnd.ended) {
            return this.endMatch(matchId, playerNum, gameEnd.reason);
        }

        // Switch turn
        match.turn = playerColor === 'white' ? 'black' : 'white';
        match.currentPlayer = playerNum === 1 ? 2 : 1;

        // Switch timer
        const timerState = TimerService.switchTimer(matchId, match.currentPlayer);

        console.log(`♟️ Turn switched to player ${match.currentPlayer}`);

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
        if (!match || match.currentPlayer !== 2 || !match.player2.isBot) {
            return null;
        }

        if (match.status !== MATCH_STATUS.ACTIVE) {
            return null;
        }

        console.log('🤖 Bot thinking...');

        // Add delay to feel natural
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

        // Check match is still active
        if (match.status !== MATCH_STATUS.ACTIVE) return null;

        const bestMove = BotService.getBestMove(match.boardState, 'black');

        if (!bestMove) {
            console.log('🤖 Bot has no moves - player wins!');
            return this.endMatch(matchId, 1, 'no_moves');
        }

        console.log('🤖 Bot move:', JSON.stringify(bestMove));

        // Execute the move
        const validation = CheckersLogic.validateMove(match.boardState, bestMove, 'black');
        let newBoard = CheckersLogic.executeMove(match.boardState, validation.move, validation.isCapture);

        match.moveHistory.push({
            player: 2,
            move: bestMove,
            isCapture: validation.isCapture,
            timestamp: Date.now()
        });

        // Handle multi-capture for bot
        if (validation.isCapture) {
            let currentPos = { row: bestMove.to.row, col: bestMove.to.col };

            while (true) {
                const furtherCaptures = CheckersLogic.getMultiCaptures(newBoard, currentPos.row, currentPos.col);
                if (furtherCaptures.length === 0) break;

                await new Promise(resolve => setTimeout(resolve, 400));

                const nextCapture = furtherCaptures[0];
                newBoard = CheckersLogic.executeMove(newBoard, nextCapture, true);
                currentPos = { row: nextCapture.to.row, col: nextCapture.to.col };

                match.moveHistory.push({
                    player: 2,
                    move: nextCapture,
                    isCapture: true,
                    timestamp: Date.now()
                });
            }
        }

        match.boardState = newBoard;
        match.lastMoveAt = Date.now();

        // Check for game end
        const gameEnd = CheckersLogic.checkGameEnd(newBoard, 'black');
        if (gameEnd.ended) {
            return this.endMatch(matchId, 2, gameEnd.reason);
        }

        // Switch turn back to player
        match.turn = 'white';
        match.currentPlayer = 1;
        match.multiCaptureState = null;

        const timerState = TimerService.switchTimer(matchId, 1);

        return {
            success: true,
            board: newBoard,
            move: bestMove,
            turnEnded: true,
            nextPlayer: 1,
            timerState
        };
    }

    async handleTimeout(matchId, timedOutPlayer) {
        console.log(`⏱️ Handling timeout for player ${timedOutPlayer} in match ${matchId}`);
        const winnerNum = timedOutPlayer === 1 ? 2 : 1;
        return this.endMatch(matchId, winnerNum, 'timeout');
    }

    async handleResign(matchId, telegramId) {
        const match = this.activeMatches.get(matchId);
        if (!match) return null;

        const playerNum = match.player1.telegramId === telegramId ? 1 : 2;
        const winnerNum = playerNum === 1 ? 2 : 1;

        console.log(`🏳️ Player ${playerNum} resigned in match ${matchId}`);

        return this.endMatch(matchId, winnerNum, 'resign');
    }

    async handleDisconnect(telegramId) {
        const matchId = this.playerMatches.get(telegramId);
        if (!matchId) return null;

        const match = this.activeMatches.get(matchId);
        if (!match || match.status !== MATCH_STATUS.ACTIVE) return null;

        const playerNum = match.player1.telegramId === telegramId ? 1 : 2;
        const winnerNum = playerNum === 1 ? 2 : 1;

        console.log(`📴 Player ${playerNum} disconnected from match ${matchId}`);

        return this.endMatch(matchId, winnerNum, 'disconnect');
    }

    async endMatch(matchId, winnerNum, reason) {
        const match = this.activeMatches.get(matchId);
        if (!match) return null;

        // Prevent double-ending
        if (match.status === MATCH_STATUS.FINISHED) {
            console.log(`⚠️ Match ${matchId} already finished`);
            return null;
        }

        match.status = MATCH_STATUS.FINISHED;
        TimerService.stopTimer(matchId);

        const winner = winnerNum === 1 ? match.player1 : match.player2;
        const loser = winnerNum === 1 ? match.player2 : match.player1;

        console.log(`🏁 Match ${matchId} ended!`);
        console.log(`   Winner: ${winner.username} (reason: ${reason})`);

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

        // Update winner stats (if not bot)
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
                }
            } catch (err) {
                console.error('Error updating winner:', err);
            }
        }

        // Update loser stats (if not bot)
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
                }
            } catch (err) {
                console.error('Error updating loser:', err);
            }
        }

        // Save match history
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
        } catch (err) {
            console.error('Error saving match:', err);
        }

        // Cleanup player mappings
        this.playerMatches.delete(match.player1.telegramId);
        if (!match.player2.isBot) {
            this.playerMatches.delete(match.player2.telegramId);
        }

        // Keep match briefly for result viewing, then delete
        setTimeout(() => {
            this.activeMatches.delete(matchId);
            console.log(`🗑️ Match ${matchId} removed from memory`);
        }, 60000);

        return result;
    }

    addChatMessage(matchId, telegramId, message) {
        const match = this.activeMatches.get(matchId);
        if (!match) return null;

        const playerNum = match.player1.telegramId === telegramId ? 1 : 2;
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