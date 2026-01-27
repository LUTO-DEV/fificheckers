import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import CoinDisplay from '../components/CoinDisplay';
import RankBadge from '../components/RankBadge';
import Loader from '../components/Loader';
import useUserStore from '../stores/userStore';
import useTelegram from '../hooks/useTelegram';
import { getProfile, claimDailyReward, getStats, getMatchHistory } from '../utils/api';
import { formatCoins, getTimeAgo } from '../utils/helpers';
import { RANKS } from '../utils/constants';

export default function Profile() {
    const { user, updateUser } = useUserStore();
    const { hapticFeedback } = useTelegram();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, historyData, profileData] = await Promise.all([
                getStats(),
                getMatchHistory(1, 10),
                getProfile()
            ]);

            setStats(statsData.stats);
            setHistory(historyData.matches);
            updateUser(profileData.user);
        } catch (error) {
            console.error('Failed to load profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimDaily = async () => {
        if (!user?.canClaimDaily || claiming) return;

        setClaiming(true);
        hapticFeedback('notification');

        try {
            const result = await claimDailyReward();
            updateUser({ coins: result.newBalance, canClaimDaily: false });
        } catch (error) {
            console.error('Failed to claim daily:', error);
        } finally {
            setClaiming(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-obsidian-950">
                <Header title="Profile" />
                <div className="flex-1 flex items-center justify-center">
                    <Loader text="Loading profile..." />
                </div>
                <BottomNav />
            </div>
        );
    }

    const rankInfo = RANKS[user?.rank] || RANKS.Wood;

    return (
        <div className="flex flex-col h-full bg-obsidian-950">
            <Header title="Profile" />

            <main className="flex-1 overflow-y-auto hide-scrollbar">
                <div className="px-4 py-6 space-y-6">
                    {/* Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-obsidian-800 to-obsidian-900 border border-obsidian-700"
                    >
                        {/* Background glow */}
                        <div
                            className="absolute inset-0 opacity-20"
                            style={{
                                background: `radial-gradient(circle at 50% 0%, ${rankInfo.color}, transparent 70%)`
                            }}
                        />

                        <div className="relative p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-obsidian-700 flex items-center justify-center text-3xl border-2"
                                    style={{ borderColor: rankInfo.color }}
                                >
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                    ) : (
                                        '👤'
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-2xl font-display font-bold text-white">
                                        {user?.username}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <RankBadge rank={user?.rank || 'Wood'} />
                                    </div>
                                </div>
                            </div>

                            {/* Rank Progress */}
                            {user?.winsToNextRank && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-obsidian-400">Rank Progress</span>
                                        <span className="text-white">{user.winsToNextRank} wins to next rank</span>
                                    </div>
                                    <div className="h-2 bg-obsidian-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${user.rankProgress}%` }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: rankInfo.color }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Coins */}
                            <div className="mt-4 p-4 rounded-2xl bg-obsidian-800/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-obsidian-400">Balance</p>
                                        <p className="text-2xl font-bold text-yellow-400">
                                            🪙 {formatCoins(user?.coins || 0)}
                                        </p>
                                    </div>

                                    {user?.canClaimDaily && (
                                        <Button
                                            onClick={handleClaimDaily}
                                            variant="success"
                                            size="sm"
                                            loading={claiming}
                                            icon="🎁"
                                        >
                                            Claim +20
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        <div className="p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700">
                            <p className="text-3xl font-bold text-green-400">{user?.wins || 0}</p>
                            <p className="text-sm text-obsidian-400">Total Wins</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700">
                            <p className="text-3xl font-bold text-red-400">{user?.losses || 0}</p>
                            <p className="text-sm text-obsidian-400">Total Losses</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700">
                            <p className="text-3xl font-bold text-violet-400">{stats?.winRate || 0}%</p>
                            <p className="text-sm text-obsidian-400">Win Rate</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700">
                            <p className="text-3xl font-bold text-yellow-400">{user?.bestWinStreak || 0}</p>
                            <p className="text-sm text-obsidian-400">Best Streak</p>
                        </div>
                    </motion.div>

                    {/* Recent Form */}
                    {stats?.recentForm && stats.recentForm.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-4 rounded-2xl bg-obsidian-800/50 border border-obsidian-700"
                        >
                            <p className="text-sm text-obsidian-400 mb-3">Recent Form</p>
                            <div className="flex gap-2">
                                {stats.recentForm.map((result, i) => (
                                    <div
                                        key={i}
                                        className={`
                      w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                      ${result === 'W'
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }
                    `}
                                    >
                                        {result}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Match History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className="text-lg font-semibold text-white mb-3">Recent Matches</h3>

                        {history.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-obsidian-800/50 border border-obsidian-700 text-center">
                                <p className="text-obsidian-400">No matches played yet</p>
                                <p className="text-sm text-obsidian-500 mt-1">Start playing to see your history!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((match, i) => (
                                    <motion.div
                                        key={match.matchId}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        className={`
                      flex items-center justify-between p-4 rounded-xl
                      ${match.won
                                                ? 'bg-green-500/10 border border-green-500/20'
                                                : 'bg-red-500/10 border border-red-500/20'
                                            }
                    `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center text-lg
                        ${match.won ? 'bg-green-500/20' : 'bg-red-500/20'}
                      `}>
                                                {match.won ? '🏆' : '😔'}
                                            </div>

                                            <div>
                                                <p className="font-medium text-white">vs {match.opponent}</p>
                                                <p className="text-xs text-obsidian-400">
                                                    {match.totalMoves} moves • {getTimeAgo(match.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {match.betAmount > 0 && (
                                            <CoinDisplay
                                                coins={match.won ? match.betAmount * 2 : -match.betAmount}
                                                showPlus={match.won}
                                                size="sm"
                                            />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Total Earnings */}
                    {user?.totalEarnings > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
                        >
                            <p className="text-sm text-yellow-400/70">Total Earnings</p>
                            <p className="text-2xl font-bold text-yellow-400">
                                🪙 {formatCoins(user.totalEarnings)}
                            </p>
                        </motion.div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
}