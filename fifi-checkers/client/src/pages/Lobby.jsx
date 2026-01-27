import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Button from '../components/Button';
import BetSelector from '../components/BetSelector';
import Modal from '../components/Modal';
import QueueAnimation from '../components/QueueAnimation';
import useUserStore from '../stores/userStore';
import useGameStore from '../stores/gameStore';
import useSocket from '../hooks/useSocket';
import useTelegram from '../hooks/useTelegram';
import { TIMER_MODES } from '../utils/constants';

export default function Lobby() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUserStore();
    const { status, setStatus, setBetAmount, setTimerMode, reset } = useGameStore();
    const { joinQueue, leaveQueue, createRoom, joinRoom, startBotMatch } = useSocket();
    const { hapticFeedback, shareUrl } = useTelegram();

    const [bet, setBet] = useState(0);
    const [timer, setTimer] = useState('BLITZ');
    const [mode, setMode] = useState(location.state?.mode || 'online');
    const [roomCode, setRoomCode] = useState('');
    const [createdRoomCode, setCreatedRoomCode] = useState(null);
    const [showJoinModal, setShowJoinModal] = useState(false);

    useEffect(() => {
        if (status === 'playing') {
            navigate('/game');
        }
    }, [status, navigate]);

    useEffect(() => {
        return () => {
            if (status === 'queue') {
                leaveQueue();
            }
        };
    }, []);

    const handlePlay = () => {
        hapticFeedback();
        setBetAmount(bet);
        setTimerMode(timer);

        if (mode === 'online') {
            joinQueue(bet, timer);
            setStatus('queue');
        } else if (mode === 'bot') {
            startBotMatch(bet, timer);
        } else if (mode === 'friend') {
            createRoom(bet, timer);
        }
    };

    const handleCancelQueue = () => {
        hapticFeedback();
        leaveQueue();
        setStatus('idle');
    };

    const handleJoinRoom = () => {
        if (roomCode.length !== 6) return;
        hapticFeedback();
        joinRoom(roomCode.toUpperCase());
    };

    const handleShareRoom = () => {
        if (!createdRoomCode) return;
        const url = `https://t.me/your_bot?start=room_${createdRoomCode}`;
        shareUrl(url, `Join my FiFi Checkers game! Room: ${createdRoomCode}`);
    };

    // Listen for room creation
    useEffect(() => {
        if (status === 'idle' && mode === 'friend') {
            // Room was created, waiting for guest
        }
    }, [status, mode]);

    return (
        <div className="flex flex-col h-full bg-obsidian-950">
            <Header
                title="Game Lobby"
                showBack
                onBack={() => navigate('/')}
                showProfile
            />

            <main className="flex-1 overflow-y-auto hide-scrollbar px-4 py-6">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Mode Selector */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-obsidian-300">Game Mode</label>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'online', label: 'Online', icon: '🌐' },
                                { id: 'bot', label: 'vs Bot', icon: '🤖' },
                                { id: 'friend', label: 'Friend', icon: '👥' }
                            ].map((m) => (
                                <motion.button
                                    key={m.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        hapticFeedback('selection');
                                        setMode(m.id);
                                    }}
                                    className={`
                    p-4 rounded-xl text-center transition-all
                    ${mode === m.id
                                            ? 'bg-violet-600 text-white border-2 border-violet-400'
                                            : 'bg-obsidian-800 text-obsidian-300 border-2 border-obsidian-700 hover:border-violet-500'
                                        }
                  `}
                                >
                                    <span className="text-2xl block mb-1">{m.icon}</span>
                                    <span className="text-sm font-medium">{m.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Timer Selector */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-obsidian-300">Time Control</label>

                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(TIMER_MODES).map(([key, value]) => (
                                <motion.button
                                    key={key}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        hapticFeedback('selection');
                                        setTimer(key);
                                    }}
                                    className={`
                    p-4 rounded-xl text-center transition-all
                    ${timer === key
                                            ? 'bg-violet-600 text-white border-2 border-violet-400'
                                            : 'bg-obsidian-800 text-obsidian-300 border-2 border-obsidian-700 hover:border-violet-500'
                                        }
                  `}
                                >
                                    <span className="text-xl block mb-1">{value.icon}</span>
                                    <span className="text-sm font-medium">{value.name}</span>
                                    <span className="text-xs text-obsidian-400 block">
                                        {Math.floor(value.time / 60)} min
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Bet Selector */}
                    <BetSelector value={bet} onChange={setBet} />

                    {/* Bot difficulty note */}
                    {mode === 'bot' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                        >
                            <div className="flex items-center gap-2 text-red-400">
                                <span className="text-xl">⚠️</span>
                                <span className="font-medium">Warning: Undefeated Bot</span>
                            </div>
                            <p className="text-sm text-red-400/70 mt-1">
                                FiFi Bot plays perfectly. Can you beat it?
                            </p>
                        </motion.div>
                    )}

                    {/* Friend mode options */}
                    {mode === 'friend' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {createdRoomCode ? (
                                <div className="p-4 rounded-xl bg-obsidian-800 border border-obsidian-700 text-center">
                                    <p className="text-sm text-obsidian-400 mb-2">Share this code:</p>
                                    <p className="text-3xl font-mono font-bold text-violet-400 tracking-widest">
                                        {createdRoomCode}
                                    </p>
                                    <Button
                                        onClick={handleShareRoom}
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
                                        icon="📤"
                                    >
                                        Share Link
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setShowJoinModal(true)}
                                    variant="secondary"
                                    fullWidth
                                    icon="🔗"
                                >
                                    Join with Code
                                </Button>
                            )}
                        </motion.div>
                    )}

                    {/* Play Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Button
                            onClick={handlePlay}
                            variant="primary"
                            size="xl"
                            fullWidth
                            icon={mode === 'bot' ? '🤖' : mode === 'friend' ? '👥' : '🎮'}
                        >
                            {mode === 'bot'
                                ? 'Challenge Bot'
                                : mode === 'friend'
                                    ? (createdRoomCode ? 'Waiting...' : 'Create Room')
                                    : 'Find Match'
                            }
                        </Button>
                    </motion.div>
                </div>
            </main>

            {/* Queue Animation */}
            <AnimatePresence>
                {status === 'queue' && (
                    <QueueAnimation onCancel={handleCancelQueue} />
                )}
            </AnimatePresence>

            {/* Join Room Modal */}
            <Modal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                title="Join Room"
            >
                <div className="space-y-4">
                    <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="Enter room code"
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-xl bg-obsidian-800 border border-obsidian-700 text-white text-center text-2xl font-mono tracking-widest placeholder:text-obsidian-500 focus:outline-none focus:border-violet-500"
                    />

                    <Button
                        onClick={handleJoinRoom}
                        variant="primary"
                        fullWidth
                        disabled={roomCode.length !== 6}
                    >
                        Join Game
                    </Button>
                </div>
            </Modal>
        </div>
    );
}