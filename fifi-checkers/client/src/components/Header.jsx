import { motion } from 'framer-motion';
import CoinDisplay from './CoinDisplay';
import RankBadge from './RankBadge';
import useUserStore from '../stores/userStore';

export default function Header({ title, showBack, onBack, showProfile = true }) {
    const { user } = useUserStore();

    return (
        <header className="safe-area-top">
            <div className="flex items-center justify-between px-4 py-3 bg-luxury-dark/95 backdrop-blur-lg border-b border-luxury-border">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-luxury-card border border-luxury-border text-luxury-white"
                        >
                            ←
                        </motion.button>
                    )}

                    {title ? (
                        <h1 className="text-lg font-display font-semibold text-luxury-white">{title}</h1>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">♟️</span>
                            <span className="font-display font-bold text-xl gradient-gold-text">
                                FiFi
                            </span>
                        </div>
                    )}
                </div>

                {showProfile && user && (
                    <div className="flex items-center gap-3">
                        <RankBadge rank={user.rank} size="sm" />
                        <CoinDisplay coins={user.coins} />
                    </div>
                )}
            </div>
        </header>
    );
}