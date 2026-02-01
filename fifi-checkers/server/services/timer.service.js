const { TIMER_MODES } = require('../utils/constants');

class TimerService {
    constructor() {
        this.matchTimers = new Map();
        this.callbacks = new Map();
    }

    createTimer(matchId, mode, onTimeUp) {
        const duration = TIMER_MODES[mode] || 180;

        console.log(`⏱️ Timer created: ${matchId.slice(0, 8)} | ${mode} | ${duration}s`);

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
        if (!timer) return null;

        if (timer.interval) {
            clearInterval(timer.interval);
        }

        timer.activePlayer = player;
        timer.lastUpdate = Date.now();
        timer.paused = false;

        console.log(`⏱️ Timer started: Player ${player}`);

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

        const key = timer.activePlayer === 1 ? 'player1' : 'player2';
        timer[key] = Math.max(0, timer[key] - elapsed);

        // Timeout check
        if (timer[key] <= 0) {
            console.log(`⏱️ TIMEOUT! Player ${timer.activePlayer}`);

            const timedOutPlayer = timer.activePlayer;
            this.stopTimer(matchId);

            const callback = this.callbacks.get(matchId);
            if (callback) {
                // Use setImmediate to avoid blocking
                setImmediate(() => {
                    callback(timedOutPlayer);
                });
            }
        }
    }

    switchTimer(matchId, toPlayer) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return null;

        // Update elapsed time
        if (timer.activePlayer && timer.lastUpdate) {
            const elapsed = Date.now() - timer.lastUpdate;
            const key = timer.activePlayer === 1 ? 'player1' : 'player2';
            timer[key] = Math.max(0, timer[key] - elapsed);
        }

        if (timer.interval) {
            clearInterval(timer.interval);
        }

        timer.activePlayer = toPlayer;
        timer.lastUpdate = Date.now();

        timer.interval = setInterval(() => {
            this.tick(matchId);
        }, 100);

        return this.getTimerState(matchId);
    }

    stopTimer(matchId) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return;

        if (timer.interval) {
            clearInterval(timer.interval);
            timer.interval = null;
        }
        timer.paused = true;
    }

    getTimerState(matchId) {
        const timer = this.matchTimers.get(matchId);
        if (!timer) return null;

        let p1 = timer.player1;
        let p2 = timer.player2;

        if (timer.activePlayer && timer.lastUpdate && !timer.paused) {
            const elapsed = Date.now() - timer.lastUpdate;
            if (timer.activePlayer === 1) {
                p1 = Math.max(0, p1 - elapsed);
            } else {
                p2 = Math.max(0, p2 - elapsed);
            }
        }

        return {
            player1: Math.ceil(p1 / 1000),
            player2: Math.ceil(p2 / 1000),
            activePlayer: timer.activePlayer
        };
    }

    deleteTimer(matchId) {
        this.stopTimer(matchId);
        this.matchTimers.delete(matchId);
        this.callbacks.delete(matchId);
    }
}

module.exports = new TimerService();