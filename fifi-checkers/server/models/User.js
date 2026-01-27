const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    avatarUrl: {
        type: String,
        default: null
    },
    coins: {
        type: Number,
        default: 100,
        min: 0
    },
    wins: {
        type: Number,
        default: 0,
        min: 0
    },
    losses: {
        type: Number,
        default: 0,
        min: 0
    },
    winStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    bestWinStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    rank: {
        type: String,
        enum: ['Wood', 'Bronze', 'Silver', 'Gold', 'Diamond'],
        default: 'Wood'
    },
    friends: [{
        type: String
    }],
    friendRequests: [{
        from: String,
        username: String,
        createdAt: { type: Date, default: Date.now }
    }],
    lastDailyClaim: {
        type: Date,
        default: null
    },
    gamesPlayed: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Calculate rank based on wins
userSchema.methods.calculateRank = function () {
    const wins = this.wins;
    if (wins >= 500) return 'Diamond';
    if (wins >= 100) return 'Gold';
    if (wins >= 50) return 'Silver';
    if (wins >= 20) return 'Bronze';
    return 'Wood';
};

// Update rank
userSchema.methods.updateRank = function () {
    this.rank = this.calculateRank();
};

// Check if daily reward is available
userSchema.methods.canClaimDaily = function () {
    if (!this.lastDailyClaim) return true;
    const now = new Date();
    const lastClaim = new Date(this.lastDailyClaim);
    const hoursDiff = (now - lastClaim) / (1000 * 60 * 60);
    return hoursDiff >= 24;
};

// Claim daily reward
userSchema.methods.claimDailyReward = function () {
    if (!this.canClaimDaily()) return false;
    this.coins += 20;
    this.lastDailyClaim = new Date();
    return true;
};

// Add win
userSchema.methods.addWin = function (coinsWon = 0) {
    this.wins += 1;
    this.winStreak += 1;
    this.gamesPlayed += 1;
    this.coins += coinsWon;
    this.totalEarnings += coinsWon;

    if (this.winStreak > this.bestWinStreak) {
        this.bestWinStreak = this.winStreak;
    }

    this.updateRank();
};

// Add loss
userSchema.methods.addLoss = function () {
    this.losses += 1;
    this.winStreak = 0;
    this.gamesPlayed += 1;
};

// Deduct coins for bet
userSchema.methods.deductCoins = function (amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    return true;
};

const User = mongoose.model('User', userSchema);

module.exports = User;