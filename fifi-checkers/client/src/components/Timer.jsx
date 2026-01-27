import { motion } from 'framer-motion';
import { formatTime } from '../utils/helpers';

export default function Timer({ time, isActive, isMyTimer, danger = false }) {
    const isLow = time <= 30;
    const isCritical = time <= 10;

    return (
        <motion.div
            animate={isCritical && isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
            className={`
        relative px-4 py-2 rounded-xl font-mono font-bold text-xl
        ${isActive
                    ? isCritical
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : isLow
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                            : 'bg-violet-500/20 border-violet-500 text-violet-400'
                    : 'bg-obsidian-800 border-obsidian-700 text-obsidian-400'
                }
        border-2 transition-all duration-300
      `}
        >
            {formatTime(time)}

            {isActive && (
                <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
            )}
        </motion.div>
    );
}