import { motion } from 'framer-motion';
import Piece from './Piece';
import useGame from '../hooks/useGame';
import useGameStore from '../stores/gameStore';
import { PIECE } from '../utils/constants';

export default function Board() {
    const { boardState, currentPlayer, myPlayerNum, myColor } = useGameStore();
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

    // Create visual grid (always 0-7, 0-7 visually)
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
                            // Convert visual position to actual board position
                            const actualRow = getActualRow(visualRow);
                            const actualCol = getActualCol(visualCol);

                            const cell = boardState[actualRow][actualCol];
                            const isDark = (visualRow + visualCol) % 2 === 1;
                            const isValidMoveCell = isValidMove(actualRow, actualCol);
                            const isValidCaptureCell = isValidCapture(actualRow, actualCol);
                            const isSelectedCell = isSelected(actualRow, actualCol);

                            return (
                                <motion.div
                                    key={`${visualRow}-${visualCol}`}
                                    onClick={() => handleCellClick(actualRow, actualCol)}
                                    className={`
                    relative flex items-center justify-center
                    ${isDark ? 'cell-dark' : 'cell-light'}
                    ${isSelectedCell ? 'cell-selected' : ''}
                    ${isValidMoveCell && !isValidCaptureCell ? 'cell-highlight' : ''}
                    ${isValidCaptureCell ? 'cell-capture' : ''}
                    cursor-pointer transition-all duration-150
                  `}
                                >
                                    {/* Valid move dot */}
                                    {isValidMoveCell && !isValidCaptureCell && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute w-3 h-3 rounded-full bg-gold-500/60"
                                        />
                                    )}

                                    {/* Valid capture ring */}
                                    {isValidCaptureCell && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity }}
                                            className="absolute w-3/4 h-3/4 rounded-full border-3 border-red-500/80"
                                        />
                                    )}

                                    {/* Piece */}
                                    {cell !== PIECE.EMPTY && (
                                        <Piece
                                            type={cell}
                                            isSelected={isSelectedCell}
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
                <div className="absolute inset-0 bg-black/30 rounded-2xl pointer-events-none flex items-center justify-center">
                    <motion.div
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-sm font-medium text-luxury-white bg-luxury-dark/90 px-4 py-2 rounded-xl border border-luxury-border"
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