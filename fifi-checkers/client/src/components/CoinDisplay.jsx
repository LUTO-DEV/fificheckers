import { motion } from 'framer-motion';
import { formatCoins } from '../utils/helpers';

export default function CoinDisplay({ coins, size = 'md', showPlus = false, animated = false }) {
    const sizes = {
        sm: 'text-sm px-2.5 py-1',
        md: 'text-base px-3 py-1.5',
        lg: 'text-lg px-4 py-2'
    };

    return (
        <motion.div
            animate={animated ? { scale: [1, 1.1, 1] } : {}}
            className={`flex items-center gap-1.5 bg-gold-500/10 rounded-full border border-gold-500/30 ${sizes[size]}`}
        >
            <span>🪙</span>
            <span className="font-semibold text-gold-400 font-mono">
                {showPlus && coins > 0 && '+'}
                {formatCoins(coins)}
            </span>
        </motion.div>
    );
}