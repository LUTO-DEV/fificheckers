import { motion } from 'framer-motion';
import { PIECE } from '../utils/constants';

export default function Piece({ type, isSelected }) {
    const isWhite = type === PIECE.WHITE || type === PIECE.WHITE_KING;
    const isKing = type === PIECE.WHITE_KING || type === PIECE.BLACK_KING;

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{
                scale: isSelected ? 1.15 : 1,
                y: isSelected ? -3 : 0
            }}
            whileTap={{ scale: 0.95 }}
            className={`
        w-[80%] h-[80%] rounded-full cursor-pointer
        ${isWhite ? 'piece-white' : 'piece-black'}
        flex items-center justify-center relative
        transition-shadow duration-200
        ${isSelected ? 'ring-2 ring-gold-400 ring-offset-1 ring-offset-transparent' : ''}
      `}
        >
            {isKing && (
                <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute text-gold-400 drop-shadow-lg piece-king"
                    style={{
                        fontSize: '1.2em',
                        textShadow: '0 0 10px rgba(251, 191, 36, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                    }}
                >
                    ♛
                </motion.span>
            )}
        </motion.div>
    );
}