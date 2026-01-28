import { motion } from 'framer-motion';
import Timer from './Timer';

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
        flex items-center justify-between p-3 rounded-2xl border
        ${isActive
                    ? 'bg-gold-500/5 border-gold-500/30'
                    : 'bg-luxury-card/50 border-luxury-border'
                }
        transition-all duration-300
      `}
        >
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`
          w-11 h-11 rounded-xl flex items-center justify-center text-xl
          ${color === 'white' ? 'bg-luxury-white/10' : 'bg-luxury-black/50'}
          border ${isActive ? 'border-gold-500/50' : 'border-luxury-border'}
        `}>
                    {player?.isBot ? '🤖' : (
                        <span>{color === 'white' ? '⚪' : '⚫'}</span>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${isMe ? 'text-gold-400' : 'text-luxury-white'}`}>
                            {player?.username || 'Player'}
                        </span>
                        {isMe && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 font-medium">
                                YOU
                            </span>
                        )}
                    </div>

                    {/* Captured pieces */}
                    {captured > 0 && (
                        <div className="flex items-center gap-1 text-xs text-luxury-text mt-0.5">
                            <span>Captured: {captured}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Timer */}
            <Timer time={timer} isActive={isActive} isMyTimer={isMe} />
        </motion.div>
    );
}