import { motion } from 'framer-motion';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import CoinDisplay from '../components/CoinDisplay';
import useUserStore from '../stores/userStore';
import useTelegram from '../hooks/useTelegram';

const COIN_PACKS = [
    { id: 1, coins: 100, price: '9.99 BIRR', popular: false },
    { id: 2, coins: 500, price: '49.99 BIRR', popular: true },
    { id: 3, coins: 1200, price: '99.99 BIRR', popular: false },
    { id: 4, coins: 3000, price: '499.99 BIRR', popular: false },
    { id: 5, coins: 10000, price: '999.99 BIRR', popular: false }
];

export default function Shop() {
    const { user } = useUserStore();
    const { hapticFeedback, showAlert } = useTelegram();

    const handlePurchase = (pack) => {
        hapticFeedback();
        showAlert(`Purchase ${pack.coins} coins for ${pack.price}? (Demo only)`);
    };

    return (
        <div className="flex flex-col h-full bg-obsidian-950">
            <Header title="Shop" />

            <main className="flex-1 overflow-y-auto hide-scrollbar px-4 py-6">
                {/* Current Balance */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 mb-6"
                >
                    <p className="text-sm text-yellow-400/70 mb-1">Your Balance</p>
                    <CoinDisplay coins={user?.coins || 0} size="lg" />
                </motion.div>

                {/* Coin Packs */}
                <h3 className="text-lg font-semibold text-white mb-4">Buy Coins</h3>

                <div className="grid grid-cols-2 gap-3">
                    {COIN_PACKS.map((pack, i) => (
                        <motion.div
                            key={pack.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`
                relative p-4 rounded-2xl border
                ${pack.popular
                                    ? 'bg-gradient-to-br from-violet-600/20 to-purple-600/20 border-violet-500/50'
                                    : 'bg-obsidian-800/50 border-obsidian-700'
                                }
              `}
                        >
                            {pack.popular && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-violet-600 text-xs font-bold text-white">
                                    POPULAR
                                </div>
                            )}

                            <div className="text-center">
                                <div className="text-3xl mb-2">🪙</div>
                                <p className="text-2xl font-bold text-yellow-400">{pack.coins.toLocaleString()}</p>
                                <p className="text-xs text-obsidian-400 mb-3">coins</p>

                                <Button
                                    onClick={() => handlePurchase(pack)}
                                    variant={pack.popular ? 'primary' : 'secondary'}
                                    size="sm"
                                    fullWidth
                                >
                                    {pack.price}
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Free Coins */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/30"
                >
                    <h4 className="font-semibold text-green-400 mb-2">🎁 Free Coins</h4>
                    <p className="text-sm text-green-400/70 mb-3">
                        Claim your daily reward of 20 coins every 24 hours!
                    </p>
                    <Button
                        onClick={() => hapticFeedback()}
                        variant="success"
                        size="sm"
                        disabled={!user?.canClaimDaily}
                    >
                        {user?.canClaimDaily ? 'Claim Now' : 'Already Claimed'}
                    </Button>
                </motion.div>
            </main>

            <BottomNav />
        </div>
    );
}