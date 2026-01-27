import { motion } from 'framer-motion';
import { BET_OPTIONS } from '../utils/constants';
import { formatCoins } from '../utils/helpers';
import useUserStore from '../stores/userStore';

export default function BetSelector({ value, onChange }) {
    const { user } = useUserStore();
    const userCoins = user?.coins || 0;

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-obsidian-300">Bet Amount</label>

            <div className="grid grid-cols-4 gap-2">
                {BET_OPTIONS.map((amount) => {
                    const canAfford = amount <= userCoins;
                    const isSelected = value === amount;

                    return (
                        <motion.button
                            key={amount}
                            whileTap={{ scale: canAfford ? 0.95 : 1 }}
                            onClick={() => canAfford && onChange(amount)}
                            disabled={!canAfford}
                            className={`
                relative py-3 rounded-xl font-semibold text-sm transition-all
                ${isSelected
                                    ? 'bg-violet-600 text-white border-2 border-violet-400'
                                    : canAfford
                                        ? 'bg-obsidian-800 text-white border-2 border-obsidian-700 hover:border-violet-500'
                                        : 'bg-obsidian-900 text-obsidian-600 border-2 border-obsidian-800 cursor-not-allowed'
                                }
              `}
                        >
                            {amount === 0 ? (
                                <span className="text-green-400">FREE</span>
                            ) : (
                                <span className="flex items-center justify-center gap-1">
                                    <span className="text-yellow-400">🪙</span>
                                    {formatCoins(amount)}
                                </span>
                            )}

                            {isSelected && (
                                <motion.div
                                    layoutId="betIndicator"
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-xs"
                                >
                                    ✓
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {value > 0 && (
                <p className="text-xs text-obsidian-400 text-center">
                    Win: <span className="text-green-400 font-semibold">+{formatCoins(value * 2)} 🪙</span>
                </p>
            )}
        </div>
    );
}