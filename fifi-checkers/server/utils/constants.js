module.exports = {
    // Board
    BOARD_SIZE: 8,

    // Piece types
    PIECE: {
        EMPTY: 0,
        WHITE: 1,
        BLACK: 2,
        WHITE_KING: 3,
        BLACK_KING: 4
    },

    // Match status
    MATCH_STATUS: {
        WAITING: 'waiting',
        ACTIVE: 'active',
        FINISHED: 'finished'
    },

    // Timer modes (in seconds)
    TIMER_MODES: {
        BULLET: 60,
        BLITZ: 180,
        CLASSIC: 600
    },

    // Ranks
    RANKS: {
        WOOD: { name: 'Wood', minWins: 0, color: '#8B7355' },
        BRONZE: { name: 'Bronze', minWins: 20, color: '#CD7F32' },
        SILVER: { name: 'Silver', minWins: 50, color: '#C0C0C0' },
        GOLD: { name: 'Gold', minWins: 100, color: '#FFD700' },
        DIAMOND: { name: 'Diamond', minWins: 500, color: '#B9F2FF' }
    },

    // Economy
    STARTING_COINS: 100,
    DAILY_REWARD: 20,
    MIN_BET: 0,

    // Chat
    MAX_CHAT_LENGTH: 120,
    QUICK_CHAT_MESSAGES: [
        "Good game!",
        "Nice move!",
        "Oops!",
        "Thinking...",
        "GG!",
        "Well played!",
        "Lucky!",
        "Rematch?",
        "👏",
        "🔥",
        "😅",
        "🎉"
    ],

    // Punishment cosmetics
    PUNISHMENTS: [
        { id: 'dance_loser', name: 'Loser Dance', emoji: '💃' },
        { id: 'crown_winner', name: 'Victory Crown', emoji: '👑' },
        { id: 'sad_trombone', name: 'Sad Trombone', emoji: '🎺' },
        { id: 'confetti', name: 'Confetti Blast', emoji: '🎊' }
    ],

    // Matchmaking
    MATCHMAKING_TIMEOUT: 30000,
    RANK_MATCH_RANGE: 1,
    COIN_MATCH_RANGE: 50
};