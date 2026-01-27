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

    return (
        <nav className="safe-area-bottom">
            <div className="flex items-center justify-around px-2 py-2 glass border-t border-obsidian-800">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                        <motion.button
                            key={item.path}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${isActive
                                    ? 'text-violet-400 bg-violet-500/10'
                                    : 'text-obsidian-400 hover:text-white'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-xs font-medium">{item.label}</span>

                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-violet-500"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}