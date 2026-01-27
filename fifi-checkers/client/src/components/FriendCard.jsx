import { motion } from 'framer-motion';
import RankBadge from './RankBadge';
import Button from './Button';

export default function FriendCard({ friend, onChallenge, onRemove }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700"
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-obsidian-700 flex items-center justify-center text-xl">
                    {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                        '👤'
                    )}
                </div>

                <div>
                    <p className="font-semibold text-white">{friend.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <RankBadge rank={friend.rank} size="sm" />
                        <span className="text-xs text-obsidian-400">{friend.wins} wins</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={() => onChallenge(friend)}
                    variant="primary"
                    size="sm"
                >
                    ⚔️
                </Button>

                <Button
                    onClick={() => onRemove(friend)}
                    variant="ghost"
                    size="sm"
                >
                    ✕
                </Button>
            </div>
        </motion.div>
    );
}