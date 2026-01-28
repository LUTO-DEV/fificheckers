import { useCallback, useEffect, useRef } from 'react';
import useGameStore from '../stores/gameStore';
import useSocket from './useSocket';
import { PIECE } from '../utils/constants';

export default function useGame() {
    const { makeMove, syncTimer } = useSocket();
    const timerRef = useRef(null);
    const {
        matchId,
        boardState,
        currentPlayer,
        myPlayerNum,
        myColor,
        selectedPiece,
        validMoves,
        validCaptures,
        multiCaptureState,
        timer,
        selectPiece,
        clearSelection,
        setTimer,
        status
    } = useGameStore();

    // Local timer countdown
    useEffect(() => {
        if (status !== 'playing' || !matchId) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        timerRef.current = setInterval(() => {
            const currentTimer = useGameStore.getState().timer;
            if (!currentTimer || !currentTimer.activePlayer) return;

            const playerKey = currentTimer.activePlayer === 1 ? 'player1' : 'player2';
            const newTime = Math.max(0, currentTimer[playerKey] - 1);

            setTimer({
                ...currentTimer,
                [playerKey]: newTime
            });
        }, 1000);

        const syncInterval = setInterval(() => {
            syncTimer(matchId);
        }, 5000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            clearInterval(syncInterval);
        };
    }, [matchId, status, syncTimer, setTimer]);

    const isMyTurn = currentPlayer === myPlayerNum;

    // Get valid moves for a piece
    const getValidMoves = useCallback((row, col) => {
        if (!boardState) return { moves: [], captures: [], mustCapture: false };

        const piece = boardState[row][col];
        if (!piece || piece === PIECE.EMPTY) return { moves: [], captures: [], mustCapture: false };

        const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
        const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
        const pieceIsKing = piece === PIECE.WHITE_KING || piece === PIECE.BLACK_KING;

        if ((myColor === 'white' && !isWhite) || (myColor === 'black' && !isBlack)) {
            return { moves: [], captures: [], mustCapture: false };
        }

        const moves = [];
        const captures = [];

        // Get moves based on piece type
        if (pieceIsKing) {
            // King moves - multiple squares diagonally
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            for (const [dRow, dCol] of directions) {
                let foundEnemy = null;
                let distance = 1;

                while (true) {
                    const newRow = row + dRow * distance;
                    const newCol = col + dCol * distance;

                    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;

                    const targetPiece = boardState[newRow][newCol];

                    if (targetPiece === PIECE.EMPTY) {
                        if (foundEnemy) {
                            captures.push({
                                row: newRow,
                                col: newCol,
                                captured: { row: foundEnemy.row, col: foundEnemy.col }
                            });
                        } else {
                            moves.push({ row: newRow, col: newCol });
                        }
                    } else {
                        const targetIsWhite = targetPiece === PIECE.WHITE || targetPiece === PIECE.WHITE_KING;
                        const targetIsBlack = targetPiece === PIECE.BLACK || targetPiece === PIECE.BLACK_KING;
                        const isEnemy = (isWhite && targetIsBlack) || (isBlack && targetIsWhite);

                        if (isEnemy && !foundEnemy) {
                            foundEnemy = { row: newRow, col: newCol };
                        } else {
                            break;
                        }
                    }

                    distance++;
                }
            }
        } else {
            // Regular piece moves
            const moveDirections = isWhite ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
            const captureDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            // Check captures first
            for (const [dRow, dCol] of captureDirections) {
                const midRow = row + dRow;
                const midCol = col + dCol;
                const jumpRow = row + dRow * 2;
                const jumpCol = col + dCol * 2;

                if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
                    const midPiece = boardState[midRow][midCol];
                    const targetPiece = boardState[jumpRow][jumpCol];

                    if (targetPiece === PIECE.EMPTY && midPiece !== PIECE.EMPTY) {
                        const midIsWhite = midPiece === PIECE.WHITE || midPiece === PIECE.WHITE_KING;
                        const midIsBlack = midPiece === PIECE.BLACK || midPiece === PIECE.BLACK_KING;

                        if ((isWhite && midIsBlack) || (isBlack && midIsWhite)) {
                            captures.push({
                                row: jumpRow,
                                col: jumpCol,
                                captured: { row: midRow, col: midCol }
                            });
                        }
                    }
                }
            }

            // Regular moves only if no captures
            if (captures.length === 0) {
                for (const [dRow, dCol] of moveDirections) {
                    const newRow = row + dRow;
                    const newCol = col + dCol;

                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        if (boardState[newRow][newCol] === PIECE.EMPTY) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                }
            }
        }

        // Check if any piece on the board must capture
        let anyCaptures = false;
        outerLoop:
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p === PIECE.EMPTY) continue;

                const pIsWhite = p === PIECE.WHITE || p === PIECE.WHITE_KING;
                const pIsBlack = p === PIECE.BLACK || p === PIECE.BLACK_KING;

                if ((myColor === 'white' && !pIsWhite) || (myColor === 'black' && !pIsBlack)) continue;

                const { captures: pCaptures } = getMovesForPiece(boardState, r, c, myColor);
                if (pCaptures.length > 0) {
                    anyCaptures = true;
                    break outerLoop;
                }
            }
        }

        // If must capture but this piece has no captures, return empty
        if (anyCaptures && captures.length === 0) {
            return { moves: [], captures: [], mustCapture: true };
        }

        return {
            moves: anyCaptures ? [] : moves,
            captures,
            mustCapture: anyCaptures
        };
    }, [boardState, myColor]);

    // Handle cell click
    const handleCellClick = useCallback((row, col) => {
        if (!isMyTurn || status !== 'playing') return;

        const piece = boardState[row][col];

        // Clicking on own piece
        if (piece !== PIECE.EMPTY) {
            const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
            const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;

            if ((myColor === 'white' && isWhite) || (myColor === 'black' && isBlack)) {
                // If in multi-capture, can only select the capturing piece
                if (multiCaptureState) {
                    if (multiCaptureState.row !== row || multiCaptureState.col !== col) {
                        return;
                    }
                }

                const { moves, captures, mustCapture } = getValidMoves(row, col);

                if (moves.length > 0 || captures.length > 0) {
                    selectPiece(row, col, moves, captures, mustCapture);
                }
                return;
            }
        }

        // Clicking on destination
        if (selectedPiece) {
            const isValidMove = validMoves.some(m => m.row === row && m.col === col);
            const captureMove = validCaptures.find(c => c.row === row && c.col === col);

            if (isValidMove || captureMove) {
                const move = {
                    from: { row: selectedPiece.row, col: selectedPiece.col },
                    to: { row, col }
                };

                if (captureMove) {
                    move.captured = captureMove.captured;
                }

                makeMove(matchId, move);
                clearSelection();
            }
        }
    }, [
        isMyTurn, status, boardState, myColor, selectedPiece,
        validMoves, validCaptures, multiCaptureState,
        getValidMoves, selectPiece, clearSelection, makeMove, matchId
    ]);

    return {
        isMyTurn,
        handleCellClick,
        selectedPiece,
        validMoves,
        validCaptures
    };
}

