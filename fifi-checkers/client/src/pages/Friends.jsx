import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Button from '../components/Button';
import FriendCard from '../components/FriendCard';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import useTelegram from '../hooks/useTelegram';
import {
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers
} from '../utils/api';

export default function Friends() {
    const navigate = useNavigate();
    const { hapticFeedback, shareUrl } = useTelegram();

    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const data = await getFriends();
            setFriends(data.friends);
            setRequests(data.pendingRequests);
        } catch (error) {
            console.error('Failed to load friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;

        setSearching(true);
        try {
            const data = await searchUsers(searchQuery);
            setSearchResults(data.users);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async (telegramId) => {
        hapticFeedback();
        try {
            await sendFriendRequest(telegramId);
            setSearchResults(prev =>
                prev.map(u =>
                    u.telegramId === telegramId
                        ? { ...u, requestSent: true }
                        : u
                )
            );
        } catch (error) {
            console.error('Failed to send request:', error);
        }
    };

    const handleAccept = async (fromTelegramId) => {
        hapticFeedback('notification');
        try {
            await acceptFriendRequest(fromTelegramId);
            loadFriends();
        } catch (error) {
            console.error('Failed to accept:', error);
        }
    };

    const handleReject = async (fromTelegramId) => {
        hapticFeedback();
        try {
            await rejectFriendRequest(fromTelegramId);
            setRequests(prev => prev.filter(r => r.from !== fromTelegramId));
        } catch (error) {
            console.error('Failed to reject:', error);
        }
    };

    const handleRemove = async (friend) => {
        hapticFeedback();
        try {
            await removeFriend(friend.telegramId);
            setFriends(prev => prev.filter(f => f.telegramId !== friend.telegramId));
        } catch (error) {
            console.error('Failed to remove friend:', error);
        }
    };

    const handleChallenge = (friend) => {
        hapticFeedback();
        navigate('/lobby', { state: { mode: 'friend', challengeUser: friend } });
    };

    const handleInvite = () => {
        const url = 'https://t.me/FIFI_CHECKERS_BOT';
        shareUrl(url, 'Join me on FiFi Checkers! 🎮♟️');
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-obsidian-950">
                <Header title="Friends" />
                <div className="flex-1 flex items-center justify-center">
                    <Loader text="Loading friends..." />
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-obsidian-950">
            <Header title="Friends" />

            <main className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4">
                {/* Add Friend Button */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                >
                    <Button
                        onClick={() => setShowAddModal(true)}
                        variant="primary"
                        fullWidth
                        icon="➕"
                    >
                        Add Friend
                    </Button>
                </motion.div>

                {/* Pending Requests */}
                <AnimatePresence>
                    {requests.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6"
                        >
                            <h3 className="text-sm font-medium text-obsidian-400 mb-3">
                                Friend Requests ({requests.length})
                            </h3>

                            <div className="space-y-2">
                                {requests.map((request) => (
                                    <motion.div
                                        key={request.from}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-obsidian-700 flex items-center justify-center">
                                                👤
                                            </div>
                                            <span className="font-medium text-white">{request.username}</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleAccept(request.from)}
                                                variant="success"
                                                size="sm"
                                            >
                                                ✓
                                            </Button>
                                            <Button
                                                onClick={() => handleReject(request.from)}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Friends List */}
                <div>
                    <h3 className="text-sm font-medium text-obsidian-400 mb-3">
                        My Friends ({friends.length})
                    </h3>

                    {friends.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <p className="text-4xl mb-4">👥</p>
                            <p className="text-obsidian-400 mb-4">No friends yet</p>
                            <Button
                                onClick={handleInvite}
                                variant="outline"
                                icon="📤"
                            >
                                Invite Friends
                            </Button>
                        </motion.div>
                    ) : (
                        <div className="space-y-2">
                            {friends.map((friend) => (
                                <FriendCard
                                    key={friend.telegramId}
                                    friend={friend}
                                    onChallenge={handleChallenge}
                                    onRemove={handleRemove}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />

            {/* Add Friend Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                }}
                title="Add Friend"
            >
                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search by username..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-obsidian-800 border border-obsidian-700 text-white placeholder:text-obsidian-500 focus:outline-none focus:border-violet-500"
                        />
                        <Button
                            onClick={handleSearch}
                            variant="primary"
                            loading={searching}
                        >
                            🔍
                        </Button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {searchResults.map((user) => (
                                <div
                                    key={user.telegramId}
                                    className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-obsidian-700 flex items-center justify-center">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                                            ) : (
                                                '👤'
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{user.username}</p>
                                            <p className="text-xs text-obsidian-400">{user.wins} wins</p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleSendRequest(user.telegramId)}
                                        variant={user.requestSent ? 'secondary' : 'primary'}
                                        size="sm"
                                        disabled={user.requestSent}
                                    >
                                        {user.requestSent ? 'Sent' : 'Add'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Invite Option */}
                    <div className="pt-4 border-t border-obsidian-700">
                        <Button
                            onClick={handleInvite}
                            variant="outline"
                            fullWidth
                            icon="📤"
                        >
                            Invite via Telegram
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}