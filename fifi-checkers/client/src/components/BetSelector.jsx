import { motion } from 'framer-motion';
import { BET_OPTIONS } from '../utils/constants';
import { formatCoins } from '../utils/helpers';
import useUserStore from '../stores/userStore';

export default function BetSelector({ value, onChange }) {
    const { user } = useUserStore();
    const userCoins = user?.coins || 0;

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-luxury-text">Bet Amount</label>

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
                relative py-3 rounded-xl font-semibold text-sm transition-all border
                ${isSelected
                                    ? 'bg-gold-500/20 text-gold-400 border-gold-500/50'
                                    : canAfford
                                        ? 'bg-luxury-card text-luxury-white border-luxury-border hover:border-gold-500/30'
                                        : 'bg-luxury-dark text-luxury-muted border-luxury-border cursor-not-allowed opacity-50'
                                }
              `}
                        >
                            {amount === 0 ? (
                                <span className="text-emerald-400">FREE</span>
                            ) : (
                                <span className="flex items-center justify-center gap-1">
                                    <span>🪙</span>
                                    {formatCoins(amount)}
                                </span>
                            )}

                            {isSelected && (
                                <motion.div
                                    layoutId="betIndicator"
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-gold-500 rounded-full flex items-center justify-center text-[10px] text-black font-bold"
                                >
                                    ✓
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {value > 0 && (
                <p className="text-xs text-luxury-text text-center">
                    Win: <span className="text-emerald-400 font-semibold">+{formatCoins(value * 2)} 🪙</span>
                </p>
            )}
        </div>
    );
}