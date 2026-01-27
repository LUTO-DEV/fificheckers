import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import LeaderboardItem from '../components/LeaderboardItem';
import Loader from '../components/Loader';
import useUserStore from '../stores/userStore';
import { getGlobalLeaderboard, getFriendsLeaderboard, getMyRank } from '../utils/api';

export default function Leaderboard() {
    const { user } = useUserStore();
    const [tab, setTab] = useState('global');
    const [leaderboard, setLeaderboard] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, [tab]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const [data, rankData] = await Promise.all([
                tab === 'global' ? getGlobalLeaderboard() : getFriendsLeaderboard(),
                getMyRank()
            ]);

            setLeaderboard(data.leaderboard);
            setMyRank(rankData);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-obsidian-950">
            <Header title="Leaderboard" />

            {/* Tabs */}
            <div className="px-4 py-3">
                <div className="flex gap-2 p-1 rounded-xl bg-obsidian-800">
                    {[
                        { id: 'global', label: 'Global', icon: '🌍' },
                        { id: 'friends', label: 'Friends', icon: '👥' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all
                ${tab === t.id
                                    ? 'bg-violet-600 text-white'
                                    : 'text-obsidian-400 hover:text-white'
                                }
              `}
                        >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* My Rank Card */}
            {myRank && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-violet-400">Your Global Rank</p>
                            <p className="text-3xl font-bold text-white">#{myRank.position}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-violet-400">Top</p>
                            <p className="text-2xl font-bold text-violet-400">{myRank.percentile}%</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Leaderboard List */}
            <main className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader text="Loading..." />
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-4">🏆</p>
                        <p className="text-obsidian-400">
                            {tab === 'friends'
                                ? 'Add friends to see the leaderboard!'
                                : 'No players yet'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {leaderboard.map((item, index) => (
                            <LeaderboardItem
                                key={item.telegramId}
                                item={item}
                                index={index}
                                isMe={item.telegramId === user?.telegramId}
                            />
                        ))}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}