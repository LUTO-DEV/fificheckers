import { useCallback, useEffect, useRef } from 'react';
import useGameStore from '../stores/gameStore';
import useSocket from './useSocket';
import { PIECE } from '../utils/constants';
import { vibrate } from '../utils/helpers';

export default function useGame() {
    const { makeMove, syncTimer } = useSocket();
    const timerRef = useRef(null);
    const {
        matchId,
        boardState,
        turn,
        currentPlayer,
        myPlayerNum,
        myColor,
        selectedPiece,
        validMoves,
        validCaptures,
        mustCapture,
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

        // Clear any existing interval
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Local countdown every second
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

        // Sync with server every 5 seconds
        const syncInterval = setInterval(() => {
            syncTimer(matchId);
        }, 5000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            clearInterval(syncInterval);
        };
    }, [matchId, status, syncTimer, setTimer]);

    // Check if it's my turn
    const isMyTurn = currentPlayer === myPlayerNum;

    // Get valid moves for a piece
    const getValidMoves = useCallback((row, col) => {
        if (!boardState) return { moves: [], captures: [], mustCapture: false };

        const piece = boardState[row][col];
        if (!piece) return { moves: [], captures: [], mustCapture: false };

        const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
        const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
        const isKing = piece === PIECE.WHITE_KING || piece === PIECE.BLACK_KING;

        if ((myColor === 'white' && !isWhite) || (myColor === 'black' && !isBlack)) {
            return { moves: [], captures: [], mustCapture: false };
        }

        const moves = [];
        const captures = [];

        const directions = isKing
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : isWhite
                ? [[-1, -1], [-1, 1]]
                : [[1, -1], [1, 1]];

        // Check captures first
        for (const [dRow, dCol] of directions) {
            const jumpRow = row + dRow * 2;
            const jumpCol = col + dCol * 2;
            const midRow = row + dRow;
            const midCol = col + dCol;

            if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
                const midPiece = boardState[midRow][midCol];
                const targetPiece = boardState[jumpRow][jumpCol];

                if (targetPiece === PIECE.EMPTY && midPiece !== PIECE.EMPTY) {
                    const midIsWhite = midPiece === PIECE.WHITE || midPiece === PIECE.WHITE_KING;
                    const midIsBlack = midPiece === PIECE.BLACK || midPiece === PIECE.BLACK_KING;

                    if ((isWhite && midIsBlack) || (isBlack && midIsWhite)) {
                        captures.push({ row: jumpRow, col: jumpCol, captured: { row: midRow, col: midCol } });
                    }
                }
            }
        }

        // Check if any piece must capture
        let anyCaptures = false;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                const pIsWhite = p === PIECE.WHITE || p === PIECE.WHITE_KING;
                const pIsBlack = p === PIECE.BLACK || p === PIECE.BLACK_KING;
                const pIsKing = p === PIECE.WHITE_KING || p === PIECE.BLACK_KING;

                if ((myColor === 'white' && pIsWhite) || (myColor === 'black' && pIsBlack)) {
                    const pDirs = pIsKing
                        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
                        : pIsWhite
                            ? [[-1, -1], [-1, 1]]
                            : [[1, -1], [1, 1]];

                    for (const [dRow, dCol] of pDirs) {
                        const jr = r + dRow * 2;
                        const jc = c + dCol * 2;
                        const mr = r + dRow;
                        const mc = c + dCol;

                        if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8) {
                            const mp = boardState[mr][mc];
                            const tp = boardState[jr][jc];

                            if (tp === PIECE.EMPTY && mp !== PIECE.EMPTY) {
                                const mpIsWhite = mp === PIECE.WHITE || mp === PIECE.WHITE_KING;
                                const mpIsBlack = mp === PIECE.BLACK || mp === PIECE.BLACK_KING;

                                if ((pIsWhite && mpIsBlack) || (pIsBlack && mpIsWhite)) {
                                    anyCaptures = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (anyCaptures) break;
            }
            if (anyCaptures) break;
        }

        // Only get simple moves if no captures available
        if (!anyCaptures) {
            for (const [dRow, dCol] of directions) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    if (boardState[newRow][newCol] === PIECE.EMPTY) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }

        return { moves, captures, mustCapture: anyCaptures };
    }, [boardState, myColor]);

    // Handle cell click
    const handleCellClick = useCallback((row, col) => {
        if (!isMyTurn || status !== 'playing') return;

        const piece = boardState[row][col];

        // If clicking on own piece
        if (piece !== PIECE.EMPTY) {
            const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
            const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;

            if ((myColor === 'white' && isWhite) || (myColor === 'black' && isBlack)) {
                // Multi-capture restriction
                if (multiCaptureState && (multiCaptureState.row !== row || multiCaptureState.col !== col)) {
                    return; // Must continue with the same piece
                }

                const { moves, captures, mustCapture } = getValidMoves(row, col);

                if (moves.length > 0 || captures.length > 0) {
                    vibrate(20);
                    selectPiece(row, col, moves, captures, mustCapture);
                }
                return;
            }
        }

        // If piece selected, try to move
        if (selectedPiece) {
            const isValidMove = validMoves.some(m => m.row === row && m.col === col);
            const captureMove = validCaptures.find(c => c.row === row && c.col === col);

            if (isValidMove || captureMove) {
                vibrate(captureMove ? [30, 50, 30] : 30);

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
        validCaptures,
        mustCapture
    };
}