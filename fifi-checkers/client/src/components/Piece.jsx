import { motion } from 'framer-motion';
import { PIECE } from '../utils/constants';

export default function Piece({ type, isSelected }) {
    const isWhite = type === PIECE.WHITE || type === PIECE.WHITE_KING;
    const isKing = type === PIECE.WHITE_KING || type === PIECE.BLACK_KING;

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{
                scale: isSelected ? 1.1 : 1,
                y: isSelected ? -4 : 0
            }}
            whileHover={{ scale: 1.05 }}
            className={`
        w-[85%] h-[85%] rounded-full cursor-pointer
        ${isWhite ? 'piece-white' : 'piece-black'}
        ${isSelected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent' : ''}
        flex items-center justify-center relative
        transition-shadow duration-200
      `}
        >
            {isKing && (
                <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute text-yellow-400 text-lg drop-shadow-lg"
                    style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.8)' }}
                >
                    ♔
                </motion.span>
            )}
        </motion.div>
    );
}