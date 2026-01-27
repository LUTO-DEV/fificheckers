import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Pages
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Friends from './pages/Friends';
import Shop from './pages/Shop';

// Components
import { FullScreenLoader } from './components/Loader';

// Hooks & Utils
import useTelegram from './hooks/useTelegram';
import useSocket from './hooks/useSocket';
import useUserStore from './stores/userStore';
import useGameStore from './stores/gameStore';
import { authenticate } from './utils/api';

export default function App() {
    const { initData, isReady } = useTelegram();
    const { user, setUser, setToken, setLoading, isLoading, isAuthenticated } = useUserStore();
    const { status } = useGameStore();
    const [error, setError] = useState(null);

    // Initialize socket after auth
    useSocket();

    useEffect(() => {
        if (isReady && initData) {
            initializeApp();
        }
    }, [isReady, initData]);

    const initializeApp = async () => {
        try {
            setLoading(true);

            // Check for existing token
            const existingToken = localStorage.getItem('fifi_token');

            if (existingToken) {
                // Verify token is still valid
                try {
                    const { user, token } = await authenticate(initData);
                    setUser(user);
                    setToken(token);
                } catch (e) {
                    // Token invalid, re-authenticate
                    localStorage.removeItem('fifi_token');
                    const { user, token } = await authenticate(initData);
                    setUser(user);
                    setToken(token);
                }
            } else {
                // Fresh authentication
                const { user, token } = await authenticate(initData);
                setUser(user);
                setToken(token);
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('Failed to connect. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (!isReady || isLoading) {
        return <FullScreenLoader text="Loading FiFi Checkers..." />;
    }

    // Error state
    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-obsidian-950">
                <div className="text-5xl mb-4">😕</div>
                <p className="text-red-400 text-center mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 rounded-xl bg-violet-600 text-white font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <div className="h-full bg-obsidian-950">
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/lobby" element={<Lobby />} />
                        <Route path="/game" element={<Game />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/friends" element={<Friends />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AnimatePresence>
            </div>
        </BrowserRouter>
    );
}