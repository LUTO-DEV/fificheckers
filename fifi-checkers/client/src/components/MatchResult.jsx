import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import CoinDisplay from './CoinDisplay';
import RankBadge from './RankBadge';
import useGameStore from '../stores/gameStore';
import useUserStore from '../stores/userStore';

export default function MatchResult() {
    const navigate = useNavigate();
    const { result, reset } = useGameStore();
    const { user, updateUser } = useUserStore();

    const isWinner = result?.winner?.telegramId === user?.telegramId;

    useEffect(() => {
        // Update user stats from result
        if (isWinner && result.winner.newStats) {
            updateUser(result.winner.newStats);
        } else if (!isWinner && result.loser?.newStats) {
            updateUser(result.loser.newStats);
        }
    }, [result, isWinner, updateUser]);

    const handlePlayAgain = () => {
        reset();
        navigate('/lobby');
    };

    const handleHome = () => {
        reset();
        navigate('/');
    };

    if (!result) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
        >
            <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="w-full max-w-sm bg-luxury-dark rounded-2xl border border-luxury-border overflow-hidden"
            >
                {/* Header */}
                <div className={`
          py-8 px-6 text-center
          ${isWinner
                        ? 'bg-gradient-to-b from-gold-500/20 to-transparent'
                        : 'bg-gradient-to-b from-red-500/20 to-transparent'
                    }
        `}>
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="text-6xl mb-4"
                    >
                        {isWinner ? '🏆' : '😔'}
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`text-3xl font-display font-bold ${isWinner ? 'text-gold-400' : 'text-red-400'}`}
                    >
                        {isWinner ? 'VICTORY!' : 'DEFEAT'}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-luxury-text text-sm mt-2"
                    >
                        {result.reason === 'timeout' && 'Time ran out'}
                        {result.reason === 'resign' && 'Opponent resigned'}
                        {result.reason === 'disconnect' && 'Opponent disconnected'}
                        {result.reason === 'no_pieces' && 'All pieces captured'}
                        {result.reason === 'no_moves' && 'No valid moves'}
                    </motion.p>
                </div>

                {/* Stats */}
                <div className="px-6 py-4 space-y-4">
                    {/* Coins */}
                    {result.betAmount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-luxury-card border border-luxury-border"
                        >
                            <span className="text-luxury-text">Coins</span>
                            <CoinDisplay
                                coins={isWinner ? result.coinsWon : -result.betAmount}
                                showPlus={isWinner}
                                animated
                            />
                        </motion.div>
                    )}

                    {/* Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="grid grid-cols-3 gap-3"
                    >
                        <div className="p-3 rounded-xl bg-luxury-card border border-luxury-border text-center">
                            <p className="text-xl font-bold text-luxury-white">
                                {isWinner ? result.winner.newStats?.wins : result.loser?.newStats?.losses}
                            </p>
                            <p className="text-xs text-luxury-text">{isWinner ? 'Wins' : 'Losses'}</p>
                        </div>

                        <div className="p-3 rounded-xl bg-luxury-card border border-luxury-border text-center">
                            <p className="text-xl font-bold text-luxury-white">{result.totalMoves}</p>
                            <p className="text-xs text-luxury-text">Moves</p>
                        </div>

                        <div className="p-3 rounded-xl bg-luxury-card border border-luxury-border text-center">
                            <p className="text-xl font-bold text-gold-400">
                                {isWinner ? result.winner.newStats?.winStreak || 0 : 0}
                            </p>
                            <p className="text-xs text-luxury-text">Streak</p>
                        </div>
                    </motion.div>

                    {/* Rank */}
                    {isWinner && result.winner.newStats?.rank && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="flex items-center justify-center"
                        >
                            <RankBadge rank={result.winner.newStats.rank} size="lg" />
                        </motion.div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-3">
                    <Button
                        onClick={handlePlayAgain}
                        variant="primary"
                        fullWidth
                        icon="🎮"
                    >
                        Play Again
                    </Button>

                    <Button
                        onClick={handleHome}
                        variant="secondary"
                        fullWidth
                    >
                        Home
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}