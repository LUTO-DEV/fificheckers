import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/leaderboard', icon: '🏆', label: 'Ranks' },
    { path: '/friends', icon: '👥', label: 'Friends' },
    { path: '/profile', icon: '👤', label: 'Profile' }
];

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    // Don't show on game page
    if (location.pathname === '/game') return null;

    return (
        <nav className="safe-area-bottom">
            <div className="flex items-center justify-around px-2 py-2 bg-luxury-dark/95 backdrop-blur-lg border-t border-luxury-border">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                        <motion.button
                            key={item.path}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(item.path)}
                            className={`relative flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${isActive
                                    ? 'text-gold-400'
                                    : 'text-luxury-text hover:text-luxury-white'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-xs font-medium">{item.label}</span>

                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gold-500"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}