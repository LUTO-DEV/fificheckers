import { useState, useEffect } from 'react';
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
        currentPlayer, myPlayerNum, timer,
        status, result, isBot, chatMessages, unreadChatCount, clearUnreadChat, reset
    } = useGameStore();
    const { resign, sendChat, isConnected } = useSocket();
    const { hapticFeedback } = useTelegram();

    const [showResignModal, setShowResignModal] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
        if (!matchId && status !== 'playing') {
            navigate('/');
        }
    }, [matchId, status, navigate]);

    // Clear unread when chat is opened
    useEffect(() => {
        if (showChat) {
            clearUnreadChat();
        }
    }, [showChat, clearUnreadChat]);

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
        setShowChat(false);
    };

    if (!matchId || !boardState) {
        return (
            <div className="flex items-center justify-center h-full bg-luxury-black">
                <div className="text-luxury-text">Loading game...</div>
            </div>
        );
    }

    const isMyTurn = currentPlayer === myPlayerNum;

    return (
        <div className="flex flex-col h-full bg-luxury-black safe-area-top safe-area-bottom">
            {/* Debug Button */}
            <button
                onClick={() => setShowDebug(!showDebug)}
                className="absolute top-2 right-2 z-50 w-8 h-8 bg-red-600/80 text-white text-xs rounded-full flex items-center justify-center"
            >
                🐛
            </button>

            {/* Debug Panel */}
            {showDebug && (
                <div className="absolute top-12 right-2 z-50 p-3 bg-black/95 border border-gold-500/50 rounded-lg text-xs text-white w-52">
                    <p className="text-gold-400 font-bold mb-2">Debug Info</p>
                    <p>🔌 Socket: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
                    <p>🎮 Match: {matchId?.slice(0, 8)}...</p>
                    <p>👤 Me: Player {myPlayerNum} ({myPlayerNum === 1 ? 'white' : 'black'})</p>
                    <p>🎯 Current: Player {currentPlayer}</p>
                    <p className={isMyTurn ? 'text-green-400 font-bold' : 'text-red-400'}>
                        🔄 My Turn: {isMyTurn ? 'YES ✓' : 'NO ✗'}
                    </p>
                    <hr className="my-2 border-luxury-border" />
                    <p>⏱️ P1 Timer: {timer?.player1}s</p>
                    <p>⏱️ P2 Timer: {timer?.player2}s</p>
                    <p>⏱️ Active: Player {timer?.activePlayer}</p>
                    <hr className="my-2 border-luxury-border" />
                    <p>📊 Status: {status}</p>
                    <p>🤖 Bot: {isBot ? 'Yes' : 'No'}</p>
                </div>
            )}

            {/* Opponent Card */}
            <div className="px-3 pt-3">
                <PlayerCard
                    player={myPlayerNum === 1 ? player2 : player1}
                    timer={myPlayerNum === 1 ? timer?.player2 || 180 : timer?.player1 || 180}
                    isActive={!isMyTurn}
                    isMe={false}
                    color={myPlayerNum === 1 ? 'black' : 'white'}
                    captured={countCaptured(myPlayerNum === 1 ? 'white' : 'black')}
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
                    {isMyTurn ? "✨ Your turn" : "⏳ Opponent's turn..."}
                </motion.div>
            </div>

            {/* Game Board */}
            <div className="flex-1 flex items-center justify-center px-3">
                <Board />
            </div>

            {/* My Player Card */}
            <div className="px-3 pt-2">
                <PlayerCard
                    player={myPlayerNum === 1 ? player1 : player2}
                    timer={myPlayerNum === 1 ? timer?.player1 || 180 : timer?.player2 || 180}
                    isActive={isMyTurn}
                    isMe={true}
                    color={myPlayerNum === 1 ? 'white' : 'black'}
                    captured={countCaptured(myPlayerNum === 1 ? 'black' : 'white')}
                />
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between gap-3 px-3 py-3">
                {/* Chat Button with Notification Badge */}
                {!isBot && (
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className="relative flex items-center gap-2 px-4 py-2 bg-luxury-card border border-luxury-border rounded-lg text-luxury-text hover:border-gold-500/50 transition-colors"
                    >
                        <span>💬</span>
                        <span className="text-sm">Chat</span>
                        {unreadChatCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                                {unreadChatCount > 9 ? '9+' : unreadChatCount}
                            </span>
                        )}
                    </button>
                )}

                <div className="flex-1" />

                {/* Resign Button */}
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
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="absolute bottom-0 left-0 right-0 bg-luxury-black border-t border-luxury-border p-4 z-40"
                    >
                        {/* Chat Messages */}
                        <div className="max-h-32 overflow-y-auto mb-3 space-y-2">
                            {chatMessages.length === 0 ? (
                                <p className="text-luxury-muted text-sm text-center">No messages yet</p>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`text-sm p-2 rounded ${msg.player === myPlayerNum
                                                ? 'bg-gold-500/20 text-gold-400 ml-8'
                                                : 'bg-luxury-card text-luxury-text mr-8'
                                            }`}
                                    >
                                        <span className="font-medium">{msg.username}: </span>
                                        {msg.message}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Quick Chat Options */}
                        <QuickChat onSend={handleQuickChat} />

                        {/* Close Button */}
                        <button
                            onClick={() => setShowChat(false)}
                            className="mt-3 w-full py-2 text-center text-luxury-muted text-sm"
                        >
                            Close
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resign Confirmation Modal */}
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
                        <Button
                            onClick={() => setShowResignModal(false)}
                            variant="secondary"
                            fullWidth
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResign}
                            variant="danger"
                            fullWidth
                        >
                            Resign
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Match Result Modal */}
            <AnimatePresence>
                {status === 'finished' && result && <MatchResult />}
            </AnimatePresence>
        </div>
    );
}