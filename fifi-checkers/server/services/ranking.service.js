const { RANKS } = require('../utils/constants');

class RankingService {
    static getRankOrder() {
        return ['Wood', 'Bronze', 'Silver', 'Gold', 'Diamond'];
    }

    static calculateRank(wins) {
        if (wins >= 500) return 'Diamond';
        if (wins >= 100) return 'Gold';
        if (wins >= 50) return 'Silver';
        if (wins >= 20) return 'Bronze';
        return 'Wood';
    }

    static getRankInfo(rankName) {
        if (!rankName) return RANKS.WOOD;
        const key = rankName.toUpperCase();
        return RANKS[key] || RANKS.WOOD;
    }

    static getNextRank(currentRank) {
        const rankOrder = this.getRankOrder();
        const idx = rankOrder.findIndex(r => r.toLowerCase() === (currentRank || 'wood').toLowerCase());
        if (idx === -1 || idx === rankOrder.length - 1) return null;
        return rankOrder[idx + 1];
    }

    static getWinsToNextRank(currentRank, currentWins) {
        const nextRank = this.getNextRank(currentRank);
        if (!nextRank) return null;
        const nextRankInfo = this.getRankInfo(nextRank);
        return Math.max(0, nextRankInfo.minWins - (currentWins || 0));
    }

    static getRankProgress(currentRank, currentWins) {
        const rank = currentRank || 'Wood';
        const wins = currentWins || 0;

        const currentRankInfo = this.getRankInfo(rank);
        const nextRank = this.getNextRank(rank);

        if (!nextRank) return 100;

        const nextRankInfo = this.getRankInfo(nextRank);
        const winsInRank = wins - currentRankInfo.minWins;
        const winsNeeded = nextRankInfo.minWins - currentRankInfo.minWins;

        if (winsNeeded <= 0) return 100;
        return Math.min(100, Math.floor((winsInRank / winsNeeded) * 100));
    }

    static getRankIcon(rankName) {
        return this.getRankInfo(rankName)?.icon || '🪵';
    }

    static getRankColor(rankName) {
        return this.getRankInfo(rankName)?.color || '#8B4513';
    }
}

module.exports = RankingService;