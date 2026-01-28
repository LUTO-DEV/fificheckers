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

    /**
     * Get all valid moves for a piece at given position
     */
    static getValidMoves(board, row, col) {
        const piece = board[row][col];
        if (piece === PIECE.EMPTY) return { moves: [], captures: [] };

        const color = getPieceColor(piece);
        const pieceIsKing = isKing(piece);

        let moves = [];
        let captures = [];

        if (pieceIsKing) {
            // Kings can move/capture multiple squares diagonally
            const kingResult = this.getKingMoves(board, row, col, color);
            moves = kingResult.moves;
            captures = kingResult.captures;
        } else {
            // Regular pieces move one square diagonally forward
            const regularResult = this.getRegularMoves(board, row, col, color, piece);
            moves = regularResult.moves;
            captures = regularResult.captures;
        }

        return { moves, captures };
    }

    /**
     * Get moves for regular (non-king) pieces
     */
    static getRegularMoves(board, row, col, color, piece) {
        const moves = [];
        const captures = [];

        // Regular pieces move forward only
        const directions = color === 'white'
            ? [[-1, -1], [-1, 1]]  // White moves up (decreasing row)
            : [[1, -1], [1, 1]];   // Black moves down (increasing row)

        // Check captures first (can capture in all 4 directions)
        const captureDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dRow, dCol] of captureDirections) {
            const midRow = row + dRow;
            const midCol = col + dCol;
            const jumpRow = row + dRow * 2;
            const jumpCol = col + dCol * 2;

            if (isValidPosition(jumpRow, jumpCol)) {
                const midPiece = board[midRow][midCol];
                const targetPiece = board[jumpRow][jumpCol];

                // Can capture if: landing is empty AND middle has enemy piece
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

        // Only get regular moves if no captures
        if (captures.length === 0) {
            for (const [dRow, dCol] of directions) {
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

    /**
     * Get moves for king pieces - can move/capture multiple squares diagonally
     */
    static getKingMoves(board, row, col, color) {
        const moves = [];
        const captures = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dRow, dCol] of directions) {
            let foundEnemy = null;
            let distance = 1;

            // Scan along the diagonal
            while (true) {
                const newRow = row + dRow * distance;
                const newCol = col + dCol * distance;

                if (!isValidPosition(newRow, newCol)) break;

                const targetPiece = board[newRow][newCol];

                if (targetPiece === PIECE.EMPTY) {
                    if (foundEnemy) {
                        // Can land here after capturing
                        captures.push({
                            from: { row, col },
                            to: { row: newRow, col: newCol },
                            captured: { row: foundEnemy.row, col: foundEnemy.col }
                        });
                    } else {
                        // Regular move (only if no captures available globally)
                        moves.push({
                            from: { row, col },
                            to: { row: newRow, col: newCol }
                        });
                    }
                } else if (getPieceColor(targetPiece) !== color) {
                    // Found enemy piece
                    if (foundEnemy) {
                        // Can't jump over two pieces
                        break;
                    }
                    foundEnemy = { row: newRow, col: newCol };
                } else {
                    // Found own piece, stop
                    break;
                }

                distance++;
            }
        }

        // If there are captures, don't return regular moves
        if (captures.length > 0) {
            return { moves: [], captures };
        }

        return { moves, captures };
    }

    /**
     * Get all valid moves for a color
     */
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

        // Mandatory capture rule - if any captures available, must capture
        if (allCaptures.length > 0) {
            return { moves: [], captures: allCaptures, mustCapture: true };
        }

        return { moves: allMoves, captures: [], mustCapture: false };
    }

    /**
     * Validate a move
     */
    static validateMove(board, move, playerColor) {
        const { from, to } = move;
        const piece = board[from.row][from.col];

        // Check if piece belongs to player
        if (!isPieceOfColor(piece, playerColor)) {
            return { valid: false, error: 'Not your piece' };
        }

        // Get all valid moves for this color
        const { moves, captures, mustCapture } = this.getAllValidMoves(board, playerColor);

        // Check if this specific move is a valid capture
        const captureMove = captures.find(c =>
            c.from.row === from.row && c.from.col === from.col &&
            c.to.row === to.row && c.to.col === to.col
        );

        // Check if this specific move is a valid regular move
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

    /**
     * Execute a move on the board
     */
    static executeMove(board, move, isCapture) {
        const newBoard = cloneBoard(board);
        const { from, to } = move;

        let piece = newBoard[from.row][from.col];
        newBoard[from.row][from.col] = PIECE.EMPTY;

        // Handle capture
        if (isCapture && move.captured) {
            newBoard[move.captured.row][move.captured.col] = PIECE.EMPTY;
        }

        // Check for promotion
        if (shouldPromote(piece, to.row)) {
            piece = promotePiece(piece);
        }

        newBoard[to.row][to.col] = piece;

        return newBoard;
    }

    /**
     * Get available multi-captures from a position (chain captures)
     */
    static getMultiCaptures(board, row, col) {
        const piece = board[row][col];
        if (piece === PIECE.EMPTY) return [];

        const color = getPieceColor(piece);
        const pieceIsKing = isKing(piece);

        const captures = [];

        if (pieceIsKing) {
            // King multi-captures
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dRow, dCol] of directions) {
                let foundEnemy = null;
                let distance = 1;

                while (true) {
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
            // Regular piece multi-captures (can capture in all 4 directions)
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

    /**
     * Check if the game has ended
     */
    static checkGameEnd(board, currentTurnColor) {
        const opponentColor = currentTurnColor === 'white' ? 'black' : 'white';

        // Check if opponent has any pieces
        const opponentPieces = countPieces(board, opponentColor);
        if (opponentPieces === 0) {
            return { ended: true, winner: currentTurnColor, reason: 'no_pieces' };
        }

        // Check if opponent has any valid moves
        const { moves, captures } = this.getAllValidMoves(board, opponentColor);
        if (moves.length === 0 && captures.length === 0) {
            return { ended: true, winner: currentTurnColor, reason: 'no_moves' };
        }

        return { ended: false };
    }

    /**
     * Evaluate board position (for bot AI)
     */
    static evaluateBoard(board) {
        let score = 0;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                switch (piece) {
                    case PIECE.WHITE:
                        score -= 10;
                        // Position bonus - closer to promotion
                        score -= (7 - row);
                        break;
                    case PIECE.BLACK:
                        score += 10;
                        // Position bonus - closer to promotion
                        score += row;
                        break;
                    case PIECE.WHITE_KING:
                        score -= 25; // Kings are more valuable
                        score -= this.getCenterBonus(row, col);
                        break;
                    case PIECE.BLACK_KING:
                        score += 25;
                        score += this.getCenterBonus(row, col);
                        break;
                }
            }
        }

        return score;
    }

    /**
     * Bonus for controlling center squares
     */
    static getCenterBonus(row, col) {
        const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
        return Math.max(0, Math.floor(5 - centerDistance));
    }
}

module.exports = CheckersLogic;