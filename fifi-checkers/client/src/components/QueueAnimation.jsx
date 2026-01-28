import { motion } from 'framer-motion';
import Button from './Button';
import useGameStore from '../stores/gameStore';

export default function QueueAnimation({ onCancel }) {
    const { queuePosition, betAmount, timerMode } = useGameStore();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-luxury-black/95"
        >
            <div className="w-full max-w-sm text-center space-y-8">
                {/* Animated pieces */}
                <div className="relative h-32 flex items-center justify-center">
                    <motion.div
                        animate={{ x: [-50, 50, -50] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute w-16 h-16 rounded-full piece-white flex items-center justify-center shadow-lg"
                    />

                    <motion.div
                        animate={{ x: [50, -50, 50] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute w-16 h-16 rounded-full piece-black flex items-center justify-center shadow-lg"
                    />

                    {/* VS */}
                    <motion.span
                        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-2xl font-bold text-gold-500 z-10 font-display"
                    >
                        VS
                    </motion.span>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-display font-bold text-luxury-white">
                        Finding Opponent
                    </h2>

                    <motion.p
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-luxury-text"
                    >
                        Searching for players...
                    </motion.p>

                    {queuePosition && (
                        <p className="text-sm text-luxury-muted">
                            Position in queue: <span className="text-gold-400">#{queuePosition}</span>
                        </p>
                    )}
                </div>

                {/* Match info */}
                <div className="flex justify-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-luxury-card border border-luxury-border text-sm">
                        <span className="text-luxury-text">Mode: </span>
                        <span className="text-luxury-white font-medium">{timerMode}</span>
                    </div>

                    <div className="px-4 py-2 rounded-xl bg-luxury-card border border-luxury-border text-sm">
                        <span className="text-luxury-text">Bet: </span>
                        <span className="text-gold-400 font-medium">
                            {betAmount === 0 ? 'FREE' : `${betAmount} 🪙`}
                        </span>
                    </div>
                </div>

                {/* Loading bar */}
                <div className="w-full h-1 bg-luxury-card rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        style={{ width: '50%' }}
                    />
                </div>

                <Button
                    onClick={onCancel}
                    variant="secondary"
                    fullWidth
                >
                    Cancel
                </Button>
            </div>
        </motion.div>
    );
}