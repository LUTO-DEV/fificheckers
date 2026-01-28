const { BOARD_SIZE, PIECE } = require('./constants');
const {
    cloneBoard,
    isValidPosition,
    getPieceColor,
    isKing,
    isPieceOfColor,
    shouldPromote,
    promotePiece,
    countPieces
} = require('./board.utils');

class CheckersLogic {

    static getValidMoves(board, row, col) {
        const piece = board[row][col];
        if (piece === PIECE.EMPTY) return { moves: [], captures: [] };

        const color = getPieceColor(piece);
        const pieceIsKing = isKing(piece);

        const moves = [];
        const captures = [];

        if (pieceIsKing) {
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dRow, dCol] of directions) {
                let foundEnemy = null;
                let distance = 1;

                while (distance < 8) {
                    const newRow = row + dRow * distance;
                    const newCol = col + dCol * distance;

                    if (!isValidPosition(newRow, newCol)) break;

                    const targetPiece = board[newRow][newCol];

                    if (targetPiece === PIECE.EMPTY) {
                        if (foundEnemy) {
                            captures.push({
                                from: { row, col },
                                to: { row: newRow, col: newCol },
                                captured: { row: foundEnemy.row, col: foundEnemy.col }
                            });
                        } else {
                            moves.push({
                                from: { row, col },
                                to: { row: newRow, col: newCol }
                            });
                        }
                    } else if (getPieceColor(targetPiece) !== color) {
                        if (foundEnemy) {
                            break;
                        }
                        foundEnemy = { row: newRow, col: newCol };
                    } else {
                        break;
                    }

                    distance++;
                }
            }

