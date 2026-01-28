import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Board from '../components/Board';
import PlayerCard from '../components/PlayerCard';
import Chat from '../components/Chat';
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
        matchId,
        boardState,
        player1,
        player2,
        currentPlayer,
        myPlayerNum,
        timer,
        status,
        result,
        isBot,
        reset
    } = useGameStore();
    const { resign, sendChat } = useSocket();
    const { hapticFeedback } = useTelegram();

    const [showChat, setShowChat] = useState(false);
    const [showResignModal, setShowResignModal] = useState(false);

    // Redirect if no match
    useEffect(() => {
        if (!matchId && status !== 'playing') {
            navigate('/');
        }
    }, [matchId, status, navigate]);

    // Count captured pieces
    const countCaptured = (color) => {
        if (!boardState) return 0;
        let total = 12;
        let current = 0;

        for (let row of boardState) {
            for (let cell of row) {
                if (color === 'white' && (cell === PIECE.WHITE || cell === PIECE.WHITE_KING)) {
                    current++;
                }
                if (color === 'black' && (cell === PIECE.BLACK || cell === PIECE.BLACK_KING)) {
                    current++;
                }
            }
        }

        return total - current;
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
                <div className="text-luxury-text">Loading...</div>
            </div>
        );
    }

    const isMyTurn = currentPlayer === myPlayerNum;

    return (
        <div className="flex flex-col h-full bg-luxury-black safe-area-top safe-area-bottom">
            {/* Opponent Card */}
            <div className="px-3 pt-3">
                <PlayerCard
                    player={myPlayerNum === 1 ? player2 : player1}
                    timer={myPlayerNum === 1 ? timer?.player2 || 180 : timer?.player1 || 180}
                    isActive={currentPlayer !== myPlayerNum}
                    isMe={false}
                    color={myPlayerNum === 1 ? 'black' : 'white'}
                    captured={countCaptured(myPlayerNum === 1 ? 'white' : 'black')}
                />
            </div>

            {/* Turn Indicator */}
            <div className="text-center py-2">
                <motion.span
                    key={isMyTurn ? 'your' : 'opponent'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm font-medium ${isMyTurn ? 'text-gold-400' : 'text-luxury-text'}`}
                >
                    {isMyTurn ? "Your turn" : "Opponent's turn"}
                </motion.span>
            </div>

            {/* Board */}
            <div className="flex-1 flex items-center justify-center px-3">
                <Board />
            </div>

            {/* My Card */}
            <div className="px-3 pt-2">
                <PlayerCard
                    player={myPlayerNum === 1 ? player1 : player2}
                    timer={myPlayerNum === 1 ? timer?.player1 || 180 : timer?.player2 || 180}
                    isActive={currentPlayer === myPlayerNum}
                    isMe={true}
                    color={myPlayerNum === 1 ? 'white' : 'black'}
                    captured={countCaptured(myPlayerNum === 1 ? 'black' : 'white')}
                />
            </div>

            {/* Quick Chat (only for non-bot games) */}
            {!isBot && (
                <div className="px-3 py-2">
                    <QuickChat onSend={handleQuickChat} />
                </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 px-3 pb-3">
                {!isBot && (
                    <Button
                        onClick={() => setShowChat(true)}
                        variant="secondary"
                        size="sm"
                        icon="💬"
                    >
                        Chat
                    </Button>
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
                {showChat && (
                    <Chat isOpen={showChat} onClose={() => setShowChat(false)} />
                )}
            </AnimatePresence>

            {/* Resign Modal */}
            <Modal
                isOpen={showResignModal}
                onClose={() => setShowResignModal(false)}
                title="Resign Game?"
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

            {/* Match Result */}
            <AnimatePresence>
                {status === 'finished' && result && (
                    <MatchResult />
                )}
            </AnimatePresence>
        </div>
    );
}