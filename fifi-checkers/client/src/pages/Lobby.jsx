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
    const { status, roomCode, setStatus, setBetAmount, setTimerMode, reset } = useGameStore();
    const { joinQueue, leaveQueue, createRoom, joinRoom, closeRoom, startBotMatch } = useSocket();
    const { hapticFeedback, shareUrl } = useTelegram();

    const [bet, setBet] = useState(0);
    const [timer, setTimer] = useState('BLITZ');
    const [mode, setMode] = useState(location.state?.mode || 'online');
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [waitingForFriend, setWaitingForFriend] = useState(false);

    // Navigate to game when match starts
    useEffect(() => {
        if (status === 'playing') {
            console.log('🎮 Match started, navigating to game...');
            navigate('/game');
        }
    }, [status, navigate]);

    // Watch for room code
    useEffect(() => {
        if (roomCode) {
            console.log('🏠 Room code received:', roomCode);
            setWaitingForFriend(true);
        }
    }, [roomCode]);

    // Cleanup on unmount
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
            if (!roomCode) {
                createRoom(bet, timer);
            }
        }
    };

    const handleCancelQueue = () => {
        hapticFeedback();
        leaveQueue();
        setStatus('idle');
    };

    const handleCancelRoom = () => {
        hapticFeedback();
        if (roomCode) {
            closeRoom(roomCode);
        }
        setWaitingForFriend(false);
        reset();
    };

    const handleJoinRoom = () => {
        if (inputRoomCode.length !== 6) return;
        hapticFeedback();
        setBetAmount(bet);
        setTimerMode(timer);
        joinRoom(inputRoomCode.toUpperCase());
        setShowJoinModal(false);
    };

    const handleCopyCode = () => {
        if (!roomCode) return;
        navigator.clipboard.writeText(roomCode);
        hapticFeedback('notification');
    };

    const handleShareRoom = () => {
        if (!roomCode) return;
        hapticFeedback();
        const url = `https://t.me/FIFI_CHECKERS_BOT?start=room_${roomCode}`;
        shareUrl(url, `Join my FiFi Checkers game! 🎮\nRoom Code: ${roomCode}`);
    };

    return (
        <div className="flex flex-col h-full bg-luxury-black">
            <Header
                title="Game Lobby"
                showBack
                onBack={() => {
                    if (roomCode) {
                        closeRoom(roomCode);
                    }
                    reset();
                    navigate('/');
                }}
                showProfile
            />

            <main className="flex-1 overflow-y-auto hide-scrollbar px-4 py-6">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Mode Selector */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-luxury-text">Game Mode</label>

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
                                        setWaitingForFriend(false);
                                        if (roomCode) {
                                            closeRoom(roomCode);
                                        }
                                    }}
                                    className={`
                    p-4 rounded-xl text-center transition-all border
                    ${mode === m.id
                                            ? 'bg-gold-500/10 text-gold-400 border-gold-500/50'
                                            : 'bg-luxury-card text-luxury-light border-luxury-border hover:border-gold-500/30'
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
                        <label className="text-sm font-medium text-luxury-text">Time Control</label>

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
                    p-4 rounded-xl text-center transition-all border
                    ${timer === key
                                            ? 'bg-gold-500/10 text-gold-400 border-gold-500/50'
                                            : 'bg-luxury-card text-luxury-light border-luxury-border hover:border-gold-500/30'
                                        }
                  `}
                                >
                                    <span className="text-xl block mb-1">{value.icon}</span>
                                    <span className="text-sm font-medium">{value.name}</span>
                                    <span className="text-xs text-luxury-text block">
                                        {Math.floor(value.time / 60)} min
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Bet Selector */}
                    <BetSelector value={bet} onChange={setBet} />

                    {/* Bot warning */}
                    {mode === 'bot' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                        >
                            <div className="flex items-center gap-2 text-red-400">
                                <span className="text-lg">⚠️</span>
                                <span className="font-medium text-sm">Warning: Undefeated Bot</span>
                            </div>
                            <p className="text-xs text-red-400/70 mt-1">
                                FiFi Bot plays perfectly. Can you beat it?
                            </p>
                        </motion.div>
                    )}

                    {/* Friend Room Display - THIS IS THE FIX! */}
                    {mode === 'friend' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {waitingForFriend && roomCode ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 rounded-xl bg-luxury-card border border-gold-500/30 text-center"
                                >
                                    <p className="text-sm text-luxury-text mb-3">Share this code with your friend:</p>

                                    <motion.p
                                        className="text-4xl font-mono font-bold text-gold-400 tracking-[0.3em] mb-4"
                                        animate={{ scale: [1, 1.02, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        {roomCode}
                                    </motion.p>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleCopyCode}
                                            variant="secondary"
                                            size="sm"
                                            fullWidth
                                            icon="📋"
                                        >
                                            Copy
                                        </Button>
                                        <Button
                                            onClick={handleShareRoom}
                                            variant="primary"
                                            size="sm"
                                            fullWidth
                                            icon="📤"
                                        >
                                            Share
                                        </Button>
                                    </div>

                                    <motion.p
                                        className="text-xs text-luxury-text mt-4"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        Waiting for friend to join...
                                    </motion.p>

                                    <Button
                                        onClick={handleCancelRoom}
                                        variant="ghost"
                                        size="sm"
                                        className="mt-3"
                                    >
                                        Cancel
                                    </Button>
                                </motion.div>
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
                    {!(mode === 'friend' && waitingForFriend) && (
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
                                icon={mode === 'bot' ? '🤖' : mode === 'friend' ? '🏠' : '🎮'}
                            >
                                {mode === 'bot'
                                    ? 'Challenge Bot'
                                    : mode === 'friend'
                                        ? 'Create Room'
                                        : 'Find Match'
                                }
                            </Button>
                        </motion.div>
                    )}
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
                        value={inputRoomCode}
                        onChange={(e) => setInputRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className="w-full px-4 py-4 rounded-xl bg-luxury-dark border border-luxury-border text-luxury-white text-center text-3xl font-mono tracking-[0.3em] placeholder:text-luxury-muted placeholder:tracking-[0.3em] focus:outline-none focus:border-gold-500/50"
                    />

                    <Button
                        onClick={handleJoinRoom}
                        variant="primary"
                        fullWidth
                        disabled={inputRoomCode.length !== 6}
                    >
                        Join Game
                    </Button>
                </div>
            </Modal>
        </div>
    );
}