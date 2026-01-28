import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../stores/gameStore';
import useGame from '../hooks/useGame';
import { PIECE } from '../utils/constants';

export default function Board() {
    const boardState = useGameStore(s => s.boardState);
    const myColor = useGameStore(s => s.myColor);
    const { handleCellClick, selectedPiece, validMoves, validCaptures } = useGame();

    if (!boardState) {
        return (
            <div className="aspect-square w-full max-w-sm bg-luxury-card rounded-xl flex items-center justify-center">
                <span className="text-luxury-muted">Loading board...</span>
            </div>
        );
    }

    // Rotate board for black player (their pieces at bottom)
    const shouldRotate = myColor === 'black';

    // Get row/col indices based on rotation
    const getRowIndex = (visualRow) => shouldRotate ? 7 - visualRow : visualRow;
    const getColIndex = (visualCol) => shouldRotate ? 7 - visualCol : visualCol;

    const isValidMove = (row, col) => {
        return validMoves.some(m => m.row === row && m.col === col);
    };

    const isValidCapture = (row, col) => {
        return validCaptures.some(c => c.row === row && c.col === col);
    };

    const isSelected = (row, col) => {
        return selectedPiece?.row === row && selectedPiece?.col === col;
    };

    const renderPiece = (piece, row, col) => {
        if (piece === PIECE.EMPTY) return null;

        const isWhite = piece === PIECE.WHITE || piece === PIECE.WHITE_KING;
        const isKing = piece === PIECE.WHITE_KING || piece === PIECE.BLACK_KING;
        const selected = isSelected(row, col);

        return (
            <motion.div
                layoutId={`piece-${row}-${col}`}
                initial={{ scale: 0 }}
                animate={{
                    scale: selected ? 1.1 : 1,
                    y: selected ? -4 : 0
                }}
                className={`
          w-[85%] h-[85%] rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${isWhite
                        ? 'bg-gradient-to-br from-gray-100 to-gray-300 border-2 border-gray-400 shadow-lg'
                        : 'bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600 shadow-lg'
                    }
          ${selected ? 'ring-4 ring-gold-500 ring-opacity-75 shadow-xl' : ''}
        `}
                style={{
                    boxShadow: isWhite
                        ? 'inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 8px rgba(0,0,0,0.3)'
                        : 'inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 8px rgba(0,0,0,0.5)'
                }}
            >
                {isKing && (
                    <span className="text-lg">👑</span>
                )}
            </motion.div>
        );
    };

    return (
        <div className="relative">
            {/* Board container */}
            <div
                className="aspect-square w-full max-w-sm bg-luxury-card rounded-xl p-1.5 shadow-2xl border border-luxury-border"
                style={{
                    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)'
                }}
            >
                {/* Grid */}
                <div className="grid grid-cols-8 gap-0 w-full h-full rounded-lg overflow-hidden">
                    {Array.from({ length: 8 }).map((_, visualRow) => (
                        Array.from({ length: 8 }).map((_, visualCol) => {
                            // Convert visual position to actual board position
                            const actualRow = getRowIndex(visualRow);
                            const actualCol = getColIndex(visualCol);

                            const piece = boardState[actualRow][actualCol];
                            const isDark = (visualRow + visualCol) % 2 === 1;
                            const canMove = isValidMove(actualRow, actualCol);
                            const canCapture = isValidCapture(actualRow, actualCol);
                            const selected = isSelected(actualRow, actualCol);

                            return (
                                <motion.div
                                    key={`${visualRow}-${visualCol}`}
                                    onClick={() => handleCellClick(actualRow, actualCol)}
                                    className={`
                    aspect-square flex items-center justify-center
                    cursor-pointer relative
                    transition-colors duration-150
                    ${isDark
                                            ? 'bg-emerald-800 hover:bg-emerald-700'
                                            : 'bg-amber-100 hover:bg-amber-50'
                                        }
                    ${canCapture ? 'bg-red-600/80 hover:bg-red-500' : ''}
                  `}
                                    whileHover={{ scale: piece !== PIECE.EMPTY ? 1.02 : 1 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Valid move indicator */}
                                    <AnimatePresence>
                                        {canMove && !canCapture && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute w-4 h-4 rounded-full bg-gold-500/60 shadow-lg"
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* Capture indicator */}
                                    <AnimatePresence>
                                        {canCapture && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 1 }}
                                                className="absolute inset-1 rounded-sm border-4 border-red-400/80"
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* Piece */}
                                    {renderPiece(piece, actualRow, actualCol)}

                                    {/* Coordinate labels (optional - for debugging) */}
                                    {visualRow === 7 && (
                                        <span className="absolute bottom-0.5 right-1 text-[8px] text-luxury-muted/50">
                                            {String.fromCharCode(97 + (shouldRotate ? 7 - visualCol : visualCol))}
                                        </span>
                                    )}
                                    {visualCol === 0 && (
                                        <span className="absolute top-0.5 left-1 text-[8px] text-luxury-muted/50">
                                            {shouldRotate ? visualRow + 1 : 8 - visualRow}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })
                    ))}
                </div>
            </div>

            {/* Color indicator */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${myColor === 'white'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-800 text-gray-200'
                    }`}>
                    You: {myColor === 'white' ? '⚪ White' : '⚫ Black'}
                </span>
            </div>
        </div>
    );
}