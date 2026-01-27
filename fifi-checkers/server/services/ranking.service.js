const { RANKS } = require('../utils/constants');

class RankingService {
    static calculateRank(wins) {
        if (wins >= RANKS.DIAMOND.minWins) return 'Diamond';
        if (wins >= RANKS.GOLD.minWins) return 'Gold';
        if (wins >= RANKS.SILVER.minWins) return 'Silver';
        if (wins >= RANKS.BRONZE.minWins) return 'Bronze';
        return 'Wood';
    }

    static getRankInfo(rankName) {
        return RANKS[rankName.toUpperCase()] || RANKS.WOOD;
    }

    static getNextRank(currentRank) {
        const rankOrder = ['Wood', 'Bronze', 'Silver', 'Gold', 'Diamond'];
        const currentIndex = rankOrder.indexOf(currentRank);

        if (currentIndex === -1 || currentIndex === rankOrder.length - 1) {
            return null;
        }

        return rankOrder[currentIndex + 1];
    }

    static getWinsToNextRank(currentRank, currentWins) {
        const nextRank = this.getNextRank(currentRank);
        if (!nextRank) return null;

        const nextRankInfo = this.getRankInfo(nextRank);
        return Math.max(0, nextRankInfo.minWins - currentWins);
    }

    static getRankProgress(currentRank, currentWins) {
        const currentRankInfo = this.getRankInfo(currentRank);
        const nextRank = this.getNextRank(currentRank);

        if (!nextRank) return 100;

        const nextRankInfo = this.getRankInfo(nextRank);
        const winsInCurrentRank = currentWins - currentRankInfo.minWins;
        const winsNeeded = nextRankInfo.minWins - currentRankInfo.minWins;

        return Math.min(100, Math.floor((winsInCurrentRank / winsNeeded) * 100));
    }
}

module.exports = RankingService;