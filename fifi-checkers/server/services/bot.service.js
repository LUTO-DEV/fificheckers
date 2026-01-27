const CheckersLogic = require('../utils/checkers.logic');
const { cloneBoard, countPieces } = require('../utils/board.utils');
const { PIECE, BOARD_SIZE } = require('../utils/constants');

class BotService {
    static getBestMove(board, botColor) {
        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, botColor);

        const availableMoves = mustCapture ? captures : moves;

        if (availableMoves.length === 0) return null;

        // Use minimax with alpha-beta pruning for best move
        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of availableMoves) {
            const isCapture = mustCapture;
            const newBoard = CheckersLogic.executeMove(board, move, isCapture);

            // Check for multi-capture
            let finalBoard = newBoard;
            if (isCapture) {
                const multiCaptures = CheckersLogic.getMultiCaptures(newBoard, move.to.row, move.to.col);
                if (multiCaptures.length > 0) {
                    // Recursively find best multi-capture path
                    finalBoard = this.executeBestMultiCapture(newBoard, move.to.row, move.to.col, botColor);
                }
            }

            const score = this.minimax(finalBoard, 4, -Infinity, Infinity, false, botColor);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    static executeBestMultiCapture(board, row, col, botColor) {
        const captures = CheckersLogic.getMultiCaptures(board, row, col);

        if (captures.length === 0) return board;

        let bestBoard = board;
        let bestScore = -Infinity;

        for (const capture of captures) {
            const newBoard = CheckersLogic.executeMove(board, capture, true);
            const furtherBoard = this.executeBestMultiCapture(newBoard, capture.to.row, capture.to.col, botColor);
            const score = this.evaluatePosition(furtherBoard, botColor);

            if (score > bestScore) {
                bestScore = score;
                bestBoard = furtherBoard;
            }
        }

        return bestBoard;
    }

    static minimax(board, depth, alpha, beta, isMaximizing, botColor) {
        const opponentColor = botColor === 'black' ? 'white' : 'black';

        // Check for game end
        const gameEnd = CheckersLogic.checkGameEnd(board, isMaximizing ? opponentColor : botColor);
        if (gameEnd.ended) {
            if (gameEnd.winner === botColor) return 10000 + depth;
            return -10000 - depth;
        }

        if (depth === 0) {
            return this.evaluatePosition(board, botColor);
        }

        const currentColor = isMaximizing ? botColor : opponentColor;
        const { moves, captures, mustCapture } = CheckersLogic.getAllValidMoves(board, currentColor);
        const availableMoves = mustCapture ? captures : moves;

        if (availableMoves.length === 0) {
            return isMaximizing ? -10000 : 10000;
        }

        if (isMaximizing) {
            let maxScore = -Infinity;

            for (const move of availableMoves) {
                const newBoard = CheckersLogic.executeMove(board, move, mustCapture);
                const score = this.minimax(newBoard, depth - 1, alpha, beta, false, botColor);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }

            return maxScore;
        } else {
            let minScore = Infinity;

            for (const move of availableMoves) {
                const newBoard = CheckersLogic.executeMove(board, move, mustCapture);
                const score = this.minimax(newBoard, depth - 1, alpha, beta, true, botColor);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }

            return minScore;
        }
    }

    static evaluatePosition(board, botColor) {
        let score = 0;
        const opponentColor = botColor === 'black' ? 'white' : 'black';

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                if (piece === PIECE.EMPTY) continue;

                let pieceValue = 0;
                let isBot = false;

                switch (piece) {
                    case PIECE.BLACK:
                        pieceValue = 100;
                        isBot = botColor === 'black';
                        // Position bonus - closer to promotion
                        pieceValue += row * 5;
                        break;
                    case PIECE.WHITE:
                        pieceValue = 100;
                        isBot = botColor === 'white';
                        // Position bonus - closer to promotion
                        pieceValue += (7 - row) * 5;
                        break;
                    case PIECE.BLACK_KING:
                        pieceValue = 300;
                        isBot = botColor === 'black';
                        // Center control bonus for kings
                        pieceValue += this.getCenterBonus(row, col);
                        break;
                    case PIECE.WHITE_KING:
                        pieceValue = 300;
                        isBot = botColor === 'white';
                        // Center control bonus for kings
                        pieceValue += this.getCenterBonus(row, col);
                        break;
                }

                // Edge penalty
                if (col === 0 || col === 7) {
                    pieceValue -= 10;
                }

                score += isBot ? pieceValue : -pieceValue;
            }
        }

        // Mobility bonus
        const botMoves = CheckersLogic.getAllValidMoves(board, botColor);
        const oppMoves = CheckersLogic.getAllValidMoves(board, opponentColor);
        score += (botMoves.moves.length + botMoves.captures.length * 2) * 5;
        score -= (oppMoves.moves.length + oppMoves.captures.length * 2) * 5;

        return score;
    }

    static getCenterBonus(row, col) {
        const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
        return Math.max(0, 20 - centerDistance * 5);
    }
}

module.exports = BotService;