            if (captures.length > 0) {
                return { moves: [], captures };
            }
            return { moves, captures: [] };

        } else {
            const forwardDirections = color === 'white'
                ? [[-1, -1], [-1, 1]]
                : [[1, -1], [1, 1]];

            const allDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dRow, dCol] of allDirections) {
                const midRow = row + dRow;
                const midCol = col + dCol;
                const jumpRow = row + dRow * 2;
                const jumpCol = col + dCol * 2;

                if (isValidPosition(jumpRow, jumpCol)) {
                    const midPiece = board[midRow][midCol];
                    const targetPiece = board[jumpRow][jumpCol];

                    if (targetPiece === PIECE.EMPTY &&
                        midPiece !== PIECE.EMPTY &&
                        getPieceColor(midPiece) !== color) {
                        captures.push({
                            from: { row, col },
                            to: { row: jumpRow, col: jumpCol },
                            captured: { row: midRow, col: midCol }
                        });
                    }
                }
            }

            if (captures.length === 0) {
                for (const [dRow, dCol] of forwardDirections) {
                    const newRow = row + dRow;
                    const newCol = col + dCol;

                    if (isValidPosition(newRow, newCol) && board[newRow][newCol] === PIECE.EMPTY) {
                        moves.push({
                            from: { row, col },
                            to: { row: newRow, col: newCol }
                        });
                    }
                }
            }

            return { moves, captures };
        }
    }

    static getAllValidMoves(board, color) {
        const allMoves = [];
        const allCaptures = [];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (isPieceOfColor(board[row][col], color)) {
                    const { moves, captures } = this.getValidMoves(board, row, col);
                    allMoves.push(...moves);
                    allCaptures.push(...captures);
                }
            }
        }

        if (allCaptures.length > 0) {
            return { moves: [], captures: allCaptures, mustCapture: true };
        }

        return { moves: allMoves, captures: [], mustCapture: false };
    }

    static validateMove(board, move, playerColor) {
        const { from, to } = move;
        const piece = board[from.row][from.col];

        if (!isPieceOfColor(piece, playerColor)) {
            return { valid: false, error: 'Not your piece' };
        }

        const { moves, captures, mustCapture } = this.getAllValidMoves(board, playerColor);

        const captureMove = captures.find(c =>
            c.from.row === from.row && c.from.col === from.col &&
            c.to.row === to.row && c.to.col === to.col
        );

        const regularMove = moves.find(m =>
            m.from.row === from.row && m.from.col === from.col &&
            m.to.row === to.row && m.to.col === to.col
        );

        if (mustCapture && !captureMove) {
            return { valid: false, error: 'Capture is mandatory' };
        }

        if (!captureMove && !regularMove) {
            return { valid: false, error: 'Invalid move' };
        }

        const validMove = captureMove || regularMove;

        return {
            valid: true,
            move: validMove,
            isCapture: !!captureMove
        };
    }

    static executeMove(board, move, isCapture) {
        const newBoard = cloneBoard(board);
        const { from, to } = move;

        let piece = newBoard[from.row][from.col];
        newBoard[from.row][from.col] = PIECE.EMPTY;

        if (isCapture && move.captured) {
            newBoard[move.captured.row][move.captured.col] = PIECE.EMPTY;
        }

        if (shouldPromote(piece, to.row)) {
            piece = promotePiece(piece);
        }

        newBoard[to.row][to.col] = piece;

        return newBoard;
    }

    static getMultiCaptures(board, row, col) {
        const piece = board[row][col];
        if (piece === PIECE.EMPTY) return [];

        const color = getPieceColor(piece);
        const pieceIsKing = isKing(piece);
        const captures = [];

        if (pieceIsKing) {
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dRow, dCol] of directions) {
                let foundEnemy = null;
                let distance = 1;

                while (distance < 8) {
                    const newRow = row + dRow * distance;
                    const newCol = col + dCol * distance;

                    if (!isValidPosition(newRow, newCol)) break;

                    const targetPiece = board[newRow][newCol];

                    if (targetPiece === PIECE.EMPTY) {
                        if (foundEnemy) {
                            captures.push({
                                from: { row, col },
                                to: { row: newRow, col: newCol },
                                captured: { row: foundEnemy.row, col: foundEnemy.col }
                            });
                        }
                    } else if (getPieceColor(targetPiece) !== color) {
                        if (foundEnemy) break;
                        foundEnemy = { row: newRow, col: newCol };
                    } else {
                        break;
                    }

                    distance++;
                }
            }
        } else {
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dRow, dCol] of directions) {
                const midRow = row + dRow;
                const midCol = col + dCol;
                const jumpRow = row + dRow * 2;
                const jumpCol = col + dCol * 2;

                if (isValidPosition(jumpRow, jumpCol)) {
                    const midPiece = board[midRow][midCol];
                    const targetPiece = board[jumpRow][jumpCol];

                    if (targetPiece === PIECE.EMPTY &&
                        midPiece !== PIECE.EMPTY &&
                        getPieceColor(midPiece) !== color) {
                        captures.push({
                            from: { row, col },
                            to: { row: jumpRow, col: jumpCol },
                            captured: { row: midRow, col: midCol }
                        });
                    }
                }
            }
        }

        return captures;
    }

    static checkGameEnd(board, currentTurnColor) {
        const opponentColor = currentTurnColor === 'white' ? 'black' : 'white';

        const opponentPieces = countPieces(board, opponentColor);
        if (opponentPieces === 0) {
            return { ended: true, winner: currentTurnColor, reason: 'no_pieces' };
        }

        const { moves, captures } = this.getAllValidMoves(board, opponentColor);
        if (moves.length === 0 && captures.length === 0) {
            return { ended: true, winner: currentTurnColor, reason: 'no_moves' };
        }

        return { ended: false };
    }

    static evaluateBoard(board) {
        let score = 0;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                switch (piece) {
                    case PIECE.WHITE:
                        score -= 10 + (7 - row);
                        break;
                    case PIECE.BLACK:
                        score += 10 + row;
                        break;
                    case PIECE.WHITE_KING:
                        score -= 25;
                        break;
                    case PIECE.BLACK_KING:
                        score += 25;
                        break;
                }
            }
        }

        return score;
    }
}

module.exports = CheckersLogic;