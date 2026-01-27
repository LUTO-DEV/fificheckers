import { motion } from 'framer-motion';
import Piece from './Piece';
import useGame from '../hooks/useGame';
import useGameStore from '../stores/gameStore';
import { PIECE } from '../utils/constants';

export default function Board() {
    const { boardState } = useGameStore();
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
            className="relative aspect-square w-full max-w-[400px] mx-auto"
        >
            {/* Board container with glow effect */}
            <div className={`
        absolute inset-0 rounded-2xl overflow-hidden
        ${isMyTurn ? 'shadow-neon' : 'shadow-lg shadow-black/50'}
        transition-shadow duration-500
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
                    ${isValidMoveCell ? 'cell-highlight' : ''}
                    ${isValidCaptureCell ? 'cell-capture' : ''}
                    cursor-pointer transition-all duration-200
                  `}
                                    whileHover={{ brightness: 1.1 }}
                                >
                                    {/* Valid move indicator */}
                                    {isValidMoveCell && !isValidCaptureCell && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute w-1/3 h-1/3 rounded-full bg-violet-500/50"
                                        />
                                    )}

                                    {/* Valid capture indicator */}
                                    {isValidCaptureCell && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                            className="absolute w-2/3 h-2/3 rounded-full border-4 border-red-500/70"
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

                {/* Row labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around pl-1 pointer-events-none">
                    {[8, 7, 6, 5, 4, 3, 2, 1].map(n => (
                        <span key={n} className="text-[10px] text-obsidian-500 font-mono">{n}</span>
                    ))}
                </div>

                {/* Column labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around pb-0.5 pointer-events-none">
                    {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(l => (
                        <span key={l} className="text-[10px] text-obsidian-500 font-mono">{l}</span>
                    ))}
                </div>
            </div>

            {/* Turn indicator overlay */}
            {!isMyTurn && (
                <div className="absolute inset-0 bg-black/20 rounded-2xl pointer-events-none flex items-center justify-center">
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-lg font-medium text-white bg-obsidian-900/80 px-4 py-2 rounded-xl"
                    >
                        Opponent's turn...
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}