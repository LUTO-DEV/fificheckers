import { motion } from 'framer-motion';
import { formatCoins } from '../utils/helpers';

export default function CoinDisplay({ coins, size = 'md', showPlus = false, animated = false }) {
    const sizes = {
        sm: 'text-sm px-2 py-1',
        md: 'text-base px-3 py-1.5',
        lg: 'text-lg px-4 py-2'
    };

    return (
        <motion.div
            animate={animated ? { scale: [1, 1.1, 1] } : {}}
            className={`flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-full border border-yellow-500/30 ${sizes[size]}`}
        >
            <span className="text-yellow-400">🪙</span>
            <span className="font-semibold text-yellow-400">
                {showPlus && coins > 0 && '+'}
                {formatCoins(coins)}
            </span>
        </motion.div>
    );
}