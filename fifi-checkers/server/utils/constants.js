const BOARD_SIZE = 8;

const PIECE = {
    EMPTY: 0,
    WHITE: 1,
    BLACK: 2,
    WHITE_KING: 3,
    BLACK_KING: 4
};

const MATCH_STATUS = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    FINISHED: 'finished',
    CANCELLED: 'cancelled'
};

const TIMER_MODES = {
    BLITZ: 180,
    RAPID: 300,
    CLASSIC: 600
};

// RANKS - matches User model enum: Wood, Bronze, Silver, Gold, Diamond
const RANKS = {
    WOOD: { name: 'Wood', minWins: 0, icon: '🪵', color: '#8B4513' },
    BRONZE: { name: 'Bronze', minWins: 20, icon: '🥉', color: '#CD7F32' },
    SILVER: { name: 'Silver', minWins: 50, icon: '🥈', color: '#C0C0C0' },
    GOLD: { name: 'Gold', minWins: 100, icon: '🥇', color: '#FFD700' },
    DIAMOND: { name: 'Diamond', minWins: 500, icon: '💎', color: '#B9F2FF' }
};

// Quick chat messages
const QUICK_CHAT_MESSAGES = [
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

const MAX_CHAT_LENGTH = 120;

module.exports = {
    BOARD_SIZE,
    PIECE,
    MATCH_STATUS,
    TIMER_MODES,
    RANKS,
    QUICK_CHAT_MESSAGES,
    MAX_CHAT_LENGTH
};                                                                                                                              