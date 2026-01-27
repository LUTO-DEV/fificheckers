const { BOARD_SIZE, PIECE } = require('./constants');

function createInitialBoard() {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(PIECE.EMPTY));

    // Place black pieces (top 3 rows)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = PIECE.BLACK;
            }
        }
    }

    // Place white pieces (bottom 3 rows)
    for (let row = 5; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = PIECE.WHITE;
            }
        }
    }

    return board;
}

function cloneBoard(board) {
    return board.map(row => [...row]);
}

function isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getPieceColor(piece) {
    if (piece === PIECE.WHITE || piece === PIECE.WHITE_KING) return 'white';
    if (piece === PIECE.BLACK || piece === PIECE.BLACK_KING) return 'black';
    return null;
}

function isKing(piece) {
    return piece === PIECE.WHITE_KING || piece === PIECE.BLACK_KING;
}

function isPieceOfColor(piece, color) {
    if (color === 'white') return piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
    if (color === 'black') return piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
    return false;
}

function shouldPromote(piece, row) {
    if (piece === PIECE.WHITE && row === 0) return true;
    if (piece === PIECE.BLACK && row === BOARD_SIZE - 1) return true;
    return false;
}

function promotePiece(piece) {
    if (piece === PIECE.WHITE) return PIECE.WHITE_KING;
    if (piece === PIECE.BLACK) return PIECE.BLACK_KING;
    return piece;
}

function countPieces(board, color) {
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (isPieceOfColor(board[row][col], color)) {
                count++;
            }
        }
    }
    return count;
}

function boardToString(board) {
    return board.map(row => row.join('')).join('|');
}

module.exports = {
    createInitialBoard,
    cloneBoard,
    isValidPosition,
    getPieceColor,
    isKing,
    isPieceOfColor,
    shouldPromote,
    promotePiece,
    countPieces,
    boardToString
};