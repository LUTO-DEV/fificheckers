import { motion } from 'framer-motion';
import { RANKS } from '../utils/constants';

export default function RankBadge({ rank, size = 'md', showName = true }) {
    const rankInfo = RANKS[rank] || RANKS.Wood;

    const sizes = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5'
    };

    return (
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1.5 rounded-full font-medium ${sizes[size]}`}
            style={{
                backgroundColor: `${rankInfo.color}20`,
                border: `1px solid ${rankInfo.color}40`,
                color: rankInfo.color
            }}
        >
            <span>{rankInfo.icon}</span>
            {showName && <span>{rankInfo.name}</span>}
        </motion.div>
    );
}