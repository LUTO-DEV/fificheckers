import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Board from '../components/Board';
import PlayerCard from '../components/PlayerCard';
import QuickChat from '../components/QuickChat';
import MatchResult from '../components/MatchResult';
import Button from '../components/Button';
import Modal from '../components/Modal';
import useGameStore from '../stores/gameStore';
import useUserStore from '../stores/userStore';
import useSocket from '../hooks/useSocket';
import useTelegram from '../hooks/useTelegram';
import { PIECE } from '../utils/constants';

export default function Game() {
    const navigate = useNavigate();
    const { user } = useUserStore();
    const {
        matchId, boardState, player1, player2,
        currentPlayer, myPlayerNum, myColor, timer,
        status, result, isBot, chatMessages,
        unreadChatCount, clearUnreadChat
    } = useGameStore();
    const { resign, sendChat, isConnected } = useSocket();
    const { hapticFeedback } = useTelegram();

    const [showResignModal, setShowResignModal] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (!matchId && status !== 'playing') {
            navigate('/');
        }
    }, [matchId, status, navigate]);

    // Clear unread when chat opens
    useEffect(() => {
        if (showChat) {
            clearUnreadChat();
        }
    }, [showChat]);

    // Scroll chat to bottom
    useEffect(() => {
        if (showChat && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, showChat]);

    const countCaptured = (color) => {
        if (!boardState) return 0;
        let count = 0;
        for (let row of boardState) {
            for (let cell of row) {
                if (color === 'white' && (cell === PIECE.WHITE || cell === PIECE.WHITE_KING)) count++;
                if (color === 'black' && (cell === PIECE.BLACK || cell === PIECE.BLACK_KING)) count++;
            }
        }
        return 12 - count;
    };

    const handleResign = () => {
        hapticFeedback();
        resign(matchId);
        setShowResignModal(false);
    };

    const handleQuickChat = (message) => {
        hapticFeedback('selection');
        sendChat(matchId, message, true);
    };

    if (!matchId || !boardState) {
        return (
            <div className="flex items-center justify-center h-full bg-luxury-black">
                <div className="text-luxury-text">Loading game...</div>
            </div>
        );
    }

    const isMyTurn = currentPlayer === myPlayerNum;

    // Opponent is always shown at top
    const opponent = myPlayerNum === 1 ? player2 : player1;
    const me = myPlayerNum === 1 ? player1 : player2;
    const opponentColor = myColor === 'white' ? 'black' : 'white';

    return (
        <div className="flex flex-col h-full bg-luxury-black safe-area-top safe-area-bottom">
            {/* Debug Button */}
            <button
                onClick={() => setShowDebug(!showDebug)}
                className="absolute top-2 right-2 z-50 w-8 h-8 bg-red-600/80 text-white text-xs rounded-full flex items-center justify-center"
            >
                🐛
            </button>

            {showDebug && (
                <div className="absolute top-12 right-2 z-50 p-3 bg-black/95 border border-gold-500/50 rounded-lg text-xs text-white w-52">
                    <p className="text-gold-400 font-bold mb-2">Debug</p>
                    <p>🔌 Socket: {isConnected ? '✅' : '❌'}</p>
                    <p>🎮 Match: {matchId?.slice(0, 8)}</p>
                    <p>👤 Me: P{myPlayerNum} ({myColor})</p>
                    <p>🎯 Current: P{currentPlayer}</p>
                    <p className={isMyTurn ? 'text-green-400' : 'text-red-400'}>
                        🔄 My Turn: {isMyTurn ? 'YES' : 'NO'}
                    </p>
                    <p>⏱️ P1: {timer?.player1}s | P2: {timer?.player2}s</p>
                </div>
            )}

            {/* Opponent Card (Top) */}
            <div className="px-3 pt-3">
                <PlayerCard
                    player={opponent}
                    timer={myPlayerNum === 1 ? timer?.player2 : timer?.player1}
                    isActive={!isMyTurn}
                    isMe={false}
                    color={opponentColor}
                    captured={countCaptured(myColor)}
                />
            </div>

            {/* Turn Indicator */}
            <div className="text-center py-2">
                <motion.div
                    key={currentPlayer}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${isMyTurn
                            ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50'
                            : 'bg-luxury-card text-luxury-text border border-luxury-border'
                        }`}
                >
                    {isMyTurn ? "✨ Your turn" : "⏳ Opponent's turn"}
                </motion.div>
            </div>

            {/* Game Board */}
            <div className="flex-1 flex items-center justify-center px-3 pb-2">
                <Board />
            </div>

            {/* My Card (Bottom) */}
            <div className="px-3 pt-2">
                <PlayerCard
                    player={me}
                    timer={myPlayerNum === 1 ? timer?.player1 : timer?.player2}
                    isActive={isMyTurn}
                    isMe={true}
                    color={myColor}
                    captured={countCaptured(opponentColor)}
                />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 px-3 py-3">
                {/* Chat Button */}
                {!isBot && (
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className="relative flex items-center gap-2 px-4 py-2 bg-luxury-card border border-luxury-border rounded-lg text-luxury-text hover:border-gold-500/50 transition-colors"
                    >
                        <span>💬</span>
                        <span className="text-sm">Chat</span>
                        {unreadChatCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1"
                            >
                                {unreadChatCount > 9 ? '9+' : unreadChatCount}
                            </motion.span>
                        )}
                    </button>
                )}

                <div className="flex-1" />

                <Button
                    onClick={() => setShowResignModal(true)}
                    variant="danger"
                    size="sm"
                    icon="🏳️"
                >
                    Resign
                </Button>
            </div>

            {/* Chat Panel */}
            <AnimatePresence>
                {showChat && !isBot && (
                    <motion.div
                        initial={{ opacity: 0, y: 200 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 200 }}
                        className="absolute bottom-0 left-0 right-0 bg-luxury-black/98 border-t border-luxury-border z-40 max-h-[60vh] flex flex-col"
                    >
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-3 border-b border-luxury-border">
                            <span className="text-gold-400 font-medium">💬 Chat</span>
                            <button
                                onClick={() => setShowChat(false)}
                                className="text-luxury-muted hover:text-white text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[100px] max-h-[150px]">
                            {chatMessages.length === 0 ? (
                                <p className="text-luxury-muted text-sm text-center py-4">
                                    No messages yet. Say hello! 👋
                                </p>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: msg.player === myPlayerNum ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex ${msg.player === myPlayerNum ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.player === myPlayerNum
                                                ? 'bg-gold-500/20 text-gold-400 rounded-br-none'
                                                : 'bg-luxury-card text-luxury-text rounded-bl-none'
                                            }`}>
                                            <span className="font-medium text-xs block mb-0.5 opacity-70">
                                                {msg.username}
                                            </span>
                                            {msg.message}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Chat Options */}
                        <div className="p-3 border-t border-luxury-border bg-luxury-card/50">
                            <QuickChat onSend={handleQuickChat} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resign Modal */}
            <Modal
                isOpen={showResignModal}
                onClose={() => setShowResignModal(false)}
                title="Resign Match?"
            >
                <div className="space-y-4">
                    <p className="text-luxury-light text-center text-sm">
                        Are you sure? This will count as a loss.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={() => setShowResignModal(false)} variant="secondary" fullWidth>
                            Cancel
                        </Button>
                        <Button onClick={handleResign} variant="danger" fullWidth>
                            Resign
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Match Result */}
            <AnimatePresence>
                {status === 'finished' && result && <MatchResult />}
            </AnimatePresence>
        </div>
    );
}