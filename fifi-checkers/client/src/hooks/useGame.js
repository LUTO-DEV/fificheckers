import { useCallback, useEffect, useRef } from 'react';
import useGameStore from '../stores/gameStore';
import useSocket from './useSocket';
import { PIECE } from '../utils/constants';

export default function useGame() {
    const { makeMove, syncTimer } = useSocket();
    const timerRef = useRef(null);

    const matchId = useGameStore(state => state.matchId);
    const boardState = useGameStore(state => state.boardState);
    const currentPlayer = useGameStore(state => state.currentPlayer);
    const myPlayerNum = useGameStore(state => state.myPlayerNum);
    const myColor = useGameStore(state => state.myColor);
    const selectedPiece = useGameStore(state => state.selectedPiece);
    const validMoves = useGameStore(state => state.validMoves);
    const validCaptures = useGameStore(state => state.validCaptures);
    const multiCaptureState = useGameStore(state => state.multiCaptureState);
    const status = useGameStore(state => state.status);
    const selectPiece = useGameStore(state => state.selectPiece);
    const clearSelection = useGameStore(state => state.clearSelection);
    const setTimer = useGameStore(state => state.setTimer);

    const isMyTurn = currentPlayer === myPlayerNum;

    // Timer countdown
    useEffect(() => {
        if (status !== 'playing' || !matchId) return;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            const timer = useGameStore.getState().timer;
            if (!timer?.activePlayer) return;

            const key = timer.activePlayer === 1 ? 'player1' : 'player2';
            const newTime = Math.max(0, timer[key] - 1);

            setTimer({ ...timer, [key]: newTime });
        }, 1000);

        // Sync with server every 10 seconds
        const syncInt = setInterval(() => syncTimer(matchId), 10000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            clearInterval(syncInt);
        };
    }, [matchId, status]);

    // Calculate valid moves for a position
    const calculateMoves = useCallback((row, col) => {
        if (!boardState) return { moves: [], captures: [] };

        const piece = boardState[row][col];
        if (!piece || piece === PIECE.EMPTY) return { moves: [], captures: [] };

        const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
        const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
        const isKing = piece === PIECE.WHITE_KING || piece === PIECE.BLACK_KING;

        // Check if it's my piece
        if ((myColor === 'white' && !isWhite) || (myColor === 'black' && !isBlack)) {
            return { moves: [], captures: [] };
        }

        const moves = [];
        const captures = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        if (isKing) {
            // King: moves multiple squares
            for (const [dr, dc] of directions) {
                let enemy = null;
                for (let dist = 1; dist < 8; dist++) {
                    const nr = row + dr * dist;
                    const nc = col + dc * dist;
                    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;

                    const target = boardState[nr][nc];
                    if (target === PIECE.EMPTY) {
                        if (enemy) {
                            captures.push({ row: nr, col: nc, captured: enemy });
                        } else {
                            moves.push({ row: nr, col: nc });
                        }
                    } else {
                        const tWhite = target === PIECE.WHITE || target === PIECE.WHITE_KING;
                        const tBlack = target === PIECE.BLACK || target === PIECE.BLACK_KING;
                        const isEnemy = (isWhite && tBlack) || (isBlack && tWhite);
                        if (isEnemy && !enemy) {
                            enemy = { row: nr, col: nc };
                        } else {
                            break;
                        }
                    }
                }
            }
        } else {
            // Regular piece
            const moveDir = isWhite ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

            // Captures (all 4 directions)
            for (const [dr, dc] of directions) {
                const mr = row + dr, mc = col + dc;
                const jr = row + dr * 2, jc = col + dc * 2;
                if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8) {
                    const mid = boardState[mr][mc];
                    const land = boardState[jr][jc];
                    if (land === PIECE.EMPTY && mid !== PIECE.EMPTY) {
                        const mWhite = mid === PIECE.WHITE || mid === PIECE.WHITE_KING;
                        const mBlack = mid === PIECE.BLACK || mid === PIECE.BLACK_KING;
                        if ((isWhite && mBlack) || (isBlack && mWhite)) {
                            captures.push({ row: jr, col: jc, captured: { row: mr, col: mc } });
                        }
                    }
                }
            }

            // Regular moves (only forward)
            if (captures.length === 0) {
                for (const [dr, dc] of moveDir) {
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        if (boardState[nr][nc] === PIECE.EMPTY) {
                            moves.push({ row: nr, col: nc });
                        }
                    }
                }
            }
        }

        return { moves, captures };
    }, [boardState, myColor]);

    // Check if any piece has captures (mandatory capture rule)
    const anyPieceHasCaptures = useCallback(() => {
        if (!boardState) return false;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p === PIECE.EMPTY) continue;

                const pWhite = p === PIECE.WHITE || p === PIECE.WHITE_KING;
                const pBlack = p === PIECE.BLACK || p === PIECE.BLACK_KING;

                if ((myColor === 'white' && pWhite) || (myColor === 'black' && pBlack)) {
                    const { captures } = calculateMoves(r, c);
                    if (captures.length > 0) return true;
                }
            }
        }
        return false;
    }, [boardState, myColor, calculateMoves]);

    // Handle cell click
    const handleCellClick = useCallback((row, col) => {
        if (!isMyTurn || status !== 'playing' || !boardState) {
            console.log('Cannot move:', { isMyTurn, status, hasBoard: !!boardState });
            return;
        }

        const piece = boardState[row][col];
        const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
        const isBlack = piece === PIECE.BLACK || piece === PIECE.BLACK_KING;
        const isMyPiece = (myColor === 'white' && isWhite) || (myColor === 'black' && isBlack);

        // Clicking on my piece - select it
        if (piece !== PIECE.EMPTY && isMyPiece) {
            // Multi-capture restriction
            if (multiCaptureState && (multiCaptureState.row !== row || multiCaptureState.col !== col)) {
                console.log('Must continue with same piece');
                return;
            }

            const { moves, captures } = calculateMoves(row, col);
            const mustCapture = anyPieceHasCaptures();

            // If must capture but this piece has no captures
            if (mustCapture && captures.length === 0) {
                console.log('Must capture with another piece');
                return;
            }

            if (moves.length > 0 || captures.length > 0) {
                selectPiece(row, col, mustCapture ? [] : moves, captures, mustCapture);
            }
            return;
        }

        // Clicking on destination
        if (selectedPiece) {
            const isMove = validMoves.some(m => m.row === row && m.col === col);
            const capture = validCaptures.find(c => c.row === row && c.col === col);

            if (isMove || capture) {
                const move = {
                    from: { row: selectedPiece.row, col: selectedPiece.col },
                    to: { row, col }
                };
                if (capture) {
                    move.captured = capture.captured;
                }

                console.log('Making move:', move);
                makeMove(matchId, move);
                clearSelection();
            }
        }
    }, [
        isMyTurn, status, boardState, myColor, selectedPiece,
        validMoves, validCaptures, multiCaptureState,
        calculateMoves, anyPieceHasCaptures, selectPiece, clearSelection, makeMove, matchId
    ]);

    return {
        isMyTurn,
        handleCellClick,
        selectedPiece,
        validMoves,
        validCaptures
    };
}