// Helper function
function getMovesForPiece(board, row, col, myColor) {
    const piece = board[row][col];
    const captures = [];

    if (!piece || piece === PIECE.EMPTY) return { captures: [] };

    const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
    const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
    const pieceIsKing = piece === PIECE.WHITE_KING || piece === PIECE.BLACK_KING;

    if ((myColor === 'white' && !isWhite) || (myColor === 'black' && !isBlack)) {
        return { captures: [] };
    }

    if (pieceIsKing) {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dRow, dCol] of directions) {
            let foundEnemy = null;
            let distance = 1;
            while (true) {
                const newRow = row + dRow * distance;
                const newCol = col + dCol * distance;
                if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
                const targetPiece = board[newRow][newCol];
                if (targetPiece === PIECE.EMPTY) {
                    if (foundEnemy) {
                        captures.push({ row: newRow, col: newCol });
                    }
                } else {
                    const tIsWhite = targetPiece === PIECE.WHITE || targetPiece === PIECE.WHITE_KING;
                    const tIsBlack = targetPiece === PIECE.BLACK || targetPiece === PIECE.BLACK_KING;
                    const isEnemy = (isWhite && tIsBlack) || (isBlack && tIsWhite);
                    if (isEnemy && !foundEnemy) {
                        foundEnemy = { row: newRow, col: newCol };
                    } else {
                        break;
                    }
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
            if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
                const midPiece = board[midRow][midCol];
                const targetPiece = board[jumpRow][jumpCol];
                if (targetPiece === PIECE.EMPTY && midPiece !== PIECE.EMPTY) {
                    const mIsWhite = midPiece === PIECE.WHITE || midPiece === PIECE.WHITE_KING;
                    const mIsBlack = midPiece === PIECE.BLACK || midPiece === PIECE.BLACK_KING;
                    if ((isWhite && mIsBlack) || (isBlack && mIsWhite)) {
                        captures.push({ row: jumpRow, col: jumpCol });
                    }
                }
            }
        }
    }

    return { captures };
}