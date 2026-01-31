export const PIECE = {
    EMPTY: 0,
    WHITE: 1,
    BLACK: 2,
    WHITE_KING: 3,
    BLACK_KING: 4
};

export const TIMER_MODES = {
    BLITZ: { label: 'Blitz', time: 180, icon: '⚡' },
    RAPID: { label: 'Rapid', time: 300, icon: '🕐' },
    CLASSIC: { label: 'Classic', time: 600, icon: '♟️' }
};

export const BET_OPTIONS = [0, 10, 25, 50, 100, 250, 500];

// Quick chat - must match server QUICK_CHAT_MESSAGES exactly!
export const QUICK_CHAT = [
    'Hello!',
    'Good game!',
    'Nice move!',
    'Oops!',
    'Hurry up!',
    'Good luck!',
    "I'm on fire!",
    'Easy!',
    'Well played!',
    'Thanks!',
    'Rematch?',
    'GG'
];

export const RANKS = {
    WOOD: { name: 'Wood', icon: '🪵', color: '#8B4513' },
    BRONZE: { name: 'Bronze', icon: '🥉', color: '#CD7F32' },
    SILVER: { name: 'Silver', icon: '🥈', color: '#C0C0C0' },
    GOLD: { name: 'Gold', icon: '🥇', color: '#FFD700' },
    DIAMOND: { name: 'Diamond', icon: '💎', color: '#B9F2FF' }
};