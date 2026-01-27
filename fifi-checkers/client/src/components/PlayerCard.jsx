import { motion } from 'framer-motion';
import Timer from './Timer';
import RankBadge from './RankBadge';

export default function PlayerCard({
    player,
    timer,
    isActive,
    isMe,
    color,
    captured = 0
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: isMe ? 20 : -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
        flex items-center justify-between p-3 rounded-2xl
        ${isActive ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-obsidian-800/50'}
        transition-all duration-300
      `}
        >
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          ${color === 'white' ? 'bg-white/10' : 'bg-black/30'}
          border-2 ${isActive ? 'border-violet-500' : 'border-obsidian-700'}
        `}>
                    {player?.isBot ? '🤖' : player?.avatarUrl ? (
                        <img src={player.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                        <span>{color === 'white' ? '⚪' : '⚫'}</span>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isMe ? 'text-violet-400' : 'text-white'}`}>
                            {player?.username || 'Player'}
                        </span>
                        {isMe && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">
                                YOU
                            </span>
                        )}
                    </div>

                    {player?.rank && (
                        <RankBadge rank={player.rank} size="sm" showName={false} />
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Captured pieces */}
                {captured > 0 && (
                    <div className="flex items-center gap-1 text-sm text-obsidian-400">
                        <span>×{captured}</span>
                        <span className={color === 'white' ? 'text-gray-800' : 'text-gray-200'}>
                            {color === 'white' ? '⚫' : '⚪'}
                        </span>
                    </div>
                )}

                {/* Timer */}
                <Timer time={timer} isActive={isActive} isMyTimer={isMe} />
            </div>
        </motion.div>
    );
}