export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

export function formatCoins(coins) {
    return coins.toLocaleString();
}

export function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export function vibrate(pattern = 50) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

export function playSound(type) {
    // Sound effects would go here
    // For now, just vibrate
    switch (type) {
        case 'move':
            vibrate(30);
            break;
        case 'capture':
            vibrate([30, 50, 30]);
            break;
        case 'win':
            vibrate([100, 50, 100, 50, 100]);
            break;
        case 'lose':
            vibrate([200, 100, 200]);
            break;
        default:
            vibrate(50);
    }
}

export function isPieceWhite(piece) {
    return piece === 1 || piece === 3;
}

export function isPieceBlack(piece) {
    return piece === 2 || piece === 4;
}

export function isKing(piece) {
    return piece === 3 || piece === 4;
}

export function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}