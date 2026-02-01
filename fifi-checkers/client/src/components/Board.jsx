import { motion } from 'framer-motion';
import Piece from './Piece';
import useGame from '../hooks/useGame';
import useGameStore from '../stores/gameStore';
import { PIECE } from '../utils/constants';

export default function Board() {
    const { boardState, currentPlayer, myPlayerNum, myColor, lastMove } = useGameStore();
    const {
        handleCellClick,
        selectedPiece,
        validMoves,
        validCaptures,
        isMyTurn
    } = useGame();

    if (!boardState) return null;

    // Rotate board for black player
    const shouldRotate = myColor === 'black';

    const getActualRow = (visualRow) => shouldRotate ? 7 - visualRow : visualRow;
    const getActualCol = (visualCol) => shouldRotate ? 7 - visualCol : visualCol;

    const isValidMove = (row, col) =>
        validMoves.some(m => m.row === row && m.col === col);

    const isValidCapture = (row, col) =>
        validCaptures.some(c => c.row === row && c.col === col);

    const isSelected = (row, col) =>
        selectedPiece?.row === row && selectedPiece?.col === col;

    // Check if cell is part of last move
    const isLastMoveFrom = (row, col) =>
        lastMove?.from?.row === row && lastMove?.from?.col === col;

    const isLastMoveTo = (row, col) =>
        lastMove?.to?.row === row && lastMove?.to?.col === col;

    const isLastMoveCaptured = (row, col) =>
        lastMove?.captured?.row === row && lastMove?.captured?.col === col;

    const visualRows = Array.from({ length: 8 }, (_, i) => i);
    const visualCols = Array.from({ length: 8 }, (_, i) => i);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square w-full max-w-[360px] mx-auto"
        >
            {/* Board container */}
            <div className={`
        absolute inset-0 rounded-2xl overflow-hidden border-2
        ${isMyTurn ? 'border-gold-500/50 shadow-gold' : 'border-luxury-border shadow-xl shadow-black/50'}
        transition-all duration-500
      `}>
                {/* Grid */}
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                    {visualRows.map((visualRow) =>
                        visualCols.map((visualCol) => {
                            const actualRow = getActualRow(visualRow);
                            const actualCol = getActualCol(visualCol);

                            const cell = boardState[actualRow][actualCol];
                            const isDark = (visualRow + visualCol) % 2 === 1;
                            const isValidMoveCell = isValidMove(actualRow, actualCol);
                            const isValidCaptureCell = isValidCapture(actualRow, actualCol);
                            const isSelectedCell = isSelected(actualRow, actualCol);

                            // Last move highlighting
                            const isFromSquare = isLastMoveFrom(actualRow, actualCol);
                            const isToSquare = isLastMoveTo(actualRow, actualCol);
                            const wasCaptured = isLastMoveCaptured(actualRow, actualCol);

                            return (
                                <motion.div
                                    key={`${visualRow}-${visualCol}`}
                                    onClick={() => handleCellClick(actualRow, actualCol)}
                                    className={`
                    relative flex items-center justify-center
                    cursor-pointer transition-all duration-200
                    ${isDark ? 'bg-emerald-800' : 'bg-amber-100'}
                    ${isSelectedCell ? 'ring-2 ring-inset ring-gold-400' : ''}
                  `}
                                    style={{
                                        // Last move highlight - subtle yellow/green glow
                                        backgroundColor: isFromSquare
                                            ? (isDark ? '#4a7c59' : '#d4e157')  // From square - lighter
                                            : isToSquare
                                                ? (isDark ? '#5c8a4d' : '#c6d631')  // To square - more visible
                                                : wasCaptured
                                                    ? (isDark ? '#8b4545' : '#e57373')  // Captured - reddish
                                                    : undefined,
                                        boxShadow: (isFromSquare || isToSquare)
                                            ? 'inset 0 0 12px rgba(255, 215, 0, 0.4)'
                                            : undefined
                                    }}
                                >
                                    {/* Last move indicator - subtle dot on from square */}
                                    {isFromSquare && cell === PIECE.EMPTY && (
                                        <div className="absolute w-3 h-3 rounded-full bg-yellow-400/40" />
                                    )}

                                    {/* Valid move dot */}
                                    {isValidMoveCell && !isValidCaptureCell && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute w-3 h-3 rounded-full bg-gold-500/60 shadow-lg"
                                        />
                                    )}

                                    {/* Valid capture ring */}
                                    {isValidCaptureCell && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity }}
                                            className="absolute w-3/4 h-3/4 rounded-full border-[3px] border-red-500/80"
                                        />
                                    )}

                                    {/* Piece */}
                                    {cell !== PIECE.EMPTY && (
                                        <Piece
                                            type={cell}
                                            isSelected={isSelectedCell}
                                            isLastMove={isToSquare}
                                        />
                                    )}

                                    {/* Captured piece ghost effect */}
                                    {wasCaptured && (
                                        <motion.div
                                            initial={{ opacity: 0.6, scale: 1 }}
                                            animate={{ opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.5 }}
                                            className="absolute w-8 h-8 rounded-full bg-red-500/30"
                                        />
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Turn indicator overlay */}
            {!isMyTurn && (
                <div className="absolute inset-0 bg-black/20 rounded-2xl pointer-events-none flex items-center justify-center">
                    <motion.div
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-sm font-medium text-white bg-black/70 px-4 py-2 rounded-xl"
                    >
                        Opponent's turn...
                    </motion.div>
                </div>
            )}

            {/* Color indicator */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${myColor === 'white'
                        ? 'bg-white/90 text-gray-800'
                        : 'bg-gray-800 text-white'
                    }`}>
                    {myColor === 'white' ? '⚪ White' : '⚫ Black'}
                </span>
            </div>
        </motion.div>
    );
}