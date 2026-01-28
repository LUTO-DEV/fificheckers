import { motion } from 'framer-motion';
import { formatTime } from '../utils/helpers';

export default function Timer({ time, isActive, isMyTimer }) {
    const isLow = time <= 30;
    const isCritical = time <= 10;

    return (
        <motion.div
            animate={isCritical && isActive ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
            className={`
        relative px-4 py-2 rounded-xl font-mono font-bold text-xl
        ${isActive
                    ? isCritical
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : isLow
                            ? 'bg-gold-500/20 border-gold-500/50 text-gold-400'
                            : 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                    : 'bg-luxury-card border-luxury-border text-luxury-text'
                }
        border transition-all duration-300
      `}
        >
            {formatTime(time)}

            {isActive && (
                <motion.div
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
            )}
        </motion.div>
    );
}