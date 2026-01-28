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

const RANKS = [
    { name: 'Bronze', minWins: 0, icon: '🥉' },
    { name: 'Silver', minWins: 10, icon: '🥈' },
    { name: 'Gold', minWins: 25, icon: '🥇' },
    { name: 'Platinum', minWins: 50, icon: '💎' },
    { name: 'Diamond', minWins: 100, icon: '💠' },
    { name: 'Master', minWins: 200, icon: '👑' },
    { name: 'Grandmaster', minWins: 500, icon: '🏆' }
];

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