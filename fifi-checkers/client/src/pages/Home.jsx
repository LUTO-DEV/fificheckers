import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import CoinDisplay from '../components/CoinDisplay';
import RankBadge from '../components/RankBadge';
import Modal from '../components/Modal';
import useUserStore from '../stores/userStore';
import useTelegram from '../hooks/useTelegram';
import { claimDailyReward } from '../utils/api';
import { formatCoins } from '../utils/helpers';

export default function Home() {
    const navigate = useNavigate();
    const { user, updateUser } = useUserStore();
    const { hapticFeedback } = useTelegram();
    const [showDailyModal, setShowDailyModal] = useState(false);
    const [dailyClaimed, setDailyClaimed] = useState(false);

    useEffect(() => {
        if (user?.canClaimDaily) {
            setShowDailyModal(true);
        }
    }, [user]);

    const handleClaimDaily = async () => {
        try {
            hapticFeedback('notification');
            const result = await claimDailyReward();
            updateUser({ coins: result.newBalance, canClaimDaily: false });
            setDailyClaimed(true);
            setTimeout(() => setShowDailyModal(false), 2000);
        } catch (error) {
            console.error('Failed to claim daily:', error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-obsidian-950">
            <Header showProfile={false} />

            <main className="flex-1 overflow-y-auto hide-scrollbar">
                <div className="px-4 py-6 space-y-6">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8"
                    >
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-7xl mb-4"
                        >
                            ♟️
                        </motion.div>

                        <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            FiFi Checkers
                        </h1>

                        <p className="text-obsidian-400 mt-2">
                            Play, Bet, Win!
                        </p>
                    </motion.div>

                    {/* User Stats Card */}
                    {user && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="p-5 rounded-3xl bg-gradient-to-br from-obsidian-800 to-obsidian-900 border border-obsidian-700"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-obsidian-700 flex items-center justify-center text-2xl">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                    ) : (
                                        '👤'
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-white">{user.username}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <RankBadge rank={user.rank} size="sm" />
                                        <CoinDisplay coins={user.coins} size="sm" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-obsidian-800 text-center">
                                    <p className="text-2xl font-bold text-green-400">{user.wins}</p>
                                    <p className="text-xs text-obsidian-400">Wins</p>
                                </div>
                                <div className="p-3 rounded-xl bg-obsidian-800 text-center">
                                    <p className="text-2xl font-bold text-red-400">{user.losses}</p>
                                    <p className="text-xs text-obsidian-400">Losses</p>
                                </div>
                                <div className="p-3 rounded-xl bg-obsidian-800 text-center">
                                    <p className="text-2xl font-bold text-yellow-400">{user.winStreak}</p>
                                    <p className="text-xs text-obsidian-400">Streak</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Play Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-3"
                    >
                        <Button
                            onClick={() => {
                                hapticFeedback();
                                navigate('/lobby');
                            }}
                            variant="primary"
                            size="xl"
                            fullWidth
                            icon="🎮"
                        >
                            Play Now
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => {
                                    hapticFeedback();
                                    navigate('/lobby', { state: { mode: 'bot' } });
                                }}
                                variant="secondary"
                                size="lg"
                                fullWidth
                                icon="🤖"
                            >
                                vs Bot
                            </Button>

                            <Button
                                onClick={() => {
                                    hapticFeedback();
                                    navigate('/lobby', { state: { mode: 'friend' } });
                                }}
                                variant="secondary"
                                size="lg"
                                fullWidth
                                icon="👥"
                            >
                                vs Friend
                            </Button>
                        </div>
                    </motion.div>

                    {/* Quick Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        <button
                            onClick={() => navigate('/leaderboard')}
                            className="p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700 text-left hover:border-violet-500/50 transition-colors"
                        >
                            <span className="text-2xl">🏆</span>
                            <p className="font-semibold text-white mt-2">Leaderboard</p>
                            <p className="text-xs text-obsidian-400">Top 50 players</p>
                        </button>

                        <button
                            onClick={() => navigate('/friends')}
                            className="p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700 text-left hover:border-violet-500/50 transition-colors"
                        >
                            <span className="text-2xl">👥</span>
                            <p className="font-semibold text-white mt-2">Friends</p>
                            <p className="text-xs text-obsidian-400">Challenge them!</p>
                        </button>
                    </motion.div>
                </div>
            </main>

            <BottomNav />

            {/* Daily Reward Modal */}
            <Modal
                isOpen={showDailyModal}
                onClose={() => !dailyClaimed && setShowDailyModal(false)}
                title={dailyClaimed ? null : "🎁 Daily Reward"}
                showClose={!dailyClaimed}
            >
                {dailyClaimed ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-center py-8"
                    >
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5 }}
                            className="text-6xl mb-4"
                        >
                            🎉
                        </motion.div>
                        <p className="text-xl font-bold text-green-400">+20 Coins!</p>
                    </motion.div>
                ) : (
                    <div className="text-center space-y-4">
                        <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-5xl"
                        >
                            🪙
                        </motion.div>

                        <p className="text-obsidian-300">
                            Claim your daily bonus of <span className="text-yellow-400 font-bold">20 coins</span>!
                        </p>

                        <Button
                            onClick={handleClaimDaily}
                            variant="success"
                            size="lg"
                            fullWidth
                        >
                            Claim Reward
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
}