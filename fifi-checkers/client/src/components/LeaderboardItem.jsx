import { motion } from 'framer-motion';
import RankBadge from './RankBadge';

export default function LeaderboardItem({ item, index, isMe }) {
    const getMedal = (pos) => {
        if (pos === 1) return '🥇';
        if (pos === 2) return '🥈';
        if (pos === 3) return '🥉';
        return pos;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
        flex items-center gap-4 p-4 rounded-2xl
        ${isMe
                    ? 'bg-violet-600/20 border border-violet-500/30'
                    : 'bg-obsidian-800/50'
                }
      `}
        >
            {/* Position */}
            <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center font-bold
        ${item.position <= 3 ? 'text-2xl' : 'text-lg text-obsidian-400 bg-obsidian-700'}
      `}>
                {getMedal(item.position)}
            </div>

            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl bg-obsidian-700 flex items-center justify-center overflow-hidden">
                {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xl">👤</span>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{item.username}</p>
                    {isMe && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">
                            YOU
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <RankBadge rank={item.rank} size="sm" showName={false} />
                    <span className="text-xs text-obsidian-400">{item.winRate}% win rate</span>
                </div>
            </div>

            {/* Stats */}
            <div className="text-right">
                <p className="font-bold text-white">{item.wins}</p>
                <p className="text-xs text-obsidian-400">wins</p>
            </div>
        </motion.div>
    );
}