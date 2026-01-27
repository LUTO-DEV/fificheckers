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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/95 backdrop-blur-sm"
        >
            <div className="w-full max-w-sm text-center space-y-8">
                {/* Animated pieces */}
                <div className="relative h-32 flex items-center justify-center">
                    <motion.div
                        animate={{ x: [-40, 40, -40] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute w-16 h-16 rounded-full piece-white flex items-center justify-center"
                    >
                        <span className="text-2xl">⚪</span>
                    </motion.div>

                    <motion.div
                        animate={{ x: [40, -40, 40] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute w-16 h-16 rounded-full piece-black flex items-center justify-center"
                    >
                        <span className="text-2xl">⚫</span>
                    </motion.div>

                    {/* VS text */}
                    <motion.span
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-2xl font-bold text-violet-500 z-10"
                    >
                        VS
                    </motion.span>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-display font-bold text-white">
                        Finding Opponent
                    </h2>

                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-obsidian-400"
                    >
                        Searching for players...
                    </motion.div>

                    {queuePosition && (
                        <p className="text-sm text-obsidian-500">
                            Position in queue: #{queuePosition}
                        </p>
                    )}
                </div>

                {/* Match info */}
                <div className="flex justify-center gap-4">
                    <div className="px-4 py-2 rounded-xl bg-obsidian-800 text-sm">
                        <span className="text-obsidian-400">Mode: </span>
                        <span className="text-white font-medium">{timerMode}</span>
                    </div>

                    <div className="px-4 py-2 rounded-xl bg-obsidian-800 text-sm">
                        <span className="text-obsidian-400">Bet: </span>
                        <span className="text-yellow-400 font-medium">
                            {betAmount === 0 ? 'FREE' : `${betAmount} 🪙`}
                        </span>
                    </div>
                </div>

                {/* Loading bar */}
                <div className="w-full h-1 bg-obsidian-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-violet-600 to-purple-600"
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