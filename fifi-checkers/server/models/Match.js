// Match model for historical records (optional - main matches are in memory)
const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
        unique: true
    },
    player1: {
        telegramId: String,
        username: String
    },
    player2: {
        telegramId: String,
        username: String
    },
    winner: {
        telegramId: String,
        username: String
    },
    betAmount: {
        type: Number,
        default: 0
    },
    timerMode: {
        type: String,
        enum: ['BULLET', 'BLITZ', 'CLASSIC'],
        default: 'BLITZ'
    },
    endReason: {
        type: String,
        enum: ['no_pieces', 'no_moves', 'timeout', 'resign', 'disconnect']
    },
    totalMoves: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number, // in seconds
        default: 0
    }
}, {
    timestamps: true
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;