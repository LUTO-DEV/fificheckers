const { TIMER_MODES } = require('../utils/constants');

class TimerService {
    constructor() {
        this.matchTimers = new Map();
        this.callbacks = new Map();
    }

    createTimer(matchId, mode, onTimeUp) {
        const duration = TIMER_MODES[mode] || TIMER_MODES.BLITZ;

        console.log(`⏱️ Creating timer for match ${matchId}: ${mode} (${duration}s each)`);

        const timer = {
            player1: duration * 1000,
            player2: duration * 1000,
            activePlayer: null,
            lastUpdate: null,
            interval: null,
            mode,
            paused: false
        };

        this.matchTimers.set(matchId, timer);
        this.callbacks.set(matchId, onTimeUp);

        return timer;
    }

    startTimer(matchId, player) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) {
            console.error(`⏱️ No timer found for match ${matchId}`);
            return null;
        }

        // Clear any existing interval
        if (timer.interval) {
            clearInterval(timer.interval);
        }

        timer.activePlayer = player;
        timer.lastUpdate = Date.now();
        timer.paused = false;

        console.log(`⏱️ Starting timer for player ${player} in match ${matchId}`);

        // Update timer every 100ms
        timer.interval = setInterval(() => {
            this.tick(matchId);
        }, 100);

        return this.getTimerState(matchId);
    }

    tick(matchId) {
        const timer = this.matchTimers.get(matchId);
        if (!timer || !timer.activePlayer || timer.paused) return;

        const now = Date.now();
        const elapsed = now - timer.lastUpdate;
        timer.lastUpdate = now;

        const playerKey = timer.activePlayer === 1 ? 'player1' : 'player2';
        timer[playerKey] = Math.max(0, timer[playerKey] - elapsed);

        // Check for timeout
        if (timer[playerKey] <= 0) {
            console.log(`⏱️ Time's up for player ${timer.activePlayer}!`);
            this.stopTimer(matchId);

            const onTimeUp = this.callbacks.get(matchId);
            if (onTimeUp) {
                onTimeUp(timer.activePlayer);
            }
        }
    }

    switchTimer(matchId, toPlayer) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return null;

        // Update current time first
        this.tick(matchId);

        // Switch to new player
        timer.activePlayer = toPlayer;
        timer.lastUpdate = Date.now();

        console.log(`⏱️ Switched timer to player ${toPlayer}`);

        return this.getTimerState(matchId);
    }

    pauseTimer(matchId) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return;

        this.tick(matchId);
        timer.paused = true;

        if (timer.interval) {
            clearInterval(timer.interval);
            timer.interval = null;
        }
    }

    resumeTimer(matchId) {
        const timer = this.matchTimers.get(matchId);
        if (!timer || !timer.activePlayer) return;

        timer.paused = false;
        timer.lastUpdate = Date.now();

        timer.interval = setInterval(() => {
            this.tick(matchId);
        }, 100);
    }

    stopTimer(matchId) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return;

        if (timer.interval) {
            clearInterval(timer.interval);
            timer.interval = null;
        }

        this.matchTimers.delete(matchId);
        this.callbacks.delete(matchId);

        console.log(`⏱️ Timer stopped for match ${matchId}`);
    }

    getTimerState(matchId) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return null;

        return {
            player1: Math.ceil(timer.player1 / 1000),
            player2: Math.ceil(timer.player2 / 1000),
            activePlayer: timer.activePlayer,
            mode: timer.mode
        };
    }

    addTime(matchId, player, seconds) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return;

        const playerKey = player === 1 ? 'player1' : 'player2';
        timer[playerKey] += seconds * 1000;
    }
}

// Export singleton
module.exports = new TimerService();