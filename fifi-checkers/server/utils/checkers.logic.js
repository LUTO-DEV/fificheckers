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
        const moves = [];
        const captures = [];

        const directions = this.getMoveDirections(piece);

        // Check for captures first
        for (const [dRow, dCol] of directions) {
            const jumpRow = row + dRow * 2;
            const jumpCol = col + dCol * 2;
            const midRow = row + dRow;
            const midCol = col + dCol;

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

        // Only get simple moves if no captures available for this piece
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

    static getMoveDirections(piece) {
        if (isKing(piece)) {
            return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        }
        if (piece === PIECE.WHITE) {
            return [[-1, -1], [-1, 1]]; // White moves up
        }
        if (piece === PIECE.BLACK) {
            return [[1, -1], [1, 1]]; // Black moves down
        }
        return [];
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

        // If any captures exist, only captures are valid (mandatory capture rule)
        return allCaptures.length > 0 ? { moves: [], captures: allCaptures, mustCapture: true }
            : { moves: allMoves, captures: [], mustCapture: false };
    }

    static validateMove(board, move, playerColor) {
        const { from, to } = move;
        const piece = board[from.row][from.col];

        // Check if piece belongs to player
        if (!isPieceOfColor(piece, playerColor)) {
            return { valid: false, error: 'Not your piece' };
        }

        // Get all valid moves for this color
        const { moves, captures, mustCapture } = this.getAllValidMoves(board, playerColor);

        // Check if this specific move is valid
        const isCapture = captures.some(c =>
            c.from.row === from.row && c.from.col === from.col &&
            c.to.row === to.row && c.to.col === to.col
        );

        const isMove = moves.some(m =>
            m.from.row === from.row && m.from.col === from.col &&
            m.to.row === to.row && m.to.col === to.col
        );

        if (mustCapture && !isCapture) {
            return { valid: false, error: 'Capture is mandatory' };
        }

        if (!isCapture && !isMove) {
            return { valid: false, error: 'Invalid move' };
        }

        // Find the actual move/capture object
        const validMove = isCapture
            ? captures.find(c => c.from.row === from.row && c.from.col === from.col && c.to.row === to.row && c.to.col === to.col)
            : moves.find(m => m.from.row === from.row && m.from.col === from.col && m.to.row === to.row && m.to.col === to.col);

        return { valid: true, move: validMove, isCapture };
    }

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

    static getMultiCaptures(board, row, col) {
        const piece = board[row][col];
        const { captures } = this.getValidMoves(board, row, col);
        return captures;
    }

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

    static evaluateBoard(board) {
        let score = 0;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = board[row][col];
                switch (piece) {
                    case PIECE.WHITE:
                        score -= 1;
                        break;
                    case PIECE.BLACK:
                        score += 1;
                        break;
                    case PIECE.WHITE_KING:
                        score -= 2;
                        break;
                    case PIECE.BLACK_KING:
                        score += 2;
                        break;
                }
            }
        }

        return score;
    }
}

module.exports = CheckersLogic;