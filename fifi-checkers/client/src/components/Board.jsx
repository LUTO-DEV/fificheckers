import { motion } from 'framer-motion';
import Piece from './Piece';
import useGame from '../hooks/useGame';
import useGameStore from '../stores/gameStore';
import { PIECE } from '../utils/constants';

export default function Board() {
    const { boardState, currentPlayer, myPlayerNum } = useGameStore();
    const {
        handleCellClick,
        selectedPiece,
        validMoves,
        validCaptures,
        isMyTurn
    } = useGame();

    if (!boardState) return null;

    const isValidMove = (row, col) =>
        validMoves.some(m => m.row === row && m.col === col);

    const isValidCapture = (row, col) =>
        validCaptures.some(c => c.row === row && c.col === col);

    const isSelected = (row, col) =>
        selectedPiece?.row === row && selectedPiece?.col === col;

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
                    {boardState.map((row, rowIndex) =>
                        row.map((cell, colIndex) => {
                            const isDark = (rowIndex + colIndex) % 2 === 1;
                            const isValidMoveCell = isValidMove(rowIndex, colIndex);
                            const isValidCaptureCell = isValidCapture(rowIndex, colIndex);
                            const isSelectedCell = isSelected(rowIndex, colIndex);

                            return (
                                <motion.div
                                    key={`${rowIndex}-${colIndex}`}
                                    onClick={() => handleCellClick(rowIndex, colIndex)}
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

            {/* Turn indicator */}
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
        </motion.div>
    );
}